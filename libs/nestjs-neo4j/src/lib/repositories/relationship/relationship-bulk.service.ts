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
} from './base-relationship.service';

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
  /**
   * Delete all relationships from a source node
   */
  async deleteAllFromSource(
    sourceId: string,
    options?: RelationshipQueryOptions & { hard?: boolean }
  ): Promise<number> {
    const deleteClause = options?.hard
      ? 'DELETE rel'
      : 'SET rel.deletedAt = $deletedAt';

    const builder = this.queryBuilder.createBuilder();
    builder.match(
      `(source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->()`
    );

    if (!options?.hard) {
      builder.raw('WHERE rel.deletedAt IS NULL');
    }

    builder.raw(deleteClause).return('count(rel) as deletedCount');

    const bindParam = builder.getBindParam();
    bindParam.add(sourceId, 'sourceId');

    if (!options?.hard) {
      bindParam.add(new Date().toISOString(), 'deletedAt');
    }

    const queryResult = await this.queryRunner.executeRaw(
      builder.getStatement(),
      bindParam.get()
    );

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
    const deleteClause = options?.hard
      ? 'DELETE rel'
      : 'SET rel.deletedAt = $deletedAt';

    const builder = this.queryBuilder.createBuilder();
    builder.match(
      `()-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})`
    );

    if (!options?.hard) {
      builder.raw('WHERE rel.deletedAt IS NULL');
    }

    builder.raw(deleteClause).return('count(rel) as deletedCount');

    const bindParam = builder.getBindParam();
    bindParam.add(targetId, 'targetId');

    if (!options?.hard) {
      bindParam.add(new Date().toISOString(), 'deletedAt');
    }

    const queryResult = await this.queryRunner.executeRaw(
      builder.getStatement(),
      bindParam.get()
    );

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

    const builder = this.queryBuilder.createBuilder();
    builder
      .raw('UNWIND $relationshipData as relData')
      .match(`(source:${this.sourceLabel} {id: relData.sourceId})`)
      .match(`(target:${this.targetLabel} {id: relData.targetId})`)
      .create(`(source)-[rel:${this.relationshipType}]->(target)`)
      .raw('SET rel = relData.properties')
      .return(returnVars.join(', '));

    const bindParam = builder.getBindParam();
    bindParam.add(relationshipData, 'relationshipData');

    return this.executeRelationshipQuery(builder, options);
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

    const builder = this.queryBuilder.createBuilder();
    builder
      .match(`(source:${this.sourceLabel} {id: $sourceId})`)
      .match(`(target:${this.targetLabel} {id: $targetId})`)
      .create(`(source)-[rel:${this.relationshipType} $properties]->(target)`)
      .return(returnVars.join(', '));

    const bindParam = builder.getBindParam();
    bindParam.add(data.sourceId, 'sourceId');
    bindParam.add(data.targetId, 'targetId');
    bindParam.add(relationshipData, 'properties');

    const queryResult = await this.queryRunner.executeRaw(
      builder.getStatement(),
      bindParam.get()
    );

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

        const builder = this.queryBuilder.createBuilder();
        builder.match(
          `(source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})`
        );

        this.addSoftDeleteFilter(builder, options);

        builder.raw(`SET ${setClause}`).return(returnVars.join(', '));

        const bindParam = builder.getBindParam();
        bindParam.add(op.sourceId, 'sourceId');
        bindParam.add(op.targetId, 'targetId');

        Object.entries(updateData).forEach(([key, value]) => {
          bindParam.add(value, key);
        });

        await this.queryRunner.executeRaw(
          builder.getStatement(),
          bindParam.get()
        );

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
        const builder = this.queryBuilder.createBuilder();
        builder.match(
          `(source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})`
        );

        if (options && 'hard' in options && options.hard) {
          builder.raw('DELETE rel');
        } else {
          builder
            .raw('WHERE rel.deletedAt IS NULL')
            .raw('SET rel.deletedAt = $deletedAt');
        }

        builder.return('count(rel) > 0 as deleted');

        const bindParam = builder.getBindParam();
        bindParam.add(op.sourceId, 'sourceId');
        bindParam.add(op.targetId, 'targetId');

        if (!(options && 'hard' in options && options.hard)) {
          bindParam.add(new Date().toISOString(), 'deletedAt');
        }

        await this.queryRunner.executeRaw(
          builder.getStatement(),
          bindParam.get()
        );

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
}
