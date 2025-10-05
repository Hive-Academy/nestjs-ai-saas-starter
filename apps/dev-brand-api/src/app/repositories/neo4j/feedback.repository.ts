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
import {
  AuditLog,
  Authorize,
  CypherQuery,
  GraphMetricsService,
  GraphPatternService,
  Neo4jCrudService,
  Neo4jRepositoryBase,
  NeogmaService,
  RateLimit,
  Safe,
  ValidateInput,
} from '@hive-academy/nestjs-neo4j';
import { Injectable } from '@nestjs/common';
import { FeedbackEntry as FeedbackEntityType } from '../../entities/neo4j/feedback-entry.entity';

/**
 * Feedback Repository
 *
 * Replaces: neo4j-feedback-storage.adapter.ts (530 lines)
 *
 * Extends Neo4jRepository<FeedbackEntityType> for automatic CRUD operations.
 * Provides type-safe operations for feedback storage and analytics including
 * AI learning insights, provider analytics, and feedback processing.
 *
 * CRUD methods (inherited from Neo4jRepository<FeedbackEntityType>):
 * - findById, findAll, create, update, delete, count, exists
 *
 * Enhanced with specialized graph services for optimized analytics:
 * - GraphMetricsService: Graph-wide analytics and statistics
 * - GraphPatternService: Complex pattern matching and aggregation
 */
@Injectable()
export class FeedbackRepository extends Neo4jRepositoryBase<FeedbackEntityType> {
  constructor(
    neogma: NeogmaService,
    crud: Neo4jCrudService,
    private readonly graphMetrics: GraphMetricsService,
    private readonly graphPattern: GraphPatternService
  ) {
    super(FeedbackEntityType, 'FeedbackEntry', neogma, crud);
  }

  // ============================================================================
  // FEEDBACK ENTRY MANAGEMENT
  // ============================================================================

  /**
   * Store feedback entry for persistence
   * Migrated from: storeFeedback in neo4j-feedback-storage.adapter.ts
   */
  @ValidateInput()
  @AuditLog({ logLevel: 'detailed', enabled: true, logSuccess: true })
  @Safe()
  async storeFeedback(feedback: HitlFeedbackEntry): Promise<void> {
    this.validateFeedbackData(feedback);

    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const idParam = bindParam.add(feedback.id);
      const executionIdParam = bindParam.add(feedback.executionId);
      const typeParam = bindParam.add(feedback.type);
      const contentParam = bindParam.add(JSON.stringify(feedback.content));
      const providerIdParam = bindParam.add(feedback.provider.id);
      const providerNameParam = bindParam.add(feedback.provider.name || null);
      const providerRoleParam = bindParam.add(feedback.provider.role || null);
      const timestampParam = bindParam.add(feedback.timestamp.toISOString());
      const processedParam = bindParam.add(feedback.processed);
      const metadataParam = bindParam.add(feedback.metadata || null);

      queryBuilder
        .create(
          `(f:FeedbackEntry {
          id: $${idParam},
          executionId: $${executionIdParam},
          type: $${typeParam},
          content: $${contentParam},
          providerId: $${providerIdParam},
          providerName: $${providerNameParam},
          providerRole: $${providerRoleParam},
          timestamp: datetime($${timestampParam}),
          processed: $${processedParam},
          metadata: $${metadataParam},
          createdAt: datetime()
        })`
        )
        .with('f')
        .merge(`(e:Execution {id: $${executionIdParam}})`)
        .create('(f)-[:FEEDBACK_FOR]->(e)')
        .merge(`(p:Provider {id: $${providerIdParam}})`)
        .set(
          `p.name = COALESCE(p.name, $${providerNameParam}), p.role = COALESCE(p.role, $${providerRoleParam})`
        )
        .create('(f)-[:PROVIDED_BY]->(p)')
        .return('f.id as id');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      await this.neogma.run(cypher, params);
    } catch (error) {
      throw new FeedbackStorageError(
        'Failed to store feedback entry in Neo4j',
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
   * Migrated from: getFeedback in neo4j-feedback-storage.adapter.ts
   */
  @Safe()
  async getFeedback(feedbackId: string): Promise<HitlFeedbackEntry | null> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const feedbackIdParam = bindParam.add(feedbackId);

      queryBuilder
        .match('(f:FeedbackEntry)')
        .where(`f.id = $${feedbackIdParam}`)
        .match('(p:Provider)')
        .where('(f)-[:PROVIDED_BY]->(p) OR NOT EXISTS((f)-[:PROVIDED_BY]->())')
        .return(`f, p`);

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const feedbackNode = record.get('f').properties;
      const providerNode = record.get('p')?.properties;

      return this.mapNodeToFeedback(feedbackNode, providerNode);
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
   * Migrated from: getFeedbackByExecution in neo4j-feedback-storage.adapter.ts
   */
  @Safe()
  async getFeedbackByExecution(
    executionId: string
  ): Promise<HitlFeedbackEntry[]> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const executionIdParam = bindParam.add(executionId);

      queryBuilder
        .match('(f:FeedbackEntry)')
        .where(`f.executionId = $${executionIdParam}`)
        .match('(p:Provider)')
        .where('(f)-[:PROVIDED_BY]->(p) OR NOT EXISTS((f)-[:PROVIDED_BY]->())')
        .return('f, p')
        .orderBy('f.timestamp DESC');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      return result.records.map((record) => {
        const feedbackNode = record.get('f').properties;
        const providerNode = record.get('p')?.properties;
        return this.mapNodeToFeedback(feedbackNode, providerNode);
      });
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
   * Migrated from: updateFeedbackStatus in neo4j-feedback-storage.adapter.ts
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
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const feedbackIdParam = bindParam.add(feedbackId);
      const processedParam = bindParam.add(processed);

      queryBuilder
        .match('(f:FeedbackEntry)')
        .where(`f.id = $${feedbackIdParam}`)
        .set(`f.processed = $${processedParam}`)
        .set('f.updatedAt = datetime()');

      if (results) {
        const processingResultParam = bindParam.add(JSON.stringify(results));
        queryBuilder.set(`f.processingResult = $${processingResultParam}`);
      }

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      await this.neogma.run(cypher, params);
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
   * Migrated from: deleteFeedback in neo4j-feedback-storage.adapter.ts
   */
  @Authorize({ roles: ['admin'] })
  @AuditLog({ logLevel: 'standard', enabled: true, logSuccess: true })
  @Safe()
  async deleteFeedback(feedbackId: string): Promise<boolean> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const feedbackIdParam = bindParam.add(feedbackId);

      queryBuilder
        .match('(f:FeedbackEntry)')
        .where(`f.id = $${feedbackIdParam}`)
        .delete('f')
        .return('count(f) as deletedCount');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);
      const deletedCount = Number(result.records[0]?.get('deletedCount')) || 0;

      return deletedCount > 0;
    } catch (error) {
      throw new FeedbackStorageError(
        'Failed to delete feedback entry',
        'deleteFeedback',
        { feedbackId, error: String(error) }
      );
    }
  }

  // ============================================================================
  // ANALYTICS & LEARNING
  // ============================================================================

  /**
   * Get feedback entries by type for AI learning analysis
   * Migrated from: getFeedbackByType in neo4j-feedback-storage.adapter.ts
   */
  @Safe()
  async getFeedbackByType(type: FeedbackType): Promise<HitlFeedbackEntry[]> {
    try {
      const qb = this.neogma.createQueryBuilder();

      const bindParam = qb.getBindParam();
      const typeParam = bindParam.add(type);

      qb.match('(f:FeedbackEntry)')
        .where(`f.type = $${typeParam}`)
        .match('(p:Provider)')
        .where('(f)-[:PROVIDED_BY]->(p) OR NOT EXISTS((f)-[:PROVIDED_BY]->())')
        .return('f, p')
        .orderBy('f.timestamp DESC');

      const cypher = qb.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      return result.records.map((record) => {
        const feedbackNode = record.get('f').properties;
        const providerNode = record.get('p')?.properties;
        return this.mapNodeToFeedback(feedbackNode, providerNode);
      });
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
   * Migrated from: getFeedbackByProvider in neo4j-feedback-storage.adapter.ts
   */
  @Safe()
  async getFeedbackByProvider(
    providerId: string
  ): Promise<HitlFeedbackEntry[]> {
    try {
      const qb = this.neogma.createQueryBuilder();

      const bindParam = qb.getBindParam();
      const providerIdParam = bindParam.add(providerId);

      qb.match('(f:FeedbackEntry)')
        .where(`f.providerId = $${providerIdParam}`)
        .match('(p:Provider)')
        .where('(f)-[:PROVIDED_BY]->(p) OR NOT EXISTS((f)-[:PROVIDED_BY]->())')
        .return('f, p')
        .orderBy('f.timestamp DESC');

      const cypher = qb.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      return result.records.map((record) => {
        const feedbackNode = record.get('f').properties;
        const providerNode = record.get('p')?.properties;
        return this.mapNodeToFeedback(feedbackNode, providerNode);
      });
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
   * Migrated from: getUnprocessedFeedback in neo4j-feedback-storage.adapter.ts
   */
  @CypherQuery({
    cache: '2m', // 2 minutes (background job)
    retry: 3,
  })
  @Safe()
  async getUnprocessedFeedback(): Promise<HitlFeedbackEntry[]> {
    try {
      const qb = this.neogma.createQueryBuilder();

      const bindParam = qb.getBindParam();
      const processedParam = bindParam.add(false);

      qb.match('(f:FeedbackEntry)')
        .where(`f.processed = $${processedParam}`)
        .match('(p:Provider)')
        .where('(f)-[:PROVIDED_BY]->(p) OR NOT EXISTS((f)-[:PROVIDED_BY]->())')
        .return('f, p')
        .orderBy('f.timestamp ASC');

      const cypher = qb.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      return result.records.map((record) => {
        const feedbackNode = record.get('f').properties;
        const providerNode = record.get('p')?.properties;
        return this.mapNodeToFeedback(feedbackNode, providerNode);
      });
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
   * Migrated from: getFeedbackStats in neo4j-feedback-storage.adapter.ts
   *
   * Optimized: Single unified query instead of 3 parallel queries
   * - Reduced database round-trips: 3 → 1
   * - Uses collect() and aggregation functions for efficient data gathering
   */
  @RateLimit({ strategy: 'fixed-window', requests: 100, window: '1h' })
  @Safe()
  async getFeedbackStats(): Promise<FeedbackAnalytics> {
    try {
      // Single unified query to get all statistics at once
      const result = await this.executeQuery(
        `MATCH (f:FeedbackEntry)
         WITH f,
              count(f) as totalFeedback,
              sum(CASE WHEN f.processed = true THEN 1 ELSE 0 END) as processedCount,
              sum(CASE WHEN f.processed = false THEN 1 ELSE 0 END) as unprocessedCount
         WITH totalFeedback, processedCount, unprocessedCount,
              collect({type: f.type, processed: f.processed, providerId: f.providerId}) as feedbackData
         UNWIND feedbackData as feedback
         WITH totalFeedback, processedCount, unprocessedCount,
              feedback.type as type,
              feedback.providerId as providerId,
              count(*) as count
         RETURN totalFeedback,
                processedCount,
                unprocessedCount,
                collect({type: type, count: count}) as typeDistribution,
                collect({providerId: providerId, count: count}) as providerDistribution`,
        {}
      );

      // Extract aggregated data from single query result
      const record = result.records[0];
      const totalFeedback =
        typeof record.get('totalFeedback') === 'object'
          ? (record.get('totalFeedback') as any).low || 0
          : Number(record.get('totalFeedback')) || 0;
      const processedCount =
        typeof record.get('processedCount') === 'object'
          ? (record.get('processedCount') as any).low || 0
          : Number(record.get('processedCount')) || 0;
      const unprocessedCount =
        typeof record.get('unprocessedCount') === 'object'
          ? (record.get('unprocessedCount') as any).low || 0
          : Number(record.get('unprocessedCount')) || 0;

      // Process type distribution - initialize with all FeedbackType values
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
        const type = item.type as FeedbackType;
        const count =
          typeof item.count === 'object'
            ? (item.count as any).low || 0
            : Number(item.count) || 0;
        if (type && Object.prototype.hasOwnProperty.call(byType, type)) {
          byType[type] = count;
        }
      });

      // Process provider distribution
      const byProvider: Record<string, number> = {};
      const providerDistribution = record.get('providerDistribution') || [];
      providerDistribution.forEach((item: any) => {
        const providerId = item.providerId;
        const count =
          typeof item.count === 'object'
            ? (item.count as any).low || 0
            : Number(item.count) || 0;
        if (providerId) {
          byProvider[providerId] = count;
        }
      });

      return {
        totalFeedback,
        processedCount,
        unprocessedCount,
        byType,
        byProvider,
        avgProcessingTime: 0, // Would need processing time tracking
        recentTrends: {
          positive: 0, // Would need sentiment analysis
          negative: 0,
          neutral: 0,
        },
        successRate: processedCount > 0 ? processedCount / totalFeedback : 0,
        topPatterns: [], // Would need pattern analysis
        learningMetrics: {
          averageConfidence: 0, // Would need confidence tracking
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
  // RECOVERY OPERATIONS
  // ============================================================================

  /**
   * Get all active feedback entries for service recovery
   * Migrated from: getAllActiveFeedback in neo4j-feedback-storage.adapter.ts
   */
  @Safe()
  async getAllActiveFeedback(): Promise<HitlFeedbackEntry[]> {
    try {
      const qb = this.neogma.createQueryBuilder();

      qb.match('(f:FeedbackEntry)')
        .match('(p:Provider)')
        .where('(f)-[:PROVIDED_BY]->(p) OR NOT EXISTS((f)-[:PROVIDED_BY]->())')
        .return('f, p')
        .orderBy('f.timestamp DESC');

      const cypher = qb.getStatement();
      const params = qb.getBindParam().get();
      const result = await this.neogma.run(cypher, params);

      return result.records.map((record) => {
        const feedbackNode = record.get('f').properties;
        const providerNode = record.get('p')?.properties;
        return this.mapNodeToFeedback(feedbackNode, providerNode);
      });
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
   * Migrated from: getAllExecutionFeedback in neo4j-feedback-storage.adapter.ts
   */
  @Safe()
  async getAllExecutionFeedback(): Promise<
    Record<string, HitlFeedbackEntry[]>
  > {
    try {
      const qb = this.neogma.createQueryBuilder();

      qb.match('(f:FeedbackEntry)')
        .match('(p:Provider)')
        .where('(f)-[:PROVIDED_BY]->(p) OR NOT EXISTS((f)-[:PROVIDED_BY]->())')
        .return(
          'f.executionId as executionId, collect({feedback: f, provider: p}) as feedbackData'
        );

      const cypher = qb.getStatement();
      const params = qb.getBindParam().get();
      const result = await this.neogma.run(cypher, params);

      const executionFeedback: Record<string, HitlFeedbackEntry[]> = {};

      result.records.forEach((record) => {
        const executionId = record.get('executionId');
        const feedbackData = record.get('feedbackData');

        const feedback = feedbackData.map((data: any) => {
          const feedbackNode = data.feedback.properties;
          const providerNode = data.provider?.properties;
          return this.mapNodeToFeedback(feedbackNode, providerNode);
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
   * Migrated from: cleanup in neo4j-feedback-storage.adapter.ts
   */
  @Safe()
  async cleanup(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    // 24 hours default
    try {
      const cutoffDate = new Date(Date.now() - maxAge);

      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const cutoffDateParam = bindParam.add(cutoffDate.toISOString());
      const processedParam = bindParam.add(true);

      queryBuilder
        .match('(f:FeedbackEntry)')
        .where(
          `f.timestamp < datetime($${cutoffDateParam}) AND f.processed = $${processedParam}`
        )
        .delete('f')
        .return('count(f) as deletedCount');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);
      const deletedCount = Number(result.records[0]?.get('deletedCount')) || 0;

      return deletedCount;
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
   * Migrated from: healthCheck in neo4j-feedback-storage.adapter.ts
   */
  @Safe()
  async healthCheck(): Promise<boolean> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();

      queryBuilder.return('1 as health');

      const cypher = queryBuilder.getStatement();
      const params = queryBuilder.getBindParam().get();
      const result = await this.neogma.run(cypher, params);
      return result.records.length > 0;
    } catch (error) {
      return false;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private mapNodeToFeedback(
    feedbackNode: any,
    providerNode?: any
  ): HitlFeedbackEntry {
    const content = feedbackNode.content
      ? JSON.parse(feedbackNode.content)
      : {};
    const processingResult = feedbackNode.processingResult
      ? JSON.parse(feedbackNode.processingResult)
      : undefined;

    return {
      id: feedbackNode.id,
      executionId: feedbackNode.executionId,
      type: feedbackNode.type as FeedbackType,
      content,
      provider: {
        id: feedbackNode.providerId,
        name: providerNode?.name || feedbackNode.providerName,
        role: providerNode?.role || feedbackNode.providerRole,
      },
      timestamp: new Date(feedbackNode.timestamp),
      processed: feedbackNode.processed,
      processingResult,
      metadata: feedbackNode.metadata,
    };
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
