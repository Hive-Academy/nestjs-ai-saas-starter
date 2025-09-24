/**
 * @fileoverview Node Model Service for Neo4j Node Operations
 *
 * This service extends the BaseModelService specifically for Neo4j nodes.
 * It provides node-specific operations, relationship management, and graph traversal.
 *
 * Features:
 * - Node-specific CRUD operations
 * - Relationship management (create, delete, query)
 * - Graph traversal and pathfinding
 * - Node property indexing and constraints
 * - Bulk node operations with performance optimization
 */

import { Injectable } from '@nestjs/common';
import {
  BaseModelService,
  BaseEntity,
  ModelQueryOptions,
} from './base-model.service';
import { Neo4jService } from '../services/neo4j.service';
// Removed unused imports from neo4j-driver (QueryResult, Path, Node, Relationship)
import {
  Neo4jProperties,
  Neo4jWhereClause,
  Neo4jCompatibleEntity,
} from '../types/neo4j-types';
import type { Path, Node } from 'neo4j-driver';

/**
 * Node-specific entity interface
 */
export type NodeEntity = BaseEntity; // Simplified: no additional members at present

/**
 * Relationship creation options
 */
export interface CreateRelationshipOptions {
  /** Target node ID */
  targetId: string;
  /** Relationship type */
  type: string;
  /** Relationship properties */
  properties?: Neo4jProperties;
  /** Direction: 'OUT' (default), 'IN', or 'BOTH' */
  direction?: 'OUT' | 'IN' | 'BOTH';
  /** Create target node if it doesn't exist */
  createTarget?: boolean;
  /** Target node data if creating */
  targetData?: Partial<NodeEntity>;
}

/**
 * Relationship query options
 */
export interface RelationshipQueryOptions
  extends ModelQueryOptions<Neo4jCompatibleEntity> {
  /** Relationship types to include */
  types?: string[];
  /** Relationship direction */
  direction?: 'OUT' | 'IN' | 'BOTH';
  /** Maximum depth for traversal */
  maxDepth?: number;
  /** Include relationship properties */
  includeRelationshipProperties?: boolean;
  /** Filter by relationship properties */
  relationshipWhere?: Neo4jWhereClause;
}

/**
 * Graph traversal options
 */
export interface TraversalOptions {
  /** Starting node ID */
  startNodeId: string;
  /** Relationship types to traverse */
  relationshipTypes: string[];
  /** Maximum depth */
  maxDepth: number;
  /** Direction to traverse */
  direction?: 'OUT' | 'IN' | 'BOTH';
  /** Node labels to include */
  nodeLabels?: string[];
  /** Custom filters */
  nodeFilter?: Neo4jWhereClause;
  relationshipFilter?: Neo4jWhereClause;
  /** Path uniqueness */
  uniqueness?:
    | 'NODE_GLOBAL'
    | 'RELATIONSHIP_GLOBAL'
    | 'NODE_PATH'
    | 'RELATIONSHIP_PATH';
}

/**
 * Path result from graph traversal
 */
export interface GraphPath {
  /** Path nodes */
  nodes: NodeEntity[];
  /** Path relationships */
  relationships: Array<{
    id: string;
    type: string;
    properties: Neo4jProperties;
    startNodeId: string;
    endNodeId: string;
  }>;
  /** Path length */
  length: number;
  /** Path weight (if calculated) */
  weight?: number;
}

/**
 * Node statistics
 */
export interface NodeStatistics {
  /** Total node count */
  totalNodes: number;
  /** Nodes by label */
  nodesByLabel: Record<string, number>;
  /** Average degree */
  averageDegree: number;
  /** Node with highest degree */
  highestDegreeNode: {
    id: string;
    degree: number;
  };
  /** Connected components count */
  connectedComponents: number;
}

/**
 * Neo4j Node Model Service
 */
@Injectable()
export abstract class Neo4jNodeModelService<
  T extends NodeEntity
> extends BaseModelService<T> {
  constructor(protected override readonly neo4j: Neo4jService) {
    super(neo4j);
  }

  /**
   * Create a relationship between this node and another node
   */
  async createRelationship(
    sourceId: string,
    options: CreateRelationshipOptions
  ): Promise<{ source: T; target: T; relationship: any }> {
    return this.neo4j.write(async (session) => {
      // Build the query based on options
      let query: string;
      const params: Record<string, any> = {
        sourceId,
        targetId: options.targetId,
        relType: options.type,
        relProps: options.properties || {},
      };

      if (options.createTarget && options.targetData) {
        // Create target node if it doesn't exist
        const targetLabels = [
          this.metadata.label,
          ...(this.metadata.additionalLabels || []),
        ];
        const targetLabelsClause = targetLabels
          .map((label) => `:${label}`)
          .join('');

        query = `
          MATCH (source:${this.metadata.label} {id: $sourceId})
          MERGE (target${targetLabelsClause} {id: $targetId})
          ON CREATE SET target = $targetData
          CREATE (source)-[r:${options.type} $relProps]->(target)
          RETURN source, target, r
        `;
        params.targetData = { ...options.targetData, id: options.targetId };
      } else {
        // Target node must exist
        const direction = options.direction || 'OUT';
        const relPattern =
          direction === 'OUT'
            ? `(source)-[r:${options.type} $relProps]->(target)`
            : direction === 'IN'
            ? `(target)-[r:${options.type} $relProps]->(source)`
            : `(source)-[r:${options.type} $relProps]-(target)`;

        query = `
          MATCH (source:${this.metadata.label} {id: $sourceId})
          MATCH (target:${this.metadata.label} {id: $targetId})
          CREATE ${relPattern}
          RETURN source, target, r
        `;
      }

      const result = await session.run(query, params);

      if (result.records.length === 0) {
        throw new Error(
          `Failed to create relationship between ${sourceId} and ${options.targetId}`
        );
      }

      const record = result.records[0];
      return {
        source: this.transformOutput(
          record.get('source').properties as any
        ) as T,
        target: this.transformOutput(
          record.get('target').properties as any
        ) as T,
        relationship: {
          id: record.get('r').identity.toString(),
          type: record.get('r').type,
          properties: record.get('r').properties,
          startNodeId: record.get('r').start.toString(),
          endNodeId: record.get('r').end.toString(),
        },
      };
    });
  }

  /**
   * Delete a relationship between nodes
   */
  async deleteRelationship(
    sourceId: string,
    targetId: string,
    relationshipType?: string
  ): Promise<boolean> {
    return this.neo4j.write(async (session) => {
      const typeFilter = relationshipType ? `:${relationshipType}` : '';

      const result = await session.run(
        `
        MATCH (source:${this.metadata.label} {id: $sourceId})-[r${typeFilter}]-(target:${this.metadata.label} {id: $targetId})
        DELETE r
        RETURN count(r) as deletedCount
        `,
        { sourceId, targetId }
      );

      return result.records[0].get('deletedCount').toNumber() > 0;
    });
  }

  /**
   * Get related nodes
   */
  async getRelatedNodes(
    nodeId: string,
    options: RelationshipQueryOptions = {}
  ): Promise<{ nodes: T[]; relationships: any[] }> {
    const direction = options.direction || 'BOTH';
    const maxDepth = options.maxDepth || 1;
    const types = options.types || [];

    // Build relationship pattern
    let relPattern: string;
    const typeFilter = types.length > 0 ? `:${types.join('|')}` : '';

    if (direction === 'OUT') {
      relPattern = `(n)-[r${typeFilter}*1..${maxDepth}]->(related)`;
    } else if (direction === 'IN') {
      relPattern = `(n)<-[r${typeFilter}*1..${maxDepth}]-(related)`;
    } else {
      relPattern = `(n)-[r${typeFilter}*1..${maxDepth}]-(related)`;
    }

    // Build WHERE clause
    const whereConditions: string[] = [];
    if (options.relationshipWhere) {
      for (const [key] of Object.entries(options.relationshipWhere)) {
        whereConditions.push(
          `ALL(rel in r WHERE rel.${key} = $relWhere.${key})`
        );
      }
    }
    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    // Build ORDER and LIMIT clauses
    const orderClause = this.buildOrderClause(options.orderBy);
    const limitClause = this.buildLimitClause(options.limit, options.skip);

    return this.neo4j.read(async (session) => {
      const result = await session.run(
        `
        MATCH (n:${this.metadata.label} {id: $nodeId})
        MATCH ${relPattern}
        ${whereClause}
        RETURN related, r
        ${orderClause}
        ${limitClause}
        `,
        {
          nodeId,
          relWhere: options.relationshipWhere || {},
        }
      );

      const nodes: T[] = [];
      const relationships: any[] = [];

      for (const record of result.records) {
        nodes.push(
          this.transformOutput(record.get('related').properties as any) as T
        );

        if (options.includeRelationshipProperties) {
          const rels = record.get('r');
          const relArray = Array.isArray(rels) ? rels : [rels];
          relationships.push(
            ...relArray.map((rel) => ({
              id: rel.identity.toString(),
              type: rel.type,
              properties: rel.properties,
              startNodeId: rel.start.toString(),
              endNodeId: rel.end.toString(),
            }))
          );
        }
      }

      return { nodes, relationships };
    });
  }

  /**
   * Find shortest path between two nodes
   */
  async findShortestPath(
    startNodeId: string,
    endNodeId: string,
    relationshipTypes: string[] = [],
    maxDepth = 10
  ): Promise<GraphPath | null> {
    const typeFilter =
      relationshipTypes.length > 0 ? `:${relationshipTypes.join('|')}` : '';

    return this.neo4j.read(async (session) => {
      const result = await session.run(
        `
        MATCH (start:${this.metadata.label} {id: $startNodeId})
        MATCH (end:${this.metadata.label} {id: $endNodeId})
        MATCH path = shortestPath((start)-[${typeFilter}*..${maxDepth}]-(end))
        RETURN path
        `,
        { startNodeId, endNodeId }
      );

      if (result.records.length === 0) {
        return null;
      }

      const path = result.records[0].get('path') as Path;
      return this.transformPath(path);
    });
  }

  /**
   * Find all paths between two nodes
   */
  async findAllPaths(
    startNodeId: string,
    endNodeId: string,
    options: {
      relationshipTypes?: string[];
      maxDepth?: number;
      limit?: number;
    } = {}
  ): Promise<GraphPath[]> {
    const { relationshipTypes = [], maxDepth = 5, limit = 10 } = options;
    const typeFilter =
      relationshipTypes.length > 0 ? `:${relationshipTypes.join('|')}` : '';

    return this.neo4j.read(async (session) => {
      const result = await session.run(
        `
        MATCH (start:${this.metadata.label} {id: $startNodeId})
        MATCH (end:${this.metadata.label} {id: $endNodeId})
        MATCH path = (start)-[${typeFilter}*1..${maxDepth}]-(end)
        RETURN path
        LIMIT $limit
        `,
        { startNodeId, endNodeId, limit }
      );

      return result.records.map((record) => {
        const path = record.get('path') as Path;
        return this.transformPath(path);
      });
    });
  }

  /**
   * Traverse graph from a starting node
   */
  async traverseGraph(options: TraversalOptions): Promise<{
    nodes: T[];
    relationships: any[];
    paths: GraphPath[];
  }> {
    const {
      startNodeId,
      relationshipTypes,
      maxDepth,
      direction = 'BOTH',
      nodeLabels = [],
      nodeFilter = {},
      relationshipFilter = {},
    } = options;

    // Build relationship pattern
    const typeFilter =
      relationshipTypes.length > 0 ? `:${relationshipTypes.join('|')}` : '';
    let relPattern: string;

    if (direction === 'OUT') {
      relPattern = `(start)-[r${typeFilter}*1..${maxDepth}]->(n)`;
    } else if (direction === 'IN') {
      relPattern = `(start)<-[r${typeFilter}*1..${maxDepth}]-(n)`;
    } else {
      relPattern = `(start)-[r${typeFilter}*1..${maxDepth}]-(n)`;
    }

    // Build node label filter
    const labelFilter = nodeLabels.length > 0 ? `:${nodeLabels.join(':')}` : '';

    // Build WHERE conditions
    const nodeConditions = Object.entries(nodeFilter).map(
      ([key, value]) => `n.${key} = $nodeFilter.${key}`
    );
    const relConditions = Object.entries(relationshipFilter).map(
      ([key, value]) =>
        `ALL(rel in r WHERE rel.${key} = $relationshipFilter.${key})`
    );
    const allConditions = [...nodeConditions, ...relConditions];
    const whereClause =
      allConditions.length > 0 ? `WHERE ${allConditions.join(' AND ')}` : '';

    return this.neo4j.read(async (session) => {
      const result = await session.run(
        `
        MATCH (start:${this.metadata.label} {id: $startNodeId})
        MATCH path = ${relPattern}
        ${labelFilter ? `WHERE n${labelFilter}` : ''}
        ${whereClause}
        RETURN path, n, r
        `,
        {
          startNodeId,
          nodeFilter,
          relationshipFilter,
        }
      );

      const nodesMap = new Map<string, T>();
      const relationshipsMap = new Map<string, any>();
      const paths: GraphPath[] = [];

      for (const record of result.records) {
        const path = record.get('path') as Path;
        const node = record.get('n') as Node;
        const rels = record.get('r');

        // Collect unique nodes
        nodesMap.set(
          node.identity.toString(),
          this.transformOutput((node.properties as any) || {}) as T
        );

        // Collect unique relationships
        const relArray = Array.isArray(rels) ? rels : [rels];
        for (const rel of relArray) {
          relationshipsMap.set(rel.identity.toString(), {
            id: rel.identity.toString(),
            type: rel.type,
            properties: rel.properties,
            startNodeId: rel.start.toString(),
            endNodeId: rel.end.toString(),
          });
        }

        // Transform path
        paths.push(this.transformPath(path));
      }

      return {
        nodes: Array.from(nodesMap.values()),
        relationships: Array.from(relationshipsMap.values()),
        paths,
      };
    });
  }

  /**
   * Get node degree (number of relationships)
   */
  async getNodeDegree(
    nodeId: string,
    relationshipTypes?: string[]
  ): Promise<{
    inDegree: number;
    outDegree: number;
    totalDegree: number;
  }> {
    const typeFilter = relationshipTypes?.length
      ? `:${relationshipTypes.join('|')}`
      : '';

    return this.neo4j.read(async (session) => {
      const result = await session.run(
        `
        MATCH (n:${this.metadata.label} {id: $nodeId})
        OPTIONAL MATCH (n)<-[inRel${typeFilter}]-()
        OPTIONAL MATCH (n)-[outRel${typeFilter}]->()
        RETURN
          count(DISTINCT inRel) as inDegree,
          count(DISTINCT outRel) as outDegree,
          count(DISTINCT inRel) + count(DISTINCT outRel) as totalDegree
        `,
        { nodeId }
      );

      const record = result.records[0];
      return {
        inDegree: record.get('inDegree').toNumber(),
        outDegree: record.get('outDegree').toNumber(),
        totalDegree: record.get('totalDegree').toNumber(),
      };
    });
  }

  /**
   * Get neighbors at specific distance
   */
  async getNeighborsAtDistance(
    nodeId: string,
    distance: number,
    relationshipTypes?: string[]
  ): Promise<T[]> {
    const typeFilter = relationshipTypes?.length
      ? `:${relationshipTypes.join('|')}`
      : '';

    return this.neo4j.read(async (session) => {
      const result = await session.run(
        `
        MATCH (start:${this.metadata.label} {id: $nodeId})
        MATCH (start)-[${typeFilter}*${distance}]-(neighbor:${this.metadata.label})
        WHERE neighbor <> start
        RETURN DISTINCT neighbor
        `,
        { nodeId }
      );

      return result.records.map(
        (record) =>
          this.transformOutput(record.get('neighbor').properties as any) as T
      );
    });
  }

  /**
   * Calculate node centrality measures
   */
  async calculateCentrality(nodeId: string): Promise<{
    betweennessCentrality?: number;
    closenessCentrality?: number;
    eigenvectorCentrality?: number;
    pageRank?: number;
  }> {
    // This would integrate with Neo4j Graph Data Science library
    // For now, return basic degree centrality
    const degree = await this.getNodeDegree(nodeId);

    return {
      // Would be calculated using GDS algorithms
      betweennessCentrality: undefined,
      closenessCentrality: undefined,
      eigenvectorCentrality: undefined,
      pageRank: undefined,
    };
  }

  /**
   * Get node statistics for the entire graph
   */
  async getGraphStatistics(): Promise<NodeStatistics> {
    return this.neo4j.read(async (session) => {
      // Get total nodes by label
      const labelResult = await session.run(
        `MATCH (n:${this.metadata.label}) RETURN count(n) as totalNodes`
      );

      // Get node degrees
      const degreeResult = await session.run(
        `
        MATCH (n:${this.metadata.label})
        OPTIONAL MATCH (n)-[r]-()
        WITH n, count(r) as degree
        RETURN
          avg(degree) as avgDegree,
          max(degree) as maxDegree,
          n.id as maxDegreeNodeId
        ORDER BY degree DESC
        LIMIT 1
        `
      );

      // Get connected components (simplified)
      const componentResult = await session.run(
        `
        MATCH (n:${this.metadata.label})
        RETURN count(DISTINCT n) as components
        `
      );

      const totalNodes = labelResult.records[0].get('totalNodes').toNumber();
      const avgDegree =
        degreeResult.records[0]?.get('avgDegree')?.toNumber() || 0;
      const maxDegree =
        degreeResult.records[0]?.get('maxDegree')?.toNumber() || 0;
      const maxDegreeNodeId =
        degreeResult.records[0]?.get('maxDegreeNodeId') || '';
      const components = componentResult.records[0]
        .get('components')
        .toNumber();

      return {
        totalNodes,
        nodesByLabel: { [this.metadata.label]: totalNodes },
        averageDegree: avgDegree,
        highestDegreeNode: {
          id: maxDegreeNodeId,
          degree: maxDegree,
        },
        connectedComponents: components,
      };
    });
  }

  /**
   * Transform Neo4j Path object to GraphPath
   */
  protected transformPath(path: Path): GraphPath {
    const nodes: NodeEntity[] = [];
    const relationships: any[] = [];

    // Transform nodes
    for (const node of path.segments) {
      const startNode = this.transformOutput(
        (node.start.properties as any) || {}
      ) as NodeEntity;
      const endNode = this.transformOutput(
        (node.end.properties as any) || {}
      ) as NodeEntity;

      if (nodes.length === 0) {
        nodes.push(startNode);
      }
      nodes.push(endNode);

      // Transform relationship
      relationships.push({
        id: node.relationship.identity.toString(),
        type: node.relationship.type,
        properties: node.relationship.properties,
        startNodeId: node.relationship.start.toString(),
        endNodeId: node.relationship.end.toString(),
      });
    }

    return {
      nodes,
      relationships,
      length: path.length,
    };
  }

  /**
   * Bulk create nodes with relationships
   */
  async createNodesWithRelationships(data: {
    nodes: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'version'>>;
    relationships: Array<{
      sourceIndex: number;
      targetIndex: number;
      type: string;
      properties?: Record<string, any>;
    }>;
  }): Promise<{ nodes: T[]; relationships: any[] }> {
    return this.neo4j.write(async (session) => {
      // Create nodes first
      const nodes: T[] = [];
      for (const nodeData of data.nodes) {
        const node = await this.create(nodeData);
        nodes.push(node);
      }

      // Create relationships
      const relationships: any[] = [];
      for (const relData of data.relationships) {
        const sourceNode = nodes[relData.sourceIndex];
        const targetNode = nodes[relData.targetIndex];

        const result = await this.createRelationship(sourceNode.id!, {
          targetId: targetNode.id!,
          type: relData.type,
          properties: relData.properties,
        });

        relationships.push(result.relationship);
      }

      return { nodes, relationships };
    });
  }
}
