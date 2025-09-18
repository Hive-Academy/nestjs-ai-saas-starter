import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';
import {
  IUserInterruptionStorageService,
  UserInterruption,
  UserInterruptionResponse,
  InterruptionStatus,
} from '@hive-academy/langgraph-hitl';

/**
 * Neo4j implementation of user interruption storage
 * Follows the adapter pattern established by memory module
 */
@Injectable()
export class Neo4jInterruptionStorageAdapter extends IUserInterruptionStorageService {
  private readonly logger = new Logger(Neo4jInterruptionStorageAdapter.name);

  constructor(private readonly neo4jService: Neo4jService) {
    super();
  }

  /**
   * Store interruption request in Neo4j
   */
  async storeInterruption(interruption: UserInterruption): Promise<string> {
    const query = `
      CREATE (i:UserInterruption {
        id: $id,
        executionId: $executionId,
        nodeId: $nodeId,
        type: $type,
        status: $status,
        message: $message,
        metadata: $metadata,
        timeoutDuration: $timeoutDuration,
        timeoutStrategy: $timeoutStrategy,
        createdAt: $createdAt,
        updatedAt: $createdAt
      })

      // Link to execution if it exists
      WITH i
      OPTIONAL MATCH (e:WorkflowExecution {id: $executionId})
      FOREACH (execution IN CASE WHEN e IS NOT NULL THEN [e] ELSE [] END |
        CREATE (execution)-[:HAS_INTERRUPTION]->(i)
      )

      RETURN i.id as interruptionId
    `;

    const parameters = {
      id: interruption.id,
      executionId: interruption.executionId,
      nodeId: interruption.nodeId,
      type: interruption.type,
      status: interruption.status,
      message: interruption.context.message,
      metadata: JSON.stringify(interruption.context.metadata || {}),
      timeoutDuration: interruption.timeout.duration,
      timeoutStrategy: interruption.timeout.strategy,
      createdAt: interruption.timestamps.created.toISOString(),
    };

    try {
      const result = await this.neo4jService.run(query, parameters);

      if (result.records.length === 0) {
        throw new Error('Failed to create interruption record');
      }

      const interruptionId = (
        result.records[0] as { get: (key: string) => string }
      ).get('interruptionId');

      this.logger.debug(`Stored interruption ${interruptionId} in Neo4j`);
      return interruptionId;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to store interruption: ${errorMsg}`, error);
      throw new Error(`Failed to store interruption: ${errorMsg}`);
    }
  }

  /**
   * Get interruption by ID
   */
  async getInterruption(id: string): Promise<UserInterruption | null> {
    const query = `
      MATCH (i:UserInterruption {id: $id})
      OPTIONAL MATCH (i)-[:HAS_RESPONSE]->(r:InterruptionResponse)
      RETURN i, r
    `;

    try {
      const result = await this.neo4jService.run(query, { id });

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const interruptionNode = (record as any).get('i');
      const responseNode = (record as any).get('r');

      return this.mapNodeToInterruption(interruptionNode, responseNode);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get interruption ${id}: ${errorMsg}`, error);
      throw new Error(`Failed to get interruption: ${errorMsg}`);
    }
  }

  /**
   * Get active interruptions for execution
   */
  async getActiveInterruptions(
    executionId: string
  ): Promise<readonly UserInterruption[]> {
    const query = `
      MATCH (e:WorkflowExecution {id: $executionId})-[:HAS_INTERRUPTION]->(i:UserInterruption)
      WHERE i.status = 'pending'
      OPTIONAL MATCH (i)-[:HAS_RESPONSE]->(r:InterruptionResponse)
      RETURN i, r
      ORDER BY i.createdAt ASC
    `;

    try {
      const result = await this.neo4jService.run(query, { executionId });

      const interruptions: UserInterruption[] = [];

      for (const record of result.records) {
        const interruptionNode = (record as any).get('i');
        const responseNode = (record as any).get('r');

        const interruption = this.mapNodeToInterruption(
          interruptionNode,
          responseNode
        );
        if (interruption) {
          interruptions.push(interruption);
        }
      }

      this.logger.debug(
        `Found ${interruptions.length} active interruptions for execution ${executionId}`
      );
      return interruptions;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get active interruptions for execution ${executionId}: ${errorMsg}`,
        error
      );
      throw new Error(`Failed to get active interruptions: ${errorMsg}`);
    }
  }

  /**
   * Update interruption status
   */
  async updateInterruptionStatus(
    id: string,
    status: InterruptionStatus,
    response?: UserInterruptionResponse
  ): Promise<boolean> {
    const updateQuery = `
      MATCH (i:UserInterruption {id: $id})
      SET i.status = $status,
          i.updatedAt = $updatedAt
      ${
        status === InterruptionStatus.RESPONDED
          ? ', i.respondedAt = $respondedAt'
          : ''
      }
      ${
        status === InterruptionStatus.TIMEOUT
          ? ', i.timeoutAt = $timeoutAt'
          : ''
      }
      RETURN i.id as interruptionId
    `;

    const parameters: Record<string, any> = {
      id,
      status,
      updatedAt: new Date().toISOString(),
    };

    if (status === InterruptionStatus.RESPONDED) {
      parameters.respondedAt = new Date().toISOString();
    } else if (status === InterruptionStatus.TIMEOUT) {
      parameters.timeoutAt = new Date().toISOString();
    }

    try {
      // Update interruption status
      const updateResult = await this.neo4jService.run(updateQuery, parameters);

      if (updateResult.records.length === 0) {
        this.logger.warn(`Interruption ${id} not found for status update`);
        return false;
      }

      // Store response if provided
      if (response && status === InterruptionStatus.RESPONDED) {
        await this.storeInterruptionResponse(id, response);
      }

      this.logger.debug(`Updated interruption ${id} status to ${status}`);
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to update interruption status: ${errorMsg}`,
        error
      );
      throw new Error(`Failed to update interruption status: ${errorMsg}`);
    }
  }

  /**
   * Get interruption history for execution
   */
  async getInterruptionHistory(
    executionId: string
  ): Promise<readonly UserInterruption[]> {
    const query = `
      MATCH (e:WorkflowExecution {id: $executionId})-[:HAS_INTERRUPTION]->(i:UserInterruption)
      OPTIONAL MATCH (i)-[:HAS_RESPONSE]->(r:InterruptionResponse)
      RETURN i, r
      ORDER BY i.createdAt DESC
      LIMIT 50
    `;

    try {
      const result = await this.neo4jService.run(query, { executionId });

      const interruptions: UserInterruption[] = [];

      for (const record of result.records) {
        const interruptionNode = (record as any).get('i');
        const responseNode = (record as any).get('r');

        const interruption = this.mapNodeToInterruption(
          interruptionNode,
          responseNode
        );
        if (interruption) {
          interruptions.push(interruption);
        }
      }

      this.logger.debug(
        `Found ${interruptions.length} historical interruptions for execution ${executionId}`
      );
      return interruptions;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get interruption history for execution ${executionId}: ${errorMsg}`,
        error
      );
      throw new Error(`Failed to get interruption history: ${errorMsg}`);
    }
  }

  /**
   * Clean up expired interruptions
   */
  async cleanupExpiredInterruptions(): Promise<number> {
    const query = `
      MATCH (i:UserInterruption)
      WHERE i.status = 'pending'
        AND datetime(i.createdAt) + duration({seconds: i.timeoutDuration / 1000}) < datetime()
      SET i.status = 'timeout',
          i.timeoutAt = datetime().epochSeconds,
          i.updatedAt = datetime().epochSeconds
      RETURN count(i) as expiredCount
    `;

    try {
      const result = await this.neo4jService.run(query, {});

      const expiredCount =
        (result.records[0] as any)?.get('expiredCount')?.toNumber() || 0;

      if (expiredCount > 0) {
        this.logger.log(`Cleaned up ${expiredCount} expired interruptions`);
      }

      return expiredCount;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to cleanup expired interruptions: ${errorMsg}`,
        error
      );
      throw new Error(`Failed to cleanup expired interruptions: ${errorMsg}`);
    }
  }

  /**
   * Store interruption response
   */
  private async storeInterruptionResponse(
    interruptionId: string,
    response: UserInterruptionResponse
  ): Promise<void> {
    const query = `
      MATCH (i:UserInterruption {id: $interruptionId})
      CREATE (r:InterruptionResponse {
        id: $responseId,
        interruptionId: $interruptionId,
        response: $response,
        continueExecution: $continueExecution,
        userId: $userId,
        metadata: $metadata,
        timestamp: $timestamp
      })
      CREATE (i)-[:HAS_RESPONSE]->(r)
      RETURN r.id as responseId
    `;

    const parameters = {
      interruptionId,
      responseId: `response_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      response: response.response,
      continueExecution: response.continueExecution,
      userId: response.userId || 'anonymous',
      metadata: JSON.stringify(response.metadata || {}),
      timestamp: response.timestamp.toISOString(),
    };

    await this.neo4jService.run(query, parameters);
  }

  /**
   * Map Neo4j node to UserInterruption object
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
