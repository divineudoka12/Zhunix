import mongoose, { Document, Schema } from "mongoose";

export interface IPurchase extends Document {
  onChainPurchaseId: number;
  datasetId: number;
  buyer: string;
  contributor: string;
  amount: string;
  platformFee: string;
  contributorPayout: string;
  isSubscription: boolean;
  subscriptionExpiresAt: Date | null;
  txHash: string;
  createdAt: Date;
}

const PurchaseSchema = new Schema<IPurchase>(
  {
    onChainPurchaseId: { type: Number, required: true, unique: true },
    datasetId: { type: Number, required: true },
    buyer: { type: String, required: true, lowercase: true },
    contributor: { type: String, required: true, lowercase: true },
    amount: { type: String, required: true },
    platformFee: { type: String, required: true },
    contributorPayout: { type: String, required: true },
    isSubscription: { type: Boolean, default: false },
    subscriptionExpiresAt: { type: Date, default: null },
    txHash: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

PurchaseSchema.index({ buyer: 1 });
PurchaseSchema.index({ contributor: 1 });
PurchaseSchema.index({ datasetId: 1 });

export const Purchase = mongoose.model<IPurchase>("Purchase", PurchaseSchema);