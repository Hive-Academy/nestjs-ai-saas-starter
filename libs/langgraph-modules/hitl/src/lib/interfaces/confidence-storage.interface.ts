import type {
  ApprovalPattern,
  ConfidenceFactor,
} from '../services/confidence-evaluator.service';

/**
 * Machine Learning training data for confidence evaluation
 */
export interface MLTrainingSet {
  patterns: ApprovalPattern[];
  outcomes: ConfidenceOutcome[];
  features: FeatureVector[];
  labels: number[];
}

/**
 * ML prediction result for confidence evaluation
 */
export interface MLPredictionResult {
  executionId: string;
  predictedConfidence: number;
  actualConfidence?: number;
  accuracy?: number;
  features: FeatureVector;
  timestamp: Date;
}

/**
 * Confidence evaluation outcome for ML training
 */
export interface ConfidenceOutcome {
  executionId: string;
  approved: boolean;
  actualOutcome: 'success' | 'failure';
  humanConfidence: number;
  systemConfidence: number;
  timestamp: Date;
}

/**
 * Feature vector for ML training
 */
export interface FeatureVector {
  executionId: string;
  features: Record<string, number>;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Analytics data for confidence system performance
 */
export interface ConfidenceAnalytics {
  totalEvaluations: number;
  averageConfidence: number;
  confidenceDistribution: Record<string, number>;
  accuracyMetrics: {
    correctPredictions: number;
    totalPredictions: number;
    accuracy: number;
  };
  factorImpact: Record<string, number>;
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Insights from confidence pattern analysis
 */
export interface PatternInsights {
  mostEffectivePatterns: ApprovalPattern[];
  riskFactorCorrelations: Record<string, number>;
  confidenceTrends: {
    improving: number;
    declining: number;
    stable: number;
  };
  recommendedThresholds: {
    lowRisk: number;
    mediumRisk: number;
    highRisk: number;
  };
  userBehaviorPatterns: Record<string, number>;
}

/**
 * Storage interface for confidence evaluation data persistence
 *
 * This interface abstracts the storage layer for confidence evaluation,
 * enabling production-ready persistence of approval patterns, confidence history,
 * and machine learning training data.
 */
export interface IConfidenceStorageService {
  /**
   * Approval Pattern Management
   */

  /**
   * Store an approval pattern for future reference
   */
  storeApprovalPattern(pattern: ApprovalPattern): Promise<void>;

  /**
   * Get approval pattern by pattern ID
   */
  getApprovalPattern(patternId: string): Promise<ApprovalPattern | null>;

  /**
   * Get all approval patterns for a specific execution
   */
  getApprovalPatternsByExecution(
    executionId: string
  ): Promise<ApprovalPattern[]>;

  /**
   * Get all stored approval patterns
   */
  getAllApprovalPatterns(): Promise<ApprovalPattern[]>;

  /**
   * Update an existing approval pattern
   */
  updateApprovalPattern(
    patternId: string,
    updates: Partial<ApprovalPattern>
  ): Promise<void>;

  /**
   * Delete an approval pattern
   */
  deleteApprovalPattern(patternId: string): Promise<boolean>;

  /**
   * Confidence History Management
   */

  /**
   * Store confidence factors for an execution
   */
  storeConfidenceHistory(
    executionId: string,
    factors: ConfidenceFactor[]
  ): Promise<void>;

  /**
   * Get confidence history for a specific execution
   */
  getConfidenceHistory(executionId: string): Promise<ConfidenceFactor[]>;

  /**
   * Get all confidence history records
   */
  getAllConfidenceHistory(): Promise<Record<string, ConfidenceFactor[]>>;

  /**
   * Get historical confidence factors for analysis (Phase 1 lazy-loading)
   * @deprecated Use getConfidenceHistory() instead
   */
  getHistoricalFactors?(executionId: string): Promise<ConfidenceFactor[]>;

  /**
   * Update confidence factors for an execution
   */
  updateConfidenceFactors(
    executionId: string,
    newFactors: ConfidenceFactor[]
  ): Promise<void>;

  /**
   * Machine Learning Integration Data
   */

  /**
   * Get ML training data for confidence prediction models
   */
  getMLTrainingData(): Promise<MLTrainingSet>;

  /**
   * Store ML prediction result
   */
  storeMLPrediction(
    executionId: string,
    prediction: MLPredictionResult
  ): Promise<void>;

  /**
   * Get ML predictions for an execution
   */
  getMLPredictions(executionId: string): Promise<MLPredictionResult[]>;

  /**
   * Store confidence outcome for ML training
   */
  storeConfidenceOutcome(outcome: ConfidenceOutcome): Promise<void>;

  /**
   * Store feature vector for ML training
   */
  storeFeatureVector(features: FeatureVector): Promise<void>;

  /**
   * Analytics & Insights
   */

  /**
   * Get comprehensive confidence analytics
   */
  getConfidenceAnalytics(timeRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<ConfidenceAnalytics>;

  /**
   * Get pattern-based insights for confidence improvement
   */
  getPatternInsights(timeRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<PatternInsights>;

  /**
   * Recovery Operations
   */

  /**
   * Get all active approval patterns for service recovery
   */
  getAllActivePatterns(): Promise<ApprovalPattern[]>;

  /**
   * Get all active confidence history for service recovery
   */
  getAllActiveHistory(): Promise<Record<string, ConfidenceFactor[]>>;

  /**
   * Clean up old data based on retention policies
   */
  cleanup(maxAge?: number): Promise<number>;

  /**
   * Health Check Operations
   */

  /**
   * Verify storage service health and connectivity
   */
  isHealthy(): Promise<boolean>;

  /**
   * Get storage service statistics
   */
  getStorageStats(): Promise<{
    totalPatterns: number;
    totalHistory: number;
    totalMLData: number;
    storageSize: number;
    lastBackup?: Date;
  }>;
}

/**
 * Configuration options for confidence storage services
 */
export interface ConfidenceStorageOptions {
  /**
   * Data retention policy (in days)
   */
  retentionDays?: number;

  /**
   * Enable ML data collection
   */
  enableMLCollection?: boolean;

  /**
   * Maximum number of patterns to store per node
   */
  maxPatternsPerNode?: number;

  /**
   * Maximum number of confidence history entries per execution
   */
  maxHistoryPerExecution?: number;

  /**
   * Backup configuration
   */
  backup?: {
    enabled: boolean;
    intervalHours: number;
    retentionDays: number;
  };

  /**
   * Encryption configuration
   */
  encryption?: {
    enabled: boolean;
    algorithm: string;
    keyRotationDays: number;
  };
}

/**
 * Factory interface for creating confidence storage services
 */
export interface IConfidenceStorageFactory {
  /**
   * Create a confidence storage service instance
   */
  createStorageService(
    options?: ConfidenceStorageOptions
  ): Promise<IConfidenceStorageService>;

  /**
   * Validate storage service configuration
   */
  validateConfiguration(options: ConfidenceStorageOptions): Promise<boolean>;
}
