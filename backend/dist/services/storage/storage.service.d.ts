declare class StorageService {
    private provider;
    private signer;
    constructor();
    uploadFile(buffer: Buffer, originalName: string): Promise<string>;
    downloadFile(rootHash: string): Promise<Buffer>;
}
export declare const storageService: StorageService;
export {};
//# sourceMappingURL=storage.service.d.ts.map