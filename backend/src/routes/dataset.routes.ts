import { Router } from "express";
import { z } from "zod";
import {
  registerDataset,
  getDatasets,
  getDataset,
  updateDataset,
} from "../controllers/dataset.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { DataType, UsagePermission, DatasetStatus } from "../types";

const router = Router();

const registerSchema = z.object({
  storageRootHash: z.string().min(1),
  metadataURI: z.string().url(),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  dataType: z.nativeEnum(DataType),
  permission: z.nativeEnum(UsagePermission),
  pricePerAccess: z.string().min(1),
  subscriptionPrice: z.string().optional(),
  agentAddress: z.string().optional(),
  agentPricingEnabled: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  samplePreview: z.string().optional(),
});

const updateSchema = z.object({
  pricePerAccess: z.string().min(1),
  subscriptionPrice: z.string().optional(),
  status: z.nativeEnum(DatasetStatus),
});

router.get("/", getDatasets);
router.get("/:id", getDataset);
router.post("/", authenticate, validate(registerSchema), registerDataset);
router.put("/:id", authenticate, validate(updateSchema), updateDataset);

export default router;