import { Injectable, Logger } from '@nestjs/common';
import { FeedbackRepository } from '../../repositories/neo4j/feedback.repository';
import {
  IFeedbackStorageService,
  FeedbackType,
} from '@hive-academy/langgraph-hitl';
import type {
  FeedbackEntry,
  ProcessingResult,
  FeedbackAnalytics,
} from '@hive-academy/langgraph-hitl';

/**
 * Clean Neo4j adapter for feedback storage.
 *
 * This adapter delegates all database operations to FeedbackRepository,
 * providing a clean separation of concerns and type-safe database operations.
 *
 * Handles type mapping between HITL module's FeedbackEntry interface (complex nested)
 * and the flat FeedbackEntity used in database.
 */
@Injectable()
export class Neo4jFeedbackStorageAdapter extends IFeedbackStorageService {
  private readonly logger = new Logger(Neo4jFeedbackStorageAdapter.name);

  constructor(private readonly feedbackRepo: FeedbackRepository) {
    super();
    this.logger.debug(
      'Neo4jFeedbackStorageAdapter initialized with FeedbackRepository'
    );
  }

  /**
   * Store feedback entry - delegates to repository
   */
  async storeFeedback(feedback: FeedbackEntry): Promise<void> {
    return this.feedbackRepo.storeFeedback(feedback);
  }

  /**
   * Get feedback by ID - delegates to repository
   */
  async getFeedback(feedbackId: string): Promise<FeedbackEntry | null> {
    return this.feedbackRepo.getFeedback(feedbackId);
  }

  /**
   * Get feedback by execution ID - delegates to repository
   */
  async getFeedbackByExecution(executionId: string): Promise<FeedbackEntry[]> {
    return this.feedbackRepo.getFeedbackByExecution(executionId);
  }

  /**
   * Update feedback status - delegates to repository
   */
  async updateFeedbackStatus(
    feedbackId: string,
    processed: boolean,
    results?: ProcessingResult
  ): Promise<void> {
    if (!feedbackId?.trim()) {
      throw new Error('Feedback ID is required');
    }
    return this.feedbackRepo.updateFeedbackStatus(
      feedbackId,
      processed,
      results
    );
  }

  /**
   * Delete feedback - delegates to repository
   */
  async deleteFeedback(feedbackId: string): Promise<boolean> {
    if (!feedbackId?.trim()) {
      throw new Error('Feedback ID is required');
    }
    return this.feedbackRepo.deleteFeedback(feedbackId);
  }

  /**
   * Get feedback by type - delegates to repository
   */
  async getFeedbackByType(type: FeedbackType): Promise<FeedbackEntry[]> {
    // Map FeedbackType enum to entity type
    let entityType: 'positive' | 'negative' | 'neutral' | 'suggestion';
    switch (type) {
      case FeedbackType.APPROVAL:
      case FeedbackType.RATING:
        entityType = 'positive';
        break;
      case FeedbackType.REJECTION:
        entityType = 'negative';
        break;
      case FeedbackType.MODIFICATION:
        entityType = 'suggestion';
        break;
      default:
        entityType = 'neutral';
    }
    return this.feedbackRepo.getFeedbackByType(entityType);
  }

  /**
   * Get feedback by provider - delegates to repository
   */
  async getFeedbackByProvider(providerId: string): Promise<FeedbackEntry[]> {
    return this.feedbackRepo.getFeedbackByProvider(providerId);
  }

  /**
   * Get unprocessed feedback - delegates to repository
   */
  async getUnprocessedFeedback(): Promise<FeedbackEntry[]> {
    return this.feedbackRepo.getUnprocessedFeedback();
  }

  /**
   * Get feedback statistics - delegates to repository
   */
  async getFeedbackStats(): Promise<FeedbackAnalytics> {
    return this.feedbackRepo.getFeedbackStats();
  }

  /**
   * Get all active feedback - delegates to repository
   */
  async getAllActiveFeedback(): Promise<FeedbackEntry[]> {
    return this.feedbackRepo.getAllActiveFeedback();
  }

  /**
   * Get all execution feedback - delegates to repository
   */
  async getAllExecutionFeedback(): Promise<Record<string, FeedbackEntry[]>> {
    return this.feedbackRepo.getAllExecutionFeedback();
  }

  /**
   * Cleanup old feedback - delegates to repository
   */
  async cleanup(maxAge = 86400000): Promise<number> {
    return this.feedbackRepo.cleanup(maxAge);
  }

  /**
   * Health check - delegates to repository
   */
  async healthCheck(): Promise<boolean> {
    return this.feedbackRepo.healthCheck();
  }
}
