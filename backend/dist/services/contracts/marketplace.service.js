"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketplaceService = void 0;
const ethers_1 = require("ethers");
const config_1 = require("../../config");
const ABI = [
    "function purchaseAccess(uint256) external payable",
    "function purchaseSubscription(uint256) external payable",
    "function bulkPurchase(uint256[]) external payable",
    "function withdraw() external",
    "function getPurchase(uint256) view returns (tuple(uint256,uint256,address,address,uint256,uint256,uint256,bool,bool,uint256))",
    "function getBuyerPurchases(address) view returns (uint256[])",
    "function getPendingBalance(address) view returns (uint256)",
    "function hasPurchased(address,uint256) view returns (bool)",
    "function hasActiveAccess(address,uint256) view returns (bool)",
    "event PurchaseCreated(uint256 indexed,uint256 indexed,address indexed,uint256,bool)",
    "event PurchaseSettled(uint256 indexed,address indexed,uint256,uint256)",
    "event Withdrawn(address indexed,uint256)",
];
class MarketplaceService {
    constructor() {
        this.provider = new ethers_1.ethers.JsonRpcProvider(config_1.config.og.rpcUrl);
        this.signer = new ethers_1.ethers.Wallet(config_1.config.og.platformPrivateKey, this.provider);
        this.contract = new ethers_1.ethers.Contract(config_1.config.contracts.dataMarketplace, ABI, this.signer);
    }
    async getPurchase(purchaseId) {
        return await this.contract.getPurchase(purchaseId);
    }
    async getBuyerPurchases(buyer) {
        const ids = await this.contract.getBuyerPurchases(buyer);
        return ids.map(Number);
    }
    async getPendingBalance(contributor) {
        const balance = await this.contract.getPendingBalance(contributor);
        return ethers_1.ethers.formatEther(balance);
    }
    async hasPurchased(buyer, datasetId) {
        return await this.contract.hasPurchased(buyer, datasetId);
    }
    async hasActiveAccess(buyer, datasetId) {
        return await this.contract.hasActiveAccess(buyer, datasetId);
    }
    getContractInterface() {
        return this.contract.interface;
    }
    getContractAddress() {
        return config_1.config.contracts.dataMarketplace;
    }
    getProvider() {
        return this.provider;
    }
}
exports.marketplaceService = new MarketplaceService();
//# sourceMappingURL=marketplace.service.js.map