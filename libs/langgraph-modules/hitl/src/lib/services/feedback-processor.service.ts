import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowState } from '@langgraph-modules/core';

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
 * Feedback entry
 */
export interface FeedbackEntry {
  /**
   * Unique ID
   */
  id: string;

  /**
   * Execution ID
   */
  executionId: string;

  /**
   * Feedback type
   */
  type: FeedbackType;

  /**
   * Feedback content
   */
  content: {
    /**
     * Main feedback message
     */
    message?: string;

    /**
     * Rating (1-5)
     */
    rating?: number;

    /**
     * Suggested modifications
     */
    modifications?: Record<string, unknown>;

    /**
     * Tags/categories
     */
    tags?: string[];

    /**
     * Additional data
     */
    data?: Record<string, unknown>;
  };

  /**
   * Provider information
   */
  provider: {
    id: string;
    name?: string;
    role?: string;
  };

  /**
   * Timestamp
   */
  timestamp: Date;

  /**
   * Whether feedback has been processed
   */
  processed: boolean;

  /**
   * Processing result
   */
  processingResult?: {
    success: boolean;
    error?: string;
    appliedChanges?: Record<string, unknown>;
    timestamp: Date;
  };
}

/**
 * Feedback statistics
 */
export interface FeedbackStats {
  total: number;
  byType: Record<FeedbackType, number>;
  averageRating?: number;
  processedCount: number;
  pendingCount: number;
  successRate: number;
}

/**
 * Service for processing and managing human feedback
 */
@Injectable()
export class FeedbackProcessorService {
  private readonly logger = new Logger(FeedbackProcessorService.name);
  private readonly feedbackStore = new Map<string, FeedbackEntry>();
  private readonly executionFeedback = new Map<string, FeedbackEntry[]>();

  constructor(
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Submit feedback
   */
  async submitFeedback(
    executionId: string,
    type: FeedbackType,
    content: FeedbackEntry['content'],
    provider: FeedbackEntry['provider']
  ): Promise<FeedbackEntry> {
    const feedbackId = this.generateFeedbackId();

    const entry: FeedbackEntry = {
      id: feedbackId,
      executionId,
      type,
      content,
      provider,
      timestamp: new Date(),
      processed: false,
    };

    // Store feedback
    this.feedbackStore.set(feedbackId, entry);

    // Add to execution mapping
    const executionEntries = this.executionFeedback.get(executionId) || [];
    executionEntries.push(entry);
    this.executionFeedback.set(executionId, executionEntries);

    // Emit event
    await this.eventEmitter.emit('feedback.submitted', entry);

    this.logger.log(
      `Feedback submitted: ${feedbackId} for execution ${executionId}`
    );

    return entry;
  }

  /**
   * Process feedback and apply to workflow state
   */
  async processFeedback<TState extends WorkflowState = WorkflowState>(
    feedbackId: string,
    currentState: TState
  ): Promise<Partial<TState>> {
    const entry = this.feedbackStore.get(feedbackId);

    if (!entry) {
      throw new Error(`Feedback ${feedbackId} not found`);
    }

    if (entry.processed) {
      this.logger.warn(`Feedback ${feedbackId} already processed`);
      return {};
    }

    this.logger.log(`Processing feedback ${feedbackId} of type ${entry.type}`);

    try {
      // Process based on feedback type
      let stateUpdate: Partial<TState> = {};

      switch (entry.type) {
        case FeedbackType.APPROVAL:
          stateUpdate = this.processApprovalFeedback(entry, currentState);
          break;

        case FeedbackType.REJECTION:
          stateUpdate = this.processRejectionFeedback(entry, currentState);
          break;

        case FeedbackType.MODIFICATION:
          stateUpdate = this.processModificationFeedback(entry, currentState);
          break;

        case FeedbackType.CLARIFICATION:
          stateUpdate = this.processClarificationFeedback(entry, currentState);
          break;

        case FeedbackType.RATING:
          stateUpdate = this.processRatingFeedback(entry, currentState);
          break;

        case FeedbackType.COMMENT:
          stateUpdate = this.processCommentFeedback(entry, currentState);
          break;
      }

      // Mark as processed
      entry.processed = true;
      entry.processingResult = {
        success: true,
        appliedChanges: stateUpdate as Record<string, unknown>,
        timestamp: new Date(),
      };

      // Emit event
      await this.eventEmitter.emit('feedback.processed', {
        feedbackId,
        executionId: entry.executionId,
        type: entry.type,
        success: true,
      });

      return stateUpdate;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Mark as processed with error
      entry.processed = true;
      entry.processingResult = {
        success: false,
        error: errorMessage,
        timestamp: new Date(),
      };

      // Emit error event
      await this.eventEmitter.emit('feedback.processing.failed', {
        feedbackId,
        executionId: entry.executionId,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Process approval feedback
   */
  private processApprovalFeedback<TState extends WorkflowState>(
    entry: FeedbackEntry,
    currentState: TState
  ): Partial<TState> {
    return {
      humanFeedback: {
        approved: true,
        status: 'approved',
        approver: entry.provider,
        message: entry.content.message,
        timestamp: entry.timestamp,
      },
      confidence: Math.min((currentState.confidence || 0) + 0.1, 1.0),
      approvalReceived: true,
    } as unknown as Partial<TState>;
  }

  /**
   * Process rejection feedback
   */
  private processRejectionFeedback<TState extends WorkflowState>(
    entry: FeedbackEntry,
    currentState: TState
  ): Partial<TState> {
    return {
      humanFeedback: {
        approved: false,
        status: 'rejected',
        approver: entry.provider,
        message: entry.content.message,
        reason: entry.content.message,
        timestamp: entry.timestamp,
      },
      confidence: Math.max((currentState.confidence || 0) - 0.2, 0.0),
      rejectionReason: entry.content.message,
    } as unknown as Partial<TState>;
  }

  /**
   * Process modification feedback
   */
  private processModificationFeedback<TState extends WorkflowState>(
    entry: FeedbackEntry,
    currentState: TState
  ): Partial<TState> {
    return {
      humanFeedback: {
        approved: false,
        status: 'needs_revision',
        approver: entry.provider,
        message: entry.content.message,
        alternatives: entry.content.modifications
          ? Object.keys(entry.content.modifications)
          : undefined,
        metadata: entry.content.modifications,
        timestamp: entry.timestamp,
      },
      metadata: {
        ...(currentState.metadata || {}),
        modifications: entry.content.modifications,
      },
    } as unknown as Partial<TState>;
  }

  /**
   * Process clarification feedback
   */
  private processClarificationFeedback<TState extends WorkflowState>(
    entry: FeedbackEntry,
    currentState: TState
  ): Partial<TState> {
    return {
      metadata: {
        ...(currentState.metadata || {}),
        clarifications: [
          ...((currentState.metadata?.clarifications as string[]) || []),
          entry.content.message,
        ],
      },
    } as unknown as Partial<TState>;
  }

  /**
   * Process rating feedback
   */
  private processRatingFeedback<TState extends WorkflowState>(
    entry: FeedbackEntry,
    currentState: TState
  ): Partial<TState> {
    const rating = entry.content.rating || 3;
    const confidenceAdjustment = (rating - 3) * 0.1; // -0.2 to +0.2 based on rating

    return {
      confidence: Math.max(
        0,
        Math.min(1, (currentState.confidence || 0.5) + confidenceAdjustment)
      ),
      metadata: {
        ...(currentState.metadata || {}),
        userRating: rating,
        ratingFeedback: entry.content.message,
      },
    } as unknown as Partial<TState>;
  }

  /**
   * Process comment feedback
   */
  private processCommentFeedback<TState extends WorkflowState>(
    entry: FeedbackEntry,
    currentState: TState
  ): Partial<TState> {
    return {
      metadata: {
        ...(currentState.metadata || {}),
        comments: [
          ...((currentState.metadata?.comments as string[]) || []),
          {
            message: entry.content.message,
            provider: entry.provider,
            timestamp: entry.timestamp,
            tags: entry.content.tags,
          },
        ],
      },
    } as unknown as Partial<TState>;
  }

  /**
   * Get feedback for execution
   */
  getFeedbackForExecution(executionId: string): FeedbackEntry[] {
    return this.executionFeedback.get(executionId) || [];
  }

  /**
   * Get feedback statistics
   */
  getFeedbackStats(executionId?: string): FeedbackStats {
    const entries = executionId
      ? this.executionFeedback.get(executionId) || []
      : Array.from(this.feedbackStore.values());

    const byType: Record<FeedbackType, number> = {
      [FeedbackType.APPROVAL]: 0,
      [FeedbackType.REJECTION]: 0,
      [FeedbackType.MODIFICATION]: 0,
      [FeedbackType.CLARIFICATION]: 0,
      [FeedbackType.RATING]: 0,
      [FeedbackType.COMMENT]: 0,
    };

    let totalRating = 0;
    let ratingCount = 0;
    let processedCount = 0;

    for (const entry of entries) {
      byType[entry.type]++;

      if (entry.processed) {
        processedCount++;
      }

      if (entry.type === FeedbackType.RATING && entry.content.rating) {
        totalRating += entry.content.rating;
        ratingCount++;
      }
    }

    return {
      total: entries.length,
      byType,
      averageRating: ratingCount > 0 ? totalRating / ratingCount : undefined,
      processedCount,
      pendingCount: entries.length - processedCount,
      successRate:
        entries.length > 0
          ? entries.filter((e) => e.processingResult?.success).length /
            entries.length
          : 0,
    };
  }

  /**
   * Clear old feedback
   */
  clearOldFeedback(olderThanMs = 86400000): number {
    const now = Date.now();
    let cleared = 0;

    for (const [id, entry] of this.feedbackStore.entries()) {
      if (now - entry.timestamp.getTime() > olderThanMs) {
        this.feedbackStore.delete(id);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger.debug(`Cleared ${cleared} old feedback entries`);
    }

    return cleared;
  }

  /**
   * Generate unique feedback ID
   */
  private generateFeedbackId(): string {
    return `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

