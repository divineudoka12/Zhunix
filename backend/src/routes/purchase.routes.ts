import { Router } from "express";
import {
  getPurchases,
  getPurchase,
  checkAccess,
  getPendingBalance,
  getLicensedAccess,
  simulateLicensedUse,
  runLicensedQuery,
  simulateShareAttempt,
} from "../controllers/purchase.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authenticate, getPurchases);
router.get("/balance", authenticate, getPendingBalance);
router.get("/access/:datasetId", authenticate, checkAccess);
router.get("/licensed/:datasetId", authenticate, getLicensedAccess);
router.post("/licensed/:datasetId/use", authenticate, simulateLicensedUse);
router.post("/licensed/:datasetId/query", authenticate, runLicensedQuery);
router.post("/licensed/:datasetId/share-check", authenticate, simulateShareAttempt);
router.get("/:id", authenticate, getPurchase);

export default router;
