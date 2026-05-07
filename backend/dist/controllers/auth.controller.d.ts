import { Request, Response, NextFunction } from "express";
export declare const getNonce: (req: Request, res: Response) => void;
export declare const verifySignature: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map