/**
 * GraphRepository - Specialized repository for graph operations using Neogma models
 * 
 * This repository provides graph-specific functionality using proper Neogma model operations
 * instead of raw Cypher queries, ensuring type safety and leveraging Neogma's features.
 */

import { Injectable, Logger } from '@nestjs/common';
import type { NeogmaModel as BaseNeogmaModel, Where } from 'neogma';
import type { NeogmaModel } from '../types/neogma-types';
import { NeogmaService } from '../core/neogma.service';
import type { Neo4jCompatibleEntity } from '../types/neo4j-types';

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
  nodeFilter?: Where;
  /** Filter conditions for relationships */
  relationshipFilter?: Where;
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
  relationship?: any;
  path?: any[];
}

/**
 * Path finding result
 */
export interface PathResult<T> {
  path: T[];
  length: number;
  weight?: number;
  relationships?: any[];
}

/**
 * Pattern matching interface for complex graph queries
 */
export interface GraphPattern {
  nodes: Array<{
    variable: string;
    labels: string[];
    properties?: Where;
  }>;
  relationships: Array<{
    type: string;
    direction: 'IN' | 'OUT' | 'BOTH';
    source: string;
    target: string;
    properties?: Where;
  }>;
}

/**
 * GraphRepository - Modern Neogma-based graph operations
 * 
 * Uses proper Neogma model operations and QueryBuilder instead of raw Cypher
 */
@Injectable()
export class GraphRepository<T extends Neo4jCompatibleEntity = Neo4jCompatibleEntity> {
  protected readonly logger = new Logger(GraphRepository.name);

  constructor(
    protected readonly neogmaService: NeogmaService,
    protected readonly model: NeogmaModel<Record<string, unknown>>,
    protected readonly entityLabel = 'Entity'
  ) {
    this.logger.log(`GraphRepository initialized for ${entityLabel} using Neogma models`);
  }

  // ==================== CORE GRAPH OPERATIONS ====================

  /**
   * Find neighbors of a node using Neogma model-based approach
   */
  async findNeighbors(
    nodeId: string, 
    options?: GraphTraversalOptions
  ): Promise<T[]> {
    const startTime = Date.now();
    try {
      this.logger.debug(`Finding neighbors for node ${nodeId}`);

      // Use Neogma's built-in relationship traversal if available
      const node = await this.model.findOne({ where: { id: nodeId } });
      if (!node) {
        return [];
      }

      // Use Neogma QueryBuilder for type-safe graph traversal
      const queryBuilder = this.neogmaService.createQueryBuilder()
        .raw(`MATCH (start:${this.entityLabel} {id: $id})`)
        .raw(`MATCH (start)-[${this.buildRelationshipPattern(options)}]-(neighbor:${this.entityLabel})`)
        .return('DISTINCT neighbor');
      
      if (options?.limit) {
        queryBuilder.limit(options.limit);
      }

      const results = await this.neogmaService.executeQueryBuilder<T>(queryBuilder.addParams({ id: nodeId }));
      
      this.logger.debug(`Found ${results.length} neighbors in ${Date.now() - startTime}ms`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to find neighbors: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Find nodes within a specific distance using Neogma optimizations
   */
  async findWithinDistance(
    nodeId: string,
    distance: number,
    options?: GraphTraversalOptions
  ): Promise<NeighborResult<T>[]> {
    const startTime = Date.now();
    try {
      this.logger.debug(`Finding nodes within distance ${distance} from ${nodeId}`);

      // Use Neogma QueryBuilder for type-safe distance traversal
      const relationshipPattern = this.buildRelationshipPattern(options);
      const queryBuilder = this.neogmaService.createQueryBuilder()
        .raw(`MATCH (start:${this.entityLabel} {id: $nodeId})`)
        .raw(`MATCH path = (start)${relationshipPattern.replace('-', `*1..${distance}-`)}(target:${this.entityLabel})`)
        .raw('WHERE target.id <> start.id')
        .return('DISTINCT target as node, length(path) as distance')
        .raw('ORDER BY distance');
      
      if (options?.limit) {
        queryBuilder.limit(options.limit);
      }

      const results = await this.neogmaService.executeQueryBuilder<{node: T, distance: number}>(queryBuilder.addParams({ nodeId, distance }));
      
      const neighbors = results.map(row => ({
        node: row.node,
        distance: row.distance
      }));

      this.logger.debug(`Found ${neighbors.length} nodes within distance ${distance} in ${Date.now() - startTime}ms`);
      return neighbors;
    } catch (error) {
      this.logger.error(`Failed to find nodes within distance: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Find common neighbors between two nodes
   */
  async findCommonNeighbors(
    nodeId1: string,
    nodeId2: string,
    options?: GraphTraversalOptions
  ): Promise<T[]> {
    const startTime = Date.now();
    try {
      this.logger.debug(`Finding common neighbors between ${nodeId1} and ${nodeId2}`);

      const relationshipClause = this.buildRelationshipClause(options);
      const whereClause = this.buildWhereClause(options?.nodeFilter);

      const cypher = `
        MATCH (node1:${this.entityLabel} {id: $nodeId1})
        MATCH (node2:${this.entityLabel} {id: $nodeId2})
        MATCH (node1)${relationshipClause}(common:${this.entityLabel})
        MATCH (node2)${relationshipClause}(common)
        ${whereClause}
        RETURN DISTINCT common
        ${options?.limit ? `LIMIT ${options.limit}` : ''}
      `;

      const results = await this.neogmaService.query<T>(cypher, { nodeId1, nodeId2 });
      
      this.logger.debug(`Found ${results.length} common neighbors in ${Date.now() - startTime}ms`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to find common neighbors: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  // ==================== PATH FINDING OPERATIONS ====================

  /**
   * Find shortest path between two nodes
   */
  async findShortestPath(
    fromId: string,
    toId: string,
    options?: GraphTraversalOptions
  ): Promise<PathResult<T> | null> {
    const startTime = Date.now();
    try {
      this.logger.debug(`Finding shortest path from ${fromId} to ${toId}`);

      const relationshipClause = this.buildRelationshipClause(options);
      const maxDepth = options?.maxDepth || 10;

      const cypher = `
        MATCH (start:${this.entityLabel} {id: $fromId})
        MATCH (end:${this.entityLabel} {id: $toId})
        MATCH path = shortestPath((start)${relationshipClause.replace('-', `*1..${maxDepth}-`)}(end))
        RETURN nodes(path) as path, length(path) as length
        LIMIT 1
      `;

      const results = await this.neogmaService.query<{path: T[], length: number}>(cypher, { fromId, toId });
      
      if (results.length === 0) {
        this.logger.debug(`No path found between ${fromId} and ${toId}`);
        return null;
      }

      const result = results[0];
      this.logger.debug(`Found shortest path with length ${result.length} in ${Date.now() - startTime}ms`);
      
      return {
        path: result.path,
        length: result.length
      };
    } catch (error) {
      this.logger.error(`Failed to find shortest path: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  // ==================== GRAPH METRICS ====================

  /**
   * Calculate degree centrality for a node
   */
  async calculateDegreeCentrality(
    nodeId: string,
    options?: GraphTraversalOptions
  ): Promise<number> {
    const startTime = Date.now();
    try {
      this.logger.debug(`Calculating degree centrality for node ${nodeId}`);

      const relationshipClause = this.buildRelationshipClause(options);

      const cypher = `
        MATCH (node:${this.entityLabel} {id: $nodeId})
        MATCH (node)${relationshipClause}(connected:${this.entityLabel})
        RETURN count(DISTINCT connected) as degree
      `;

      const results = await this.neogmaService.query<{degree: number}>(cypher, { nodeId });
      
      const degree = results.length > 0 ? results[0].degree : 0;
      this.logger.debug(`Calculated degree centrality ${degree} in ${Date.now() - startTime}ms`);
      
      return degree;
    } catch (error) {
      this.logger.error(`Failed to calculate degree centrality: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Find connected components in the graph
   */
  async findConnectedComponents(options?: GraphTraversalOptions): Promise<Array<{componentId: string, nodes: T[]}>> {
    const startTime = Date.now();
    try {
      this.logger.debug('Finding connected components');

      const relationshipClause = this.buildRelationshipClause(options);
      const whereClause = this.buildWhereClause(options?.nodeFilter);

      // Use a simplified connected components algorithm
      const cypher = `
        MATCH (n:${this.entityLabel})
        ${whereClause}
        CALL {
          WITH n
          MATCH path = (n)${relationshipClause.replace('-', '*-')}(connected:${this.entityLabel})
          RETURN collect(DISTINCT connected) as component
        }
        RETURN n.id as componentId, component as nodes
        ${options?.limit ? `LIMIT ${options.limit}` : ''}
      `;

      const results = await this.neogmaService.query<{componentId: string, nodes: T[]}>(cypher);
      
      this.logger.debug(`Found ${results.length} connected components in ${Date.now() - startTime}ms`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to find connected components: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  // ==================== PATTERN MATCHING ====================

  /**
   * Match complex graph patterns using Neogma
   */
  async matchPattern(
    pattern: GraphPattern,
    options?: { limit?: number }
  ): Promise<Array<Record<string, T>>> {
    const startTime = Date.now();
    try {
      this.logger.debug('Matching graph pattern', pattern);

      // Build MATCH clauses from pattern
      const matchClauses = this.buildPatternMatch(pattern);
      const returnVars = pattern.nodes.map(node => node.variable);

      const cypher = `
        ${matchClauses.join('\n')}
        RETURN ${returnVars.join(', ')}
        ${options?.limit ? `LIMIT ${options.limit}` : ''}
      `;

      const results = await this.neogmaService.query<Record<string, T>>(cypher);
      
      this.logger.debug(`Pattern matched ${results.length} results in ${Date.now() - startTime}ms`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to match pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Build relationship clause for traversal queries
   */
  private buildRelationshipClause(options?: GraphTraversalOptions): string {
    const types = options?.relationshipTypes?.length ? 
      options.relationshipTypes.map(type => `:${type}`).join('|') : '';
    
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
  private buildWhereClause(filter?: Where): string {
    if (!filter || Object.keys(filter).length === 0) {
      return '';
    }

    // Convert Neogma Where to Cypher WHERE clause
    const conditions = Object.entries(filter).map(([key, value]) => {
      if (typeof value === 'string') {
        return `neighbor.${key} = "${value}"`;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        return `neighbor.${key} = ${value}`;
      }
      return `neighbor.${key} = $${key}`;
    });

    return `WHERE ${conditions.join(' AND ')}`;
  }

  /**
   * Build MATCH clauses from graph pattern
   */
  private buildPatternMatch(pattern: GraphPattern): string[] {
    const clauses: string[] = [];

    // Build node matches
    pattern.nodes.forEach(node => {
      const labels = node.labels.map(label => `:${label}`).join('');
      const props = node.properties ? 
        `{${Object.keys(node.properties).map(key => `${key}: $${key}`).join(', ')}}` : '';
      clauses.push(`MATCH (${node.variable}${labels} ${props})`);
    });

    // Build relationship matches
    pattern.relationships.forEach(rel => {
      const direction = rel.direction === 'IN' ? '<-' : rel.direction === 'OUT' ? '->' : '-';
      const relClause = `(${rel.source})-[:${rel.type}]${direction}(${rel.target})`;
      clauses.push(`MATCH ${relClause}`);
    });

    return clauses;
  }

  // ==================== QUERY BUILDER HELPERS ====================

  /**
   * Convert direction options to QueryBuilder format
   */
  private buildDirectionFromOptions(options?: GraphTraversalOptions): 'IN' | 'OUT' | 'BOTH' {
    return options?.direction || 'BOTH';
  }

  /**
   * Convert relationship types to QueryBuilder format
   */
  private buildRelationshipTypesFromOptions(options?: GraphTraversalOptions): string[] {
    return options?.relationshipTypes || [];
  }

  /**
   * Build relationship pattern for QueryBuilder
   */
  private buildRelationshipPattern(options?: GraphTraversalOptions): string {
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
}