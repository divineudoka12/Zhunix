"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const error_middleware_1 = require("./error.middleware");
const authenticate = (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new error_middleware_1.AppError("Unauthorized", 401));
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
        req.user = { address: decoded.address.toLowerCase() };
        next();
    }
    catch {
        next(new error_middleware_1.AppError("Invalid or expired token", 401));
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=auth.middleware.js.map