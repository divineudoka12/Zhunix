import { ethers } from "ethers";
declare class MarketplaceService {
    private provider;
    private signer;
    private contract;
    constructor();
    getPurchase(purchaseId: number): Promise<any>;
    getBuyerPurchases(buyer: string): Promise<number[]>;
    getPendingBalance(contributor: string): Promise<string>;
    hasPurchased(buyer: string, datasetId: number): Promise<boolean>;
    hasActiveAccess(buyer: string, datasetId: number): Promise<boolean>;
    getContractInterface(): ethers.Interface;
    getContractAddress(): string;
    getProvider(): ethers.JsonRpcProvider;
}
export declare const marketplaceService: MarketplaceService;
export {};
//# sourceMappingURL=marketplace.service.d.ts.map