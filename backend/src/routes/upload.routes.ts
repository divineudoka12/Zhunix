import { Router } from "express";
import multer from "multer";
import { uploadDataset } from "../controllers/upload.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

router.post("/", authenticate, upload.single("file"), uploadDataset);

export default router;