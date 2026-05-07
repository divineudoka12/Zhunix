import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../types";
export declare const registerAgent: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getAgentByAddress: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const triggerPricingCycle: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=agent.controller.d.ts.map