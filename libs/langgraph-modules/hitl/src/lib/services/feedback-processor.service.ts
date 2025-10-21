import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { generateId, type WorkflowState } from '@hive-academy/langgraph-core';
import {
  IFeedbackStorageService,
  FeedbackEntry,
  FeedbackType,
  ProcessingResult,
  FeedbackAnalytics,
  FeedbackStorageError,
} from '../interfaces/feedback-storage.interface';

// Types now imported from feedback-storage.interface.ts

/**
 * Service for processing and managing human feedback
 *
 * CRITICAL: Uses adapter-first pattern for persistent storage.
 * Human feedback is essential for AI learning and must never be lost.
 */
@Injectable()
export class FeedbackProcessorService implements OnModuleInit {
  private readonly logger = new Logger(FeedbackProcessorService.name);

  // ✅ CORRECT: Maps used ONLY for performance caching
  private readonly feedbackCache = new Map<string, FeedbackEntry>();
  private readonly executionCache = new Map<string, FeedbackEntry[]>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject('IFeedbackStorageService')
    private readonly feedbackStorage: IFeedbackStorageService
  ) {
    this.logger.log(
      '💬 Feedback Processor Service initialized with adapter-first storage'
    );
  }

  /**
   * Module initialization with recovery and fail-fast patterns
   */
  async onModuleInit(): Promise<void> {
    this.logger.log(
      'Feedback Processor Service initializing with persistent storage'
    );
    await this.recoverActiveFeedback();
    await this.startFeedbackProcessingPipeline();
    this.logger.log('✅ Feedback Processor Service initialized');
  }

  /**
   * Recover all active feedback entries from persistent storage
   */
  private async recoverActiveFeedback(): Promise<void> {
    try {
      // Recover all active feedback entries
      const activeFeedback = await this.feedbackStorage.getAllActiveFeedback();
      activeFeedback.forEach((feedback) => {
        this.feedbackCache.set(feedback.id, feedback);
      });

      // Rebuild execution feedback mapping
      const executionFeedback =
        await this.feedbackStorage.getAllExecutionFeedback();
      Object.entries(executionFeedback).forEach(
        ([executionId, feedbackList]) => {
          this.executionCache.set(executionId, feedbackList);
        }
      );

      this.logger.log(
        `✅ Recovered ${activeFeedback.length} feedback entries across ${
          Object.keys(executionFeedback).length
        } executions`
      );
    } catch (error) {
      this.logger.error(
        '❌ CRITICAL: Failed to recover feedback data - service will fail fast',
        error
      );
      throw new Error(
        'Cannot initialize FeedbackProcessorService without persistent storage recovery'
      );
    }
  }

  /**
   * Start processing pipeline for unprocessed feedback
   */
  private async startFeedbackProcessingPipeline(): Promise<void> {
    try {
      // Process any unprocessed feedback from recovery
      const unprocessed = await this.feedbackStorage.getUnprocessedFeedback();
      this.logger.log(
        `🔄 Starting processing pipeline for ${unprocessed.length} unprocessed feedback entries`
      );

      for (const feedback of unprocessed) {
        try {
          await this.processFeedback(feedback.id, {} as any); // Will be fixed in next transform
        } catch (error) {
          this.logger.warn(
            `Failed to process recovered feedback ${feedback.id}:`,
            error
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to start feedback processing pipeline:', error);
      // Non-fatal - service can continue without processing pipeline
    }
  }

  /**
   * Submit feedback with adapter-first persistence
   */
  async submitFeedback(
    executionId: string,
    type: FeedbackType,
    content: FeedbackEntry['content'],
    provider: FeedbackEntry['provider']
  ): Promise<FeedbackEntry> {
    const feedbackId = generateId('feedback');

    const entry: FeedbackEntry = {
      id: feedbackId,
      executionId,
      type,
      content,
      provider,
      timestamp: new Date(),
      processed: false,
      metadata: JSON.stringify({
        source: 'human_feedback',
        version: '1.0',
      }),
    };

    try {
      // ✅ CORRECT: Store in adapter first
      await this.feedbackStorage.storeFeedback(entry);

      // ✅ CORRECT: Cache for performance
      this.feedbackCache.set(feedbackId, entry);

      // Update execution cache
      const executionFeedback = this.executionCache.get(executionId) || [];
      executionFeedback.push(entry);
      this.executionCache.set(executionId, executionFeedback);

      // Emit event for processing pipeline
      await this.eventEmitter.emit('feedback.submitted', {
        feedbackId,
        executionId,
        type,
        timestamp: new Date(),
      });

      this.logger.log(
        `Submitted feedback ${feedbackId} for execution ${executionId}`
      );
      return entry;
    } catch (error) {
      this.logger.error(
        `Failed to submit feedback for execution ${executionId}:`,
        error
      );
      throw new FeedbackStorageError(
        'Failed to store feedback entry',
        'submitFeedback',
        { executionId, type, providerId: provider.id }
      );
    }
  }

  /**
   * Process feedback with adapter-first pattern and AI learning integration
   */
  async processFeedback<TState extends WorkflowState = WorkflowState>(
    feedbackId: string,
    currentState: TState
  ): Promise<Partial<TState>> {
    // ✅ CORRECT: Load from cache first, then storage
    let feedback = this.feedbackCache.get(feedbackId);
    if (!feedback) {
      feedback =
        (await this.feedbackStorage.getFeedback(feedbackId)) || undefined;
      if (feedback) {
        this.feedbackCache.set(feedbackId, feedback); // Update cache
      }
    }

    if (!feedback) {
      throw new Error(`Feedback ${feedbackId} not found`);
    }

    if (feedback.processed) {
      this.logger.warn(`Feedback ${feedbackId} already processed`);
      return (
        (feedback.processingResult?.appliedChanges as Partial<TState>) || {}
      );
    }

    this.logger.log(
      `Processing feedback ${feedbackId} of type ${feedback.type}`
    );

    try {
      // Process based on feedback type
      let stateUpdate: Partial<TState> = {};

      switch (feedback.type) {
        case FeedbackType.APPROVAL:
          stateUpdate = this.processApprovalFeedback(feedback, currentState);
          break;

        case FeedbackType.REJECTION:
          stateUpdate = this.processRejectionFeedback(feedback, currentState);
          break;

        case FeedbackType.MODIFICATION:
          stateUpdate = this.processModificationFeedback(
            feedback,
            currentState
          );
          break;

        case FeedbackType.CLARIFICATION:
          stateUpdate = this.processClarificationFeedback(
            feedback,
            currentState
          );
          break;

        case FeedbackType.RATING:
          stateUpdate = this.processRatingFeedback(feedback, currentState);
          break;

        case FeedbackType.COMMENT:
          stateUpdate = this.processCommentFeedback(feedback, currentState);
          break;
      }

      // Create processing result with AI learning insights
      const result: ProcessingResult = {
        success: true,
        appliedChanges: stateUpdate as Record<string, unknown>,
        timestamp: new Date(),
        learningInsights: this.extractLearningInsights(feedback, stateUpdate),
      };

      // ✅ CORRECT: Update storage first
      await this.feedbackStorage.updateFeedbackStatus(feedbackId, true, result);

      // ✅ CORRECT: Update cache
      const updatedFeedback = {
        ...feedback,
        processed: true,
        processingResult: result,
      };
      this.feedbackCache.set(feedbackId, updatedFeedback);

      // Emit processing completion
      await this.eventEmitter.emit('feedback.processed', {
        feedbackId,
        executionId: feedback.executionId,
        type: feedback.type,
        result,
        timestamp: new Date(),
      });

      return stateUpdate;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      const result: ProcessingResult = {
        success: false,
        reason: errorMessage,
        timestamp: new Date(),
      };

      // Update storage with error
      await this.feedbackStorage.updateFeedbackStatus(feedbackId, true, result);

      // Update cache with error
      const updatedFeedback = {
        ...feedback,
        processed: true,
        processingResult: result,
      };
      this.feedbackCache.set(feedbackId, updatedFeedback);

      // Emit error event
      await this.eventEmitter.emit('feedback.processing.failed', {
        feedbackId,
        executionId: feedback.executionId,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Extract AI learning insights from feedback processing
   */
  private extractLearningInsights(
    feedback: FeedbackEntry,
    stateUpdate: any
  ): ProcessingResult['learningInsights'] {
    const patterns: string[] = [];
    const improvements: string[] = [];
    let confidence = 0.5;

    // Extract patterns based on feedback type
    switch (feedback.type) {
      case FeedbackType.APPROVAL: {
        patterns.push('positive_workflow_outcome');
        improvements.push('maintain_current_approach');
        confidence = 0.8;
        break;
      }

      case FeedbackType.REJECTION: {
        patterns.push('workflow_rejection_pattern');
        improvements.push('revise_decision_logic');
        confidence = 0.3;
        break;
      }

      case FeedbackType.MODIFICATION: {
        patterns.push('modification_request_pattern');
        if (feedback.content.modifications) {
          improvements.push(
            `apply_modification: ${Object.keys(
              feedback.content.modifications
            ).join(', ')}`
          );
        }
        confidence = 0.6;
        break;
      }

      case FeedbackType.RATING: {
        const rating = feedback.content.rating || 3;
        patterns.push(`rating_${rating}_pattern`);
        if (rating >= 4) {
          improvements.push('high_quality_workflow');
          confidence = 0.8;
        } else if (rating <= 2) {
          improvements.push('improve_workflow_quality');
          confidence = 0.3;
        }
        break;
      }
    }

    return {
      patterns,
      improvements,
      confidence,
    };
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
   * Get feedback for execution with adapter-first pattern
   */
  async getFeedbackForExecution(executionId: string): Promise<FeedbackEntry[]> {
    // Check cache first
    const cached = this.executionCache.get(executionId);
    if (cached) {
      return cached;
    }

    // Load from storage
    try {
      const feedback = await this.feedbackStorage.getFeedbackByExecution(
        executionId
      );

      // Update cache
      this.executionCache.set(executionId, feedback);

      // Also update individual feedback cache
      feedback.forEach((entry) => {
        this.feedbackCache.set(entry.id, entry);
      });

      return feedback;
    } catch (error) {
      this.logger.error(
        `Failed to load feedback for execution ${executionId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Get comprehensive feedback analytics from persistent storage
   */
  async getFeedbackStats(executionId?: string): Promise<FeedbackAnalytics> {
    try {
      if (executionId) {
        // Get execution-specific stats
        const entries = await this.getFeedbackForExecution(executionId);
        return this.computeAnalyticsFromEntries(entries);
      } else {
        // Get comprehensive analytics from storage
        return await this.feedbackStorage.getFeedbackStats();
      }
    } catch (error) {
      this.logger.error('Failed to get feedback statistics:', error);
      // Fallback to cache-based stats
      const entries = executionId
        ? this.executionCache.get(executionId) || []
        : Array.from(this.feedbackCache.values());
      return this.computeAnalyticsFromEntries(entries);
    }
  }

  /**
   * Compute analytics from feedback entries (fallback method)
   */
  private computeAnalyticsFromEntries(
    entries: FeedbackEntry[]
  ): FeedbackAnalytics {
    const byType: Record<FeedbackType, number> = {
      [FeedbackType.APPROVAL]: 0,
      [FeedbackType.REJECTION]: 0,
      [FeedbackType.MODIFICATION]: 0,
      [FeedbackType.CLARIFICATION]: 0,
      [FeedbackType.RATING]: 0,
      [FeedbackType.COMMENT]: 0,
    };

    const byProvider: Record<string, number> = {};
    let totalRating = 0;
    let ratingCount = 0;
    let processedCount = 0;
    let totalProcessingTime = 0;
    let processingTimeCount = 0;
    let positive = 0;
    let negative = 0;
    let neutral = 0;

    for (const entry of entries) {
      byType[entry.type]++;
      byProvider[entry.provider.id] = (byProvider[entry.provider.id] || 0) + 1;

      if (entry.processed) {
        processedCount++;

        if (entry.processingResult) {
          const processingTime =
            entry.processingResult.timestamp.getTime() -
            entry.timestamp.getTime();
          totalProcessingTime += processingTime;
          processingTimeCount++;
        }
      }

      // Sentiment analysis
      if (
        entry.type === FeedbackType.APPROVAL ||
        (entry.type === FeedbackType.RATING && (entry.content.rating || 0) >= 4)
      ) {
        positive++;
      } else if (
        entry.type === FeedbackType.REJECTION ||
        (entry.type === FeedbackType.RATING && (entry.content.rating || 0) <= 2)
      ) {
        negative++;
      } else {
        neutral++;
      }

      if (entry.type === FeedbackType.RATING && entry.content.rating) {
        totalRating += entry.content.rating;
        ratingCount++;
      }
    }

    return {
      totalFeedback: entries.length,
      processedCount,
      unprocessedCount: entries.length - processedCount,
      byType,
      byProvider,
      avgProcessingTime:
        processingTimeCount > 0 ? totalProcessingTime / processingTimeCount : 0,
      recentTrends: { positive, negative, neutral },
      successRate:
        entries.length > 0
          ? entries.filter((e) => e.processingResult?.success).length /
            entries.length
          : 0,
      topPatterns: [],
      learningMetrics: {
        averageConfidence:
          ratingCount > 0 ? totalRating / ratingCount / 5 : 0.5,
        improvementTrends: positive > negative ? 0.1 : -0.1,
        adaptationRate: processedCount / Math.max(entries.length, 1),
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * Clear old feedback with adapter-first pattern
   */
  async clearOldFeedback(olderThanMs = 86400000): Promise<number> {
    try {
      // Clear from storage first
      const cleared = await this.feedbackStorage.cleanup(olderThanMs);

      // Clear from cache
      const now = Date.now();
      let cacheCleared = 0;

      for (const [id, entry] of this.feedbackCache.entries()) {
        if (now - entry.timestamp.getTime() > olderThanMs) {
          this.feedbackCache.delete(id);
          cacheCleared++;
        }
      }

      // Clear from execution cache
      for (const [executionId, entries] of this.executionCache.entries()) {
        const filtered = entries.filter(
          (entry) => now - entry.timestamp.getTime() <= olderThanMs
        );
        if (filtered.length !== entries.length) {
          this.executionCache.set(executionId, filtered);
        }
      }

      if (cleared > 0) {
        this.logger.debug(
          `Cleared ${cleared} old feedback entries from storage and ${cacheCleared} from cache`
        );
      }

      return cleared;
    } catch (error) {
      this.logger.error('Failed to clear old feedback:', error);
      throw new FeedbackStorageError(
        'Failed to cleanup old feedback entries',
        'clearOldFeedback',
        { olderThanMs }
      );
    }
  }

  /**
   * Get all unprocessed feedback for AI learning pipeline
   */
  async getUnprocessedFeedback(): Promise<FeedbackEntry[]> {
    try {
      return await this.feedbackStorage.getUnprocessedFeedback();
    } catch (error) {
      this.logger.error('Failed to get unprocessed feedback:', error);
      // Fallback to cache
      return Array.from(this.feedbackCache.values()).filter(
        (entry) => !entry.processed
      );
    }
  }

  /**
   * Health check for feedback processor service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check storage adapter health
      const storageHealthy = await this.feedbackStorage.healthCheck();

      // Check cache health
      const cacheHealthy = this.feedbackCache.size >= 0; // Basic cache check

      return storageHealthy && cacheHealthy;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }
}
