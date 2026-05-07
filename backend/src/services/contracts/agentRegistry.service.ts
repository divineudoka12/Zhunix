import { ethers } from "ethers";
import { config } from "../../config";

const ABI = [
  "function registerAgent(address,uint256,string) returns (uint256)",
  "function updateAgentStatus(uint256,uint8) external",
  "function isAgentActive(address) view returns (bool)",
  "function isAgentFullyAuthorized(address) view returns (bool)",
  "function getAgent(uint256) view returns (tuple(uint256,address,address,uint256,string,uint8,uint256,uint256,uint256,uint256))",
  "function getAgentByAddress(address) view returns (tuple(uint256,address,address,uint256,string,uint8,uint256,uint256,uint256,uint256))",
  "function getContributorAgents(address) view returns (uint256[])",
  "function totalAgents() view returns (uint256)",
  "event AgentRegistered(uint256 indexed,address indexed,address indexed,uint256)",
  "event AgentStatusUpdated(uint256 indexed,uint8)",
];

class AgentRegistryService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.og.rpcUrl);
    this.signer = new ethers.Wallet(config.og.platformPrivateKey, this.provider);
    this.contract = new ethers.Contract(config.contracts.agentRegistry, ABI, this.signer);
  }

  async registerAgent(params: {
    agentAddress: string;
    agenticTokenId: number;
    metadataURI: string;
  }): Promise<{ agentId: number; txHash: string }> {
    const tx = await this.contract.registerAgent(
      params.agentAddress,
      params.agenticTokenId,
      params.metadataURI
    );

    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log: ethers.Log) => {
        try { return this.contract.interface.parseLog(log); } catch { return null; }
      })
      .find((e: ethers.LogDescription | null) => e?.name === "AgentRegistered");

    return {
      agentId: Number(event?.args[0]),
      txHash: receipt.hash,
    };
  }

  async isAgentFullyAuthorized(agentAddress: string): Promise<boolean> {
    return await this.contract.isAgentFullyAuthorized(agentAddress);
  }

  async getAgentByAddress(agentAddress: string) {
    return await this.contract.getAgentByAddress(agentAddress);
  }

  async getContributorAgents(contributor: string): Promise<number[]> {
    const ids = await this.contract.getContributorAgents(contributor);
    return ids.map(Number);
  }

  getContractInterface() {
    return this.contract.interface;
  }

  getContractAddress() {
    return config.contracts.agentRegistry;
  }

  getProvider() {
    return this.provider;
  }
}

export const agentRegistryService = new AgentRegistryService();
