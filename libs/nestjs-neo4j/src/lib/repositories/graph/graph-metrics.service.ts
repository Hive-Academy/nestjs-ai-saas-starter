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

      const queryBuilder = this.createQueryBuilder();
      const relationshipClause = this.buildRelationshipClause(options);

      queryBuilder
        .raw(`MATCH (node:${this.entityLabel} {id: $nodeId})`)
        .raw(`MATCH (node)${relationshipClause}(connected:${this.entityLabel})`)
        .return('count(DISTINCT connected) as degree');

      // Add nodeId parameter to QueryBuilder
      queryBuilder.getBindParam().add('nodeId', nodeId);

      const results = await this.executeQueryBuilder<{
        degree: { low: number; high: number } | number;
      }>(queryBuilder, { retries: 2 });

      const degree =
        results.length > 0
          ? typeof results[0].degree === 'object'
            ? results[0].degree.low || results[0].degree.high || 0
            : results[0].degree
          : 0;

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

      const queryBuilder = this.createQueryBuilder();
      const relationshipClause = this.buildRelationshipClause(options);

      switch (metric) {
        case 'degree':
          queryBuilder
            .raw(`MATCH (n:${this.entityLabel})`)
            .raw(
              `OPTIONAL MATCH (n)${relationshipClause}(connected:${this.entityLabel})`
            )
            .return('n as node, count(DISTINCT connected) as score')
            .raw('ORDER BY score DESC');
          break;

        case 'betweenness':
          // Simplified betweenness centrality calculation
          queryBuilder
            .raw(`MATCH (n:${this.entityLabel})`)
            .raw(
              `MATCH (source:${this.entityLabel}), (target:${this.entityLabel})`
            )
            .raw('WHERE source <> target AND source <> n AND target <> n')
            .raw(
              `MATCH path = shortestPath((source)${relationshipClause.replace(
                '-',
                '*-'
              )}(target))`
            )
            .raw('WHERE n IN nodes(path)')
            .return('n as node, count(*) as score')
            .raw('ORDER BY score DESC');
          break;

        case 'closeness':
          // Closeness centrality using average shortest path length
          queryBuilder
            .raw(`MATCH (n:${this.entityLabel})`)
            .raw(`MATCH (other:${this.entityLabel})`)
            .raw('WHERE n <> other')
            .raw(
              `MATCH path = shortestPath((n)${relationshipClause.replace(
                '-',
                '*-'
              )}(other))`
            )
            .return('n as node, 1.0/avg(length(path)) as score')
            .raw('ORDER BY score DESC');
          break;

        default:
          // For pagerank and eigenvector, we'd typically use Neo4j GDS
          // Fallback to degree centrality
          queryBuilder
            .raw(`MATCH (n:${this.entityLabel})`)
            .raw(
              `OPTIONAL MATCH (n)${relationshipClause}(connected:${this.entityLabel})`
            )
            .return('n as node, count(DISTINCT connected) as score')
            .raw('ORDER BY score DESC');
      }

      if (options?.limit) {
        queryBuilder.limit(options.limit);
      }

      const results = await this.executeQueryBuilder<{
        node: T;
        score: { low: number; high: number } | number;
      }>(queryBuilder, { retries: 2 });

      const centralityResults = results.map((record, index) => ({
        node: this.mapToEntity(record.node),
        score:
          typeof record.score === 'object'
            ? record.score.low || record.score.high || 0
            : record.score,
        rank: index + 1,
      }));

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
   * Find connected components in the graph using QueryBuilder
   */
  async findConnectedComponents(
    options?: GraphTraversalOptions
  ): Promise<ConnectedComponent<T>[]> {
    const startTime = Date.now();
    this.validateTraversalOptions(options);

    try {
      this.logger.debug('Finding connected components');

      const queryBuilder = this.createQueryBuilder();
      const relationshipClause = this.buildRelationshipClause(options);

      // Simplified connected components using node IDs as component identifiers
      queryBuilder
        .raw(`MATCH (n:${this.entityLabel})`)
        .raw(`CALL {`)
        .raw(`  WITH n`)
        .raw(
          `  MATCH path = (n)${relationshipClause.replace(
            '-',
            '*-'
          )}(connected:${this.entityLabel})`
        )
        .raw(`  RETURN collect(DISTINCT connected) as component`)
        .raw(`}`)
        .return(
          'n.id as componentId, component as nodes, size(component) as componentSize'
        );

      const whereClause = this.buildWhereClause(options?.nodeFilter, 'n');
      if (whereClause) {
        queryBuilder.raw(whereClause);
      }

      if (options?.limit) {
        queryBuilder.limit(options.limit);
      }

      const results = await this.executeQueryBuilder<{
        componentId: string;
        nodes: T[];
        componentSize: { low: number; high: number } | number;
      }>(queryBuilder, { retries: 2 });

      const components = results.map((record) => ({
        componentId: record.componentId,
        nodes: record.nodes.map((node) => this.mapToEntity(node)),
        size:
          typeof record.componentSize === 'object'
            ? record.componentSize.low || record.componentSize.high || 0
            : record.componentSize,
      }));

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

      const queryBuilder = this.createQueryBuilder();
      const relationshipClause = this.buildRelationshipClause(options);

      // Get basic counts
      queryBuilder
        .raw(`MATCH (n:${this.entityLabel})`)
        .raw(`OPTIONAL MATCH (n)${relationshipClause}(m:${this.entityLabel})`)
        .return(`
          count(DISTINCT n) as nodeCount,
          count(DISTINCT m) as connectionCount,
          avg(size((n)${relationshipClause}())) as averageDegree
        `);

      const [statsResult] = await this.executeQueryBuilder<{
        nodeCount: { low: number; high: number } | number;
        connectionCount: { low: number; high: number } | number;
        averageDegree: number;
      }>(queryBuilder, { retries: 2 });

      const nodeCount =
        typeof statsResult.nodeCount === 'object'
          ? statsResult.nodeCount.low || statsResult.nodeCount.high || 0
          : statsResult.nodeCount;

      const relationshipCount =
        typeof statsResult.connectionCount === 'object'
          ? statsResult.connectionCount.low ||
            statsResult.connectionCount.high ||
            0
          : statsResult.connectionCount;

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
        averageDegree: statsResult.averageDegree || 0,
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
