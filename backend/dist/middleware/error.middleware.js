"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (err, _req, res, _next) => {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = err.message || "Internal server error";
    if (process.env.NODE_ENV === "development") {
        console.error(err);
    }
    res.status(statusCode).json({
        success: false,
        message,
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=error.middleware.js.map