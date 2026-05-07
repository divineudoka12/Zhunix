"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDataset = exports.getDataset = exports.getDatasets = exports.registerDataset = void 0;
const types_1 = require("../types");
const dataset_model_1 = require("../models/dataset.model");
const registry_service_1 = require("../services/contracts/registry.service");
const error_middleware_1 = require("../middleware/error.middleware");
const registerDataset = async (req, res, next) => {
    try {
        const { storageRootHash, metadataURI, name, description, dataType, permission, pricePerAccess, subscriptionPrice, agentAddress, agentPricingEnabled, tags, samplePreview, } = req.body;
        const existing = await dataset_model_1.Dataset.findOne({ storageRootHash });
        if (existing) {
            return next(new error_middleware_1.AppError("Dataset with this root hash already exists", 409));
        }
        const { datasetId, txHash } = await registry_service_1.registryService.registerDataset({
            storageRootHash,
            metadataURI,
            dataType,
            permission,
            pricePerAccess,
            subscriptionPrice: subscriptionPrice || "0",
            agentAddress: agentAddress || "",
            agentPricingEnabled: agentPricingEnabled || false,
        });
        const dataset = await dataset_model_1.Dataset.create({
            onChainId: datasetId,
            contributor: req.user.address,
            name,
            description,
            storageRootHash,
            metadataURI,
            dataType,
            permission,
            pricePerAccess,
            subscriptionPrice: subscriptionPrice || "0",
            agentAddress: agentAddress || "",
            agentPricingEnabled: agentPricingEnabled || false,
            tags: tags || [],
            samplePreview: samplePreview || "",
        });
        res.status(201).json({ success: true, dataset, txHash });
    }
    catch (err) {
        next(err);
    }
};
exports.registerDataset = registerDataset;
const getDatasets = async (req, res, next) => {
    try {
        const { dataType, permission, status, contributor, page = "1", limit = "20", tags, } = req.query;
        const filter = {
            status: status || types_1.DatasetStatus.ACTIVE,
        };
        if (dataType)
            filter.dataType = dataType;
        if (permission)
            filter.permission = permission;
        if (contributor)
            filter.contributor = contributor.toLowerCase();
        if (tags)
            filter.tags = { $in: tags.split(",") };
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const [datasets, total] = await Promise.all([
            dataset_model_1.Dataset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
            dataset_model_1.Dataset.countDocuments(filter),
        ]);
        res.json({
            success: true,
            datasets,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getDatasets = getDatasets;
const getDataset = async (req, res, next) => {
    try {
        const datasetIdParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const dataset = await dataset_model_1.Dataset.findOne({ onChainId: parseInt(datasetIdParam, 10) });
        if (!dataset) {
            return next(new error_middleware_1.AppError("Dataset not found", 404));
        }
        res.json({ success: true, dataset });
    }
    catch (err) {
        next(err);
    }
};
exports.getDataset = getDataset;
const updateDataset = async (req, res, next) => {
    try {
        const datasetIdParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const datasetId = parseInt(datasetIdParam, 10);
        const dataset = await dataset_model_1.Dataset.findOne({ onChainId: datasetId });
        if (!dataset) {
            return next(new error_middleware_1.AppError("Dataset not found", 404));
        }
        if (dataset.contributor !== req.user.address) {
            return next(new error_middleware_1.AppError("Forbidden", 403));
        }
        const { pricePerAccess, subscriptionPrice, status } = req.body;
        const statusIndex = {
            [types_1.DatasetStatus.ACTIVE]: 0,
            [types_1.DatasetStatus.PAUSED]: 1,
            [types_1.DatasetStatus.REMOVED]: 2,
        };
        await registry_service_1.registryService["contract"].updateDataset(datasetId, pricePerAccess, subscriptionPrice || dataset.subscriptionPrice, statusIndex[status] ?? 0);
        const updated = await dataset_model_1.Dataset.findOneAndUpdate({ onChainId: datasetId }, { pricePerAccess, subscriptionPrice, status }, { new: true });
        res.json({ success: true, dataset: updated });
    }
    catch (err) {
        next(err);
    }
};
exports.updateDataset = updateDataset;
//# sourceMappingURL=dataset.controller.js.map