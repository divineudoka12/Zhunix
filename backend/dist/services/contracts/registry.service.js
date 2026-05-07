"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registryService = void 0;
const ethers_1 = require("ethers");
const config_1 = require("../../config");
const types_1 = require("../../types");
const ABI = [
    "function registerDataset(string,string,uint8,uint8,uint256,uint256,address,bool) returns (uint256)",
    "function updateDataset(uint256,uint256,uint256,uint8) external",
    "function assignAgent(uint256,address,bool) external",
    "function agentUpdatePrice(uint256,uint256) external",
    "function getDataset(uint256) view returns (tuple(uint256,address,address,string,string,uint8,uint8,uint8,uint256,uint256,uint256,uint256,uint256,uint256,bool))",
    "function getContributorDatasets(address) view returns (uint256[])",
    "function totalDatasets() view returns (uint256)",
    "event DatasetRegistered(uint256 indexed,address indexed,uint8,string,uint256)",
    "event DatasetUpdated(uint256 indexed,uint256,uint8)",
    "event AgentPriceUpdated(uint256 indexed,uint256,address indexed)",
];
const dataTypeToIndex = {
    [types_1.DataType.TEXT]: 0,
    [types_1.DataType.CODE]: 1,
    [types_1.DataType.AUDIO]: 2,
    [types_1.DataType.VIDEO]: 3,
    [types_1.DataType.IMAGE]: 4,
    [types_1.DataType.BEHAVIORAL]: 5,
    [types_1.DataType.FINANCIAL]: 6,
    [types_1.DataType.DOMAIN]: 7,
};
const permissionToIndex = {
    [types_1.UsagePermission.AI_TRAINING]: 0,
    [types_1.UsagePermission.ANALYTICS]: 1,
    [types_1.UsagePermission.BOTH]: 2,
};
class RegistryService {
    constructor() {
        this.provider = new ethers_1.ethers.JsonRpcProvider(config_1.config.og.rpcUrl);
        this.signer = new ethers_1.ethers.Wallet(config_1.config.og.platformPrivateKey, this.provider);
        this.contract = new ethers_1.ethers.Contract(config_1.config.contracts.dataRegistry, ABI, this.signer);
    }
    async registerDataset(params) {
        const tx = await this.contract.registerDataset(params.storageRootHash, params.metadataURI, dataTypeToIndex[params.dataType], permissionToIndex[params.permission], ethers_1.ethers.parseEther(params.pricePerAccess), ethers_1.ethers.parseEther(params.subscriptionPrice || "0"), params.agentAddress || ethers_1.ethers.ZeroAddress, params.agentPricingEnabled);
        const receipt = await tx.wait();
        const event = receipt.logs
            .map((log) => {
            try {
                return this.contract.interface.parseLog(log);
            }
            catch {
                return null;
            }
        })
            .find((e) => e?.name === "DatasetRegistered");
        return {
            datasetId: Number(event?.args[0]),
            txHash: receipt.hash,
        };
    }
    async getDataset(datasetId) {
        return await this.contract.getDataset(datasetId);
    }
    async getContributorDatasets(address) {
        const ids = await this.contract.getContributorDatasets(address);
        return ids.map(Number);
    }
    async agentUpdatePrice(datasetId, newPrice) {
        const tx = await this.contract.agentUpdatePrice(datasetId, ethers_1.ethers.parseEther(newPrice));
        const receipt = await tx.wait();
        return receipt.hash;
    }
    async totalDatasets() {
        const total = await this.contract.totalDatasets();
        return Number(total);
    }
    getContractInterface() {
        return this.contract.interface;
    }
    getProvider() {
        return this.provider;
    }
    getContractAddress() {
        return config_1.config.contracts.dataRegistry;
    }
}
exports.registryService = new RegistryService();
//# sourceMappingURL=registry.service.js.map