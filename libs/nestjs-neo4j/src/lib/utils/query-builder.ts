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
    this.parts.push(`ORDER BY ${expression}${direction ? ` ${direction}` : ''}`);
    return this;
  }

  skip(count: number): this {
    const paramName = `skip_${this.paramCounter++}`;
    this.parts.push(`SKIP $${paramName}`);
    this.parameters[paramName] = count;
    return this;
  }

  limit(count: number): this {
    const paramName = `limit_${this.paramCounter++}`;
    this.parts.push(`LIMIT $${paramName}`);
    this.parameters[paramName] = count;
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
    this.parameters[name] = value;
    return this;
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
}

// Helper function to create a new query builder
export function cypher(): CypherQueryBuilder {
  return new CypherQueryBuilder();
}