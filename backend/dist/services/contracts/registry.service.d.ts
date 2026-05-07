import { ethers } from "ethers";
import { DataType, UsagePermission } from "../../types";
declare class RegistryService {
    private provider;
    private signer;
    private contract;
    constructor();
    registerDataset(params: {
        storageRootHash: string;
        metadataURI: string;
        dataType: DataType;
        permission: UsagePermission;
        pricePerAccess: string;
        subscriptionPrice: string;
        agentAddress: string;
        agentPricingEnabled: boolean;
    }): Promise<{
        datasetId: number;
        txHash: string;
    }>;
    getDataset(datasetId: number): Promise<any>;
    getContributorDatasets(address: string): Promise<number[]>;
    agentUpdatePrice(datasetId: number, newPrice: string): Promise<string>;
    totalDatasets(): Promise<number>;
    getContractInterface(): ethers.Interface;
    getProvider(): ethers.JsonRpcProvider;
    getContractAddress(): string;
}
export declare const registryService: RegistryService;
export {};
//# sourceMappingURL=registry.service.d.ts.map