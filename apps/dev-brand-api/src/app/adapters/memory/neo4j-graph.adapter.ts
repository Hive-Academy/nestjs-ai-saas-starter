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
  AgentState,
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

  // NEW: Agent-aware memory relationship creation
  async createAgentMemoryRelationship(
    fromMemoryId: string,
    toMemoryId: string,
    agentState: AgentState,
    relationshipType: string
  ): Promise<string> {
    const relationshipStrength = this.calculateRelationshipStrength(
      agentState,
      relationshipType
    );

    const query = `
      MATCH (from:Memory {id: $fromMemoryId})
      MATCH (to:Memory {id: $toMemoryId})
      CREATE (from)-[r:${relationshipType} {
        strength: $strength,
        agentId: $agentId,
        threadId: $threadId,
        userId: $userId,
        createdAt: datetime()
      }]->(to)
      RETURN id(r) as relationshipId
    `;

    const result = await this.neo4jService.run(query, {
      fromMemoryId,
      toMemoryId,
      strength: relationshipStrength,
      agentId: agentState.current,
      threadId: agentState.threadId,
      userId: agentState.userId,
    });

    return (result.records[0]?.get as any)('relationshipId')?.toString() || '';
  }

  // NEW: Agent-scoped memory traversal
  async findRelatedMemoriesForAgent(
    startMemoryId: string,
    agentState: AgentState,
    maxDepth = 2
  ): Promise<any> {
    const query = `
      MATCH path = (start:Memory {id: $startMemoryId})-[*1..${maxDepth}]-(related:Memory)
      WHERE ALL(r IN relationships(path) WHERE
        r.userId = $userId AND (r.threadId = $threadId OR r.agentId = $agentId)
      )
      RETURN related,
             [r IN relationships(path) | r.strength] as strengths,
             length(path) as depth
      ORDER BY
        length(path) ASC,
        reduce(sum = 0, s IN [r IN relationships(path) | r.strength] | sum + s) DESC
      LIMIT 20
    `;

    const result = await this.neo4jService.run(query, {
      startMemoryId,
      userId: agentState.userId,
      threadId: agentState.threadId,
      agentId: agentState.current,
    });

    return {
      relatedMemories: result.records.map((record) => ({
        memory: ((record.get as any)('related') as any).properties,
        relationshipStrengths: (record.get as any)('strengths') as any,
        depth: ((record.get as any)('depth') as any).toNumber(),
      })),
      totalFound: result.records.length,
    };
  }

  // NEW: Sequential conversation relationship creation
  async createConversationFlow(
    threadId: string,
    conversationMemories: string[]
  ): Promise<void> {
    for (let i = 0; i < conversationMemories.length - 1; i++) {
      const query = `
        MATCH (from:Memory {id: $fromId})
        MATCH (to:Memory {id: $toId})
        CREATE (from)-[r:FOLLOWS_IN_CONVERSATION {
          threadId: $threadId,
          sequence: $sequence,
          createdAt: datetime()
        }]->(to)
      `;

      await this.neo4jService.run(query, {
        fromId: conversationMemories[i],
        toId: conversationMemories[i + 1],
        threadId,
        sequence: i + 1,
      });
    }
  }

  // NEW: User behavior pattern analysis
  async analyzeConversationPatterns(
    userId: string,
    limitDays = 30
  ): Promise<any> {
    const query = `
      MATCH (m:Memory)-[r:FOLLOWS_IN_CONVERSATION]->(next:Memory)
      WHERE r.createdAt > datetime() - duration({days: $limitDays})
        AND m.userId = $userId
      WITH m.threadId as threadId, count(*) as messageCount
      RETURN
        threadId,
        messageCount,
        avg(messageCount) as avgMessagesPerThread,
        collect(threadId)[0..5] as recentThreads
      ORDER BY messageCount DESC
      LIMIT 10
    `;

    const result = await this.neo4jService.run(query, { userId, limitDays });

    return {
      conversationPatterns: result.records.map((record) => ({
        threadId: (record.get as any)('threadId'),
        messageCount: ((record.get as any)('messageCount') as any).toNumber(),
        avgMessagesPerThread: (
          (record.get as any)('avgMessagesPerThread') as any
        ).toNumber(),
      })),
      recentThreads: (result.records[0]?.get as any)('recentThreads') || [],
    };
  }

  // NEW: Semantic relationship building
  async buildSemanticRelationships(
    memoryIds: string[],
    similarityThreshold = 0.7
  ): Promise<number> {
    let relationshipsCreated = 0;

    // This would typically use vector similarity from ChromaDB
    // For now, implement basic text similarity
    for (let i = 0; i < memoryIds.length; i++) {
      for (let j = i + 1; j < memoryIds.length; j++) {
        const similarity = await this.calculateTextSimilarity(
          memoryIds[i],
          memoryIds[j]
        );

        if (similarity >= similarityThreshold) {
          const query = `
            MATCH (m1:Memory {id: $id1})
            MATCH (m2:Memory {id: $id2})
            CREATE (m1)-[r:SEMANTICALLY_SIMILAR {
              similarity: $similarity,
              createdAt: datetime()
            }]->(m2)
          `;

          await this.neo4jService.run(query, {
            id1: memoryIds[i],
            id2: memoryIds[j],
            similarity,
          });

          relationshipsCreated++;
        }
      }
    }

    return relationshipsCreated;
  }

  // Private helper methods
  private calculateRelationshipStrength(
    agentState: AgentState,
    relationshipType: string
  ): number {
    let strength = 0.5; // Base strength

    if (relationshipType === 'FOLLOWS_IN_CONVERSATION') strength += 0.3;
    if (relationshipType === 'SEMANTICALLY_SIMILAR') strength += 0.2;
    if (agentState.messages && agentState.messages.length > 0) strength += 0.1;

    return Math.min(strength, 1.0);
  }

  private async calculateTextSimilarity(
    memoryId1: string,
    memoryId2: string
  ): Promise<number> {
    // Simplified similarity calculation
    // In production, this would use proper embedding similarity
    const query = `
      MATCH (m1:Memory {id: $id1})
      MATCH (m2:Memory {id: $id2})
      RETURN m1.content as content1, m2.content as content2
    `;

    const result = await this.neo4jService.run(query, {
      id1: memoryId1,
      id2: memoryId2,
    });

    if (result.records.length === 0) return 0;

    const content1 = (result.records[0] as any).get('content1') || '';
    const content2 = (result.records[0] as any).get('content2') || '';

    // Basic word overlap similarity
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  // The base class already provides validation methods as protected
}
