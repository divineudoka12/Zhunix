import mongoose, { Document } from "mongoose";
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
export declare const Purchase: mongoose.Model<IPurchase, {}, {}, {}, mongoose.Document<unknown, {}, IPurchase, {}, mongoose.DefaultSchemaOptions> & IPurchase & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IPurchase>;
//# sourceMappingURL=purchase.model.d.ts.map