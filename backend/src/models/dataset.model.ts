import mongoose, { Document, Schema } from "mongoose";
import { DataType, UsagePermission, DatasetStatus, ValidationStatus } from "../types";

export interface IDataset extends Document {
  onChainId: number;
  contributor: string;
  name: string;
  description: string;
  storageRootHash: string;
  metadataURI: string;
  dataType: DataType;
  permission: UsagePermission;
  status: DatasetStatus;
  pricePerAccess: string;
  subscriptionPrice: string;
  agentAddress: string;
  agentPricingEnabled: boolean;
  tags: string[];
  samplePreview: string;
  qualityScore: number;
  totalSales: number;
  totalRevenue: string;
  validationStatus: ValidationStatus;
  validatorAgent: string;
  validationTimestamp: Date | null;
  validationDetails: {
    completeness: number;
    accuracy: number;
    authenticity: number;
    consistency: number;
    issues: string[];
    recommendations: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const DatasetSchema = new Schema<IDataset>(
  {
    onChainId: { type: Number, required: true, unique: true },
    contributor: { type: String, required: true, lowercase: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    storageRootHash: { type: String, required: true, unique: true },
    metadataURI: { type: String, required: true },
    dataType: { type: String, enum: Object.values(DataType), required: true },
    permission: { type: String, enum: Object.values(UsagePermission), required: true },
    status: { type: String, enum: Object.values(DatasetStatus), default: DatasetStatus.ACTIVE },
    pricePerAccess: { type: String, required: true },
    subscriptionPrice: { type: String, default: "0" },
    agentAddress: { type: String, required: true },
    agentPricingEnabled: { type: Boolean, default: true },
    tags: [{ type: String }],
    samplePreview: { type: String, default: "" },
    qualityScore: { type: Number, default: 0, min: 0, max: 100 },
    totalSales: { type: Number, default: 0 },
    totalRevenue: { type: String, default: "0" },
    validationStatus: { type: String, enum: Object.values(ValidationStatus), default: ValidationStatus.PENDING },
    validatorAgent: { type: String, default: "" },
    validationTimestamp: { type: Date, default: null },
    validationDetails: {
      completeness: { type: Number, default: 0, min: 0, max: 100 },
      accuracy: { type: Number, default: 0, min: 0, max: 100 },
      authenticity: { type: Number, default: 0, min: 0, max: 100 },
      consistency: { type: Number, default: 0, min: 0, max: 100 },
      issues: [{ type: String }],
      recommendations: [{ type: String }],
    },
  },
  { timestamps: true }
);

DatasetSchema.index({ contributor: 1 });
DatasetSchema.index({ dataType: 1 });
DatasetSchema.index({ status: 1 });
DatasetSchema.index({ validationStatus: 1 });
DatasetSchema.index({ tags: 1 });

export const Dataset = mongoose.model<IDataset>("Dataset", DatasetSchema);