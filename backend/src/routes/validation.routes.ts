import { Router } from "express";
import { getValidation, getPendingValidations, triggerValidation } from "../controllers/validation.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

/**
 * Get validation status and history for a dataset
 * GET /validation/:datasetId
 */
router.get("/:datasetId", getValidation);

/**
 * Get all pending validations (admin)
 * GET /validation/pending
 */
router.get("/pending/list", getPendingValidations);

/**
 * Manually trigger validation for a dataset (admin/agent)
 * POST /validation/:datasetId/validate
 */
router.post("/:datasetId/validate", authMiddleware, triggerValidation);

export default router;
