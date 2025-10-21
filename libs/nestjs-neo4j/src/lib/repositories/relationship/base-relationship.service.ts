/**
 * @fileoverview Base Relationship Service
 *
 * Provides shared interfaces, types, and utility methods for relationship operations.
 * This service contains common functionality used by both core and bulk relationship services.
 */

import { Injectable, Logger } from '@nestjs/common';
import { NeogmaService } from '../../services/neogma.service';
import { NeogmaQueryBuilderService } from '../../query-builder/neogma-query-builder.service';
import { NeogmaQueryRunnerService } from '../../query-builder/neogma-query-runner.service';
import type { Neo4jQueryParams } from '../../types/neo4j-types';

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
 * Batch relationship MERGE operation (idempotent)
 */
export interface BatchRelationshipMergeOperation<TRel = any> {
  /** Source node ID */
  sourceId: string;
  /** Target node ID */
  targetId: string;
  /** Relationship type */
  type: string;
  /** Properties to set on both CREATE and MATCH */
  properties?: Partial<TRel>;
  /** Properties to set ONLY when creating */
  onCreate?: Partial<TRel>;
  /** Properties to set ONLY when matching */
  onMatch?: Partial<TRel>;
}

/**
 * Batch relationship MERGE operation with node creation
 */
export interface BatchRelationshipNodeMergeOperation<TRel = any> {
  /** Source node ID */
  sourceId: string;
  /** Target node unique key (e.g., technology name) */
  targetKey: string | Record<string, unknown>;
  /** Relationship type */
  type: string;
  /** Target node label (e.g., 'Technology') */
  targetLabel?: string;
  /** Properties for target node (applied on CREATE) */
  targetProperties?: Record<string, unknown>;
  /** Properties for relationship */
  relationshipProperties?: Partial<TRel>;
}

/**
 * Base service providing shared functionality for relationship operations
 *
 * Generic types are now more flexible - they don't require index signatures
 */
@Injectable()
export abstract class BaseRelationshipService<
  TRel = any,
  TSource = any,
  TTarget = any
> {
  protected readonly logger = new Logger(BaseRelationshipService.name);
  protected readonly relationshipType: string;
  protected readonly sourceLabel: string;
  protected readonly targetLabel: string;

  constructor(
    protected readonly neogmaService: NeogmaService,
    protected readonly queryBuilder: NeogmaQueryBuilderService,
    protected readonly queryRunner: NeogmaQueryRunnerService,
    relationshipType = 'RELATES_TO',
    sourceLabel = 'Entity',
    targetLabel = 'Entity'
  ) {
    this.relationshipType = relationshipType;
    this.sourceLabel = sourceLabel;
    this.targetLabel = targetLabel;
  }

  /**
   * Execute a query with NeogmaService (legacy support)
   */
  protected async query<R = any>(
    cypher: string,
    params?: Neo4jQueryParams,
    options?: RepositoryQueryOptions
  ): Promise<R[]> {
    const queryResult = await this.neogmaService.query(cypher, params);
    return queryResult.records.map((record) => {
      // Extract the relationship from the record
      const keys = record.keys;
      if (keys.length === 1) {
        return record.get(keys[0]) as R;
      }
      // If multiple keys, return an object with all values
      const result: any = {};
      keys.forEach((key) => {
        result[key] = record.get(key);
      });
      return result as R;
    });
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
  protected mapToNeo4j(data: any): { [key: string]: unknown } {
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
   * Build relationship result object
   */
  protected buildRelationshipResult(
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
   * Create a QueryBuilder with common relationship pattern
   */
  protected createRelationshipQueryBuilder(
    pattern: string,
    params?: { [key: string]: unknown }
  ) {
    const builder = this.queryBuilder.createBuilder();
    builder.match(pattern);

    if (params) {
      const bindParam = builder.getBindParam();
      Object.entries(params).forEach(([key, value]) => {
        bindParam.add(value, key);
      });
    }

    return builder;
  }

  /**
   * Add soft delete filter to a QueryBuilder using raw clause
   */
  protected addSoftDeleteFilter(
    builder: any,
    options?: RelationshipQueryOptions,
    relVariable = 'rel'
  ) {
    if (!options?.includeSoftDeleted) {
      builder.raw(`WHERE ${relVariable}.deletedAt IS NULL`);
    }
    return builder;
  }

  /**
   * Build return variables array based on options
   */
  protected buildReturnVars(options?: RelationshipQueryOptions): string[] {
    const returnVars = ['rel'];
    if (options?.includeSource) returnVars.push('source');
    if (options?.includeTarget) returnVars.push('target');
    return returnVars;
  }

  /**
   * Process query result records into relationship results
   */
  protected processQueryResults(
    records: any[],
    options?: RelationshipQueryOptions
  ): RelationshipResult<TRel, TSource, TTarget>[] {
    return records.map((record) => {
      const result: { [key: string]: unknown } = {};
      record.keys.forEach((key: string) => {
        result[key] = record.get(key);
      });
      return this.buildRelationshipResult(result, options);
    });
  }

  /**
   * Execute QueryBuilder and process results
   */
  protected async executeRelationshipQuery(
    builder: any,
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget>[]> {
    const queryResult = await this.queryRunner.executeRaw(
      builder.getStatement(),
      builder.getBindParam().get()
    );

    return this.processQueryResults(queryResult.records, options);
  }

  /**
   * Execute QueryBuilder and return single result
   */
  protected async executeRelationshipQuerySingle(
    builder: any,
    options?: RelationshipQueryOptions
  ): Promise<RelationshipResult<TRel, TSource, TTarget> | null> {
    const results = await this.executeRelationshipQuery(builder, options);
    return results.length > 0 ? results[0] : null;
  }
}
