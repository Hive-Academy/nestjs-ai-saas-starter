import { Injectable, Logger } from '@nestjs/common';
import { NeogmaService } from '../core/neogma.service';
import type { NeogmaQueryBuilder } from '../types/neogma-types';
import type { Neo4jQueryParams } from '../types/neo4j-types';

/**
 * Query options for repository operations
 */
export interface RepositoryQueryOptions {
  /** Database name */
  database?: string;
  /** Transaction context */
  transactionId?: string;
  /** Cache configuration */
  cache?: {
    enabled: boolean;
    ttl?: number;
  };
  /** Retry configuration */
  retry?: {
    attempts: number;
    delay?: number;
  };
}

/**
 * Relationship query options
 */
export interface RelationshipQueryOptions extends RepositoryQueryOptions {
  /** Include source node in results */
  includeSource?: boolean;
  /** Include target node in results */
  includeTarget?: boolean;
  /** Include relationship properties */
  includeProperties?: boolean;
  /** Include soft-deleted relationships */
  includeSoftDeleted?: boolean;
}

/**
 * Relationship creation data
 */
export interface CreateRelationshipData<TRel = any> {
  /** Source node ID */
  sourceId: string;
  /** Target node ID */
  targetId: string;
  /** Relationship properties */
  properties?: Partial<TRel>;
  /** Source node label (if different from default) */
  sourceLabel?: string;
  /** Target node label (if different from default) */
  targetLabel?: string;
}

/**
 * Relationship result with optional node data
 */
export interface RelationshipResult<TRel = any, TSource = any, TTarget = any> {
  /** Relationship data */
  relationship: TRel;
  /** Source node (if included) */
  source?: TSource;
  /** Target node (if included) */
  target?: TTarget;
  /** Relationship ID */
  id?: string;
}

/**
 * Batch relationship operation
 */
export interface BatchRelationshipOperation<TRel = any> {
  /** Operation type */
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  /** Source node ID */
  sourceId: string;
  /** Target node ID */
  targetId: string;
  /** Relationship properties (for CREATE/UPDATE) */
  properties?: Partial<TRel>;
  /** Update data (for UPDATE) */
  updates?: Partial<TRel>;
}

/**
 * Specialized repository for relationship management
 *
 * This class provides comprehensive relationship management functionality:
 * - CRUD operations for relationships
 * - Batch relationship operations
 * - Relationship traversal and queries
 * - Type-safe relationship handling
 * - Source and target node management
 * - Relationship property management
 *
 * For basic node CRUD operations, use @FindOne, @FindMany, @CreateEntity decorators instead.
 *
 * @template TRel The relationship type this repository manages
 * @template TSource The source node type
 * @template TTarget The target node type
 */
@Injectable()
export class RelationshipRepository<
  TRel extends Record<string, any> = Record<string, any>,
  TSource extends Record<string, any> = Record<string, any>,
  TTarget extends Record<string, any> = Record<string, any>
> {
  protected readonly logger = new Logger(RelationshipRepository.name);
  protected readonly relationshipType: string = 'RELATES_TO';
  protected readonly sourceLabel: string = 'Entity';
  protected readonly targetLabel: string = 'Entity';

  constructor(protected readonly neogmaService: NeogmaService) {}

  /**
   * Execute a query with NeogmaService
   */
  protected async query<R = any>(
    cypher: string,
    params?: Neo4jQueryParams,
    options?: RepositoryQueryOptions
  ): Promise<R[]> {
    return await this.neogmaService.query<R>(cypher, params);
  }

  /**
   * Execute a query (alias for backward compatibility)
   */
  protected async executeQuery<R = any>(
    cypher: string,
    params?: Neo4jQueryParams,
    options?: RepositoryQueryOptions
  ): Promise<R[]> {
    return this.query<R>(cypher, params, options);
  }

  /**
   * Map data to Neo4j compatible format
   */
  protected mapToNeo4j(data: any): Record<string, any> {
    // Simple mapping - can be overridden in subclasses
    return { ...data };
  }

  /**
   * Map Neo4j result to entity
   */
  protected mapFromNeo4j(record: any): any {
    // Simple mapping - can be overridden in subclasses
    return record;
  }

  /**
   * Default query options
   */
  protected get defaultOptions(): RepositoryQueryOptions {
    return {};
  }

  /**
   * Create a new relationship between two nodes
   */
  async createRelationship(
    data: CreateRelationshipData<TRel>,
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget>> {
    const sourceLabel = data.sourceLabel || this.sourceLabel;
    const targetLabel = data.targetLabel || this.targetLabel;
    const relationshipData = this.mapToNeo4j(data.properties || {});

    // Add timestamps
    const now = new Date().toISOString();
    relationshipData.createdAt = relationshipData.createdAt || now;
    relationshipData.updatedAt = now;

    // Build return clause based on options
    const returnVars = ['rel'];
    if (options?.includeSource) returnVars.push('source');
    if (options?.includeTarget) returnVars.push('target');

    // Use Neogma QueryBuilder for type-safe relationship creation
    const queryBuilder: NeogmaQueryBuilder = this.neogmaService.createQueryBuilder()
      .raw(`MATCH (source:${sourceLabel} {id: $sourceId})`)
      .raw(`MATCH (target:${targetLabel} {id: $targetId})`)
      .raw(`CREATE (source)-[rel:${this.relationshipType} $properties]->(target)`)
      .return(returnVars.join(', '));

    const result = await this.neogmaService.executeQueryBuilder(queryBuilder.addParams({ sourceId: data.sourceId, targetId: data.targetId, properties: relationshipData }));

    if (!result || result.length === 0) {
      throw new Error(`Failed to create relationship ${this.relationshipType}`);
    }

    const record = result[0];
    return this.buildRelationshipResult(record, options);
  }

  /**
   * Find relationships by source node
   */
  async findBySource(
    sourceId: string,
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget>[]> {
    const builder = this.neogmaService.createQueryBuilder().raw(
      `MATCH (source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->(target:${this.targetLabel})`
    );

    // Apply soft delete filter
    if (!options?.includeSoftDeleted) {
      builder.where('rel.deletedAt', '=', null);
    }

    // Build return clause based on options
    const returnVars = ['rel'];
    if (options?.includeSource) returnVars.push('source');
    if (options?.includeTarget) returnVars.push('target');
    builder.return(returnVars);

    const queryResult = builder.build();
    const result = await this.executeQuery(
      queryResult.query,
      queryResult.params,
      options
    );
    return (
      result?.map((record: Record<string, any>) =>
        this.buildRelationshipResult(record, options)
      ) || []
    );
  }

  /**
   * Find relationships by target node
   */
  async findByTarget(
    targetId: string,
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget>[]> {
    const builder = this.neogmaService.createQueryBuilder().raw(
      `MATCH (source:${this.sourceLabel})-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})`
    );

    // Apply soft delete filter
    if (!options?.includeSoftDeleted) {
      builder.where('rel.deletedAt', '=', null);
    }

    // Build return clause based on options
    const returnVars = ['rel'];
    if (options?.includeSource) returnVars.push('source');
    if (options?.includeTarget) returnVars.push('target');
    builder.return(returnVars);

    const queryResult = builder.build();
    const result = await this.executeQuery(
      queryResult.query,
      queryResult.params,
      options
    );
    return (
      result?.map((record: Record<string, any>) =>
        this.buildRelationshipResult(record, options)
      ) || []
    );
  }

  /**
   * Find relationship between specific source and target
   */
  async findBetween(
    sourceId: string,
    targetId: string,
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget> | null> {
    const query = `
      MATCH (source:${this.sourceLabel} {id: $sourceId})-[rel:${
      this.relationshipType
    }]->(target:${this.targetLabel} {id: $targetId})
      ${this.buildSoftDeleteFilter(options, 'rel')}
      RETURN rel
      ${options?.includeSource ? ', source' : ''}
      ${options?.includeTarget ? ', target' : ''}
      LIMIT 1
    `;

    const result = await this.executeQuery(
      query,
      { sourceId, targetId },
      options
    );
    return result && result.length > 0
      ? this.buildRelationshipResult(result[0], options)
      : null;
  }

  /**
   * Update relationship properties
   */
  async updateRelationship(
    sourceId: string,
    targetId: string,
    updates: Partial<TRel>,
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget> | null> {
    const updateData = this.mapToNeo4j(updates);
    updateData.updatedAt = new Date().toISOString();

    const builder = this.neogmaService.createQueryBuilder().raw(
      `MATCH (source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})`
    );

    // Apply soft delete filter
    if (!options?.includeSoftDeleted) {
      builder.where('rel.deletedAt', '=', null);
    }

    // Add SET clause
    builder.set(updateData);

    // Build return clause based on options
    const returnVars = ['rel'];
    if (options?.includeSource) returnVars.push('source');
    if (options?.includeTarget) returnVars.push('target');
    builder.return(returnVars);

    const result = await this.neogmaService.executeQueryBuilder(builder.addParams({ sourceId, targetId }));

    return result && result.length > 0
      ? this.buildRelationshipResult(result[0], options)
      : null;
  }

  /**
   * Delete relationship between specific nodes
   */
  async deleteRelationship(
    sourceId: string,
    targetId: string,
    options?: RelationshipQueryOptions & { hard?: boolean }
  ): Promise<boolean> {
    if (options?.hard) {
      return this.hardDeleteRelationship(sourceId, targetId, options);
    } else {
      return this.softDeleteRelationship(sourceId, targetId, options);
    }
  }

  /**
   * Soft delete relationship
   */
  async softDeleteRelationship(
    sourceId: string,
    targetId: string,
    options?: RelationshipQueryOptions
  ): Promise<boolean> {
    const query = `
      MATCH (source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})
      WHERE rel.deletedAt IS NULL
      SET rel.deletedAt = $deletedAt
      RETURN count(rel) > 0 as deleted
    `;

    const mergedOptions = {
      ...this.defaultOptions,
      ...options,
      accessMode: 'WRITE' as const,
    };
    const result = await this.executeQuery(
      query,
      { sourceId, targetId, deletedAt: new Date().toISOString() },
      mergedOptions
    );

    return (result?.[0] as { deleted: boolean })?.deleted || false;
  }

  /**
   * Hard delete relationship
   */
  async hardDeleteRelationship(
    sourceId: string,
    targetId: string,
    options?: RelationshipQueryOptions
  ): Promise<boolean> {
    const query = `
      MATCH (source:${this.sourceLabel} {id: $sourceId})-[rel:${this.relationshipType}]->(target:${this.targetLabel} {id: $targetId})
      DELETE rel
      RETURN count(rel) > 0 as deleted
    `;

    const mergedOptions = {
      ...this.defaultOptions,
      ...options,
      accessMode: 'WRITE' as const,
    };
    const result = await this.executeQuery(
      query,
      { sourceId, targetId },
      mergedOptions
    );

    return (result?.[0] as { deleted: boolean })?.deleted || false;
  }

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

    const query = `
      MATCH (source:${this.sourceLabel} {id: $sourceId})-[rel:${
      this.relationshipType
    }]->()
      ${options?.hard ? '' : 'WHERE rel.deletedAt IS NULL'}
      ${deleteClause}
      RETURN count(rel) as deletedCount
    `;

    const params: Record<string, any> = { sourceId };
    if (!options?.hard) {
      params.deletedAt = new Date().toISOString();
    }

    const mergedOptions = {
      ...this.defaultOptions,
      ...options,
      accessMode: 'WRITE' as const,
    };
    const result = await this.executeQuery(query, params, mergedOptions);

    return (result?.[0] as { deletedCount: number })?.deletedCount || 0;
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

    const query = `
      MATCH ()-[rel:${this.relationshipType}]->(target:${
      this.targetLabel
    } {id: $targetId})
      ${options?.hard ? '' : 'WHERE rel.deletedAt IS NULL'}
      ${deleteClause}
      RETURN count(rel) as deletedCount
    `;

    const params: Record<string, any> = { targetId };
    if (!options?.hard) {
      params.deletedAt = new Date().toISOString();
    }

    const mergedOptions = {
      ...this.defaultOptions,
      ...options,
      accessMode: 'WRITE' as const,
    };
    const result = await this.executeQuery(query, params, mergedOptions);

    return (result?.[0] as { deletedCount: number })?.deletedCount || 0;
  }

  /**
   * Count relationships by source
   */
  async countBySource(
    sourceId: string,
    options?: RelationshipQueryOptions
  ): Promise<number> {
    const query = `
      MATCH (source:${this.sourceLabel} {id: $sourceId})-[rel:${
      this.relationshipType
    }]->()
      ${this.buildSoftDeleteFilter(options, 'rel')}
      RETURN count(rel) as count
    `;

    const result = await this.executeQuery(query, { sourceId }, options);
    return (result?.[0] as { count: number })?.count || 0;
  }

  /**
   * Count relationships by target
   */
  async countByTarget(
    targetId: string,
    options?: RelationshipQueryOptions
  ): Promise<number> {
    const query = `
      MATCH ()-[rel:${this.relationshipType}]->(target:${
      this.targetLabel
    } {id: $targetId})
      ${this.buildSoftDeleteFilter(options, 'rel')}
      RETURN count(rel) as count
    `;

    const result = await this.executeQuery(query, { targetId }, options);
    return (result?.[0] as { count: number })?.count || 0;
  }

  /**
   * Check if relationship exists between nodes
   */
  async relationshipExists(
    sourceId: string,
    targetId: string,
    options?: RelationshipQueryOptions
  ): Promise<boolean> {
    const query = `
      MATCH (source:${this.sourceLabel} {id: $sourceId})-[rel:${
      this.relationshipType
    }]->(target:${this.targetLabel} {id: $targetId})
      ${this.buildSoftDeleteFilter(options, 'rel')}
      RETURN count(rel) > 0 as exists
    `;

    const result = await this.executeQuery(
      query,
      { sourceId, targetId },
      options
    );
    return (result?.[0] as { exists: boolean })?.exists || false;
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
   * Build relationship result object
   */
  private buildRelationshipResult(
    record: any,
    options?: RelationshipQueryOptions
  ): RelationshipResult<TRel, TSource, TTarget> {
    const result: RelationshipResult<TRel, TSource, TTarget> = {
      relationship: this.mapFromNeo4j(record.rel || record),
    };

    if (options?.includeSource && record.source) {
      result.source = record.source as TSource;
    }

    if (options?.includeTarget && record.target) {
      result.target = record.target as TTarget;
    }

    return result;
  }

  /**
   * Build soft delete filter for relationships
   */
  protected buildSoftDeleteFilter(
    options?: RelationshipQueryOptions,
    relVariable = 'rel'
  ): string {
    if (options?.includeSoftDeleted) {
      return '';
    }
    return `WHERE ${relVariable}.deletedAt IS NULL`;
  }

  /**
   * Batch create operations
   */
  private async batchCreate(
    operations: BatchRelationshipOperation<TRel>[],
    options?: RelationshipQueryOptions
  ): Promise<Array<{ success: boolean; error?: string }>> {
    const results: Array<{ success: boolean; error?: string }> = [];

    for (const op of operations) {
      try {
        await this.createRelationship(
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

    return results;
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
        await this.updateRelationship(
          op.sourceId,
          op.targetId,
          op.updates || {},
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
        await this.deleteRelationship(op.sourceId, op.targetId, options);
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
