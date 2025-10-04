import { Injectable } from '@nestjs/common';
import {
  Neo4jRepository,
  Neo4jCrudService,
  InjectNeogma,
  NeogmaService,
  Safe,
  FindOptions,
} from '@hive-academy/nestjs-neo4j';
import { FeedbackEntry as FeedbackEntityType } from '../../entities/neo4j/feedback-entry.entity';
import {
  InvalidFeedbackDataError,
  FeedbackStorageError,
  FeedbackType,
} from '@hive-academy/langgraph-hitl';
import type {
  FeedbackEntry as HitlFeedbackEntry,
  ProcessingResult,
  FeedbackAnalytics,
} from '@hive-academy/langgraph-hitl';

/**
 * Feedback Repository
 *
 * Replaces: neo4j-feedback-storage.adapter.ts (530 lines)
 *
 * Uses composition pattern with Neo4jCrudService for CRUD operations.
 * Provides type-safe operations for feedback storage and analytics including
 * AI learning insights, provider analytics, and feedback processing.
 *
 * CRUD methods (delegated to Neo4jCrudService):
 * - findById(id: string): Promise<FeedbackEntityType | null>
 * - findAll(options?: FindOptions<FeedbackEntityType>): Promise<FeedbackEntityType[]>
 * - create(data: Partial<FeedbackEntityType>): Promise<FeedbackEntityType>
 * - update(id: string, updates: Partial<FeedbackEntityType>): Promise<FeedbackEntityType | null>
 * - delete(id: string): Promise<boolean>
 * - count(where?: Partial<FeedbackEntityType>): Promise<number>
 * - exists(id: string): Promise<boolean>
 */
@Neo4jRepository(() => FeedbackEntityType)
@Injectable()
export class FeedbackRepository {
  private readonly label = 'FeedbackEntry';

  constructor(
    private readonly crud: Neo4jCrudService,
    @InjectNeogma() private readonly neogma: NeogmaService
  ) {}

  // ============================================================================
  // CRUD METHODS (delegated to Neo4jCrudService)
  // ============================================================================

  findById(id: string): Promise<FeedbackEntityType | null> {
    return this.crud.findById<FeedbackEntityType>(this.label, id);
  }

  findAll(
    options?: FindOptions<FeedbackEntityType>
  ): Promise<FeedbackEntityType[]> {
    return this.crud.findAll<FeedbackEntityType>(this.label, options);
  }

  create(data: Partial<FeedbackEntityType>): Promise<FeedbackEntityType> {
    return this.crud.create<FeedbackEntityType>(
      this.label,
      data as Omit<FeedbackEntityType, 'id' | 'createdAt' | 'updatedAt'>
    );
  }

  update(
    id: string,
    data: Partial<FeedbackEntityType>
  ): Promise<FeedbackEntityType | null> {
    return this.crud.update<FeedbackEntityType>(this.label, id, data);
  }

  delete(id: string): Promise<boolean> {
    return this.crud.delete(this.label, id);
  }

  count(where?: Partial<FeedbackEntityType>): Promise<number> {
    return this.crud.count<FeedbackEntityType>(this.label, where);
  }

  exists(id: string): Promise<boolean> {
    return this.crud.exists(this.label, id);
  }

  // ============================================================================
  // FEEDBACK ENTRY MANAGEMENT
  // ============================================================================

  /**
   * Store feedback entry for persistence
   * Migrated from: storeFeedback in neo4j-feedback-storage.adapter.ts
   */
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
   */
  @Safe()
  async getFeedbackStats(): Promise<FeedbackAnalytics> {
    try {
      // Get basic counts
      const countQb = this.neogma.createQueryBuilder();
      countQb.match('(f:FeedbackEntry)').return(`
          count(f) as totalFeedback,
          count(CASE WHEN f.processed = true THEN 1 END) as processedCount,
          count(CASE WHEN f.processed = false THEN 1 END) as unprocessedCount
        `);

      // Get type distribution
      const typeQb = this.neogma.createQueryBuilder();
      typeQb
        .match('(f:FeedbackEntry)')
        .return('f.type as type, count(*) as count');

      // Get provider distribution
      const providerQb = this.neogma.createQueryBuilder();
      providerQb
        .match('(f:FeedbackEntry)')
        .return('f.providerId as providerId, count(*) as count');

      const [countResult, typeResult, providerResult] = await Promise.all([
        this.neogma.run(countQb.getStatement(), countQb.getBindParam().get()),
        this.neogma.run(typeQb.getStatement(), typeQb.getBindParam().get()),
        this.neogma.run(
          providerQb.getStatement(),
          providerQb.getBindParam().get()
        ),
      ]);

      // Process count data
      const countRecord = countResult.records[0];
      const totalFeedback = Number(countRecord?.get('totalFeedback')) || 0;
      const processedCount = Number(countRecord?.get('processedCount')) || 0;
      const unprocessedCount =
        Number(countRecord?.get('unprocessedCount')) || 0;

      // Process type distribution - initialize with all FeedbackType values
      const byType = {
        [FeedbackType.APPROVAL]: 0,
        [FeedbackType.REJECTION]: 0,
        [FeedbackType.MODIFICATION]: 0,
        [FeedbackType.CLARIFICATION]: 0,
        [FeedbackType.RATING]: 0,
        [FeedbackType.COMMENT]: 0,
      };
      typeResult.records.forEach((record) => {
        const type = record.get('type') as FeedbackType;
        const count = Number(record.get('count')) || 0;
        byType[type] = count;
      });

      // Process provider distribution
      const byProvider: Record<string, number> = {};
      providerResult.records.forEach((record) => {
        const providerId = record.get('providerId');
        const count = Number(record.get('count')) || 0;
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
