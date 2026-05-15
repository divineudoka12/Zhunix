import OpenAI from "openai";
import { config } from "../../config";
import { DataType, UploadPolicyAssessment } from "../../types";

const REJECTED_NAME_TERMS = [
  "porn",
  "porno",
  "xxx",
  "nude",
  "nudes",
  "nsfw",
  "sex",
  "sexual",
  "onlyfans",
  "explicit",
];

const LOW_VALUE_TERMS = [
  "test",
  "empty",
  "blank",
  "random",
  "junk",
  "dummy",
  "sample-only",
];

const clampScore = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const safeJson = (content: string): Partial<UploadPolicyAssessment> | null => {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Partial<UploadPolicyAssessment>;
  } catch {
    return null;
  }
};

class UploadPolicyService {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      baseURL: `${config.og.computeServiceUrl}/v1/proxy`,
      apiKey: config.og.computeApiSecret,
    });
    this.model = config.og.computeModel;
  }

  private localAssessment(params: {
    fileName: string;
    mimeType: string;
    dataType: DataType;
    fileSize: number;
    description: string;
  }): UploadPolicyAssessment {
    const haystack = `${params.fileName} ${params.mimeType} ${params.description}`.toLowerCase();
    const rejectedTerms = REJECTED_NAME_TERMS.filter((term) => haystack.includes(term));
    const lowValueTerms = LOW_VALUE_TERMS.filter((term) => haystack.includes(term));
    const tooSmall = params.fileSize < 64;
    const rejectionReasons = [
      ...rejectedTerms.map((term) => `The upload appears to contain prohibited adult or explicit content: ${term}.`),
      ...(tooSmall ? ["The file is too small to be a useful licensed dataset."] : []),
      ...lowValueTerms.map((term) => `The upload appears to be low-value or placeholder data: ${term}.`),
    ];

    const valueScore = tooSmall ? 20 : lowValueTerms.length ? 45 : 78;
    const complianceRisk = rejectedTerms.length ? "HIGH" : lowValueTerms.length || tooSmall ? "MEDIUM" : "LOW";

    return {
      approved: rejectionReasons.length === 0,
      valueScore,
      complianceRisk,
      dataCategory: params.dataType,
      rejectionReasons,
      recommendations: rejectionReasons.length
        ? ["Upload a real, consented, buyer-usable dataset with clear provenance and non-sensitive preview metadata."]
        : ["Dataset passed local policy checks. Full quality validation will run after listing."],
    };
  }

  async assessUpload(params: {
    fileName: string;
    mimeType: string;
    dataType: DataType;
    fileSize: number;
    description: string;
    textSample?: string;
  }): Promise<UploadPolicyAssessment> {
    const fallback = this.localAssessment(params);
    if (!fallback.approved) return fallback;

    const prompt = `
You are the Zhunix upload policy agent for a data licensing marketplace. Decide whether this upload can be stored and listed.

Reject uploads that are pornographic, nude/explicit, abusive, illegal, non-consensual, unsafe, private personal dumps without clear value, empty, junk, placeholder, or not useful to a buyer.

Important classification guidance:
- CSV, TSV, spreadsheet, and JSON uploads are not automatically financial data.
- People, customer, profile, demographic, CRM, or user-list CSVs can be valuable behavioral/domain datasets when consented, anonymized, synthetic, or clearly business-safe.
- Do not reject a tabular people/customer dataset merely because it lacks financial fields. Judge it against its inferred type and buyer use case.
- Reject real private personal dumps, sensitive identifiers, or unclear provenance when the description does not establish consent, anonymization, or synthetic origin.

Return strict JSON only:
{
  "approved": true | false,
  "valueScore": <0-100 buyer usefulness score>,
  "complianceRisk": "LOW" | "MEDIUM" | "HIGH",
  "dataCategory": "short category",
  "rejectionReasons": ["specific reasons"],
  "recommendations": ["how to improve"]
}

Minimum approval requirements:
- approved must be false if adult/nude/pornographic content is likely.
- approved must be false if valueScore is below 60.
- high compliance risk should normally be rejected.

Upload:
- File name: ${params.fileName}
- MIME type: ${params.mimeType || "unknown"}
- Inferred type: ${params.dataType}
- File size bytes: ${params.fileSize}
- Creator description: ${params.description || "No description"}
- Safe text sample: ${params.textSample || "Unavailable or binary file"}
`;

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      });
      const parsed = safeJson(completion.choices[0]?.message?.content || "");
      if (!parsed) return fallback;

      const valueScore = clampScore(parsed.valueScore, fallback.valueScore);
      const complianceRisk = ["LOW", "MEDIUM", "HIGH"].includes(String(parsed.complianceRisk))
        ? parsed.complianceRisk as UploadPolicyAssessment["complianceRisk"]
        : fallback.complianceRisk;
      const rejectionReasons = Array.isArray(parsed.rejectionReasons)
        ? parsed.rejectionReasons.map(String).filter(Boolean)
        : fallback.rejectionReasons;
      const recommendations = Array.isArray(parsed.recommendations)
        ? parsed.recommendations.map(String).filter(Boolean)
        : fallback.recommendations;
      const approved = Boolean(parsed.approved) && valueScore >= 60 && complianceRisk !== "HIGH" && rejectionReasons.length === 0;

      return {
        approved,
        valueScore,
        complianceRisk,
        dataCategory: String(parsed.dataCategory || fallback.dataCategory),
        rejectionReasons: approved ? [] : rejectionReasons.length ? rejectionReasons : ["The upload did not meet Zhunix data value or policy requirements."],
        recommendations,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown policy agent error";
      console.warn(`Upload policy agent unavailable, using local assessment: ${message}`);
      return fallback;
    }
  }
}

export const uploadPolicyService = new UploadPolicyService();
