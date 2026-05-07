import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { storageService } from "../services/storage/storage.service";
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

    const rootHash = await storageService.uploadFile(
      req.file.buffer,
      req.file.originalname
    );

    res.status(201).json({
      success: true,
      rootHash,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (err) {
    next(err);
  }
};