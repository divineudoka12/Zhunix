"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySignature = exports.getNonce = void 0;
const siwe_1 = require("siwe");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const error_middleware_1 = require("../middleware/error.middleware");
const nonceStore = new Map();
const getNonce = (req, res) => {
    const rawAddress = req.params.address;
    const address = Array.isArray(rawAddress) ? rawAddress[0] : rawAddress;
    if (!address) {
        res.status(400).json({ success: false, message: "Address required" });
        return;
    }
    const nonce = Math.random().toString(36).substring(2, 15);
    nonceStore.set(address.toLowerCase(), nonce);
    res.json({ success: true, nonce });
};
exports.getNonce = getNonce;
const verifySignature = async (req, res, next) => {
    try {
        const { message, signature } = req.body;
        const siweMessage = new siwe_1.SiweMessage(message);
        const result = await siweMessage.verify({ signature });
        if (!result.success) {
            return next(new error_middleware_1.AppError("Invalid signature", 401));
        }
        const address = result.data.address.toLowerCase();
        const storedNonce = nonceStore.get(address);
        if (!storedNonce || storedNonce !== result.data.nonce) {
            return next(new error_middleware_1.AppError("Invalid or expired nonce", 401));
        }
        nonceStore.delete(address);
        const token = jsonwebtoken_1.default.sign({ address }, config_1.config.jwt.secret, {
            expiresIn: config_1.config.jwt.expiresIn,
        });
        res.json({ success: true, token, address });
    }
    catch (err) {
        next(err);
    }
};
exports.verifySignature = verifySignature;
//# sourceMappingURL=auth.controller.js.map