import OpenAI from "openai";
import { config } from "../../config";
import { DataType, DatasetMetadata, UsagePermission } from "../../types";

const BASE_PRICES: Record<DataType, number> = {
  [DataType.TEXT]: 0.01,
  [DataType.CODE]: 0.02,
  [DataType.AUDIO]: 0.025,
  [DataType.VIDEO]: 0.04,
  [DataType.IMAGE]: 0.018,
  [DataType.BEHAVIORAL]: 0.035,
  [DataType.FINANCIAL]: 0.05,
  [DataType.DOMAIN]: 0.03,
};

const permissionForType = (dataType: DataType): UsagePermission => {
  if (dataType === DataType.FINANCIAL || dataType === DataType.BEHAVIORAL) return UsagePermission.ANALYTICS;
  if (dataType === DataType.TEXT || dataType === DataType.CODE) return UsagePermission.AI_TRAINING;
  return UsagePermission.BOTH;
};

const formatPrice = (value: number): string =>
  value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");

const EXTENSION_TYPE_MAP: Record<string, DataType> = {
  txt: DataType.TEXT,
  md: DataType.TEXT,
  pdf: DataType.TEXT,
  doc: DataType.TEXT,
  docx: DataType.TEXT,
  csv: DataType.FINANCIAL,
  tsv: DataType.FINANCIAL,
  xls: DataType.FINANCIAL,
  xlsx: DataType.FINANCIAL,
  json: DataType.DOMAIN,
  jsonl: DataType.DOMAIN,
  js: DataType.CODE,
  jsx: DataType.CODE,
  ts: DataType.CODE,
  tsx: DataType.CODE,
  py: DataType.CODE,
  sol: DataType.CODE,
  java: DataType.CODE,
  go: DataType.CODE,
  rs: DataType.CODE,
  png: DataType.IMAGE,
  jpg: DataType.IMAGE,
  jpeg: DataType.IMAGE,
  gif: DataType.IMAGE,
  webp: DataType.IMAGE,
  svg: DataType.IMAGE,
  mp3: DataType.AUDIO,
  wav: DataType.AUDIO,
  m4a: DataType.AUDIO,
  ogg: DataType.AUDIO,
  mp4: DataType.VIDEO,
  mov: DataType.VIDEO,
  webm: DataType.VIDEO,
  avi: DataType.VIDEO,
};

const inferDataTypeFromFileName = (fileName: string): DataType => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  return EXTENSION_TYPE_MAP[extension] || DataType.TEXT;
};

class LicenseDraftService {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      baseURL: `${config.og.computeServiceUrl}/v1/proxy`,
      apiKey: config.og.computeApiSecret,
    });
    this.model = config.og.computeModel;
  }

  private fallback(params: {
    fileName: string;
    fileSize: number;
    dataType: DataType;
    description: string;
    storageRootHash: string;
    storageSubmissionUrl?: string;
    privacyMode?: string;
  }): DatasetMetadata {
    const baseName = params.fileName.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim();
    const sizeMb = params.fileSize / 1024 / 1024;
    const basePrice = BASE_PRICES[params.dataType];
    const price = basePrice * (1 + Math.min(0.65, Math.log10(sizeMb + 1) * 0.18));
    const tags = [
      params.dataType.toLowerCase(),
      ...baseName.toLowerCase().split(/\s+/).filter((tag) => tag.length > 3).slice(0, 3),
    ];

    const metadata = {
      name: `${baseName || params.dataType} Data License`,
      description: params.description || `Agent-generated ${params.dataType.toLowerCase()} data license.`,
      dataType: params.dataType,
      permission: permissionForType(params.dataType),
      privacyMode: params.privacyMode || "Encrypted File",
      storageRootHash: params.storageRootHash,
      storageSubmissionUrl: params.storageSubmissionUrl || "",
      tags: Array.from(new Set(tags)),
    };

    return {
      name: String(metadata.name),
      description: String(metadata.description),
      dataType: params.dataType,
      permission: metadata.permission as UsagePermission,
      pricePerAccess: formatPrice(price),
      subscriptionPrice: formatPrice(price * 8),
      tags: metadata.tags as string[],
      samplePreview: String(metadata.description),
      metadata,
      metadataURI: params.storageSubmissionUrl || `0g://${params.storageRootHash}`,
      usedFallback: true,
    };
  }

  async generateDraft(params: {
    fileName: string;
    fileSize: number;
    dataType?: DataType;
    description: string;
    storageRootHash: string;
    storageSubmissionUrl?: string;
    privacyMode?: string;
  }): Promise<DatasetMetadata> {
    const dataType = params.dataType || inferDataTypeFromFileName(params.fileName);
    const fallback = this.fallback({ ...params, dataType });
    const prompt = `
You are the Zhunix data-license agent. Generate creator-friendly license metadata for a 0G data marketplace listing.

Return strict JSON only with these fields:
{
  "name": "short marketplace title",
  "description": "clear buyer-facing description",
  "permission": "AI_TRAINING" | "ANALYTICS" | "BOTH",
  "pricePerAccess": "0G decimal string between 0.001 and 10",
  "subscriptionPrice": "0G decimal string between 0 and 10",
  "tags": ["3-6 lowercase tags"],
  "samplePreview": "short privacy-safe buyer preview"
}

Dataset:
- File name: ${params.fileName}
- File size bytes: ${params.fileSize}
- Type: ${dataType}
- Description: ${params.description || "No creator description"}
- Privacy mode: ${params.privacyMode || "Encrypted File"}
- Storage root hash: ${params.storageRootHash}
- Storage scan URL: ${params.storageSubmissionUrl || "Unavailable"}
`;

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      });
      const content = completion.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return fallback;

      const draft = JSON.parse(jsonMatch[0]) as Partial<DatasetMetadata>;
      const price = Number(draft.pricePerAccess);
      const subscription = Number(draft.subscriptionPrice || 0);
      const permission = Object.values(UsagePermission).includes(draft.permission as UsagePermission)
        ? draft.permission as UsagePermission
        : fallback.permission;

      const metadata = {
        name: draft.name || fallback.name,
        description: draft.description || fallback.description,
        dataType,
        permission,
        privacyMode: params.privacyMode || "Encrypted File",
        storageRootHash: params.storageRootHash,
        storageSubmissionUrl: params.storageSubmissionUrl || "",
        tags: Array.isArray(draft.tags) && draft.tags.length > 0 ? draft.tags : fallback.tags || [],
      };

      return {
        name: String(metadata.name),
        description: String(metadata.description),
        dataType,
        permission,
        pricePerAccess: formatPrice(Number.isFinite(price) ? Math.min(10, Math.max(0.001, price)) : Number(fallback.pricePerAccess)),
        subscriptionPrice: formatPrice(Number.isFinite(subscription) ? Math.min(10, Math.max(0, subscription)) : Number(fallback.subscriptionPrice || 0)),
        tags: metadata.tags as string[],
        samplePreview: draft.samplePreview || fallback.samplePreview,
        metadata,
        metadataURI: params.storageSubmissionUrl || `0g://${params.storageRootHash}`,
        usedFallback: false,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown connection error";
      console.warn(`License draft agent unavailable, using local fallback: ${message}`);
      return fallback;
    }
  }
}

export const licenseDraftService = new LicenseDraftService();
