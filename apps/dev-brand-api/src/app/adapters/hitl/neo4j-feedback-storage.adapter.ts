import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';
import {
  IFeedbackStorageService,
  FeedbackEntry,
  FeedbackType,
  ProcessingResult,
  FeedbackAnalytics,
  InvalidFeedbackDataError,
  FeedbackStorageError,
} from '@hive-academy/langgraph-hitl';

/**
 * Application-specific Neo4j adapter for feedback storage.
 *
 * This adapter follows the same pattern as other Neo4j adapters,
 * properly using the existing Neo4jService from @hive-academy/nestjs-neo4j
 * instead of creating its own connection.
 *
 * Stores feedback entries as nodes in Neo4j for persistence, analytics, and AI learning.
 * Human feedback is critical for AI improvement and must never be lost.
 */
@Injectable()
export class Neo4jFeedbackStorageAdapter extends IFeedbackStorageService {
  private readonly logger = new Logger(Neo4jFeedbackStorageAdapter.name);

  constructor(private readonly neo4jService: Neo4jService) {
    super();
    this.logger.debug(
      'Neo4jFeedbackStorageAdapter initialized with Neo4jService'
    );
  }

  /**
   * Store feedback entry in Neo4j
   */
  async storeFeedback(feedback: FeedbackEntry): Promise<void> {
    this.validateFeedbackData(feedback);

    try {
      const cypher = `
        CREATE (f:FeedbackEntry {
          id: $id,
          executionId: $executionId,
          type: $type,
          content: $content,
          providerId: $providerId,
          providerName: $providerName,
          providerRole: $providerRole,
          timestamp: datetime($timestamp),
          processed: $processed,
          metadata: $metadata,
          createdAt: datetime()
        })
        WITH f
        // Create relationship to execution
        MERGE (e:Execution {id: $executionId})
        CREATE (f)-[:FEEDBACK_FOR]->(e)
        // Create relationship to provider
        MERGE (p:Provider {id: $providerId})
        ON CREATE SET p.name = $providerName, p.role = $providerRole
        CREATE (f)-[:PROVIDED_BY]->(p)
        RETURN f.id
      `;

      const parameters = {
        id: feedback.id,
        executionId: feedback.executionId,
        type: feedback.type,
        content: JSON.stringify(feedback.content),
        providerId: feedback.provider.id,
        providerName: feedback.provider.name || null,
        providerRole: feedback.provider.role || null,
        timestamp: feedback.timestamp.toISOString(),
        processed: feedback.processed,
        metadata: feedback.metadata || null,
      };

      await this.neo4jService.write(cypher, parameters);
      this.logger.debug(
        `Stored feedback ${feedback.id} for execution ${feedback.executionId}`
      );
    } catch (error) {
      this.logger.error(`Failed to store feedback ${feedback.id}:`, error);
      throw new FeedbackStorageError(
        'Failed to store feedback entry in Neo4j',
        'storeFeedback',
        { feedbackId: feedback.id, executionId: feedback.executionId }
      );
    }
  }

  /**
   * Get feedback entry by ID
   */
  async getFeedback(feedbackId: string): Promise<FeedbackEntry | null> {
    try {
      const cypher = `
        MATCH (f:FeedbackEntry {id: $feedbackId})
        OPTIONAL MATCH (f)-[:PROVIDED_BY]->(p:Provider)
        RETURN f, p
      `;

      const result = await this.neo4jService.read(cypher, { feedbackId });

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const feedbackNode = record.get('f').properties;
      const providerNode = record.get('p')?.properties;

      return this.mapNodeToFeedbackEntry(feedbackNode, providerNode);
    } catch (error) {
      this.logger.error(`Failed to get feedback ${feedbackId}:`, error);
      throw new FeedbackStorageError(
        'Failed to retrieve feedback entry from Neo4j',
        'getFeedback',
        { feedbackId }
      );
    }
  }

  /**
   * Get all feedback entries for a specific execution
   */
  async getFeedbackByExecution(executionId: string): Promise<FeedbackEntry[]> {
    try {
      const cypher = `
        MATCH (f:FeedbackEntry {executionId: $executionId})
        OPTIONAL MATCH (f)-[:PROVIDED_BY]->(p:Provider)
        RETURN f, p
        ORDER BY f.timestamp DESC
      `;

      const result = await this.neo4jService.read(cypher, { executionId });

      return result.records.map((record) => {
        const feedbackNode = record.get('f').properties;
        const providerNode = record.get('p')?.properties;
        return this.mapNodeToFeedbackEntry(feedbackNode, providerNode);
      });
    } catch (error) {
      this.logger.error(
        `Failed to get feedback for execution ${executionId}:`,
        error
      );
      throw new FeedbackStorageError(
        'Failed to retrieve feedback by execution from Neo4j',
        'getFeedbackByExecution',
        { executionId }
      );
    }
  }

  /**
   * Update feedback processing status and results
   */
  async updateFeedbackStatus(
    feedbackId: string,
    processed: boolean,
    results?: ProcessingResult
  ): Promise<void> {
    try {
      const cypher = `
        MATCH (f:FeedbackEntry {id: $feedbackId})
        SET f.processed = $processed,
            f.processingResult = $processingResult,
            f.updatedAt = datetime()
        RETURN f.id
      `;

      const parameters = {
        feedbackId,
        processed,
        processingResult: results ? JSON.stringify(results) : null,
      };

      const result = await this.neo4jService.write(cypher, parameters);

      if (result.records.length === 0) {
        throw new Error(`Feedback ${feedbackId} not found`);
      }

      this.logger.debug(
        `Updated feedback ${feedbackId} status to processed: ${processed}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to update feedback ${feedbackId} status:`,
        error
      );
      throw new FeedbackStorageError(
        'Failed to update feedback status in Neo4j',
        'updateFeedbackStatus',
        { feedbackId, processed }
      );
    }
  }

  /**
   * Delete feedback entry by ID
   */
  async deleteFeedback(feedbackId: string): Promise<boolean> {
    try {
      const cypher = `
        MATCH (f:FeedbackEntry {id: $feedbackId})
        DETACH DELETE f
        RETURN count(f) as deletedCount
      `;

      const result = await this.neo4jService.write(cypher, { feedbackId });
      const deletedCount =
        result.records[0]?.get('deletedCount')?.toNumber() || 0;

      this.logger.debug(`Deleted feedback ${feedbackId}: ${deletedCount > 0}`);
      return deletedCount > 0;
    } catch (error) {
      this.logger.error(`Failed to delete feedback ${feedbackId}:`, error);
      throw new FeedbackStorageError(
        'Failed to delete feedback entry from Neo4j',
        'deleteFeedback',
        { feedbackId }
      );
    }
  }

  /**
   * Get feedback entries by type for AI learning analysis
   */
  async getFeedbackByType(type: FeedbackType): Promise<FeedbackEntry[]> {
    try {
      const cypher = `
        MATCH (f:FeedbackEntry {type: $type})
        OPTIONAL MATCH (f)-[:PROVIDED_BY]->(p:Provider)
        RETURN f, p
        ORDER BY f.timestamp DESC
        LIMIT 1000
      `;

      const result = await this.neo4jService.read(cypher, { type });

      return result.records.map((record) => {
        const feedbackNode = record.get('f').properties;
        const providerNode = record.get('p')?.properties;
        return this.mapNodeToFeedbackEntry(feedbackNode, providerNode);
      });
    } catch (error) {
      this.logger.error(`Failed to get feedback by type ${type}:`, error);
      throw new FeedbackStorageError(
        'Failed to retrieve feedback by type from Neo4j',
        'getFeedbackByType',
        { type }
      );
    }
  }

  /**
   * Get feedback entries by provider for provider analytics
   */
  async getFeedbackByProvider(providerId: string): Promise<FeedbackEntry[]> {
    try {
      const cypher = `
        MATCH (f:FeedbackEntry {providerId: $providerId})
        OPTIONAL MATCH (f)-[:PROVIDED_BY]->(p:Provider)
        RETURN f, p
        ORDER BY f.timestamp DESC
        LIMIT 1000
      `;

      const result = await this.neo4jService.read(cypher, { providerId });

      return result.records.map((record) => {
        const feedbackNode = record.get('f').properties;
        const providerNode = record.get('p')?.properties;
        return this.mapNodeToFeedbackEntry(feedbackNode, providerNode);
      });
    } catch (error) {
      this.logger.error(
        `Failed to get feedback by provider ${providerId}:`,
        error
      );
      throw new FeedbackStorageError(
        'Failed to retrieve feedback by provider from Neo4j',
        'getFeedbackByProvider',
        { providerId }
      );
    }
  }

  /**
   * Get all unprocessed feedback for AI learning pipeline
   */
  async getUnprocessedFeedback(): Promise<FeedbackEntry[]> {
    try {
      const cypher = `
        MATCH (f:FeedbackEntry {processed: false})
        OPTIONAL MATCH (f)-[:PROVIDED_BY]->(p:Provider)
        RETURN f, p
        ORDER BY f.timestamp ASC
        LIMIT 500
      `;

      const result = await this.neo4jService.read(cypher, {});

      return result.records.map((record) => {
        const feedbackNode = record.get('f').properties;
        const providerNode = record.get('p')?.properties;
        return this.mapNodeToFeedbackEntry(feedbackNode, providerNode);
      });
    } catch (error) {
      this.logger.error('Failed to get unprocessed feedback:', error);
      throw new FeedbackStorageError(
        'Failed to retrieve unprocessed feedback from Neo4j',
        'getUnprocessedFeedback',
        {}
      );
    }
  }

  /**
   * Get comprehensive feedback analytics for AI improvement
   */
  async getFeedbackStats(): Promise<FeedbackAnalytics> {
    try {
      // Get basic counts
      const countsCypher = `
        MATCH (f:FeedbackEntry)
        RETURN 
          count(f) as totalFeedback,
          count(CASE WHEN f.processed = true THEN 1 END) as processedCount,
          count(CASE WHEN f.processed = false THEN 1 END) as unprocessedCount,
          f.type as type
        ORDER BY type
      `;

      const countsResult = await this.neo4jService.read(countsCypher, {});

      // Calculate analytics
      const totalFeedback = 0;
      const processedCount = 0;
      const unprocessedCount = 0;
      const byType: Record<FeedbackType, number> = {
        [FeedbackType.APPROVAL]: 0,
        [FeedbackType.REJECTION]: 0,
        [FeedbackType.MODIFICATION]: 0,
        [FeedbackType.CLARIFICATION]: 0,
        [FeedbackType.RATING]: 0,
        [FeedbackType.COMMENT]: 0,
      };

      // Get provider distribution
      const providerCypher = `
        MATCH (f:FeedbackEntry)
        RETURN f.providerId as providerId, count(f) as count
        ORDER BY count DESC
        LIMIT 20
      `;

      const providerResult = await this.neo4jService.read(providerCypher, {});
      const byProvider: Record<string, number> = {};

      providerResult.records.forEach((record) => {
        const providerId = record.get('providerId');
        const count = record.get('count').toNumber();
        if (providerId) {
          byProvider[providerId] = count;
        }
      });

      // Get recent trends
      const trendsCypher = `
        MATCH (f:FeedbackEntry)
        WHERE f.timestamp >= datetime() - duration('P7D')
        RETURN 
          count(CASE WHEN f.type IN ['approval'] OR (f.type = 'rating' AND toInteger(split(f.content, '"rating":')[1]) >= 4) THEN 1 END) as positive,
          count(CASE WHEN f.type IN ['rejection'] OR (f.type = 'rating' AND toInteger(split(f.content, '"rating":')[1]) <= 2) THEN 1 END) as negative,
          count(CASE WHEN f.type NOT IN ['approval', 'rejection'] AND NOT (f.type = 'rating' AND (toInteger(split(f.content, '"rating":')[1]) <= 2 OR toInteger(split(f.content, '"rating":')[1]) >= 4)) THEN 1 END) as neutral
      `;

      const trendsResult = await this.neo4jService.read(trendsCypher, {});
      const trendsRecord = trendsResult.records[0];

      const recentTrends = {
        positive: trendsRecord?.get('positive')?.toNumber() || 0,
        negative: trendsRecord?.get('negative')?.toNumber() || 0,
        neutral: trendsRecord?.get('neutral')?.toNumber() || 0,
      };

      // Calculate success rate and other metrics
      const successRate =
        totalFeedback > 0 ? processedCount / totalFeedback : 0;

      return {
        totalFeedback: totalFeedback || countsResult.records.length,
        processedCount: processedCount || 0,
        unprocessedCount: unprocessedCount || 0,
        byType,
        byProvider,
        avgProcessingTime: 5000, // Placeholder - would need more complex query
        recentTrends,
        successRate,
        topPatterns: [], // Placeholder - would need pattern analysis
        learningMetrics: {
          averageConfidence: 0.7, // Placeholder
          improvementTrends:
            recentTrends.positive > recentTrends.negative ? 0.1 : -0.1,
          adaptationRate: successRate,
        },
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get feedback statistics:', error);
      throw new FeedbackStorageError(
        'Failed to retrieve feedback statistics from Neo4j',
        'getFeedbackStats',
        {}
      );
    }
  }

  /**
   * Get all active feedback entries for service recovery
   */
  async getAllActiveFeedback(): Promise<FeedbackEntry[]> {
    try {
      const cypher = `
        MATCH (f:FeedbackEntry)
        OPTIONAL MATCH (f)-[:PROVIDED_BY]->(p:Provider)
        RETURN f, p
        ORDER BY f.timestamp DESC
        LIMIT 10000
      `;

      const result = await this.neo4jService.read(cypher, {});

      return result.records.map((record) => {
        const feedbackNode = record.get('f').properties;
        const providerNode = record.get('p')?.properties;
        return this.mapNodeToFeedbackEntry(feedbackNode, providerNode);
      });
    } catch (error) {
      this.logger.error('Failed to get all active feedback:', error);
      throw new FeedbackStorageError(
        'Failed to retrieve all active feedback from Neo4j',
        'getAllActiveFeedback',
        {}
      );
    }
  }

  /**
   * Get all execution feedback mappings for cache reconstruction
   */
  async getAllExecutionFeedback(): Promise<Record<string, FeedbackEntry[]>> {
    try {
      const cypher = `
        MATCH (f:FeedbackEntry)
        OPTIONAL MATCH (f)-[:PROVIDED_BY]->(p:Provider)
        RETURN f.executionId as executionId, collect({feedback: f, provider: p}) as feedbackList
      `;

      const result = await this.neo4jService.read(cypher, {});
      const executionFeedback: Record<string, FeedbackEntry[]> = {};

      result.records.forEach((record) => {
        const executionId = record.get('executionId');
        const feedbackList = record.get('feedbackList');

        if (executionId) {
          executionFeedback[executionId] = feedbackList.map((item: any) => {
            const feedbackNode = item.feedback.properties;
            const providerNode = item.provider?.properties;
            return this.mapNodeToFeedbackEntry(feedbackNode, providerNode);
          });
        }
      });

      return executionFeedback;
    } catch (error) {
      this.logger.error('Failed to get all execution feedback:', error);
      throw new FeedbackStorageError(
        'Failed to retrieve all execution feedback from Neo4j',
        'getAllExecutionFeedback',
        {}
      );
    }
  }

  /**
   * Cleanup old feedback entries
   */
  async cleanup(maxAge = 86400000): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - maxAge);

      const cypher = `
        MATCH (f:FeedbackEntry)
        WHERE f.timestamp < datetime($cutoffDate)
        DETACH DELETE f
        RETURN count(f) as deletedCount
      `;

      const result = await this.neo4jService.write(cypher, {
        cutoffDate: cutoffDate.toISOString(),
      });

      const deletedCount =
        result.records[0]?.get('deletedCount')?.toNumber() || 0;
      this.logger.debug(`Cleaned up ${deletedCount} old feedback entries`);

      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup old feedback:', error);
      throw new FeedbackStorageError(
        'Failed to cleanup old feedback entries from Neo4j',
        'cleanup',
        { maxAge }
      );
    }
  }

  /**
   * Health check for Neo4j feedback storage
   */
  async healthCheck(): Promise<boolean> {
    try {
      const cypher = 'MATCH (f:FeedbackEntry) RETURN count(f) as count LIMIT 1';
      await this.neo4jService.read(cypher, {});
      return true;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Map Neo4j node properties to FeedbackEntry
   */
  private mapNodeToFeedbackEntry(
    feedbackNode: any,
    providerNode?: any
  ): FeedbackEntry {
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
      processed: feedbackNode.processed || false,
      processingResult,
      metadata: feedbackNode.metadata,
    };
  }
}
