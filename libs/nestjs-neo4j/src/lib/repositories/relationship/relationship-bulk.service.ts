/**
 * @fileoverview Relationship Bulk Operations Service
 *
 * Provides bulk and batch operations for relationships using QueryBuilder patterns.
 * This service focuses on high-performance batch operations and bulk deletions.
 */

import { Injectable } from '@nestjs/common';
import {
  BaseRelationshipService,
  RelationshipQueryOptions,
  BatchRelationshipOperation,
  CreateRelationshipData,
  RelationshipResult,
  BatchRelationshipMergeOperation,
  BatchRelationshipNodeMergeOperation,
} from './base-relationship.service';
import { NeogmaService } from '../../services/neogma.service';
import { NeogmaQueryBuilderService } from '../../query-builder/neogma-query-builder.service';
import { NeogmaQueryRunnerService } from '../../query-builder/neogma-query-runner.service';
import { ParameterBindingUtility } from '../../utilities/parameter-binding.utility';

/**
 * Bulk operations service for relationships
 *
 * This service provides high-performance bulk operations:
 * - Batch create/update/delete multiple relationships
 * - Delete all relationships from/to specific nodes
 * - Optimized bulk operations with transaction support
 *
 * For individual relationship operations, use RelationshipCoreRepository instead.
 *
 * @template TRel The relationship type this service manages
 * @template TSource The source node type
 * @template TTarget The target node type
 */
@Injectable()
export class RelationshipBulkOperationsService<
  TRel = any,
  TSource = any,
  TTarget = any
> extends BaseRelationshipService<TRel, TSource, TTarget> {
  constructor(
    neogmaService: NeogmaService,
    queryBuilder: NeogmaQueryBuilderService,
    queryRunner: NeogmaQueryRunnerService,
    relationshipType?: string,
    sourceLabel?: string,
    targetLabel?: string
  ) {
    super(
      neogmaService,
      queryBuilder,
      queryRunner,
      relationshipType,
      sourceLabel,
      targetLabel
    );
  }
  /**
   * Delete all relationships from a source node
   */
  async deleteAllFromSource(
    sourceId: string,
    options?: RelationshipQueryOptions & { hard?: boolean }
  ): Promise<number> {
    const params: Record<string, unknown> = { sourceId };
    let whereClause = '';
    let deleteClause = '';

    if (options?.hard) {
      deleteClause = 'DELETE rel';
    } else {
      whereClause = 'WHERE rel.deletedAt IS NULL';
      deleteClause = 'SET rel.deletedAt = $deletedAt';
      params.deletedAt = new Date().toISOString();
    }

    const baseQuery = `
      MATCH (source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->()
      ${whereClause}
      ${deleteClause}
      RETURN count(rel) as deletedCount
    `;

    const { query, params: boundParams } = ParameterBindingUtility.autoBind(
      baseQuery,
      params
    );

    const queryResult = await this.queryRunner.executeRaw(query, boundParams);

    return (
      (queryResult.records?.[0]?.get('deletedCount')?.toInt() as number) || 0
    );
  }

  /**
   * Delete all relationships to a target node
   */
  async deleteAllToTarget(
    targetId: string,
    options?: RelationshipQueryOptions & { hard?: boolean }
  ): Promise<number> {
    const params: Record<string, unknown> = { targetId };
    let whereClause = '';
    let deleteClause = '';

    if (options?.hard) {
      deleteClause = 'DELETE rel';
    } else {
      whereClause = 'WHERE rel.deletedAt IS NULL';
      deleteClause = 'SET rel.deletedAt = $deletedAt';
      params.deletedAt = new Date().toISOString();
    }

    const baseQuery = `
      MATCH ()-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})
      ${whereClause}
      ${deleteClause}
      RETURN count(rel) as deletedCount
    `;

    const { query, params: boundParams } = ParameterBindingUtility.autoBind(
      baseQuery,
      params
    );

    const queryResult = await this.queryRunner.executeRaw(query, boundParams);

    return (
      (queryResult.records?.[0]?.get('deletedCount')?.toInt() as number) || 0
    );
  }

  /**
   * Batch relationship operations
   */
  async batchOperations(
    operations: BatchRelationshipOperation<TRel>[],
    options?: RelationshipQueryOptions
  ): Promise<{
    success: boolean;
    results: Array<{ success: boolean; error?: string }>;
  }> {
    const results: Array<{ success: boolean; error?: string }> = [];
    let allSuccess = true;

    // Group operations by type for optimization
    const createOps = operations.filter((op) => op.type === 'CREATE');
    const updateOps = operations.filter((op) => op.type === 'UPDATE');
    const deleteOps = operations.filter((op) => op.type === 'DELETE');

    try {
      // Execute create operations
      if (createOps.length > 0) {
        const createResults = await this.batchCreate(createOps, options);
        results.push(...createResults);
        allSuccess = allSuccess && createResults.every((r) => r.success);
      }

      // Execute update operations
      if (updateOps.length > 0) {
        const updateResults = await this.batchUpdate(updateOps, options);
        results.push(...updateResults);
        allSuccess = allSuccess && updateResults.every((r) => r.success);
      }

      // Execute delete operations
      if (deleteOps.length > 0) {
        const deleteResults = await this.batchDelete(deleteOps, options);
        results.push(...deleteResults);
        allSuccess = allSuccess && deleteResults.every((r) => r.success);
      }

      return { success: allSuccess, results };
    } catch (error) {
      this.logger.error(
        `Batch relationship operations failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return {
        success: false,
        results: [
          ...results,
          {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    }
  }

  /**
   * Batch create operations using UNWIND for performance
   */
  async batchCreateOptimized(
    operations: CreateRelationshipData<TRel>[],
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget>[]> {
    if (operations.length === 0) {
      return [];
    }

    // Build return clause based on options
    const returnVars = this.buildReturnVars(options);

    // Prepare data for UNWIND
    const relationshipData = operations.map((op, index) => {
      const data = this.mapToNeo4j(op.properties || {});
      const now = new Date().toISOString();

      return {
        sourceId: op.sourceId,
        targetId: op.targetId,
        properties: {
          ...data,
          createdAt: data.createdAt || now,
          updatedAt: now,
        },
        index,
      };
    });

    const baseQuery = `
      UNWIND $relationshipData as relData
      MATCH (source:${this.sourceLabel} {id: relData.sourceId})
      MATCH (target:${this.targetLabel} {id: relData.targetId})
      CREATE (source)-[rel:${this.relationshipType}]->(target)
      SET rel = relData.properties
      RETURN ${returnVars.join(', ')}
    `;

    const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
      relationshipData,
    });

    const queryResult = await this.queryRunner.executeRaw(query, params);

    return queryResult.records.map((record) =>
      this.buildRelationshipResult(record, options)
    );
  }

  /**
   * Batch create operations (individual transactions)
   */
  private async batchCreate(
    operations: BatchRelationshipOperation<TRel>[],
    options?: RelationshipQueryOptions
  ): Promise<Array<{ success: boolean; error?: string }>> {
    const results: Array<{ success: boolean; error?: string }> = [];

    // For smaller batches, use individual operations
    if (operations.length <= 10) {
      for (const op of operations) {
        try {
          // Use the relationship core repository logic here
          await this.createSingleRelationship(
            {
              sourceId: op.sourceId,
              targetId: op.targetId,
              properties: op.properties,
            },
            options
          );
          results.push({ success: true });
        } catch (error) {
          results.push({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } else {
      // For larger batches, use optimized UNWIND approach
      try {
        const createData = operations.map((op) => ({
          sourceId: op.sourceId,
          targetId: op.targetId,
          properties: op.properties,
        }));

        await this.batchCreateOptimized(createData, options);

        // All succeeded
        operations.forEach(() => results.push({ success: true }));
      } catch (error) {
        // All failed
        operations.forEach(() =>
          results.push({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          })
        );
      }
    }

    return results;
  }

  /**
   * Create a single relationship (helper method)
   */
  private async createSingleRelationship(
    data: CreateRelationshipData<TRel>,
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget>> {
    const relationshipData = this.mapToNeo4j(data.properties || {});
    const now = new Date().toISOString();
    relationshipData.createdAt = relationshipData.createdAt || now;
    relationshipData.updatedAt = now;

    const returnVars = this.buildReturnVars(options);

    const baseQuery = `
      MATCH (source:${this.sourceLabel} {id: $sourceId})
      MATCH (target:${this.targetLabel} {id: $targetId})
      CREATE (source)-[rel:${this.relationshipType} $properties]->(target)
      RETURN ${returnVars.join(', ')}
    `;

    const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
      sourceId: data.sourceId,
      targetId: data.targetId,
      properties: relationshipData,
    });

    const queryResult = await this.queryRunner.executeRaw(query, params);

    if (!queryResult.records || queryResult.records.length === 0) {
      throw new Error(`Failed to create relationship ${this.relationshipType}`);
    }

    return this.buildRelationshipResult(queryResult.records[0], options);
  }

  /**
   * Batch update operations
   */
  private async batchUpdate(
    operations: BatchRelationshipOperation<TRel>[],
    options?: RelationshipQueryOptions
  ): Promise<Array<{ success: boolean; error?: string }>> {
    const results: Array<{ success: boolean; error?: string }> = [];

    for (const op of operations) {
      try {
        const updateData = this.mapToNeo4j(op.updates || {});
        updateData.updatedAt = new Date().toISOString();

        const returnVars = this.buildReturnVars(options);
        const setClause = Object.keys(updateData)
          .map((key) => `rel.${key} = $${key}`)
          .join(', ');

        const softDeleteFilter = !options?.includeSoftDeleted
          ? 'WHERE rel.deletedAt IS NULL'
          : '';

        const baseQuery = `
          MATCH (source:${this.sourceLabel} {id: $sourceId})-[rel:${
          this.relationshipType
        }]->(target:${this.targetLabel} {id: $targetId})
          ${softDeleteFilter}
          SET ${setClause}
          RETURN ${returnVars.join(', ')}
        `;

        const params = {
          sourceId: op.sourceId,
          targetId: op.targetId,
          ...updateData,
        };

        const { query, params: boundParams } = ParameterBindingUtility.autoBind(
          baseQuery,
          params
        );

        await this.queryRunner.executeRaw(query, boundParams);

        results.push({ success: true });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Batch delete operations
   */
  private async batchDelete(
    operations: BatchRelationshipOperation<TRel>[],
    options?: RelationshipQueryOptions
  ): Promise<Array<{ success: boolean; error?: string }>> {
    const results: Array<{ success: boolean; error?: string }> = [];

    for (const op of operations) {
      try {
        const params: Record<string, unknown> = {
          sourceId: op.sourceId,
          targetId: op.targetId,
        };
        let whereClause = '';
        let actionClause = '';

        if (options && 'hard' in options && options.hard) {
          actionClause = 'DELETE rel';
        } else {
          whereClause = 'WHERE rel.deletedAt IS NULL';
          actionClause = 'SET rel.deletedAt = $deletedAt';
          params.deletedAt = new Date().toISOString();
        }

        const baseQuery = `
          MATCH (source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})
          ${whereClause}
          ${actionClause}
          RETURN count(rel) > 0 as deleted
        `;

        const { query, params: boundParams } = ParameterBindingUtility.autoBind(
          baseQuery,
          params
        );

        await this.queryRunner.executeRaw(query, boundParams);

        results.push({ success: true });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Batch MERGE relationships (idempotent - create if not exists, match if exists)
   *
   * This method is safe to run multiple times as it uses MERGE operations.
   * It will create relationships that don't exist and match existing ones.
   *
   * @param operations - Array of merge operations
   * @param options - Query options
   * @returns Array of relationship results
   *
   * @example
   * ```typescript
   * await service.batchMerge([
   *   {
   *     sourceId: 'dev1',
   *     targetId: 'tech1',
   *     type: 'USES_TECHNOLOGY',
   *     onCreate: { level: 'beginner', createdAt: new Date() },
   *     onMatch: { lastUsed: new Date() }
   *   }
   * ]);
   * ```
   */
  async batchMerge(
    operations: BatchRelationshipMergeOperation<TRel>[],
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget>[]> {
    if (operations.length === 0) return [];

    const returnVars = this.buildReturnVars(options);

    const opsData = operations.map((op) => ({
      sourceId: op.sourceId,
      targetId: op.targetId,
      type: op.type,
      properties: op.properties || {},
      onCreate: op.onCreate || {},
      onMatch: op.onMatch || {},
    }));

    const baseQuery = `
      UNWIND $opsData AS op
      MATCH (source:${this.sourceLabel} {id: op.sourceId})
      MATCH (target:${this.targetLabel} {id: op.targetId})
      MERGE (source)-[r:${this.relationshipType}]->(target)
      ON CREATE SET r += op.properties, r += op.onCreate, r.createdAt = datetime()
      ON MATCH SET r += op.properties, r += op.onMatch, r.updatedAt = datetime()
      RETURN ${returnVars.join(', ')}
    `;

    const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
      opsData,
    });

    const queryResult = await this.queryRunner.executeRaw(query, params);

    return queryResult.records.map((record) =>
      this.buildRelationshipResult(record, options)
    );
  }

  /**
   * Batch MERGE relationships WITH node creation (idempotent)
   *
   * This method creates both target nodes and relationships if they don't exist.
   * Useful for operations like adding technologies, tags, or categories that may not exist yet.
   *
   * @param operations - Array of merge operations with node creation
   * @param options - Query options including targetLabel
   * @returns Array of relationship results
   *
   * @example
   * ```typescript
   * await service.batchMergeWithNodeCreation([
   *   {
   *     sourceId: 'dev1',
   *     targetKey: 'TypeScript',
   *     type: 'EXPERIENCED_WITH',
   *     targetLabel: 'Technology',
   *     targetProperties: { category: 'Programming Language' },
   *     relationshipProperties: { level: 'expert', since: new Date() }
   *   }
   * ], { targetLabel: 'Technology' });
   * ```
   */
  async batchMergeWithNodeCreation(
    operations: BatchRelationshipNodeMergeOperation<TRel>[],
    options?: RelationshipQueryOptions & { targetLabel: string }
  ): Promise<RelationshipResult<TRel, TSource, TTarget>[]> {
    if (operations.length === 0) return [];

    const targetLabel = options?.targetLabel || this.targetLabel;
    const returnVars = this.buildReturnVars(options);

    const opsData = operations.map((op) => ({
      sourceId: op.sourceId,
      targetKey: typeof op.targetKey === 'string' ? op.targetKey : op.targetKey,
      type: op.type,
      targetProps: op.targetProperties || {},
      relProps: op.relationshipProperties || {},
    }));

    const targetKeyProperty =
      typeof operations[0]?.targetKey === 'string' ? 'name' : 'id';

    const baseQuery = `
      UNWIND $opsData AS op
      MATCH (source:${this.sourceLabel} {id: op.sourceId})
      MERGE (target:${targetLabel} {${targetKeyProperty}: op.targetKey})
      ON CREATE SET target += op.targetProps, target.createdAt = datetime()
      MERGE (source)-[r:${this.relationshipType}]->(target)
      ON CREATE SET r += op.relProps, r.createdAt = datetime()
      RETURN ${returnVars.join(', ')}
    `;

    const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
      opsData,
    });

    const queryResult = await this.queryRunner.executeRaw(query, params);

    return queryResult.records.map((record) =>
      this.buildRelationshipResult(record, options)
    );
  }
}
