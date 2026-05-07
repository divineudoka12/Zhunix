import { Request, Response, NextFunction } from "express";
export declare class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number);
}
export declare const errorHandler: (err: AppError | Error, _req: Request, res: Response, _next: NextFunction) => void;
//# sourceMappingURL=error.middleware.d.ts.map