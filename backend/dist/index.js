"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("./config");
const error_middleware_1 = require("./middleware/error.middleware");
const indexer_service_1 = require("./services/indexer/indexer.service");
const agent_service_1 = require("./services/agent/agent.service");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const dataset_routes_1 = __importDefault(require("./routes/dataset.routes"));
const purchase_routes_1 = __importDefault(require("./routes/purchase.routes"));
const agent_routes_1 = __importDefault(require("./routes/agent.routes"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use("/api/auth", auth_routes_1.default);
app.use("/api/upload", upload_routes_1.default);
app.use("/api/datasets", dataset_routes_1.default);
app.use("/api/purchases", purchase_routes_1.default);
app.use("/api/agents", agent_routes_1.default);
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.use(error_middleware_1.errorHandler);
const start = async () => {
    await mongoose_1.default.connect(config_1.config.mongoUri);
    console.log("MongoDB connected");
    // start on-chain event indexer
    indexer_service_1.indexerService.start();
    // run agent pricing cycle every 30 minutes
    setInterval(() => {
        agent_service_1.agentService.runAllAgentCycles().catch(console.error);
    }, 30 * 60 * 1000);
    app.listen(config_1.config.port, () => {
        console.log(`DataVault API running on port ${config_1.config.port}`);
    });
};
start().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map