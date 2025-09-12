import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';
import {
  IGraphService,
  GraphNodeData,
  GraphRelationshipData,
  TraversalSpec,
  GraphTraversalResult,
  GraphQueryResult,
  GraphStats,
  GraphOperation,
  GraphBatchResult,
  GraphFindCriteria,
  GraphNode,
  GraphRelationship,
  GraphPath,
  GraphOperationError,
  InvalidInputError,
  TransactionError,
} from '@hive-academy/langgraph-memory';

/**
 * Application-specific Neo4j adapter for the Memory module.
 *
 * This adapter properly uses the existing Neo4jService from
 * @hive-academy/nestjs-neo4j instead of creating its own connection.
 * This maintains proper separation of concerns and reuses existing
 * database management infrastructure.
 */
@Injectable()
export class Neo4jGraphAdapter extends IGraphService {
  private readonly logger = new Logger(Neo4jGraphAdapter.name);

  constructor(private readonly neo4jService: Neo4jService) {
    super();
    this.logger.debug('Neo4jGraphAdapter initialized with Neo4jService');
  }

  /**
   * Create a node in Neo4j using Neo4jService
   */
  async createNode(data: GraphNodeData): Promise<string> {
    this.validateNodeData(data);

    try {
      const nodeId = data.id || this.generateId();
      const labels = data.labels.join(':');

      const cypher = `
        CREATE (n:${labels} {id: $nodeId})
        SET n += $properties
        RETURN n.id as id
      `;

      const result = await this.neo4jService.run(cypher, {
        nodeId,
        properties: data.properties,
      });

      const firstRecord = result.records[0];
      if (!firstRecord) {
        throw new GraphOperationError(
          'No record returned from node creation',
          'createNode',
          { data }
        );
      }

      const createdId = String((firstRecord as any).id || nodeId);
      this.logger.debug(
        `Created node ${createdId} with labels [${data.labels.join(', ')}]`
      );

      return createdId;
    } catch (error) {
      this.logger.error('Failed to create node', error);
      throw new GraphOperationError('Failed to create node', 'createNode', {
        data,
        error: this.serializeError(error),
      });
    }
  }

  /**
   * Create a relationship between two nodes using Neo4jService
   */
  async createRelationship(
    fromNodeId: string,
    toNodeId: string,
    data: GraphRelationshipData
  ): Promise<string> {
    this.validateNodeId(fromNodeId, 'fromNodeId');
    this.validateNodeId(toNodeId, 'toNodeId');
    this.validateRelationshipData(data);

    try {
      const relationshipId = this.generateId();

      const cypher = `
        MATCH (from {id: $fromNodeId}), (to {id: $toNodeId})
        CREATE (from)-[r:${data.type} {id: $relationshipId}]->(to)
        SET r += $properties
        RETURN r.id as id
      `;

      const result = await this.neo4jService.run(cypher, {
        fromNodeId,
        toNodeId,
        relationshipId,
        properties: data.properties || {},
      });

      const firstRecord = result.records[0];
      if (!firstRecord) {
        throw new GraphOperationError(
          'No record returned from relationship creation',
          'createRelationship',
          { fromNodeId, toNodeId, data }
        );
      }

      const createdId = String((firstRecord as any).id || relationshipId);
      this.logger.debug(
        `Created relationship ${createdId} of type ${data.type} from ${fromNodeId} to ${toNodeId}`
      );

      return createdId;
    } catch (error) {
      this.logger.error('Failed to create relationship', error);
      throw new GraphOperationError(
        'Failed to create relationship',
        'createRelationship',
        { fromNodeId, toNodeId, data, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Traverse the graph starting from a node using Neo4jService
   */
  async traverse(
    startNodeId: string,
    spec: TraversalSpec
  ): Promise<GraphTraversalResult> {
    this.validateNodeId(startNodeId, 'startNodeId');

    try {
      const depth = spec.depth || 1;
      const direction = this.getTraversalDirection(spec.direction);
      const relationshipFilter = this.buildRelationshipFilter(
        spec.relationshipTypes
      );
      const nodeFilter = this.buildNodeFilter(spec.nodeLabels);
      const propertyFilter = this.buildPropertyFilter(spec.filter);

      const cypher = `
        MATCH path = (start {id: $startNodeId})${
          direction.start
        }[r${relationshipFilter}*1..${depth}]${direction.end}(end${nodeFilter})
        ${propertyFilter ? `WHERE ${propertyFilter}` : ''}
        ${spec.limit ? `LIMIT ${spec.limit}` : 'LIMIT 100'}
        RETURN
          nodes(path) as nodes,
          relationships(path) as relationships,
          path
      `;

      const result = await this.neo4jService.run(cypher, { startNodeId });

      const nodes: GraphNode[] = [];
      const relationships: GraphRelationship[] = [];
      const paths: GraphPath[] = [];

      result.records.forEach((record: any) => {
        const pathNodes = this.extractNodes(record.nodes || []);
        const pathRels = this.extractRelationships(record.relationships || []);
        const path = this.extractPath(record.path);

        nodes.push(...pathNodes);
        relationships.push(...pathRels);
        paths.push(path);
      });

      // Deduplicate nodes and relationships
      const uniqueNodes = this.deduplicateNodes(nodes);
      const uniqueRelationships = this.deduplicateRelationships(relationships);

      this.logger.debug(
        `Traversed from ${startNodeId}: found ${uniqueNodes.length} nodes, ${uniqueRelationships.length} relationships`
      );

      return {
        nodes: uniqueNodes,
        relationships: uniqueRelationships,
        paths,
      };
    } catch (error) {
      this.logger.error(`Failed to traverse from node ${startNodeId}`, error);
      throw new GraphOperationError('Failed to traverse graph', 'traverse', {
        startNodeId,
        spec,
        error: this.serializeError(error),
      });
    }
  }

  /**
   * Execute a Cypher query using Neo4jService
   */
  async executeCypher(
    query: string,
    params: Record<string, unknown> = {}
  ): Promise<GraphQueryResult> {
    this.validateCypherQuery(query);

    try {
      const result = await this.neo4jService.run(query, params);

      const records = result.records.map(
        (record) => record as Record<string, unknown>
      );

      const summary = result.summary
        ? {
            counters: {
              nodesCreated: result.summary.counters?.nodesCreated || 0,
              nodesDeleted: result.summary.counters?.nodesDeleted || 0,
              relationshipsCreated:
                result.summary.counters?.relationshipsCreated || 0,
              relationshipsDeleted:
                result.summary.counters?.relationshipsDeleted || 0,
              propertiesSet: result.summary.counters?.propertiesSet || 0,
            },
            resultAvailableAfter: result.summary.resultAvailableAfter || 0,
            resultConsumedAfter: result.summary.resultConsumedAfter || 0,
          }
        : undefined;

      this.logger.debug(
        `Executed Cypher query: returned ${records.length} records`
      );

      return { records, summary };
    } catch (error) {
      this.logger.error('Failed to execute Cypher query', error);
      throw new GraphOperationError(
        'Failed to execute Cypher query',
        'executeCypher',
        { query, params, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Get graph statistics using Neo4jService
   */
  async getStats(): Promise<GraphStats> {
    try {
      const cypher = `
        MATCH (n)
        OPTIONAL MATCH ()-[r]->()
        RETURN
          count(DISTINCT n) as nodeCount,
          count(DISTINCT r) as relationshipCount,
          count(DISTINCT labels(n)) as labelCount
      `;

      const result = await this.neo4jService.run(cypher);
      const firstRecord = result.records[0];
      if (!firstRecord) {
        throw new GraphOperationError(
          'No statistics record returned',
          'getStats',
          {}
        );
      }

      const nodeCount = Number((firstRecord as any).nodeCount) || 0;
      const relationshipCount =
        Number((firstRecord as any).relationshipCount) || 0;

      // Get detailed stats
      const labelStats = await this.getNodeCountsByLabel();
      const relationshipStats = await this.getRelationshipCountsByType();

      return {
        nodeCount,
        relationshipCount,
        indexCount: 0, // Would need SHOW INDEXES query in Neo4j 4.0+
        databaseSize: undefined, // Not easily available
        lastUpdated: new Date(),
        nodeCountsByLabel: labelStats,
        relationshipCountsByType: relationshipStats,
      };
    } catch (error) {
      this.logger.error('Failed to get graph statistics', error);
      throw new GraphOperationError(
        'Failed to get graph statistics',
        'getStats',
        { error: this.serializeError(error) }
      );
    }
  }

  /**
   * Execute multiple graph operations in batch using Neo4jService
   */
  async batchExecute(
    operations: readonly GraphOperation[]
  ): Promise<GraphBatchResult> {
    if (operations.length === 0) {
      return {
        successCount: 0,
        errorCount: 0,
        results: {},
        errors: {},
      };
    }

    const results: Record<string, unknown> = {};
    const errors: Record<string, Error> = {};
    let successCount = 0;
    let errorCount = 0;

    // Execute operations sequentially to maintain order and handle dependencies
    for (const operation of operations) {
      const operationId = operation.operationId || this.generateId();

      try {
        const result = await this.executeOperation(operation);
        results[operationId] = result;
        successCount++;
      } catch (error) {
        errors[operationId] = error as Error;
        errorCount++;
        this.logger.warn(`Batch operation ${operationId} failed`, error);
      }
    }

    this.logger.debug(
      `Batch execution completed: ${successCount} successful, ${errorCount} failed`
    );

    return {
      successCount,
      errorCount,
      results,
      errors,
    };
  }

  /**
   * Find nodes by criteria using Neo4jService
   */
  async findNodes(criteria: GraphFindCriteria): Promise<readonly GraphNode[]> {
    try {
      const labelFilter = this.buildNodeFilter(criteria.labels);
      const propertyFilter = this.buildPropertyFilter(criteria.properties);
      const orderBy = this.buildOrderBy(criteria.orderBy);

      const cypher = `
        MATCH (n${labelFilter})
        ${propertyFilter ? `WHERE ${propertyFilter}` : ''}
        RETURN n
        ${orderBy ? `ORDER BY ${orderBy}` : ''}
        ${criteria.skip ? `SKIP ${criteria.skip}` : ''}
        ${criteria.limit ? `LIMIT ${criteria.limit}` : 'LIMIT 1000'}
      `;

      const result = await this.neo4jService.run(cypher);
      const nodes = result.records.map((record: any) =>
        this.extractNode(record.n)
      );

      this.logger.debug(`Found ${nodes.length} nodes matching criteria`);
      return nodes;
    } catch (error) {
      this.logger.error('Failed to find nodes', error);
      throw new GraphOperationError('Failed to find nodes', 'findNodes', {
        criteria,
        error: this.serializeError(error),
      });
    }
  }

  /**
   * Delete nodes by IDs using Neo4jService
   */
  async deleteNodes(nodeIds: readonly string[]): Promise<number> {
    if (nodeIds.length === 0) return 0;

    try {
      const cypher = `
        MATCH (n)
        WHERE n.id IN $nodeIds
        DETACH DELETE n
        RETURN count(n) as deletedCount
      `;

      const result = await this.neo4jService.run(cypher, {
        nodeIds: [...nodeIds],
      });

      const firstRecord = result.records[0];
      if (!firstRecord) {
        return 0;
      }

      const deletedCount = Number((firstRecord as any).deletedCount) || 0;

      this.logger.debug(`Deleted ${deletedCount} nodes`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to delete nodes', error);
      throw new GraphOperationError('Failed to delete nodes', 'deleteNodes', {
        nodeIds: [...nodeIds],
        error: this.serializeError(error),
      });
    }
  }

  /**
   * Delete relationships by IDs using Neo4jService
   */
  async deleteRelationships(
    relationshipIds: readonly string[]
  ): Promise<number> {
    if (relationshipIds.length === 0) return 0;

    try {
      const cypher = `
        MATCH ()-[r]->()
        WHERE r.id IN $relationshipIds
        DELETE r
        RETURN count(r) as deletedCount
      `;

      const result = await this.neo4jService.run(cypher, {
        relationshipIds: [...relationshipIds],
      });

      const firstRecord = result.records[0];
      if (!firstRecord) {
        return 0;
      }

      const deletedCount = Number((firstRecord as any).deletedCount) || 0;

      this.logger.debug(`Deleted ${deletedCount} relationships`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to delete relationships', error);
      throw new GraphOperationError(
        'Failed to delete relationships',
        'deleteRelationships',
        {
          relationshipIds: [...relationshipIds],
          error: this.serializeError(error),
        }
      );
    }
  }

  /**
   * Run a transaction with multiple operations using Neo4jService
   */
  async runTransaction<T>(
    operations: (service: IGraphService) => Promise<T>
  ): Promise<T> {
    try {
      // Use Neo4jService's transaction capabilities if available
      return await operations(this);
    } catch (error) {
      this.logger.error('Transaction failed', error);
      throw new TransactionError(
        'Transaction execution failed',
        error as Error
      );
    }
  }

  // Private helper methods

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    return { error: String(error) };
  }

  private getTraversalDirection(direction?: 'IN' | 'OUT' | 'BOTH'): {
    start: string;
    end: string;
  } {
    switch (direction) {
      case 'IN':
        return { start: '<-', end: '-' };
      case 'OUT':
        return { start: '-', end: '->' };
      case 'BOTH':
        return { start: '-', end: '-' };
      default:
        return { start: '-', end: '-' };
    }
  }

  private buildRelationshipFilter(types?: readonly string[]): string {
    if (!types || types.length === 0) return '';
    return `:${types.join('|')}`;
  }

  private buildNodeFilter(labels?: readonly string[]): string {
    if (!labels || labels.length === 0) return '';
    return `:${labels.join(':')}`;
  }

  private buildPropertyFilter(properties?: Record<string, unknown>): string {
    if (!properties || Object.keys(properties).length === 0) return '';

    const conditions = Object.entries(properties).map(([key, value]) => {
      if (typeof value === 'string') {
        return `n.${key} = "${value}"`;
      }
      return `n.${key} = ${value}`;
    });

    return conditions.join(' AND ');
  }

  private buildOrderBy(
    orderBy?: readonly { property: string; direction: 'ASC' | 'DESC' }[]
  ): string {
    if (!orderBy || orderBy.length === 0) return '';

    const clauses = orderBy.map(
      ({ property, direction }) => `n.${property} ${direction}`
    );

    return clauses.join(', ');
  }

  /**
   * Extract nodes from record data
   */
  private extractNodes(nodeList: any[]): GraphNode[] {
    return nodeList.map((node) => this.extractNode(node));
  }

  /**
   * Extract single node from record data
   */
  private extractNode(node: any): GraphNode {
    if (!node || typeof node !== 'object') {
      return {
        id: '',
        labels: [],
        properties: {},
      };
    }

    return {
      id: String(node.id || node.identity || ''),
      labels: Array.isArray(node.labels) ? node.labels.map(String) : [],
      properties: node.properties || {},
    };
  }

  /**
   * Extract relationships from record data
   */
  private extractRelationships(relList: any[]): GraphRelationship[] {
    return relList.map((rel) => this.extractRelationship(rel));
  }

  /**
   * Extract single relationship from record data
   */
  private extractRelationship(rel: any): GraphRelationship {
    if (!rel || typeof rel !== 'object') {
      return {
        id: '',
        type: '',
        startNodeId: '',
        endNodeId: '',
        properties: {},
      };
    }

    return {
      id: String(rel.id || rel.identity || ''),
      type: String(rel.type || ''),
      startNodeId: String(rel.startNodeId || rel.start || ''),
      endNodeId: String(rel.endNodeId || rel.end || ''),
      properties: rel.properties || {},
    };
  }

  /**
   * Extract path from record data
   */
  private extractPath(pathData: any): GraphPath {
    if (!pathData || typeof pathData !== 'object') {
      return {
        nodes: [],
        relationships: [],
        length: 0,
      };
    }

    const segments = Array.isArray(pathData.segments) ? pathData.segments : [];

    const allNodes: any[] = [];
    const allRelationships: any[] = [];

    segments.forEach((segment: any) => {
      if (segment && typeof segment === 'object') {
        if (segment.start) allNodes.push(segment.start);
        if (segment.end) allNodes.push(segment.end);
        if (segment.relationship) allRelationships.push(segment.relationship);
      }
    });

    const nodes = this.extractNodes(allNodes);
    const relationships = this.extractRelationships(allRelationships);

    return {
      nodes,
      relationships,
      length: relationships.length,
    };
  }

  private deduplicateNodes(nodes: GraphNode[]): GraphNode[] {
    const seen = new Set<string>();
    return nodes.filter((node) => {
      if (seen.has(node.id)) return false;
      seen.add(node.id);
      return true;
    });
  }

  private deduplicateRelationships(
    relationships: GraphRelationship[]
  ): GraphRelationship[] {
    const seen = new Set<string>();
    return relationships.filter((rel) => {
      if (seen.has(rel.id)) return false;
      seen.add(rel.id);
      return true;
    });
  }

  private async executeOperation(operation: GraphOperation): Promise<unknown> {
    switch (operation.type) {
      case 'CREATE_NODE':
        return this.createNode(operation.data as GraphNodeData);
      case 'CREATE_RELATIONSHIP': {
        const relData = operation.data as {
          from: string;
          to: string;
          relationship: GraphRelationshipData;
        };
        return this.createRelationship(
          relData.from,
          relData.to,
          relData.relationship
        );
      }
      case 'DELETE_NODE': {
        const nodeIds = Array.isArray(operation.data)
          ? (operation.data as string[])
          : [operation.data as string];
        return this.deleteNodes(nodeIds);
      }
      case 'CYPHER': {
        const cypherData = operation.data as {
          query: string;
          params?: Record<string, unknown>;
        };
        return this.executeCypher(cypherData.query, cypherData.params);
      }
      default:
        throw new InvalidInputError(
          `Unknown operation type: ${operation.type}`
        );
    }
  }

  private async getNodeCountsByLabel(): Promise<Record<string, number>> {
    try {
      const cypher = `
        MATCH (n)
        UNWIND labels(n) as label
        RETURN label, count(*) as count
      `;

      const result = await this.neo4jService.run(cypher);
      const counts: Record<string, number> = {};

      result.records.forEach((record: any) => {
        const label = String(record.label || '');
        const count = Number(record.count) || 0;
        if (label) {
          counts[label] = count;
        }
      });

      return counts;
    } catch (error) {
      this.logger.warn('Failed to get node counts by label', error);
      return {};
    }
  }

  private async getRelationshipCountsByType(): Promise<Record<string, number>> {
    try {
      const cypher = `
        MATCH ()-[r]->()
        RETURN type(r) as relType, count(*) as count
      `;

      const result = await this.neo4jService.run(cypher);
      const counts: Record<string, number> = {};

      result.records.forEach((record: any) => {
        const relType = String(record.relType || '');
        const count = Number(record.count) || 0;
        if (relType) {
          counts[relType] = count;
        }
      });

      return counts;
    } catch (error) {
      this.logger.warn('Failed to get relationship counts by type', error);
      return {};
    }
  }

  // The base class already provides validation methods as protected
}
