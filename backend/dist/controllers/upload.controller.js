"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadDataset = void 0;
const storage_service_1 = require("../services/storage/storage.service");
const error_middleware_1 = require("../middleware/error.middleware");
const uploadDataset = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(new error_middleware_1.AppError("No file provided", 400));
        }
        const rootHash = await storage_service_1.storageService.uploadFile(req.file.buffer, req.file.originalname);
        res.status(201).json({
            success: true,
            rootHash,
            originalName: req.file.originalname,
            size: req.file.size,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.uploadDataset = uploadDataset;
//# sourceMappingURL=upload.controller.js.map