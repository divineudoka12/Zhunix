import { Request } from "express";

export enum DataType {
  TEXT = "TEXT",
  CODE = "CODE",
  AUDIO = "AUDIO",
  VIDEO = "VIDEO",
  IMAGE = "IMAGE",
  BEHAVIORAL = "BEHAVIORAL",
  FINANCIAL = "FINANCIAL",
  DOMAIN = "DOMAIN",
}

export enum UsagePermission {
  AI_TRAINING = "AI_TRAINING",
  ANALYTICS = "ANALYTICS",
  BOTH = "BOTH",
}

export enum DatasetStatus {
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  REMOVED = "REMOVED",
}

export enum AgentStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  REVOKED = "REVOKED",
}

export enum ValidationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface AuthRequest extends Request {
  user?: {
    address: string;
  };
}

export interface QualityAssessment {
  overallScore: number;
  completeness: number;
  accuracy: number;
  authenticity: number;
  consistency: number;
  valueScore?: number;
  complianceRisk?: "LOW" | "MEDIUM" | "HIGH";
  rejectionReasons?: string[];
  recommendations: string[];
  issues: string[];
}

export interface UploadPolicyAssessment {
  approved: boolean;
  valueScore: number;
  complianceRisk: "LOW" | "MEDIUM" | "HIGH";
  dataCategory: string;
  rejectionReasons: string[];
  recommendations: string[];
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
  metadata: Record<string, unknown>;
  metadataURI: string;
  usedFallback: boolean;
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
