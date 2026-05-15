import OpenAI from "openai";
import { config } from "../../config";
import { PricingContext } from "../../types";

class ComputeService {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      baseURL: `${config.og.computeServiceUrl}/v1/proxy`,
      apiKey: config.og.computeApiSecret,
    });
    this.model = config.og.computeModel;
  }

  async getOptimalPrice(context: PricingContext): Promise<string> {
    const prompt = `
      You are a data marketplace pricing agent for DataVault, a decentralized AI training data marketplace.
      Analyze the following dataset metrics and recommend an optimal price in 0G.

      Dataset Type: ${context.dataType}
      Current Price: ${context.currentPrice} 0G
      Total Sales: ${context.totalSales}
      Total Revenue: ${context.totalRevenue} 0G
      Market Demand: ${context.marketDemand}

      Rules:
      - Price must be between 0.001 0G and 10 0G
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

export const computeService = new ComputeService();
