"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_controller_1 = require("../controllers/auth.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const router = (0, express_1.Router)();
const verifySchema = zod_1.z.object({
    message: zod_1.z.string().min(1),
    signature: zod_1.z.string().min(1),
});
router.get("/nonce/:address", auth_controller_1.getNonce);
router.post("/verify", (0, validate_middleware_1.validate)(verifySchema), auth_controller_1.verifySignature);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map