import { Injectable, Logger } from '@nestjs/common';
import {
  HumanApprovalRequest,
  HumanApprovalResponse,
} from './approval-workflow.types';
import {
  UserInterruption,
  UserInterruptionResponse,
} from '../interfaces/user-interruption.interface';

/**
 * Approval Streaming Service
 * Handles real-time streaming for approval and interruption events
 *
 * **TASK_2025_040 Phase 2** (Migration to LangGraph Native Recovery):
 * - Polls state.__interrupt__[0] field instead of recovery cache
 * - Uses LangGraph native interrupt state for streaming
 * - No HitlRecoveryService dependency needed
 */
@Injectable()
export class ApprovalStreamingService {
  private readonly logger = new Logger(ApprovalStreamingService.name);
  private readonly streamConnections = new Map<string, any>();

  /**
   * Check if stream connection exists for execution
   */
  hasStreamConnection(executionId: string): boolean {
    return this.streamConnections.has(executionId);
  }

  /**
   * Register stream connection for real-time updates
   */
  registerStreamConnection(executionId: string, connection: any): void {
    this.streamConnections.set(executionId, connection);
    this.logger.debug(
      `Registered stream connection for execution ${executionId}`
    );
  }

  /**
   * Unregister stream connection
   */
  unregisterStreamConnection(executionId: string): void {
    this.streamConnections.delete(executionId);
    this.logger.debug(
      `Unregistered stream connection for execution ${executionId}`
    );
  }

  /**
   * Stream approval request to connected clients
   */
  async streamApprovalRequest(request: HumanApprovalRequest): Promise<void> {
    const connection = this.streamConnections.get(request.executionId);
    if (connection?.send) {
      try {
        connection.send(
          JSON.stringify({
            type: 'approval_requested',
            data: {
              requestId: request.id,
              nodeId: request.nodeId,
              message: request.message,
              confidence: request.confidence,
              riskAssessment: request.riskAssessment,
              timeout: request.timeout.duration,
              timestamp: request.timestamps.requested,
            },
          })
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to stream approval request: ${errorMsg}`);
      }
    }
  }

  /**
   * Stream approval update to connected clients
   */
  async streamApprovalUpdate(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): Promise<void> {
    const connection = this.streamConnections.get(request.executionId);
    if (connection?.send) {
      try {
        connection.send(
          JSON.stringify({
            type: 'approval_updated',
            data: {
              requestId: request.id,
              decision: response.decision,
              approver: response.approver,
              message: response.message,
              timestamp: response.timestamp,
            },
          })
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to stream approval update: ${errorMsg}`);
      }
    }
  }

  /**
   * Stream interruption request to connected clients
   */
  async streamInterruptionRequest(
    interruption: UserInterruption
  ): Promise<void> {
    const connection = this.streamConnections.get(interruption.executionId);
    if (connection?.send) {
      try {
        connection.send(
          JSON.stringify({
            type: 'user_interruption_requested',
            data: {
              interruptionId: interruption.id,
              executionId: interruption.executionId,
              nodeId: interruption.nodeId,
              interruptionType: interruption.type,
              message: interruption.context.message,
              timestamp: interruption.timestamps.created,
              timeout: interruption.timeout.duration,
            },
          })
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to stream interruption request: ${errorMsg}`);
      }
    }
  }

  /**
   * Stream interruption update to connected clients
   */
  async streamInterruptionUpdate(
    interruption: UserInterruption,
    response: UserInterruptionResponse
  ): Promise<void> {
    const connection = this.streamConnections.get(interruption.executionId);
    if (connection?.send) {
      try {
        connection.send(
          JSON.stringify({
            type: 'user_interruption_resolved',
            data: {
              interruptionId: interruption.id,
              executionId: interruption.executionId,
              response: response.response,
              continueExecution: response.continueExecution,
              userId: response.userId,
              timestamp: response.timestamp,
            },
          })
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to stream interruption update: ${errorMsg}`);
      }
    }
  }

  /**
   * Stream workflow progress update
   */
  async streamWorkflowProgress(
    executionId: string,
    progress: {
      nodeId: string;
      status: string;
      progress: number;
      message?: string;
      timestamp: Date;
    }
  ): Promise<void> {
    const connection = this.streamConnections.get(executionId);
    if (connection?.send) {
      try {
        connection.send(
          JSON.stringify({
            type: 'workflow_progress',
            data: {
              executionId,
              ...progress,
            },
          })
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to stream workflow progress: ${errorMsg}`);
      }
    }
  }

  /**
   * Stream general event to connected clients
   */
  async streamEvent(
    executionId: string,
    event: {
      type: string;
      data: any;
      timestamp: Date;
    }
  ): Promise<void> {
    const connection = this.streamConnections.get(executionId);
    if (connection?.send) {
      try {
        connection.send(
          JSON.stringify({
            type: event.type,
            data: {
              executionId,
              ...event.data,
              timestamp: event.timestamp,
            },
          })
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to stream event: ${errorMsg}`);
      }
    }
  }

  /**
   * Get connection count for monitoring
   */
  getConnectionCount(): number {
    return this.streamConnections.size;
  }

  /**
   * Get active execution IDs with streaming
   */
  getActiveStreamingExecutions(): string[] {
    return Array.from(this.streamConnections.keys());
  }

  /**
   * Clear all connections (useful for testing)
   */
  clearAllConnections(): void {
    this.streamConnections.clear();
    this.logger.debug('All streaming connections cleared');
  }

  /**
   * Get interrupt payload from LangGraph state
   *
   * Helper method to read __interrupt__[0] field for polling approval status
   * Uses LangGraph native interrupt state instead of recovery cache
   *
   * @param checkpointer - LangGraph checkpointer instance
   * @param threadId - Thread ID to check
   * @returns Interrupt payload or null if no interrupt
   */
  async getInterruptPayload(checkpointer: any, threadId: string): Promise<any> {
    try {
      const state = await checkpointer.get({
        configurable: { thread_id: threadId },
      });
      return state?.__interrupt__?.[0] || null;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to get interrupt payload for thread ${threadId}: ${errorMsg}`
      );
      return null;
    }
  }
}
