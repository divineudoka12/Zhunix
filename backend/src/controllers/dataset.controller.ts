import { Request, Response, NextFunction } from "express";
import { AuthRequest, DataType, UsagePermission, DatasetStatus, ValidationStatus } from "../types";
import { Dataset } from "../models/dataset.model";
import { registryService } from "../services/contracts/registry.service";
import { validationService } from "../services/validation/validation.service";
import { licenseDraftService } from "../services/license/licenseDraft.service";
import { AppError } from "../middleware/error.middleware";

const MARKETPLACE_MIN_QUALITY_SCORE = 65;

export const registerDataset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      storageRootHash, metadataURI, name, description,
      dataType, permission, pricePerAccess, subscriptionPrice,
      agentAddress, tags, samplePreview, fileSize: rawFileSize, fileName: rawFileName,
      privacyMode, storageSubmissionUrl, storageTxSeq, licenseMetadata,
    } = req.body;

    // Agent address is now mandatory
    if (!agentAddress) {
      return next(new AppError("Agent address is mandatory for quality validation", 400));
    }

    const existing = await Dataset.findOne({ storageRootHash });
    if (existing) {
      return next(new AppError("Dataset with this root hash already exists", 409));
    }

    // Register on-chain with mandatory agent pricing enabled
    const { datasetId, txHash } = await registryService.registerDataset({
      storageRootHash,
      metadataURI,
      dataType,
      permission,
      pricePerAccess,
      subscriptionPrice: subscriptionPrice || "0",
      agentAddress,
      agentPricingEnabled: true,
    });

    // The event indexer may create this MongoDB row before this request returns,
    // so upsert by on-chain id instead of inserting blindly.
    const dataset = await Dataset.findOneAndUpdate(
      { onChainId: datasetId },
      {
        $set: {
          contributor: req.user!.address,
          name,
          description,
          storageRootHash,
          metadataURI,
          dataType,
          permission,
          pricePerAccess,
          subscriptionPrice: subscriptionPrice || "0",
          agentAddress,
          agentPricingEnabled: true,
          tags: tags || [],
          samplePreview: samplePreview || "",
          privacyMode: privacyMode || "Encrypted File",
          storageSubmissionUrl: storageSubmissionUrl || "",
          storageTxSeq: typeof storageTxSeq === "number" ? storageTxSeq : null,
          licenseMetadata: licenseMetadata || {},
        },
        $setOnInsert: { onChainId: datasetId },
      },
      { upsert: true, returnDocument: "after" }
    );

    // Trigger async validation by quality agent
    // This happens asynchronously to prevent blocking the registration
    const fileSize = Number(rawFileSize) || 0;
    const fileName = String(rawFileName || storageRootHash);

    validationService
      .validateDataset(
        datasetId,
        storageRootHash,
        dataType,
        fileSize,
        fileName,
        description,
        agentAddress
      )
      .catch((err) => {
        console.error(`Validation failed for dataset ${datasetId}:`, err);
      });

    res.status(201).json({
      success: true,
      dataset,
      txHash,
      message: "Dataset registered. Quality validation in progress.",
    });
  } catch (err) {
    next(err);
  }
};

export const draftDatasetLicense = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const draft = await licenseDraftService.generateDraft(req.body);
    res.json({ success: true, draft });
  } catch (err) {
    next(err);
  }
};

export const getDatasets = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      dataType, permission, status, contributor, validationStatus,
      page = "1", limit = "20", tags, minQualityScore,
    } = req.query;

    const filter: Record<string, unknown> = {
      status: status || DatasetStatus.ACTIVE,
    };

    if (dataType) filter.dataType = dataType;
    if (permission) filter.permission = permission;
    if (validationStatus) filter.validationStatus = validationStatus;
    if (contributor) filter.contributor = (contributor as string).toLowerCase();
    if (tags) filter.tags = { $in: (tags as string).split(",") };
    if (minQualityScore) filter.qualityScore = { $gte: Number(minQualityScore) };

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [datasets, total] = await Promise.all([
      Dataset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Dataset.countDocuments(filter),
    ]);

    res.json({
      success: true,
      datasets,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const tokenizePrompt = (prompt: string) =>
  prompt
    .toLowerCase()
    .split(/[^a-z0-9_]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
    .filter((token) => !["the", "and", "for", "with", "data", "dataset", "datasets", "license", "licenses", "buy", "need", "want"].includes(token))
    .slice(0, 12);

const DATA_TYPE_INTENTS: Array<{ dataType: DataType; terms: string[] }> = [
  { dataType: DataType.FINANCIAL, terms: ["financial", "finance", "fintech", "transaction", "transactions", "sales", "revenue", "payment", "payments", "invoice", "invoices", "banking", "accounting"] },
  { dataType: DataType.BEHAVIORAL, terms: ["behavioral", "behavioural", "behavior", "behaviour", "clickstream", "click", "session", "sessions", "events", "funnel", "retention", "conversion"] },
  { dataType: DataType.VIDEO, terms: ["video", "videos", "footage", "clip", "clips", "recording", "recordings"] },
  { dataType: DataType.IMAGE, terms: ["image", "images", "photo", "photos", "picture", "pictures", "vision", "object", "detection"] },
  { dataType: DataType.TEXT, terms: ["text", "document", "documents", "review", "reviews", "comment", "comments", "support", "chat", "faq", "article", "articles"] },
  { dataType: DataType.CODE, terms: ["code", "source", "repository", "repositories", "github", "programming", "script", "scripts"] },
  { dataType: DataType.AUDIO, terms: ["audio", "voice", "speech", "sound", "podcast", "call", "calls"] },
  { dataType: DataType.DOMAIN, terms: ["domain", "website", "web", "url", "urls", "crawl", "scrape", "scraped", "site", "sites"] },
];

const PERMISSION_INTENTS: Array<{ permission: UsagePermission; terms: string[] }> = [
  { permission: UsagePermission.ANALYTICS, terms: ["analytics", "analysis", "insight", "insights", "reporting", "dashboard", "business"] },
  { permission: UsagePermission.AI_TRAINING, terms: ["training", "train", "model", "models", "ai", "machine", "learning", "llm"] },
  { permission: UsagePermission.BOTH, terms: ["both", "training-and-analytics"] },
];

const inferScoutIntent = (prompt: string) => {
  const normalized = prompt.toLowerCase();
  const dataTypes = DATA_TYPE_INTENTS
    .filter((intent) => intent.terms.some((term) => new RegExp(`\\b${escapeRegex(term)}\\b`, "i").test(normalized)))
    .map((intent) => intent.dataType);
  const permissions = PERMISSION_INTENTS
    .filter((intent) => intent.terms.some((term) => new RegExp(`\\b${escapeRegex(term)}\\b`, "i").test(normalized)))
    .map((intent) => intent.permission);
  const matchedTerms = [
    ...DATA_TYPE_INTENTS.filter((intent) => dataTypes.includes(intent.dataType)).flatMap((intent) => intent.terms),
    ...PERMISSION_INTENTS.filter((intent) => permissions.includes(intent.permission)).flatMap((intent) => intent.terms),
  ];

  return {
    dataTypes: Array.from(new Set(dataTypes)),
    permissions: Array.from(new Set(permissions)),
    matchedTerms,
  };
};

const priceTo0G = (price: string) => {
  const parsed = Number(price || 0);
  if (!Number.isFinite(parsed)) return 0;
  return price.includes(".") || price.length < 13 ? parsed : parsed / 1e18;
};

const getScoutSuggestions = async (excludedDataTypes: DataType[]) => {
  const rows = await Dataset.aggregate([
    {
      $match: {
        status: DatasetStatus.ACTIVE,
        validationStatus: ValidationStatus.APPROVED,
        qualityScore: { $gte: MARKETPLACE_MIN_QUALITY_SCORE },
        ...(excludedDataTypes.length ? { dataType: { $nin: excludedDataTypes } } : {}),
      },
    },
    {
      $group: {
        _id: "$dataType",
        count: { $sum: 1 },
        bestQualityScore: { $max: "$qualityScore" },
      },
    },
    { $sort: { bestQualityScore: -1, count: -1 } },
    { $limit: 4 },
  ]);

  return rows.map((row) => ({
    dataType: row._id as DataType,
    count: Number(row.count || 0),
    bestQualityScore: Number(row.bestQualityScore || 0),
  }));
};

export const scoutMarketplace = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const prompt = String(req.body.prompt || "").trim();
    const budget = Number(req.body.budget || 0);
    const limit = Math.min(Number(req.body.limit || 12), 25);

    if (!prompt) {
      return next(new AppError("Tell the marketplace scout what data you want.", 400));
    }

    const intent = inferScoutIntent(prompt);
    const tokens = tokenizePrompt(prompt);
    const searchTokens = tokens.filter((token) => !intent.matchedTerms.includes(token));

    const filter: Record<string, unknown> = {
      status: DatasetStatus.ACTIVE,
      validationStatus: ValidationStatus.APPROVED,
      qualityScore: { $gte: MARKETPLACE_MIN_QUALITY_SCORE },
    };

    if (intent.dataTypes.length === 1) filter.dataType = intent.dataTypes[0];
    if (intent.dataTypes.length > 1) filter.dataType = { $in: intent.dataTypes };

    const candidates = await Dataset.find(filter)
      .sort({ qualityScore: -1, totalSales: -1, createdAt: -1 })
      .limit(limit * 5);

    const scored = candidates
      .map((dataset) => {
        const searchable = `${dataset.name} ${dataset.description} ${(dataset.tags || []).join(" ")} ${dataset.dataType} ${dataset.permission}`.toLowerCase();
        const matchCount = searchTokens.filter((token) => searchable.includes(token)).length;
        const typeMatchBoost = intent.dataTypes.includes(dataset.dataType) ? 16 : 0;
        const permissionMatchBoost = intent.permissions.includes(dataset.permission) ? 8 : 0;
        const relevanceScore = Math.min(100, Math.round((dataset.qualityScore * 0.64) + typeMatchBoost + permissionMatchBoost + (matchCount * 6) + Math.min(dataset.totalSales || 0, 8)));
        return {
          dataset,
          relevanceScore,
          matchReasons: [
            ...(intent.dataTypes.length ? [`Type locked to ${intent.dataTypes.join(", ")}`] : []),
            ...(intent.permissions.length ? [`Usage matched ${intent.permissions.join(", ")}`] : []),
            `${dataset.qualityScore}/100 quality score`,
            ...(matchCount ? [`${matchCount} prompt terms matched`] : ["Approved high-quality fallback match"]),
            dataset.validationStatus === ValidationStatus.APPROVED ? "Approved by validation agent" : "",
          ].filter(Boolean),
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    const selected = scored.reduce<typeof scored>((items, item) => {
      if (items.length >= limit) return items;
      if (Number.isFinite(budget) && budget > 0) {
        const nextTotal = items.reduce((sum, current) => sum + priceTo0G(current.dataset.pricePerAccess), 0) + priceTo0G(item.dataset.pricePerAccess);
        if (nextTotal > budget) return items;
      }
      return [...items, item];
    }, []);

    const estimatedTotal = selected.reduce((sum, item) => sum + priceTo0G(item.dataset.pricePerAccess), 0);
    const suggestions = selected.length === 0 ? await getScoutSuggestions(intent.dataTypes) : [];

    res.json({
      success: true,
      prompt,
      minimumQualityScore: MARKETPLACE_MIN_QUALITY_SCORE,
      interpretedIntent: {
        dataTypes: intent.dataTypes,
        permissions: intent.permissions,
        searchTerms: searchTokens,
      },
      budget: Number.isFinite(budget) && budget > 0 ? budget : null,
      estimatedTotal: Number(estimatedTotal.toFixed(4)),
      count: selected.length,
      results: selected,
      suggestions,
      agent: {
        name: "Zhunix Marketplace Scout",
        role: `Searches approved marketplace data and blocks anything below ${MARKETPLACE_MIN_QUALITY_SCORE} quality score.`,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getDataset = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const datasetIdParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const dataset = await Dataset.findOne({ onChainId: parseInt(datasetIdParam, 10) });

    if (!dataset) {
      return next(new AppError("Dataset not found", 404));
    }

    res.json({ success: true, dataset });
  } catch (err) {
    next(err);
  }
};

export const updateDataset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const datasetIdParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const datasetId = parseInt(datasetIdParam, 10);
    const dataset = await Dataset.findOne({ onChainId: datasetId });

    if (!dataset) {
      return next(new AppError("Dataset not found", 404));
    }

    if (dataset.contributor !== req.user!.address) {
      return next(new AppError("Forbidden", 403));
    }

    const { pricePerAccess, subscriptionPrice, status } = req.body;

    const statusIndex: Record<DatasetStatus, number> = {
      [DatasetStatus.ACTIVE]: 0,
      [DatasetStatus.PAUSED]: 1,
      [DatasetStatus.REMOVED]: 2,
    };

    await registryService["contract"].updateDataset(
      datasetId,
      pricePerAccess,
      subscriptionPrice || dataset.subscriptionPrice,
      statusIndex[status as DatasetStatus] ?? 0
    );

    const updated = await Dataset.findOneAndUpdate(
      { onChainId: datasetId },
      { pricePerAccess, subscriptionPrice, status },
      { returnDocument: "after" }
    );

    res.json({ success: true, dataset: updated });
  } catch (err) {
    next(err);
  }
};
