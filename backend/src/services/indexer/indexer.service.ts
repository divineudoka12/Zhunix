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

  private async handleDatasetRegistered(log: ethers.Log): Promise<void> {
    const parsed = registryService.getContractInterface().parseLog(log);
    if (!parsed) return;

    const datasetId = Number(parsed.args[0]);
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
      { upsert: true, new: true }
    );
  }

  private async handleDatasetUpdated(log: ethers.Log): Promise<void> {
    const parsed = registryService.getContractInterface().parseLog(log);
    if (!parsed) return;

    const datasetId = Number(parsed.args[0]);
    const newPrice = ethers.formatEther(parsed.args[1]);
    const newStatus = STATUS_MAP[Number(parsed.args[2])];

    await Dataset.findOneAndUpdate(
      { onChainId: datasetId },
      { pricePerAccess: newPrice, status: newStatus }
    );
  }

  private async handlePurchaseCreated(log: ethers.Log): Promise<void> {
    const parsed = marketplaceService.getContractInterface().parseLog(log);
    if (!parsed) return;

    const purchaseId = Number(parsed.args[0]);
    const datasetId = Number(parsed.args[1]);
    const buyer = parsed.args[2].toLowerCase();
    const amount = ethers.formatEther(parsed.args[3]);
    const isSubscription = parsed.args[4];

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
        txHash: log.transactionHash,
      },
      { upsert: true, new: true }
    );

    // update dataset sales stats in MongoDB
    await Dataset.findOneAndUpdate(
      { onChainId: datasetId },
      { $inc: { totalSales: 1 } }
    );
  }

  private async handleAgentPriceUpdated(log: ethers.Log): Promise<void> {
    const parsed = registryService.getContractInterface().parseLog(log);
    if (!parsed) return;

    const datasetId = Number(parsed.args[0]);
    const newPrice = ethers.formatEther(parsed.args[1]);

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

    registryContract.on("DatasetRegistered", (_id, _contributor, _type, _hash, _price, log) =>
      this.handleDatasetRegistered(log).catch(console.error)
    );

    registryContract.on("DatasetUpdated", (_id, _price, _status, log) =>
      this.handleDatasetUpdated(log).catch(console.error)
    );

    registryContract.on("AgentPriceUpdated", (_id, _price, _agent, log) =>
      this.handleAgentPriceUpdated(log).catch(console.error)
    );

    marketplaceContract.on("PurchaseCreated", (_pid, _did, _buyer, _amount, _isSub, log) =>
      this.handlePurchaseCreated(log).catch(console.error)
    );

    console.log("Indexer listening for on-chain events");
  }
}

export const indexerService = new IndexerService();