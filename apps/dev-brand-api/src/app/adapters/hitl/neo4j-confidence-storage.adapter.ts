import { Injectable, Logger } from '@nestjs/common';
import type {
  IConfidenceStorageService,
  MLTrainingSet,
  MLPredictionResult,
  ConfidenceOutcome,
  FeatureVector,
  ConfidenceAnalytics,
  PatternInsights,
  ApprovalPattern,
  ConfidenceFactor,
} from '@hive-academy/langgraph-hitl';
import { ConfidencePatternRepository } from '../../repositories/confidence-pattern.repository';

/**
 * Clean Neo4j adapter for confidence storage.
 *
 * This adapter delegates all database operations to ConfidencePatternRepository,
 * providing a clean separation of concerns and type-safe database operations.
 */
@Injectable()
export class Neo4jConfidenceStorageAdapter
  implements IConfidenceStorageService
{
  private readonly logger = new Logger(Neo4jConfidenceStorageAdapter.name);

  constructor(
    private readonly confidencePatternRepo: ConfidencePatternRepository
  ) {
    this.logger.log(
      '🧠 Neo4j Confidence Storage Adapter initialized with ConfidencePatternRepository'
    );
  }

  /**
   * Approval Pattern Management
   */

  async storeApprovalPattern(pattern: ApprovalPattern): Promise<void> {
    return this.confidencePatternRepo.storeApprovalPattern(pattern);
  }

  async getApprovalPattern(patternId: string): Promise<ApprovalPattern | null> {
    return this.confidencePatternRepo.getApprovalPattern(patternId);
  }

  async getApprovalPatternsByExecution(
    executionId: string
  ): Promise<ApprovalPattern[]> {
    return this.confidencePatternRepo.getApprovalPatternsByExecution(
      executionId
    );
  }

  async getAllApprovalPatterns(): Promise<ApprovalPattern[]> {
    return this.confidencePatternRepo.getAllApprovalPatterns();
  }

  async updateApprovalPattern(
    patternId: string,
    updates: Partial<ApprovalPattern>
  ): Promise<void> {
    return this.confidencePatternRepo.updateApprovalPattern(patternId, updates);
  }

  async deleteApprovalPattern(patternId: string): Promise<boolean> {
    return this.confidencePatternRepo.deleteApprovalPattern(patternId);
  }

  /**
   * Confidence History Management
   */

  async storeConfidenceHistory(
    executionId: string,
    factors: ConfidenceFactor[]
  ): Promise<void> {
    return this.confidencePatternRepo.storeConfidenceHistory(
      executionId,
      factors
    );
  }

  async getConfidenceHistory(executionId: string): Promise<ConfidenceFactor[]> {
    return this.confidencePatternRepo.getConfidenceHistory(executionId);
  }

  async getAllConfidenceHistory(): Promise<Record<string, ConfidenceFactor[]>> {
    // Implement by delegating to getAllActivePatterns and getting history for each
    const patterns = await this.confidencePatternRepo.getAllActivePatterns();
    const result: Record<string, ConfidenceFactor[]> = {};

    for (const pattern of patterns) {
      if (pattern.nodeId) {
        result[pattern.nodeId] =
          await this.confidencePatternRepo.getConfidenceHistory(pattern.nodeId);
      }
    }

    return result;
  }

  async updateConfidenceFactors(
    executionId: string,
    factors: ConfidenceFactor[]
  ): Promise<void> {
    // Update by storing new confidence history
    return this.confidencePatternRepo.storeConfidenceHistory(
      executionId,
      factors
    );
  }

  /**
   * ML Training and Prediction
   */

  async getMLTrainingData(): Promise<MLTrainingSet> {
    return this.confidencePatternRepo.getMLTrainingData();
  }

  async storeMLPrediction(
    executionId: string,
    prediction: MLPredictionResult
  ): Promise<void> {
    return this.confidencePatternRepo.storeMLPrediction(
      executionId,
      prediction
    );
  }

  async getMLPredictions(executionId: string): Promise<MLPredictionResult[]> {
    // Note: Repository might not have this exact method, return empty array for now
    this.logger.warn(`getMLPredictions not fully implemented: ${executionId}`);
    return [];
  }

  /**
   * Outcome and Feature Storage
   */

  async storeConfidenceOutcome(outcome: ConfidenceOutcome): Promise<void> {
    return this.confidencePatternRepo.storeConfidenceOutcome(outcome);
  }

  async storeFeatureVector(features: FeatureVector): Promise<void> {
    return this.confidencePatternRepo.storeFeatureVector(features);
  }

  /**
   * Analytics and Insights
   */

  async getConfidenceAnalytics(timeRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<ConfidenceAnalytics> {
    return this.confidencePatternRepo.getConfidenceAnalytics(timeRange);
  }

  async getPatternInsights(timeRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<PatternInsights> {
    return this.confidencePatternRepo.getPatternInsights(timeRange);
  }

  async getAllActivePatterns(): Promise<ApprovalPattern[]> {
    return this.confidencePatternRepo.getAllActivePatterns();
  }

  async getAllActiveHistory(): Promise<Record<string, ConfidenceFactor[]>> {
    return this.getAllConfidenceHistory();
  }

  /**
   * Maintenance Operations
   */

  async cleanup(maxAge = 30): Promise<number> {
    return this.confidencePatternRepo.cleanup(maxAge * 24 * 60 * 60 * 1000); // Convert days to milliseconds
  }

  async isHealthy(): Promise<boolean> {
    return this.confidencePatternRepo.isHealthy();
  }

  async getStorageStats(): Promise<{
    totalPatterns: number;
    totalHistory: number;
    totalMLData: number;
    storageSize: number;
    lastBackup?: Date;
  }> {
    const repoStats = await this.confidencePatternRepo.getStorageStats();
    // Map repository stats to interface stats
    return {
      totalPatterns: repoStats.totalPatterns,
      totalHistory: repoStats.totalHistory,
      totalMLData: repoStats.totalPatterns + repoStats.totalHistory, // Combine patterns and history
      storageSize: (repoStats.totalPatterns + repoStats.totalHistory) * 1024, // Estimate storage size
      lastBackup: new Date(), // Current time as last backup placeholder
    };
  }
}
