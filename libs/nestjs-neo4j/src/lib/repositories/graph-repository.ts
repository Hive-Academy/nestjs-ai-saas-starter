import { BaseRepository, type RepositoryQueryOptions } from './base-repository';

/**
 * Graph traversal options
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
  nodeFilter?: Record<string, any>;
  /** Filter conditions for relationships */
  relationshipFilter?: Record<string, any>;
  /** Include relationship data in results */
  includeRelationships?: boolean;
  /** Include path information */
  includePaths?: boolean;
}

/**
 * Shortest path options
 */
export interface ShortestPathOptions {
  /** Maximum path length */
  maxLength?: number;
  /** Relationship types to consider */
  relationshipTypes?: string[];
  /** Direction of relationships */
  direction?: 'IN' | 'OUT' | 'BOTH';
  /** Weight property for weighted shortest path */
  weightProperty?: string;
}

/**
 * Clustering options
 */
export interface ClusteringOptions {
  /** Algorithm to use */
  algorithm?: 'louvain' | 'labelPropagation' | 'weaklyConnectedComponents';
  /** Relationship types to consider */
  relationshipTypes?: string[];
  /** Weight property */
  weightProperty?: string;
  /** Maximum iterations */
  maxIterations?: number;
  /** Tolerance for convergence */
  tolerance?: number;
}

/**
 * Graph pattern for pattern matching
 */
export interface GraphPattern {
  /** Nodes in the pattern */
  nodes: Array<{
    variable: string;
    labels?: string[];
    properties?: Record<string, any>;
  }>;
  /** Relationships in the pattern */
  relationships: Array<{
    type: string;
    direction: 'IN' | 'OUT' | 'BOTH';
    source: string;
    target: string;
    properties?: Record<string, any>;
  }>;
}

/**
 *  repository for graph-specific operations
 *
 * This class extends BaseRepository with graph database specific functionality:
 * - Graph traversals and path finding
 * - Relationship management
 * - Pattern matching
 * - Graph algorithms integration
 * - Centrality calculations
 * - Community detection
 *
 * @template T The entity type this repository manages
 */
export abstract class GraphRepository<T = any> extends BaseRepository<T> {
  /**
   * Find all neighbors of a node
   */
  async findNeighbors(
    nodeId: string,
    options?: GraphTraversalOptions & RepositoryQueryOptions
  ): Promise<T[]> {
    const relationshipTypes = options?.relationshipTypes || ['*'];
    const typeFilter =
      relationshipTypes.length === 1 && relationshipTypes[0] === '*'
        ? ''
        : `:${relationshipTypes.join('|')}`;

    const direction = this.getRelationshipDirection(options?.direction);
    const maxDepth = options?.maxDepth || 1;

    const query = `
      MATCH (source:${this.entityLabel} {id: $nodeId})
      ${direction.replace('REL', `r${typeFilter}`)}
      (neighbor:${this.entityLabel})
      WHERE neighbor.id <> $nodeId
      ${this.buildNodeFilter(options?.nodeFilter, 'neighbor')}
      ${this.buildRelationshipFilter(options?.relationshipFilter, 'r')}
      ${this.buildSoftDeleteFilter(options, 'neighbor')}
      RETURN DISTINCT neighbor
      LIMIT ${maxDepth * 100}
    `;

    const result = await this.executeQuery<T>(query, { nodeId }, options);
    return result.map((record) => this.mapFromNeo4j(record));
  }

  /**
   * Find shortest path between two nodes
   */
  async findShortestPath(
    fromId: string,
    toId: string,
    options?: ShortestPathOptions & RepositoryQueryOptions
  ): Promise<{
    path: Array<{ node: T; relationship?: any }>;
    length: number;
    weight?: number;
  } | null> {
    const relationshipTypes = options?.relationshipTypes || ['*'];
    // const typeFilter =
    //   relationshipTypes.length === 1 && relationshipTypes[0] === '*'
    //     ? ''
    //     : `|${relationshipTypes.join('|')}`;

    const maxLength = options?.maxLength || 10;
    const weightClause = options?.weightProperty
      ? `, {weightProperty: '${options.weightProperty}'}`
      : '';

    const query = `
      MATCH (start:${this.entityLabel} {id: $fromId}), (end:${
      this.entityLabel
    } {id: $toId})
      CALL gds.shortestPath.dijkstra.stream({
        sourceNode: start,
        targetNode: end,
        relationshipTypes: [${relationshipTypes
          .map((t) => `'${t}'`)
          .join(', ')}],
        maxDepth: ${maxLength}
        ${weightClause}
      })
      YIELD index, sourceNode, targetNode, totalCost, nodeIds, costs, path
      RETURN path, totalCost as weight, length(path) as length
    `;

    try {
      const result = await this.executeQuery<{
        path: any;
        weight: number;
        length: number;
      }>(query, { fromId, toId }, options);

      if (result.length === 0) {
        return null;
      }

      const pathData = result[0];
      // Transform path data to our format
      const pathNodes = this.extractPathNodes(pathData.path);

      return {
        path: pathNodes,
        length: pathData.length,
        weight: pathData.weight,
      };
    } catch (error) {
      // Fallback to basic shortest path if GDS is not available
      return this.findShortestPathBasic(fromId, toId, options);
    }
  }

  /**
   * Find all paths between two nodes
   */
  async findAllPaths(
    fromId: string,
    toId: string,
    options?: ShortestPathOptions & RepositoryQueryOptions
  ): Promise<
    Array<{
      path: Array<{ node: T; relationship?: any }>;
      length: number;
    }>
  > {
    const relationshipTypes = options?.relationshipTypes || ['*'];
    const typeFilter =
      relationshipTypes.length === 1 && relationshipTypes[0] === '*'
        ? '*'
        : relationshipTypes.join('|');

    const maxLength = options?.maxLength || 5;

    const query = `
      MATCH path = (start:${this.entityLabel} {id: $fromId})
      -[*1..${maxLength}:${typeFilter}]-
      (end:${this.entityLabel} {id: $toId})
      WHERE start <> end
      RETURN path, length(path) as pathLength
      ORDER BY pathLength
      LIMIT 100
    `;

    const result = await this.executeQuery<{
      path: any;
      pathLength: number;
    }>(query, { fromId, toId }, options);

    return result.map((record) => ({
      path: this.extractPathNodes(record.path),
      length: record.pathLength,
    }));
  }

  /**
   * Find nodes within a certain distance
   */
  async findWithinDistance(
    nodeId: string,
    distance: number,
    options?: GraphTraversalOptions & RepositoryQueryOptions
  ): Promise<Array<{ node: T; distance: number }>> {
    const relationshipTypes = options?.relationshipTypes || ['*'];
    const typeFilter =
      relationshipTypes.length === 1 && relationshipTypes[0] === '*'
        ? '*'
        : relationshipTypes.join('|');

    const query = `
      MATCH (source:${this.entityLabel} {id: $nodeId})
      MATCH path = (source)-[*1..${distance}:${typeFilter}]-(target:${
      this.entityLabel
    })
      WHERE source <> target
      ${this.buildNodeFilter(options?.nodeFilter, 'target')}
      ${this.buildSoftDeleteFilter(options, 'target')}
      RETURN DISTINCT target, length(path) as distance
      ORDER BY distance
    `;

    const result = await this.executeQuery<{
      target: T;
      distance: number;
    }>(query, { nodeId }, options);

    return result.map((record) => ({
      node: this.mapFromNeo4j({ n: record.target }),
      distance: record.distance,
    }));
  }

  /**
   * Find common neighbors between two nodes
   */
  async findCommonNeighbors(
    nodeId1: string,
    nodeId2: string,
    options?: GraphTraversalOptions & RepositoryQueryOptions
  ): Promise<T[]> {
    const relationshipTypes = options?.relationshipTypes || ['*'];
    const typeFilter =
      relationshipTypes.length === 1 && relationshipTypes[0] === '*'
        ? '*'
        : relationshipTypes.join('|');

    const query = `
      MATCH (node1:${
        this.entityLabel
      } {id: $nodeId1})-[:${typeFilter}]-(common:${
      this.entityLabel
    })-[:${typeFilter}]-(node2:${this.entityLabel} {id: $nodeId2})
      WHERE common.id <> $nodeId1 AND common.id <> $nodeId2
      ${this.buildNodeFilter(options?.nodeFilter, 'common')}
      ${this.buildSoftDeleteFilter(options, 'common')}
      RETURN DISTINCT common
    `;

    const result = await this.executeQuery<T>(
      query,
      { nodeId1, nodeId2 },
      options
    );
    return result.map((record) => this.mapFromNeo4j(record));
  }

  /**
   * Calculate degree centrality for a node
   */
  async calculateDegreeCentrality(
    nodeId: string,
    options?: {
      relationshipTypes?: string[];
      direction?: 'IN' | 'OUT' | 'BOTH';
    } & RepositoryQueryOptions
  ): Promise<number> {
    const relationshipTypes = options?.relationshipTypes || ['*'];
    const typeFilter =
      relationshipTypes.length === 1 && relationshipTypes[0] === '*'
        ? ''
        : `:${relationshipTypes.join('|')}`;

    const direction = this.getRelationshipDirection(options?.direction);

    const query = `
      MATCH (node:${this.entityLabel} {id: $nodeId})
      ${direction.replace('REL', `r${typeFilter}`)}
      (neighbor)
      RETURN count(DISTINCT neighbor) as degree
    `;

    const result = await this.executeQuery<{ degree: number }>(
      query,
      { nodeId },
      options
    );
    return result[0]?.degree || 0;
  }

  /**
   * Find connected components
   */
  async findConnectedComponents(
    options?: ClusteringOptions & RepositoryQueryOptions
  ): Promise<Array<{ componentId: string; nodes: T[] }>> {
    const relationshipTypes = options?.relationshipTypes || ['*'];
    const typeFilter =
      relationshipTypes.length === 1 && relationshipTypes[0] === '*'
        ? '*'
        : relationshipTypes.join('|');

    const query = `
      MATCH (n:${this.entityLabel})
      ${this.buildSoftDeleteFilter(options, 'n')}
      CALL gds.wcc.stream({
        nodeQuery: 'MATCH (n:${this.entityLabel}) RETURN id(n) as id',
        relationshipQuery: 'MATCH (n:${
          this.entityLabel
        })-[r:${typeFilter}]-(m:${
      this.entityLabel
    }) RETURN id(n) as source, id(m) as target'
      })
      YIELD nodeId, componentId
      MATCH (node:${this.entityLabel}) WHERE id(node) = nodeId
      RETURN componentId, collect(node) as nodes
    `;

    try {
      const result = await this.executeQuery<{
        componentId: string;
        nodes: T[];
      }>(query, {}, options);

      return result.map((record) => ({
        componentId: record.componentId,
        nodes: record.nodes.map((node) => this.mapFromNeo4j({ n: node })),
      }));
    } catch (error) {
      // Fallback to basic connected components
      return this.findConnectedComponentsBasic(options);
    }
  }

  /**
   * Pattern matching in the graph
   */
  async matchPattern(
    pattern: GraphPattern,
    options?: RepositoryQueryOptions
  ): Promise<Array<Record<string, T>>> {
    const { query, params } = this.buildPatternQuery(pattern);
    const result = await this.executeQuery<Record<string, T>>(
      query,
      params,
      options
    );

    return result.map((record) => {
      const mapped: Record<string, T> = {};
      pattern.nodes.forEach((node) => {
        if (record[node.variable]) {
          mapped[node.variable] = this.mapFromNeo4j({
            n: record[node.variable],
          });
        }
      });
      return mapped;
    });
  }

  /**
   * Build pattern query from graph pattern
   */
  private buildPatternQuery(pattern: GraphPattern): {
    query: string;
    params: Record<string, any>;
  } {
    const nodeVariables = pattern.nodes.map((node) => node.variable);
    const params: Record<string, any> = {};

    // Build node patterns
    pattern.nodes.map((node) => {
      const labels = node.labels
        ? node.labels.map((l) => `:${l}`).join('')
        : `:${this.entityLabel}`;
      let pattern = `(${node.variable}${labels}`;

      if (node.properties && Object.keys(node.properties).length > 0) {
        const propConditions: string[] = [];
        Object.entries(node.properties).forEach(([key, value]) => {
          const paramName = `${node.variable}_${key}`;
          propConditions.push(`${key}: $${paramName}`);
          params[paramName] = value;
        });
        pattern += ` {${propConditions.join(', ')}}`;
      }

      pattern += ')';
      return pattern;
    });

    // Build relationship patterns
    const relationshipPatterns = pattern.relationships.map((rel) => {
      // direction variable not needed because we embed direction in relPattern
      const relPattern =
        rel.direction === 'BOTH'
          ? `-[:${rel.type}]-`
          : rel.direction === 'IN'
          ? `<-[:${rel.type}]-`
          : `-[:${rel.type}]->`;

      return `${rel.source}${relPattern}${rel.target}`;
    });

    // Combine patterns
    const matchClause = `MATCH ${relationshipPatterns.join(', ')}`;
    const returnClause = `RETURN ${nodeVariables.join(', ')}`;

    const query = `${matchClause} ${returnClause}`;

    return { query, params };
  }

  /**
   * Get relationship direction pattern for Cypher
   */
  private getRelationshipDirection(direction?: 'IN' | 'OUT' | 'BOTH'): string {
    switch (direction) {
      case 'IN':
        return '<-[REL]-(';
      case 'OUT':
        return '-[REL]->(';
      case 'BOTH':
      default:
        return '-[REL]-(';
    }
  }

  /**
   * Build node filter clause
   */
  private buildNodeFilter(
    filter?: Record<string, any>,
    nodeVariable = 'n'
  ): string {
    if (!filter || Object.keys(filter).length === 0) {
      return '';
    }

    const conditions = Object.entries(filter).map(
      ([key, value]) => `${nodeVariable}.${key} = ${JSON.stringify(value)}`
    );

    return `AND ${conditions.join(' AND ')}`;
  }

  /**
   * Build relationship filter clause
   */
  private buildRelationshipFilter(
    filter?: Record<string, any>,
    relVariable = 'r'
  ): string {
    if (!filter || Object.keys(filter).length === 0) {
      return '';
    }

    const conditions = Object.entries(filter).map(
      ([key, value]) => `${relVariable}.${key} = ${JSON.stringify(value)}`
    );

    return `AND ${conditions.join(' AND ')}`;
  }

  /**
   * Build soft delete filter for specific node variable
   */
  protected override buildSoftDeleteFilter(
    options?: RepositoryQueryOptions,
    nodeVariable = 'n'
  ): string {
    if (options?.includeSoftDeleted) {
      return '';
    }
    return `AND ${nodeVariable}.deletedAt IS NULL`;
  }

  /**
   * Extract nodes from path object
   */
  private extractPathNodes(path: any): Array<{ node: T; relationship?: any }> {
    if (!path) return [];

    // neo4j-driver Path structure: { start, end, segments, length }
    // Each segment: { start, relationship, end }
    // We will produce an ordered list of nodes; each entry after the first
    // will also carry the relationship that CONNECTS it to the previous node.
    try {
      const segments: any[] = Array.isArray(path.segments) ? path.segments : [];
      if (segments.length === 0) {
        // Single node path (start === end) or empty
        if (path.start) {
          return [
            {
              node: this.mapFromNeo4j({
                n: this.normalizeDriverNode(path.start),
              }),
            },
          ];
        }
        return [];
      }

      const result: Array<{ node: T; relationship?: any }> = [];

      // Push first start node
      const firstStart = segments[0].start;
      result.push({
        node: this.mapFromNeo4j({ n: this.normalizeDriverNode(firstStart) }),
      });

      for (const segment of segments) {
        const rel = segment.relationship;
        const endNode = segment.end;
        result.push({
          node: this.mapFromNeo4j({ n: this.normalizeDriverNode(endNode) }),
          relationship: this.normalizeDriverRelationship(rel),
        });
      }
      return result;
    } catch (e) {
      // Fallback – never throw from helper
      return [];
    }
  }

  /**
   * Basic shortest path fallback
   */
  private async findShortestPathBasic(
    fromId: string,
    toId: string,
    options?: ShortestPathOptions & RepositoryQueryOptions
  ): Promise<{
    path: Array<{ node: T; relationship?: any }>;
    length: number;
  } | null> {
    const maxLength = options?.maxLength || 10;
    const relationshipTypes = options?.relationshipTypes || ['*'];
    const typeFilter =
      relationshipTypes.length === 1 && relationshipTypes[0] === '*'
        ? '*'
        : relationshipTypes.join('|');

    const query = `
      MATCH path = shortestPath((start:${this.entityLabel} {id: $fromId})
      -[*1..${maxLength}:${typeFilter}]-
      (end:${this.entityLabel} {id: $toId}))
      RETURN path, length(path) as pathLength
    `;

    const result = await this.executeQuery<{
      path: any;
      pathLength: number;
    }>(query, { fromId, toId }, options);

    if (result.length === 0) {
      return null;
    }

    return {
      path: this.extractPathNodes(result[0].path),
      length: result[0].pathLength,
    };
  }

  /**
   * Basic connected components fallback
   */
  private async findConnectedComponentsBasic(
    options?: ClusteringOptions & RepositoryQueryOptions
  ): Promise<Array<{ componentId: string; nodes: T[] }>> {
    // Basic (non-GDS) implementation using in-memory DFS/BFS.
    // Strategy:
    // 1. Fetch all nodes of this label (respecting soft-delete filter unless included)
    // 2. Fetch undirected relationships between nodes of this label
    // 3. Build adjacency map and run BFS to collect components

    // Step 1: nodes
    const nodesQuery = `MATCH (n:${this.entityLabel}) ${
      options?.includeSoftDeleted ? '' : 'WHERE n.deletedAt IS NULL'
    } RETURN id(n) as id, n`;
    const relTypes = options?.relationshipTypes || ['*'];
    const relFilter =
      relTypes.length === 1 && relTypes[0] === '*'
        ? ''
        : `AND type(r) IN [${relTypes.map((t) => `'${t}'`).join(', ')}]`;
    const relQuery = `MATCH (a:${this.entityLabel})-[r]-(:${
      this.entityLabel
    }) ${
      options?.includeSoftDeleted ? '' : 'WHERE a.deletedAt IS NULL'
    } ${relFilter} RETURN id(startNode(r)) as source, id(endNode(r)) as target`;

    const nodeRecords = await this.executeQuery<{ id: number; n: any }>(
      nodesQuery,
      {},
      options
    );
    const relRecords = await this.executeQuery<{
      source: number;
      target: number;
    }>(relQuery, {}, options);

    const nodeMap = new Map<number, any>();
    nodeRecords.forEach((rec) => {
      nodeMap.set(rec.id, rec.n);
    });

    // Build adjacency (undirected)
    const adjacency = new Map<number, Set<number>>();
    const ensure = (id: number) => {
      if (!adjacency.has(id)) adjacency.set(id, new Set());
      return adjacency.get(id)!;
    };
    nodeMap.forEach((_, id) => ensure(id));
    relRecords.forEach(({ source, target }) => {
      ensure(source).add(target);
      ensure(target).add(source);
    });

    const visited = new Set<number>();
    const components: Array<{ componentId: string; nodes: T[] }> = [];
    let idx = 0;

    for (const id of nodeMap.keys()) {
      if (visited.has(id)) continue;
      idx++;
      const queue = [id];
      visited.add(id);
      const componentNodeIds: number[] = [];
      while (queue.length) {
        const current = queue.shift()!;
        componentNodeIds.push(current);
        const neighbors = adjacency.get(current);
        if (neighbors) {
          for (const nb of neighbors) {
            if (!visited.has(nb)) {
              visited.add(nb);
              queue.push(nb);
            }
          }
        }
      }
      const nodes = componentNodeIds.map((nid) =>
        this.mapFromNeo4j({ n: nodeMap.get(nid) })
      );
      components.push({ componentId: `component-${idx}`, nodes });
    }

    return components;
  }

  /**
   * Normalize a neo4j Node into a plain object preserving id & labels.
   */
  private normalizeDriverNode(node: any): any {
    if (!node) return node;
    // Heuristic: driver Node has identity & labels & properties
    if ('properties' in node) {
      return {
        id: node.properties.id || node.identity?.toString?.(),
        labels: Array.isArray(node.labels) ? node.labels : [],
        ...node.properties,
      };
    }
    return node; // Already plain
  }

  /**
   * Normalize a neo4j Relationship to a lightweight object.
   */
  private normalizeDriverRelationship(rel: any): any {
    if (!rel) return rel;
    if ('properties' in rel) {
      return {
        id: rel.properties.id || rel.identity?.toString?.(),
        type: rel.type,
        start: rel.startNodeElementId || rel.startNodeId || rel.start,
        end: rel.endNodeElementId || rel.endNodeId || rel.end,
        ...rel.properties,
      };
    }
    return rel;
  }
}
