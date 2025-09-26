import { Injectable } from '@nestjs/common';
import { QueryResult } from '../decorators/cypher-query.decorator';

/**
 * Type-safe query builder for Neo4j Cypher queries
 *
 * Provides fluent API for building type-safe queries with IntelliSense support.
 * Integrates seamlessly with @CypherQuery decorator.
 */
@Injectable()
export class Neo4jQueryBuilder<T = any> {
  private queryParts: string[] = [];
  private params: Record<string, any> = {};
  private paramCounter = 0;

  /**
   * Start a MATCH clause with type safety
   *
   * @param alias - Variable alias for the matched node
   * @param entityType - Entity class factory for label extraction
   * @param properties - Optional properties to match (instance properties)
   */
  match<TEntity extends object>(
    alias: string,
    entityType: () => { new (...args: any[]): TEntity },
    properties?: Partial<TEntity>
  ): Neo4jQueryBuilder<TEntity> {
    const label = this.getEntityLabel(entityType);
    let matchClause = `MATCH (${alias}:${label}`;

    if (properties && Object.keys(properties).length > 0) {
      const propParam = this.addParam(properties);
      matchClause += ` ${propParam}`;
    }

    matchClause += ')';
    this.queryParts.push(matchClause);

    return this as any;
  }

  /**
   * Add WHERE clause with type-safe property access
   */
  where<K extends keyof T>(
    property: `${string}.${string}` | K,
    operator:
      | '='
      | '<>'
      | '>'
      | '<'
      | '>='
      | '<='
      | 'CONTAINS'
      | 'STARTS WITH'
      | 'ENDS WITH',
    value: T[K] | null
  ): this {
    const paramName = this.addParam(value);
    this.queryParts.push(`WHERE ${String(property)} ${operator} ${paramName}`);
    return this;
  }

  /**
   * Add AND condition to existing WHERE clause
   */
  and<K extends keyof T>(
    property: `${string}.${string}` | K,
    operator:
      | '='
      | '<>'
      | '>'
      | '<'
      | '>='
      | '<='
      | 'CONTAINS'
      | 'STARTS WITH'
      | 'ENDS WITH',
    value: T[K] | null
  ): this {
    const paramName = this.addParam(value);
    this.queryParts.push(`AND ${String(property)} ${operator} ${paramName}`);
    return this;
  }

  /**
   * Add OR condition to existing WHERE clause
   */
  or<K extends keyof T>(
    property: `${string}.${string}` | K,
    operator:
      | '='
      | '<>'
      | '>'
      | '<'
      | '>='
      | '<='
      | 'CONTAINS'
      | 'STARTS WITH'
      | 'ENDS WITH',
    value: T[K] | null
  ): this {
    const paramName = this.addParam(value);
    this.queryParts.push(`OR ${String(property)} ${operator} ${paramName}`);
    return this;
  }

  /**
   * Add custom WHERE condition with manual parameter handling
   */
  whereRaw(condition: string, params?: Record<string, any>): this {
    this.queryParts.push(`WHERE ${condition}`);
    if (params) {
      Object.assign(this.params, params);
    }
    return this;
  }

  /**
   * Add OPTIONAL MATCH clause
   */
  optionalMatch(pattern: string): this {
    this.queryParts.push(`OPTIONAL MATCH ${pattern}`);
    return this;
  }

  /**
   * Add relationship traversal
   */
  relationship<TTarget>(
    alias: string,
    relationshipType: string,
    direction: 'IN' | 'OUT' | 'BOTH',
    targetAlias: string,
    targetEntityType?: () => TTarget
  ): Neo4jQueryBuilder<TTarget> {
    let relationshipPattern = '';

    switch (direction) {
      case 'IN':
        relationshipPattern = `<-[:${relationshipType}]-`;
        break;
      case 'OUT':
        relationshipPattern = `-[:${relationshipType}]->`;
        break;
      case 'BOTH':
        relationshipPattern = `-[:${relationshipType}]-`;
        break;
    }

    const targetLabel = targetEntityType
      ? this.getEntityLabel(targetEntityType)
      : '';
    const targetNode = targetLabel
      ? `(${targetAlias}:${targetLabel})`
      : `(${targetAlias})`;

    this.queryParts.push(`MATCH (${alias})${relationshipPattern}${targetNode}`);

    return this as any;
  }

  /**
   * Add WITH clause for query chaining
   */
  with(variables: string | string[]): this {
    const vars = Array.isArray(variables) ? variables.join(', ') : variables;
    this.queryParts.push(`WITH ${vars}`);
    return this;
  }

  /**
   * Add ORDER BY clause with type safety
   */
  orderBy(
    property: string,
    direction: 'ASC' | 'DESC' = 'ASC'
  ): this {
    this.queryParts.push(`ORDER BY ${String(property)} ${direction}`);
    return this;
  }

  /**
   * Add multiple ORDER BY properties
   */
  orderByMultiple(
    orders: Array<{
      property: keyof T | string;
      direction: 'ASC' | 'DESC';
    }>
  ): this {
    const orderClauses = orders.map(
      (order) => `${String(order.property)} ${order.direction}`
    );
    this.queryParts.push(`ORDER BY ${orderClauses.join(', ')}`);
    return this;
  }

  /**
   * Add LIMIT clause
   */
  limit(count: number): this {
    const paramName = this.addParam(count);
    this.queryParts.push(`LIMIT ${paramName}`);
    return this;
  }

  /**
   * Add SKIP clause
   */
  skip(count: number): this {
    const paramName = this.addParam(count);
    this.queryParts.push(`SKIP ${paramName}`);
    return this;
  }

  /**
   * Add pagination (SKIP + LIMIT)
   */
  paginate(page: number, pageSize: number): this {
    const skip = (page - 1) * pageSize;
    return this.skip(skip).limit(pageSize);
  }

  /**
   * Add RETURN clause
   */
/**   * Add RETURN clause   */  return(variables: string | string[]): this;  return(variables: string, params: Record<string, any>): this;  return(variables: string | string[], params?: Record<string, any>): this {    const vars = Array.isArray(variables) ? variables.join(", ") : variables;        // Add parameters if provided    if (params) {      Object.entries(params).forEach(([key, value]) => {        this.params[key] = value;      });    }        this.queryParts.push(`RETURN ${vars}`);    return this;  }
    if (data) {
      const paramName = this.addParam(data);
      this.queryParts.push(`CREATE ${pattern} ${paramName}`);
    } else {
      this.queryParts.push(`CREATE ${pattern}`);
    }
    return this;
  }

  /**
   * Add MERGE clause
   */
  merge(pattern: string): this {
    this.queryParts.push(`MERGE ${pattern}`);
    return this;
  }

  /**
   * Add SET clause
   */
  set(updates: string | Record<string, any>): this {
    if (typeof updates === 'string') {
      this.queryParts.push(`SET ${updates}`);
    } else {
      const setClause = Object.entries(updates)
        .map(([key, value]) => {
          const paramName = this.addParam(value);
          return `${key} = ${paramName}`;
        })
        .join(', ');
      this.queryParts.push(`SET ${setClause}`);
    }
    return this;
  }

  /**
   * Add DELETE clause
   */
  delete(variables: string | string[]): this {
    const vars = Array.isArray(variables) ? variables.join(', ') : variables;
    this.queryParts.push(`DELETE ${vars}`);
    return this;
  }

  /**
   * Add DETACH DELETE clause
   */
  detachDelete(variables: string | string[]): this {
    const vars = Array.isArray(variables) ? variables.join(', ') : variables;
    this.queryParts.push(`DETACH DELETE ${vars}`);
    return this;
  }

  /**
   * Add raw Cypher clause
   */
  raw(cypher: string, params?: Record<string, any>): this {
    this.queryParts.push(cypher);
    if (params) {
      Object.assign(this.params, params);
    }
    return this;
  }

  /**
   * Build the final query and return QueryResult
   */
  build(): QueryResult {
    if (this.queryParts.length === 0) {
      throw new Error(
        'Query builder is empty. Add at least one clause before building.'
      );
    }

    return {
      query: this.queryParts.join('\n'),
      params: this.params,
    };
  }

  /**
   * Get the built query string (for debugging)
   */
  toString(): string {
    return this.queryParts.join('\n');
  }

  /**
   * Reset the builder to start a new query
   */
  reset(): this {
    this.queryParts = [];
    this.params = {};
    this.paramCounter = 0;
    return this;
  }

  /**
   * Clone the current builder
   */
  clone(): Neo4jQueryBuilder<T> {
    const clone = new Neo4jQueryBuilder<T>();
    clone.queryParts = [...this.queryParts];
    clone.params = { ...this.params };
    clone.paramCounter = this.paramCounter;
    return clone;
  }

  // Private helper methods

  addParam(value: any): string {
    const paramName = `param${this.paramCounter++}`;
    this.params[paramName] = value;
    return `$${paramName}`;
  }

  getEntityLabel(entityType: () => any): string {
    try {
      const entity = entityType();

      // Check if it's a class constructor
      if (typeof entity === 'function') {
        // For our new signature: () => new () => TEntity, entity will be the constructor
        return entity.name;
      }

      // Legacy support: Check if it's an instance with constructor  
      if (entity && entity.constructor) {
        return entity.constructor.name;
      }

      // Fallback
      return 'Entity';
    } catch {
      return 'Entity';
    }
  }
}

/**
 * Factory function to create a new query builder instance
 */
export function createQueryBuilder<T = any>(): Neo4jQueryBuilder<T> {
  return new Neo4jQueryBuilder<T>();
}

/**
 * Type-safe query builder for specific entity types
 */
export class TypedQueryBuilder<T> extends Neo4jQueryBuilder<T> {
  constructor(private entityType: () => { new (...args: any[]): T }) {
    super();
  }

  /**
   * Start a MATCH for this entity type
   */
  matchEntity(alias: string, properties?: Partial<T>): this {
    return super.match(alias, this.entityType, properties) as this;
  }

  /**
   * Create an instance of this entity
   */
  createEntity(alias: string, data: Partial<T>): this {
    const label = this.getEntityLabel(this.entityType);
    const paramName = this.addParam(data);
    return this.create(`(${alias}:${label} ${paramName})`);
  }

  override getEntityLabel(entityType: () => any): string {
    try {
      const entity = entityType();
      if (typeof entity === 'function') {
        return entity.name;
      }
      if (entity && entity.constructor) {
        return entity.constructor.name;
      }
      return 'Entity';
    } catch {
      return 'Entity';
    }
  }
}
