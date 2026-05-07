"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const purchase_controller_1 = require("../controllers/purchase.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get("/", auth_middleware_1.authenticate, purchase_controller_1.getPurchases);
router.get("/balance", auth_middleware_1.authenticate, purchase_controller_1.getPendingBalance);
router.get("/access/:datasetId", auth_middleware_1.authenticate, purchase_controller_1.checkAccess);
router.get("/:id", auth_middleware_1.authenticate, purchase_controller_1.getPurchase);
exports.default = router;
//# sourceMappingURL=purchase.routes.js.map