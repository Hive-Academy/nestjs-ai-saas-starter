import { Injectable } from '@nestjs/common';
import {
  Repository,
  InjectNeogma,
  NeogmaService,
  Safe,
  BaseRepositoryService,
} from '@hive-academy/nestjs-neo4j';
import { InterruptionPoint } from '../../entities/neo4j/interruption-point.entity';
import type {
  UserInterruption,
  UserInterruptionResponse,
} from '@hive-academy/langgraph-hitl';
import { InterruptionStatus } from '@hive-academy/langgraph-hitl';

/**
 * Interruption Repository
 *
 * Replaces: neo4j-interruption-storage.adapter.ts (237+ lines)
 *
 * Provides type-safe operations for workflow interruption management including
 * timeout handling, status tracking, and user interaction processing
 * using modern @Repository pattern.
 */
@Repository(() => InterruptionPoint)
@Injectable()
export class InterruptionRepository extends BaseRepositoryService<InterruptionPoint> {
  constructor(@InjectNeogma() private readonly neogma: NeogmaService) {
    super();
  }

  // ============================================================================
  // AUTO-GENERATED CRUD METHODS (from @Repository decorator)
  // ============================================================================
  // - findById(id: string): Promise<InterruptionPoint | null>
  // - findAll(options?: FindOptions<InterruptionPoint>): Promise<InterruptionPoint[]>
  // - create(data: Partial<InterruptionPoint>): Promise<InterruptionPoint>
  // - update(id: string, updates: Partial<InterruptionPoint>): Promise<InterruptionPoint | null>
  // - delete(id: string): Promise<boolean>
  // - count(where?: Partial<InterruptionPoint>): Promise<number>
  // - exists(id: string): Promise<boolean>

  // ============================================================================
  // INTERRUPTION MANAGEMENT
  // ============================================================================

  /**
   * Store interruption request in Neo4j
   * Migrated from: storeInterruption in neo4j-interruption-storage.adapter.ts
   */
  @Safe()
  async storeInterruption(interruption: UserInterruption): Promise<string> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const idParam = bindParam.add(interruption.id);
      const executionIdParam = bindParam.add(interruption.executionId);
      const nodeIdParam = bindParam.add(interruption.nodeId);
      const typeParam = bindParam.add(interruption.type);
      const statusParam = bindParam.add(interruption.status);
      const messageParam = bindParam.add(interruption.context.message);
      const metadataParam = bindParam.add(
        JSON.stringify(interruption.context.metadata || {})
      );
      const timeoutDurationParam = bindParam.add(interruption.timeout.duration);
      const timeoutStrategyParam = bindParam.add(interruption.timeout.strategy);
      const createdAtParam = bindParam.add(
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

      const idParam = bindParam.add(id);

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

      const executionIdParam = bindParam.add(executionId);
      const statusParam = bindParam.add('pending');

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
  @Safe()
  async updateInterruptionStatus(
    id: string,
    status: InterruptionStatus,
    response?: UserInterruptionResponse
  ): Promise<boolean> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const idParam = bindParam.add(id);
      const statusParam = bindParam.add(status);
      const updatedAtParam = bindParam.add(new Date().toISOString());

      queryBuilder
        .match('(i:UserInterruption)')
        .where(`i.id = $${idParam}`)
        .set(`i.status = $${statusParam}`)
        .set(`i.updatedAt = datetime($${updatedAtParam})`);

      if (status === InterruptionStatus.RESPONDED) {
        const respondedAtParam = bindParam.add(new Date().toISOString());
        queryBuilder.set(`i.respondedAt = datetime($${respondedAtParam})`);
      } else if (status === InterruptionStatus.TIMEOUT) {
        const timeoutAtParam = bindParam.add(new Date().toISOString());
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

      const executionIdParam = bindParam.add(executionId);
      const limitParam = bindParam.add(50);

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
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const statusParam = bindParam.add('pending');

      queryBuilder
        .match('(i:UserInterruption)')
        .where(`i.status = $${statusParam}`)
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

      const statusPendingParam = bindParam.add('pending');
      const statusTimeoutParam = bindParam.add('timeout');

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

    const interruptionIdParam = bindParam.add(interruptionId);
    const responseIdParam = bindParam.add(responseId);
    const responseParam = bindParam.add(response.response);
    const continueExecutionParam = bindParam.add(response.continueExecution);
    const userIdParam = bindParam.add(response.userId || 'anonymous');
    const metadataParam = bindParam.add(
      JSON.stringify(response.metadata || {})
    );
    const timestampParam = bindParam.add(response.timestamp.toISOString());

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
