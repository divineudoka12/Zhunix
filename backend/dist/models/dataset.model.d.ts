import mongoose, { Document } from "mongoose";
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
export declare const Dataset: mongoose.Model<IDataset, {}, {}, {}, mongoose.Document<unknown, {}, IDataset, {}, mongoose.DefaultSchemaOptions> & IDataset & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IDataset>;
//# sourceMappingURL=dataset.model.d.ts.map