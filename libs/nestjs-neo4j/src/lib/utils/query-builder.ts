import { int } from 'neo4j-driver';

export class CypherQueryBuilder {
  private parts: string[] = [];
  private parameters: Record<string, any> = {};
  private paramCounter = 0;

  match(pattern: string): this {
    this.parts.push(`MATCH ${pattern}`);
    return this;
  }

  optionalMatch(pattern: string): this {
    this.parts.push(`OPTIONAL MATCH ${pattern}`);
    return this;
  }

  where(condition: string, params?: Record<string, any>): this {
    this.parts.push(`WHERE ${condition}`);
    if (params) {
      Object.assign(this.parameters, params);
    }
    return this;
  }

  andWhere(condition: string, params?: Record<string, any>): this {
    const lastPart = this.parts[this.parts.length - 1];
    if (lastPart && lastPart.startsWith('WHERE')) {
      this.parts[this.parts.length - 1] = `${lastPart} AND ${condition}`;
    } else {
      this.where(condition, params);
    }
    if (params) {
      Object.assign(this.parameters, params);
    }
    return this;
  }

  orWhere(condition: string, params?: Record<string, any>): this {
    const lastPart = this.parts[this.parts.length - 1];
    if (lastPart && lastPart.startsWith('WHERE')) {
      this.parts[this.parts.length - 1] = `${lastPart} OR ${condition}`;
    } else {
      this.where(condition, params);
    }
    if (params) {
      Object.assign(this.parameters, params);
    }
    return this;
  }

  create(pattern: string, params?: Record<string, any>): this {
    this.parts.push(`CREATE ${pattern}`);
    if (params) {
      Object.assign(this.parameters, params);
    }
    return this;
  }

  merge(pattern: string, params?: Record<string, any>): this {
    this.parts.push(`MERGE ${pattern}`);
    if (params) {
      Object.assign(this.parameters, params);
    }
    return this;
  }

  onCreate(set: string): this {
    this.parts.push(`ON CREATE SET ${set}`);
    return this;
  }

  onMatch(set: string): this {
    this.parts.push(`ON MATCH SET ${set}`);
    return this;
  }

  set(expression: string, params?: Record<string, any>): this {
    this.parts.push(`SET ${expression}`);
    if (params) {
      Object.assign(this.parameters, params);
    }
    return this;
  }

  delete(variables: string | string[]): this {
    const vars = Array.isArray(variables) ? variables.join(', ') : variables;
    this.parts.push(`DELETE ${vars}`);
    return this;
  }

  detachDelete(variables: string | string[]): this {
    const vars = Array.isArray(variables) ? variables.join(', ') : variables;
    this.parts.push(`DETACH DELETE ${vars}`);
    return this;
  }

  remove(expression: string): this {
    this.parts.push(`REMOVE ${expression}`);
    return this;
  }

  with(variables: string | string[]): this {
    const vars = Array.isArray(variables) ? variables.join(', ') : variables;
    this.parts.push(`WITH ${vars}`);
    return this;
  }

  orderBy(expression: string, direction?: 'ASC' | 'DESC'): this {
    this.parts.push(
      `ORDER BY ${expression}${direction ? ` ${direction}` : ''}`
    );
    return this;
  }

  skip(count: number): this {
    const paramName = `skip_${this.paramCounter++}`;
    this.parts.push(`SKIP $${paramName}`);
    this.parameters[paramName] = int(Math.floor(count));
    return this;
  }

  limit(count: number): this {
    const paramName = `limit_${Math.floor(this.paramCounter++)}`;
    this.parts.push(`LIMIT $${paramName}`);
    this.parameters[paramName] = int(Math.floor(count));
    return this;
  }

  return(expression: string): this {
    this.parts.push(`RETURN ${expression}`);
    return this;
  }

  returnDistinct(expression: string): this {
    this.parts.push(`RETURN DISTINCT ${expression}`);
    return this;
  }

  union(): this {
    this.parts.push('UNION');
    return this;
  }

  unionAll(): this {
    this.parts.push('UNION ALL');
    return this;
  }

  call(procedure: string, params?: Record<string, any>): this {
    this.parts.push(`CALL ${procedure}`);
    if (params) {
      Object.assign(this.parameters, params);
    }
    return this;
  }

  yield(variables: string | string[]): this {
    const vars = Array.isArray(variables) ? variables.join(', ') : variables;
    this.parts.push(`YIELD ${vars}`);
    return this;
  }

  unwind(expression: string, as: string): this {
    this.parts.push(`UNWIND ${expression} AS ${as}`);
    return this;
  }

  foreach(variable: string, list: string, update: string): this {
    this.parts.push(`FOREACH (${variable} IN ${list} | ${update})`);
    return this;
  }

  raw(cypher: string, params?: Record<string, any>): this {
    this.parts.push(cypher);
    if (params) {
      Object.assign(this.parameters, params);
    }
    return this;
  }

  addParameter(name: string, value: any): this {
    this.parameters[name] = this.processParameterValue(value);
    return this;
  }

  /**
   * Add a parameter with automatic Neo4j-safe processing
   * @param name Parameter name
   * @param value Parameter value (will be automatically processed for Neo4j compatibility)
   */
  addSafeParameter(name: string, value: any): this {
    this.parameters[name] = this.processParameterValue(value, true);
    return this;
  }

  /**
   * Add multiple parameters at once with automatic processing
   * @param params Object containing parameters to add
   * @param safe Whether to apply Neo4j-safe processing (default: false for backward compatibility)
   */
  addParameters(params: Record<string, any>, safe = false): this {
    Object.entries(params).forEach(([key, value]) => {
      this.parameters[key] = this.processParameterValue(value, safe);
    });
    return this;
  }

  /**
   * Process a parameter value for Neo4j compatibility
   * @private
   */
  private processParameterValue(value: any, safe = false): any {
    if (value === null || value === undefined) {
      return value;
    }

    // Handle dates
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Handle numbers - wrap integers with int()
    if (typeof value === 'number' && Number.isInteger(value)) {
      return int(value);
    }

    // Handle arrays
    if (Array.isArray(value)) {
      const processed = value.map((item) =>
        this.processParameterValue(item, safe)
      );
      // If safe mode and contains complex objects, serialize the whole array
      if (
        safe &&
        value.some(
          (item) =>
            item !== null && typeof item === 'object' && !(item instanceof Date)
        )
      ) {
        return JSON.stringify(processed);
      }
      return processed;
    }

    // Handle objects
    if (typeof value === 'object' && value !== null) {
      const processed: any = {};
      for (const [key, val] of Object.entries(value)) {
        processed[key] = this.processParameterValue(val, safe);
      }

      // If safe mode and object is complex, serialize it
      if (safe && this.isComplexObject(value)) {
        return JSON.stringify(processed);
      }
      return processed;
    }

    return value;
  }

  /**
   * Check if object is complex enough to warrant serialization
   * @private
   */
  private isComplexObject(obj: any): boolean {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return false;
    }

    return Object.values(obj).some(
      (value) =>
        value !== null && (typeof value === 'object' || Array.isArray(value))
    );
  }

  build(): { cypher: string; parameters: Record<string, any> } {
    return {
      cypher: this.parts.join('\n'),
      parameters: this.parameters,
    };
  }

  toString(): string {
    return this.parts.join('\n');
  }

  getParameters(): Record<string, any> {
    return { ...this.parameters };
  }

  /**
   * Build with automatic parameter validation and processing
   * @param safe Whether to apply Neo4j-safe processing to all parameters
   */
  buildSafe(safe = true): { cypher: string; parameters: Record<string, any> } {
    // Reprocess all parameters with safe mode if requested
    const processedParameters = safe
      ? Object.fromEntries(
          Object.entries(this.parameters).map(([key, value]) => [
            key,
            this.processParameterValue(value, true),
          ])
        )
      : this.parameters;

    return {
      cypher: this.parts.join('\n'),
      parameters: processedParameters,
    };
  }

  /**
   * Add a node creation pattern with automatic parameter handling
   * @example
   * ```typescript
   * cypher()
   *   .createNode('User', { id: 'user123', metadata: complexObject })
   *   .return('u')
   *   .buildSafe();
   * ```
   */
  createNode(
    label: string,
    properties: Record<string, any>,
    variable = 'n'
  ): this {
    const paramName = `${variable}_props_${this.paramCounter++}`;
    this.create(`(${variable}:${label} $${paramName})`);
    this.addSafeParameter(paramName, properties);
    return this;
  }

  /**
   * Add a relationship creation pattern with automatic parameter handling
   */
  createRelationship(
    fromVar: string,
    relationshipType: string,
    toVar: string,
    properties?: Record<string, any>,
    relVar = 'r'
  ): this {
    if (properties) {
      const paramName = `${relVar}_props_${this.paramCounter++}`;
      this.create(
        `(${fromVar})-[${relVar}:${relationshipType} $${paramName}]->(${toVar})`
      );
      this.addSafeParameter(paramName, properties);
    } else {
      this.create(`(${fromVar})-[${relVar}:${relationshipType}]->(${toVar})`);
    }
    return this;
  }

  /**
   * Add a merge node pattern with automatic parameter handling
   */
  mergeNode(
    label: string,
    matchProperties: Record<string, any>,
    createProperties?: Record<string, any>,
    variable = 'n'
  ): this {
    const matchParamName = `${variable}_match_${this.paramCounter++}`;
    this.merge(`(${variable}:${label} $${matchParamName})`);
    this.addSafeParameter(matchParamName, matchProperties);

    if (createProperties) {
      const createParamName = `${variable}_create_${this.paramCounter++}`;
      this.onCreate(`${variable} += $${createParamName}`);
      this.addSafeParameter(createParamName, createProperties);
    }

    return this;
  }

  /**
   * Add pagination with proper int() wrapping
   */
  paginate(offset: number, limit: number): this {
    return this.skip(offset).limit(limit);
  }
}

// Helper function to create a new query builder
export function cypher(): CypherQueryBuilder {
  return new CypherQueryBuilder();
}

// Helper function to create a query builder with safe mode enabled by default
export function safeCypher(): CypherQueryBuilder {
  const builder = new CypherQueryBuilder();
  // Override addParameter to always use safe mode
  const originalAddParameter = builder.addParameter.bind(builder);
  builder.addParameter = function (name: string, value: any) {
    return builder.addSafeParameter(name, value);
  };
  return builder;
}

/**
 * Common query templates for standard operations
 */
export class Neo4jQueryTemplates {
  /**
   * Create a user node with metadata serialization
   */
  static createUser(userData: any): {
    cypher: string;
    parameters: Record<string, any>;
  } {
    return cypher().createNode('User', userData, 'u').return('u').buildSafe();
  }

  /**
   * Find nodes by properties with automatic serialization
   */
  static findByProperties(
    label: string,
    properties: Record<string, any>,
    limit?: number
  ): { cypher: string; parameters: Record<string, any> } {
    const builder = cypher().match(`(n:${label} $props)`);

    if (limit) {
      builder.limit(limit);
    }

    return builder
      .addSafeParameter('props', properties)
      .return('n')
      .buildSafe();
  }

  /**
   * Update node properties with merge semantics
   */
  static updateNode(
    label: string,
    id: string | number,
    updates: Record<string, any>
  ): { cypher: string; parameters: Record<string, any> } {
    return cypher()
      .match('(n:' + label + ' {id: $id})')
      .set('n += $updates')
      .addParameter('id', id)
      .addSafeParameter('updates', updates)
      .return('n')
      .buildSafe();
  }

  /**
   * Create relationship between two nodes
   */
  static createRelationship(
    fromLabel: string,
    fromId: string | number,
    relationshipType: string,
    toLabel: string,
    toId: string | number,
    relationshipProperties?: Record<string, any>
  ): { cypher: string; parameters: Record<string, any> } {
    const builder = cypher()
      .match(`(from:${fromLabel} {id: $fromId})`)
      .match(`(to:${toLabel} {id: $toId})`)
      .addParameter('fromId', fromId)
      .addParameter('toId', toId);

    if (relationshipProperties) {
      builder.create(`(from)-[r:${relationshipType} $relProps]->(to)`);
      builder.addSafeParameter('relProps', relationshipProperties);
      builder.return('from, r, to');
    } else {
      builder.create(`(from)-[r:${relationshipType}]->(to)`);
      builder.return('from, r, to');
    }

    return builder.buildSafe();
  }
}
