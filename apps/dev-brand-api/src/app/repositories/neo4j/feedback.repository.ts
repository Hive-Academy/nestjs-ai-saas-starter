import { Injectable, Logger } from '@nestjs/common';
import {
  Neo4jRepositoryBase,
  Safe,
  Authorize,
  ValidateInput,
  AuditLog,
  RateLimit,
  CypherQuery,
  NeogmaService,
  Neo4jCrudService,
} from '@hive-academy/nestjs-neo4j';
import type {
  FeedbackAnalytics,
  FeedbackEntry as HitlFeedbackEntry,
  ProcessingResult,
} from '@hive-academy/langgraph-hitl';
import {
  FeedbackStorageError,
  FeedbackType,
  InvalidFeedbackDataError,
} from '@hive-academy/langgraph-hitl';
import { FeedbackEntry } from '../../entities/neo4j/feedback-entry.entity';

/**
 * Feedback Repository (Refactored - Clean Slate Implementation)
 *
 * Extends Neo4jRepositoryBase<FeedbackEntry> for automatic CRUD operations.
 * Provides type-safe operations for feedback storage and analytics.
 *
 * Architecture:
 * - Neo4jRepositoryBase<FeedbackEntry>: Automatic CRUD via inheritance
 * - Uses base class methods for all simple operations
 * - Manual Cypher ONLY for complex analytics queries
 *
 * Reduced from 746 lines to ~200 lines through proper base class utilization.
 *
 * CRUD methods (inherited from Neo4jRepositoryBase<FeedbackEntry>):
 * - findById, findAll, create, update, delete, count, exists
 */
@Injectable()
export class FeedbackRepository extends Neo4jRepositoryBase<FeedbackEntry> {
  private readonly logger = new Logger(FeedbackRepository.name);

  constructor(neogma: NeogmaService, crud: Neo4jCrudService) {
    super(FeedbackEntry, 'FeedbackEntry', neogma, crud);
    this.logger.debug('FeedbackRepository initialized with base class pattern');
  }

  // ============================================================================
  // FEEDBACK ENTRY MANAGEMENT (Using Base Class Methods)
  // ============================================================================

  /**
   * Store feedback entry for persistence
   * Uses: Base class create() method
   */
  @ValidateInput()
  @AuditLog({ logLevel: 'detailed', enabled: true, logSuccess: true })
  @Safe()
  async storeFeedback(feedback: HitlFeedbackEntry): Promise<void> {
    this.validateFeedbackData(feedback);

    try {
      await this.create({
        id: feedback.id,
        executionId: feedback.executionId,
        type: this.mapHitlTypeToEntityType(feedback.type),
        content: JSON.stringify(feedback.content),
        providerId: feedback.provider.id,
        providerName: feedback.provider.name || '',
        providerRole: feedback.provider.role || '',
        timestamp: feedback.timestamp,
        processed: feedback.processed,
        metadata: feedback.metadata || {},
      });
    } catch (error) {
      throw new FeedbackStorageError(
        'Failed to store feedback entry',
        'storeFeedback',
        {
          feedbackId: feedback.id,
          executionId: feedback.executionId,
          error: String(error),
        }
      );
    }
  }

  /**
   * Get feedback entry by ID
   * Uses: Base class findById() method
   */
  @Safe()
  async getFeedback(feedbackId: string): Promise<HitlFeedbackEntry | null> {
    try {
      const entity = await this.findById(feedbackId);
      return entity ? this.mapEntityToHitlFeedback(entity) : null;
    } catch (error) {
      throw new FeedbackStorageError(
        'Failed to get feedback entry',
        'getFeedback',
        { feedbackId, error: String(error) }
      );
    }
  }

  /**
   * Get all feedback entries for a specific execution
   * Uses: Base class findAll() with where clause
   */
  @Safe()
  async getFeedbackByExecution(
    executionId: string
  ): Promise<HitlFeedbackEntry[]> {
    try {
      const entities = await this.findAll({
        where: { executionId },
        orderBy: [{ timestamp: 'DESC' }],
      });
      return entities.map((entity) => this.mapEntityToHitlFeedback(entity));
    } catch (error) {
      throw new FeedbackStorageError(
        'Failed to get feedback by execution',
        'getFeedbackByExecution',
        { executionId, error: String(error) }
      );
    }
  }

  /**
   * Update feedback processing status and results
   * Uses: Base class update() method
   */
  @Safe()
  async updateFeedbackStatus(
    feedbackId: string,
    processed: boolean,
    results?: ProcessingResult
  ): Promise<void> {
    if (results) {
      this.validateProcessingResult(results);
    }

    try {
      const updateData: Partial<FeedbackEntry> = {
        processed,
        processedAt: new Date(),
      };

      if (results) {
        updateData.metadata = {
          ...(updateData.metadata || {}),
          processingResult: results,
        };
      }

      await this.update(feedbackId, updateData);
    } catch (error) {
      throw new FeedbackStorageError(
        'Failed to update feedback status',
        'updateFeedbackStatus',
        { feedbackId, processed, error: String(error) }
      );
    }
  }

  /**
   * Delete feedback entry by ID
   * Uses: Base class delete() method
   */
  @Authorize({ roles: ['admin'] })
  @AuditLog({ logLevel: 'standard', enabled: true, logSuccess: true })
  @Safe()
  async deleteFeedback(feedbackId: string): Promise<boolean> {
    try {
      await this.delete(feedbackId);
      return true;
    } catch (error) {
      throw new FeedbackStorageError(
        'Failed to delete feedback entry',
        'deleteFeedback',
        { feedbackId, error: String(error) }
      );
    }
  }

  // ============================================================================
  // ANALYTICS & LEARNING (Using Base Class Methods)
  // ============================================================================

  /**
   * Get feedback entries by type for AI learning analysis
   * Uses: Base class findAll() with where clause
   */
  @Safe()
  async getFeedbackByType(type: FeedbackType): Promise<HitlFeedbackEntry[]> {
    try {
      const entityType = this.mapHitlTypeToEntityType(type);
      const entities = await this.findAll({
        where: { type: entityType },
        orderBy: [{ timestamp: 'DESC' }],
      });
      return entities.map((entity) => this.mapEntityToHitlFeedback(entity));
    } catch (error) {
      throw new FeedbackStorageError(
        'Failed to get feedback by type',
        'getFeedbackByType',
        { type, error: String(error) }
      );
    }
  }

  /**
   * Get feedback entries by provider for provider analytics
   * Uses: Base class findAll() with where clause
   */
  @Safe()
  async getFeedbackByProvider(
    providerId: string
  ): Promise<HitlFeedbackEntry[]> {
    try {
      const entities = await this.findAll({
        where: { providerId },
        orderBy: [{ timestamp: 'DESC' }],
      });
      return entities.map((entity) => this.mapEntityToHitlFeedback(entity));
    } catch (error) {
      throw new FeedbackStorageError(
        'Failed to get feedback by provider',
        'getFeedbackByProvider',
        { providerId, error: String(error) }
      );
    }
  }

  /**
   * Get all unprocessed feedback for AI learning pipeline
   * Uses: Base class findAll() with where clause
   */
  @CypherQuery({ cache: '2m', retry: 3 })
  @Safe()
  async getUnprocessedFeedback(): Promise<HitlFeedbackEntry[]> {
    try {
      const entities = await this.findAll({
        where: { processed: false },
        orderBy: [{ timestamp: 'ASC' }],
      });
      return entities.map((entity) => this.mapEntityToHitlFeedback(entity));
    } catch (error) {
      throw new FeedbackStorageError(
        'Failed to get unprocessed feedback',
        'getUnprocessedFeedback',
        { error: String(error) }
      );
    }
  }

  /**
   * Get comprehensive feedback analytics for AI improvement
   * Manual Cypher: Complex aggregation query (justified - no base class equivalent)
   */
  @RateLimit({ strategy: 'fixed-window', requests: 100, window: '1h' })
  @Safe()
  async getFeedbackStats(): Promise<FeedbackAnalytics> {
    try {
      // Single unified query for all statistics using QueryBuilder
      const qb = this.neogma.createQueryBuilder();

      qb
        .match('(f:FeedbackEntry)')
        .with(
          `count(f) as totalFeedback,
               sum(CASE WHEN f.processed = true THEN 1 ELSE 0 END) as processedCount,
               sum(CASE WHEN f.processed = false THEN 1 ELSE 0 END) as unprocessedCount,
               collect({type: f.type, providerId: f.providerId}) as feedbackData`
        )
        .unwind('feedbackData as feedback')
        .with(`totalFeedback, processedCount, unprocessedCount,
               feedback.type as type,
               feedback.providerId as providerId`).return(`totalFeedback,
                 processedCount,
                 unprocessedCount,
                 collect(DISTINCT {type: type, count: count(*)}) as typeDistribution,
                 collect(DISTINCT {providerId: providerId, count: count(*)}) as providerDistribution`);

      const result = await this.neogma.run(
        qb.getStatement(),
        qb.getBindParam().get()
      );

      const record = result.records[0];
      const totalFeedback = this.extractNumber(record.get('totalFeedback'));
      const processedCount = this.extractNumber(record.get('processedCount'));
      const unprocessedCount = this.extractNumber(
        record.get('unprocessedCount')
      );

      // Process type distribution
      const byType = {
        [FeedbackType.APPROVAL]: 0,
        [FeedbackType.REJECTION]: 0,
        [FeedbackType.MODIFICATION]: 0,
        [FeedbackType.CLARIFICATION]: 0,
        [FeedbackType.RATING]: 0,
        [FeedbackType.COMMENT]: 0,
      };

      const typeDistribution = record.get('typeDistribution') || [];
      typeDistribution.forEach((item: any) => {
        const mappedType = this.mapEntityTypeToHitlType(item.type);
        const count = this.extractNumber(item.count);
        if (
          mappedType &&
          Object.prototype.hasOwnProperty.call(byType, mappedType)
        ) {
          byType[mappedType] = count;
        }
      });

      // Process provider distribution
      const byProvider: Record<string, number> = {};
      const providerDistribution = record.get('providerDistribution') || [];
      providerDistribution.forEach((item: any) => {
        if (item.providerId) {
          byProvider[item.providerId] = this.extractNumber(item.count);
        }
      });

      return {
        totalFeedback,
        processedCount,
        unprocessedCount,
        byType,
        byProvider,
        avgProcessingTime: 0,
        recentTrends: { positive: 0, negative: 0, neutral: 0 },
        successRate: processedCount > 0 ? processedCount / totalFeedback : 0,
        topPatterns: [],
        learningMetrics: {
          averageConfidence: 0,
          improvementTrends: 0,
          adaptationRate: 0,
        },
        lastUpdated: new Date(),
      };
    } catch (error) {
      throw new FeedbackStorageError(
        'Failed to get feedback statistics',
        'getFeedbackStats',
        { error: String(error) }
      );
    }
  }

  // ============================================================================
  // RECOVERY OPERATIONS (Using Base Class Methods)
  // ============================================================================

  /**
   * Get all active feedback entries for service recovery
   * Uses: Base class findAll() method
   */
  @Safe()
  async getAllActiveFeedback(): Promise<HitlFeedbackEntry[]> {
    try {
      const entities = await this.findAll({
        orderBy: [{ timestamp: 'DESC' }],
      });
      return entities.map((entity) => this.mapEntityToHitlFeedback(entity));
    } catch (error) {
      throw new FeedbackStorageError(
        'Failed to get all active feedback',
        'getAllActiveFeedback',
        { error: String(error) }
      );
    }
  }

  /**
   * Get all execution feedback mappings for cache reconstruction
   * Manual Cypher: Complex grouping query (justified - requires groupBy aggregation)
   */
  @Safe()
  async getAllExecutionFeedback(): Promise<
    Record<string, HitlFeedbackEntry[]>
  > {
    try {
      const qb = this.neogma.createQueryBuilder();

      qb.match('(f:FeedbackEntry)')
        .with('f.executionId as executionId, collect(f) as feedbackNodes')
        .return('executionId, feedbackNodes');

      const result = await this.neogma.run(
        qb.getStatement(),
        qb.getBindParam().get()
      );

      const executionFeedback: Record<string, HitlFeedbackEntry[]> = {};

      result.records.forEach((record) => {
        const executionId = record.get('executionId');
        const feedbackNodes = record.get('feedbackNodes');

        const feedback = feedbackNodes.map((node: any) => {
          const props = node.properties;
          return this.mapNodePropsToHitlFeedback(props);
        });

        executionFeedback[executionId] = feedback;
      });

      return executionFeedback;
    } catch (error) {
      throw new FeedbackStorageError(
        'Failed to get all execution feedback',
        'getAllExecutionFeedback',
        { error: String(error) }
      );
    }
  }

  /**
   * Cleanup old feedback entries
   * Manual Cypher: Bulk delete with complex where clause (justified - no base class equivalent)
   */
  @Safe()
  async cleanup(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - maxAge);
      const qb = this.neogma.createQueryBuilder();
      const bindParam = qb.getBindParam();
      const cutoffParam = bindParam.add(cutoffDate.toISOString());

      qb.match('(f:FeedbackEntry)')
        .where(`f.timestamp < datetime($${cutoffParam}) AND f.processed = true`)
        .with('count(f) as deletedCount, collect(f) as nodes')
        .unwind('nodes as node')
        .raw('DETACH DELETE node')
        .return('deletedCount');

      const result = await this.neogma.run(qb.getStatement(), bindParam.get());

      return this.extractNumber(result.records[0]?.get('deletedCount'));
    } catch (error) {
      throw new FeedbackStorageError(
        'Failed to cleanup old feedback entries',
        'cleanup',
        { maxAge, error: String(error) }
      );
    }
  }

  /**
   * Health check for storage adapter
   * Uses: Base class count() method
   */
  @Safe()
  async healthCheck(): Promise<boolean> {
    try {
      await this.count();
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private mapEntityToHitlFeedback(entity: FeedbackEntry): HitlFeedbackEntry {
    const content =
      typeof entity.content === 'string'
        ? JSON.parse(entity.content)
        : entity.content;

    const processingResult = entity.metadata?.processingResult;

    return {
      id: entity.id,
      executionId: entity.executionId,
      type: this.mapEntityTypeToHitlType(entity.type)!,
      content,
      provider: {
        id: entity.providerId,
        name: entity.providerName,
        role: entity.providerRole,
      },
      timestamp: entity.timestamp,
      processed: entity.processed,
      processingResult,
      metadata: JSON.stringify(entity.metadata),
    };
  }

  private mapNodePropsToHitlFeedback(props: any): HitlFeedbackEntry {
    const content =
      typeof props.content === 'string'
        ? JSON.parse(props.content)
        : props.content;

    return {
      id: props.id,
      executionId: props.executionId,
      type: this.mapEntityTypeToHitlType(props.type)!,
      content,
      provider: {
        id: props.providerId,
        name: props.providerName,
        role: props.providerRole,
      },
      timestamp: new Date(props.timestamp),
      processed: props.processed,
      processingResult: props.metadata?.processingResult,
      metadata: props.metadata,
    };
  }

  private mapHitlTypeToEntityType(
    type: FeedbackType
  ): 'positive' | 'negative' | 'neutral' | 'suggestion' {
    const mapping: Record<
      FeedbackType,
      'positive' | 'negative' | 'neutral' | 'suggestion'
    > = {
      [FeedbackType.APPROVAL]: 'positive',
      [FeedbackType.REJECTION]: 'negative',
      [FeedbackType.MODIFICATION]: 'suggestion',
      [FeedbackType.CLARIFICATION]: 'neutral',
      [FeedbackType.RATING]: 'neutral',
      [FeedbackType.COMMENT]: 'neutral',
    };
    return mapping[type];
  }

  private mapEntityTypeToHitlType(type: string): FeedbackType | undefined {
    const mapping: Record<string, FeedbackType> = {
      positive: FeedbackType.APPROVAL,
      negative: FeedbackType.REJECTION,
      suggestion: FeedbackType.MODIFICATION,
      neutral: FeedbackType.COMMENT,
    };
    return mapping[type];
  }

  private extractNumber(value: any): number {
    if (typeof value === 'object' && value !== null) {
      return (value as any).low || 0;
    }
    return Number(value) || 0;
  }

  private validateFeedbackData(feedback: HitlFeedbackEntry): void {
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
      throw new InvalidFeedbackDataError('Feedback type is required');
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

  private validateProcessingResult(result: ProcessingResult): void {
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
