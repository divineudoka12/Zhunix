import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { storageService } from "../services/storage/storage.service";
import { validationService } from "../services/validation/validation.service";
import { AppError } from "../middleware/error.middleware";

export const uploadDataset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      return next(new AppError("No file provided", 400));
    }

    // Extract validation agent address - now mandatory
    const { agentAddress, dataType, description } = req.body;

    if (!agentAddress) {
      return next(new AppError("Agent address is mandatory for data validation", 400));
    }

    if (!dataType) {
      return next(new AppError("Data type is required", 400));
    }

    // Upload file to storage
    const rootHash = await storageService.uploadFile(
      req.file.buffer,
      req.file.originalname
    );

    // Note: Quality validation happens after dataset registration on-chain
    // For now, we return the storage info and indicate pending validation

    res.status(201).json({
      success: true,
      rootHash,
      originalName: req.file.originalname,
      size: req.file.size,
      message: "File uploaded successfully. Validation pending assignment to dataset registration.",
      validatorAgent: agentAddress,
      dataType,
    });
  } catch (err) {
    next(err);
  }
};