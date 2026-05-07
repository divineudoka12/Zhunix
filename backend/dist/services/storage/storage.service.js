"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = void 0;
const ethers_1 = require("ethers");
const _0g_storage_ts_sdk_1 = require("@0gfoundation/0g-storage-ts-sdk");
const config_1 = require("../../config");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class StorageService {
    constructor() {
        this.provider = new ethers_1.ethers.JsonRpcProvider(config_1.config.og.rpcUrl);
        this.signer = new ethers_1.ethers.Wallet(config_1.config.og.platformPrivateKey, this.provider);
    }
    async uploadFile(buffer, originalName) {
        const tmpPath = path.join(os.tmpdir(), `datavault-${Date.now()}-${originalName}`);
        fs.writeFileSync(tmpPath, buffer);
        try {
            const file = await _0g_storage_ts_sdk_1.ZgFile.fromFilePath(tmpPath);
            const [tree, err] = await file.merkleTree();
            if (err || !tree) {
                throw new Error(`Failed to build merkle tree: ${err}`);
            }
            const rootHash = tree.rootHash();
            if (!rootHash) {
                throw new Error("Failed to resolve root hash");
            }
            const indexer = new _0g_storage_ts_sdk_1.Indexer(config_1.config.og.storageNodeUrl);
            const [tx, uploadErr] = await indexer.upload(file, config_1.config.og.rpcUrl, this.signer);
            if (uploadErr) {
                throw new Error(`Upload failed: ${uploadErr}`);
            }
            if (tx) {
                if ("txHash" in tx) {
                    await this.provider.waitForTransaction(tx.txHash);
                }
                else if (tx.txHashes.length > 0) {
                    await Promise.all(tx.txHashes.map((txHash) => this.provider.waitForTransaction(txHash)));
                }
            }
            await file.close();
            return rootHash;
        }
        finally {
            if (fs.existsSync(tmpPath)) {
                fs.unlinkSync(tmpPath);
            }
        }
    }
    async downloadFile(rootHash) {
        const tmpPath = path.join(os.tmpdir(), `datavault-download-${Date.now()}`);
        const indexer = new _0g_storage_ts_sdk_1.Indexer(config_1.config.og.storageNodeUrl);
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
exports.storageService = new StorageService();
//# sourceMappingURL=storage.service.js.map