// ✅ Verified TASK_2025_004: All methods are unique business logic (no CRUD duplication)
// This repository has NO methods to delete - all functionality is custom workflow interruption logic

import type {
  UserInterruption,
  UserInterruptionResponse,
} from '@hive-academy/langgraph-hitl';
import { InterruptionStatus } from '@hive-academy/langgraph-hitl';
import {
  AuditLog,
  Neo4jCrudService,
  Neo4jRepositoryBase,
  NeogmaService,
  ParameterBindingUtility,
  Safe,
  ValidateInput,
} from '@hive-academy/nestjs-neo4j';
import { Injectable } from '@nestjs/common';
import { InterruptionPoint } from '../../entities/neo4j/interruption-point.entity';

/**
 * Interruption Repository
 *
 * Replaces: neo4j-interruption-storage.adapter.ts (237+ lines)
 *
 * Extends Neo4jRepository<InterruptionPoint> for automatic CRUD operations.
 * Provides type-safe operations for workflow interruption management including
 * timeout handling, status tracking, and user interaction processing.
 *
 * CRUD methods (inherited from Neo4jRepository<InterruptionPoint>):
 * - findById, findAll, create, update, delete, count, exists
 */
@Injectable()
export class InterruptionRepository extends Neo4jRepositoryBase<InterruptionPoint> {
  constructor(neogma: NeogmaService, crud: Neo4jCrudService) {
    super(InterruptionPoint, 'InterruptionPoint', neogma, crud);
  }

  // ============================================================================
  // INTERRUPTION MANAGEMENT
  // ============================================================================

  /**
   * Store interruption request in Neo4j
   * Migrated from: storeInterruption in neo4j-interruption-storage.adapter.ts
   */
  @ValidateInput()
  @AuditLog({ logLevel: 'detailed', enabled: true, logSuccess: true })
  @Safe()
  async storeInterruption(interruption: UserInterruption): Promise<string> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const idParam = ParameterBindingUtility.addParam(
        bindParam,
        'id',
        interruption.id
      );
      const executionIdParam = ParameterBindingUtility.addParam(
        bindParam,
        'executionId',
        interruption.executionId
      );
      const nodeIdParam = ParameterBindingUtility.addParam(
        bindParam,
        'nodeId',
        interruption.nodeId
      );
      const typeParam = ParameterBindingUtility.addParam(
        bindParam,
        'type',
        interruption.type
      );
      const statusParam = ParameterBindingUtility.addParam(
        bindParam,
        'status',
        interruption.status
      );
      const messageParam = ParameterBindingUtility.addParam(
        bindParam,
        'message',
        interruption.context.message
      );
      const metadataParam = ParameterBindingUtility.addParam(
        bindParam,
        'metadata',
        JSON.stringify(interruption.context.metadata || {})
      );
      const timeoutDurationParam = ParameterBindingUtility.addParam(
        bindParam,
        'timeoutDuration',
        interruption.timeout.duration
      );
      const timeoutStrategyParam = ParameterBindingUtility.addParam(
        bindParam,
        'timeoutStrategy',
        interruption.timeout.strategy
      );
      const createdAtParam = ParameterBindingUtility.addParam(
        bindParam,
        'createdAt',
        interruption.timestamps.created.toISOString()
      );

      queryBuilder
        .create(
          `(i:UserInterruption {
          id: $${idParam},
          executionId: $${executionIdParam},
          nodeId: $${nodeIdParam},
          type: $${typeParam},
          status: $${statusParam},
          message: $${messageParam},
          metadata: $${metadataParam},
          timeoutDuration: $${timeoutDurationParam},
          timeoutStrategy: $${timeoutStrategyParam},
          createdAt: datetime($${createdAtParam}),
          updatedAt: datetime($${createdAtParam})
        })`
        )
        .with('i')
        .match(`(e:WorkflowExecution {id: $${executionIdParam}})`)
        .forEach(
          `execution IN CASE WHEN e IS NOT NULL THEN [e] ELSE [] END |
          CREATE (execution)-[:HAS_INTERRUPTION]->(i)
        `
        )
        .return('i.id as interruptionId');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      if (result.records.length === 0) {
        throw new Error('Failed to create interruption record');
      }

      const interruptionId = result.records[0].get('interruptionId');
      return interruptionId;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to store interruption: ${errorMsg}`);
    }
  }

  /**
   * Get interruption by ID
   * Migrated from: getInterruption in neo4j-interruption-storage.adapter.ts
   */
  @Safe()
  async getInterruption(id: string): Promise<UserInterruption | null> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const idParam = ParameterBindingUtility.addParam(bindParam, 'id', id);

      queryBuilder
        .match('(i:UserInterruption)')
        .where(`i.id = $${idParam}`)
        .match('(i)-[:HAS_RESPONSE]->(r:InterruptionResponse)')
        .return('i, r');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const interruptionNode = record.get('i');
      const responseNode = record.get('r');

      return this.mapNodeToInterruption(interruptionNode, responseNode);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get interruption: ${errorMsg}`);
    }
  }

  /**
   * Get active interruptions for execution
   * Migrated from: getActiveInterruptions in neo4j-interruption-storage.adapter.ts
   */
  @Safe()
  async getActiveInterruptions(
    executionId: string
  ): Promise<readonly UserInterruption[]> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const executionIdParam = ParameterBindingUtility.addParam(
        bindParam,
        'executionId',
        executionId
      );
      const statusParam = ParameterBindingUtility.addParam(
        bindParam,
        'status',
        'pending'
      );

      queryBuilder
        .match(
          '(e:WorkflowExecution)-[:HAS_INTERRUPTION]->(i:UserInterruption)'
        )
        .where(`e.id = $${executionIdParam} AND i.status = $${statusParam}`)
        .match('(i)-[:HAS_RESPONSE]->(r:InterruptionResponse)')
        .return('i, r')
        .orderBy('i.createdAt ASC');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      const interruptions: UserInterruption[] = [];

      for (const record of result.records) {
        const interruptionNode = record.get('i');
        const responseNode = record.get('r');

        const interruption = this.mapNodeToInterruption(
          interruptionNode,
          responseNode
        );
        if (interruption) {
          interruptions.push(interruption);
        }
      }

      return interruptions;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get active interruptions: ${errorMsg}`);
    }
  }

  /**
   * Update interruption status
   * Migrated from: updateInterruptionStatus in neo4j-interruption-storage.adapter.ts
   */
  @ValidateInput()
  @AuditLog({ logLevel: 'detailed', enabled: true, logSuccess: true })
  @Safe()
  async updateInterruptionStatus(
    id: string,
    status: InterruptionStatus,
    response?: UserInterruptionResponse
  ): Promise<boolean> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const idParam = ParameterBindingUtility.addParam(bindParam, 'id', id);
      const statusParam = ParameterBindingUtility.addParam(
        bindParam,
        'status',
        status
      );
      const updatedAtParam = ParameterBindingUtility.addParam(
        bindParam,
        'updatedAt',
        new Date().toISOString()
      );

      queryBuilder
        .match('(i:UserInterruption)')
        .where(`i.id = $${idParam}`)
        .set(`i.status = $${statusParam}`)
        .set(`i.updatedAt = datetime($${updatedAtParam})`);

      if (status === InterruptionStatus.RESPONDED) {
        const respondedAtParam = ParameterBindingUtility.addParam(
          bindParam,
          'respondedAt',
          new Date().toISOString()
        );
        queryBuilder.set(`i.respondedAt = datetime($${respondedAtParam})`);
      } else if (status === InterruptionStatus.TIMEOUT) {
        const timeoutAtParam = ParameterBindingUtility.addParam(
          bindParam,
          'timeoutAt',
          new Date().toISOString()
        );
        queryBuilder.set(`i.timeoutAt = datetime($${timeoutAtParam})`);
      }

      queryBuilder.return('i.id as interruptionId');

      // Update interruption status
      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const updateResult = await this.neogma.run(cypher, params);

      if (updateResult.records.length === 0) {
        return false;
      }

      // Store response if provided
      if (response && status === InterruptionStatus.RESPONDED) {
        await this.storeInterruptionResponse(id, response);
      }

      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update interruption status: ${errorMsg}`);
    }
  }

  /**
   * Get interruption history for execution
   * Migrated from: getInterruptionHistory in neo4j-interruption-storage.adapter.ts
   */
  @Safe()
  async getInterruptionHistory(
    executionId: string
  ): Promise<readonly UserInterruption[]> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const executionIdParam = ParameterBindingUtility.addParam(
        bindParam,
        'executionId',
        executionId
      );
      const limitParam = ParameterBindingUtility.addParam(
        bindParam,
        'limit',
        50
      );

      queryBuilder
        .match(
          '(e:WorkflowExecution)-[:HAS_INTERRUPTION]->(i:UserInterruption)'
        )
        .where(`e.id = $${executionIdParam}`)
        .match('(i)-[:HAS_RESPONSE]->(r:InterruptionResponse)')
        .return('i, r')
        .orderBy('i.createdAt DESC')
        .limit(`$${limitParam}`);

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      const interruptions: UserInterruption[] = [];

      for (const record of result.records) {
        const interruptionNode = record.get('i');
        const responseNode = record.get('r');

        const interruption = this.mapNodeToInterruption(
          interruptionNode,
          responseNode
        );
        if (interruption) {
          interruptions.push(interruption);
        }
      }

      return interruptions;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get interruption history: ${errorMsg}`);
    }
  }

  /**
   * Get all active interruptions across all executions (for recovery)
   * Migrated from: getAllActiveInterruptions in neo4j-interruption-storage.adapter.ts
   */
  @Safe()
  async getAllActiveInterruptions(): Promise<readonly UserInterruption[]> {
    try {
      // ✅ CORRECT QueryBuilder pattern with raw() for OPTIONAL MATCH
      const queryBuilder = this.neogma.createQueryBuilder();

      queryBuilder
        .match('(i:UserInterruption)')
        .where('i.status = $status') // Named parameter
        .raw('OPTIONAL MATCH (i)-[:HAS_RESPONSE]->(r:InterruptionResponse)') // Use raw() for OPTIONAL MATCH
        .return('i, r')
        .orderBy('i.createdAt ASC');

      const cypher = queryBuilder.getStatement();
      const result = await this.neogma.run(cypher, { status: 'pending' });

      const interruptions: UserInterruption[] = [];

      for (const record of result.records) {
        const interruptionNode = record.get('i');
        const responseNode = record.get('r');

        const interruption = this.mapNodeToInterruption(
          interruptionNode,
          responseNode
        );
        if (interruption) {
          interruptions.push(interruption);
        }
      }

      return interruptions;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get all active interruptions: ${errorMsg}`);
    }
  }

  /**
   * Clean up expired interruptions
   * Migrated from: cleanupExpiredInterruptions in neo4j-interruption-storage.adapter.ts
   */
  @Safe()
  async cleanupExpiredInterruptions(): Promise<number> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const statusPendingParam = ParameterBindingUtility.addParam(
        bindParam,
        'statusPending',
        'pending'
      );
      const statusTimeoutParam = ParameterBindingUtility.addParam(
        bindParam,
        'statusTimeout',
        'timeout'
      );

      queryBuilder
        .match('(i:UserInterruption)')
        .where(
          `i.status = $${statusPendingParam} AND datetime(i.createdAt) + duration({seconds: i.timeoutDuration / 1000}) < datetime()`
        )
        .set(`i.status = $${statusTimeoutParam}`)
        .set('i.timeoutAt = datetime()')
        .set('i.updatedAt = datetime()')
        .return('count(i) as expiredCount');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      const expiredCount = Number(result.records[0]?.get('expiredCount')) || 0;

      return expiredCount;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to cleanup expired interruptions: ${errorMsg}`);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Store interruption response
   * Migrated from: storeInterruptionResponse in neo4j-interruption-storage.adapter.ts
   */
  private async storeInterruptionResponse(
    interruptionId: string,
    response: UserInterruptionResponse
  ): Promise<void> {
    const queryBuilder = this.neogma.createQueryBuilder();
    const bindParam = queryBuilder.getBindParam();

    const responseId = `response_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const interruptionIdParam = ParameterBindingUtility.addParam(
      bindParam,
      'interruptionId',
      interruptionId
    );
    const responseIdParam = ParameterBindingUtility.addParam(
      bindParam,
      'responseId',
      responseId
    );
    const responseParam = ParameterBindingUtility.addParam(
      bindParam,
      'response',
      response.response
    );
    const continueExecutionParam = ParameterBindingUtility.addParam(
      bindParam,
      'continueExecution',
      response.continueExecution
    );
    const userIdParam = ParameterBindingUtility.addParam(
      bindParam,
      'userId',
      response.userId || 'anonymous'
    );
    const metadataParam = ParameterBindingUtility.addParam(
      bindParam,
      'metadata',
      JSON.stringify(response.metadata || {})
    );
    const timestampParam = ParameterBindingUtility.addParam(
      bindParam,
      'timestamp',
      response.timestamp.toISOString()
    );

    queryBuilder
      .match('(i:UserInterruption)')
      .where(`i.id = $${interruptionIdParam}`)
      .create(
        `(r:InterruptionResponse {
        id: $${responseIdParam},
        interruptionId: $${interruptionIdParam},
        response: $${responseParam},
        continueExecution: $${continueExecutionParam},
        userId: $${userIdParam},
        metadata: $${metadataParam},
        timestamp: datetime($${timestampParam})
      })`
      )
      .create('(i)-[:HAS_RESPONSE]->(r)')
      .return('r.id as responseId');

    const cypher = queryBuilder.getStatement();
    const params = bindParam.get();
    await this.neogma.run(cypher, params);
  }

  /**
   * Map Neo4j node to UserInterruption object
   * Migrated from: mapNodeToInterruption in neo4j-interruption-storage.adapter.ts
   */
  private mapNodeToInterruption(
    interruptionNode: any,
    responseNode?: any
  ): UserInterruption | null {
    if (!interruptionNode) {
      return null;
    }

    const props = interruptionNode.properties;

    let response: UserInterruptionResponse | undefined;
    if (responseNode) {
      const responseProps = responseNode.properties;
      response = {
        interruptionId: responseProps.interruptionId,
        response: responseProps.response,
        continueExecution: responseProps.continueExecution,
        userId: responseProps.userId,
        metadata: responseProps.metadata
          ? JSON.parse(responseProps.metadata)
          : {},
        timestamp: new Date(responseProps.timestamp),
      };
    }

    return {
      id: props.id,
      executionId: props.executionId,
      nodeId: props.nodeId,
      type: props.type,
      status: props.status,
      context: {
        executionId: props.executionId,
        nodeId: props.nodeId,
        type: props.type,
        message: props.message,
        metadata: props.metadata ? JSON.parse(props.metadata) : {},
      },
      response,
      timestamps: {
        created: new Date(props.createdAt),
        responded: props.respondedAt ? new Date(props.respondedAt) : undefined,
        timeout: props.timeoutAt ? new Date(props.timeoutAt) : undefined,
      },
      timeout: {
        duration: props.timeoutDuration,
        strategy: props.timeoutStrategy,
      },
    };
  }
}
