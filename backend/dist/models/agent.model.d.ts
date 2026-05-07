import mongoose, { Document } from "mongoose";
import { AgentStatus } from "../types";
export interface IAgent extends Document {
    onChainAgentId: number;
    agentAddress: string;
    contributor: string;
    agenticTokenId: number;
    metadataURI: string;
    status: AgentStatus;
    totalPriceUpdates: number;
    totalNegotiations: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Agent: mongoose.Model<IAgent, {}, {}, {}, mongoose.Document<unknown, {}, IAgent, {}, mongoose.DefaultSchemaOptions> & IAgent & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IAgent>;
//# sourceMappingURL=agent.model.d.ts.map