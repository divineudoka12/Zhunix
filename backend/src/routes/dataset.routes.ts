import { Router } from "express";
import { z } from "zod";
import {
  registerDataset,
  draftDatasetLicense,
  getDatasets,
  scoutMarketplace,
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
  agentAddress: z.string().min(1),
  agentPricingEnabled: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  samplePreview: z.string().optional(),
  fileSize: z.number().optional(),
  fileName: z.string().optional(),
  privacyMode: z.string().optional(),
  storageSubmissionUrl: z.string().optional(),
  storageTxSeq: z.number().nullable().optional(),
  licenseMetadata: z.record(z.string(), z.unknown()).optional(),
});

const draftSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().nonnegative(),
  dataType: z.nativeEnum(DataType).optional(),
  description: z.string().max(1000).optional().default(""),
  storageRootHash: z.string().min(1),
  storageSubmissionUrl: z.string().optional(),
  privacyMode: z.string().optional(),
});

const scoutSchema = z.object({
  prompt: z.string().min(3).max(1000),
  budget: z.number().nonnegative().optional(),
  limit: z.number().int().min(1).max(25).optional(),
});

const updateSchema = z.object({
  pricePerAccess: z.string().min(1),
  subscriptionPrice: z.string().optional(),
  status: z.nativeEnum(DatasetStatus),
});

router.get("/", getDatasets);
router.post("/draft", authenticate, validate(draftSchema), draftDatasetLicense);
router.post("/scout", validate(scoutSchema), scoutMarketplace);
router.get("/:id", getDataset);
router.post("/", authenticate, validate(registerSchema), registerDataset);
router.put("/:id", authenticate, validate(updateSchema), updateDataset);

export default router;
