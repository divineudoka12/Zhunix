import { Router } from "express";
import { z } from "zod";
import {
  registerAgent,
  getAgentByAddress,
  triggerPricingCycle,
} from "../controllers/agent.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";

const router = Router();

const registerSchema = z.object({
  agentAddress: z.string().min(1),
  agenticTokenId: z.number().int().positive(),
  metadataURI: z.string().url(),
});

router.post("/", authenticate, validate(registerSchema), registerAgent);
router.get("/:address", getAgentByAddress);
router.post("/:datasetId/price-cycle", authenticate, triggerPricingCycle);

export default router;