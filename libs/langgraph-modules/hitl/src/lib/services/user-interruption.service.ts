import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { generateId, type WorkflowState } from '@hive-academy/langgraph-core';
import { HitlNotificationService } from './hitl-notification.service';
import {
  IUserInterruptionStorageService,
  InterruptionContext,
  UserInterruption,
  UserInterruptionResponse,
  InterruptionType,
  InterruptionStatus,
} from '../interfaces/user-interruption.interface';

/**
 * User Interruption Service
 * Handles dynamic user interruptions during workflow execution
 */
@Injectable()
export class UserInterruptionService {
  private readonly logger = new Logger(UserInterruptionService.name);
  private readonly userInterruptions = new Map<string, UserInterruption>();
  private readonly interruptionTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly streamConnections = new Map<string, any>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly notifications?: HitlNotificationService,
    private readonly interruptionStorage?: IUserInterruptionStorageService
  ) {}

  /**
   * Request user interruption during workflow execution
   */
  async requestUserInterruption(context: InterruptionContext): Promise<string> {
    const interruptionId = generateId('interrupt');

    // Create interruption record
    const interruption: UserInterruption = {
      id: interruptionId,
      executionId: context.executionId,
      nodeId: context.nodeId,
      type: context.type,
      status: InterruptionStatus.PENDING,
      context,
      timestamps: {
        created: new Date(),
      },
      timeout: {
        duration: 300000, // 5 minutes default
        strategy: 'continue',
      },
    };

    // Store interruption
    this.userInterruptions.set(interruptionId, interruption);

    // Store in persistent storage if available
    if (this.interruptionStorage) {
      try {
        await this.interruptionStorage.storeInterruption(interruption);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to store interruption in persistent storage: ${errorMsg}`
        );
      }
    }

    // Set up timeout
    this.setupInterruptionTimeout(interruptionId);

    // Emit event for external systems
    await this.eventEmitter.emit('interruption.requested', {
      interruption,
      streamEnabled: this.hasStreamConnection(context.executionId),
    });

    // Stream real-time interruption request if connection exists
    if (this.hasStreamConnection(context.executionId)) {
      await this.streamInterruptionRequest(interruption);
    }

    // Send notification if service available
    if (this.notifications) {
      await this.notifications.notifyApprovalRequest({
        id: interruptionId,
        executionId: context.executionId,
        nodeId: context.nodeId,
        message: context.message,
        timeoutMs: 300000,
        metadata: context.metadata || {},
      });
    }

    this.logger.log(
      `User interruption ${interruptionId} requested for execution ${context.executionId}`
    );
    return interruptionId;
  }

  /**
   * Handle user response to interruption
   */
  async handleUserInterruptionResponse(
    response: UserInterruptionResponse
  ): Promise<{
    success: boolean;
    shouldContinue: boolean;
    updatedState?: Partial<WorkflowState>;
    error?: string;
  }> {
    const interruption = this.userInterruptions.get(response.interruptionId);

    if (!interruption) {
      const error = `Interruption ${response.interruptionId} not found`;
      this.logger.error(error);
      return { success: false, shouldContinue: false, error };
    }

    if (interruption.status !== InterruptionStatus.PENDING) {
      const error = `Interruption ${response.interruptionId} is not pending (current status: ${interruption.status})`;
      this.logger.error(error);
      return { success: false, shouldContinue: false, error };
    }

    try {
      // Clear timeout
      this.clearInterruptionTimeout(response.interruptionId);

      // Update interruption record
      interruption.status = InterruptionStatus.RESPONDED;
      interruption.response = response;
      interruption.timestamps.responded = new Date();

      // Update in persistent storage if available
      if (this.interruptionStorage) {
        await this.interruptionStorage.updateInterruptionStatus(
          response.interruptionId,
          InterruptionStatus.RESPONDED,
          response
        );
      }

      // Emit completion event
      await this.eventEmitter.emit('interruption.responded', {
        interruption,
        response,
        duration: Date.now() - interruption.timestamps.created.getTime(),
      });

      // Stream real-time update
      if (this.hasStreamConnection(interruption.executionId)) {
        await this.streamInterruptionUpdate(interruption, response);
      }

      // Send notification if service available
      if (this.notifications) {
        await this.notifications.notifyApprovalResponse({
          requestId: response.interruptionId,
          executionId: interruption.executionId,
          decision: response.continueExecution ? 'approved' : 'rejected',
          approvedBy: response.userId || 'anonymous',
          message: response.response,
          responseTimeMs:
            Date.now() - interruption.timestamps.created.getTime(),
        });
      }

      // Create updated state with user input
      const updatedState: Partial<WorkflowState> = {
        userInput: response.response,
        userInputMetadata: response.metadata,
        interruptionHandled: true,
        interruptionResponse: response,
        lastInteractionTimestamp: response.timestamp,
      };

      this.logger.log(
        `User interruption ${response.interruptionId} resolved: ${
          response.continueExecution ? 'continue' : 'stop'
        }`
      );

      return {
        success: true,
        shouldContinue: response.continueExecution,
        updatedState,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error processing interruption response: ${errorMessage}`,
        error
      );
      return { success: false, shouldContinue: false, error: errorMessage };
    }
  }

  /**
   * Get active interruptions for execution
   */
  async getActiveUserInterruptions(
    executionId: string
  ): Promise<readonly UserInterruption[]> {
    const activeInterruptions = Array.from(
      this.userInterruptions.values()
    ).filter(
      (i) =>
        i.executionId === executionId && i.status === InterruptionStatus.PENDING
    );

    // Also check persistent storage if available
    if (this.interruptionStorage) {
      try {
        const storedInterruptions =
          await this.interruptionStorage.getActiveInterruptions(executionId);
        // Merge with in-memory interruptions (avoiding duplicates)
        const mergedMap = new Map<string, UserInterruption>();
        activeInterruptions.forEach((i) => mergedMap.set(i.id, i));
        storedInterruptions.forEach((i: UserInterruption) =>
          mergedMap.set(i.id, i)
        );
        return Array.from(mergedMap.values());
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to get interruptions from persistent storage: ${errorMsg}`
        );
      }
    }

    return activeInterruptions;
  }

  /**
   * Cancel user interruption
   */
  async cancelUserInterruption(interruptionId: string): Promise<boolean> {
    const interruption = this.userInterruptions.get(interruptionId);

    if (!interruption) {
      return false;
    }

    if (interruption.status !== InterruptionStatus.PENDING) {
      return false;
    }

    // Clear timeout
    this.clearInterruptionTimeout(interruptionId);

    // Update status
    interruption.status = InterruptionStatus.CANCELLED;

    // Update in persistent storage if available
    if (this.interruptionStorage) {
      try {
        await this.interruptionStorage.updateInterruptionStatus(
          interruptionId,
          InterruptionStatus.CANCELLED
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to update interruption status in storage: ${errorMsg}`
        );
      }
    }

    // Emit cancellation event
    await this.eventEmitter.emit('interruption.cancelled', {
      interruptionId,
      executionId: interruption.executionId,
      timestamp: new Date(),
    });

    this.logger.log(`Cancelled user interruption ${interruptionId}`);
    return true;
  }

  /**
   * Check if execution has pending interruptions
   */
  async hasPendingInterruptions(executionId: string): Promise<boolean> {
    const activeInterruptions = await this.getActiveUserInterruptions(
      executionId
    );
    return activeInterruptions.length > 0;
  }

  /**
   * Interrupt agent execution with user question
   */
  async interruptAgentWithQuestion(
    executionId: string,
    nodeId: string,
    userQuestion: string,
    userId?: string
  ): Promise<string> {
    return this.requestUserInterruption({
      executionId,
      nodeId,
      type: InterruptionType.QUESTION,
      message: userQuestion,
      metadata: {
        userId,
        interruptedAt: new Date(),
        interruptionSource: 'user_question',
      },
    });
  }

  /**
   * Request clarification from user during execution
   */
  async requestClarification(
    executionId: string,
    nodeId: string,
    clarificationRequest: string,
    context?: Record<string, unknown>
  ): Promise<string> {
    return this.requestUserInterruption({
      executionId,
      nodeId,
      type: InterruptionType.CLARIFICATION,
      message: clarificationRequest,
      metadata: {
        context,
        requestedAt: new Date(),
        interruptionSource: 'agent_clarification',
      },
    });
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

  // Private helper methods

  private setupInterruptionTimeout(interruptionId: string): void {
    const interruption = this.userInterruptions.get(interruptionId);
    if (!interruption) return;

    // Clear existing timeout
    this.clearInterruptionTimeout(interruptionId);

    // Set new timeout
    const timeout = setTimeout(() => {
      this.handleInterruptionTimeout(interruptionId);
    }, interruption.timeout.duration);

    this.interruptionTimeouts.set(interruptionId, timeout);
  }

  private clearInterruptionTimeout(interruptionId: string): void {
    const timeout = this.interruptionTimeouts.get(interruptionId);
    if (timeout) {
      clearTimeout(timeout);
      this.interruptionTimeouts.delete(interruptionId);
    }
  }

  private async handleInterruptionTimeout(
    interruptionId: string
  ): Promise<void> {
    const interruption = this.userInterruptions.get(interruptionId);
    if (!interruption || interruption.status !== InterruptionStatus.PENDING) {
      return;
    }

    // Update status
    interruption.status = InterruptionStatus.TIMEOUT;
    interruption.timestamps.timeout = new Date();

    // Update in persistent storage if available
    if (this.interruptionStorage) {
      try {
        await this.interruptionStorage.updateInterruptionStatus(
          interruptionId,
          InterruptionStatus.TIMEOUT
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to update interruption timeout in storage: ${errorMsg}`
        );
      }
    }

    // Emit timeout event
    await this.eventEmitter.emit('interruption.timeout', {
      interruptionId,
      executionId: interruption.executionId,
      strategy: interruption.timeout.strategy,
      timestamp: new Date(),
    });

    this.logger.warn(`User interruption ${interruptionId} timed out`);
  }

  private hasStreamConnection(executionId: string): boolean {
    return this.streamConnections.has(executionId);
  }

  private async streamInterruptionRequest(
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

  private async streamInterruptionUpdate(
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
}
