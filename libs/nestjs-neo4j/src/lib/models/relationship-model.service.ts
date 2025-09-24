/**
 * @fileoverview Relationship Model Service for Neo4j Relationship Operations
 *
 * This service extends the BaseModelService specifically for Neo4j relationships.
 * It provides relationship-specific operations, pattern matching, and relationship analytics.
 *
 * Features:
 * - Relationship-specific CRUD operations
 * - Bidirectional relationship management
 * - Relationship pattern matching and analysis
 * - Relationship property management
 * - Relationship aggregation and analytics
 */

import { Injectable } from '@nestjs/common';
import {
  BaseModelService,
  BaseEntity,
  ModelQueryOptions,
} from './base-model.service';
import { Neo4jService } from '../services/neo4j.service';
import type { Relationship, Node } from 'neo4j-driver';
import {
  Neo4jProperties,
  Neo4jWhereClause,
  Neo4jCompatibleEntity,
} from '../types/neo4j-types';

/**
 * Relationship-specific entity interface
 */
export interface RelationshipEntity extends BaseEntity {
  /** Relationship type */
  type: string;
  /** Start node ID */
  startNodeId: string;
  /** End node ID */
  endNodeId: string;
  /** Relationship direction for queries */
  direction?: 'OUT' | 'IN' | 'BOTH';
}

/**
 * Relationship creation options
 */
export interface CreateRelationshipOptions {
  /** Start node ID */
  startNodeId: string;
  /** End node ID */
  endNodeId: string;
  /** Relationship type */
  type: string;
  /** Relationship properties */
  properties?: Neo4jProperties;
  /** Start node labels (for validation) */
  startNodeLabels?: string[];
  /** End node labels (for validation) */
  endNodeLabels?: string[];
  /** Replace existing relationship of same type */
  replace?: boolean;
  /** Allow self-relationships */
  allowSelfRelationship?: boolean;
}

/**
 * Relationship query options
 */
export interface RelationshipQueryOptions
  extends ModelQueryOptions<Neo4jCompatibleEntity> {
  /** Start node ID filter */
  startNodeId?: string;
  /** End node ID filter */
  endNodeId?: string;
  /** Relationship types to include */
  types?: string[];
  /** Start node labels filter */
  startNodeLabels?: string[];
  /** End node labels filter */
  endNodeLabels?: string[];
  /** Include connected nodes */
  includeNodes?: boolean;
  /** Relationship direction */
  direction?: 'OUT' | 'IN' | 'BOTH';
  /** Property filters */
  propertyFilters?: Neo4jWhereClause;
}

/**
 * Relationship pattern for advanced queries
 */
export interface RelationshipPattern {
  /** Pattern nodes */
  nodes: Array<{
    variable: string;
    labels?: string[];
    properties?: Neo4jProperties;
  }>;
  /** Pattern relationships */
  relationships: Array<{
    variable: string;
    type?: string;
    direction: 'OUT' | 'IN' | 'BOTH';
    properties?: Neo4jProperties;
    startNode: string;
    endNode: string;
  }>;
  /** WHERE conditions */
  where?: string[];
  /** RETURN clause */
  returnClause?: string;
}

/**
 * Relationship analytics result
 */
export interface RelationshipAnalytics {
  /** Total relationship count */
  totalRelationships: number;
  /** Relationships by type */
  relationshipsByType: Record<string, number>;
  /** Most connected nodes */
  mostConnectedNodes: Array<{
    nodeId: string;
    labels: string[];
    inDegree: number;
    outDegree: number;
    totalDegree: number;
  }>;
  /** Relationship density */
  density: number;
  /** Average relationship properties */
  averageProperties?: Record<string, number>;
}

/**
 * Bidirectional relationship result
 */
export interface BidirectionalRelationship<T extends RelationshipEntity> {
  /** Forward relationship */
  forward: T;
  /** Reverse relationship */
  reverse: T;
  /** Connected nodes */
  nodes: {
    start: any;
    end: any;
  };
}

/**
 * Neo4j Relationship Model Service
 */
@Injectable()
export abstract class Neo4jRelationshipModelService<
  T extends RelationshipEntity
> extends BaseModelService<T> {
  constructor(protected override readonly neo4j: Neo4jService) {
    super(neo4j);
  }

  /**
   * Create a new relationship
   */
  async createRelationship(options: CreateRelationshipOptions): Promise<T> {
    // Validate self-relationship
    if (
      !options.allowSelfRelationship &&
      options.startNodeId === options.endNodeId
    ) {
      throw new Error('Self-relationships are not allowed');
    }

    return this.neo4j.write(async (session) => {
      // Check if nodes exist and have correct labels
      const nodeCheckQuery = `
        MATCH (start {id: $startNodeId})
        MATCH (end {id: $endNodeId})
        RETURN start, end
      `;

      const nodeResult = await session.run(nodeCheckQuery, {
        startNodeId: options.startNodeId,
        endNodeId: options.endNodeId,
      });

      if (nodeResult.records.length === 0) {
        throw new Error(
          `Start node ${options.startNodeId} or end node ${options.endNodeId} not found`
        );
      }

      const startNode = nodeResult.records[0].get('start');
      const endNode = nodeResult.records[0].get('end');

      // Validate node labels if specified
      if (options.startNodeLabels) {
        const hasLabels = options.startNodeLabels.every((label) =>
          startNode.labels.includes(label)
        );
        if (!hasLabels) {
          throw new Error(
            `Start node does not have required labels: ${options.startNodeLabels.join(
              ', '
            )}`
          );
        }
      }

      if (options.endNodeLabels) {
        const hasLabels = options.endNodeLabels.every((label) =>
          endNode.labels.includes(label)
        );
        if (!hasLabels) {
          throw new Error(
            `End node does not have required labels: ${options.endNodeLabels.join(
              ', '
            )}`
          );
        }
      }

      // Handle replace option
      if (options.replace) {
        await session.run(
          `
          MATCH (start {id: $startNodeId})-[r:${options.type}]->(end {id: $endNodeId})
          DELETE r
          `,
          {
            startNodeId: options.startNodeId,
            endNodeId: options.endNodeId,
          }
        );
      }

      // Create relationship with system properties
      const now = new Date();
      const relationshipId = this.generateRelationshipId(options.type);
      const relationshipProperties = {
        ...options.properties,
        id: relationshipId,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      const createQuery = `
        MATCH (start {id: $startNodeId})
        MATCH (end {id: $endNodeId})
        CREATE (start)-[r:${options.type} $properties]->(end)
        RETURN r, start, end
      `;

      const result = await session.run(createQuery, {
        startNodeId: options.startNodeId,
        endNodeId: options.endNodeId,
        properties: relationshipProperties,
      });

      const record = result.records[0];
      const rel = record.get('r') as Relationship;
      const start = record.get('start') as Node;
      const end = record.get('end') as Node;

      return this.transformRelationshipResult(rel, start, end) as T;
    });
  }

  /**
   * Find relationships by pattern
   */
  async findByPattern(pattern: RelationshipPattern): Promise<T[]> {
    // Build MATCH clauses
    const nodeMatches = pattern.nodes.map((node) => {
      const labels = node.labels ? `:${node.labels.join(':')}` : '';
      const props = node.properties ? ' $' + node.variable + 'Props' : '';
      return `(${node.variable}${labels}${props})`;
    });

    const relMatches = pattern.relationships.map((rel) => {
      const type = rel.type ? `:${rel.type}` : '';
      const props = rel.properties ? ' $' + rel.variable + 'Props' : '';
      const direction = rel.direction;

      if (direction === 'OUT') {
        return `(${rel.startNode})-[${rel.variable}${type}${props}]->(${rel.endNode})`;
      } else if (direction === 'IN') {
        return `(${rel.startNode})<-[${rel.variable}${type}${props}]-(${rel.endNode})`;
      } else {
        return `(${rel.startNode})-[${rel.variable}${type}${props}]-(${rel.endNode})`;
      }
    });

    // Build WHERE clause
    const whereClause =
      pattern.where && pattern.where.length > 0
        ? `WHERE ${pattern.where.join(' AND ')}`
        : '';

    // Build RETURN clause
    const returnClause =
      pattern.returnClause ||
      pattern.relationships.map((rel) => rel.variable).join(', ');

    // Build parameters
    const params: Record<string, any> = {};
    pattern.nodes.forEach((node) => {
      if (node.properties) {
        params[node.variable + 'Props'] = node.properties;
      }
    });
    pattern.relationships.forEach((rel) => {
      if (rel.properties) {
        params[rel.variable + 'Props'] = rel.properties;
      }
    });

    const query = `
      MATCH ${[...nodeMatches, ...relMatches].join(', ')}
      ${whereClause}
      RETURN ${returnClause}
    `;

    return this.neo4j.read(async (session) => {
      const result = await session.run(query, params);

      return result.records.map((record) => {
        // Assuming first relationship variable for simplicity
        const relVar = pattern.relationships[0].variable;
        const rel = record.get(relVar) as Relationship;
        return this.transformRelationshipOutput(rel) as T;
      });
    });
  }

  /**
   * Find relationships between specific nodes
   */
  async findBetweenNodes(
    startNodeId: string,
    endNodeId: string,
    options: RelationshipQueryOptions = {}
  ): Promise<T[]> {
    const typeFilter =
      options.types && options.types.length > 0
        ? `:${options.types.join('|')}`
        : '';

    const direction = options.direction || 'BOTH';
    let relPattern: string;

    if (direction === 'OUT') {
      relPattern = `(start)-[r${typeFilter}]->(end)`;
    } else if (direction === 'IN') {
      relPattern = `(start)<-[r${typeFilter}]-(end)`;
    } else {
      relPattern = `(start)-[r${typeFilter}]-(end)`;
    }

    // Build property filters
    const propertyConditions = options.propertyFilters
      ? Object.entries(options.propertyFilters).map(
          ([key, value]) => `r.${key} = $propFilters.${key}`
        )
      : [];

    const whereClause =
      propertyConditions.length > 0
        ? `WHERE ${propertyConditions.join(' AND ')}`
        : '';

    return this.neo4j.read(async (session) => {
      const result = await session.run(
        `
        MATCH (start {id: $startNodeId})
        MATCH (end {id: $endNodeId})
        MATCH ${relPattern}
        ${whereClause}
        RETURN r, start, end
        `,
        {
          startNodeId,
          endNodeId,
          propFilters: options.propertyFilters || {},
        }
      );

      return result.records.map((record) => {
        const rel = record.get('r') as Relationship;
        const start = record.get('start') as Node;
        const end = record.get('end') as Node;
        return this.transformRelationshipResult(rel, start, end) as T;
      });
    });
  }

  /**
   * Get all relationships for a specific node
   */
  async getNodeRelationships(
    nodeId: string,
    options: RelationshipQueryOptions = {}
  ): Promise<T[]> {
    const typeFilter =
      options.types && options.types.length > 0
        ? `:${options.types.join('|')}`
        : '';

    const direction = options.direction || 'BOTH';
    let relPattern: string;

    if (direction === 'OUT') {
      relPattern = `(n)-[r${typeFilter}]->(other)`;
    } else if (direction === 'IN') {
      relPattern = `(n)<-[r${typeFilter}]-(other)`;
    } else {
      relPattern = `(n)-[r${typeFilter}]-(other)`;
    }

    // Build filters
    const conditions: string[] = [];

    if (options.propertyFilters) {
      conditions.push(
        ...Object.entries(options.propertyFilters).map(
          ([key, value]) => `r.${key} = $propFilters.${key}`
        )
      );
    }

    if (options.startNodeLabels && direction !== 'IN') {
      conditions.push(`ALL(label IN $startLabels WHERE label IN labels(n))`);
    }

    if (options.endNodeLabels && direction !== 'OUT') {
      conditions.push(`ALL(label IN $endLabels WHERE label IN labels(other))`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderClause = this.buildOrderClause(options.orderBy);
    const limitClause = this.buildLimitClause(options.limit, options.skip);

    return this.neo4j.read(async (session) => {
      const result = await session.run(
        `
        MATCH (n {id: $nodeId})
        MATCH ${relPattern}
        ${whereClause}
        RETURN r, n, other
        ${orderClause}
        ${limitClause}
        `,
        {
          nodeId,
          propFilters: options.propertyFilters || {},
          startLabels: options.startNodeLabels || [],
          endLabels: options.endNodeLabels || [],
        }
      );

      return result.records.map((record) => {
        const rel = record.get('r') as Relationship;
        const node = record.get('n') as Node;
        const other = record.get('other') as Node;

        // Determine which is start and which is end based on relationship direction
        const isOutgoing = rel.start.toString() === node.identity.toString();
        const start = isOutgoing ? node : other;
        const end = isOutgoing ? other : node;

        return this.transformRelationshipResult(rel, start, end) as T;
      });
    });
  }

  /**
   * Update relationship properties
   */
  async updateRelationship(
    relationshipId: string,
    updates: Partial<
      Omit<T, 'id' | 'createdAt' | 'type' | 'startNodeId' | 'endNodeId'>
    >
  ): Promise<T> {
    return this.neo4j.write(async (session) => {
      // Get current relationship for optimistic locking
      const currentResult = await session.run(
        `MATCH ()-[r {id: $relationshipId}]-() RETURN r`,
        { relationshipId }
      );

      if (currentResult.records.length === 0) {
        throw new Error(`Relationship with id ${relationshipId} not found`);
      }

      const currentRel = currentResult.records[0].get('r') as Relationship;
      const currentVersion = currentRel.properties.version || 1;
      const newVersion = currentVersion + 1;

      // Build update clause
      const updateProps = {
        ...updates,
        updatedAt: new Date(),
        version: newVersion,
      };

      const setClause = Object.keys(updateProps)
        .map((key) => `r.${key} = $updates.${key}`)
        .join(', ');

      // Update with version check
      const updateResult = await session.run(
        `
        MATCH (start)-[r {id: $relationshipId, version: $currentVersion}]->(end)
        SET ${setClause}
        RETURN r, start, end
        `,
        {
          relationshipId,
          currentVersion,
          updates: updateProps,
        }
      );

      if (updateResult.records.length === 0) {
        throw new Error(
          `Relationship ${relationshipId} was modified by another process`
        );
      }

      const record = updateResult.records[0];
      const rel = record.get('r') as Relationship;
      const start = record.get('start') as Node;
      const end = record.get('end') as Node;

      return this.transformRelationshipResult(rel, start, end) as T;
    });
  }

  /**
   * Delete relationship
   */
  async deleteRelationship(relationshipId: string): Promise<boolean> {
    return this.neo4j.write(async (session) => {
      const result = await session.run(
        `
        MATCH ()-[r {id: $relationshipId}]-()
        DELETE r
        RETURN count(r) as deletedCount
        `,
        { relationshipId }
      );

      return result.records[0].get('deletedCount').toNumber() > 0;
    });
  }

  /**
   * Create bidirectional relationship
   */
  async createBidirectionalRelationship(
    nodeId1: string,
    nodeId2: string,
    forwardType: string,
    reverseType: string,
    properties?: Neo4jProperties
  ): Promise<BidirectionalRelationship<T>> {
    return this.neo4j.write(async (session) => {
      // Create both relationships in a single transaction
      const result = await session.run(
        `
        MATCH (n1 {id: $nodeId1})
        MATCH (n2 {id: $nodeId2})
        CREATE (n1)-[r1:${forwardType} $forwardProps]->(n2)
        CREATE (n2)-[r2:${reverseType} $reverseProps]->(n1)
        RETURN r1, r2, n1, n2
        `,
        {
          nodeId1,
          nodeId2,
          forwardProps: {
            ...properties,
            id: this.generateRelationshipId(forwardType),
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
          },
          reverseProps: {
            ...properties,
            id: this.generateRelationshipId(reverseType),
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
          },
        }
      );

      const record = result.records[0];
      const r1 = record.get('r1') as Relationship;
      const r2 = record.get('r2') as Relationship;
      const n1 = record.get('n1') as Node;
      const n2 = record.get('n2') as Node;

      return {
        forward: this.transformRelationshipResult(r1, n1, n2) as T,
        reverse: this.transformRelationshipResult(r2, n2, n1) as T,
        nodes: {
          start: n1.properties,
          end: n2.properties,
        },
      };
    });
  }

  /**
   * Get relationship analytics
   */
  async getRelationshipAnalytics(
    options: {
      relationshipTypes?: string[];
      nodeLabels?: string[];
    } = {}
  ): Promise<RelationshipAnalytics> {
    return this.neo4j.read(async (session) => {
      const typeFilter = options.relationshipTypes?.length
        ? `:${options.relationshipTypes.join('|')}`
        : '';

      const labelFilter = options.nodeLabels?.length
        ? `:${options.nodeLabels.join(':')}`
        : '';

      // Get total relationships and breakdown by type
      const totalResult = await session.run(
        `
        MATCH (n${labelFilter})-[r${typeFilter}]-(m${labelFilter})
        RETURN count(r) as total, type(r) as relType
        `
      );

      let totalRelationships = 0;
      const relationshipsByType: Record<string, number> = {};

      for (const record of totalResult.records) {
        const count = record.get('total').toNumber();
        const type = record.get('relType');
        totalRelationships += count;
        relationshipsByType[type] = (relationshipsByType[type] || 0) + count;
      }

      // Get most connected nodes
      const degreeResult = await session.run(
        `
        MATCH (n${labelFilter})
        OPTIONAL MATCH (n)-[inRel${typeFilter}]-()
        OPTIONAL MATCH (n)-[outRel${typeFilter}]-()
        WITH n,
             count(DISTINCT inRel) as inDegree,
             count(DISTINCT outRel) as outDegree,
             count(DISTINCT inRel) + count(DISTINCT outRel) as totalDegree
        WHERE totalDegree > 0
        RETURN n.id as nodeId, labels(n) as labels, inDegree, outDegree, totalDegree
        ORDER BY totalDegree DESC
        LIMIT 10
        `
      );

      const mostConnectedNodes = degreeResult.records.map((record) => ({
        nodeId: record.get('nodeId'),
        labels: record.get('labels'),
        inDegree: record.get('inDegree').toNumber(),
        outDegree: record.get('outDegree').toNumber(),
        totalDegree: record.get('totalDegree').toNumber(),
      }));

      // Calculate density (simplified)
      const nodeResult = await session.run(
        `MATCH (n${labelFilter}) RETURN count(n) as nodeCount`
      );

      const nodeCount = nodeResult.records[0].get('nodeCount').toNumber();
      const maxPossibleRelationships = nodeCount * (nodeCount - 1);
      const density =
        maxPossibleRelationships > 0
          ? totalRelationships / maxPossibleRelationships
          : 0;

      return {
        totalRelationships,
        relationshipsByType,
        mostConnectedNodes,
        density,
      };
    });
  }

  /**
   * Find relationship chains/paths
   */
  async findRelationshipChains(
    startNodeId: string,
    endNodeId: string,
    relationshipTypes: string[],
    maxLength = 5
  ): Promise<Array<{ relationships: T[]; length: number; weight?: number }>> {
    const typeFilter =
      relationshipTypes.length > 0 ? `:${relationshipTypes.join('|')}` : '';

    return this.neo4j.read(async (session) => {
      const result = await session.run(
        `
        MATCH (start {id: $startNodeId})
        MATCH (end {id: $endNodeId})
        MATCH path = (start)-[${typeFilter}*1..${maxLength}]-(end)
        RETURN [r in relationships(path) | r] as rels, length(path) as pathLength
        ORDER BY pathLength
        `,
        { startNodeId, endNodeId }
      );

      return result.records.map((record) => {
        const rels = record.get('rels') as Relationship[];
        const length = record.get('pathLength').toNumber();

        const relationships = rels.map(
          (rel) => this.transformRelationshipOutput(rel) as T
        );

        return {
          relationships,
          length,
          // Could calculate weight based on relationship properties
          weight: relationships.reduce((sum, rel) => {
            const weight = rel['weight'] as number;
            return sum + (typeof weight === 'number' ? weight : 1);
          }, 0),
        };
      });
    });
  }

  /**
   * Aggregate relationship properties
   */
  async aggregateRelationshipProperties(
    relationshipType: string,
    propertyKey: string,
    aggregation: 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT'
  ): Promise<number> {
    return this.neo4j.read(async (session) => {
      const result = await session.run(
        `
        MATCH ()-[r:${relationshipType}]-()
        WHERE r.${propertyKey} IS NOT NULL
        RETURN ${aggregation}(r.${propertyKey}) as result
        `
      );

      return result.records[0]?.get('result')?.toNumber() || 0;
    });
  }

  /**
   * Transform Neo4j relationship to RelationshipEntity
   */
  protected transformRelationshipResult(
    rel: Relationship,
    start: Node,
    end: Node
  ): RelationshipEntity {
    return {
      id: rel.properties.id || rel.identity.toString(),
      type: rel.type,
      startNodeId: start.properties.id || start.identity.toString(),
      endNodeId: end.properties.id || end.identity.toString(),
      createdAt: rel.properties.createdAt,
      updatedAt: rel.properties.updatedAt,
      version: rel.properties.version,
      ...rel.properties,
    } as RelationshipEntity;
  }

  /**
   * Transform Neo4j relationship to output format
   */
  protected transformRelationshipOutput(rel: Relationship): RelationshipEntity {
    return {
      id: rel.properties.id || rel.identity.toString(),
      type: rel.type,
      startNodeId: rel.start.toString(),
      endNodeId: rel.end.toString(),
      createdAt: rel.properties.createdAt,
      updatedAt: rel.properties.updatedAt,
      version: rel.properties.version,
      ...rel.properties,
    } as RelationshipEntity;
  }

  /**
   * Generate unique ID for relationships
   */
  protected generateRelationshipId(type: string): string {
    return `${type.toLowerCase()}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }
}
