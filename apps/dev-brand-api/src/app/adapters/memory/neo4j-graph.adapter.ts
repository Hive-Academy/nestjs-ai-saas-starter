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

      const createdId = this.extractString(result.records[0]?.get('id'));
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

      const createdId = this.extractString(result.records[0]?.get('id'));
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

      result.records.forEach((record) => {
        const pathNodes = this.extractNodes(this.extractArray(record.get('nodes')));
        const pathRels = this.extractRelationships(
          this.extractArray(record.get('relationships'))
        );
        const path = this.extractPath(record.get('path'));

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

      const records = result.records.map((record) => {
        const recordData: Record<string, unknown> = {};
        record.keys.forEach((key) => {
          recordData[key] = this.extractValue(record.get(key));
        });
        return recordData;
      });

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
            resultAvailableAfter:
              result.summary.resultAvailableAfter?.toNumber() || 0,
            resultConsumedAfter:
              result.summary.resultConsumedAfter?.toNumber() || 0,
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
      const record = result.records[0];

      const nodeCount = this.extractNumber(record?.get('nodeCount')) || 0;
      const relationshipCount =
        this.extractNumber(record?.get('relationshipCount')) || 0;

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
      const nodes = result.records.map((record) =>
        this.extractNode(record.get('n'))
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
      const deletedCount =
        this.extractNumber(result.records[0]?.get('deletedCount'));

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
      const deletedCount =
        this.extractNumber(result.records[0]?.get('deletedCount'));

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

  private extractNodes(nodeList: any[]): GraphNode[] {
    return nodeList.map((node) => this.extractNode(node));
  }

  private extractNode(node: unknown): GraphNode {
    if (!node || typeof node !== 'object') {
      return {
        id: '',
        labels: [],
        properties: {},
      };
    }

    const nodeObj = node as any;
    return {
      id: nodeObj.properties?.id || nodeObj.identity?.toString() || '',
      labels: Array.isArray(nodeObj.labels) ? nodeObj.labels : [],
      properties: typeof nodeObj.properties === 'object' ? nodeObj.properties : {},
    };
  }

  private extractRelationships(relList: any[]): GraphRelationship[] {
    return relList.map((rel) => this.extractRelationship(rel));
  }

  private extractRelationship(rel: unknown): GraphRelationship {
    if (!rel || typeof rel !== 'object') {
      return {
        id: '',
        type: '',
        startNodeId: '',
        endNodeId: '',
        properties: {},
      };
    }

    const relObj = rel as any;
    return {
      id: relObj.properties?.id || relObj.identity?.toString() || '',
      type: relObj.type || '',
      startNodeId: relObj.start?.toString() || '',
      endNodeId: relObj.end?.toString() || '',
      properties: typeof relObj.properties === 'object' ? relObj.properties : {},
    };
  }

  private extractPath(pathData: unknown): GraphPath {
    if (!pathData || typeof pathData !== 'object') {
      return {
        nodes: [],
        relationships: [],
        length: 0,
      };
    }

    const pathObj = pathData as any;
    const segments = Array.isArray(pathObj.segments) ? pathObj.segments : [];
    
    const nodes = this.extractNodes(
      segments.flatMap((s: any) => [s?.start, s?.end].filter(Boolean))
    );
    const relationships = this.extractRelationships(
      segments.map((s: any) => s?.relationship).filter(Boolean)
    );

    return {
      nodes,
      relationships,
      length: relationships.length,
    };
  }

  private extractValue(value: unknown): unknown {
    if (value && typeof value === 'object' && 'toNumber' in value) {
      return (value as any).toNumber();
    }
    return value;
  }

  /**
   * Type-safe string extraction from Neo4j record values
   */
  private extractString(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'toString' in value) {
      return (value as any).toString();
    }
    return String(value || '');
  }

  /**
   * Type-safe number extraction from Neo4j record values
   */
  private extractNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (value && typeof value === 'object' && 'toNumber' in value) {
      return (value as any).toNumber();
    }
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Type-safe array extraction from Neo4j record values
   */
  private extractArray(value: unknown): any[] {
    if (Array.isArray(value)) return value;
    return [];
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
        const relData = operation.data as any;
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

      result.records.forEach((record) => {
        const label = this.extractString(record.get('label'));
        const count = this.extractNumber(record.get('count'));
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

      result.records.forEach((record) => {
        const relType = this.extractString(record.get('relType'));
        const count = this.extractNumber(record.get('count'));
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
}
