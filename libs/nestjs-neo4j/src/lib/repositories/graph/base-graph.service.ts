/**
 * @fileoverview Base Graph Service - Shared utilities for graph operations
 *
 * This service provides common functionality and type-safe query building
 * for all graph-related operations using QueryBuilder patterns.
 */

import { Injectable, Logger } from '@nestjs/common';
import { type Neogma, QueryBuilder } from 'neogma';
import type { NeogmaEntity } from '../../types/neogma-types';
import type { Neo4jQueryParams } from '../../types/neo4j-types';
import { NeogmaService } from '../../services/neogma.service';

/**
 * Options for graph traversal operations
 */
export interface GraphTraversalOptions {
  /** Maximum depth for traversal */
  maxDepth?: number;
  /** Minimum depth for traversal */
  minDepth?: number;
  /** Relationship types to follow */
  relationshipTypes?: string[];
  /** Direction of relationships to follow */
  direction?: 'IN' | 'OUT' | 'BOTH';
  /** Filter conditions for nodes */
  nodeFilter?: { [key: string]: unknown };
  /** Filter conditions for relationships */
  relationshipFilter?: { [key: string]: unknown };
  /** Include relationship data in results */
  includeRelationships?: boolean;
  /** Include path information */
  includePaths?: boolean;
  /** Limit number of results */
  limit?: number;
}

/**
 * Result for neighbor operations
 */
export interface NeighborResult<T> {
  node: T;
  distance: number;
  relationship?: { [key: string]: unknown };
  path?: unknown[];
}

/**
 * Path finding result
 */
export interface PathResult<T> {
  path: T[];
  length: number;
  weight?: number;
  relationships?: { [key: string]: unknown }[];
}

/**
 * Pattern matching interface for complex graph queries
 */
export interface GraphPattern {
  nodes: Array<{
    variable: string;
    labels: string[];
    properties?: { [key: string]: unknown };
  }>;
  relationships: Array<{
    type: string;
    direction: 'IN' | 'OUT' | 'BOTH';
    source: string;
    target: string;
    properties?: { [key: string]: unknown };
  }>;
}

/**
 * Graph execution options
 */
export interface GraphQueryOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTTL?: number;
}

/**
 * Base Graph Service - Common utilities for graph operations
 *
 * Provides shared functionality using QueryBuilder patterns for type safety
 */
@Injectable()
export abstract class BaseGraphService<T extends NeogmaEntity = NeogmaEntity> {
  protected readonly logger = new Logger(BaseGraphService.name);
  protected readonly neogma: Neogma;

  constructor(
    protected readonly neogmaService: NeogmaService,
    protected readonly entityLabel = 'Entity'
  ) {
    // Access the underlying Neogma instance from NeogmaService
    this.neogma = this.neogmaService.getNeogmaInstance();
  }

  /**
   * Create a QueryBuilder instance for type-safe queries
   */
  protected createQueryBuilder(): QueryBuilder {
    return new QueryBuilder();
  }

  /**
   * Execute a QueryBuilder with metrics tracking
   */
  protected async executeQueryBuilder<R = unknown>(
    queryBuilder: QueryBuilder,
    options?: GraphQueryOptions
  ): Promise<R[]> {
    const startTime = Date.now();
    const retries = options?.retries ?? 1;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.logger.debug(
          `Executing graph query (attempt ${attempt}/${retries})`
        );

        const result = await queryBuilder.run();

        this.logger.debug(
          `Query executed successfully in ${Date.now() - startTime}ms`
        );

        return result.records.map((record) => {
          const keys = record.keys;
          if (keys.length === 1) {
            return record.get(keys[0]) as R;
          }

          const obj: { [key: string]: unknown } = {};
          keys.forEach((key) => {
            obj[String(key)] = record.get(key);
          });
          return obj as R;
        });
      } catch (error) {
        this.logger.error(
          `Graph query failed on attempt ${attempt}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );

        if (attempt === retries) {
          throw error;
        }

        // Simple delay between retries
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
      }
    }

    return [];
  }

  /**
   * Execute a raw query with metrics tracking
   */
  protected async executeQuery<R = unknown>(
    cypher: string,
    params?: Neo4jQueryParams,
    options?: GraphQueryOptions
  ): Promise<R[]> {
    const startTime = Date.now();
    const retries = options?.retries ?? 1;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.logger.debug(
          `Executing graph query (attempt ${attempt}/${retries})`
        );

        const result = await this.neogma.queryRunner.run(cypher, params);

        this.logger.debug(
          `Query executed successfully in ${Date.now() - startTime}ms`
        );

        return result.records.map((record) => {
          const keys = record.keys;
          if (keys.length === 1) {
            return record.get(keys[0]) as R;
          }

          const obj: { [key: string]: unknown } = {};
          keys.forEach((key) => {
            obj[String(key)] = record.get(key);
          });
          return obj as R;
        });
      } catch (error) {
        this.logger.error(
          `Graph query failed on attempt ${attempt}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );

        if (attempt === retries) {
          throw error;
        }

        // Simple delay between retries
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
      }
    }

    return [];
  }

  /**
   * Build relationship clause for traversal queries using QueryBuilder patterns
   */
  protected buildRelationshipClause(options?: GraphTraversalOptions): string {
    const types = options?.relationshipTypes?.length
      ? options.relationshipTypes.map((type) => `:${type}`).join('|')
      : '';

    const direction = options?.direction || 'BOTH';

    switch (direction) {
      case 'IN':
        return `<-[${types}]-`;
      case 'OUT':
        return `-[${types}]->`;
      case 'BOTH':
      default:
        return `-[${types}]-`;
    }
  }

  /**
   * Build WHERE clause from filter conditions
   */
  protected buildWhereClause(
    filter?: { [key: string]: unknown },
    nodeVariable = 'n'
  ): string {
    if (!filter || Object.keys(filter).length === 0) {
      return '';
    }

    const conditions = Object.entries(filter).map(([key, value]) => {
      if (value === null) {
        return `${nodeVariable}.${key} IS NULL`;
      } else if (value === undefined) {
        return `${nodeVariable}.${key} IS NOT NULL`;
      } else if (typeof value === 'string') {
        return `${nodeVariable}.${key} = "${value}"`;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        return `${nodeVariable}.${key} = ${value}`;
      }
      return `${nodeVariable}.${key} = $${key}`;
    });

    return `WHERE ${conditions.join(' AND ')}`;
  }

  /**
   * Build relationship pattern for QueryBuilder
   */
  protected buildRelationshipPattern(options?: GraphTraversalOptions): string {
    const direction = options?.direction || 'BOTH';
    const types = options?.relationshipTypes;

    let pattern = '';
    if (types && types.length > 0) {
      pattern = `:${types.join('|')}`;
    }

    switch (direction) {
      case 'IN':
        return `<-[${pattern}]-`;
      case 'OUT':
        return `-[${pattern}]->`;
      default:
        return `-[${pattern}]-`;
    }
  }

  /**
   * Build MATCH clauses from graph pattern
   */
  protected buildPatternMatch(pattern: GraphPattern): string[] {
    const clauses: string[] = [];

    // Build node matches
    pattern.nodes.forEach((node) => {
      const labels = node.labels.map((label) => `:${label}`).join('');
      const props = node.properties
        ? `{${Object.keys(node.properties)
            .map((key) => `${key}: $${key}`)
            .join(', ')}}`
        : '';
      clauses.push(`MATCH (${node.variable}${labels} ${props})`);
    });

    // Build relationship matches
    pattern.relationships.forEach((rel) => {
      const direction =
        rel.direction === 'IN' ? '<-' : rel.direction === 'OUT' ? '->' : '-';
      const relClause = `(${rel.source})-[:${rel.type}]${direction}(${rel.target})`;
      clauses.push(`MATCH ${relClause}`);
    });

    return clauses;
  }

  /**
   * Map Neo4j record to typed entity
   */
  protected mapToEntity(record: unknown): T {
    if (record && typeof record === 'object' && 'properties' in record) {
      return (record as { properties: T }).properties;
    }
    return record as T;
  }

  /**
   * Validate graph traversal options
   */
  protected validateTraversalOptions(options?: GraphTraversalOptions): void {
    if (options?.maxDepth && options.maxDepth < 1) {
      throw new Error('maxDepth must be at least 1');
    }
    if (options?.minDepth && options.minDepth < 0) {
      throw new Error('minDepth must be non-negative');
    }
    if (
      options?.maxDepth &&
      options?.minDepth &&
      options.minDepth > options.maxDepth
    ) {
      throw new Error('minDepth cannot be greater than maxDepth');
    }
    if (options?.limit && options.limit < 1) {
      throw new Error('limit must be at least 1');
    }
  }

  /**
   * Build depth constraint for traversal
   */
  protected buildDepthConstraint(options?: GraphTraversalOptions): string {
    const minDepth = options?.minDepth || 1;
    const maxDepth = options?.maxDepth || 3;

    if (minDepth === maxDepth) {
      return `*${minDepth}`;
    }

    return `*${minDepth}..${maxDepth}`;
  }

  /**
   * Add performance logging for long-running operations
   */
  protected logPerformance(
    operation: string,
    startTime: number,
    resultCount?: number
  ): void {
    const duration = Date.now() - startTime;
    const message =
      resultCount !== undefined
        ? `${operation} completed in ${duration}ms (${resultCount} results)`
        : `${operation} completed in ${duration}ms`;

    if (duration > 1000) {
      this.logger.warn(`Slow operation: ${message}`);
    } else {
      this.logger.debug(message);
    }
  }
}
