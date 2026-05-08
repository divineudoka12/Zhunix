import { Dataset } from "../../models/dataset.model";
import { computeService } from "../compute/compute.service";
import { registryService } from "../contracts/registry.service";
import { DataType, PricingContext, ValidationStatus } from "../../types";

const DEMAND_THRESHOLDS = { low: 5, medium: 20 };

class AgentService {
  private determineDemand(totalSales: number): "LOW" | "MEDIUM" | "HIGH" {
    if (totalSales <= DEMAND_THRESHOLDS.low) return "LOW";
    if (totalSales <= DEMAND_THRESHOLDS.medium) return "MEDIUM";
    return "HIGH";
  }

  async runPricingCycle(datasetId: number): Promise<void> {
    const dataset = await Dataset.findOne({ onChainId: datasetId });

    // Only allow pricing for validated datasets
    if (
      !dataset ||
      !dataset.agentPricingEnabled ||
      !dataset.agentAddress ||
      dataset.validationStatus !== ValidationStatus.APPROVED
    ) {
      return;
    }

    const isAuthorized = await registryService
      .getContractInterface()
      .getEvent("AgentPriceUpdated");

    if (!isAuthorized) return;

    const context: PricingContext = {
      dataType: dataset.dataType as DataType,
      totalSales: dataset.totalSales,
      totalRevenue: Number(dataset.totalRevenue),
      currentPrice: dataset.pricePerAccess,
      marketDemand: this.determineDemand(dataset.totalSales),
    };

    const recommendedPrice = await computeService.getOptimalPrice(context);

    if (recommendedPrice === dataset.pricePerAccess) return;

    await registryService.agentUpdatePrice(datasetId, recommendedPrice);

    await Dataset.findOneAndUpdate(
      { onChainId: datasetId },
      { pricePerAccess: recommendedPrice }
    );
  }

  async runAllAgentCycles(): Promise<void> {
    // Only run pricing for validated and approved datasets
    const agentDatasets = await Dataset.find({
      agentPricingEnabled: true,
      validationStatus: ValidationStatus.APPROVED,
    });

    await Promise.allSettled(
      agentDatasets.map((ds) => this.runPricingCycle(ds.onChainId))
    );
  }
}

export const agentService = new AgentService();
