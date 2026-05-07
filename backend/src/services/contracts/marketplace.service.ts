import { ethers } from "ethers";
import { config } from "../../config";

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
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.og.rpcUrl);
    this.signer = new ethers.Wallet(config.og.platformPrivateKey, this.provider);
    this.contract = new ethers.Contract(config.contracts.dataMarketplace, ABI, this.signer);
  }

  async getPurchase(purchaseId: number) {
    return await this.contract.getPurchase(purchaseId);
  }

  async getBuyerPurchases(buyer: string): Promise<number[]> {
    const ids = await this.contract.getBuyerPurchases(buyer);
    return ids.map(Number);
  }

  async getPendingBalance(contributor: string): Promise<string> {
    const balance = await this.contract.getPendingBalance(contributor);
    return ethers.formatEther(balance);
  }

  async hasPurchased(buyer: string, datasetId: number): Promise<boolean> {
    return await this.contract.hasPurchased(buyer, datasetId);
  }

  async hasActiveAccess(buyer: string, datasetId: number): Promise<boolean> {
    return await this.contract.hasActiveAccess(buyer, datasetId);
  }

  getContractInterface() {
    return this.contract.interface;
  }

  getContractAddress() {
    return config.contracts.dataMarketplace;
  }

  getProvider() {
    return this.provider;
  }
}

export const marketplaceService = new MarketplaceService();