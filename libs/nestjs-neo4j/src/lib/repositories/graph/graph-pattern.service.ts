/**
 * @fileoverview Graph Pattern Service
 *
 * This service handles complex graph pattern matching operations using QueryBuilder
 * patterns for type-safe and flexible graph queries.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  BaseGraphService,
  GraphPattern,
  GraphTraversalOptions,
} from './base-graph.service';
import type { NeogmaEntity } from '../../types/neogma-types';
import { NeogmaService } from '../../services/neogma.service';
import { ParameterBindingUtility } from '../../utilities/parameter-binding.utility';

/**
 * Graph query pattern for flexible matching
 */
export interface GraphQueryPattern {
  match: string[];
  where?: string[];
  with?: string[];
  optional?: string[];
  return: string[];
  orderBy?: string[];
  limit?: number;
  skip?: number;
}

/**
 * Subgraph options
 */
export interface SubgraphOptions extends GraphTraversalOptions {
  /** Include node properties */
  includeNodeProperties?: boolean;
  /** Include relationship properties */
  includeRelationshipProperties?: boolean;
  /** Depth of subgraph expansion */
  depth?: number;
}

/**
 * Subgraph result
 */
export interface SubgraphResult<T> {
  nodes: T[];
  relationships: Array<{
    source: T;
    target: T;
    type: string;
    properties?: { [key: string]: unknown };
  }>;
  metadata: {
    nodeCount: number;
    relationshipCount: number;
    depth: number;
  };
}

/**
 * Graph cycle detection result
 */
export interface GraphCycle<T> {
  nodes: T[];
  length: number;
  startNode: T;
}

/**
 * Graph Pattern Service
 *
 * Provides advanced pattern matching, subgraph operations, and complex
 * graph queries using QueryBuilder patterns for type safety.
 */
@Injectable()
export class GraphPatternService<
  T extends NeogmaEntity = NeogmaEntity
> extends BaseGraphService<T> {
  protected readonly GraphPatternLogger = new Logger(GraphPatternService.name);

  constructor(protected override readonly neogmaService: NeogmaService) {
    super(neogmaService, 'Entity');
  }

  // ==================== PATTERN MATCHING OPERATIONS ====================

  /**
   * Match complex graph patterns using QueryBuilder
   */
  async matchPattern(
    pattern: GraphPattern,
    options?: { limit?: number }
  ): Promise<Array<{ [key: string]: T }>> {
    const startTime = Date.now();

    try {
      this.logger.debug('Matching graph pattern', {
        nodeCount: pattern.nodes.length,
        relCount: pattern.relationships.length,
      });

      const queryBuilder = this.createQueryBuilder();

      // Build MATCH clauses from pattern
      const matchClauses = this.buildPatternMatch(pattern);
      const returnVars = pattern.nodes.map((node) => node.variable);

      // Add all match clauses
      matchClauses.forEach((clause) => {
        queryBuilder.raw(clause);
      });

      // Add return clause
      queryBuilder.return(returnVars.join(', '));

      if (options?.limit) {
        queryBuilder.limit(options.limit);
      }

      const results = await this.executeQueryBuilder<{ [key: string]: T }>(
        queryBuilder,
        { retries: 2 }
      );

      const mappedResults = results.map((record) => {
        const result: { [key: string]: T } = {};
        returnVars.forEach((varName) => {
          if (varName in record) {
            result[varName] = this.mapToEntity(record[varName]);
          }
        });
        return result;
      });

      this.logPerformance('matchPattern', startTime, mappedResults.length);
      return mappedResults;
    } catch (error) {
      this.logger.error(
        `Failed to match pattern: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }

  /**
   * Execute custom graph query pattern
   */
  async executeCustomPattern(
    pattern: GraphQueryPattern,
    params?: { [key: string]: unknown }
  ): Promise<Array<{ [key: string]: unknown }>> {
    const startTime = Date.now();

    try {
      this.logger.debug('Executing custom graph pattern');

      // Build query from pattern
      const queryParts: string[] = [];

      pattern.match.forEach((matchClause) => {
        queryParts.push(`MATCH ${matchClause}`);
      });

      if (pattern.where && pattern.where.length > 0) {
        pattern.where.forEach((whereClause) => {
          queryParts.push(`WHERE ${whereClause}`);
        });
      }

      if (pattern.optional && pattern.optional.length > 0) {
        pattern.optional.forEach((optionalClause) => {
          queryParts.push(`OPTIONAL MATCH ${optionalClause}`);
        });
      }

      if (pattern.with && pattern.with.length > 0) {
        pattern.with.forEach((withClause) => {
          queryParts.push(`WITH ${withClause}`);
        });
      }

      queryParts.push(`RETURN ${pattern.return.join(', ')}`);

      if (pattern.orderBy && pattern.orderBy.length > 0) {
        pattern.orderBy.forEach((orderClause) => {
          queryParts.push(`ORDER BY ${orderClause}`);
        });
      }

      if (pattern.skip) {
        queryParts.push(`SKIP ${pattern.skip}`);
      }

      if (pattern.limit) {
        queryParts.push(`LIMIT ${pattern.limit}`);
      }

      const baseQuery = queryParts.join('\n');

      const { query, params: boundParams } = ParameterBindingUtility.autoBind(
        baseQuery,
        params || {}
      );

      const result = await this.neogmaService.run(query, boundParams);

      const results = result.records.map((record) => {
        const obj: { [key: string]: unknown } = {};
        record.keys.forEach((key) => {
          const keyStr = String(key);
          obj[keyStr] = record.get(keyStr);
        });
        return obj;
      });

      this.logPerformance('executeCustomPattern', startTime, results.length);
      return results;
    } catch (error) {
      this.logger.error(
        `Failed to execute custom pattern: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }

  // ==================== SUBGRAPH OPERATIONS ====================

  /**
   * Get subgraph around a set of nodes
   */
  async getSubgraph(
    nodeIds: string[],
    options?: SubgraphOptions
  ): Promise<SubgraphResult<T>> {
    const startTime = Date.now();
    this.validateTraversalOptions(options);

    if (nodeIds.length === 0) {
      throw new Error('At least one node ID must be provided');
    }

    try {
      this.logger.debug(`Getting subgraph for ${nodeIds.length} nodes`);

      const relationshipClause = this.buildRelationshipClause(options);
      const depth = options?.depth || 1;

      // Get nodes and their relationships within the specified depth
      const baseQuery = `
        MATCH (n:${this.entityLabel})
        WHERE n.id IN $nodeIds
        OPTIONAL MATCH path = (n)${relationshipClause.replace(
          '-',
          `*1..${depth}-`
        )}(connected:${this.entityLabel})
        RETURN
          collect(DISTINCT n) as centerNodes,
          collect(DISTINCT connected) as connectedNodes,
          collect(DISTINCT {
            source: startNode(path),
            target: endNode(path),
            type: type(relationships(path)[0]),
            properties: properties(relationships(path)[0])
          }) as relationships
      `;

      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        nodeIds,
      });

      const queryResult = await this.neogmaService.run(query, params);

      if (!queryResult.records || queryResult.records.length === 0) {
        return {
          nodes: [],
          relationships: [],
          metadata: { nodeCount: 0, relationshipCount: 0, depth },
        };
      }

      const result = {
        centerNodes: queryResult.records[0].get('centerNodes'),
        connectedNodes: queryResult.records[0].get('connectedNodes'),
        relationships: queryResult.records[0].get('relationships'),
      };

      // Combine center nodes and connected nodes
      const allNodes = [
        ...(result.centerNodes || []).map((node: T) => this.mapToEntity(node)),
        ...(result.connectedNodes || []).map((node: T) =>
          this.mapToEntity(node)
        ),
      ];

      // Remove duplicates based on ID
      const uniqueNodes = allNodes.filter(
        (node, index, self) => index === self.findIndex((n) => n.id === node.id)
      );

      const subgraph: SubgraphResult<T> = {
        nodes: uniqueNodes,
        relationships: (result.relationships || []).map(
          (rel: {
            source: T;
            target: T;
            type: string;
            properties: { [key: string]: unknown };
          }) => ({
            source: this.mapToEntity(rel.source),
            target: this.mapToEntity(rel.target),
            type: rel.type,
            ...(options?.includeRelationshipProperties && {
              properties: rel.properties,
            }),
          })
        ),
        metadata: {
          nodeCount: uniqueNodes.length,
          relationshipCount: (result.relationships || []).length,
          depth,
        },
      };

      this.logPerformance('getSubgraph', startTime, subgraph.nodes.length);
      return subgraph;
    } catch (error) {
      this.logger.error(
        `Failed to get subgraph: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }

  /**
   * Expand graph from a starting node
   */
  async expandGraph(
    nodeId: string,
    depth: number,
    options?: SubgraphOptions
  ): Promise<SubgraphResult<T>> {
    return this.getSubgraph([nodeId], { ...options, depth });
  }

  // ==================== CYCLE DETECTION ====================

  /**
   * Find cycles in the graph
   */
  async findCycles(
    maxLength = 10,
    options?: GraphTraversalOptions
  ): Promise<GraphCycle<T>[]> {
    const startTime = Date.now();
    this.validateTraversalOptions(options);

    try {
      this.logger.debug(`Finding cycles with max length ${maxLength}`);

      const queryBuilder = this.createQueryBuilder();
      const relationshipClause = this.buildRelationshipClause(options);

      // Find cycles by looking for paths that return to the starting node
      queryBuilder
        .raw(`MATCH (start:${this.entityLabel})`)
        .raw(
          `MATCH path = (start)${relationshipClause.replace(
            '-',
            `*2..${maxLength}-`
          )}(start)`
        )
        .raw(`WHERE length(path) >= 2`)
        .return(
          'nodes(path) as cycleNodes, length(path) as cycleLength, start as startNode'
        )
        .raw('ORDER BY cycleLength');

      if (options?.limit) {
        queryBuilder.limit(options.limit);
      }

      const results = await this.executeQueryBuilder<{
        cycleNodes: T[];
        cycleLength: { low: number; high: number } | number;
        startNode: T;
      }>(queryBuilder, { retries: 2 });

      const cycles = results.map((record) => ({
        nodes: record.cycleNodes.map((node) => this.mapToEntity(node)),
        length:
          typeof record.cycleLength === 'object'
            ? record.cycleLength.low || record.cycleLength.high || 0
            : record.cycleLength,
        startNode: this.mapToEntity(record.startNode),
      }));

      this.logPerformance('findCycles', startTime, cycles.length);
      return cycles;
    } catch (error) {
      this.logger.error(
        `Failed to find cycles: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }

  // ==================== ADVANCED PATTERN QUERIES ====================

  /**
   * Find nodes that match a specific structural pattern
   */
  async findStructuralPattern(
    patternDescription: {
      centerNodeLabel?: string;
      requiredRelationships: Array<{
        type: string;
        direction: 'IN' | 'OUT' | 'BOTH';
        targetLabel?: string;
        minCount?: number;
        maxCount?: number;
      }>;
    },
    options?: GraphTraversalOptions
  ): Promise<T[]> {
    const startTime = Date.now();

    try {
      this.logger.debug('Finding nodes matching structural pattern');

      const queryBuilder = this.createQueryBuilder();
      const centerLabel =
        patternDescription.centerNodeLabel || this.entityLabel;

      queryBuilder.raw(`MATCH (center:${centerLabel})`);

      // Build pattern matching for each required relationship
      patternDescription.requiredRelationships.forEach((relReq, index) => {
        const direction =
          relReq.direction === 'IN'
            ? '<-'
            : relReq.direction === 'OUT'
            ? '->'
            : '-';
        const targetLabel = relReq.targetLabel || this.entityLabel;
        const relVar = `rel${index}`;
        const targetVar = `target${index}`;

        queryBuilder.raw(
          `MATCH (center)${direction === '<-' ? '<-' : '-'}[${relVar}:${
            relReq.type
          }]${direction === '->' ? '->' : '-'}(${targetVar}:${targetLabel})`
        );

        if (relReq.minCount || relReq.maxCount) {
          // Add count constraints if specified
          const minCount = relReq.minCount || 0;
          const maxCount = relReq.maxCount || 999999;
          queryBuilder.raw(`WITH center, count(${targetVar}) as count${index}`);
          queryBuilder.raw(
            `WHERE count${index} >= ${minCount} AND count${index} <= ${maxCount}`
          );
        }
      });

      queryBuilder.return('DISTINCT center');

      if (options?.limit) {
        queryBuilder.limit(options.limit);
      }

      const results = await this.executeQueryBuilder<{ center: T }>(
        queryBuilder,
        { retries: 2 }
      );

      const matches = results.map((record) => this.mapToEntity(record.center));

      this.logPerformance('findStructuralPattern', startTime, matches.length);
      return matches;
    } catch (error) {
      this.logger.error(
        `Failed to find structural pattern: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }

  /**
   * Find motifs (small recurring patterns) in the graph
   */
  async findMotifs(
    motifSize = 3,
    options?: GraphTraversalOptions
  ): Promise<Array<{ nodes: T[]; pattern: string }>> {
    const startTime = Date.now();

    if (motifSize < 2 || motifSize > 5) {
      throw new Error('Motif size must be between 2 and 5');
    }

    try {
      this.logger.debug(`Finding motifs of size ${motifSize}`);

      const queryBuilder = this.createQueryBuilder();
      const relationshipClause = this.buildRelationshipClause(options);

      // Build motif pattern based on size
      if (motifSize === 3) {
        // Triangle motif
        queryBuilder
          .raw(
            `MATCH (a:${this.entityLabel})${relationshipClause}(b:${this.entityLabel})${relationshipClause}(c:${this.entityLabel})${relationshipClause}(a)`
          )
          .raw('WHERE id(a) < id(b) AND id(b) < id(c)')
          .return('[a, b, c] as nodes, "triangle" as pattern');
      } else if (motifSize === 4) {
        // Square motif
        queryBuilder
          .raw(
            `MATCH (a:${this.entityLabel})${relationshipClause}(b:${this.entityLabel})${relationshipClause}(c:${this.entityLabel})${relationshipClause}(d:${this.entityLabel})${relationshipClause}(a)`
          )
          .raw('WHERE id(a) < id(b) AND id(b) < id(c) AND id(c) < id(d)')
          .return('[a, b, c, d] as nodes, "square" as pattern');
      } else {
        // Generic path pattern
        queryBuilder
          .raw(
            `MATCH path = (start:${
              this.entityLabel
            })${relationshipClause.replace('-', `*${motifSize - 1}-`)}(end:${
              this.entityLabel
            })`
          )
          .raw(`WHERE length(path) = ${motifSize - 1}`)
          .return('nodes(path) as nodes, "path" as pattern');
      }

      if (options?.limit) {
        queryBuilder.limit(options.limit);
      }

      const results = await this.executeQueryBuilder<{
        nodes: T[];
        pattern: string;
      }>(queryBuilder, { retries: 2 });

      const motifs = results.map((record) => ({
        nodes: record.nodes.map((node) => this.mapToEntity(node)),
        pattern: record.pattern,
      }));

      this.logPerformance('findMotifs', startTime, motifs.length);
      return motifs;
    } catch (error) {
      this.logger.error(
        `Failed to find motifs: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }
}
