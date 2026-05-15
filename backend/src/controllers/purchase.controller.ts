import { Response, NextFunction } from "express";
import crypto from "crypto";
import { AuthRequest } from "../types";
import { Dataset } from "../models/dataset.model";
import { Purchase } from "../models/purchase.model";
import { marketplaceService } from "../services/contracts/marketplace.service";
import { AppError } from "../middleware/error.middleware";

const USAGE_ACTIONS: Record<string, { label: string; result: string }> = {
  AI_TRAINING_JOB: {
    label: "AI training job",
    result: "A private training job was queued against the licensed dataset. The protected source file remains bound to the buyer wallet.",
  },
  ANALYTICS_QUERY: {
    label: "Analytics query",
    result: "A derived insight query was executed. The response contains analysis output, not a transferable copy of the source data.",
  },
  DERIVED_INSIGHT: {
    label: "Derived insight request",
    result: "A privacy-preserving insight package was generated for the licensed buyer under the current usage terms.",
  },
};

const QUERY_FORMATS = ["CSV", "TSV", "JSON", "JSONL", "SQL"] as const;
type QueryFormat = typeof QUERY_FORMATS[number];

const isQueryFormat = (value: string): value is QueryFormat =>
  QUERY_FORMATS.includes(value as QueryFormat);

const isAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value);

const buildLicensedQueryOutput = (params: {
  format: QueryFormat;
  datasetId: number;
  buyer: string;
  owner: string;
  dataType: string;
  permission: string;
  qualityScore: number;
  certificateId: string;
  prompt: string;
}): string => {
  const rows = [
    ["license_id", String(params.datasetId)],
    ["certificate_id", params.certificateId],
    ["buyer_wallet", params.buyer],
    ["data_owner", params.owner],
    ["data_type", params.dataType],
    ["usage_scope", params.permission],
    ["quality_score", String(params.qualityScore)],
    ["source_ownership", "retained_by_creator"],
    ["shareable", "false"],
    ["prompt", params.prompt],
  ];

  if (params.format === "CSV" || params.format === "TSV") {
    const separator = params.format === "CSV" ? "," : "\t";
    return [
      ["field", "value"].join(separator),
      ...rows.map(([field, value]) => [field, `"${value.replace(/"/g, '""')}"`].join(separator)),
    ].join("\n");
  }

  if (params.format === "JSON") {
    return JSON.stringify({
      licenseId: params.datasetId,
      certificateId: params.certificateId,
      buyerWallet: params.buyer,
      dataOwner: params.owner,
      sourceOwnership: "retained_by_creator",
      shareable: false,
      usageScope: params.permission,
      prompt: params.prompt,
      result: {
        dataType: params.dataType,
        qualityScore: params.qualityScore,
        accessType: "licensed_query",
      },
    }, null, 2);
  }

  if (params.format === "JSONL") {
    return rows.map(([field, value]) => JSON.stringify({
      licenseId: params.datasetId,
      certificateId: params.certificateId,
      field,
      value,
      shareable: false,
    })).join("\n");
  }

  return [
    "SELECT",
    `  '${params.certificateId}' AS certificate_id,`,
    `  '${params.buyer}' AS licensed_buyer,`,
    `  '${params.owner}' AS data_owner,`,
    `  '${params.permission}' AS usage_scope,`,
    "  false AS shareable,",
    `  '${params.dataType}' AS data_type,`,
    `  ${params.qualityScore} AS quality_score;`,
    "-- Source data remains owned by the creator and is not exported.",
  ].join("\n");
};

const getAccessRecord = async (datasetId: number, buyer: string) => {
  const hasAccess = await marketplaceService.hasActiveAccess(buyer, datasetId);
  if (!hasAccess) {
    throw new AppError("Purchase or active subscription required", 403);
  }

  const dataset = await Dataset.findOne({ onChainId: datasetId });
  if (!dataset) {
    throw new AppError("Dataset not found", 404);
  }

  const latestPurchase = await Purchase.findOne({ datasetId, buyer }).sort({ createdAt: -1 });
  const certificateId = crypto
    .createHash("sha256")
    .update(`certificate:${datasetId}:${buyer}:${dataset.contributor}:${latestPurchase?.txHash || dataset.storageRootHash}`)
    .digest("hex");
  const accessToken = crypto
    .createHash("sha256")
    .update(`access:${datasetId}:${buyer}:${latestPurchase?.txHash || dataset.storageRootHash}`)
    .digest("hex");

  return {
    dataset,
    latestPurchase,
    accessToken: `zhx_${accessToken.slice(0, 32)}`,
    certificateId: `ZHX-LIC-${certificateId.slice(0, 12).toUpperCase()}`,
  };
};

export const getPurchases = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const purchases = await Purchase.find({
      buyer: req.user!.address,
    }).sort({ createdAt: -1 });

    res.json({ success: true, purchases });
  } catch (err) {
    next(err);
  }
};

export const getPurchase = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const purchaseIdParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const purchase = await Purchase.findOne({
      onChainPurchaseId: parseInt(purchaseIdParam, 10),
    });

    if (!purchase) {
      return next(new AppError("Purchase not found", 404));
    }

    if (purchase.buyer !== req.user!.address) {
      return next(new AppError("Forbidden", 403));
    }

    res.json({ success: true, purchase });
  } catch (err) {
    next(err);
  }
};

export const checkAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const datasetIdParam = Array.isArray(req.params.datasetId) ? req.params.datasetId[0] : req.params.datasetId;
    const datasetId = parseInt(datasetIdParam, 10);
    const hasAccess = await marketplaceService.hasActiveAccess(
      req.user!.address,
      datasetId
    );

    res.json({ success: true, hasAccess, datasetId });
  } catch (err) {
    next(err);
  }
};

export const getPendingBalance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const balance = await marketplaceService.getPendingBalance(req.user!.address);
    res.json({ success: true, balance });
  } catch (err) {
    next(err);
  }
};

export const getLicensedAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const datasetIdParam = Array.isArray(req.params.datasetId) ? req.params.datasetId[0] : req.params.datasetId;
    const datasetId = parseInt(datasetIdParam, 10);
    const buyer = req.user!.address.toLowerCase();

    const { dataset, latestPurchase, accessToken, certificateId } = await getAccessRecord(datasetId, buyer);
    const issuedAt = latestPurchase?.createdAt || new Date();

    res.json({
      success: true,
      access: {
        datasetId,
        buyer,
        contributor: dataset.contributor,
        licenseHolder: buyer,
        nonTransferable: true,
        certificateId,
        certificateIssuedAt: issuedAt.toISOString(),
        certificateStatus: "ACTIVE",
        accessToken,
        accessMode: dataset.privacyMode || "Encrypted File",
        usagePermission: dataset.permission,
        storageRootHash: dataset.storageRootHash,
        storageSubmissionUrl: dataset.storageSubmissionUrl,
        metadataURI: dataset.metadataURI,
        samplePreview: dataset.samplePreview,
        purchaseTxHash: latestPurchase?.txHash || "",
        purchaseType: latestPurchase?.isSubscription ? "SUBSCRIPTION" : "ONE_TIME",
        subscriptionExpiresAt: latestPurchase?.subscriptionExpiresAt || null,
        policy: [
          "Access is bound to the connected buyer wallet.",
          "The buyer may use the data only for the license permission shown.",
          "The buyer may not resell, re-upload, or share the protected file outside this license.",
          "Every access request should be logged against the buyer wallet and license token.",
        ],
        usageLog: [
          {
            action: "LICENSE_VERIFIED",
            actor: buyer,
            timestamp: new Date().toISOString(),
          },
          {
            action: "CONTROLLED_DATA_ROOM_OPENED",
            actor: buyer,
            timestamp: new Date().toISOString(),
          },
        ],
      },
    });
  } catch (err) {
    next(err);
  }
};

export const simulateLicensedUse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const datasetIdParam = Array.isArray(req.params.datasetId) ? req.params.datasetId[0] : req.params.datasetId;
    const datasetId = parseInt(datasetIdParam, 10);
    const buyer = req.user!.address.toLowerCase();
    const action = String(req.body?.action || "");
    const actionMeta = USAGE_ACTIONS[action];

    if (!actionMeta) {
      return next(new AppError("Unsupported licensed use action", 400));
    }

    const { dataset, latestPurchase, accessToken, certificateId } = await getAccessRecord(datasetId, buyer);
    const timestamp = new Date().toISOString();
    const runId = crypto
      .createHash("sha256")
      .update(`run:${datasetId}:${buyer}:${action}:${timestamp}`)
      .digest("hex")
      .slice(0, 16);

    res.json({
      success: true,
      result: {
        runId: `run_${runId}`,
        action,
        actionLabel: actionMeta.label,
        message: actionMeta.result,
        datasetId,
        datasetName: dataset.name,
        licenseHolder: buyer,
        contributor: dataset.contributor,
        certificateId,
        accessToken,
        purchaseTxHash: latestPurchase?.txHash || "",
        outputType: action === "AI_TRAINING_JOB" ? "MODEL_JOB_RECEIPT" : action === "ANALYTICS_QUERY" ? "DERIVED_ANALYTICS" : "DERIVED_INSIGHT",
        generatedAt: timestamp,
        shareable: false,
        exportRestricted: true,
        auditEvent: {
          action,
          actor: buyer,
          timestamp,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const runLicensedQuery = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const datasetIdParam = Array.isArray(req.params.datasetId) ? req.params.datasetId[0] : req.params.datasetId;
    const datasetId = parseInt(datasetIdParam, 10);
    const buyer = req.user!.address.toLowerCase();
    const prompt = String(req.body?.prompt || "").trim();
    const formatValue = String(req.body?.format || "JSON").toUpperCase();

    if (!prompt) {
      return next(new AppError("Query prompt is required", 400));
    }
    if (!isQueryFormat(formatValue)) {
      return next(new AppError("Unsupported query output format", 400));
    }

    const { dataset, accessToken, certificateId } = await getAccessRecord(datasetId, buyer);
    const timestamp = new Date().toISOString();
    const queryId = crypto
      .createHash("sha256")
      .update(`query:${datasetId}:${buyer}:${formatValue}:${prompt}:${timestamp}`)
      .digest("hex")
      .slice(0, 16);

    res.json({
      success: true,
      result: {
        queryId: `qry_${queryId}`,
        prompt,
        format: formatValue,
        output: buildLicensedQueryOutput({
          format: formatValue,
          datasetId,
          buyer,
          owner: dataset.contributor,
          dataType: dataset.dataType,
          permission: dataset.permission,
          qualityScore: dataset.qualityScore || 0,
          certificateId,
          prompt,
        }),
        datasetId,
        datasetName: dataset.name,
        licenseHolder: buyer,
        contributor: dataset.contributor,
        certificateId,
        accessToken,
        generatedAt: timestamp,
        sourceDataTransferred: false,
        shareable: false,
        auditEvent: {
          action: "LICENSED_QUERY_RUN",
          actor: buyer,
          timestamp,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const simulateShareAttempt = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const datasetIdParam = Array.isArray(req.params.datasetId) ? req.params.datasetId[0] : req.params.datasetId;
    const datasetId = parseInt(datasetIdParam, 10);
    const buyer = req.user!.address.toLowerCase();
    const attemptedWallet = String(req.body?.attemptedWallet || "0x000000000000000000000000000000000000dead").toLowerCase();

    if (!isAddress(attemptedWallet)) {
      return next(new AppError("Attempted wallet must be a valid 0x address", 400));
    }

    const { certificateId } = await getAccessRecord(datasetId, buyer);
    const attemptedWalletHasAccess = await marketplaceService.hasActiveAccess(attemptedWallet, datasetId);

    res.json({
      success: true,
      result: {
        allowed: attemptedWalletHasAccess,
        certificateId,
        licenseHolder: buyer,
        attemptedWallet,
        reason: attemptedWalletHasAccess
          ? "This wallet has its own valid license."
          : "Access denied. The certificate is bound to the original buyer wallet and cannot be shared or transferred.",
        auditEvent: {
          action: attemptedWalletHasAccess ? "TRANSFER_CHECK_ALLOWED" : "TRANSFER_CHECK_DENIED",
          actor: buyer,
          attemptedWallet,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
