import { ethers } from "ethers";
declare class AgentRegistryService {
    private provider;
    private signer;
    private contract;
    constructor();
    registerAgent(params: {
        agentAddress: string;
        agenticTokenId: number;
        metadataURI: string;
    }): Promise<{
        agentId: number;
        txHash: string;
    }>;
    isAgentFullyAuthorized(agentAddress: string): Promise<boolean>;
    getAgentByAddress(agentAddress: string): Promise<any>;
    getContributorAgents(contributor: string): Promise<number[]>;
    getContractInterface(): ethers.Interface;
    getContractAddress(): string;
    getProvider(): ethers.JsonRpcProvider;
}
export declare const agentRegistryService: AgentRegistryService;
export {};
//# sourceMappingURL=agentRegistry.service.d.ts.map