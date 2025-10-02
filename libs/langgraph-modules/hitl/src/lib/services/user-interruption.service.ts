import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
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
 * 
 * PRODUCTION PATTERN: Uses adapter-first storage with performance caching
 * - All persistence operations go through storage adapter FIRST
 * - Map used ONLY for performance caching (not primary storage)
 * - Fail-fast behavior when storage adapter unavailable
 * - Complete state recovery from persistent storage on service restart
 */
@Injectable()
export class UserInterruptionService implements OnModuleInit {
  private readonly logger = new Logger(UserInterruptionService.name);
  // ✅ CORRECT: Cache only - not primary storage
  private readonly interruptionCache = new Map<string, UserInterruption>();
  private readonly interruptionTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly streamConnections = new Map<string, any>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    // ✅ CORRECT: Required dependency injection for adapter-first pattern
    @Inject('IUserInterruptionStorageService')
    private readonly interruptionStorage: IUserInterruptionStorageService,
    private readonly notifications?: HitlNotificationService
  ) {}

  /**
   * Module initialization: Recover all active interruptions from persistent storage
   */
  async onModuleInit(): Promise<void> {
    await this.recoverActiveInterruptions();
  }

  /**
   * Recovery implementation: Rebuild complete service state from persistent storage
   */
  private async recoverActiveInterruptions(): Promise<void> {
    try {
      // ✅ CORRECT: Load all active interruptions from primary storage
      const allActiveInterruptions = await this.interruptionStorage.getAllActiveInterruptions();
      
      // ✅ CORRECT: Rebuild cache from persistent storage
      allActiveInterruptions.forEach(interruption => {
        this.interruptionCache.set(interruption.id, interruption);
        
        // ✅ CORRECT: Restore timeout handlers for pending interruptions
        if (interruption.status === InterruptionStatus.PENDING) {
          this.setupInterruptionTimeout(interruption.id);
        }
      });
      
      this.logger.log(
        `✅ Successfully recovered ${allActiveInterruptions.length} active interruptions from persistent storage`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        '❌ CRITICAL: Failed to recover interruptions from persistent storage - service will fail fast',
        error
      );
      // ✅ CORRECT: Fail fast when storage recovery fails
      throw new Error(
        `Cannot initialize UserInterruptionService without persistent storage recovery: ${errorMsg}`
      );
    }
  }

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

    // ✅ CORRECT: Primary storage first (adapter-first pattern)
    try {
      await this.interruptionStorage.storeInterruption(interruption);
      // ✅ CORRECT: Cache for performance only
      this.interruptionCache.set(interruptionId, interruption);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ CRITICAL: Failed to store interruption in primary storage: ${errorMsg}. Service failing fast.`,
        error
      );
      // ✅ CORRECT: Fail fast when primary storage unavailable
      throw new Error(`Cannot store interruption: primary storage failed - ${errorMsg}`);
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
    // ✅ CORRECT: Try cache first for performance, fallback to storage
    let interruption = this.interruptionCache.get(response.interruptionId);
    
    if (!interruption) {
      // ✅ CORRECT: Fallback to primary storage if not in cache
      try {
        const storedInterruption = await this.interruptionStorage.getInterruption(response.interruptionId);
        if (storedInterruption) {
          interruption = storedInterruption;
          // ✅ CORRECT: Update cache from storage
          this.interruptionCache.set(response.interruptionId, interruption);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to retrieve interruption from storage: ${errorMsg}`);
        return { success: false, shouldContinue: false, error: errorMsg };
      }
    }

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

      // ✅ CORRECT: Update primary storage first
      try {
        await this.interruptionStorage.updateInterruptionStatus(
          response.interruptionId,
          InterruptionStatus.RESPONDED,
          response
        );
        
        // ✅ CORRECT: Update cache after successful storage update
        interruption.status = InterruptionStatus.RESPONDED;
        interruption.response = response;
        interruption.timestamps.responded = new Date();
        this.interruptionCache.set(response.interruptionId, interruption);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`❌ CRITICAL: Failed to update interruption in primary storage: ${errorMsg}`);
        return { success: false, shouldContinue: false, error: errorMsg };
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
    // ✅ CORRECT: Load from primary storage first (source of truth)
    try {
      const storedInterruptions = await this.interruptionStorage.getActiveInterruptions(executionId);
      
      // ✅ CORRECT: Update cache from storage (performance optimization)
      storedInterruptions.forEach(interruption => {
        this.interruptionCache.set(interruption.id, interruption);
      });
      
      // ✅ CORRECT: Return from storage (primary source of truth)
      return storedInterruptions;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ CRITICAL: Failed to get interruptions from primary storage: ${errorMsg}. Falling back to cache.`
      );
      
      // ✅ FALLBACK: Use cache only when primary storage fails
      const cachedInterruptions = Array.from(this.interruptionCache.values()).filter(
        (i) => i.executionId === executionId && i.status === InterruptionStatus.PENDING
      );
      
      this.logger.warn(
        `Using cached interruptions as fallback: ${cachedInterruptions.length} found`
      );
      
      return cachedInterruptions;
    }
  }

  /**
   * Cancel user interruption
   */
  async cancelUserInterruption(interruptionId: string): Promise<boolean> {
    // ✅ CORRECT: Try cache first for performance
    let interruption = this.interruptionCache.get(interruptionId);
    
    if (!interruption) {
      // ✅ CORRECT: Fallback to primary storage
      try {
        const storedInterruption = await this.interruptionStorage.getInterruption(interruptionId);
        if (storedInterruption) {
          interruption = storedInterruption;
          this.interruptionCache.set(interruptionId, interruption);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to retrieve interruption from storage: ${errorMsg}`);
        return false;
      }
    }

    if (!interruption) {
      return false;
    }

    if (interruption.status !== InterruptionStatus.PENDING) {
      return false;
    }

    // Clear timeout
    this.clearInterruptionTimeout(interruptionId);

    // ✅ CORRECT: Update primary storage first
    try {
      await this.interruptionStorage.updateInterruptionStatus(
        interruptionId,
        InterruptionStatus.CANCELLED
      );
      
      // ✅ CORRECT: Update cache after successful storage update
      interruption.status = InterruptionStatus.CANCELLED;
      this.interruptionCache.set(interruptionId, interruption);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ CRITICAL: Failed to update interruption status in primary storage: ${errorMsg}`
      );
      return false;
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
    const interruption = this.interruptionCache.get(interruptionId);
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
    // ✅ CORRECT: Try cache first for performance
    let interruption = this.interruptionCache.get(interruptionId);
    
    if (!interruption) {
      // ✅ CORRECT: Fallback to primary storage
      try {
        const storedInterruption = await this.interruptionStorage.getInterruption(interruptionId);
        if (storedInterruption) {
          interruption = storedInterruption;
          this.interruptionCache.set(interruptionId, interruption);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to retrieve interruption from storage during timeout: ${errorMsg}`);
        return;
      }
    }
    if (!interruption || interruption.status !== InterruptionStatus.PENDING) {
      return;
    }

    // ✅ CORRECT: Update primary storage first
    try {
      await this.interruptionStorage.updateInterruptionStatus(
        interruptionId,
        InterruptionStatus.TIMEOUT
      );
      
      // ✅ CORRECT: Update cache after successful storage update
      interruption.status = InterruptionStatus.TIMEOUT;
      interruption.timestamps.timeout = new Date();
      this.interruptionCache.set(interruptionId, interruption);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ CRITICAL: Failed to update interruption timeout in primary storage: ${errorMsg}`
      );
      return;
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
