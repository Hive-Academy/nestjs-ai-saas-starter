import { Injectable, Logger } from '@nestjs/common';
import {
  InjectNeogma,
  NeogmaService,
  Safe,
  ParameterBindingUtility,
} from '@hive-academy/nestjs-neo4j';
import type {
  TraversalSpec,
  GraphTraversalResult,
  GraphStats,
  GraphNode,
  GraphPath,
} from '@hive-academy/langgraph-memory';
import { Memory } from '../../entities/neo4j/memory.entity';
import { GraphHelpersService } from './graph-helpers.service';

/**
 * Graph Traversal Service
 *
 * Handles graph traversal operations, relationship queries, and statistics.
 * Extracted from memory-graph.repository.ts (lines 53-254).
 */
@Injectable()
export class GraphTraversalService {
  private readonly logger = new Logger(GraphTraversalService.name);

  constructor(
    @InjectNeogma() private readonly neogma: NeogmaService,
    private readonly helpers: GraphHelpersService
  ) {}

  // ============================================================================
  // GRAPH TRAVERSAL OPERATIONS
  // ============================================================================

  /**
   * Traverse the graph starting from a memory node
   * Migrated from: traverse() in neo4j-graph.adapter.ts
   */
  @Safe()
  async traverse(
    startMemoryId: string,
    spec: TraversalSpec
  ): Promise<GraphTraversalResult> {
    if (!startMemoryId?.trim()) {
      throw new Error('Start memory ID is required');
    }

    try {
      const depth = spec.depth || 1;
      const direction = this.helpers.getTraversalDirection(spec.direction);
      const relationshipFilter = this.helpers.buildRelationshipFilter(
        spec.relationshipTypes
      );
      const nodeFilter = this.helpers.buildNodeFilter(spec.nodeLabels);
      const propertyFilter = this.helpers.buildPropertyFilter(spec.filter);

      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const startMemoryIdParam = ParameterBindingUtility.addParam(
        bindParam,
        'startMemoryId',
        startMemoryId
      );
      const limitParam = ParameterBindingUtility.addParam(
        bindParam,
        'limit',
        spec.limit || 100
      );

      queryBuilder.match(
        `path = (start:Memory {id: $${startMemoryIdParam}})${direction.start}[r${relationshipFilter}*1..${depth}]${direction.end}(end${nodeFilter})`
      );

      if (propertyFilter) {
        queryBuilder.where(propertyFilter);
      }

      queryBuilder
        .return(
          `
          nodes(path) as nodes,
          relationships(path) as relationships,
          path
        `
        )
        .limit(`$${limitParam}`);

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      const nodes: GraphNode[] = [];
      const relationships: any[] = [];
      const paths: GraphPath[] = [];

      result.records.forEach((record) => {
        const pathNodes = this.helpers.extractNodes(record.get('nodes') || []);
        const pathRels = this.helpers.extractRelationships(
          record.get('relationships') || []
        );
        const path = this.helpers.extractPath(record.get('path'));

        nodes.push(...pathNodes);
        relationships.push(...pathRels);
        paths.push(path);
      });

      const uniqueNodes = this.helpers.deduplicateNodes(nodes);
      const uniqueRelationships =
        this.helpers.deduplicateRelationships(relationships);

      this.logger.debug(
        `Traversed from ${startMemoryId}: found ${uniqueNodes.length} nodes, ${uniqueRelationships.length} relationships`
      );

      return {
        nodes: uniqueNodes,
        relationships: uniqueRelationships,
        paths,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to traverse from memory ${startMemoryId}: ${errorMsg}`
      );
    }
  }

  /**
   * Find related memories for a specific memory node
   * Migrated from: findRelated() pattern in neo4j-graph.adapter.ts
   */
  @Safe()
  async findRelated(
    memoryId: string,
    relationshipTypes?: string[],
    maxDepth = 2,
    limit = 20
  ): Promise<{
    relatedMemories: Memory[];
    relationshipPaths: GraphPath[];
    totalFound: number;
  }> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const memoryIdParam = ParameterBindingUtility.addParam(
        bindParam,
        'memoryId',
        memoryId
      );
      const limitParam = ParameterBindingUtility.addParam(
        bindParam,
        'limit',
        limit
      );

      queryBuilder.match(
        `path = (start:Memory {id: $${memoryIdParam}})-[*1..${maxDepth}]-(related:Memory)`
      );

      if (relationshipTypes && relationshipTypes.length > 0) {
        const typeFilter = relationshipTypes
          .map((type) => `type(r) = '${type}'`)
          .join(' OR ');
        queryBuilder.where(`ALL(r IN relationships(path) WHERE ${typeFilter})`);
      }

      queryBuilder
        .with(
          `
          related,
          path,
          reduce(score = 0, r IN relationships(path) |
            score + CASE
              WHEN r.strength IS NOT NULL THEN r.strength
              ELSE 0.5
            END
          ) as relevanceScore
        `
        )
        .return('related, path, relevanceScore')
        .orderBy('relevanceScore DESC, length(path) ASC')
        .limit(`$${limitParam}`);

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      const relatedMemories: Memory[] = [];
      const relationshipPaths: GraphPath[] = [];

      for (const record of result.records) {
        const memoryNode = record.get('related');
        const pathData = record.get('path');

        if (memoryNode?.properties) {
          relatedMemories.push(
            this.helpers.mapNodeToMemory(memoryNode.properties)
          );
        }

        if (pathData) {
          relationshipPaths.push(this.helpers.extractPath(pathData));
        }
      }

      return {
        relatedMemories,
        relationshipPaths,
        totalFound: result.records.length,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to find related memories for ${memoryId}: ${errorMsg}`
      );
    }
  }

  /**
   * Get comprehensive graph statistics
   * Migrated from: getStats() in neo4j-graph.adapter.ts
   */
  @Safe()
  async getStats(): Promise<GraphStats> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      queryBuilder.match('(n:Memory)').match('()-[r]->()').return(`
          count(DISTINCT n) as nodeCount,
          count(DISTINCT r) as relationshipCount
        `);

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const basicResult = await this.neogma.run(cypher, params);
      const basicRecord = basicResult.records[0];

      const nodeCount = Number(basicRecord?.get('nodeCount')) || 0;
      const relationshipCount =
        Number(basicRecord?.get('relationshipCount')) || 0;

      const [labelStats, relationshipStats] = await Promise.all([
        this.getMemoryCountsByType(),
        this.getRelationshipCountsByType(),
      ]);

      return {
        nodeCount,
        relationshipCount,
        indexCount: 0,
        databaseSize: undefined,
        lastUpdated: new Date(),
        nodeCountsByLabel: labelStats,
        relationshipCountsByType: relationshipStats,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get graph statistics: ${errorMsg}`);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async getMemoryCountsByType(): Promise<Record<string, number>> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      queryBuilder
        .match('(m:Memory)')
        .return('m.memoryType as memoryType, count(*) as count');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);
      const counts: Record<string, number> = {};

      result.records.forEach((record) => {
        const memoryType = String(record.get('memoryType') || 'unknown');
        const count = Number(record.get('count')) || 0;
        counts[memoryType] = count;
      });

      return counts;
    } catch (error) {
      this.logger.warn('Failed to get memory counts by type', error);
      return {};
    }
  }

  private async getRelationshipCountsByType(): Promise<Record<string, number>> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      queryBuilder
        .match('()-[r]->()')
        .return('type(r) as relType, count(*) as count');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);
      const counts: Record<string, number> = {};

      result.records.forEach((record) => {
        const relType = String(record.get('relType') || 'unknown');
        const count = Number(record.get('count')) || 0;
        counts[relType] = count;
      });

      return counts;
    } catch (error) {
      this.logger.warn('Failed to get relationship counts by type', error);
      return {};
    }
  }
}
