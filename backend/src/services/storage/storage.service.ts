import { ethers } from "ethers";
import { getFlowContract, Indexer, Uploader, ZgFile } from "@0gfoundation/0g-storage-ts-sdk";
import { config } from "../../config";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

type UploadTx =
  | { txHash: string; rootHash: string; txSeq: number }
  | { txHashes: string[]; rootHashes: string[]; txSeqs: number[] };

class StorageService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private readonly storageScanBaseUrl = "https://storagescan-galileo.0g.ai/submission";

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.og.rpcUrl);
    this.signer = new ethers.Wallet(config.og.platformPrivateKey, this.provider);
  }

  private isTxHash(value: unknown): value is string {
    return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
  }

  private isNetworkTimeout(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    const code = typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

    return /timeout|timed out|ETIMEDOUT|ECONNRESET|ECONNREFUSED/i.test(`${code} ${message}`);
  }

  private storageUnavailableError(error: unknown): Error {
    const detail = error instanceof Error ? error.message : String(error);
    if (/0G Storage/i.test(detail)) return new Error(detail);

    const message = this.isNetworkTimeout(error)
      ? "0G Storage nodes are not responding right now. Please retry the upload, or switch OG_STORAGE_NODE_URL to a healthy 0G storage indexer."
      : `0G Storage upload failed: ${detail}`;

    return new Error(message);
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    });

    return Promise.race([
      promise.finally(() => {
        if (timer) clearTimeout(timer);
      }),
      timeout,
    ]);
  }

  private async uploadWithRandomNodes(
    indexer: Indexer,
    file: ZgFile,
    rootHash: string,
    skipTx: boolean
  ): Promise<[UploadTx, Error | null]> {
    const [clients, selectErr] = await indexer.selectNodes(1, "random");
    if (selectErr || clients.length === 0) {
      return [{ txHash: "", rootHash, txSeq: 0 }, selectErr || new Error("No 0G storage nodes are available")];
    }

    const status = await this.withTimeout(
      clients[0].getStatus(),
      30000,
      `Timed out checking 0G storage node ${clients[0].url}`
    );
    if (!status) {
      return [{ txHash: "", rootHash, txSeq: 0 }, new Error(`0G storage node ${clients[0].url} did not return status`)];
    }

    console.log("[storage] selected nodes:", clients.map((client) => client.url));
    const flow = getFlowContract(status.networkIdentity.flowAddress, this.signer);
    const uploader = new Uploader(clients, config.og.rpcUrl, flow);

    return uploader.splitableUpload(
      file,
      {
        finalityRequired: false,
        taskSize: config.og.storageUploadTaskSize,
        expectedReplica: 1,
        skipTx,
        skipIfFinalized: true,
        onProgress: (message) => console.log(`[storage] ${message}`),
      },
      {
        Retries: 10,
        TooManyDataRetries: 2,
        Interval: 2,
        MaxGasPrice: 0,
      }
    );
  }

  private async uploadWithRetries(indexer: Indexer, file: ZgFile, rootHash: string): Promise<UploadTx> {
    const attempts = Math.max(1, config.og.storageUploadNodeAttempts);
    const perAttemptTimeoutMs = Math.max(30000, Math.floor(config.og.storageUploadTimeoutMs / attempts));
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const [tx, uploadErr] = await this.withTimeout(
          this.uploadWithRandomNodes(indexer, file, rootHash, true),
          perAttemptTimeoutMs,
          "0G Storage upload timed out before the storage nodes confirmed the file."
        );

        if (!uploadErr) return tx;

        lastError = uploadErr;
        console.warn(`[storage] attempt ${attempt}/${attempts} failed: ${uploadErr.message}`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[storage] attempt ${attempt}/${attempts} failed: ${lastError.message}`);
      }
    }

    throw this.storageUnavailableError(lastError || new Error("0G Storage upload failed"));
  }

  async uploadFile(buffer: Buffer, originalName: string): Promise<{
    rootHash: string;
    txHash?: string;
    txSeq?: number;
    submissionUrl?: string;
  }> {
    const tmpPath = path.join(os.tmpdir(), `datavault-${Date.now()}-${originalName}`);
    fs.writeFileSync(tmpPath, buffer);
    let file: ZgFile | null = null;

    try {
      file = await ZgFile.fromFilePath(tmpPath);
      const [tree, err] = await file.merkleTree();

      if (err || !tree) {
        throw new Error(`Failed to build merkle tree: ${err}`);
      }

      const rootHash = tree.rootHash();
      if (!rootHash) {
        throw new Error("Failed to resolve root hash");
      }

      const indexer = new Indexer(config.og.storageNodeUrl);
      const tx = await this.uploadWithRetries(indexer, file, rootHash);

      let uploadResult: {
        rootHash: string;
        txHash?: string;
        txSeq?: number;
        submissionUrl?: string;
      } = { rootHash };

      if (tx) {
        if ("txHash" in tx) {
          if (this.isTxHash(tx.txHash)) {
            await this.withTimeout(
              this.provider.waitForTransaction(tx.txHash),
              config.og.storageUploadTimeoutMs,
              "0G Storage transaction confirmation timed out."
            );
          }
          uploadResult = {
            rootHash: tx.rootHash || rootHash,
            txHash: this.isTxHash(tx.txHash) ? tx.txHash : undefined,
            txSeq: tx.txSeq,
            submissionUrl: tx.txSeq !== undefined ? `${this.storageScanBaseUrl}/${tx.txSeq}` : undefined,
          };
        } else if (tx.txHashes.length > 0) {
          const txHashes = tx.txHashes.filter((txHash) => this.isTxHash(txHash));
          if (txHashes.length > 0) {
            await this.withTimeout(
              Promise.all(txHashes.map((txHash) => this.provider.waitForTransaction(txHash))),
              config.og.storageUploadTimeoutMs,
              "0G Storage transaction confirmation timed out."
            );
          }
          const txSeq = tx.txSeqs[0];
          uploadResult = {
            rootHash: tx.rootHashes[0] || rootHash,
            txHash: txHashes[0],
            txSeq,
            submissionUrl: txSeq !== undefined ? `${this.storageScanBaseUrl}/${txSeq}` : undefined,
          };
        }
      }

      return uploadResult;
    } catch (err) {
      throw this.storageUnavailableError(err);
    } finally {
      try {
        await file?.close();
      } catch {
        // Best effort cleanup; the upload result/error is more important.
      }
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
    }
  }

  async downloadFile(rootHash: string): Promise<Buffer> {
    const tmpPath = path.join(os.tmpdir(), `datavault-download-${Date.now()}`);

    const indexer = new Indexer(config.og.storageNodeUrl);
    // Verify the Merkle proof on download, matching the 0G Storage quickstart.
    const err = await indexer.download(rootHash, tmpPath, true);

    if (err) {
      throw new Error(`Download failed: ${err}`);
    }

    const buffer = fs.readFileSync(tmpPath);
    fs.unlinkSync(tmpPath);

    return buffer;
  }
}

export const storageService = new StorageService();
