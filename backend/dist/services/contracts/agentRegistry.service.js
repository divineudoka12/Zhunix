"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentRegistryService = void 0;
const ethers_1 = require("ethers");
const config_1 = require("../../config");
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
    constructor() {
        this.provider = new ethers_1.ethers.JsonRpcProvider(config_1.config.og.rpcUrl);
        this.signer = new ethers_1.ethers.Wallet(config_1.config.og.platformPrivateKey, this.provider);
        this.contract = new ethers_1.ethers.Contract(config_1.config.contracts.agentRegistry, ABI, this.signer);
    }
    async registerAgent(params) {
        const tx = await this.contract.registerAgent(params.agentAddress, params.agenticTokenId, params.metadataURI);
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
            .find((e) => e?.name === "AgentRegistered");
        return {
            agentId: Number(event?.args[0]),
            txHash: receipt.hash,
        };
    }
    async isAgentFullyAuthorized(agentAddress) {
        return await this.contract.isAgentFullyAuthorized(agentAddress);
    }
    async getAgentByAddress(agentAddress) {
        return await this.contract.getAgentByAddress(agentAddress);
    }
    async getContributorAgents(contributor) {
        const ids = await this.contract.getContributorAgents(contributor);
        return ids.map(Number);
    }
    getContractInterface() {
        return this.contract.interface;
    }
    getContractAddress() {
        return config_1.config.contracts.agentRegistry;
    }
    getProvider() {
        return this.provider;
    }
}
exports.agentRegistryService = new AgentRegistryService();
//# sourceMappingURL=agentRegistry.service.js.map