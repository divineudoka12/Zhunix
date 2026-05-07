import { Router } from "express";
import {
  getPurchases,
  getPurchase,
  checkAccess,
  getPendingBalance,
} from "../controllers/purchase.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authenticate, getPurchases);
router.get("/balance", authenticate, getPendingBalance);
router.get("/access/:datasetId", authenticate, checkAccess);
router.get("/:id", authenticate, getPurchase);

export default router;