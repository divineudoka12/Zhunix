"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dataset = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const DatasetSchema = new mongoose_1.Schema({
    onChainId: { type: Number, required: true, unique: true },
    contributor: { type: String, required: true, lowercase: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    storageRootHash: { type: String, required: true, unique: true },
    metadataURI: { type: String, required: true },
    dataType: { type: String, enum: Object.values(types_1.DataType), required: true },
    permission: { type: String, enum: Object.values(types_1.UsagePermission), required: true },
    status: { type: String, enum: Object.values(types_1.DatasetStatus), default: types_1.DatasetStatus.ACTIVE },
    pricePerAccess: { type: String, required: true },
    subscriptionPrice: { type: String, default: "0" },
    agentAddress: { type: String, default: "" },
    agentPricingEnabled: { type: Boolean, default: false },
    tags: [{ type: String }],
    samplePreview: { type: String, default: "" },
    qualityScore: { type: Number, default: 0, min: 0, max: 100 },
    totalSales: { type: Number, default: 0 },
    totalRevenue: { type: String, default: "0" },
}, { timestamps: true });
DatasetSchema.index({ contributor: 1 });
DatasetSchema.index({ dataType: 1 });
DatasetSchema.index({ status: 1 });
DatasetSchema.index({ tags: 1 });
exports.Dataset = mongoose_1.default.model("Dataset", DatasetSchema);
//# sourceMappingURL=dataset.model.js.map