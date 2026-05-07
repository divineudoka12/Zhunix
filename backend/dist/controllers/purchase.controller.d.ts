import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
export declare const getPurchases: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getPurchase: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const checkAccess: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getPendingBalance: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=purchase.controller.d.ts.map