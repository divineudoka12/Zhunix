import { ethers } from "ethers";
import { Indexer, ZgFile } from "@0gfoundation/0g-storage-ts-sdk";
import { config } from "../../config";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

class StorageService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.og.rpcUrl);
    this.signer = new ethers.Wallet(config.og.platformPrivateKey, this.provider);
  }

  async uploadFile(buffer: Buffer, originalName: string): Promise<string> {
    const tmpPath = path.join(os.tmpdir(), `datavault-${Date.now()}-${originalName}`);
    fs.writeFileSync(tmpPath, buffer);

    try {
      const file = await ZgFile.fromFilePath(tmpPath);
      const [tree, err] = await file.merkleTree();

      if (err || !tree) {
        throw new Error(`Failed to build merkle tree: ${err}`);
      }

      const rootHash = tree.rootHash();
      if (!rootHash) {
        throw new Error("Failed to resolve root hash");
      }

      const indexer = new Indexer(config.og.storageNodeUrl);
      const [tx, uploadErr] = await indexer.upload(file, config.og.rpcUrl, this.signer);

      if (uploadErr) {
        throw new Error(`Upload failed: ${uploadErr}`);
      }

      if (tx) {
        if ("txHash" in tx) {
          await this.provider.waitForTransaction(tx.txHash);
        } else if (tx.txHashes.length > 0) {
          await Promise.all(tx.txHashes.map((txHash) => this.provider.waitForTransaction(txHash)));
        }
      }

      await file.close();
      return rootHash;
    } finally {
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
