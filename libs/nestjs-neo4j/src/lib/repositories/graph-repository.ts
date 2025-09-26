import { Injectable, Logger } from '@nestjs/common';
import { InjectNeogma } from '../neogma/neogma.decorators';
import type { QueryResult } from '../interfaces/query-result.interface';
import type { Neogma } from 'neogma';

/**
 * Query options for repository operations
 */
export interface RepositoryQueryOptions {
  /** Database name */
  database?: string;
  /** Transaction context */
  transactionId?: string;
  /** Include soft deleted entities */
  includeSoftDeleted?: boolean;
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
 * Specialized repository for graph-specific operations
 *
 * This class provides graph database specific functionality:
 * - Graph traversals and path finding
 * - Relationship management
 * - Pattern matching
 * - Graph algorithms integration
 * - Centrality calculations
 * - Community detection
 *
 * For basic CRUD operations, use @FindOne, @FindMany, @CreateEntity decorators instead.
 *
 * @template T The entity type this repository manages
 */
@Injectable()
export class GraphRepository<
  T extends Record<string, any> = Record<string, any>
> {
  protected readonly logger = new Logger(GraphRepository.name);

  constructor(
    @InjectNeogma() protected readonly neogma: Neogma,
    protected readonly entityLabel = 'Entity'
  ) {}

  /**
   * Execute a query with Neogma
   */
  protected async query<R = Record<string, any>>(
    cypher: string,
    params?: Record<string, any>,
    options?: RepositoryQueryOptions
  ): Promise<QueryResult<R>> {
    const result = await this.neogma.driver.session().run(cypher, params || {});
    return {
      records: result.records.map((record) => record.toObject()) as R[],
      summary: {
        query: cypher,
        parameters: params || {},
        resultAvailableAfter: result.summary.resultAvailableAfter || 0,
        resultConsumedAfter: result.summary.resultConsumedAfter || 0,
      },
    };
  }

  /**
   * Execute a query (alias for backward compatibility)
   */
  protected async executeQuery<R = T>(
    cypher: string,
    params?: Record<string, any>,
    options?: RepositoryQueryOptions
  ): Promise<QueryResult<R>> {
    return this.query<R>(cypher, params, options);
  }

  /**
   * Map Neo4j result to entity
   */
  protected mapFromNeo4j<R = T>(record: Record<string, any>): R {
    // Simple mapping - can be overridden in subclasses
    return (record.properties || record) as R;
  }

  /**
   * Find all neighbors of a node
   */
  async findNeighbors(
    nodeId: string,
    options?: GraphTraversalOptions & RepositoryQueryOptions
  ): Promise<T[]> {
    const relationshipTypes = options?.relationshipTypes || ['*'];
    const maxDepth = options?.maxDepth || 1;

    // Add relationship traversal based on direction and types
    const relType =
      relationshipTypes.length === 1 && relationshipTypes[0] === '*'
        ? '*'
        : relationshipTypes.join('|');

    // Build query parameters
    const params: Record<string, any> = { nodeId };
    const whereConditions: string[] = ['neighbor.id <> $nodeId'];

    // Apply node filters
    if (options?.nodeFilter && Object.keys(options.nodeFilter).length > 0) {
      Object.entries(options.nodeFilter).forEach(([key, value]) => {
        const paramKey = `nodeFilter_${key}`;
        whereConditions.push(`neighbor.${key} = $${paramKey}`);
        params[paramKey] = value;
      });
    }

    // Apply relationship filters
    if (
      options?.relationshipFilter &&
      Object.keys(options.relationshipFilter).length > 0
    ) {
      Object.entries(options.relationshipFilter).forEach(([key, value]) => {
        const paramKey = `relFilter_${key}`;
        whereConditions.push(`r.${key} = $${paramKey}`);
        params[paramKey] = value;
      });
    }

    // Apply soft delete filter
    if (!options?.includeSoftDeleted) {
      whereConditions.push('neighbor.deletedAt IS NULL');
    }

    const cypher = `
      MATCH (source:${
        this.entityLabel
      } {id: $nodeId})-[r:${relType}]-(neighbor:${this.entityLabel})
      WHERE ${whereConditions.join(' AND ')}
      RETURN DISTINCT neighbor
      LIMIT ${maxDepth * 100}
    `;

    const result = await this.query<Record<string, any>>(cypher, params);
    return (
      result.records?.map((record: any) =>
        this.mapFromNeo4j<T>(record.neighbor)
      ) || []
    );
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

      if (!result.records || result.records.length === 0) {
        return null;
      }

      const pathData = result.records[0];
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

    const result = await this.executeQuery(query, { fromId, toId }, options);

    return result.records?.map((record: Record<string, any>) => ({
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

    // Build query parameters
    const params: Record<string, any> = { nodeId };
    const whereConditions: string[] = ['source.id <> target.id'];

    // Apply node filters
    if (options?.nodeFilter && Object.keys(options.nodeFilter).length > 0) {
      Object.entries(options.nodeFilter).forEach(([key, value]) => {
        const paramKey = `targetFilter_${key}`;
        whereConditions.push(`target.${key} = $${paramKey}`);
        params[paramKey] = value;
      });
    }

    // Apply soft delete filter
    if (!options?.includeSoftDeleted) {
      whereConditions.push('target.deletedAt IS NULL');
    }

    const cypher = `
      MATCH (source:${this.entityLabel} {id: $nodeId})
      MATCH path = (source)-[*1..${distance}:${typeFilter}]-(target:${
      this.entityLabel
    })
      WHERE ${whereConditions.join(' AND ')}
      RETURN DISTINCT target, length(path) as distance
      ORDER BY distance ASC
    `;

    const result = await this.query<Record<string, any>>(cypher, params);

    return (
      result.records?.map((record: Record<string, any>) => ({
        node: this.mapFromNeo4j<T>({ n: record.target }),
        distance: record.distance,
      })) || []
    );
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

    // Build query parameters
    const params: Record<string, any> = { nodeId1, nodeId2 };
    const whereConditions: string[] = [
      'common.id <> $nodeId1 AND common.id <> $nodeId2',
    ];

    // Apply node filters
    if (options?.nodeFilter && Object.keys(options.nodeFilter).length > 0) {
      Object.entries(options.nodeFilter).forEach(([key, value]) => {
        const paramKey = `commonFilter_${key}`;
        whereConditions.push(`common.${key} = $${paramKey}`);
        params[paramKey] = value;
      });
    }

    // Apply soft delete filter
    if (!options?.includeSoftDeleted) {
      whereConditions.push('common.deletedAt IS NULL');
    }

    const cypher = `
      MATCH (node1:${
        this.entityLabel
      } {id: $nodeId1})-[:${typeFilter}]-(common:${
      this.entityLabel
    })-[:${typeFilter}]-(node2:${this.entityLabel} {id: $nodeId2})
      WHERE ${whereConditions.join(' AND ')}
      RETURN DISTINCT common
    `;

    const result = await this.query<Record<string, any>>(cypher, params);
    return (
      result.records?.map((record: Record<string, any>) =>
        this.mapFromNeo4j<T>(record.common)
      ) || []
    );
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

    const directionPattern = direction.replace('REL', `r${typeFilter}`);

    const cypher = `
      MATCH (node:${this.entityLabel} {id: $nodeId})
      MATCH (node)${directionPattern}(neighbor)
      RETURN count(DISTINCT neighbor) as degree
    `;

    const result = await this.query<Record<string, any>>(cypher, { nodeId });
    return (result.records?.[0] as Record<string, any>)?.degree || 0;
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
      const result = await this.executeQuery(query, {}, options);

      return (
        result.records?.map((record: Record<string, any>) => ({
          componentId: record.componentId,
          nodes: record.nodes.map((node: any) =>
            this.mapFromNeo4j<T>({ n: node })
          ),
        })) || []
      );
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
    const result = await this.executeQuery(query, params, options);

    return (
      result.records?.map((record: Record<string, any>) => {
        const mapped: Record<string, T> = {};
        pattern.nodes.forEach((node) => {
          if (record[node.variable]) {
            mapped[node.variable] = this.mapFromNeo4j<T>({
              n: record[node.variable],
            });
          }
        });
        return mapped;
      }) || []
    );
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
   * Build soft delete filter for specific node variable
   */
  protected buildSoftDeleteFilter(
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

    const result = await this.executeQuery(query, { fromId, toId }, options);

    if (!result.records || result.records.length === 0) {
      return null;
    }

    const firstRecord = result.records[0] as Record<string, any>;

    return {
      path: this.extractPathNodes(firstRecord.path),
      length: firstRecord.pathLength,
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

    const nodeResult = await this.executeQuery(nodesQuery, {}, options);
    const relResult = await this.executeQuery(relQuery, {}, options);

    const nodeRecords = (nodeResult.records || []) as Record<string, any>[];
    const relRecords = (relResult.records || []) as Record<string, any>[];

    const nodeMap = new Map<number, any>();
    nodeRecords.forEach((rec: Record<string, any>) => {
      nodeMap.set(rec.id, rec.n);
    });

    // Build adjacency (undirected)
    const adjacency = new Map<number, Set<number>>();
    const ensure = (id: number) => {
      if (!adjacency.has(id)) adjacency.set(id, new Set());
      return adjacency.get(id)!;
    };
    nodeMap.forEach((_, id) => ensure(id));
    relRecords.forEach((record: Record<string, any>) => {
      const { source, target } = record;
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
