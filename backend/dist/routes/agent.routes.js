"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const agent_controller_1 = require("../controllers/agent.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const router = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    agentAddress: zod_1.z.string().min(1),
    agenticTokenId: zod_1.z.number().int().positive(),
    metadataURI: zod_1.z.string().url(),
});
router.post("/", auth_middleware_1.authenticate, (0, validate_middleware_1.validate)(registerSchema), agent_controller_1.registerAgent);
router.get("/:address", agent_controller_1.getAgentByAddress);
router.post("/:datasetId/price-cycle", auth_middleware_1.authenticate, agent_controller_1.triggerPricingCycle);
exports.default = router;
//# sourceMappingURL=agent.routes.js.map