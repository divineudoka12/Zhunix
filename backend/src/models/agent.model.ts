import mongoose, { Document, Schema } from "mongoose";
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

const AgentSchema = new Schema<IAgent>(
  {
    onChainAgentId: { type: Number, required: true, unique: true },
    agentAddress: { type: String, required: true, unique: true, lowercase: true },
    contributor: { type: String, required: true, lowercase: true },
    agenticTokenId: { type: Number, required: true, unique: true },
    metadataURI: { type: String, required: true },
    status: { type: String, enum: Object.values(AgentStatus), default: AgentStatus.ACTIVE },
    totalPriceUpdates: { type: Number, default: 0 },
    totalNegotiations: { type: Number, default: 0 },
  },
  { timestamps: true }
);

AgentSchema.index({ contributor: 1 });

export const Agent = mongoose.model<IAgent>("Agent", AgentSchema);
