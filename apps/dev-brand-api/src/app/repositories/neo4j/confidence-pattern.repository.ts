import { Injectable } from '@nestjs/common';
import {
  Neo4jRepository,
  Neo4jCrudService,
  InjectNeogma,
  NeogmaService,
  Safe,
  FindOptions,
} from '@hive-academy/nestjs-neo4j';
import { ConfidencePattern } from '../../entities/neo4j/confidence-pattern.entity';
import type {
  ApprovalPattern,
  ConfidenceFactor,
  MLTrainingSet,
  MLPredictionResult,
  ConfidenceOutcome,
  FeatureVector,
  ConfidenceAnalytics,
  PatternInsights,
} from '@hive-academy/langgraph-hitl';

/**
 * ConfidencePattern Repository
 *
 * Replaces: neo4j-confidence-storage.adapter.ts (789 lines)
 *
 * Uses composition pattern with Neo4jCrudService for CRUD operations.
 * Provides type-safe operations for confidence pattern analysis including
 * ML training data management, pattern insights, and approval analytics.
 *
 * CRUD methods (delegated to Neo4jCrudService):
 * - findById(id: string): Promise<ConfidencePattern | null>
 * - findAll(options?: FindOptions<ConfidencePattern>): Promise<ConfidencePattern[]>
 * - create(data: Partial<ConfidencePattern>): Promise<ConfidencePattern>
 * - update(id: string, updates: Partial<ConfidencePattern>): Promise<ConfidencePattern | null>
 * - delete(id: string): Promise<boolean>
 * - count(where?: Partial<ConfidencePattern>): Promise<number>
 * - exists(id: string): Promise<boolean>
 */
@Neo4jRepository(() => ConfidencePattern)
@Injectable()
export class ConfidencePatternRepository {
  private readonly label = 'ApprovalPattern';

  constructor(
    private readonly crud: Neo4jCrudService,
    @InjectNeogma() private readonly neogma: NeogmaService
  ) {}

  // ============================================================================
  // CRUD METHODS (delegated to Neo4jCrudService)
  // ============================================================================

  findById(id: string): Promise<ConfidencePattern | null> {
    return this.crud.findById<ConfidencePattern>(this.label, id);
  }

  findAll(
    options?: FindOptions<ConfidencePattern>
  ): Promise<ConfidencePattern[]> {
    return this.crud.findAll<ConfidencePattern>(this.label, options);
  }

  create(data: Partial<ConfidencePattern>): Promise<ConfidencePattern> {
    return this.crud.create<ConfidencePattern>(
      this.label,
      data as Omit<ConfidencePattern, 'id' | 'createdAt' | 'updatedAt'>
    );
  }

  update(
    id: string,
    data: Partial<ConfidencePattern>
  ): Promise<ConfidencePattern | null> {
    return this.crud.update<ConfidencePattern>(this.label, id, data);
  }

  delete(id: string): Promise<boolean> {
    return this.crud.delete(this.label, id);
  }

  count(where?: Partial<ConfidencePattern>): Promise<number> {
    return this.crud.count<ConfidencePattern>(this.label, where);
  }

  exists(id: string): Promise<boolean> {
    return this.crud.exists(this.label, id);
  }

  // ============================================================================
  // APPROVAL PATTERN MANAGEMENT
  // ============================================================================

  /**
   * Store an approval pattern for future reference
   * Migrated from: storeApprovalPattern in neo4j-confidence-storage.adapter.ts
   */
  @Safe()
  async storeApprovalPattern(pattern: ApprovalPattern): Promise<void> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const nodeIdParam = bindParam.add(pattern.nodeId);
      const approvalRateParam = bindParam.add(pattern.approvalRate);
      const averageConfidenceParam = bindParam.add(pattern.averageConfidence);
      const commonRejectionReasonsParam = bindParam.add(
        pattern.commonRejectionReasons
      );
      const riskFactorsParam = bindParam.add(pattern.riskFactors);
      const successfulExecutionsParam = bindParam.add(
        pattern.successfulExecutions
      );
      const failedExecutionsParam = bindParam.add(pattern.failedExecutions);
      const lastUpdatedParam = bindParam.add(pattern.lastUpdated.toISOString());

      queryBuilder
        .merge(`(p:ApprovalPattern {nodeId: $${nodeIdParam}})`)
        .set(
          `p.approvalRate = $${approvalRateParam},
              p.averageConfidence = $${averageConfidenceParam},
              p.commonRejectionReasons = $${commonRejectionReasonsParam},
              p.riskFactors = $${riskFactorsParam},
              p.successfulExecutions = $${successfulExecutionsParam},
              p.failedExecutions = $${failedExecutionsParam},
              p.lastUpdated = datetime($${lastUpdatedParam}),
              p.createdAt = COALESCE(p.createdAt, datetime($${lastUpdatedParam}))`
        )
        .return('p');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      await this.neogma.run(cypher, params);
    } catch (error) {
      throw new Error(`Failed to store approval pattern: ${error}`);
    }
  }

  /**
   * Get approval pattern by pattern ID (nodeId)
   * Migrated from: getApprovalPattern in neo4j-confidence-storage.adapter.ts
   */
  @Safe()
  async getApprovalPattern(patternId: string): Promise<ApprovalPattern | null> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const patternIdParam = bindParam.add(patternId);

      queryBuilder
        .match('(p:ApprovalPattern)')
        .where(`p.nodeId = $${patternIdParam}`).return(`p.nodeId as nodeId,
                 p.approvalRate as approvalRate,
                 p.averageConfidence as averageConfidence,
                 p.commonRejectionReasons as commonRejectionReasons,
                 p.riskFactors as riskFactors,
                 p.successfulExecutions as successfulExecutions,
                 p.failedExecutions as failedExecutions,
                 p.lastUpdated as lastUpdated`);

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      return {
        nodeId: record.get('nodeId'),
        approvalRate: record.get('approvalRate'),
        averageConfidence: record.get('averageConfidence'),
        commonRejectionReasons: record.get('commonRejectionReasons') || [],
        riskFactors: record.get('riskFactors') || [],
        successfulExecutions: record.get('successfulExecutions') || 0,
        failedExecutions: record.get('failedExecutions') || 0,
        lastUpdated: new Date(record.get('lastUpdated')),
      };
    } catch (error) {
      throw new Error(`Failed to get approval pattern: ${error}`);
    }
  }

  /**
   * Get all approval patterns for a specific execution
   * Migrated from: getApprovalPatternsByExecution in neo4j-confidence-storage.adapter.ts
   */
  @Safe()
  async getApprovalPatternsByExecution(
    executionId: string
  ): Promise<ApprovalPattern[]> {
    try {
      const qb = this.neogma.createQueryBuilder();

      // This connects patterns to executions via confidence history
      qb
        .match('(p:ApprovalPattern)')
        .match('(h:ConfidenceHistory)')
        .where(`h.executionId = $executionId AND h.nodeId = p.nodeId`)
        .return(`p.nodeId as nodeId,
                 p.approvalRate as approvalRate,
                 p.averageConfidence as averageConfidence,
                 p.commonRejectionReasons as commonRejectionReasons,
                 p.riskFactors as riskFactors,
                 p.successfulExecutions as successfulExecutions,
                 p.failedExecutions as failedExecutions,
                 p.lastUpdated as lastUpdated`);

      const cypher = qb.getStatement();
      const params = { executionId };
      const result = await this.neogma.run(cypher, params);

      return result.records.map((record) => ({
        nodeId: record.get('nodeId'),
        approvalRate: record.get('approvalRate'),
        averageConfidence: record.get('averageConfidence'),
        commonRejectionReasons: record.get('commonRejectionReasons') || [],
        riskFactors: record.get('riskFactors') || [],
        successfulExecutions: record.get('successfulExecutions') || 0,
        failedExecutions: record.get('failedExecutions') || 0,
        lastUpdated: new Date(record.get('lastUpdated')),
      }));
    } catch (error) {
      throw new Error(`Failed to get approval patterns by execution: ${error}`);
    }
  }

  /**
   * Get all stored approval patterns
   * Migrated from: getAllApprovalPatterns in neo4j-confidence-storage.adapter.ts
   */
  @Safe()
  async getAllApprovalPatterns(): Promise<ApprovalPattern[]> {
    try {
      const qb = this.neogma.createQueryBuilder();

      qb.match('(p:ApprovalPattern)')
        .return(
          `p.nodeId as nodeId,
                 p.approvalRate as approvalRate,
                 p.averageConfidence as averageConfidence,
                 p.commonRejectionReasons as commonRejectionReasons,
                 p.riskFactors as riskFactors,
                 p.successfulExecutions as successfulExecutions,
                 p.failedExecutions as failedExecutions,
                 p.lastUpdated as lastUpdated`
        )
        .orderBy('p.lastUpdated DESC');

      const cypher = qb.getStatement();
      const params = {};
      const result = await this.neogma.run(cypher, params);

      return result.records.map((record) => ({
        nodeId: record.get('nodeId'),
        approvalRate: record.get('approvalRate'),
        averageConfidence: record.get('averageConfidence'),
        commonRejectionReasons: record.get('commonRejectionReasons') || [],
        riskFactors: record.get('riskFactors') || [],
        successfulExecutions: record.get('successfulExecutions') || 0,
        failedExecutions: record.get('failedExecutions') || 0,
        lastUpdated: new Date(record.get('lastUpdated')),
      }));
    } catch (error) {
      throw new Error(`Failed to get all approval patterns: ${error}`);
    }
  }

  /**
   * Update an existing approval pattern
   * Migrated from: updateApprovalPattern in neo4j-confidence-storage.adapter.ts
   */
  @Safe()
  async updateApprovalPattern(
    patternId: string,
    updates: Partial<ApprovalPattern>
  ): Promise<void> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const patternIdParam = bindParam.add(patternId);
      const setClauses: string[] = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          let paramValue = value;
          if (key === 'lastUpdated' && value instanceof Date) {
            paramValue = value.toISOString();
          }
          const paramKey = bindParam.add(paramValue);
          setClauses.push(`p.${key} = $${paramKey}`);
        }
      });

      if (setClauses.length === 0) {
        return; // Nothing to update
      }

      setClauses.push('p.lastUpdated = datetime()');

      queryBuilder
        .match('(p:ApprovalPattern)')
        .where(`p.nodeId = $${patternIdParam}`)
        .set(setClauses.join(', '))
        .return('p.nodeId as nodeId');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      await this.neogma.run(cypher, params);
    } catch (error) {
      throw new Error(`Failed to update approval pattern: ${error}`);
    }
  }

  /**
   * Delete an approval pattern
   * Migrated from: deleteApprovalPattern in neo4j-confidence-storage.adapter.ts
   */
  @Safe()
  async deleteApprovalPattern(patternId: string): Promise<boolean> {
    try {
      const qb = this.neogma.createQueryBuilder();

      qb.match('(p:ApprovalPattern)')
        .where(`p.nodeId = $patternId`)
        .delete('p')
        .return('count(p) as deletedCount');

      const cypher = qb.getStatement();
      const params = { patternId };
      const result = await this.neogma.run(cypher, params);
      const deletedCount = Number(result.records[0]?.get('deletedCount')) || 0;

      return deletedCount > 0;
    } catch (error) {
      throw new Error(`Failed to delete approval pattern: ${error}`);
    }
  }

  // ============================================================================
  // CONFIDENCE HISTORY MANAGEMENT
  // ============================================================================

  /**
   * Store confidence factors for an execution
   * Migrated from: storeConfidenceHistory in neo4j-confidence-storage.adapter.ts
   */
  @Safe()
  async storeConfidenceHistory(
    executionId: string,
    factors: ConfidenceFactor[]
  ): Promise<void> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const executionIdParam = bindParam.add(executionId);
      const factorsParam = bindParam.add(
        factors.map((factor) => ({
          nodeId: factor.name,
          type: factor.source,
          weight: factor.weight,
          value: factor.value,
          description: factor.description,
          timestamp: new Date().toISOString(),
        }))
      );

      queryBuilder
        .unwind(`$${factorsParam} as factor`)
        .create(
          `(h:ConfidenceHistory {
          executionId: $${executionIdParam},
          nodeId: factor.nodeId,
          factorType: factor.type,
          weight: factor.weight,
          value: factor.value,
          description: factor.description,
          timestamp: datetime(factor.timestamp),
          createdAt: datetime()
        })`
        )
        .return('count(h) as createdCount');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      await this.neogma.run(cypher, params);
    } catch (error) {
      throw new Error(`Failed to store confidence history: ${error}`);
    }
  }

  /**
   * Get confidence history for a specific execution
   * Migrated from: getConfidenceHistory in neo4j-confidence-storage.adapter.ts
   */
  @Safe()
  async getConfidenceHistory(executionId: string): Promise<ConfidenceFactor[]> {
    try {
      const qb = this.neogma.createQueryBuilder();

      qb.match('(h:ConfidenceHistory)')
        .where(`h.executionId = $executionId`)
        .return(
          `h.nodeId as name,
                 h.factorType as source,
                 h.weight as weight,
                 h.value as value,
                 h.description as description,
                 h.timestamp as timestamp`
        )
        .orderBy('h.timestamp ASC');

      const cypher = qb.getStatement();
      const params = { executionId };
      const result = await this.neogma.run(cypher, params);

      return result.records.map((record) => ({
        name: record.get('name'),
        source: record.get('source') as
          | 'historical'
          | 'contextual'
          | 'algorithmic'
          | 'user'
          | 'system',
        weight: record.get('weight'),
        value: record.get('value'),
        description: record.get('description'),
      }));
    } catch (error) {
      throw new Error(`Failed to get confidence history: ${error}`);
    }
  }

  // ============================================================================
  // MACHINE LEARNING INTEGRATION
  // ============================================================================

  /**
   * Get ML training data for confidence prediction models
   * Migrated from: getMLTrainingData in neo4j-confidence-storage.adapter.ts
   */
  @Safe()
  async getMLTrainingData(): Promise<MLTrainingSet> {
    try {
      // Get patterns
      const patterns = await this.getAllApprovalPatterns();

      // Get outcomes
      const outcomeBuilder = this.neogma.createQueryBuilder();
      outcomeBuilder.match('(o:ConfidenceOutcome)')
        .return(`o.executionId as executionId,
                 o.approved as approved,
                 o.actualOutcome as actualOutcome,
                 o.humanConfidence as humanConfidence,
                 o.systemConfidence as systemConfidence,
                 o.timestamp as timestamp`);

      const outcomeCypher = outcomeBuilder.getStatement();
      const outcomeParams = {};
      const outcomeResult = await this.neogma.run(outcomeCypher, outcomeParams);
      const outcomes: ConfidenceOutcome[] = outcomeResult.records.map(
        (record) => ({
          executionId: record.get('executionId'),
          approved: record.get('approved'),
          actualOutcome: record.get('actualOutcome'),
          humanConfidence: record.get('humanConfidence'),
          systemConfidence: record.get('systemConfidence'),
          timestamp: new Date(record.get('timestamp')),
        })
      );

      // Get feature vectors
      const featureBuilder = this.neogma.createQueryBuilder();
      featureBuilder.match('(f:FeatureVector)')
        .return(`f.executionId as executionId,
                 f.features as features,
                 f.metadata as metadata,
                 f.timestamp as timestamp`);

      const featureCypher = featureBuilder.getStatement();
      const featureParams = {};
      const featureResult = await this.neogma.run(featureCypher, featureParams);
      const features: FeatureVector[] = featureResult.records.map((record) => ({
        executionId: record.get('executionId'),
        features: JSON.parse(record.get('features') || '{}'),
        metadata: JSON.parse(record.get('metadata') || '{}'),
        timestamp: new Date(record.get('timestamp')),
      }));

      // Generate labels from outcomes (1 for approved, 0 for rejected)
      const labels = outcomes.map((outcome) => (outcome.approved ? 1 : 0));

      return {
        patterns,
        outcomes,
        features,
        labels,
      };
    } catch (error) {
      throw new Error(`Failed to get ML training data: ${error}`);
    }
  }

  /**
   * Store ML prediction result
   * Migrated from: storeMLPrediction in neo4j-confidence-storage.adapter.ts
   */
  @Safe()
  async storeMLPrediction(
    executionId: string,
    prediction: MLPredictionResult
  ): Promise<void> {
    try {
      const qb = this.neogma.createQueryBuilder();

      qb.create(
        `(p:MLPrediction {
          executionId: $executionId,
          predictedConfidence: $predictedConfidence,
          actualConfidence: $actualConfidence,
          accuracy: $accuracy,
          features: $features,
          metadata: $metadata,
          timestamp: datetime($timestamp),
          createdAt: datetime()
        })`
      ).return('p.executionId as executionId');

      const cypher = qb.getStatement();
      await this.neogma.run(cypher, {
        executionId,
        predictedConfidence: prediction.predictedConfidence,
        actualConfidence: prediction.actualConfidence || null,
        accuracy: prediction.accuracy || null,
        features: JSON.stringify(prediction.features.features),
        metadata: JSON.stringify(prediction.features.metadata),
        timestamp: prediction.timestamp.toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to store ML prediction: ${error}`);
    }
  }

  /**
   * Store confidence outcome for ML training
   * Migrated from: storeConfidenceOutcome in neo4j-confidence-storage.adapter.ts
   */
  @Safe()
  async storeConfidenceOutcome(outcome: ConfidenceOutcome): Promise<void> {
    try {
      const qb = this.neogma.createQueryBuilder();

      qb.create(
        `(o:ConfidenceOutcome {
          executionId: $executionId,
          approved: $approved,
          actualOutcome: $actualOutcome,
          humanConfidence: $humanConfidence,
          systemConfidence: $systemConfidence,
          timestamp: datetime($timestamp),
          createdAt: datetime()
        })`
      ).return('o.executionId as executionId');

      const cypher = qb.getStatement();
      await this.neogma.run(cypher, {
        executionId: outcome.executionId,
        approved: outcome.approved,
        actualOutcome: outcome.actualOutcome,
        humanConfidence: outcome.humanConfidence,
        systemConfidence: outcome.systemConfidence,
        timestamp: outcome.timestamp.toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to store confidence outcome: ${error}`);
    }
  }

  /**
   * Store feature vector for ML training
   * Migrated from: storeFeatureVector in neo4j-confidence-storage.adapter.ts
   */
  @Safe()
  async storeFeatureVector(features: FeatureVector): Promise<void> {
    try {
      const qb = this.neogma.createQueryBuilder();

      qb.create(
        `(f:FeatureVector {
          executionId: $executionId,
          features: $features,
          metadata: $metadata,
          timestamp: datetime($timestamp),
          createdAt: datetime()
        })`
      ).return('f.executionId as executionId');

      const cypher = qb.getStatement();
      await this.neogma.run(cypher, {
        executionId: features.executionId,
        features: JSON.stringify(features.features),
        metadata: JSON.stringify(features.metadata),
        timestamp: features.timestamp.toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to store feature vector: ${error}`);
    }
  }

  // ============================================================================
  // ANALYTICS & INSIGHTS
  // ============================================================================

  /**
   * Get comprehensive confidence analytics
   * Migrated from: getConfidenceAnalytics in neo4j-confidence-storage.adapter.ts
   */
  @Safe()
  async getConfidenceAnalytics(timeRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<ConfidenceAnalytics> {
    try {
      const qb = this.neogma.createQueryBuilder();

      let baseQuery = qb.match('(h:ConfidenceHistory)');

      if (timeRange) {
        baseQuery = baseQuery.where(
          `h.timestamp >= datetime($startDate) AND h.timestamp <= datetime($endDate)`
        );
      }

      baseQuery.return(`
          count(h) as totalEvaluations,
          avg(h.value) as averageConfidence,
          collect(h.value) as confidenceValues,
          collect(h.factorType) as factorTypes
        `);

      const cypher = baseQuery.getStatement();
      const params = timeRange
        ? {
            startDate: timeRange.startDate.toISOString(),
            endDate: timeRange.endDate.toISOString(),
          }
        : {};
      const result = await this.neogma.run(cypher, params);
      const record = result.records[0];

      const totalEvaluations = Number(record.get('totalEvaluations')) || 0;
      const averageConfidence = Number(record.get('averageConfidence')) || 0;
      const confidenceValues: number[] = record.get('confidenceValues') || [];
      const factorTypes: string[] = record.get('factorTypes') || [];

      // Calculate confidence distribution
      const confidenceDistribution: Record<string, number> = {};
      confidenceValues.forEach((value) => {
        const bucket = Math.floor(value * 10) / 10; // Round to 1 decimal
        const key = bucket.toFixed(1);
        confidenceDistribution[key] = (confidenceDistribution[key] || 0) + 1;
      });

      // Calculate factor impact
      const factorImpact: Record<string, number> = {};
      factorTypes.forEach((type) => {
        factorImpact[type] = (factorImpact[type] || 0) + 1;
      });

      return {
        totalEvaluations,
        averageConfidence,
        confidenceDistribution,
        accuracyMetrics: {
          correctPredictions: 0, // Would need ML prediction comparison
          totalPredictions: 0,
          accuracy: 0,
        },
        factorImpact,
        timeRange: timeRange || {
          startDate: new Date(0),
          endDate: new Date(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to get confidence analytics: ${error}`);
    }
  }

  /**
   * Get pattern-based insights for confidence improvement
   * Migrated from: getPatternInsights in neo4j-confidence-storage.adapter.ts
   */
  @Safe()
  async getPatternInsights(timeRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<PatternInsights> {
    try {
      // Get most effective patterns (highest approval rates)
      const patternBuilder = this.neogma.createQueryBuilder();
      patternBuilder
        .match('(p:ApprovalPattern)')
        .return('p')
        .orderBy('p.approvalRate DESC')
        .limit('10');

      const patternCypher = patternBuilder.getStatement();
      const patternParams = {};
      const patternResult = await this.neogma.run(patternCypher, patternParams);
      const mostEffectivePatterns: ApprovalPattern[] =
        patternResult.records.map((record) => {
          const props = record.get('p').properties;
          return {
            nodeId: props.nodeId,
            approvalRate: props.approvalRate,
            averageConfidence: props.averageConfidence,
            commonRejectionReasons: props.commonRejectionReasons || [],
            riskFactors: props.riskFactors || [],
            successfulExecutions: props.successfulExecutions || 0,
            failedExecutions: props.failedExecutions || 0,
            lastUpdated: new Date(props.lastUpdated),
          };
        });

      return {
        mostEffectivePatterns,
        riskFactorCorrelations: {}, // Would need complex correlation analysis
        confidenceTrends: {
          improving: 0,
          declining: 0,
          stable: 0,
        },
        recommendedThresholds: {
          lowRisk: 0.8,
          mediumRisk: 0.6,
          highRisk: 0.4,
        },
        userBehaviorPatterns: {},
      };
    } catch (error) {
      throw new Error(`Failed to get pattern insights: ${error}`);
    }
  }

  // ============================================================================
  // RECOVERY & HEALTH OPERATIONS
  // ============================================================================

  /**
   * Get all active approval patterns for service recovery
   * Migrated from: getAllActivePatterns in neo4j-confidence-storage.adapter.ts
   */
  @Safe()
  async getAllActivePatterns(): Promise<ApprovalPattern[]> {
    return this.getAllApprovalPatterns();
  }

  /**
   * Clean up old data based on retention policies
   * Migrated from: cleanup in neo4j-confidence-storage.adapter.ts
   */
  @Safe()
  async cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    // 30 days default
    try {
      const cutoffDate = new Date(Date.now() - maxAge);

      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const cutoffDateParam = bindParam.add(cutoffDate.toISOString());

      queryBuilder
        .match('(h:ConfidenceHistory)')
        .where(`h.timestamp < datetime($${cutoffDateParam})`)
        .delete('h')
        .return('count(h) as deletedCount');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);
      const deletedCount = Number(result.records[0]?.get('deletedCount')) || 0;

      return deletedCount;
    } catch (error) {
      throw new Error(`Failed to cleanup old data: ${error}`);
    }
  }

  /**
   * Verify storage service health and connectivity
   * Migrated from: isHealthy in neo4j-confidence-storage.adapter.ts
   */
  @Safe()
  async isHealthy(): Promise<boolean> {
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

  /**
   * Get storage service statistics
   * Migrated from: getStorageStats in neo4j-confidence-storage.adapter.ts
   */
  @Safe()
  async getStorageStats(): Promise<{
    totalPatterns: number;
    totalHistory: number;
    totalMLData: number;
    storageSize: number;
    lastBackup?: Date;
  }> {
    try {
      // Use simpler approach since apoc functions may not be available
      const patternCountQuery = this.neogma.createQueryBuilder();
      patternCountQuery
        .match('(p:ApprovalPattern)')
        .return('count(p) as count');

      const historyCountQuery = this.neogma.createQueryBuilder();
      historyCountQuery
        .match('(h:ConfidenceHistory)')
        .return('count(h) as count');

      const mlCountQuery = this.neogma.createQueryBuilder();
      mlCountQuery.match('(m:MLPrediction)').return('count(m) as count');

      const patternCypher = patternCountQuery.getStatement();
      const historyCypher = historyCountQuery.getStatement();
      const mlCypher = mlCountQuery.getStatement();

      const [patternResult, historyResult, mlResult] = await Promise.all([
        this.neogma.run(patternCypher, {}),
        this.neogma.run(historyCypher, {}),
        this.neogma.run(mlCypher, {}),
      ]);

      const totalPatterns = Number(patternResult.records[0]?.get('count')) || 0;
      const totalHistory = Number(historyResult.records[0]?.get('count')) || 0;
      const totalMLData = Number(mlResult.records[0]?.get('count')) || 0;

      return {
        totalPatterns,
        totalHistory,
        totalMLData,
        storageSize: 0, // Would need additional DB size queries
        lastBackup: undefined,
      };
    } catch (error) {
      throw new Error(`Failed to get storage stats: ${error}`);
    }
  }
}
