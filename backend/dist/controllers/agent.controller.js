"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerPricingCycle = exports.getAgentByAddress = exports.registerAgent = void 0;
const agent_model_1 = require("../models/agent.model");
const agentRegistry_service_1 = require("../services/contracts/agentRegistry.service");
const agent_service_1 = require("../services/agent/agent.service");
const error_middleware_1 = require("../middleware/error.middleware");
const registerAgent = async (req, res, next) => {
    try {
        const { agentAddress, agenticTokenId, metadataURI } = req.body;
        const normalizedAgentAddress = Array.isArray(agentAddress) ? agentAddress[0] : agentAddress;
        const existing = await agent_model_1.Agent.findOne({ agentAddress: normalizedAgentAddress.toLowerCase() });
        if (existing) {
            return next(new error_middleware_1.AppError("Agent already registered", 409));
        }
        const { agentId, txHash } = await agentRegistry_service_1.agentRegistryService.registerAgent({
            agentAddress: normalizedAgentAddress,
            agenticTokenId: Number(agenticTokenId),
            metadataURI,
        });
        const agent = await agent_model_1.Agent.create({
            onChainAgentId: agentId,
            agentAddress: normalizedAgentAddress.toLowerCase(),
            contributor: req.user.address,
            agenticTokenId: Number(agenticTokenId),
            metadataURI,
        });
        res.status(201).json({ success: true, agent, txHash });
    }
    catch (err) {
        next(err);
    }
};
exports.registerAgent = registerAgent;
const getAgentByAddress = async (req, res, next) => {
    try {
        const address = Array.isArray(req.params.address) ? req.params.address[0] : req.params.address;
        const agent = await agent_model_1.Agent.findOne({
            agentAddress: address.toLowerCase(),
        });
        if (!agent) {
            return next(new error_middleware_1.AppError("Agent not found", 404));
        }
        res.json({ success: true, agent });
    }
    catch (err) {
        next(err);
    }
};
exports.getAgentByAddress = getAgentByAddress;
const triggerPricingCycle = async (req, res, next) => {
    try {
        const datasetIdParam = Array.isArray(req.params.datasetId) ? req.params.datasetId[0] : req.params.datasetId;
        const datasetId = parseInt(datasetIdParam, 10);
        await agent_service_1.agentService.runPricingCycle(datasetId);
        res.json({ success: true, message: "Pricing cycle triggered" });
    }
    catch (err) {
        next(err);
    }
};
exports.triggerPricingCycle = triggerPricingCycle;
//# sourceMappingURL=agent.controller.js.map