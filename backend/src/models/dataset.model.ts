import mongoose, { Document, Schema } from "mongoose";
import { DataType, UsagePermission, DatasetStatus } from "../types";

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
    agentAddress: { type: String, default: "" },
    agentPricingEnabled: { type: Boolean, default: false },
    tags: [{ type: String }],
    samplePreview: { type: String, default: "" },
    qualityScore: { type: Number, default: 0, min: 0, max: 100 },
    totalSales: { type: Number, default: 0 },
    totalRevenue: { type: String, default: "0" },
  },
  { timestamps: true }
);

DatasetSchema.index({ contributor: 1 });
DatasetSchema.index({ dataType: 1 });
DatasetSchema.index({ status: 1 });
DatasetSchema.index({ tags: 1 });

export const Dataset = mongoose.model<IDataset>("Dataset", DatasetSchema);