export class CypherQueryBuilder {
  private parts: string[] = [];
  private parameters: Record<string, unknown> = {};
  private paramCounter = 0;

  public match(pattern: string): this {
    this.parts.push(`MATCH ${pattern}`);
    return this;
  }

  public optionalMatch(pattern: string): this {
    this.parts.push(`OPTIONAL MATCH ${pattern}`);
    return this;
  }

  public where(condition: string, params?: Record<string, unknown>): this {
    this.parts.push(`WHERE ${condition}`);
    if (params) {
      Object.assign(this.parameters, params);
    }
    return this;
  }

  public andWhere(condition: string, params?: Record<string, unknown>): this {
    const lastPart = this.parts[this.parts.length - 1];
    if (lastPart?.startsWith('WHERE')) {
      this.parts[this.parts.length - 1] = `${lastPart} AND ${condition}`;
    } else {
      this.where(condition, params);
    }
    if (params) {
      Object.assign(this.parameters, params);
    }
    return this;
  }

  public orWhere(condition: string, params?: Record<string, unknown>): this {
    const lastPart = this.parts[this.parts.length - 1];
    if (lastPart?.startsWith('WHERE')) {
      this.parts[this.parts.length - 1] = `${lastPart} OR ${condition}`;
    } else {
      this.where(condition, params);
    }
    if (params) {
      Object.assign(this.parameters, params);
    }
    return this;
  }

  public create(pattern: string, params?: Record<string, unknown>): this {
    this.parts.push(`CREATE ${pattern}`);
    if (params) {
      Object.assign(this.parameters, params);
    }
    return this;
  }

  public merge(pattern: string, params?: Record<string, unknown>): this {
    this.parts.push(`MERGE ${pattern}`);
    if (params) {
      Object.assign(this.parameters, params);
    }
    return this;
  }

  public onCreate(set: string): this {
    this.parts.push(`ON CREATE SET ${set}`);
    return this;
  }

  public onMatch(set: string): this {
    this.parts.push(`ON MATCH SET ${set}`);
    return this;
  }

  public set(expression: string, params?: Record<string, unknown>): this {
    this.parts.push(`SET ${expression}`);
    if (params) {
      Object.assign(this.parameters, params);
    }
    return this;
  }

  public delete(variables: string | string[]): this {
    const vars = Array.isArray(variables) ? variables.join(', ') : variables;
    this.parts.push(`DELETE ${vars}`);
    return this;
  }

  public detachDelete(variables: string | string[]): this {
    const vars = Array.isArray(variables) ? variables.join(', ') : variables;
    this.parts.push(`DETACH DELETE ${vars}`);
    return this;
  }

  public remove(expression: string): this {
    this.parts.push(`REMOVE ${expression}`);
    return this;
  }

  public with(variables: string | string[]): this {
    const vars = Array.isArray(variables) ? variables.join(', ') : variables;
    this.parts.push(`WITH ${vars}`);
    return this;
  }

  public orderBy(expression: string, direction?: 'ASC' | 'DESC'): this {
    this.parts.push(`ORDER BY ${expression}${direction ? ` ${direction}` : ''}`);
    return this;
  }

  public skip(count: number): this {
    const paramName = `skip_${this.paramCounter}`;
    this.paramCounter += 1;
    this.parts.push(`SKIP $${paramName}`);
    this.parameters[paramName] = count;
    return this;
  }

  public limit(count: number): this {
    const paramName = `limit_${this.paramCounter}`;
    this.paramCounter += 1;
    this.parts.push(`LIMIT $${paramName}`);
    this.parameters[paramName] = count;
    return this;
  }

  public return(expression: string): this {
    this.parts.push(`RETURN ${expression}`);
    return this;
  }

  public returnDistinct(expression: string): this {
    this.parts.push(`RETURN DISTINCT ${expression}`);
    return this;
  }

  public union(): this {
    this.parts.push('UNION');
    return this;
  }

  public unionAll(): this {
    this.parts.push('UNION ALL');
    return this;
  }

  public call(procedure: string, params?: Record<string, unknown>): this {
    this.parts.push(`CALL ${procedure}`);
    if (params) {
      Object.assign(this.parameters, params);
    }
    return this;
  }

  public yield(variables: string | string[]): this {
    const vars = Array.isArray(variables) ? variables.join(', ') : variables;
    this.parts.push(`YIELD ${vars}`);
    return this;
  }

  public unwind(expression: string, as: string): this {
    this.parts.push(`UNWIND ${expression} AS ${as}`);
    return this;
  }

  public foreach(variable: string, list: string, update: string): this {
    this.parts.push(`FOREACH (${variable} IN ${list} | ${update})`);
    return this;
  }

  public raw(queryString: string, params?: Record<string, unknown>): this {
    this.parts.push(queryString);
    if (params) {
      Object.assign(this.parameters, params);
    }
    return this;
  }

  public addParameter(name: string, value: unknown): this {
    this.parameters[name] = value;
    return this;
  }

  public build(): { cypher: string; parameters: Record<string, unknown> } {
    return {
      cypher: this.parts.join('\n'),
      parameters: this.parameters,
    };
  }

  public toString(): string {
    return this.parts.join('\n');
  }

  public getParameters(): Record<string, unknown> {
    return { ...this.parameters };
  }
}

// Helper function to create a new query builder
export function cypher(): CypherQueryBuilder {
  return new CypherQueryBuilder();
}