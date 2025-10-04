/**
 * @fileoverview Graph Repository Facade
 *
 * This facade provides a unified interface over the split graph services
 * for backward compatibility while delegating to the modern QueryBuilder-based services.
 */

import { Injectable, Logger } from '@nestjs/common';
import { GraphTraversalService } from './graph/graph-traversal.service';
import { GraphMetricsService } from './graph/graph-metrics.service';
import { GraphPatternService } from './graph/graph-pattern.service';
import type {
  GraphTraversalOptions,
  NeighborResult,
  PathResult,
  GraphPattern,
} from './graph/base-graph.service';
import type {
  CentralityMetric,
  ConnectedComponent,
  GraphStatistics,
  CentralityResult,
  CommunityDetectionOptions,
} from './graph/graph-metrics.service';
import type { PathFindingOptions } from './graph/graph-traversal.service';
import type {
  GraphQueryPattern,
  SubgraphOptions,
  SubgraphResult,
  GraphCycle,
} from './graph/graph-pattern.service';
import type { NeogmaEntity } from '../types/neogma-types';

/**
 * Graph Repository Facade (LEGACY COMPATIBILITY)
 *
 * This class provides a unified interface over the split graph services:
 * - GraphTraversalService: Neighbor finding, distance calculations, and path finding
 * - GraphMetricsService: Centrality calculations and graph analysis
 * - GraphPatternService: Pattern matching and subgraph operations
 *
 * RECOMMENDED: Use GraphTraversalService, GraphMetricsService, and GraphPatternService directly
 * for new development. This facade is maintained for backward compatibility.
 *
 * Migration Guide:
 * - Traversal operations → GraphTraversalService
 * - Metrics and centrality → GraphMetricsService
 * - Pattern matching → GraphPatternService
 * - All operations use modern QueryBuilder patterns for type safety
 *
 * @template T The entity type this repository manages
 */
@Injectable()
export class GraphRepository<T extends NeogmaEntity = NeogmaEntity> {
  protected readonly logger = new Logger(GraphRepository.name);

  constructor(
    private readonly traversalService: GraphTraversalService<T>,
    private readonly metricsService: GraphMetricsService<T>,
    private readonly patternService: GraphPatternService<T>,
    protected readonly entityLabel = 'Entity'
  ) {
    this.logger.warn(
      'GraphRepository is deprecated. Use GraphTraversalService, GraphMetricsService, and GraphPatternService directly.'
    );
  }

  // =============================================================================
  // CORE GRAPH OPERATIONS (Delegated to GraphTraversalService)
  // =============================================================================

  /**
   * Find neighbors of a node
   */
  async findNeighbors(
    nodeId: string,
    options?: GraphTraversalOptions
  ): Promise<T[]> {
    return this.traversalService.findNeighbors(nodeId, options);
  }

  /**
   * Find nodes within a specific distance
   */
  async findWithinDistance(
    nodeId: string,
    distance: number,
    options?: GraphTraversalOptions
  ): Promise<NeighborResult<T>[]> {
    return this.traversalService.findWithinDistance(nodeId, distance, options);
  }

  /**
   * Find common neighbors between two nodes
   */
  async findCommonNeighbors(
    nodeId1: string,
    nodeId2: string,
    options?: GraphTraversalOptions
  ): Promise<T[]> {
    return this.traversalService.findCommonNeighbors(nodeId1, nodeId2, options);
  }

  // =============================================================================
  // PATH FINDING OPERATIONS (Delegated to GraphTraversalService)
  // =============================================================================

  /**
   * Find shortest path between two nodes
   */
  async findShortestPath(
    fromId: string,
    toId: string,
    options?: PathFindingOptions
  ): Promise<PathResult<T> | null> {
    return this.traversalService.findShortestPath(fromId, toId, options);
  }

  /**
   * Find all paths between two nodes
   */
  async findAllPaths(
    fromId: string,
    toId: string,
    options?: PathFindingOptions
  ): Promise<PathResult<T>[]> {
    return this.traversalService.findAllPaths(fromId, toId, options);
  }

  /**
   * Find k-shortest paths between two nodes
   */
  async findKShortestPaths(
    fromId: string,
    toId: string,
    k: number,
    options?: PathFindingOptions
  ): Promise<PathResult<T>[]> {
    return this.traversalService.findKShortestPaths(fromId, toId, k, options);
  }

  // =============================================================================
  // GRAPH METRICS (Delegated to GraphMetricsService)
  // =============================================================================

  /**
   * Calculate degree centrality for a node
   */
  async calculateDegreeCentrality(
    nodeId: string,
    options?: GraphTraversalOptions
  ): Promise<number> {
    return this.metricsService.calculateDegreeCentrality(nodeId, options);
  }

  /**
   * Calculate centrality scores for all nodes
   */
  async calculateCentralityScores(
    metric: CentralityMetric,
    options?: GraphTraversalOptions
  ): Promise<CentralityResult<T>[]> {
    return this.metricsService.calculateCentralityScores(metric, options);
  }

  /**
   * Find connected components in the graph
   */
  async findConnectedComponents(
    options?: GraphTraversalOptions
  ): Promise<ConnectedComponent<T>[]> {
    return this.metricsService.findConnectedComponents(options);
  }

  /**
   * Detect communities using various algorithms
   */
  async detectCommunities(
    options?: CommunityDetectionOptions
  ): Promise<Array<{ communityId: string; nodes: T[]; modularity?: number }>> {
    return this.metricsService.detectCommunities(options);
  }

  /**
   * Calculate comprehensive graph statistics
   */
  async getGraphStatistics(
    options?: GraphTraversalOptions
  ): Promise<GraphStatistics> {
    return this.metricsService.getGraphStatistics(options);
  }

  /**
   * Find nodes with highest centrality scores
   */
  async findCentralNodes(
    metric: CentralityMetric = 'degree',
    limit = 10,
    options?: GraphTraversalOptions
  ): Promise<CentralityResult<T>[]> {
    return this.metricsService.findCentralNodes(metric, limit, options);
  }

  /**
   * Analyze node importance across multiple centrality metrics
   */
  async analyzeNodeImportance(
    nodeId: string,
    options?: GraphTraversalOptions
  ): Promise<{ [K in CentralityMetric]: number }> {
    return this.metricsService.analyzeNodeImportance(nodeId, options);
  }

  // =============================================================================
  // PATTERN MATCHING (Delegated to GraphPatternService)
  // =============================================================================

  /**
   * Match complex graph patterns
   */
  async matchPattern(
    pattern: GraphPattern,
    options?: { limit?: number }
  ): Promise<Array<{ [key: string]: T }>> {
    return this.patternService.matchPattern(pattern, options);
  }

  /**
   * Execute custom graph query pattern
   */
  async executeCustomPattern(
    pattern: GraphQueryPattern,
    params?: { [key: string]: unknown }
  ): Promise<Array<{ [key: string]: unknown }>> {
    return this.patternService.executeCustomPattern(pattern, params);
  }

  /**
   * Get subgraph around a set of nodes
   */
  async getSubgraph(
    nodeIds: string[],
    options?: SubgraphOptions
  ): Promise<SubgraphResult<T>> {
    return this.patternService.getSubgraph(nodeIds, options);
  }

  /**
   * Expand graph from a starting node
   */
  async expandGraph(
    nodeId: string,
    depth: number,
    options?: SubgraphOptions
  ): Promise<SubgraphResult<T>> {
    return this.patternService.expandGraph(nodeId, depth, options);
  }

  /**
   * Find cycles in the graph
   */
  async findCycles(
    maxLength = 10,
    options?: GraphTraversalOptions
  ): Promise<GraphCycle<T>[]> {
    return this.patternService.findCycles(maxLength, options);
  }

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
    return this.patternService.findStructuralPattern(
      patternDescription,
      options
    );
  }

  /**
   * Find motifs (small recurring patterns) in the graph
   */
  async findMotifs(
    motifSize = 3,
    options?: GraphTraversalOptions
  ): Promise<Array<{ nodes: T[]; pattern: string }>> {
    return this.patternService.findMotifs(motifSize, options);
  }

  // =============================================================================
  // LEGACY COMPATIBILITY METHODS
  // =============================================================================

  /**
   * Build relationship clause for traversal queries (legacy compatibility)
   * @deprecated Use services directly
   */
  protected buildRelationshipClause(options?: GraphTraversalOptions): string {
    return this.traversalService['buildRelationshipClause'](options);
  }

  /**
   * Build WHERE clause from filter conditions (legacy compatibility)
   * @deprecated Use services directly
   */
  protected buildWhereClause(
    filter?: { [key: string]: unknown },
    nodeVariable = 'n'
  ): string {
    return this.traversalService['buildWhereClause'](filter, nodeVariable);
  }

  /**
   * Build MATCH clauses from graph pattern (legacy compatibility)
   * @deprecated Use services directly
   */
  protected buildPatternMatch(pattern: GraphPattern): string[] {
    return this.patternService['buildPatternMatch'](pattern);
  }

  /**
   * Build relationship pattern for QueryBuilder (legacy compatibility)
   * @deprecated Use services directly
   */
  protected buildRelationshipPattern(options?: GraphTraversalOptions): string {
    return this.traversalService['buildRelationshipPattern'](options);
  }
}

// Type re-exports for external consumption
export type {
  GraphTraversalOptions,
  NeighborResult,
  PathResult,
  GraphPattern,
} from './graph/base-graph.service';
export type {
  CentralityMetric,
  ConnectedComponent,
  GraphStatistics,
  CentralityResult,
  CommunityDetectionOptions,
} from './graph/graph-metrics.service';
export type { PathFindingOptions } from './graph/graph-traversal.service';
export type {
  GraphQueryPattern,
  SubgraphOptions,
  SubgraphResult,
  GraphCycle,
} from './graph/graph-pattern.service';
