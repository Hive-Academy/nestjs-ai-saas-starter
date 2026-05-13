import { BindParam } from 'neogma';
import { int, isInt } from 'neo4j-driver';

/**
 * Advanced Parameter Binding Utility for Neo4j/Neogma
 *
 * Provides two primary approaches for parameter binding:
 * 1. **autoBind**: Automatically bind parameters in Cypher queries (simple queries)
 * 2. **smartBuilder**: Type-safe fluent builder API (complex queries)
 *
 * Both approaches eliminate manual parameter management and prevent "key already in bind param" errors.
 *
 * @example autoBind - Simple queries
 * ```typescript
 * const { query, params } = ParameterBindingUtility.autoBind(`
 *   MERGE (u:User {id: $userId})
 *   SET u.name = $name, u.email = $email
 *   RETURN u
 * `, {
 *   userId: '123',
 *   name: 'John',
 *   email: 'john@example.com'
 * });
 * await neogma.run(query, params);
 * ```
 *
 * @example smartBuilder - Complex queries
 * ```typescript
 * const qb = ParameterBindingUtility.smartBuilder();
 * const { cypher, params } = qb
 *   .merge('(u:User)', { id: userId })
 *   .set('u', { name: 'John', email: 'john@example.com' })
 *   .merge('(u)-[:FRIEND]->(f:User)', { id: friendId })
 *   .return('u, f')
 *   .build();
 * await neogma.run(cypher, params);
 * ```
 *
 * @packageDocumentation
 */
export class ParameterBindingUtility {
  // ============================================================================
  // PRIMARY APIS: autoBind & smartBuilder
  // ============================================================================

  /**
   * AUTO-BIND: Automatically bind parameters in a Cypher query
   *
   * Scans the query for $paramName patterns and binds values from the data object.
   * Handles unique key generation internally to prevent collisions.
   *
   * @param cypher - Cypher query with $paramName placeholders
   * @param data - Object containing parameter values
   * @param options - Optional configuration for type handling
   * @returns Object with final query and bound parameters
   *
   * @example Basic usage
   * ```typescript
   * const { query, params } = ParameterBindingUtility.autoBind(`
   *   MATCH (u:User {id: $userId})
   *   SET u.lastLogin = $timestamp
   *   RETURN u
   * `, {
   *   userId: '123',
   *   timestamp: new Date().toISOString()
   * });
   * ```
   *
   * @example With nested objects
   * ```typescript
   * const { query, params } = ParameterBindingUtility.autoBind(`
   *   CREATE (u:User)
   *   SET u = $userProps
   *   RETURN u
   * `, {
   *   userProps: { name: 'John', email: 'john@example.com', age: 30 }
   * });
   * ```
   *
   * @example With optional values
   * ```typescript
   * const { query, params } = ParameterBindingUtility.autoBind(`
   *   MATCH (u:User {id: $userId})
   *   SET u.name = $name
   *   ${email ? 'SET u.email = $email' : ''}
   *   RETURN u
   * `, {
   *   userId: '123',
   *   name: 'John',
   *   email: email || undefined // Will be skipped if undefined
   * });
   * ```
   */
  static autoBind(
    cypher: string,
    data: Record<string, any>,
    options?: {
      skipUndefined?: boolean; // Default: true
      convertDates?: boolean; // Default: false (dates should be pre-converted)
    }
  ): { query: string; params: Record<string, any> } {
    const bindParam = new BindParam();
    const skipUndefined = options?.skipUndefined ?? true;

    // Extract all $paramName patterns from the query
    const paramPattern = /\$(\w+)/g;
    const matches = [...cypher.matchAll(paramPattern)];
    const paramNames = [...new Set(matches.map((m) => m[1]))];

    // Build mapping of original param names to unique bound names
    const paramMapping: Record<string, string> = {};

    for (const paramName of paramNames) {
      let value = data[paramName];

      // Skip undefined values if configured
      if (skipUndefined && value === undefined) {
        continue;
      }

      // Ensure integer values are wrapped with neo4j.int().
      // The Neo4j driver sends plain JS numbers as Float64 (e.g., 50 → 50.0),
      // which Neo4j rejects for LIMIT/SKIP. neo4j.int() ensures proper
      // integer transmission via the Bolt protocol.
      if (typeof value === 'number' && Number.isInteger(value)) {
        value = int(value);
      }

      // Add parameter with unique name generation
      const uniqueName = bindParam.getUniqueNameAndAdd(paramName, value);
      paramMapping[paramName] = uniqueName;
    }

    // Replace $paramName with $uniqueName in query
    let finalQuery = cypher;
    for (const [originalName, uniqueName] of Object.entries(paramMapping)) {
      // Only replace if the unique name is different (collision occurred)
      if (originalName !== uniqueName) {
        const regex = new RegExp(`\\$${originalName}\\b`, 'g');
        finalQuery = finalQuery.replace(regex, `$${uniqueName}`);
      }
    }

    return {
      query: finalQuery,
      params: bindParam.get(),
    };
  }

  /**
   * SMART BUILDER: Create a fluent query builder with auto parameter binding
   *
   * Provides a type-safe, chainable API for building complex Cypher queries.
   * All parameters are automatically bound internally.
   *
   * @returns SmartQueryBuilder instance
   *
   * @example
   * ```typescript
   * const qb = ParameterBindingUtility.smartBuilder();
   * const { cypher, params } = qb
   *   .match('(u:User)', { id: userId })
   *   .where({ 'u.active': true })
   *   .set('u', { lastLogin: new Date().toISOString() })
   *   .return('u')
   *   .build();
   * ```
   */
  static smartBuilder(): SmartQueryBuilder {
    return new SmartQueryBuilder();
  }

  // ============================================================================
  // LEGACY APIS: Kept for backward compatibility
  // ============================================================================

  /**
   * @deprecated Use autoBind or smartBuilder instead
   * Legacy method for single parameter binding
   */
  static addParam(bindParam: BindParam, key: string, value: any): string {
    return bindParam.getUniqueNameAndAdd(key, value);
  }

  /**
   * @deprecated Use autoBind or smartBuilder instead
   * Legacy method for multiple parameter binding
   */
  static addParams(
    bindParam: BindParam,
    params: Record<string, any>
  ): Record<string, string> {
    const paramNames: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        paramNames[key] = bindParam.getUniqueNameAndAdd(key, value);
      }
    }
    return paramNames;
  }

  /**
   * @deprecated Use autoBind with skipUndefined option instead
   * Legacy method for optional parameter binding
   */
  static addOptionalParam(
    bindParam: BindParam,
    key: string,
    value: any
  ): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    return bindParam.getUniqueNameAndAdd(key, value);
  }
}

/**
 * Smart Query Builder
 *
 * Fluent API for building Cypher queries with automatic parameter binding.
 * All property values are automatically bound as parameters.
 */
export class SmartQueryBuilder {
  private bindParam: BindParam;
  private queryParts: string[];

  constructor() {
    this.bindParam = new BindParam();
    this.queryParts = [];
  }

  /**
   * MERGE clause with optional properties
   *
   * @example
   * ```typescript
   * qb.merge('(u:User)', { id: '123' })
   * // MERGE (u:User {id: $id})
   * ```
   */
  merge(pattern: string, properties?: Record<string, any>): this {
    if (properties && Object.keys(properties).length > 0) {
      const propString = this._buildPropertyString(properties);
      // Extract node/relationship pattern and inject properties
      const withProps = pattern.replace(/(\([^)]*\)|\[[^\]]*\])/, (match) => {
        // If pattern already has properties, append
        if (match.includes('{')) {
          return match.replace('}', `, ${propString}}`);
        }
        // Otherwise, add properties before closing
        return match.slice(0, -1) + ` {${propString}}` + match.slice(-1);
      });
      this.queryParts.push(`MERGE ${withProps}`);
    } else {
      this.queryParts.push(`MERGE ${pattern}`);
    }
    return this;
  }

  /**
   * CREATE clause with optional properties
   *
   * @example
   * ```typescript
   * qb.create('(u:User)', { name: 'John', email: 'john@example.com' })
   * // CREATE (u:User {name: $name, email: $email})
   * ```
   */
  create(pattern: string, properties?: Record<string, any>): this {
    if (properties && Object.keys(properties).length > 0) {
      const propString = this._buildPropertyString(properties);
      const withProps = pattern.replace(/(\([^)]*\)|\[[^\]]*\])/, (match) => {
        if (match.includes('{')) {
          return match.replace('}', `, ${propString}}`);
        }
        return match.slice(0, -1) + ` {${propString}}` + match.slice(-1);
      });
      this.queryParts.push(`CREATE ${withProps}`);
    } else {
      this.queryParts.push(`CREATE ${pattern}`);
    }
    return this;
  }

  /**
   * MATCH clause with optional properties
   *
   * @example
   * ```typescript
   * qb.match('(u:User)', { active: true })
   * // MATCH (u:User {active: $active})
   * ```
   */
  match(pattern: string, properties?: Record<string, any>): this {
    if (properties && Object.keys(properties).length > 0) {
      const propString = this._buildPropertyString(properties);
      const withProps = pattern.replace(/(\([^)]*\)|\[[^\]]*\])/, (match) => {
        if (match.includes('{')) {
          return match.replace('}', `, ${propString}}`);
        }
        return match.slice(0, -1) + ` {${propString}}` + match.slice(-1);
      });
      this.queryParts.push(`MATCH ${withProps}`);
    } else {
      this.queryParts.push(`MATCH ${pattern}`);
    }
    return this;
  }

  /**
   * SET clause with properties
   *
   * @example Single variable
   * ```typescript
   * qb.set('u', { name: 'John', age: 30 })
   * // SET u.name = $name, u.age = $age
   * ```
   *
   * @example Multiple variables
   * ```typescript
   * qb.set({ 'u.name': 'John', 'v.age': 30 })
   * // SET u.name = $u_name, v.age = $v_age
   * ```
   */
  set(
    varOrProps: string | Record<string, any>,
    properties?: Record<string, any>
  ): this {
    if (typeof varOrProps === 'string' && properties) {
      // SET variable.prop = $param format
      const setParts = Object.entries(properties).map(([key, value]) => {
        const paramKey = `${varOrProps}_${key}`;
        const paramName = this.bindParam.getUniqueNameAndAdd(paramKey, value);
        return `${varOrProps}.${key} = $${paramName}`;
      });
      this.queryParts.push(`SET ${setParts.join(', ')}`);
    } else if (typeof varOrProps === 'object') {
      // SET var.prop = $param format from object
      const setParts = Object.entries(varOrProps).map(([fullPath, value]) => {
        const paramKey = fullPath.replace('.', '_');
        const paramName = this.bindParam.getUniqueNameAndAdd(paramKey, value);
        return `${fullPath} = $${paramName}`;
      });
      this.queryParts.push(`SET ${setParts.join(', ')}`);
    }
    return this;
  }

  /**
   * WHERE clause with conditions
   *
   * @example
   * ```typescript
   * qb.where({ 'u.age': 30, 'u.active': true })
   * // WHERE u.age = $u_age AND u.active = $u_active
   * ```
   */
  where(conditions: Record<string, any>): this {
    const whereParts = Object.entries(conditions).map(([path, value]) => {
      const paramKey = path.replace('.', '_');
      const paramName = this.bindParam.getUniqueNameAndAdd(paramKey, value);
      return `${path} = $${paramName}`;
    });
    this.queryParts.push(`WHERE ${whereParts.join(' AND ')}`);
    return this;
  }

  /**
   * WITH clause
   *
   * @example
   * ```typescript
   * qb.with('u', 'COUNT(r) as relationshipCount')
   * // WITH u, COUNT(r) as relationshipCount
   * ```
   */
  with(...variables: string[]): this {
    this.queryParts.push(`WITH ${variables.join(', ')}`);
    return this;
  }

  /**
   * RETURN clause
   *
   * @example
   * ```typescript
   * qb.return('u', 'COUNT(r) as count')
   * // RETURN u, COUNT(r) as count
   * ```
   */
  return(...columns: string[]): this {
    this.queryParts.push(`RETURN ${columns.join(', ')}`);
    return this;
  }

  /**
   * ORDER BY clause
   *
   * @example
   * ```typescript
   * qb.orderBy('u.name ASC', 'u.createdAt DESC')
   * // ORDER BY u.name ASC, u.createdAt DESC
   * ```
   */
  orderBy(...expressions: string[]): this {
    this.queryParts.push(`ORDER BY ${expressions.join(', ')}`);
    return this;
  }

  /**
   * LIMIT clause
   *
   * @example
   * ```typescript
   * qb.limit(10)
   * // LIMIT 10
   * ```
   */
  limit(count: number): this {
    // Wrap plain JS integers with neo4j.int() to prevent Float64 transmission.
    // The Neo4j driver sends plain numbers as Float64 (e.g., 50 → 50.0),
    // which Neo4j rejects for LIMIT. neo4j.int() ensures proper integer via Bolt.
    const value = isInt(count)
      ? count
      : typeof count === 'number' && Number.isInteger(count)
      ? int(count)
      : count;
    const paramName = this.bindParam.getUniqueNameAndAdd('limit', value);
    this.queryParts.push(`LIMIT $${paramName}`);
    return this;
  }

  /**
   * SKIP clause
   *
   * @example
   * ```typescript
   * qb.skip(20)
   * // SKIP 20
   * ```
   */
  skip(count: number): this {
    // Wrap plain JS integers with neo4j.int() to prevent Float64 transmission.
    // The Neo4j driver sends plain numbers as Float64 (e.g., 20 → 20.0),
    // which Neo4j rejects for SKIP. neo4j.int() ensures proper integer via Bolt.
    const value = isInt(count)
      ? count
      : typeof count === 'number' && Number.isInteger(count)
      ? int(count)
      : count;
    const paramName = this.bindParam.getUniqueNameAndAdd('skip', value);
    this.queryParts.push(`SKIP $${paramName}`);
    return this;
  }

  /**
   * Raw Cypher clause (for custom operations)
   *
   * @example
   * ```typescript
   * qb.raw('ON CREATE SET u.createdAt = datetime()')
   * ```
   */
  raw(cypher: string): this {
    this.queryParts.push(cypher);
    return this;
  }

  /**
   * Build final query and parameters
   *
   * @returns Object with cypher query and bound parameters
   */
  build(): { cypher: string; params: Record<string, any> } {
    return {
      cypher: this.queryParts.join('\n'),
      params: this.bindParam.get(),
    };
  }

  /**
   * Helper: Build property string for node/relationship patterns
   * @private
   */
  private _buildPropertyString(properties: Record<string, any>): string {
    return Object.entries(properties)
      .map(([key, value]) => {
        const paramName = this.bindParam.getUniqueNameAndAdd(key, value);
        return `${key}: $${paramName}`;
      })
      .join(', ');
  }
}
