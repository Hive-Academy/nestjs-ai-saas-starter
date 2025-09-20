import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';
import type {
  IConfidenceStorageService,
  ConfidenceStorageOptions,
  MLTrainingSet,
  MLPredictionResult,
  ConfidenceOutcome,
  FeatureVector,
  ConfidenceAnalytics,
  PatternInsights,
} from '@hive-academy/langgraph-modules/hitl';
import type {
  ApprovalPattern,
  ConfidenceFactor,
} from '@hive-academy/langgraph-modules/hitl';

/**
 * Neo4j-based implementation of confidence storage service
 *
 * This adapter provides production-ready persistence for confidence evaluation data,
 * leveraging Neo4j's graph capabilities for pattern analysis and relationship modeling.
 */
@Injectable()
export class Neo4jConfidenceStorageAdapter
  implements IConfidenceStorageService
{
  private readonly logger = new Logger(Neo4jConfidenceStorageAdapter.name);

  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly options: ConfidenceStorageOptions = {}
  ) {
    this.logger.log('🧠 Neo4j Confidence Storage Adapter initialized');
  }

  /**
   * Approval Pattern Management
   */

  async storeApprovalPattern(pattern: ApprovalPattern): Promise<void> {
    const query = `
      MERGE (p:ApprovalPattern {nodeId: $nodeId})
      SET p.approvalRate = $approvalRate,
          p.averageConfidence = $averageConfidence,
          p.commonRejectionReasons = $commonRejectionReasons,
          p.riskFactors = $riskFactors,
          p.successfulExecutions = $successfulExecutions,
          p.failedExecutions = $failedExecutions,
          p.lastUpdated = datetime($lastUpdated),
          p.createdAt = COALESCE(p.createdAt, datetime($lastUpdated))
      RETURN p
    `;

    try {
      await this.neo4jService.run(query, {
        nodeId: pattern.nodeId,
        approvalRate: pattern.approvalRate,
        averageConfidence: pattern.averageConfidence,
        commonRejectionReasons: pattern.commonRejectionReasons,
        riskFactors: pattern.riskFactors,
        successfulExecutions: pattern.successfulExecutions,
        failedExecutions: pattern.failedExecutions,
        lastUpdated: pattern.lastUpdated.toISOString(),
      });

      this.logger.debug(
        `✅ Stored approval pattern for node: ${pattern.nodeId}`
      );
    } catch (error) {
      this.logger.error(`❌ Failed to store approval pattern: ${error}`);
      throw new Error(`Failed to store approval pattern: ${error}`);
    }
  }

  async getApprovalPattern(patternId: string): Promise<ApprovalPattern | null> {
    const query = `
      MATCH (p:ApprovalPattern {nodeId: $patternId})
      RETURN p.nodeId as nodeId,
             p.approvalRate as approvalRate,
             p.averageConfidence as averageConfidence,
             p.commonRejectionReasons as commonRejectionReasons,
             p.riskFactors as riskFactors,
             p.successfulExecutions as successfulExecutions,
             p.failedExecutions as failedExecutions,
             p.lastUpdated as lastUpdated
    `;

    try {
      const result = await this.neo4jService.run(query, { patternId });

      if (result.length === 0) {
        return null;
      }

      const record = result[0];
      return {
        nodeId: record.nodeId,
        approvalRate: record.approvalRate,
        averageConfidence: record.averageConfidence,
        commonRejectionReasons: record.commonRejectionReasons || [],
        riskFactors: record.riskFactors || [],
        successfulExecutions: record.successfulExecutions || 0,
        failedExecutions: record.failedExecutions || 0,
        lastUpdated: new Date(record.lastUpdated),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get approval pattern: ${error}`);
      throw new Error(`Failed to get approval pattern: ${error}`);
    }
  }

  async getApprovalPatternsByExecution(
    executionId: string
  ): Promise<ApprovalPattern[]> {
    const query = `
      MATCH (e:Execution {id: $executionId})-[:USES_PATTERN]->(p:ApprovalPattern)
      RETURN p.nodeId as nodeId,
             p.approvalRate as approvalRate,
             p.averageConfidence as averageConfidence,
             p.commonRejectionReasons as commonRejectionReasons,
             p.riskFactors as riskFactors,
             p.successfulExecutions as successfulExecutions,
             p.failedExecutions as failedExecutions,
             p.lastUpdated as lastUpdated
    `;

    try {
      const result = await this.neo4jService.run(query, { executionId });

      return result.map((record) => ({
        nodeId: record.nodeId,
        approvalRate: record.approvalRate,
        averageConfidence: record.averageConfidence,
        commonRejectionReasons: record.commonRejectionReasons || [],
        riskFactors: record.riskFactors || [],
        successfulExecutions: record.successfulExecutions || 0,
        failedExecutions: record.failedExecutions || 0,
        lastUpdated: new Date(record.lastUpdated),
      }));
    } catch (error) {
      this.logger.error(`❌ Failed to get patterns by execution: ${error}`);
      throw new Error(`Failed to get patterns by execution: ${error}`);
    }
  }

  async getAllApprovalPatterns(): Promise<ApprovalPattern[]> {
    const query = `
      MATCH (p:ApprovalPattern)
      RETURN p.nodeId as nodeId,
             p.approvalRate as approvalRate,
             p.averageConfidence as averageConfidence,
             p.commonRejectionReasons as commonRejectionReasons,
             p.riskFactors as riskFactors,
             p.successfulExecutions as successfulExecutions,
             p.failedExecutions as failedExecutions,
             p.lastUpdated as lastUpdated
      ORDER BY p.lastUpdated DESC
    `;

    try {
      const result = await this.neo4jService.run(query);

      return result.map((record) => ({
        nodeId: record.nodeId,
        approvalRate: record.approvalRate,
        averageConfidence: record.averageConfidence,
        commonRejectionReasons: record.commonRejectionReasons || [],
        riskFactors: record.riskFactors || [],
        successfulExecutions: record.successfulExecutions || 0,
        failedExecutions: record.failedExecutions || 0,
        lastUpdated: new Date(record.lastUpdated),
      }));
    } catch (error) {
      this.logger.error(`❌ Failed to get all approval patterns: ${error}`);
      throw new Error(`Failed to get all approval patterns: ${error}`);
    }
  }

  async updateApprovalPattern(
    patternId: string,
    updates: Partial<ApprovalPattern>
  ): Promise<void> {
    const setClauses = [];
    const params: Record<string, unknown> = { patternId };

    if (updates.approvalRate !== undefined) {
      setClauses.push('p.approvalRate = $approvalRate');
      params.approvalRate = updates.approvalRate;
    }

    if (updates.averageConfidence !== undefined) {
      setClauses.push('p.averageConfidence = $averageConfidence');
      params.averageConfidence = updates.averageConfidence;
    }

    if (updates.commonRejectionReasons !== undefined) {
      setClauses.push('p.commonRejectionReasons = $commonRejectionReasons');
      params.commonRejectionReasons = updates.commonRejectionReasons;
    }

    if (updates.riskFactors !== undefined) {
      setClauses.push('p.riskFactors = $riskFactors');
      params.riskFactors = updates.riskFactors;
    }

    if (updates.successfulExecutions !== undefined) {
      setClauses.push('p.successfulExecutions = $successfulExecutions');
      params.successfulExecutions = updates.successfulExecutions;
    }

    if (updates.failedExecutions !== undefined) {
      setClauses.push('p.failedExecutions = $failedExecutions');
      params.failedExecutions = updates.failedExecutions;
    }

    setClauses.push('p.lastUpdated = datetime()');

    const query = `
      MATCH (p:ApprovalPattern {nodeId: $patternId})
      SET ${setClauses.join(', ')}
      RETURN p
    `;

    try {
      const result = await this.neo4jService.run(query, params);

      if (result.length === 0) {
        throw new Error(`Approval pattern not found: ${patternId}`);
      }

      this.logger.debug(`✅ Updated approval pattern: ${patternId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to update approval pattern: ${error}`);
      throw new Error(`Failed to update approval pattern: ${error}`);
    }
  }

  async deleteApprovalPattern(patternId: string): Promise<boolean> {
    const query = `
      MATCH (p:ApprovalPattern {nodeId: $patternId})
      DETACH DELETE p
      RETURN count(*) as deletedCount
    `;

    try {
      const result = await this.neo4jService.run(query, { patternId });
      const deletedCount = result[0]?.deletedCount || 0;

      this.logger.debug(
        `✅ Deleted approval pattern: ${patternId}, count: ${deletedCount}`
      );
      return deletedCount > 0;
    } catch (error) {
      this.logger.error(`❌ Failed to delete approval pattern: ${error}`);
      throw new Error(`Failed to delete approval pattern: ${error}`);
    }
  }

  /**
   * Confidence History Management
   */

  async storeConfidenceHistory(
    executionId: string,
    factors: ConfidenceFactor[]
  ): Promise<void> {
    const query = `
      MERGE (e:Execution {id: $executionId})
      SET e.lastUpdated = datetime()
      
      WITH e
      UNWIND $factors as factor
      CREATE (cf:ConfidenceFactor {
        executionId: $executionId,
        name: factor.name,
        value: factor.value,
        weight: factor.weight,
        source: factor.source,
        description: factor.description,
        timestamp: datetime()
      })
      CREATE (e)-[:HAS_CONFIDENCE_FACTOR]->(cf)
    `;

    try {
      await this.neo4jService.run(query, {
        executionId,
        factors: factors.map((f) => ({
          name: f.name,
          value: f.value,
          weight: f.weight,
          source: f.source,
          description: f.description,
        })),
      });

      this.logger.debug(
        `✅ Stored confidence history for execution: ${executionId}`
      );
    } catch (error) {
      this.logger.error(`❌ Failed to store confidence history: ${error}`);
      throw new Error(`Failed to store confidence history: ${error}`);
    }
  }

  async getConfidenceHistory(executionId: string): Promise<ConfidenceFactor[]> {
    const query = `
      MATCH (e:Execution {id: $executionId})-[:HAS_CONFIDENCE_FACTOR]->(cf:ConfidenceFactor)
      RETURN cf.name as name,
             cf.value as value,
             cf.weight as weight,
             cf.source as source,
             cf.description as description
      ORDER BY cf.timestamp DESC
    `;

    try {
      const result = await this.neo4jService.run(query, { executionId });

      return result.map((record) => ({
        name: record.name,
        value: record.value,
        weight: record.weight,
        source: record.source,
        description: record.description,
      }));
    } catch (error) {
      this.logger.error(`❌ Failed to get confidence history: ${error}`);
      throw new Error(`Failed to get confidence history: ${error}`);
    }
  }

  async getAllConfidenceHistory(): Promise<Record<string, ConfidenceFactor[]>> {
    const query = `
      MATCH (e:Execution)-[:HAS_CONFIDENCE_FACTOR]->(cf:ConfidenceFactor)
      RETURN e.id as executionId,
             cf.name as name,
             cf.value as value,
             cf.weight as weight,
             cf.source as source,
             cf.description as description
      ORDER BY e.id, cf.timestamp DESC
    `;

    try {
      const result = await this.neo4jService.run(query);
      const history: Record<string, ConfidenceFactor[]> = {};

      for (const record of result) {
        const executionId = record.executionId;

        if (!history[executionId]) {
          history[executionId] = [];
        }

        history[executionId].push({
          name: record.name,
          value: record.value,
          weight: record.weight,
          source: record.source,
          description: record.description,
        });
      }

      return history;
    } catch (error) {
      this.logger.error(`❌ Failed to get all confidence history: ${error}`);
      throw new Error(`Failed to get all confidence history: ${error}`);
    }
  }

  async updateConfidenceFactors(
    executionId: string,
    newFactors: ConfidenceFactor[]
  ): Promise<void> {
    // Delete existing factors and create new ones
    const query = `
      MATCH (e:Execution {id: $executionId})-[r:HAS_CONFIDENCE_FACTOR]->(cf:ConfidenceFactor)
      DELETE r, cf
      
      WITH e
      UNWIND $factors as factor
      CREATE (newCf:ConfidenceFactor {
        executionId: $executionId,
        name: factor.name,
        value: factor.value,
        weight: factor.weight,
        source: factor.source,
        description: factor.description,
        timestamp: datetime()
      })
      CREATE (e)-[:HAS_CONFIDENCE_FACTOR]->(newCf)
    `;

    try {
      await this.neo4jService.run(query, {
        executionId,
        factors: newFactors.map((f) => ({
          name: f.name,
          value: f.value,
          weight: f.weight,
          source: f.source,
          description: f.description,
        })),
      });

      this.logger.debug(
        `✅ Updated confidence factors for execution: ${executionId}`
      );
    } catch (error) {
      this.logger.error(`❌ Failed to update confidence factors: ${error}`);
      throw new Error(`Failed to update confidence factors: ${error}`);
    }
  }

  /**
   * Machine Learning Integration Data
   */

  async getMLTrainingData(): Promise<MLTrainingSet> {
    const patternsQuery = `MATCH (p:ApprovalPattern) RETURN p`;
    const outcomesQuery = `MATCH (o:ConfidenceOutcome) RETURN o ORDER BY o.timestamp DESC LIMIT 1000`;
    const featuresQuery = `MATCH (f:FeatureVector) RETURN f ORDER BY f.timestamp DESC LIMIT 1000`;

    try {
      const [patternsResult, outcomesResult, featuresResult] =
        await Promise.all([
          this.neo4jService.run(patternsQuery),
          this.neo4jService.run(outcomesQuery),
          this.neo4jService.run(featuresQuery),
        ]);

      const patterns: ApprovalPattern[] = patternsResult.map((record) => ({
        nodeId: record.p.properties.nodeId,
        approvalRate: record.p.properties.approvalRate,
        averageConfidence: record.p.properties.averageConfidence,
        commonRejectionReasons:
          record.p.properties.commonRejectionReasons || [],
        riskFactors: record.p.properties.riskFactors || [],
        successfulExecutions: record.p.properties.successfulExecutions || 0,
        failedExecutions: record.p.properties.failedExecutions || 0,
        lastUpdated: new Date(record.p.properties.lastUpdated),
      }));

      const outcomes: ConfidenceOutcome[] = outcomesResult.map((record) => ({
        executionId: record.o.properties.executionId,
        approved: record.o.properties.approved,
        actualOutcome: record.o.properties.actualOutcome,
        humanConfidence: record.o.properties.humanConfidence,
        systemConfidence: record.o.properties.systemConfidence,
        timestamp: new Date(record.o.properties.timestamp),
      }));

      const features: FeatureVector[] = featuresResult.map((record) => ({
        executionId: record.f.properties.executionId,
        features: JSON.parse(record.f.properties.features || '{}'),
        metadata: JSON.parse(record.f.properties.metadata || '{}'),
        timestamp: new Date(record.f.properties.timestamp),
      }));

      const labels = outcomes.map((o) => (o.approved ? 1 : 0));

      return { patterns, outcomes, features, labels };
    } catch (error) {
      this.logger.error(`❌ Failed to get ML training data: ${error}`);
      throw new Error(`Failed to get ML training data: ${error}`);
    }
  }

  async storeMLPrediction(
    executionId: string,
    prediction: MLPredictionResult
  ): Promise<void> {
    const query = `
      CREATE (p:MLPrediction {
        executionId: $executionId,
        predictedConfidence: $predictedConfidence,
        actualConfidence: $actualConfidence,
        accuracy: $accuracy,
        features: $features,
        timestamp: datetime($timestamp)
      })
    `;

    try {
      await this.neo4jService.run(query, {
        executionId: prediction.executionId,
        predictedConfidence: prediction.predictedConfidence,
        actualConfidence: prediction.actualConfidence,
        accuracy: prediction.accuracy,
        features: JSON.stringify(prediction.features),
        timestamp: prediction.timestamp.toISOString(),
      });

      this.logger.debug(
        `✅ Stored ML prediction for execution: ${executionId}`
      );
    } catch (error) {
      this.logger.error(`❌ Failed to store ML prediction: ${error}`);
      throw new Error(`Failed to store ML prediction: ${error}`);
    }
  }

  async getMLPredictions(executionId: string): Promise<MLPredictionResult[]> {
    const query = `
      MATCH (p:MLPrediction {executionId: $executionId})
      RETURN p.executionId as executionId,
             p.predictedConfidence as predictedConfidence,
             p.actualConfidence as actualConfidence,
             p.accuracy as accuracy,
             p.features as features,
             p.timestamp as timestamp
      ORDER BY p.timestamp DESC
    `;

    try {
      const result = await this.neo4jService.run(query, { executionId });

      return result.map((record) => ({
        executionId: record.executionId,
        predictedConfidence: record.predictedConfidence,
        actualConfidence: record.actualConfidence,
        accuracy: record.accuracy,
        features: JSON.parse(record.features || '{}'),
        timestamp: new Date(record.timestamp),
      }));
    } catch (error) {
      this.logger.error(`❌ Failed to get ML predictions: ${error}`);
      throw new Error(`Failed to get ML predictions: ${error}`);
    }
  }

  async storeConfidenceOutcome(outcome: ConfidenceOutcome): Promise<void> {
    const query = `
      CREATE (o:ConfidenceOutcome {
        executionId: $executionId,
        approved: $approved,
        actualOutcome: $actualOutcome,
        humanConfidence: $humanConfidence,
        systemConfidence: $systemConfidence,
        timestamp: datetime($timestamp)
      })
    `;

    try {
      await this.neo4jService.run(query, {
        executionId: outcome.executionId,
        approved: outcome.approved,
        actualOutcome: outcome.actualOutcome,
        humanConfidence: outcome.humanConfidence,
        systemConfidence: outcome.systemConfidence,
        timestamp: outcome.timestamp.toISOString(),
      });

      this.logger.debug(
        `✅ Stored confidence outcome for execution: ${outcome.executionId}`
      );
    } catch (error) {
      this.logger.error(`❌ Failed to store confidence outcome: ${error}`);
      throw new Error(`Failed to store confidence outcome: ${error}`);
    }
  }

  async storeFeatureVector(features: FeatureVector): Promise<void> {
    const query = `
      CREATE (f:FeatureVector {
        executionId: $executionId,
        features: $features,
        metadata: $metadata,
        timestamp: datetime($timestamp)
      })
    `;

    try {
      await this.neo4jService.run(query, {
        executionId: features.executionId,
        features: JSON.stringify(features.features),
        metadata: JSON.stringify(features.metadata),
        timestamp: features.timestamp.toISOString(),
      });

      this.logger.debug(
        `✅ Stored feature vector for execution: ${features.executionId}`
      );
    } catch (error) {
      this.logger.error(`❌ Failed to store feature vector: ${error}`);
      throw new Error(`Failed to store feature vector: ${error}`);
    }
  }

  /**
   * Analytics & Insights
   */

  async getConfidenceAnalytics(timeRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<ConfidenceAnalytics> {
    const whereClause = timeRange
      ? `WHERE cf.timestamp >= datetime($startDate) AND cf.timestamp <= datetime($endDate)`
      : '';

    const query = `
      MATCH (e:Execution)-[:HAS_CONFIDENCE_FACTOR]->(cf:ConfidenceFactor)
      ${whereClause}
      RETURN count(cf) as totalEvaluations,
             avg(cf.value) as averageConfidence,
             collect(cf.value) as allConfidences,
             collect(cf.name) as allFactorNames
    `;

    const params = timeRange
      ? {
          startDate: timeRange.startDate.toISOString(),
          endDate: timeRange.endDate.toISOString(),
        }
      : {};

    try {
      const result = await this.neo4jService.run(query, params);
      const record = result[0];

      if (!record) {
        return {
          totalEvaluations: 0,
          averageConfidence: 0,
          confidenceDistribution: {},
          accuracyMetrics: {
            correctPredictions: 0,
            totalPredictions: 0,
            accuracy: 0,
          },
          factorImpact: {},
          timeRange: timeRange || {
            startDate: new Date(),
            endDate: new Date(),
          },
        };
      }

      // Calculate confidence distribution
      const allConfidences = record.allConfidences || [];
      const confidenceDistribution: Record<string, number> = {};
      for (const confidence of allConfidences) {
        const bucket = Math.floor(confidence * 10) / 10;
        const key = `${bucket.toFixed(1)}-${(bucket + 0.1).toFixed(1)}`;
        confidenceDistribution[key] = (confidenceDistribution[key] || 0) + 1;
      }

      // Calculate factor impact
      const allFactorNames = record.allFactorNames || [];
      const factorImpact: Record<string, number> = {};
      for (const factorName of allFactorNames) {
        factorImpact[factorName] = (factorImpact[factorName] || 0) + 1;
      }

      return {
        totalEvaluations: record.totalEvaluations || 0,
        averageConfidence: record.averageConfidence || 0,
        confidenceDistribution,
        accuracyMetrics: {
          correctPredictions: 0,
          totalPredictions: 0,
          accuracy: 0,
        }, // TODO: Calculate from ML data
        factorImpact,
        timeRange: timeRange || { startDate: new Date(), endDate: new Date() },
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get confidence analytics: ${error}`);
      throw new Error(`Failed to get confidence analytics: ${error}`);
    }
  }

  async getPatternInsights(timeRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<PatternInsights> {
    const query = `
      MATCH (p:ApprovalPattern)
      RETURN collect(p) as patterns
    `;

    try {
      const result = await this.neo4jService.run(query);
      const patterns = result[0]?.patterns || [];

      const mostEffectivePatterns = patterns
        .filter((p: any) => p.properties.approvalRate > 0.8)
        .sort(
          (a: any, b: any) =>
            b.properties.averageConfidence - a.properties.averageConfidence
        )
        .slice(0, 5)
        .map((p: any) => ({
          nodeId: p.properties.nodeId,
          approvalRate: p.properties.approvalRate,
          averageConfidence: p.properties.averageConfidence,
          commonRejectionReasons: p.properties.commonRejectionReasons || [],
          riskFactors: p.properties.riskFactors || [],
          successfulExecutions: p.properties.successfulExecutions || 0,
          failedExecutions: p.properties.failedExecutions || 0,
          lastUpdated: new Date(p.properties.lastUpdated),
        }));

      return {
        mostEffectivePatterns,
        riskFactorCorrelations: {},
        confidenceTrends: {
          improving: 0,
          declining: 0,
          stable: patterns.length,
        },
        recommendedThresholds: { lowRisk: 0.3, mediumRisk: 0.6, highRisk: 0.8 },
        userBehaviorPatterns: {},
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get pattern insights: ${error}`);
      throw new Error(`Failed to get pattern insights: ${error}`);
    }
  }

  /**
   * Recovery Operations
   */

  async getAllActivePatterns(): Promise<ApprovalPattern[]> {
    return this.getAllApprovalPatterns();
  }

  async getAllActiveHistory(): Promise<Record<string, ConfidenceFactor[]>> {
    return this.getAllConfidenceHistory();
  }

  async cleanup(maxAge = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);

    const query = `
      MATCH (n)
      WHERE n.timestamp < datetime($cutoffDate)
      DETACH DELETE n
      RETURN count(n) as deletedCount
    `;

    try {
      const result = await this.neo4jService.run(query, {
        cutoffDate: cutoffDate.toISOString(),
      });

      const deletedCount = result[0]?.deletedCount || 0;
      this.logger.log(`🧹 Cleaned up ${deletedCount} old confidence records`);

      return deletedCount;
    } catch (error) {
      this.logger.error(`❌ Failed to cleanup old data: ${error}`);
      throw new Error(`Failed to cleanup old data: ${error}`);
    }
  }

  /**
   * Health Check Operations
   */

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.neo4jService.run('RETURN 1 as health');
      return result.length > 0 && result[0].health === 1;
    } catch (error) {
      this.logger.error(`❌ Health check failed: ${error}`);
      return false;
    }
  }

  async getStorageStats(): Promise<{
    totalPatterns: number;
    totalHistory: number;
    totalMLData: number;
    storageSize: number;
    lastBackup?: Date;
  }> {
    const query = `
      MATCH (p:ApprovalPattern) WITH count(p) as patterns
      MATCH (cf:ConfidenceFactor) WITH patterns, count(cf) as history
      MATCH (ml:MLPrediction) WITH patterns, history, count(ml) as mlData
      RETURN patterns, history, mlData
    `;

    try {
      const result = await this.neo4jService.run(query);
      const record = result[0] || { patterns: 0, history: 0, mlData: 0 };

      return {
        totalPatterns: record.patterns,
        totalHistory: record.history,
        totalMLData: record.mlData,
        storageSize: 0, // TODO: Calculate actual storage size
        lastBackup: undefined, // TODO: Track backup timestamps
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get storage stats: ${error}`);
      throw new Error(`Failed to get storage stats: ${error}`);
    }
  }
}
