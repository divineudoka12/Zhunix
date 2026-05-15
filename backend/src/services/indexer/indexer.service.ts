import { ethers } from "ethers";
import { registryService } from "../contracts/registry.service";
import { marketplaceService } from "../contracts/marketplace.service";
import { Dataset } from "../../models/dataset.model";
import { Purchase } from "../../models/purchase.model";
import { DataType, UsagePermission, DatasetStatus } from "../../types";

const DATA_TYPE_MAP: Record<number, DataType> = {
  0: DataType.TEXT, 1: DataType.CODE, 2: DataType.AUDIO,
  3: DataType.VIDEO, 4: DataType.IMAGE, 5: DataType.BEHAVIORAL,
  6: DataType.FINANCIAL, 7: DataType.DOMAIN,
};

const PERMISSION_MAP: Record<number, UsagePermission> = {
  0: UsagePermission.AI_TRAINING,
  1: UsagePermission.ANALYTICS,
  2: UsagePermission.BOTH,
};

const STATUS_MAP: Record<number, DatasetStatus> = {
  0: DatasetStatus.ACTIVE,
  1: DatasetStatus.PAUSED,
  2: DatasetStatus.REMOVED,
};

class IndexerService {
  private registryProvider: ethers.JsonRpcProvider;
  private marketplaceProvider: ethers.JsonRpcProvider;

  constructor() {
    this.registryProvider = registryService.getProvider();
    this.marketplaceProvider = marketplaceService.getProvider();
  }

  private getEventTransactionHash(event: unknown): string {
    if (typeof event === "object" && event && "log" in event) {
      const log = (event as { log?: { transactionHash?: string } }).log;
      return log?.transactionHash || "";
    }
    if (typeof event === "object" && event && "transactionHash" in event) {
      return String((event as { transactionHash?: string }).transactionHash || "");
    }
    return "";
  }

  private async handleDatasetRegistered(datasetIdValue: ethers.BigNumberish): Promise<void> {
    const datasetId = Number(datasetIdValue);
    const onChainData = await registryService.getDataset(datasetId);

    await Dataset.findOneAndUpdate(
      { onChainId: datasetId },
      {
        onChainId: datasetId,
        contributor: onChainData[1].toLowerCase(),
        storageRootHash: onChainData[3],
        metadataURI: onChainData[4],
        dataType: DATA_TYPE_MAP[Number(onChainData[5])],
        permission: PERMISSION_MAP[Number(onChainData[6])],
        status: STATUS_MAP[Number(onChainData[7])],
        pricePerAccess: ethers.formatEther(onChainData[8]),
        subscriptionPrice: ethers.formatEther(onChainData[9]),
        agentAddress: onChainData[2],
        agentPricingEnabled: onChainData[14],
      },
      { upsert: true, returnDocument: "after" }
    );
  }

  private async handleDatasetUpdated(
    datasetIdValue: ethers.BigNumberish,
    newPriceValue: ethers.BigNumberish,
    statusValue: ethers.BigNumberish
  ): Promise<void> {
    const datasetId = Number(datasetIdValue);
    const newPrice = ethers.formatEther(newPriceValue);
    const newStatus = STATUS_MAP[Number(statusValue)];

    await Dataset.findOneAndUpdate(
      { onChainId: datasetId },
      { pricePerAccess: newPrice, status: newStatus }
    );
  }

  private async handlePurchaseCreated(
    purchaseIdValue: ethers.BigNumberish,
    datasetIdValue: ethers.BigNumberish,
    buyerValue: string,
    amountValue: ethers.BigNumberish,
    isSubscription: boolean,
    event: unknown
  ): Promise<void> {
    const purchaseId = Number(purchaseIdValue);
    const datasetId = Number(datasetIdValue);
    const buyer = buyerValue.toLowerCase();
    const amount = ethers.formatEther(amountValue);

    const onChainPurchase = await marketplaceService.getPurchase(purchaseId);
    const contributor = onChainPurchase[3].toLowerCase();
    const platformFee = ethers.formatEther(onChainPurchase[5]);
    const contributorPayout = ethers.formatEther(onChainPurchase[6]);

    await Purchase.findOneAndUpdate(
      { onChainPurchaseId: purchaseId },
      {
        onChainPurchaseId: purchaseId,
        datasetId,
        buyer,
        contributor,
        amount,
        platformFee,
        contributorPayout,
        isSubscription,
        txHash: this.getEventTransactionHash(event),
      },
      { upsert: true, returnDocument: "after" }
    );

    // update dataset sales stats in MongoDB
    await Dataset.findOneAndUpdate(
      { onChainId: datasetId },
      { $inc: { totalSales: 1 } }
    );
  }

  private async handleAgentPriceUpdated(
    datasetIdValue: ethers.BigNumberish,
    newPriceValue: ethers.BigNumberish
  ): Promise<void> {
    const datasetId = Number(datasetIdValue);
    const newPrice = ethers.formatEther(newPriceValue);

    await Dataset.findOneAndUpdate(
      { onChainId: datasetId },
      { pricePerAccess: newPrice }
    );
  }

  start(): void {
    const registryContract = new ethers.Contract(
      registryService.getContractAddress(),
      registryService.getContractInterface(),
      this.registryProvider
    );

    const marketplaceContract = new ethers.Contract(
      marketplaceService.getContractAddress(),
      marketplaceService.getContractInterface(),
      this.marketplaceProvider
    );

    registryContract.on("DatasetRegistered", (id) =>
      this.handleDatasetRegistered(id).catch(console.error)
    );

    registryContract.on("DatasetUpdated", (id, price, status) =>
      this.handleDatasetUpdated(id, price, status).catch(console.error)
    );

    registryContract.on("AgentPriceUpdated", (id, price) =>
      this.handleAgentPriceUpdated(id, price).catch(console.error)
    );

    marketplaceContract.on("PurchaseCreated", (purchaseId, datasetId, buyer, amount, isSubscription, event) =>
      this.handlePurchaseCreated(purchaseId, datasetId, buyer, amount, isSubscription, event).catch(console.error)
    );

    console.log("Indexer listening for on-chain events");
  }
}

export const indexerService = new IndexerService();
