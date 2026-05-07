import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../types";
export declare const registerDataset: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getDatasets: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getDataset: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateDataset: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=dataset.controller.d.ts.map