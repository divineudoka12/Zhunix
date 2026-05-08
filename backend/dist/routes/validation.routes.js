"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validation_controller_1 = require("../controllers/validation.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
/**
 * Get validation status and history for a dataset
 * GET /validation/:datasetId
 */
router.get("/:datasetId", validation_controller_1.getValidation);
/**
 * Get all pending validations (admin)
 * GET /validation/pending
 */
router.get("/pending/list", validation_controller_1.getPendingValidations);
/**
 * Manually trigger validation for a dataset (admin/agent)
 * POST /validation/:datasetId/validate
 */
router.post("/:datasetId/validate", auth_middleware_1.authMiddleware, validation_controller_1.triggerValidation);
exports.default = router;
//# sourceMappingURL=validation.routes.js.map