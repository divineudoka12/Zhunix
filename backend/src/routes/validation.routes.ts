import { Router } from "express";
import { getValidation, getPendingValidations, triggerValidation } from "../controllers/validation.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

/**
 * Get all pending validations (admin)
 * GET /validation/pending
 */
router.get("/pending/list", getPendingValidations);

/**
 * Get validation status and history for a dataset
 * GET /validation/:datasetId
 */
router.get("/:datasetId", getValidation);

/**
 * Manually trigger validation for a dataset (admin/agent)
 * POST /validation/:datasetId/validate
 */
router.post("/:datasetId/validate", authenticate, triggerValidation);

export default router;
