import { ethers } from "ethers";
import { config } from "../../config";
import { DataType, UsagePermission } from "../../types";

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

const dataTypeToIndex: Record<DataType, number> = {
  [DataType.TEXT]: 0,
  [DataType.CODE]: 1,
  [DataType.AUDIO]: 2,
  [DataType.VIDEO]: 3,
  [DataType.IMAGE]: 4,
  [DataType.BEHAVIORAL]: 5,
  [DataType.FINANCIAL]: 6,
  [DataType.DOMAIN]: 7,
};

const permissionToIndex: Record<UsagePermission, number> = {
  [UsagePermission.AI_TRAINING]: 0,
  [UsagePermission.ANALYTICS]: 1,
  [UsagePermission.BOTH]: 2,
};

class RegistryService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.og.rpcUrl);
    this.signer = new ethers.Wallet(config.og.platformPrivateKey, this.provider);
    this.contract = new ethers.Contract(config.contracts.dataRegistry, ABI, this.signer);
  }

  async registerDataset(params: {
    storageRootHash: string;
    metadataURI: string;
    dataType: DataType;
    permission: UsagePermission;
    pricePerAccess: string;
    subscriptionPrice: string;
    agentAddress: string;
    agentPricingEnabled: boolean;
  }): Promise<{ datasetId: number; txHash: string }> {
    const tx = await this.contract.registerDataset(
      params.storageRootHash,
      params.metadataURI,
      dataTypeToIndex[params.dataType],
      permissionToIndex[params.permission],
      ethers.parseEther(params.pricePerAccess),
      ethers.parseEther(params.subscriptionPrice || "0"),
      params.agentAddress || ethers.ZeroAddress,
      params.agentPricingEnabled
    );

    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log: ethers.Log) => {
        try { return this.contract.interface.parseLog(log); } catch { return null; }
      })
      .find((e: ethers.LogDescription | null) => e?.name === "DatasetRegistered");

    return {
      datasetId: Number(event?.args[0]),
      txHash: receipt.hash,
    };
  }

  async getDataset(datasetId: number) {
    return await this.contract.getDataset(datasetId);
  }

  async getContributorDatasets(address: string): Promise<number[]> {
    const ids = await this.contract.getContributorDatasets(address);
    return ids.map(Number);
  }

  async agentUpdatePrice(datasetId: number, newPrice: string): Promise<string> {
    const tx = await this.contract.agentUpdatePrice(
      datasetId,
      ethers.parseEther(newPrice)
    );
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async totalDatasets(): Promise<number> {
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
    return config.contracts.dataRegistry;
  }
}

export const registryService = new RegistryService();