/**
 * @fileoverview  QueryBuilder Service using Neogma's Native Types
 *
 * This service provides a streamlined wrapper around Neogma's QueryBuilder
 * using only Neogma's native types and interfaces for maximum compatibility.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  BindParam,
  QueryBuilder,
  Where,
  type AnyWhereI,
  type Neo4jSupportedProperties,
  type WhereParamsI,
} from 'neogma';

/**
 *  QueryBuilder configuration
 */
export interface QueryBuilderConfig {
  enableLogging?: boolean;
  defaultLimit?: number;
  maxLimit?: number;
}

/**
 *  QueryBuilder Service
 *
 * Provides convenience methods and type safety on top of Neogma's QueryBuilder
 * while utilizing Neogma's native types and patterns.
 */
@Injectable()
export class NeogmaQueryBuilderService {
  private readonly logger = new Logger(NeogmaQueryBuilderService.name);
  private readonly config: Required<QueryBuilderConfig> = {
    enableLogging: false,
    defaultLimit: 100,
    maxLimit: 1000,
  };

  constructor() {
    // Config is now internal with sensible defaults
    // Can be modified via updateConfig() if needed
  }

  /**
   * Update query builder configuration (optional)
   */
  updateConfig(updates: Partial<QueryBuilderConfig>): void {
    Object.assign(this.config, updates);
  }

  /**
   * Create a new QueryBuilder instance
   */
  createBuilder(bindParam?: BindParam): QueryBuilder {
    const builder = new QueryBuilder(bindParam);

    if (this.config.enableLogging) {
      this.logger.debug('Created new QueryBuilder instance');
    }

    return builder;
  }

  /**
   * Create a QueryBuilder with a MATCH clause
   */
  createMatchQuery(pattern: string, where?: AnyWhereI): QueryBuilder {
    const builder = this.createBuilder();
    builder.match(pattern);

    if (where) {
      builder.where(where);
    }

    return builder;
  }

  /**
   * Create a CREATE query
   */
  createCreateQuery(
    pattern: string,
    properties?: Neo4jSupportedProperties
  ): QueryBuilder {
    const builder = this.createBuilder();
    builder.create(pattern);

    if (properties) {
      const bindParam = builder.getBindParam();
      const setParts: string[] = [];

      Object.entries(properties).forEach(([key, value]) => {
        if (value !== undefined) {
          const paramName = bindParam.add(value);
          setParts.push(`${key}: $${paramName}`);
        }
      });

      if (setParts.length > 0) {
        builder.raw(`SET ${setParts.join(', ')}`);
      }
    }

    return builder;
  }

  /**
   * Create a MERGE query
   */
  createMergeQuery(
    pattern: string,
    onCreate?: Neo4jSupportedProperties,
    onMatch?: Neo4jSupportedProperties
  ): QueryBuilder {
    const builder = this.createBuilder();
    builder.merge(pattern);

    if (onCreate) {
      this.addOnCreateClause(builder, onCreate);
    }

    if (onMatch) {
      this.addOnMatchClause(builder, onMatch);
    }

    return builder;
  }

  /**
   * Create a relationship creation query
   */
  createRelationshipQuery(
    sourcePattern: string,
    relationshipType: string,
    targetPattern: string,
    relationshipProps?: Neo4jSupportedProperties
  ): QueryBuilder {
    const builder = this.createBuilder();

    let relPattern = `-[r:${relationshipType}`;

    if (relationshipProps) {
      const bindParam = builder.getBindParam();
      const propParts: string[] = [];

      Object.entries(relationshipProps).forEach(([key, value]) => {
        if (value !== undefined) {
          const paramName = bindParam.add(value);
          propParts.push(`${key}: $${paramName}`);
        }
      });

      if (propParts.length > 0) {
        relPattern += ` {${propParts.join(', ')}}`;
      }
    }

    relPattern += ']>';

    builder
      .match(`${sourcePattern}, ${targetPattern}`)
      .create(`(source)${relPattern}(target)`)
      .return('r');

    return builder;
  }

  /**
   * Create a paginated query
   */
  createPaginatedQuery(
    basePattern: string,
    where?: AnyWhereI,
    orderBy?: string,
    page = 1,
    pageSize = 20
  ): QueryBuilder {
    const builder = this.createBuilder();
    const actualPageSize = Math.min(pageSize, this.config.maxLimit);
    const skip = (page - 1) * actualPageSize;

    builder.match(basePattern);

    if (where) {
      builder.where(where);
    }

    builder.return('*');

    if (orderBy) {
      builder.orderBy(orderBy);
    }

    if (skip > 0) {
      builder.skip(skip);
    }

    builder.limit(actualPageSize);

    return builder;
  }

  /**
   * Create an aggregation query
   */
  createAggregationQuery(
    pattern: string,
    where?: AnyWhereI,
    groupBy?: string[],
    having?: AnyWhereI
  ): QueryBuilder {
    const builder = this.createBuilder();

    builder.match(pattern);

    if (where) {
      builder.where(where);
    }

    if (groupBy && groupBy.length > 0) {
      builder.with(groupBy.join(', '));
    }

    // Note: Neo4j doesn't have explicit HAVING, but we can use WHERE after WITH
    if (having) {
      builder.where(having);
    }

    return builder;
  }

  /**
   * Create a path finding query
   */
  createPathQuery(
    startPattern: string,
    endPattern: string,
    relationshipPattern = '*',
    maxDepth = 6
  ): QueryBuilder {
    const builder = this.createBuilder();

    const pathPattern = `${startPattern}-[${relationshipPattern}${
      maxDepth ? `*1..${maxDepth}` : ''
    }]-${endPattern}`;

    builder.match(pathPattern).return('path');

    return builder;
  }

  /**
   * Create a batch operation query
   */
  createBatchQuery(
    operation: 'CREATE' | 'MERGE' | 'DELETE',
    pattern: string,
    dataArray: Neo4jSupportedProperties[]
  ): QueryBuilder {
    const builder = this.createBuilder();
    const bindParam = builder.getBindParam();
    const arrayParam = bindParam.add(dataArray);

    builder
      .unwind(`$${arrayParam} AS item`)
      .raw(`${operation} ${pattern}`)
      .set('item')
      .return('*');

    return builder;
  }

  /**
   * Add WHERE clause using Neogma's Where class
   */
  addWhereClause(
    builder: QueryBuilder,
    whereParams: WhereParamsI,
    identifier = 'n'
  ): QueryBuilder {
    const where = new Where(
      { [identifier]: whereParams },
      builder.getBindParam()
    );
    builder.where(where);
    return builder;
  }

  /**
   * Add complex WHERE with multiple identifiers
   */
  addComplexWhere(
    builder: QueryBuilder,
    whereByIdentifier: Record<string, WhereParamsI>
  ): QueryBuilder {
    const where = new Where(whereByIdentifier, builder.getBindParam());
    builder.where(where);
    return builder;
  }

  /**
   * Apply default limit if none is set
   */
  applyDefaultLimits(builder: QueryBuilder): QueryBuilder {
    const statement = builder.getStatement();

    // Check if LIMIT is already present (simple check)
    if (!statement.toUpperCase().includes('LIMIT')) {
      builder.limit(this.config.defaultLimit);
    }

    return builder;
  }

  /**
   * Add SET clause for updates
   */
  addSetClause(
    builder: QueryBuilder,
    identifier: string,
    properties: Neo4jSupportedProperties
  ): QueryBuilder {
    const bindParam = builder.getBindParam();
    const setParts: string[] = [];

    Object.entries(properties).forEach(([key, value]) => {
      if (value !== undefined) {
        const paramName = bindParam.add(value);
        setParts.push(`${identifier}.${key} = $${paramName}`);
      }
    });

    if (setParts.length > 0) {
      builder.set(setParts.join(', '));
    }

    return builder;
  }

  /**
   * Add ON CREATE clause for MERGE operations
   */
  private addOnCreateClause(
    builder: QueryBuilder,
    properties: Neo4jSupportedProperties
  ): void {
    builder.raw('ON CREATE');
    this.addSetClause(builder, 'node', properties);
  }

  /**
   * Add ON MATCH clause for MERGE operations
   */
  private addOnMatchClause(
    builder: QueryBuilder,
    properties: Neo4jSupportedProperties
  ): void {
    builder.raw('ON MATCH');
    this.addSetClause(builder, 'node', properties);
  }

  /**
   * Build a node pattern string
   */
  buildNodePattern(
    identifier: string,
    labels?: string | string[],
    properties?: Neo4jSupportedProperties
  ): string {
    let pattern = `(${identifier}`;

    if (labels) {
      const labelStr = Array.isArray(labels) ? labels.join(':') : labels;
      pattern += `:${labelStr}`;
    }

    if (properties) {
      const propPairs = Object.entries(properties)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`);

      if (propPairs.length > 0) {
        pattern += ` {${propPairs.join(', ')}}`;
      }
    }

    pattern += ')';
    return pattern;
  }

  /**
   * Build a relationship pattern string
   */
  buildRelationshipPattern(
    type?: string,
    direction: 'in' | 'out' | 'both' = 'out',
    identifier?: string,
    properties?: Neo4jSupportedProperties
  ): string {
    let relPart = identifier || '';

    if (type) {
      relPart += `:${type}`;
    }

    if (properties) {
      const propPairs = Object.entries(properties)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`);

      if (propPairs.length > 0) {
        relPart += ` {${propPairs.join(', ')}}`;
      }
    }

    switch (direction) {
      case 'in':
        return `<-[${relPart}]-`;
      case 'out':
        return `-[${relPart}]->`;
      case 'both':
      default:
        return `-[${relPart}]-`;
    }
  }

  /**
   * Validate query before execution
   */
  validateQuery(builder: QueryBuilder): { valid: boolean; errors: string[] } {
    const statement = builder.getStatement();
    const errors: string[] = [];

    // Basic validation rules
    if (!statement.trim()) {
      errors.push('Query is empty');
    }

    // Check for potential security issues
    if (statement.includes('DELETE') && !statement.includes('WHERE')) {
      errors.push('DELETE queries should include WHERE clause');
    }

    if (statement.includes('SET') && !statement.includes('MATCH')) {
      errors.push('SET queries should include MATCH clause');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
