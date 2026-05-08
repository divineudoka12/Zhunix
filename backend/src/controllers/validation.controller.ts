import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { validationService } from "../services/validation/validation.service";
import { AppError } from "../middleware/error.middleware";

/**
 * Get validation status and details for a dataset
 */
export const getValidation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { datasetId } = req.params;

    const validation = await validationService.getValidationHistory(Number(datasetId));

    if (!validation) {
      return next(new AppError("Dataset not found", 404));
    }

    res.json({
      success: true,
      validation,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get datasets pending validation (admin/agent only)
 */
export const getPendingValidations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const datasets = await validationService.getPendingValidations(limit);

    res.json({
      success: true,
      count: datasets.length,
      datasets,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Manually trigger validation for a dataset
 */
export const triggerValidation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { datasetId } = req.params;
    const { agentAddress, fileSize, fileName, description, dataType } = req.body;

    if (!agentAddress) {
      return next(new AppError("Agent address is required", 400));
    }

    // Get dataset info
    const { Dataset } = await import("../models/dataset.model");
    const dataset = await Dataset.findOne({ onChainId: datasetId });

    if (!dataset) {
      return next(new AppError("Dataset not found", 404));
    }

    const result = await validationService.validateDataset(
      Number(datasetId),
      dataset.storageRootHash,
      dataType || dataset.dataType,
      Number(fileSize) || 0,
      fileName || dataset.name,
      description || dataset.description,
      agentAddress
    );

    res.json({
      success: true,
      result,
    });
  } catch (err) {
    next(err);
  }
};
