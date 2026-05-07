import { Router } from "express";
import { z } from "zod";
import { getNonce, verifySignature } from "../controllers/auth.controller";
import { validate } from "../middleware/validate.middleware";

const router = Router();

const verifySchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
});

router.get("/nonce/:address", getNonce);
router.post("/verify", validate(verifySchema), verifySignature);

export default router;