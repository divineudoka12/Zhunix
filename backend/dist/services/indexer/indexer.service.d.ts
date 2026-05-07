declare class IndexerService {
    private registryProvider;
    private marketplaceProvider;
    constructor();
    private handleDatasetRegistered;
    private handleDatasetUpdated;
    private handlePurchaseCreated;
    private handleAgentPriceUpdated;
    start(): void;
}
export declare const indexerService: IndexerService;
export {};
//# sourceMappingURL=indexer.service.d.ts.map