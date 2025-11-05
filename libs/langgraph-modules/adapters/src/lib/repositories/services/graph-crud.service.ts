import { Injectable, Logger } from '@nestjs/common';
import {
  InjectNeogma,
  NeogmaService,
  Safe,
  ParameterBindingUtility,
} from '@hive-academy/nestjs-neo4j';
import type {
  GraphNodeData,
  GraphRelationshipData,
  GraphQueryResult,
  GraphOperation,
  GraphBatchResult,
  GraphFindCriteria,
  GraphNode,
} from '@hive-academy/langgraph-memory';
import { GraphHelpersService } from './graph-helpers.service';

/**
 * Graph CRUD Operations Service
 *
 * Handles generic graph CRUD operations including node/relationship creation,
 * deletion, batch operations, and Cypher execution.
 * Extracted from memory-graph.repository.ts (lines 542-940).
 */
@Injectable()
export class GraphCrudService {
  private readonly logger = new Logger(GraphCrudService.name);

  constructor(
    @InjectNeogma() private readonly neogma: NeogmaService,
    private readonly helpers: GraphHelpersService
  ) {}

  /**
   * Create a generic graph node with any labels and properties
   * Used by: Neo4jGraphAdapter.createNode()
   */
  @Safe()
  async createGraphNode(data: GraphNodeData): Promise<string> {
    if (!data.labels || data.labels.length === 0) {
      throw new Error('Node labels are required');
    }

    try {
      this.helpers.validateNodeData(data);

      const queryBuilder = this.neogma.createQueryBuilder();
      const labelsStr = data.labels.join(':');
      const createClause = `(n:${labelsStr})`;

      if (data.id) {
        queryBuilder.create(`${createClause} {id: $id}`);
        queryBuilder.set('n += $properties');
      } else {
        queryBuilder.create(`${createClause} $properties`);
      }

      queryBuilder.return('n.id as nodeId, id(n) as internalId');

      const baseQuery = queryBuilder.getStatement();
      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        id: data.id,
        properties: data.properties || {},
      });
      const result = await this.neogma.run(query, params);

      const nodeId =
        result.records[0]?.get('nodeId') ||
        result.records[0]?.get('internalId')?.toString() ||
        '';

      this.logger.debug(
        `Created graph node with ID: ${nodeId}, labels: [${data.labels.join(
          ', '
        )}]`
      );

      return nodeId;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create graph node: ${errorMsg}`);
    }
  }

  /**
   * Create a generic relationship between any two nodes
   * Used by: Neo4jGraphAdapter.createRelationship()
   */
  @Safe()
  async createGraphRelationship(
    fromNodeId: string,
    toNodeId: string,
    data: GraphRelationshipData
  ): Promise<string> {
    if (!fromNodeId?.trim()) throw new Error('From node ID is required');
    if (!toNodeId?.trim()) throw new Error('To node ID is required');
    if (!data.type?.trim()) throw new Error('Relationship type is required');

    try {
      this.helpers.validateRelationshipData(data);

      const queryBuilder = this.neogma.createQueryBuilder();

      queryBuilder
        .match('(from) WHERE from.id = $fromId OR id(from) = $fromId')
        .match('(to) WHERE to.id = $toId OR id(to) = $toId')
        .create(`(from)-[r:${data.type} $properties]->(to)`)
        .return('id(r) as relationshipId');

      const baseQuery = queryBuilder.getStatement();
      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        fromId: fromNodeId,
        toId: toNodeId,
        properties: data.properties || {},
      });
      const result = await this.neogma.run(query, params);

      const relationshipId =
        result.records[0]?.get('relationshipId')?.toString() || '';

      this.logger.debug(
        `Created relationship ${relationshipId}: ${fromNodeId} -[${data.type}]-> ${toNodeId}`
      );

      return relationshipId;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create graph relationship: ${errorMsg}`);
    }
  }

  /**
   * Execute raw Cypher query with parameters
   * Used by: Neo4jGraphAdapter.executeCypher()
   */
  @Safe()
  async executeCypher(
    query: string,
    parameters: Record<string, unknown> = {}
  ): Promise<GraphQueryResult> {
    if (!query?.trim()) throw new Error('Cypher query is required');

    try {
      // Security validation - prevent dangerous operations
      const forbiddenPatterns = [
        /DROP\s+DATABASE/i,
        /CREATE\s+DATABASE/i,
        /STOP\s+DATABASE/i,
        /START\s+DATABASE/i,
        /ALTER\s+DATABASE/i,
        /DBMS\./i,
        /CALL\s+dbms\./i,
      ];

      for (const pattern of forbiddenPatterns) {
        if (pattern.test(query)) {
          throw new Error('Query contains forbidden operations');
        }
      }

      const result = await this.neogma.run(query, parameters);

      const records = result.records.map((record) => {
        const recordData: Record<string, unknown> = {};
        record.keys.forEach((key) => {
          recordData[key as string] = record.get(key as string);
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
            resultAvailableAfter: result.summary.resultAvailableAfter || 0,
            resultConsumedAfter: result.summary.resultConsumedAfter || 0,
          }
        : undefined;

      this.logger.debug(
        `Executed Cypher query, returned ${records.length} records`
      );

      return { records, summary };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to execute Cypher query: ${errorMsg}`);
    }
  }

  /**
   * Execute multiple graph operations in batch
   * Used by: Neo4jGraphAdapter.batchExecute()
   */
  @Safe()
  async batchExecuteOperations(
    operations: readonly GraphOperation[]
  ): Promise<GraphBatchResult> {
    if (!operations || operations.length === 0) {
      throw new Error('At least one operation is required');
    }

    const results: Record<string, unknown> = {};
    const errors: Record<string, Error> = {};
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const operation of operations) {
        const operationId =
          operation.operationId || `op_${Date.now()}_${Math.random()}`;

        try {
          let result: unknown;

          switch (operation.type) {
            case 'CREATE_NODE':
              result = await this.createGraphNode(
                operation.data as GraphNodeData
              );
              break;

            case 'CREATE_RELATIONSHIP': {
              const relData = operation.data as {
                from: string;
                to: string;
                relationship: GraphRelationshipData;
              };
              result = await this.createGraphRelationship(
                relData.from,
                relData.to,
                relData.relationship
              );
              break;
            }

            case 'UPDATE_NODE': {
              const updateData = operation.data as {
                nodeId: string;
                properties: Record<string, unknown>;
              };
              result = await this.updateNodeProperties(
                updateData.nodeId,
                updateData.properties
              );
              break;
            }

            case 'DELETE_NODE': {
              const deleteData = operation.data as { nodeId: string };
              result = await this.deleteNode(deleteData.nodeId);
              break;
            }

            case 'CYPHER': {
              const cypherData = operation.data as {
                query: string;
                parameters?: Record<string, unknown>;
              };
              result = await this.executeCypher(
                cypherData.query,
                cypherData.parameters
              );
              break;
            }

            default:
              throw new Error(`Unknown operation type: ${operation.type}`);
          }

          results[operationId] = result;
          successCount++;
        } catch (error) {
          errors[operationId] =
            error instanceof Error ? error : new Error(String(error));
          errorCount++;
        }
      }

      this.logger.debug(
        `Batch execution completed: ${successCount} successful, ${errorCount} failed`
      );

      return { successCount, errorCount, results, errors };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to execute batch operations: ${errorMsg}`);
    }
  }

  /**
   * Find graph nodes by criteria
   * Used by: Neo4jGraphAdapter.findNodes()
   */
  @Safe()
  async findGraphNodes(criteria: GraphFindCriteria): Promise<GraphNode[]> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();

      let matchClause = '(n)';
      if (criteria.labels && criteria.labels.length > 0) {
        matchClause = `(n:${criteria.labels.join(':')})`;
      }

      queryBuilder.match(matchClause);

      // Add property filters
      if (criteria.properties && Object.keys(criteria.properties).length > 0) {
        const whereConditions: string[] = [];
        Object.keys(criteria.properties).forEach((key) => {
          whereConditions.push(`n.${key} = $${key}`);
        });
        queryBuilder.where(whereConditions.join(' AND '));
      }

      // Add ordering
      if (criteria.orderBy && criteria.orderBy.length > 0) {
        const orderClauses = criteria.orderBy.map(
          (order) => `n.${order.property} ${order.direction}`
        );
        queryBuilder.orderBy(orderClauses.join(', '));
      }

      queryBuilder.return('n, labels(n) as nodeLabels, id(n) as internalId');

      // Add pagination
      if (criteria.skip) {
        queryBuilder.skip('$skip');
      }

      if (criteria.limit) {
        queryBuilder.limit('$limit');
      }

      const baseQuery = queryBuilder.getStatement();
      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        ...(criteria.properties || {}),
        skip: criteria.skip,
        limit: criteria.limit,
      });
      const result = await this.neogma.run(query, params);

      const nodes: GraphNode[] = result.records.map((record) => {
        const nodeData = record.get('n');
        const nodeLabels = record.get('nodeLabels') || [];
        const internalId = record.get('internalId');

        return {
          id: nodeData?.properties?.id || internalId?.toString() || '',
          labels: Array.isArray(nodeLabels) ? nodeLabels : [],
          properties: nodeData?.properties || {},
        };
      });

      this.logger.debug(`Found ${nodes.length} nodes matching criteria`);

      return nodes;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to find graph nodes: ${errorMsg}`);
    }
  }

  /**
   * Delete multiple graph nodes by IDs
   * Used by: Neo4jGraphAdapter.deleteNodes()
   */
  @Safe()
  async deleteGraphNodes(nodeIds: string[]): Promise<number> {
    if (!nodeIds || nodeIds.length === 0) {
      return 0;
    }

    try {
      let deletedCount = 0;

      for (const nodeId of nodeIds) {
        if (!nodeId?.trim()) continue;

        const queryBuilder = this.neogma.createQueryBuilder();

        queryBuilder
          .match('(n) WHERE n.id = $nodeId OR id(n) = $nodeId')
          .raw('DETACH DELETE n');

        const baseQuery = queryBuilder.getStatement();
        const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
          nodeId,
        });
        const result = await this.neogma.run(query, params);

        const nodeDeletedCount = result.summary?.counters?.nodesDeleted || 0;
        deletedCount += nodeDeletedCount;
      }

      this.logger.debug(`Deleted ${deletedCount} graph nodes`);

      return deletedCount;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete graph nodes: ${errorMsg}`);
    }
  }

  /**
   * Delete multiple graph relationships by IDs
   * Used by: Neo4jGraphAdapter.deleteRelationships()
   */
  @Safe()
  async deleteGraphRelationships(relationshipIds: string[]): Promise<number> {
    if (!relationshipIds || relationshipIds.length === 0) {
      return 0;
    }

    try {
      let deletedCount = 0;

      for (const relId of relationshipIds) {
        if (!relId?.trim()) continue;

        const queryBuilder = this.neogma.createQueryBuilder();

        queryBuilder.match('()-[r]->() WHERE id(r) = $relId').raw('DELETE r');

        const baseQuery = queryBuilder.getStatement();
        const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
          relId,
        });
        const result = await this.neogma.run(query, params);

        const relDeletedCount =
          result.summary?.counters?.relationshipsDeleted || 0;
        deletedCount += relDeletedCount;
      }

      this.logger.debug(`Deleted ${deletedCount} graph relationships`);

      return deletedCount;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete graph relationships: ${errorMsg}`);
    }
  }

  /**
   * Update node properties
   * Private helper for batch operations
   */
  private async updateNodeProperties(
    nodeId: string,
    properties: Record<string, unknown>
  ): Promise<boolean> {
    if (!nodeId?.trim()) throw new Error('Node ID is required');
    if (!properties || Object.keys(properties).length === 0) {
      throw new Error('Properties to update are required');
    }

    try {
      const queryBuilder = this.neogma.createQueryBuilder();

      queryBuilder
        .match('(n) WHERE n.id = $nodeId OR id(n) = $nodeId')
        .set('n += $properties')
        .return('n');

      const baseQuery = queryBuilder.getStatement();
      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        nodeId: nodeId,
        properties: properties,
      });
      const result = await this.neogma.run(query, params);

      const updated = result.records.length > 0;
      if (updated) {
        this.logger.debug(`Updated node ${nodeId} with properties`);
      }

      return updated;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update node properties: ${errorMsg}`);
    }
  }

  /**
   * Delete a single node
   * Private helper for batch operations
   */
  private async deleteNode(nodeId: string): Promise<boolean> {
    if (!nodeId?.trim()) throw new Error('Node ID is required');

    try {
      const queryBuilder = this.neogma.createQueryBuilder();

      queryBuilder
        .match('(n) WHERE n.id = $nodeId OR id(n) = $nodeId')
        .raw('DETACH DELETE n');

      const baseQuery = queryBuilder.getStatement();
      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        nodeId,
      });
      const result = await this.neogma.run(query, params);

      const deletedCount = result.summary?.counters?.nodesDeleted || 0;
      const deleted = deletedCount > 0;

      if (deleted) {
        this.logger.debug(`Deleted node ${nodeId}`);
      }

      return deleted;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete node: ${errorMsg}`);
    }
  }
}
