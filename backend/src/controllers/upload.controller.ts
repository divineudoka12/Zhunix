import { Response, NextFunction } from "express";
import { AuthRequest, DataType } from "../types";
import { storageService } from "../services/storage/storage.service";
import { uploadPolicyService } from "../services/validation/uploadPolicy.service";
import { AppError } from "../middleware/error.middleware";

const EXTENSION_TYPE_MAP: Record<string, DataType> = {
  txt: DataType.TEXT,
  md: DataType.TEXT,
  pdf: DataType.TEXT,
  doc: DataType.TEXT,
  docx: DataType.TEXT,
  csv: DataType.DOMAIN,
  tsv: DataType.DOMAIN,
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

const hasAnyTerm = (value: string, terms: string[]) =>
  terms.some((term) => new RegExp(`\\b${term}\\b`, "i").test(value));

const inferTabularDataType = (sample: string): DataType => {
  const header = sample.split(/\r?\n/)[0]?.toLowerCase() || "";
  const text = sample.toLowerCase().slice(0, 4000);

  const financialTerms = [
    "amount", "price", "cost", "revenue", "profit", "payment", "transaction",
    "invoice", "balance", "currency", "total", "subtotal", "tax", "sales",
  ];
  const peopleTerms = [
    "person", "people", "name", "first_name", "last_name", "fullname", "age",
    "gender", "email", "phone", "address", "city", "country", "occupation",
    "job", "company", "customer", "user", "profile", "segment",
  ];
  const behavioralTerms = [
    "event", "session", "click", "view", "page", "conversion", "timestamp",
    "duration", "device", "browser", "retention", "activity",
  ];

  if (hasAnyTerm(header, financialTerms)) return DataType.FINANCIAL;
  if (hasAnyTerm(header, behavioralTerms)) return DataType.BEHAVIORAL;
  if (hasAnyTerm(header, peopleTerms) || hasAnyTerm(text, peopleTerms)) return DataType.BEHAVIORAL;

  return DataType.DOMAIN;
};

const inferDataType = (file: Express.Multer.File): DataType => {
  const mime = String(file.mimetype || "").toLowerCase();
  const extension = file.originalname.split(".").pop()?.toLowerCase() || "";
  const sample = file.buffer.toString("utf8", 0, Math.min(file.buffer.length, 4000)).replace(/\u0000/g, "");

  if (["csv", "tsv"].includes(extension) || mime.includes("csv")) {
    return inferTabularDataType(sample);
  }

  const extensionType = EXTENSION_TYPE_MAP[extension];

  if (extensionType) return extensionType;

  if (mime.startsWith("image/")) return DataType.IMAGE;
  if (mime.startsWith("audio/")) return DataType.AUDIO;
  if (mime.startsWith("video/")) return DataType.VIDEO;
  if (mime.includes("json")) return DataType.DOMAIN;
  if (mime.includes("spreadsheet") || mime.includes("excel")) return DataType.DOMAIN;
  if (mime.includes("text") || mime.includes("pdf") || mime.includes("document")) {
    return DataType.TEXT;
  }

  return DataType.TEXT;
};

const getTextSample = (file: Express.Multer.File, dataType: DataType): string => {
  const mime = String(file.mimetype || "").toLowerCase();
  const isTextLike =
    dataType === DataType.TEXT ||
    dataType === DataType.CODE ||
    dataType === DataType.DOMAIN ||
    dataType === DataType.FINANCIAL ||
    dataType === DataType.BEHAVIORAL ||
    mime.includes("text") ||
    mime.includes("json") ||
    mime.includes("csv");

  if (!isTextLike) return "";
  return file.buffer.toString("utf8", 0, Math.min(file.buffer.length, 4000)).replace(/\u0000/g, "").slice(0, 4000);
};

export const uploadDataset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      console.warn("[upload] rejected: no file provided");
      return next(new AppError("No file provided", 400));
    }

    // Extract validation agent address - now mandatory
    const { agentAddress, dataType, description } = req.body;
    console.log(
      `[upload] received file="${req.file.originalname}" size=${req.file.size} mime="${req.file.mimetype}" wallet=${req.user?.address || "unknown"}`
    );

    if (!agentAddress) {
      console.warn(`[upload] rejected file="${req.file.originalname}": missing agent address`);
      return next(new AppError("Agent address is mandatory for data validation", 400));
    }

    const serverInferredType = inferDataType(req.file);
    const clientType = Object.values(DataType).includes(dataType as DataType) ? dataType as DataType : null;
    const resolvedDataType = clientType === DataType.FINANCIAL && serverInferredType !== DataType.FINANCIAL
      ? serverInferredType
      : clientType || serverInferredType;

    console.log(
      `[upload] classified file="${req.file.originalname}" clientType=${clientType || "none"} serverType=${serverInferredType} resolvedType=${resolvedDataType}`
    );

    const policyAssessment = await uploadPolicyService.assessUpload({
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      dataType: resolvedDataType,
      fileSize: req.file.size,
      description: String(description || ""),
      textSample: getTextSample(req.file, resolvedDataType),
    });

    console.log(
      `[upload] policy file="${req.file.originalname}" approved=${policyAssessment.approved} valueScore=${policyAssessment.valueScore} risk=${policyAssessment.complianceRisk}`
    );

    if (!policyAssessment.approved) {
      console.warn(
        `[upload] rejected file="${req.file.originalname}": ${policyAssessment.rejectionReasons.join(" ")}`
      );
      return next(new AppError(
        `Upload rejected by data policy agent: ${policyAssessment.rejectionReasons.join(" ")}`,
        422
      ));
    }

    // Upload file to storage
    console.log(`[upload] storing file="${req.file.originalname}" on 0G Storage`);
    const storage = await storageService.uploadFile(
      req.file.buffer,
      req.file.originalname
    );
    console.log(
      `[upload] stored file="${req.file.originalname}" rootHash=${storage.rootHash} txHash=${storage.txHash || "pending"}`
    );

    // Note: Quality validation happens after dataset registration on-chain
    // For now, we return the storage info and indicate pending validation

    res.status(201).json({
      success: true,
      rootHash: storage.rootHash,
      storageTxHash: storage.txHash,
      storageTxSeq: storage.txSeq,
      storageSubmissionUrl: storage.submissionUrl,
      originalName: req.file.originalname,
      size: req.file.size,
      message: "File uploaded successfully. Validation pending assignment to dataset registration.",
      validatorAgent: agentAddress,
      dataType: resolvedDataType,
      policyAssessment,
    });
    console.log(`[upload] completed file="${req.file.originalname}" dataType=${resolvedDataType}`);
  } catch (err) {
    console.error(`[upload] failed: ${err instanceof Error ? err.message : String(err)}`);
    next(err);
  }
};
