import OpenAI from "openai";
import { config } from "../../config";
import { QualityAssessment, ValidationStatus, DataType } from "../../types";
import { Dataset } from "../../models/dataset.model";

class ValidationService {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      baseURL: `${config.og.computeServiceUrl}/v1/proxy`,
      apiKey: config.og.computeApiSecret,
    });
    this.model = config.og.computeModel;
  }

  /**
   * Assess data quality using AI validation agent
   */
  async assessDataQuality(
    storageRootHash: string,
    dataType: DataType,
    fileSize: number,
    fileName: string,
    description: string,
    agentAddress: string
  ): Promise<QualityAssessment> {
    const prompt = `You are a rigorous data quality validation agent for DataVault, a decentralized AI training data marketplace.
Your role is to validate data authenticity, quality, and compliance before it's published.

DATASET INFORMATION:
- Storage Hash: ${storageRootHash}
- Data Type: ${dataType}
- File Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB
- File Name: ${fileName}
- Description: ${description}
- Assigned Validator Agent: ${agentAddress}

VALIDATION CRITERIA (score 0-100 for each):
1. COMPLETENESS: Is the dataset complete and sufficient for its stated purpose? (missing data, gaps, partial records)
2. ACCURACY: Are the data values correct and precise? (data inconsistencies, measurement errors, data type mismatches)
3. AUTHENTICITY: Is the data genuine and not synthetic/fabricated? (real-world viability, realistic patterns)
4. CONSISTENCY: Is the data internally consistent and non-contradictory? (format issues, duplicate records, conflicting values)

RESPONSE FORMAT (JSON):
{
  "overallScore": <number 0-100>,
  "completeness": <number 0-100>,
  "accuracy": <number 0-100>,
  "authenticity": <number 0-100>,
  "consistency": <number 0-100>,
  "issues": [<critical issues found>],
  "recommendations": [<suggestions for improvement>]
}

Provide strict but fair scoring. Overall score = average of 4 metrics.
Be realistic about ${dataType} datasets specifically.`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from validator");
      }

      // Parse JSON response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not extract JSON from validator response");
      }

      const assessment = JSON.parse(jsonMatch[0]) as QualityAssessment;

      // Validate response structure
      this.validateAssessmentStructure(assessment);

      return assessment;
    } catch (error) {
      console.error("Validation assessment failed:", error);
      throw new Error(`Data quality validation failed: ${error}`);
    }
  }

  /**
   * Validate assessment structure and ranges
   */
  private validateAssessmentStructure(assessment: QualityAssessment): void {
    const metrics = ["overallScore", "completeness", "accuracy", "authenticity", "consistency"];
    for (const metric of metrics) {
      const value = (assessment as Record<string, unknown>)[metric];
      if (typeof value !== "number" || value < 0 || value > 100) {
        throw new Error(`Invalid ${metric}: must be between 0-100`);
      }
    }

    if (!Array.isArray(assessment.issues) || !Array.isArray(assessment.recommendations)) {
      throw new Error("Issues and recommendations must be arrays");
    }
  }

  /**
   * Process validation and update dataset
   */
  async validateDataset(
    onChainId: number,
    storageRootHash: string,
    dataType: DataType,
    fileSize: number,
    fileName: string,
    description: string,
    agentAddress: string
  ): Promise<{
    validationStatus: ValidationStatus;
    qualityScore: number;
    assessment: QualityAssessment;
  }> {
    // Get quality assessment from validator agent
    const assessment = await this.assessDataQuality(
      storageRootHash,
      dataType,
      fileSize,
      fileName,
      description,
      agentAddress
    );

    // Determine if dataset is approved or rejected based on overall score
    // Threshold: 60% minimum quality score for approval
    const APPROVAL_THRESHOLD = 60;
    const validationStatus =
      assessment.overallScore >= APPROVAL_THRESHOLD
        ? ValidationStatus.APPROVED
        : ValidationStatus.REJECTED;

    // Update dataset with validation results
    const dataset = await Dataset.findOneAndUpdate(
      { onChainId },
      {
        validationStatus,
        validatorAgent: agentAddress,
        validationTimestamp: new Date(),
        qualityScore: assessment.overallScore,
        validationDetails: {
          completeness: assessment.completeness,
          accuracy: assessment.accuracy,
          authenticity: assessment.authenticity,
          consistency: assessment.consistency,
          issues: assessment.issues,
          recommendations: assessment.recommendations,
        },
      },
      { new: true }
    );

    if (!dataset) {
      throw new Error(`Dataset with onChainId ${onChainId} not found`);
    }

    return {
      validationStatus,
      qualityScore: assessment.overallScore,
      assessment,
    };
  }

  /**
   * Get datasets pending validation
   */
  async getPendingValidations(limit: number = 50): Promise<unknown[]> {
    return Dataset.find({ validationStatus: ValidationStatus.PENDING })
      .sort({ createdAt: 1 })
      .limit(limit);
  }

  /**
   * Get validation history for a dataset
   */
  async getValidationHistory(datasetId: number): Promise<unknown> {
    return Dataset.findOne({ onChainId: datasetId }).select(
      "validationStatus validatorAgent validationTimestamp validationDetails qualityScore"
    );
  }
}

export const validationService = new ValidationService();
