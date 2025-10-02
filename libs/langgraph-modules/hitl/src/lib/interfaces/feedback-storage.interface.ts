import { Injectable } from '@nestjs/common';

/**
 * Feedback Storage service interface for feedback persistence operations
 *
 * This abstract class serves as both a contract definition and NestJS injection token
 * for feedback storage operations, enabling adapter pattern implementation while
 * maintaining type safety and dependency injection compatibility.
 *
 * Follows the same pattern as IHitlStorageService for consistent adapter integration.
 */
@Injectable()
export abstract class IFeedbackStorageService {
  // ===== FEEDBACK ENTRY MANAGEMENT =====
  
  /**
   * Store feedback entry for persistence
   */
  abstract storeFeedback(feedback: FeedbackEntry): Promise<void>;

  /**
   * Get feedback entry by ID
   */
  abstract getFeedback(feedbackId: string): Promise<FeedbackEntry | null>;

  /**
   * Get all feedback entries for a specific execution
   */
  abstract getFeedbackByExecution(executionId: string): Promise<FeedbackEntry[]>;

  /**
   * Update feedback processing status and results
   */
  abstract updateFeedbackStatus(
    feedbackId: string, 
    processed: boolean, 
    results?: ProcessingResult
  ): Promise<void>;

  /**
   * Delete feedback entry by ID
   */
  abstract deleteFeedback(feedbackId: string): Promise<boolean>;

  // ===== ANALYTICS & LEARNING =====

  /**
   * Get feedback entries by type for AI learning analysis
   */
  abstract getFeedbackByType(type: FeedbackType): Promise<FeedbackEntry[]>;

  /**
   * Get feedback entries by provider for provider analytics
   */
  abstract getFeedbackByProvider(providerId: string): Promise<FeedbackEntry[]>;

  /**
   * Get all unprocessed feedback for AI learning pipeline
   */
  abstract getUnprocessedFeedback(): Promise<FeedbackEntry[]>;

  /**
   * Get comprehensive feedback analytics for AI improvement
   */
  abstract getFeedbackStats(): Promise<FeedbackAnalytics>;

  // ===== RECOVERY OPERATIONS =====

  /**
   * Get all active feedback entries for service recovery
   */
  abstract getAllActiveFeedback(): Promise<FeedbackEntry[]>;

  /**
   * Get all execution feedback mappings for cache reconstruction
   */
  abstract getAllExecutionFeedback(): Promise<Record<string, FeedbackEntry[]>>;

  /**
   * Cleanup old feedback entries
   * @param maxAge Maximum age in milliseconds (default: 24 hours)
   * @returns Number of entries cleaned up
   */
  abstract cleanup(maxAge?: number): Promise<number>;

  /**
   * Health check for storage adapter
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * Common validation method for feedback data
   * Available to all implementations as template method
   */
  protected validateFeedbackData(feedback: FeedbackEntry): void {
    if (!feedback.id?.trim()) {
      throw new InvalidFeedbackDataError(
        'Feedback ID is required and cannot be empty'
      );
    }

    if (!feedback.executionId?.trim()) {
      throw new InvalidFeedbackDataError(
        'Execution ID is required and cannot be empty'
      );
    }

    if (!feedback.type) {
      throw new InvalidFeedbackDataError(
        'Feedback type is required'
      );
    }

    if (!feedback.provider?.id?.trim()) {
      throw new InvalidFeedbackDataError(
        'Provider ID is required and cannot be empty'
      );
    }

    if (!feedback.timestamp || !(feedback.timestamp instanceof Date)) {
      throw new InvalidFeedbackDataError(
        'Feedback timestamp must be a valid Date'
      );
    }
  }

  /**
   * Common validation for processing results
   */
  protected validateProcessingResult(result: ProcessingResult): void {
    if (typeof result.success !== 'boolean') {
      throw new InvalidFeedbackDataError(
        'Processing result success must be a boolean'
      );
    }

    if (!result.timestamp || !(result.timestamp instanceof Date)) {
      throw new InvalidFeedbackDataError(
        'Processing result timestamp must be a valid Date'
      );
    }

    if (result.success === false && !result.reason?.trim()) {
      throw new InvalidFeedbackDataError(
        'Failed processing results must include a reason'
      );
    }
  }
}

/**
 * Feedback type enumeration
 */
export enum FeedbackType {
  APPROVAL = 'approval',
  REJECTION = 'rejection',
  MODIFICATION = 'modification',
  CLARIFICATION = 'clarification',
  RATING = 'rating',
  COMMENT = 'comment',
}

/**
 * Feedback entry data structure
 */
export interface FeedbackEntry {
  /** Unique feedback ID */
  readonly id: string;

  /** Execution ID that this feedback relates to */
  readonly executionId: string;

  /** Type of feedback */
  readonly type: FeedbackType;

  /** Feedback content */
  readonly content: {
    /** Main feedback message */
    message?: string;
    /** Rating (1-5) */
    rating?: number;
    /** Suggested modifications */
    modifications?: Record<string, unknown>;
    /** Tags/categories */
    tags?: string[];
    /** Additional data */
    data?: Record<string, unknown>;
  };

  /** Provider information */
  readonly provider: {
    id: string;
    name?: string;
    role?: string;
  };

  /** When feedback was submitted */
  readonly timestamp: Date;

  /** Whether feedback has been processed */
  readonly processed: boolean;

  /** Processing result if processed */
  readonly processingResult?: ProcessingResult;

  /** Additional metadata as JSON string for database compatibility */
  readonly metadata?: string;
}

/**
 * Processing result structure
 */
export interface ProcessingResult {
  /** Whether processing was successful */
  readonly success: boolean;

  /** Error reason if processing failed */
  readonly reason?: string;

  /** Applied changes during processing */
  readonly appliedChanges?: Record<string, unknown>;

  /** When processing was completed */
  readonly timestamp: Date;

  /** AI learning insights extracted */
  readonly learningInsights?: {
    patterns: string[];
    improvements: string[];
    confidence: number;
  };
}

/**
 * Comprehensive feedback analytics for AI learning
 */
export interface FeedbackAnalytics {
  /** Total feedback count */
  readonly totalFeedback: number;

  /** Processed vs unprocessed counts */
  readonly processedCount: number;
  readonly unprocessedCount: number;

  /** Feedback distribution by type */
  readonly byType: Record<FeedbackType, number>;

  /** Feedback distribution by provider */
  readonly byProvider: Record<string, number>;

  /** Average processing time in milliseconds */
  readonly avgProcessingTime: number;

  /** Recent feedback trends for AI adaptation */
  readonly recentTrends: {
    positive: number;
    negative: number;
    neutral: number;
  };

  /** Success rate of processing */
  readonly successRate: number;

  /** Top feedback patterns for AI learning */
  readonly topPatterns: Array<{
    pattern: string;
    frequency: number;
    type: FeedbackType;
  }>;

  /** AI learning effectiveness metrics */
  readonly learningMetrics: {
    averageConfidence: number;
    improvementTrends: number;
    adaptationRate: number;
  };

  /** When analytics were last computed */
  readonly lastUpdated: Date;
}

/**
 * Error thrown when feedback data is invalid
 */
export class InvalidFeedbackDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFeedbackDataError';
  }
}

/**
 * Error thrown when feedback storage operations fail
 */
export class FeedbackStorageError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FeedbackStorageError';
  }
}