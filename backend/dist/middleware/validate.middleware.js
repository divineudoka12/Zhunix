"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: result.error.flatten().fieldErrors,
        });
        return;
    }
    req.body = result.data;
    next();
};
exports.validate = validate;
//# sourceMappingURL=validate.middleware.js.map