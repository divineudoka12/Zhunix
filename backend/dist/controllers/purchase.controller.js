"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingBalance = exports.checkAccess = exports.getPurchase = exports.getPurchases = void 0;
const purchase_model_1 = require("../models/purchase.model");
const marketplace_service_1 = require("../services/contracts/marketplace.service");
const error_middleware_1 = require("../middleware/error.middleware");
const getPurchases = async (req, res, next) => {
    try {
        const purchases = await purchase_model_1.Purchase.find({
            buyer: req.user.address,
        }).sort({ createdAt: -1 });
        res.json({ success: true, purchases });
    }
    catch (err) {
        next(err);
    }
};
exports.getPurchases = getPurchases;
const getPurchase = async (req, res, next) => {
    try {
        const purchaseIdParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const purchase = await purchase_model_1.Purchase.findOne({
            onChainPurchaseId: parseInt(purchaseIdParam, 10),
        });
        if (!purchase) {
            return next(new error_middleware_1.AppError("Purchase not found", 404));
        }
        if (purchase.buyer !== req.user.address) {
            return next(new error_middleware_1.AppError("Forbidden", 403));
        }
        res.json({ success: true, purchase });
    }
    catch (err) {
        next(err);
    }
};
exports.getPurchase = getPurchase;
const checkAccess = async (req, res, next) => {
    try {
        const datasetIdParam = Array.isArray(req.params.datasetId) ? req.params.datasetId[0] : req.params.datasetId;
        const datasetId = parseInt(datasetIdParam, 10);
        const hasAccess = await marketplace_service_1.marketplaceService.hasActiveAccess(req.user.address, datasetId);
        res.json({ success: true, hasAccess, datasetId });
    }
    catch (err) {
        next(err);
    }
};
exports.checkAccess = checkAccess;
const getPendingBalance = async (req, res, next) => {
    try {
        const balance = await marketplace_service_1.marketplaceService.getPendingBalance(req.user.address);
        res.json({ success: true, balance });
    }
    catch (err) {
        next(err);
    }
};
exports.getPendingBalance = getPendingBalance;
//# sourceMappingURL=purchase.controller.js.map