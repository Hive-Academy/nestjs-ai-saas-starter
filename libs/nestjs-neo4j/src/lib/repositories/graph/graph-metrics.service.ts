/**
 * @fileoverview Graph Metrics Service
 *
 * This service handles graph analysis operations including centrality calculations,
 * connected components, and graph statistics using QueryBuilder patterns.
 */

import { Injectable, Logger } from '@nestjs/common';
import { BaseGraphService, GraphTraversalOptions } from './base-graph.service';
import type { NeogmaEntity } from '../../types/neogma-types';
import { NeogmaService } from '../../services/neogma.service';
import { ParameterBindingUtility } from '../../utilities/parameter-binding.utility';

/**
 * Centrality metric types
 */
export type CentralityMetric =
  | 'degree'
  | 'betweenness'
  | 'closeness'
  | 'eigenvector'
  | 'pagerank';

/**
 * Connected component result
 */
export interface ConnectedComponent<T> {
  componentId: string;
  nodes: T[];
  size: number;
}

/**
 * Graph statistics
 */
export interface GraphStatistics {
  nodeCount: number;
  relationshipCount: number;
  density: number;
  averageDegree: number;
  clusteringCoefficient?: number;
  diameter?: number;
  components: number;
}

/**
 * Centrality result
 */
export interface CentralityResult<T> {
  node: T;
  score: number;
  rank: number;
}

/**
 * Community detection options
 */
export interface CommunityDetectionOptions extends GraphTraversalOptions {
  algorithm?: 'louvain' | 'label-propagation' | 'modularity';
  resolution?: number;
  maxIterations?: number;
}

/**
 * Graph Metrics Service
 *
 * Provides graph analysis capabilities including centrality measures,
 * community detection, and graph statistics using QueryBuilder patterns.
 */
@Injectable()
export class GraphMetricsService<
  T extends NeogmaEntity = NeogmaEntity
> extends BaseGraphService<T> {
  protected readonly GraphMetricsLogger = new Logger(GraphMetricsService.name);

  constructor(protected override readonly neogmaService: NeogmaService) {
    super(neogmaService, 'Entity');
  }

  // ==================== CENTRALITY OPERATIONS ====================

  /**
   * Calculate degree centrality for a node using QueryBuilder
   */
  async calculateDegreeCentrality(
    nodeId: string,
    options?: GraphTraversalOptions
  ): Promise<number> {
    const startTime = Date.now();
    this.validateTraversalOptions(options);

    try {
      this.logger.debug(`Calculating degree centrality for node ${nodeId}`);

      const relationshipClause = this.buildRelationshipClause(options);

      const baseQuery = `
        MATCH (node:${this.entityLabel} {id: $nodeId})
        MATCH (node)${relationshipClause}(connected:${this.entityLabel})
        RETURN count(DISTINCT connected) as degree
      `;

      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        nodeId,
      });

      const result = await this.neogmaService.run(query, params);
      const record = result.records[0];

      if (!record) {
        return 0;
      }

      const degreeValue = record.get('degree');
      const degree =
        typeof degreeValue === 'object'
          ? degreeValue.low || degreeValue.high || 0
          : degreeValue;

      this.logPerformance('calculateDegreeCentrality', startTime);
      return degree;
    } catch (error) {
      this.logger.error(
        `Failed to calculate degree centrality: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }

  /**
   * Calculate centrality scores for all nodes
   */
  async calculateCentralityScores(
    metric: CentralityMetric,
    options?: GraphTraversalOptions
  ): Promise<CentralityResult<T>[]> {
    const startTime = Date.now();
    this.validateTraversalOptions(options);

    try {
      this.logger.debug(`Calculating ${metric} centrality scores`);

      const relationshipClause = this.buildRelationshipClause(options);
      let baseQuery = '';

      switch (metric) {
        case 'degree':
          baseQuery = `
            MATCH (n:${this.entityLabel})
            OPTIONAL MATCH (n)${relationshipClause}(connected:${
            this.entityLabel
          })
            RETURN n as node, count(DISTINCT connected) as score
            ORDER BY score DESC
            ${options?.limit ? `LIMIT ${options.limit}` : ''}
          `;
          break;

        case 'betweenness':
          // Simplified betweenness centrality calculation
          baseQuery = `
            MATCH (n:${this.entityLabel})
            MATCH (source:${this.entityLabel}), (target:${this.entityLabel})
            WHERE source <> target AND source <> n AND target <> n
            MATCH path = shortestPath((source)${relationshipClause.replace(
              '-',
              '*-'
            )}(target))
            WHERE n IN nodes(path)
            RETURN n as node, count(*) as score
            ORDER BY score DESC
            ${options?.limit ? `LIMIT ${options.limit}` : ''}
          `;
          break;

        case 'closeness':
          // Closeness centrality using average shortest path length
          baseQuery = `
            MATCH (n:${this.entityLabel})
            MATCH (other:${this.entityLabel})
            WHERE n <> other
            MATCH path = shortestPath((n)${relationshipClause.replace(
              '-',
              '*-'
            )}(other))
            RETURN n as node, 1.0/avg(length(path)) as score
            ORDER BY score DESC
            ${options?.limit ? `LIMIT ${options.limit}` : ''}
          `;
          break;

        default:
          // For pagerank and eigenvector, we'd typically use Neo4j GDS
          // Fallback to degree centrality
          baseQuery = `
            MATCH (n:${this.entityLabel})
            OPTIONAL MATCH (n)${relationshipClause}(connected:${
            this.entityLabel
          })
            RETURN n as node, count(DISTINCT connected) as score
            ORDER BY score DESC
            ${options?.limit ? `LIMIT ${options.limit}` : ''}
          `;
      }

      const result = await this.neogmaService.run(baseQuery, {});

      const centralityResults = result.records.map(
        (record: any, index: number) => {
          const scoreValue = record.get('score');
          return {
            node: this.mapToEntity(record.get('node').properties),
            score:
              typeof scoreValue === 'object'
                ? scoreValue.low || scoreValue.high || 0
                : scoreValue,
            rank: index + 1,
          };
        }
      );

      this.logPerformance(
        `calculate${metric}Centrality`,
        startTime,
        centralityResults.length
      );
      return centralityResults;
    } catch (error) {
      this.logger.error(
        `Failed to calculate ${metric} centrality: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }

  // ==================== COMMUNITY DETECTION ====================

  /**
   * Find connected components in the graph
   */
  async findConnectedComponents(
    options?: GraphTraversalOptions
  ): Promise<ConnectedComponent<T>[]> {
    const startTime = Date.now();
    this.validateTraversalOptions(options);

    try {
      this.logger.debug('Finding connected components');

      const relationshipClause = this.buildRelationshipClause(options);
      const whereClause = this.buildWhereClause(options?.nodeFilter, 'n');

      // Simplified connected components using node IDs as component identifiers
      const baseQuery = `
        MATCH (n:${this.entityLabel})
        ${whereClause || ''}
        CALL {
          WITH n
          MATCH path = (n)${relationshipClause.replace('-', '*-')}(connected:${
        this.entityLabel
      })
          RETURN collect(DISTINCT connected) as component
        }
        RETURN n.id as componentId, component as nodes, size(component) as componentSize
        ${options?.limit ? `LIMIT ${options.limit}` : ''}
      `;

      const result = await this.neogmaService.run(baseQuery, {});

      const components = result.records.map((record: any) => {
        const sizeValue = record.get('componentSize');
        return {
          componentId: record.get('componentId'),
          nodes: record
            .get('nodes')
            .map((node: any) => this.mapToEntity(node.properties || node)),
          size:
            typeof sizeValue === 'object'
              ? sizeValue.low || sizeValue.high || 0
              : sizeValue,
        };
      });

      this.logPerformance(
        'findConnectedComponents',
        startTime,
        components.length
      );
      return components;
    } catch (error) {
      this.logger.error(
        `Failed to find connected components: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }

  /**
   * Detect communities using various algorithms
   */
  async detectCommunities(
    options?: CommunityDetectionOptions
  ): Promise<Array<{ communityId: string; nodes: T[]; modularity?: number }>> {
    const startTime = Date.now();
    const algorithm = options?.algorithm || 'label-propagation';

    try {
      this.logger.debug(`Detecting communities using ${algorithm}`);

      // For now, use a simplified community detection based on connected components
      // In production, you'd integrate with Neo4j GDS for advanced algorithms
      const components = await this.findConnectedComponents(options);

      const communities = components.map((component, index) => ({
        communityId: `community_${index}`,
        nodes: component.nodes,
        modularity: this.calculateModularity(component.nodes, components),
      }));

      this.logPerformance(
        `detectCommunities_${algorithm}`,
        startTime,
        communities.length
      );
      return communities;
    } catch (error) {
      this.logger.error(
        `Failed to detect communities: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }

  // ==================== GRAPH STATISTICS ====================

  /**
   * Calculate comprehensive graph statistics
   */
  async getGraphStatistics(
    options?: GraphTraversalOptions
  ): Promise<GraphStatistics> {
    const startTime = Date.now();

    try {
      this.logger.debug('Calculating graph statistics');

      const relationshipClause = this.buildRelationshipClause(options);

      // Get basic counts
      const baseQuery = `
        MATCH (n:${this.entityLabel})
        OPTIONAL MATCH (n)${relationshipClause}(m:${this.entityLabel})
        RETURN
          count(DISTINCT n) as nodeCount,
          count(DISTINCT m) as connectionCount,
          avg(size((n)${relationshipClause}())) as averageDegree
      `;

      const result = await this.neogmaService.run(baseQuery, {});
      const statsRecord = result.records[0];

      if (!statsRecord) {
        return {
          nodeCount: 0,
          relationshipCount: 0,
          density: 0,
          averageDegree: 0,
          components: 0,
        };
      }

      const nodeCountValue = statsRecord.get('nodeCount');
      const connectionCountValue = statsRecord.get('connectionCount');

      const nodeCount =
        typeof nodeCountValue === 'object'
          ? nodeCountValue.low || nodeCountValue.high || 0
          : nodeCountValue;

      const relationshipCount =
        typeof connectionCountValue === 'object'
          ? connectionCountValue.low || connectionCountValue.high || 0
          : connectionCountValue;

      // Calculate density
      const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;
      const density =
        maxPossibleEdges > 0 ? relationshipCount / maxPossibleEdges : 0;

      // Get component count
      const components = await this.findConnectedComponents(options);

      const statistics: GraphStatistics = {
        nodeCount,
        relationshipCount,
        density,
        averageDegree: statsRecord.get('averageDegree') || 0,
        components: components.length,
      };

      this.logPerformance('getGraphStatistics', startTime);
      return statistics;
    } catch (error) {
      this.logger.error(
        `Failed to calculate graph statistics: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }

  /**
   * Find nodes with highest centrality scores
   */
  async findCentralNodes(
    metric: CentralityMetric = 'degree',
    limit = 10,
    options?: GraphTraversalOptions
  ): Promise<CentralityResult<T>[]> {
    const scores = await this.calculateCentralityScores(metric, {
      ...options,
      limit,
    });

    return scores.slice(0, limit);
  }

  /**
   * Analyze node importance across multiple centrality metrics
   */
  async analyzeNodeImportance(
    nodeId: string,
    options?: GraphTraversalOptions
  ): Promise<{ [K in CentralityMetric]: number }> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Analyzing importance for node ${nodeId}`);

      const [degree] = await Promise.all([
        this.calculateDegreeCentrality(nodeId, options),
      ]);

      // For other metrics, we'd need more sophisticated implementations
      // This is a simplified version focusing on degree centrality
      const importance = {
        degree,
        betweenness: 0, // Would require full betweenness calculation
        closeness: 0, // Would require full closeness calculation
        eigenvector: 0, // Would require iterative calculation
        pagerank: 0, // Would require PageRank algorithm
      };

      this.logPerformance('analyzeNodeImportance', startTime);
      return importance;
    } catch (error) {
      this.logger.error(
        `Failed to analyze node importance: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Calculate modularity for a community (simplified)
   */
  private calculateModularity(
    nodes: T[],
    allComponents: ConnectedComponent<T>[]
  ): number {
    // Simplified modularity calculation
    // In practice, this would be more sophisticated
    const totalNodes = allComponents.reduce((sum, comp) => sum + comp.size, 0);
    const communitySize = nodes.length;

    // Basic modularity approximation
    const expectedEdges =
      (communitySize * (communitySize - 1)) / (2 * totalNodes);
    const actualEdges = communitySize; // Simplified

    return (actualEdges - expectedEdges) / totalNodes;
  }
}
