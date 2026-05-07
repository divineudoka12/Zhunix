"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentService = void 0;
const dataset_model_1 = require("../../models/dataset.model");
const compute_service_1 = require("../compute/compute.service");
const registry_service_1 = require("../contracts/registry.service");
const DEMAND_THRESHOLDS = { low: 5, medium: 20 };
class AgentService {
    determineDemand(totalSales) {
        if (totalSales <= DEMAND_THRESHOLDS.low)
            return "LOW";
        if (totalSales <= DEMAND_THRESHOLDS.medium)
            return "MEDIUM";
        return "HIGH";
    }
    async runPricingCycle(datasetId) {
        const dataset = await dataset_model_1.Dataset.findOne({ onChainId: datasetId });
        if (!dataset || !dataset.agentPricingEnabled || !dataset.agentAddress) {
            return;
        }
        const isAuthorized = await registry_service_1.registryService
            .getContractInterface()
            .getEvent("AgentPriceUpdated");
        if (!isAuthorized)
            return;
        const context = {
            dataType: dataset.dataType,
            totalSales: dataset.totalSales,
            totalRevenue: Number(dataset.totalRevenue),
            currentPrice: dataset.pricePerAccess,
            marketDemand: this.determineDemand(dataset.totalSales),
        };
        const recommendedPrice = await compute_service_1.computeService.getOptimalPrice(context);
        if (recommendedPrice === dataset.pricePerAccess)
            return;
        await registry_service_1.registryService.agentUpdatePrice(datasetId, recommendedPrice);
        await dataset_model_1.Dataset.findOneAndUpdate({ onChainId: datasetId }, { pricePerAccess: recommendedPrice });
    }
    async runAllAgentCycles() {
        const agentDatasets = await dataset_model_1.Dataset.find({ agentPricingEnabled: true });
        await Promise.allSettled(agentDatasets.map((ds) => this.runPricingCycle(ds.onChainId)));
    }
}
exports.agentService = new AgentService();
//# sourceMappingURL=agent.service.js.map