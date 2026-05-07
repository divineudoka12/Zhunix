import { PricingContext } from "../../types";
declare class ComputeService {
    private client;
    private model;
    constructor();
    getOptimalPrice(context: PricingContext): Promise<string>;
}
export declare const computeService: ComputeService;
export {};
//# sourceMappingURL=compute.service.d.ts.map