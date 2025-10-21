import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ICheckpointAdapter,
  BaseCheckpointTuple,
  BaseCheckpointMetadata,
} from '@hive-academy/langgraph-core';
import {
  WorkflowResult,
  AgentState,
  AgentDefinition,
} from '../interfaces/multi-agent.interface';
import { WorkflowRegistryService } from './workflow-registry.service';
import { AgentRegistryService } from '../agent/agent-registry.service';
import { MultiAgentCoordinatorService } from '../coordination/multi-agent-coordinator.service';

/**
 * Workflow Checkpoint Service
 * Handles checkpoint operations, recovery, and history for workflows
 */
@Injectable()
export class WorkflowCheckpointService {
  private readonly logger = new Logger(WorkflowCheckpointService.name);

  constructor(
    private readonly workflowRegistry: WorkflowRegistryService,
    private readonly agentRegistry: AgentRegistryService,
    private readonly coordinator: MultiAgentCoordinatorService,
    private readonly eventEmitter: EventEmitter2,
    @Optional()
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter?: ICheckpointAdapter
  ) {
    this.logger.debug('WorkflowCheckpointService initialized');
    if (this.checkpointAdapter) {
      this.logger.log(
        'Checkpoint adapter available - checkpoint operations enabled'
      );
    } else {
      this.logger.debug(
        'No checkpoint adapter - checkpoint operations disabled'
      );
    }
  }

  /**
   * Check if checkpointing is available
   */
  isCheckpointingAvailable(): boolean {
    return this.checkpointAdapter != null;
  }

  /**
   * Save a checkpoint for a workflow instance
   */
  async saveCheckpoint(
    threadId: string,
    state: AgentState,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!this.checkpointAdapter) {
      this.logger.debug('Checkpoint save skipped - no adapter available');
      return;
    }

    try {
      const checkpointMetadata: BaseCheckpointMetadata = {
        timestamp: new Date().toISOString(),
        source: 'update' as const, // Use valid source type
        step: (state.metadata?.step as number) || 0,
        parents: {},
        ...metadata,
      };

      await this.checkpointAdapter.saveCheckpoint(
        threadId,
        state,
        checkpointMetadata
      );

      this.logger.debug(`Checkpoint saved for thread ${threadId}`);

      this.eventEmitter.emit('checkpoint.saved', {
        threadId,
        metadata: checkpointMetadata,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to save checkpoint for thread ${threadId}:`,
        errorMessage
      );
      // Don't throw - checkpointing failures shouldn't break workflow execution
    }
  }

  /**
   * Resume workflow execution from checkpoint
   */
  async resumeFromCheckpoint(
    threadId: string,
    checkpointId?: string
  ): Promise<WorkflowResult> {
    if (!this.checkpointAdapter) {
      throw new Error(
        'Cannot resume from checkpoint: no checkpoint adapter available'
      );
    }

    this.logger.log(
      `Resuming workflow from checkpoint - thread: ${threadId}, checkpoint: ${
        checkpointId || 'latest'
      }`
    );

    try {
      // Load the checkpoint from the adapter
      const checkpoint = await this.checkpointAdapter.loadCheckpoint(
        threadId,
        checkpointId
      );

      if (!checkpoint) {
        throw new Error(
          `No checkpoint found for thread ${threadId}${
            checkpointId ? ` with ID ${checkpointId}` : ''
          }`
        );
      }

      // Extract workflow state from checkpoint
      const savedState = checkpoint.channel_values as AgentState;
      if (!savedState) {
        throw new Error('Checkpoint does not contain valid workflow state');
      }

      // Recreate workflow context from checkpoint
      const workflowId =
        (savedState.metadata?.workflowId as string) || 'unknown';
      const workflow = this.workflowRegistry.getWorkflow(workflowId);

      if (!workflow) {
        throw new Error(
          `Cannot resume: workflow '${workflowId}' not found in registry`
        );
      }

      // Build workflow context
      const workflowContext = {
        instanceId: threadId,
        agents: new Map<string, AgentDefinition>(),
        tools: [],
        config: {
          timeout: 300000,
          checkpointing: true,
          streaming: false,
          retry: {
            enabled: true,
            maxAttempts: 3,
            backoffMs: 1000,
          },
          thread_id: threadId,
          checkpoint_ns: `${workflowId}-checkpoints`,
        },
        logger: this.logger,
        coordinator: this.coordinator,
      };

      // Restore agents if available
      if (workflow.requiredAgents) {
        for (const agentId of workflow.requiredAgents) {
          const agent = this.agentRegistry.getAgent(agentId);
          if (agent) {
            workflowContext.agents.set(agentId, agent);
          }
        }
      }

      this.logger.log(`Resuming workflow execution from checkpoint state`);

      // Resume execution from the saved state
      const startTime = Date.now();

      // Continue execution with the saved state
      const result = await workflow.execute(savedState, workflowContext);

      const endTime = Date.now();

      // Build comprehensive result
      const workflowResult: WorkflowResult = {
        success: result.success !== false,
        data: result.data || savedState,
        metadata: {
          ...result.metadata,
          startTime,
          endTime,
          duration: endTime - startTime,
          instanceId: threadId,
          agentsUsed: result.metadata?.agentsUsed || [],
          checkpoints: (result.metadata?.checkpoints as number) || 1,
        },
      };

      // Emit resume event
      this.eventEmitter.emit('workflow.resumed', {
        instanceId: threadId,
        workflowId,
        checkpointId: checkpoint.id,
        result: workflowResult,
      });

      return workflowResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to resume from checkpoint: ${errorMessage}`);

      // Return error result instead of throwing
      return {
        success: false,
        error: {
          message: errorMessage,
          code: 'CHECKPOINT_RESUME_FAILED',
          details: error,
        },
        metadata: {
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 0,
          instanceId: threadId,
        },
      };
    }
  }

  /**
   * Get workflow history from checkpoints
   */
  async getWorkflowHistory(threadId: string): Promise<any[]> {
    if (!this.checkpointAdapter) {
      this.logger.warn('No checkpoint adapter available for history retrieval');
      return [];
    }

    try {
      this.logger.log(`Retrieving workflow history for thread: ${threadId}`);

      // Retrieve all checkpoints for this thread
      const checkpoints = await this.checkpointAdapter.listCheckpoints(
        threadId,
        {
          limit: 100, // Get up to 100 checkpoints
          offset: 0,
        }
      );

      if (!checkpoints || checkpoints.length === 0) {
        this.logger.debug(
          `No checkpoint history found for thread: ${threadId}`
        );
        return [];
      }

      // Transform checkpoints into history entries
      const history = this.transformCheckpointsToHistory(threadId, checkpoints);

      // Sort by step/timestamp (newest first by default)
      history.sort((a, b) => {
        // First sort by step if available
        if (a.step !== undefined && b.step !== undefined) {
          return b.step - a.step;
        }
        // Fall back to timestamp
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA;
      });

      this.logger.log(
        `Retrieved ${history.length} checkpoint history entries for thread: ${threadId}`
      );

      return history;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to retrieve workflow history: ${errorMessage}`,
        errorStack
      );
      return [];
    }
  }

  /**
   * Get latest checkpoint for a thread
   */
  async getLatestCheckpoint(threadId: string): Promise<AgentState | null> {
    if (!this.checkpointAdapter) {
      return null;
    }

    try {
      const checkpoint = await this.checkpointAdapter.loadCheckpoint(threadId);
      if (!checkpoint) {
        return null;
      }

      return checkpoint.channel_values as AgentState;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get latest checkpoint: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Delete checkpoints for a thread
   */
  async deleteCheckpoints(threadId: string): Promise<number> {
    if (!this.checkpointAdapter) {
      return 0;
    }

    try {
      const deletedCount = await this.checkpointAdapter.cleanupCheckpoints({
        threadIds: [threadId],
      });

      this.logger.log(
        `Deleted ${deletedCount} checkpoints for thread ${threadId}`
      );

      this.eventEmitter.emit('checkpoints.deleted', {
        threadId,
        count: deletedCount,
      });

      return deletedCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to delete checkpoints: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * Clean up old checkpoints based on age
   */
  async cleanupOldCheckpoints(maxAge: number): Promise<number> {
    if (!this.checkpointAdapter) {
      return 0;
    }

    try {
      const deletedCount = await this.checkpointAdapter.cleanupCheckpoints({
        maxAge,
      });

      this.logger.log(
        `Cleaned up ${deletedCount} old checkpoints (max age: ${maxAge}ms)`
      );

      return deletedCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to cleanup old checkpoints: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * Check health of checkpoint system
   */
  async checkHealth(): Promise<boolean> {
    if (!this.checkpointAdapter) {
      return false;
    }

    try {
      return await this.checkpointAdapter.isHealthy();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Checkpoint health check failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Transform checkpoint tuples to history entries
   */
  private transformCheckpointsToHistory(
    threadId: string,
    checkpoints: readonly BaseCheckpointTuple[]
  ): any[] {
    return checkpoints.map(([config, checkpoint, metadata]) => {
      const state = checkpoint.channel_values as AgentState;

      return {
        threadId,
        checkpointId: checkpoint.id,
        timestamp: metadata?.timestamp || new Date(),
        step: metadata?.step || 0,
        source: metadata?.source || 'unknown',

        // Workflow execution details
        workflowId: state?.metadata?.workflowId || 'unknown',
        status: state?.metadata?.status || 'unknown',
        currentNode: state?.current || state?.metadata?.currentNode,
        completedNodes: state?.metadata?.completedNodes || [],

        // State snapshot
        state: {
          messages: state?.messages?.length || 0,
          metadata: state?.metadata || {},
          next: state?.next,
          task: state?.task,
          scratchpad: state?.scratchpad
            ? state.scratchpad.substring(0, 100) + '...'
            : null,
        },

        // Performance metrics
        metrics: {
          executionTime: state?.metadata?.executionDuration || null,
          confidence: state?.metadata?.confidence || null,
          errorCount: state?.metadata?.errorCount || 0,
        },

        // Additional context
        context: {
          parentCheckpoint: metadata?.parents
            ? Object.keys(metadata.parents)[0]
            : null,
          isResume: metadata?.source === 'input', // 'resume' is not a valid source, use 'input' instead
          isError: state?.metadata?.error !== undefined,
          errorMessage: (state?.metadata?.error as any)?.message || null,
        },
      };
    });
  }
}
