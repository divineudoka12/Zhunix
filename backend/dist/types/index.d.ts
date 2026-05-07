import { Request } from "express";
export declare enum DataType {
    TEXT = "TEXT",
    CODE = "CODE",
    AUDIO = "AUDIO",
    VIDEO = "VIDEO",
    IMAGE = "IMAGE",
    BEHAVIORAL = "BEHAVIORAL",
    FINANCIAL = "FINANCIAL",
    DOMAIN = "DOMAIN"
}
export declare enum UsagePermission {
    AI_TRAINING = "AI_TRAINING",
    ANALYTICS = "ANALYTICS",
    BOTH = "BOTH"
}
export declare enum DatasetStatus {
    ACTIVE = "ACTIVE",
    PAUSED = "PAUSED",
    REMOVED = "REMOVED"
}
export declare enum AgentStatus {
    ACTIVE = "ACTIVE",
    SUSPENDED = "SUSPENDED",
    REVOKED = "REVOKED"
}
export interface AuthRequest extends Request {
    user?: {
        address: string;
    };
}
export interface DatasetMetadata {
    name: string;
    description: string;
    dataType: DataType;
    permission: UsagePermission;
    pricePerAccess: string;
    subscriptionPrice?: string;
    tags?: string[];
    samplePreview?: string;
}
export interface OnChainDataset {
    id: bigint;
    contributor: string;
    agentAddress: string;
    storageRootHash: string;
    metadataURI: string;
    dataType: number;
    permission: number;
    status: number;
    pricePerAccess: bigint;
    subscriptionPrice: bigint;
    totalSales: bigint;
    totalRevenue: bigint;
    registeredAt: bigint;
    updatedAt: bigint;
    agentPricingEnabled: boolean;
}
export interface PricingContext {
    dataType: DataType;
    totalSales: number;
    totalRevenue: number;
    currentPrice: string;
    marketDemand: "LOW" | "MEDIUM" | "HIGH";
}
//# sourceMappingURL=index.d.ts.map