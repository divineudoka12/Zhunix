"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexerService = void 0;
const ethers_1 = require("ethers");
const registry_service_1 = require("../contracts/registry.service");
const marketplace_service_1 = require("../contracts/marketplace.service");
const dataset_model_1 = require("../../models/dataset.model");
const purchase_model_1 = require("../../models/purchase.model");
const types_1 = require("../../types");
const DATA_TYPE_MAP = {
    0: types_1.DataType.TEXT, 1: types_1.DataType.CODE, 2: types_1.DataType.AUDIO,
    3: types_1.DataType.VIDEO, 4: types_1.DataType.IMAGE, 5: types_1.DataType.BEHAVIORAL,
    6: types_1.DataType.FINANCIAL, 7: types_1.DataType.DOMAIN,
};
const PERMISSION_MAP = {
    0: types_1.UsagePermission.AI_TRAINING,
    1: types_1.UsagePermission.ANALYTICS,
    2: types_1.UsagePermission.BOTH,
};
const STATUS_MAP = {
    0: types_1.DatasetStatus.ACTIVE,
    1: types_1.DatasetStatus.PAUSED,
    2: types_1.DatasetStatus.REMOVED,
};
class IndexerService {
    constructor() {
        this.registryProvider = registry_service_1.registryService.getProvider();
        this.marketplaceProvider = marketplace_service_1.marketplaceService.getProvider();
    }
    async handleDatasetRegistered(log) {
        const parsed = registry_service_1.registryService.getContractInterface().parseLog(log);
        if (!parsed)
            return;
        const datasetId = Number(parsed.args[0]);
        const onChainData = await registry_service_1.registryService.getDataset(datasetId);
        await dataset_model_1.Dataset.findOneAndUpdate({ onChainId: datasetId }, {
            onChainId: datasetId,
            contributor: onChainData[1].toLowerCase(),
            storageRootHash: onChainData[3],
            metadataURI: onChainData[4],
            dataType: DATA_TYPE_MAP[Number(onChainData[5])],
            permission: PERMISSION_MAP[Number(onChainData[6])],
            status: STATUS_MAP[Number(onChainData[7])],
            pricePerAccess: ethers_1.ethers.formatEther(onChainData[8]),
            subscriptionPrice: ethers_1.ethers.formatEther(onChainData[9]),
            agentAddress: onChainData[2],
            agentPricingEnabled: onChainData[14],
        }, { upsert: true, new: true });
    }
    async handleDatasetUpdated(log) {
        const parsed = registry_service_1.registryService.getContractInterface().parseLog(log);
        if (!parsed)
            return;
        const datasetId = Number(parsed.args[0]);
        const newPrice = ethers_1.ethers.formatEther(parsed.args[1]);
        const newStatus = STATUS_MAP[Number(parsed.args[2])];
        await dataset_model_1.Dataset.findOneAndUpdate({ onChainId: datasetId }, { pricePerAccess: newPrice, status: newStatus });
    }
    async handlePurchaseCreated(log) {
        const parsed = marketplace_service_1.marketplaceService.getContractInterface().parseLog(log);
        if (!parsed)
            return;
        const purchaseId = Number(parsed.args[0]);
        const datasetId = Number(parsed.args[1]);
        const buyer = parsed.args[2].toLowerCase();
        const amount = ethers_1.ethers.formatEther(parsed.args[3]);
        const isSubscription = parsed.args[4];
        const onChainPurchase = await marketplace_service_1.marketplaceService.getPurchase(purchaseId);
        const contributor = onChainPurchase[3].toLowerCase();
        const platformFee = ethers_1.ethers.formatEther(onChainPurchase[5]);
        const contributorPayout = ethers_1.ethers.formatEther(onChainPurchase[6]);
        await purchase_model_1.Purchase.findOneAndUpdate({ onChainPurchaseId: purchaseId }, {
            onChainPurchaseId: purchaseId,
            datasetId,
            buyer,
            contributor,
            amount,
            platformFee,
            contributorPayout,
            isSubscription,
            txHash: log.transactionHash,
        }, { upsert: true, new: true });
        // update dataset sales stats in MongoDB
        await dataset_model_1.Dataset.findOneAndUpdate({ onChainId: datasetId }, { $inc: { totalSales: 1 } });
    }
    async handleAgentPriceUpdated(log) {
        const parsed = registry_service_1.registryService.getContractInterface().parseLog(log);
        if (!parsed)
            return;
        const datasetId = Number(parsed.args[0]);
        const newPrice = ethers_1.ethers.formatEther(parsed.args[1]);
        await dataset_model_1.Dataset.findOneAndUpdate({ onChainId: datasetId }, { pricePerAccess: newPrice });
    }
    start() {
        const registryContract = new ethers_1.ethers.Contract(registry_service_1.registryService.getContractAddress(), registry_service_1.registryService.getContractInterface(), this.registryProvider);
        const marketplaceContract = new ethers_1.ethers.Contract(marketplace_service_1.marketplaceService.getContractAddress(), marketplace_service_1.marketplaceService.getContractInterface(), this.marketplaceProvider);
        registryContract.on("DatasetRegistered", (_id, _contributor, _type, _hash, _price, log) => this.handleDatasetRegistered(log).catch(console.error));
        registryContract.on("DatasetUpdated", (_id, _price, _status, log) => this.handleDatasetUpdated(log).catch(console.error));
        registryContract.on("AgentPriceUpdated", (_id, _price, _agent, log) => this.handleAgentPriceUpdated(log).catch(console.error));
        marketplaceContract.on("PurchaseCreated", (_pid, _did, _buyer, _amount, _isSub, log) => this.handlePurchaseCreated(log).catch(console.error));
        console.log("Indexer listening for on-chain events");
    }
}
exports.indexerService = new IndexerService();
//# sourceMappingURL=indexer.service.js.map