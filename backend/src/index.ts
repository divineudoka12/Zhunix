import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import { config } from "./config";
import { errorHandler } from "./middleware/error.middleware";
import { indexerService } from "./services/indexer/indexer.service";
import { agentService } from "./services/agent/agent.service";

import authRoutes from "./routes/auth.routes";
import uploadRoutes from "./routes/upload.routes";
import datasetRoutes from "./routes/dataset.routes";
import purchaseRoutes from "./routes/purchase.routes";
import agentRoutes from "./routes/agent.routes";
import validationRoutes from "./routes/validation.routes";

const app = express();

app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'https://zhunix.vercel.app',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/datasets", datasetRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/validation", validationRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const start = async (): Promise<void> => {
  await mongoose.connect(config.mongoUri);
  console.log("MongoDB connected");

  // start on-chain event indexer
  indexerService.start();

  // run agent pricing cycle every 30 minutes
  setInterval(() => {
    agentService.runAllAgentCycles().catch(console.error);
  }, 30 * 60 * 1000);

  app.listen(config.port, () => {
    console.log(`Zhunix API running on port ${config.port}`);
  });
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
