import { Request, Response, NextFunction } from "express";
import { AuthRequest, DataType, UsagePermission, DatasetStatus } from "../types";
import { Dataset } from "../models/dataset.model";
import { registryService } from "../services/contracts/registry.service";
import { validationService } from "../services/validation/validation.service";
import { AppError } from "../middleware/error.middleware";

export const registerDataset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      storageRootHash, metadataURI, name, description,
      dataType, permission, pricePerAccess, subscriptionPrice,
      agentAddress, tags, samplePreview, fileSize: rawFileSize, fileName: rawFileName,
    } = req.body;

    // Agent address is now mandatory
    if (!agentAddress) {
      return next(new AppError("Agent address is mandatory for quality validation", 400));
    }

    const existing = await Dataset.findOne({ storageRootHash });
    if (existing) {
      return next(new AppError("Dataset with this root hash already exists", 409));
    }

    // Register on-chain with mandatory agent pricing enabled
    const { datasetId, txHash } = await registryService.registerDataset({
      storageRootHash,
      metadataURI,
      dataType,
      permission,
      pricePerAccess,
      subscriptionPrice: subscriptionPrice || "0",
      agentAddress,
      agentPricingEnabled: true,
    });

    // Create dataset with pending validation status
    const dataset = await Dataset.create({
      onChainId: datasetId,
      contributor: req.user!.address,
      name,
      description,
      storageRootHash,
      metadataURI,
      dataType,
      permission,
      pricePerAccess,
      subscriptionPrice: subscriptionPrice || "0",
      agentAddress,
      agentPricingEnabled: true,
      tags: tags || [],
      samplePreview: samplePreview || "",
    });

    // Trigger async validation by quality agent
    // This happens asynchronously to prevent blocking the registration
    const fileSize = Number(rawFileSize) || 0;
    const fileName = String(rawFileName || storageRootHash);

    validationService
      .validateDataset(
        datasetId,
        storageRootHash,
        dataType,
        fileSize,
        fileName,
        description,
        agentAddress
      )
      .catch((err) => {
        console.error(`Validation failed for dataset ${datasetId}:`, err);
      });

    res.status(201).json({
      success: true,
      dataset,
      txHash,
      message: "Dataset registered. Quality validation in progress.",
    });
  } catch (err) {
    next(err);
  }
};

export const getDatasets = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      dataType, permission, status, contributor,
      page = "1", limit = "20", tags,
    } = req.query;

    const filter: Record<string, unknown> = {
      status: status || DatasetStatus.ACTIVE,
    };

    if (dataType) filter.dataType = dataType;
    if (permission) filter.permission = permission;
    if (contributor) filter.contributor = (contributor as string).toLowerCase();
    if (tags) filter.tags = { $in: (tags as string).split(",") };

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [datasets, total] = await Promise.all([
      Dataset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Dataset.countDocuments(filter),
    ]);

    res.json({
      success: true,
      datasets,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
};

export const getDataset = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const datasetIdParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const dataset = await Dataset.findOne({ onChainId: parseInt(datasetIdParam, 10) });

    if (!dataset) {
      return next(new AppError("Dataset not found", 404));
    }

    res.json({ success: true, dataset });
  } catch (err) {
    next(err);
  }
};

export const updateDataset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const datasetIdParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const datasetId = parseInt(datasetIdParam, 10);
    const dataset = await Dataset.findOne({ onChainId: datasetId });

    if (!dataset) {
      return next(new AppError("Dataset not found", 404));
    }

    if (dataset.contributor !== req.user!.address) {
      return next(new AppError("Forbidden", 403));
    }

    const { pricePerAccess, subscriptionPrice, status } = req.body;

    const statusIndex: Record<DatasetStatus, number> = {
      [DatasetStatus.ACTIVE]: 0,
      [DatasetStatus.PAUSED]: 1,
      [DatasetStatus.REMOVED]: 2,
    };

    await registryService["contract"].updateDataset(
      datasetId,
      pricePerAccess,
      subscriptionPrice || dataset.subscriptionPrice,
      statusIndex[status as DatasetStatus] ?? 0
    );

    const updated = await Dataset.findOneAndUpdate(
      { onChainId: datasetId },
      { pricePerAccess, subscriptionPrice, status },
      { new: true }
    );

    res.json({ success: true, dataset: updated });
  } catch (err) {
    next(err);
  }
};
