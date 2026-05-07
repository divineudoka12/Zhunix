"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeService = void 0;
const openai_1 = __importDefault(require("openai"));
const config_1 = require("../../config");
class ComputeService {
    constructor() {
        this.client = new openai_1.default({
            baseURL: `${config_1.config.og.computeServiceUrl}/v1/proxy`,
            apiKey: config_1.config.og.computeApiSecret,
        });
        this.model = config_1.config.og.computeModel;
    }
    async getOptimalPrice(context) {
        const prompt = `
      You are a data marketplace pricing agent for DataVault, a decentralized AI training data marketplace.
      Analyze the following dataset metrics and recommend an optimal price in ETH.

      Dataset Type: ${context.dataType}
      Current Price: ${context.currentPrice} ETH
      Total Sales: ${context.totalSales}
      Total Revenue: ${context.totalRevenue} ETH
      Market Demand: ${context.marketDemand}

      Rules:
      - Price must be between 0.001 ETH and 10 ETH
      - High demand datasets should be priced 10-30% higher
      - Low sales datasets may need a 10-20% reduction to attract buyers
      - AI training data (TEXT, CODE) commands premium pricing
      - Return ONLY a number with up to 4 decimal places. No units, no explanation.
    `;
        const completion = await this.client.chat.completions.create({
            model: this.model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 20,
        });
        const rawPrice = completion.choices?.[0]?.message?.content?.trim();
        if (!rawPrice) {
            throw new Error("0G compute response did not include a pricing recommendation");
        }
        const price = parseFloat(rawPrice);
        if (isNaN(price) || price < 0.001 || price > 10) {
            return context.currentPrice;
        }
        return price.toFixed(4);
    }
}
exports.computeService = new ComputeService();
//# sourceMappingURL=compute.service.js.map