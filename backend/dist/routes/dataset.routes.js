"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const dataset_controller_1 = require("../controllers/dataset.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    storageRootHash: zod_1.z.string().min(1),
    metadataURI: zod_1.z.string().url(),
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().min(1).max(1000),
    dataType: zod_1.z.nativeEnum(types_1.DataType),
    permission: zod_1.z.nativeEnum(types_1.UsagePermission),
    pricePerAccess: zod_1.z.string().min(1),
    subscriptionPrice: zod_1.z.string().optional(),
    agentAddress: zod_1.z.string().optional(),
    agentPricingEnabled: zod_1.z.boolean().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    samplePreview: zod_1.z.string().optional(),
});
const updateSchema = zod_1.z.object({
    pricePerAccess: zod_1.z.string().min(1),
    subscriptionPrice: zod_1.z.string().optional(),
    status: zod_1.z.nativeEnum(types_1.DatasetStatus),
});
router.get("/", dataset_controller_1.getDatasets);
router.get("/:id", dataset_controller_1.getDataset);
router.post("/", auth_middleware_1.authenticate, (0, validate_middleware_1.validate)(registerSchema), dataset_controller_1.registerDataset);
router.put("/:id", auth_middleware_1.authenticate, (0, validate_middleware_1.validate)(updateSchema), dataset_controller_1.updateDataset);
exports.default = router;
//# sourceMappingURL=dataset.routes.js.map