import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { Purchase } from "../models/purchase.model";
import { marketplaceService } from "../services/contracts/marketplace.service";
import { AppError } from "../middleware/error.middleware";

export const getPurchases = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const purchases = await Purchase.find({
      buyer: req.user!.address,
    }).sort({ createdAt: -1 });

    res.json({ success: true, purchases });
  } catch (err) {
    next(err);
  }
};

export const getPurchase = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const purchaseIdParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const purchase = await Purchase.findOne({
      onChainPurchaseId: parseInt(purchaseIdParam, 10),
    });

    if (!purchase) {
      return next(new AppError("Purchase not found", 404));
    }

    if (purchase.buyer !== req.user!.address) {
      return next(new AppError("Forbidden", 403));
    }

    res.json({ success: true, purchase });
  } catch (err) {
    next(err);
  }
};

export const checkAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const datasetIdParam = Array.isArray(req.params.datasetId) ? req.params.datasetId[0] : req.params.datasetId;
    const datasetId = parseInt(datasetIdParam, 10);
    const hasAccess = await marketplaceService.hasActiveAccess(
      req.user!.address,
      datasetId
    );

    res.json({ success: true, hasAccess, datasetId });
  } catch (err) {
    next(err);
  }
};

export const getPendingBalance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const balance = await marketplaceService.getPendingBalance(req.user!.address);
    res.json({ success: true, balance });
  } catch (err) {
    next(err);
  }
};
