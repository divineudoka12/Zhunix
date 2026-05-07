"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentStatus = exports.DatasetStatus = exports.UsagePermission = exports.DataType = void 0;
var DataType;
(function (DataType) {
    DataType["TEXT"] = "TEXT";
    DataType["CODE"] = "CODE";
    DataType["AUDIO"] = "AUDIO";
    DataType["VIDEO"] = "VIDEO";
    DataType["IMAGE"] = "IMAGE";
    DataType["BEHAVIORAL"] = "BEHAVIORAL";
    DataType["FINANCIAL"] = "FINANCIAL";
    DataType["DOMAIN"] = "DOMAIN";
})(DataType || (exports.DataType = DataType = {}));
var UsagePermission;
(function (UsagePermission) {
    UsagePermission["AI_TRAINING"] = "AI_TRAINING";
    UsagePermission["ANALYTICS"] = "ANALYTICS";
    UsagePermission["BOTH"] = "BOTH";
})(UsagePermission || (exports.UsagePermission = UsagePermission = {}));
var DatasetStatus;
(function (DatasetStatus) {
    DatasetStatus["ACTIVE"] = "ACTIVE";
    DatasetStatus["PAUSED"] = "PAUSED";
    DatasetStatus["REMOVED"] = "REMOVED";
})(DatasetStatus || (exports.DatasetStatus = DatasetStatus = {}));
var AgentStatus;
(function (AgentStatus) {
    AgentStatus["ACTIVE"] = "ACTIVE";
    AgentStatus["SUSPENDED"] = "SUSPENDED";
    AgentStatus["REVOKED"] = "REVOKED";
})(AgentStatus || (exports.AgentStatus = AgentStatus = {}));
//# sourceMappingURL=index.js.map