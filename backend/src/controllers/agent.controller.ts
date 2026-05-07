import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { Agent } from "../models/agent.model";
import { agentRegistryService } from "../services/contracts/agentRegistry.service";
import { agentService } from "../services/agent/agent.service";
import { AppError } from "../middleware/error.middleware";

export const registerAgent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { agentAddress, agenticTokenId, metadataURI } = req.body;
    const normalizedAgentAddress = Array.isArray(agentAddress) ? agentAddress[0] : agentAddress;

    const existing = await Agent.findOne({ agentAddress: normalizedAgentAddress.toLowerCase() });
    if (existing) {
      return next(new AppError("Agent already registered", 409));
    }

    const { agentId, txHash } = await agentRegistryService.registerAgent({
      agentAddress: normalizedAgentAddress,
      agenticTokenId: Number(agenticTokenId),
      metadataURI,
    });

    const agent = await Agent.create({
      onChainAgentId: agentId,
      agentAddress: normalizedAgentAddress.toLowerCase(),
      contributor: req.user!.address,
      agenticTokenId: Number(agenticTokenId),
      metadataURI,
    });

    res.status(201).json({ success: true, agent, txHash });
  } catch (err) {
    next(err);
  }
};

export const getAgentByAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const address = Array.isArray(req.params.address) ? req.params.address[0] : req.params.address;
    const agent = await Agent.findOne({
      agentAddress: address.toLowerCase(),
    });

    if (!agent) {
      return next(new AppError("Agent not found", 404));
    }

    res.json({ success: true, agent });
  } catch (err) {
    next(err);
  }
};

export const triggerPricingCycle = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const datasetIdParam = Array.isArray(req.params.datasetId) ? req.params.datasetId[0] : req.params.datasetId;
    const datasetId = parseInt(datasetIdParam, 10);
    await agentService.runPricingCycle(datasetId);

    res.json({ success: true, message: "Pricing cycle triggered" });
  } catch (err) {
    next(err);
  }
};
