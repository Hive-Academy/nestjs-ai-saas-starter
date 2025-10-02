/**
 * @fileoverview Graph Traversal Service
 *
 * This service handles graph traversal operations including neighbor finding,
 * distance calculations, and path finding using type-safe QueryBuilder patterns.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  BaseGraphService,
  GraphTraversalOptions,
  NeighborResult,
  PathResult,
} from './base-graph.service';
import type { NeogmaEntity } from '../../types/neogma-types';

/**
 * Path finding options
 */
export interface PathFindingOptions extends GraphTraversalOptions {
  /** Algorithm to use for path finding */
  algorithm?: 'shortest' | 'all' | 'dijkstra';
  /** Weight property for weighted paths */
  weightProperty?: string;
}

/**
 * Graph Traversal Service
 *
 * Handles neighbor finding, distance calculations, and path finding operations
 * using QueryBuilder patterns for type safety and performance.
 */
@Injectable()
export class GraphTraversalService<
  T extends NeogmaEntity = NeogmaEntity
> extends BaseGraphService<T> {
  protected readonly GraphTraversalLogger = new Logger(
    GraphTraversalService.name
  );

  // ==================== NEIGHBOR OPERATIONS ====================

  /**
   * Find neighbors of a node using QueryBuilder
   */
  async findNeighbors(
    nodeId: string,
    options?: GraphTraversalOptions
  ): Promise<T[]> {
    const startTime = Date.now();
    this.validateTraversalOptions(options);

    try {
      this.logger.debug(`Finding neighbors for node ${nodeId}`);

      const queryBuilder = this.createQueryBuilder();
      const relationshipPattern = this.buildRelationshipPattern(options);
      const depthConstraint = this.buildDepthConstraint(options);
      const whereClause = this.buildWhereClause(
        options?.nodeFilter,
        'neighbor'
      );

      queryBuilder
        .raw(`MATCH (start:${this.entityLabel} {id: $nodeId})`)
        .raw(
          `MATCH (start)${relationshipPattern.replace(
            '-',
            depthConstraint + '-'
          )}(neighbor:${this.entityLabel})`
        )
        .raw('WHERE start <> neighbor');

      if (whereClause) {
        queryBuilder.raw(whereClause);
      }

      queryBuilder.return('DISTINCT neighbor');

      if (options?.limit) {
        queryBuilder.limit(options.limit);
      }

      // Add nodeId parameter to QueryBuilder
      queryBuilder.getBindParam().add('nodeId', nodeId);

      const result = await this.executeQueryBuilder<T>(queryBuilder, {
        retries: 2,
      });

      this.logPerformance('findNeighbors', startTime, result.length);
      return result.map((record) => this.mapToEntity(record));
    } catch (error) {
      this.logger.error(
        `Failed to find neighbors: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }

  /**
   * Find nodes within a specific distance using QueryBuilder
   */
  async findWithinDistance(
    nodeId: string,
    distance: number,
    options?: GraphTraversalOptions
  ): Promise<NeighborResult<T>[]> {
    const startTime = Date.now();
    this.validateTraversalOptions(options);

    if (distance < 1) {
      throw new Error('Distance must be at least 1');
    }

    try {
      this.logger.debug(
        `Finding nodes within distance ${distance} from ${nodeId}`
      );

      const queryBuilder = this.createQueryBuilder();
      const relationshipPattern = this.buildRelationshipPattern(options);

      queryBuilder
        .raw(`MATCH (start:${this.entityLabel} {id: $nodeId})`)
        .raw(
          `MATCH path = (start)${relationshipPattern.replace(
            '-',
            `*1..${distance}-`
          )}(target:${this.entityLabel})`
        )
        .raw('WHERE target.id <> start.id');

      const whereClause = this.buildWhereClause(options?.nodeFilter, 'target');
      if (whereClause) {
        queryBuilder.raw(whereClause);
      }

      if (options?.includePaths) {
        queryBuilder.return(
          'DISTINCT target as node, length(path) as distance, path'
        );
      } else {
        queryBuilder.return(
          'DISTINCT target as node, length(path) as distance'
        );
      }

      queryBuilder.raw('ORDER BY distance');

      if (options?.limit) {
        queryBuilder.limit(options.limit);
      }

      // Add nodeId parameter to QueryBuilder
      queryBuilder.getBindParam().add('nodeId', nodeId);

      const results = await this.executeQueryBuilder<{
        node: T;
        distance: { low: number; high: number } | number;
        path?: unknown[];
      }>(queryBuilder, { retries: 2 });

      const neighbors = results.map((record) => ({
        node: this.mapToEntity(record.node),
        distance:
          typeof record.distance === 'object'
            ? record.distance.low || record.distance.high || 0
            : record.distance,
        ...(options?.includePaths && record.path && { path: record.path }),
      }));

      this.logPerformance('findWithinDistance', startTime, neighbors.length);
      return neighbors;
    } catch (error) {
      this.logger.error(
        `Failed to find nodes within distance: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }

  /**
   * Find common neighbors between two nodes using QueryBuilder
   */
  async findCommonNeighbors(
    nodeId1: string,
    nodeId2: string,
    options?: GraphTraversalOptions
  ): Promise<T[]> {
    const startTime = Date.now();
    this.validateTraversalOptions(options);

    try {
      this.logger.debug(
        `Finding common neighbors between ${nodeId1} and ${nodeId2}`
      );

      const queryBuilder = this.createQueryBuilder();
      const relationshipClause = this.buildRelationshipClause(options);

      queryBuilder
        .raw(`MATCH (node1:${this.entityLabel} {id: $nodeId1})`)
        .raw(`MATCH (node2:${this.entityLabel} {id: $nodeId2})`)
        .raw(`MATCH (node1)${relationshipClause}(common:${this.entityLabel})`)
        .raw(`MATCH (node2)${relationshipClause}(common)`);

      const whereClause = this.buildWhereClause(options?.nodeFilter, 'common');
      if (whereClause) {
        queryBuilder.raw(whereClause);
      }

      queryBuilder.return('DISTINCT common');

      if (options?.limit) {
        queryBuilder.limit(options.limit);
      }

      // Add parameters to QueryBuilder
      queryBuilder.getBindParam().add('nodeId1', nodeId1);
      queryBuilder.getBindParam().add('nodeId2', nodeId2);

      const results = await this.executeQueryBuilder<T>(queryBuilder, {
        retries: 2,
      });

      this.logPerformance('findCommonNeighbors', startTime, results.length);
      return results.map((record) => this.mapToEntity(record));
    } catch (error) {
      this.logger.error(
        `Failed to find common neighbors: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }

  // ==================== PATH FINDING OPERATIONS ====================

  /**
   * Find shortest path between two nodes using QueryBuilder
   */
  async findShortestPath(
    fromId: string,
    toId: string,
    options?: PathFindingOptions
  ): Promise<PathResult<T> | null> {
    const startTime = Date.now();
    this.validateTraversalOptions(options);

    try {
      this.logger.debug(`Finding shortest path from ${fromId} to ${toId}`);

      const queryBuilder = this.createQueryBuilder();
      const relationshipClause = this.buildRelationshipClause(options);
      const maxDepth = options?.maxDepth || 10;

      queryBuilder
        .raw(`MATCH (start:${this.entityLabel} {id: $fromId})`)
        .raw(`MATCH (end:${this.entityLabel} {id: $toId})`);

      if (options?.algorithm === 'dijkstra' && options?.weightProperty) {
        // Use weighted shortest path with specified weight property
        queryBuilder
          .raw(
            `CALL gds.shortestPath.dijkstra.stream({
            sourceNode: start,
            targetNode: end,
            relationshipWeightProperty: '${options.weightProperty}'
          })`
          )
          .return('path, totalCost');
      } else {
        // Use standard shortest path
        queryBuilder
          .raw(
            `MATCH path = shortestPath((start)${relationshipClause.replace(
              '-',
              `*1..${maxDepth}-`
            )}(end))`
          )
          .return('nodes(path) as path, length(path) as length');
      }

      queryBuilder.limit(1);

      // Add parameters to QueryBuilder
      queryBuilder.getBindParam().add('fromId', fromId);
      queryBuilder.getBindParam().add('toId', toId);

      const results = await this.executeQueryBuilder<{
        path: T[] | { nodes: T[] };
        length?: { low: number; high: number } | number;
        totalCost?: number;
      }>(queryBuilder, { retries: 2 });

      if (results.length === 0) {
        this.logger.debug(`No path found between ${fromId} and ${toId}`);
        return null;
      }

      const record = results[0];
      let pathNodes: T[];
      let pathLength: number;

      if (Array.isArray(record.path)) {
        pathNodes = record.path.map((node) => this.mapToEntity(node));
        pathLength =
          typeof record.length === 'object'
            ? record.length?.low || record.length?.high || 0
            : record.length || pathNodes.length - 1;
      } else if (record.path && 'nodes' in record.path) {
        pathNodes = (record.path.nodes as T[]).map((node) =>
          this.mapToEntity(node)
        );
        pathLength = pathNodes.length - 1;
      } else {
        this.logger.warn('Unexpected path format in result');
        return null;
      }

      const result: PathResult<T> = {
        path: pathNodes,
        length: pathLength,
        ...(record.totalCost && { weight: record.totalCost }),
      };

      this.logPerformance('findShortestPath', startTime);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to find shortest path: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }

  /**
   * Find all paths between two nodes using QueryBuilder
   */
  async findAllPaths(
    fromId: string,
    toId: string,
    options?: PathFindingOptions
  ): Promise<PathResult<T>[]> {
    const startTime = Date.now();
    this.validateTraversalOptions(options);

    try {
      this.logger.debug(`Finding all paths from ${fromId} to ${toId}`);

      const queryBuilder = this.createQueryBuilder();
      const relationshipClause = this.buildRelationshipClause(options);
      const maxDepth = options?.maxDepth || 5; // Lower default for all paths

      queryBuilder
        .raw(`MATCH (start:${this.entityLabel} {id: $fromId})`)
        .raw(`MATCH (end:${this.entityLabel} {id: $toId})`)
        .raw(
          `MATCH path = (start)${relationshipClause.replace(
            '-',
            `*1..${maxDepth}-`
          )}(end)`
        )
        .return('nodes(path) as path, length(path) as length')
        .raw('ORDER BY length');

      if (options?.limit) {
        queryBuilder.limit(options.limit);
      }

      // Add parameters to QueryBuilder
      queryBuilder.getBindParam().add('fromId', fromId);
      queryBuilder.getBindParam().add('toId', toId);

      const results = await this.executeQueryBuilder<{
        path: T[];
        length: { low: number; high: number } | number;
      }>(queryBuilder, { retries: 2 });

      const paths = results.map((record) => ({
        path: record.path.map((node) => this.mapToEntity(node)),
        length:
          typeof record.length === 'object'
            ? record.length?.low || record.length?.high || 0
            : record.length,
      }));

      this.logPerformance('findAllPaths', startTime, paths.length);
      return paths;
    } catch (error) {
      this.logger.error(
        `Failed to find all paths: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
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
    const startTime = Date.now();

    if (k < 1) {
      throw new Error('k must be at least 1');
    }

    try {
      this.logger.debug(
        `Finding ${k} shortest paths from ${fromId} to ${toId}`
      );

      // For k-shortest paths, we can use a more sophisticated approach
      // or fall back to finding all paths and taking the k shortest
      const allPaths = await this.findAllPaths(fromId, toId, {
        ...options,
        limit: k * 2, // Get more paths than needed, then filter
      });

      // Sort by length and take k shortest
      const kShortest = allPaths
        .sort((a, b) => a.length - b.length)
        .slice(0, k);

      this.logPerformance('findKShortestPaths', startTime, kShortest.length);
      return kShortest;
    } catch (error) {
      this.logger.error(
        `Failed to find k-shortest paths: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }
}
