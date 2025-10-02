import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import {
  ICheckpointAdapter,
  NodeIdBuilder,
} from '@hive-academy/langgraph-core';
import {
  WorkflowCheckpointRecord,
  WorkflowCheckpointListResult,
  WorkflowCheckpointMetadata,
  WorkflowExecutionMetadata,
  WorkflowPerformanceMetadata,
  WorkflowBusinessMetadata,
} from '../interfaces/workflow-metadata.interface';

/**
 * Standard workflow checkpoint data structure
 */
export interface WorkflowCheckpointData {
  /** Workflow execution ID */
  readonly executionId: string;
  /** Checkpoint timestamp */
  readonly timestamp: string;
  /** Checkpoint type */
  readonly type: WorkflowExecutionMetadata['type'];
  /** Workflow input data */
  readonly input?: unknown;
  /** Workflow configuration */
  readonly config?: unknown;
  /** Current workflow state */
  readonly state?: unknown;
  /** Execution status */
  readonly status?: 'started' | 'running' | 'completed' | 'failed';
  /** Error information if applicable */
  readonly error?: {
    message: string;
    stack?: string;
  };
}

/**
 * Combined metadata type for workflow checkpoints
 */
export type WorkflowCheckpointCombinedMetadata = WorkflowCheckpointMetadata<
  WorkflowPerformanceMetadata & WorkflowBusinessMetadata
>;

/**
 * Service for managing workflow checkpoint operations
 * Provides high-level checkpoint management with NodeIdBuilder integration
 */
@Injectable()
export class WorkflowCheckpointService {
  private readonly logger = new Logger(WorkflowCheckpointService.name);
  private readonly checkpointingEnabled: boolean;

  constructor(
    @Optional()
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter?: ICheckpointAdapter
  ) {
    this.checkpointingEnabled = !!this.checkpointAdapter;
    this.logger.log(
      `Workflow checkpoint service initialized. Enabled: ${this.checkpointingEnabled}`
    );
  }

  /**
   * Generate canonical thread ID for workflow execution
   * Uses NodeIdBuilder pattern: workflow-engine.execution.{executionId}
   */
  generateThreadId(executionId: string): string {
    try {
      return NodeIdBuilder.create()
        .domain('workflow-engine')
        .phase('execution')
        .activity(executionId)
        .build();
    } catch (error) {
      this.logger.warn('NodeIdBuilder failed, using fallback pattern:', error);
      // Fallback to simple pattern if NodeIdBuilder fails
      return `workflow-engine.execution.${executionId}`;
    }
  }

  /**
   * Save a checkpoint for workflow execution with type-safe metadata
   */
  async saveCheckpoint<TMetadata = Record<string, unknown>>(
    executionId: string,
    data: WorkflowCheckpointData,
    type: WorkflowExecutionMetadata['type'] = 'progress',
    customMetadata: TMetadata = {} as TMetadata
  ): Promise<void> {
    if (!this.checkpointingEnabled || !this.checkpointAdapter) {
      this.logger.debug(
        `Checkpoint adapter not available, skipping save for ${executionId}`
      );
      return;
    }

    try {
      const threadId = this.generateThreadId(executionId);
      const timestamp = new Date().toISOString();
      const checkpointId = `${threadId}_${type}_${Date.now()}`;

      const checkpointData: WorkflowCheckpointRecord<
        WorkflowCheckpointData,
        TMetadata
      > = {
        id: checkpointId,
        thread_id: threadId,
        checkpoint: {
          version: 1,
          data: {
            ...data,
            executionId,
            timestamp,
            type,
          },
        },
        metadata: {
          timestamp,
          source: type === 'initial' ? 'input' : 'update',
          step: type === 'initial' ? 0 : 1,
          parents: {},
          executionId,
          type,
          created_at: timestamp,
          payload: customMetadata,
        } as WorkflowCheckpointMetadata<TMetadata>,
      };

      // Extract base metadata for LangGraph compatibility
      const { payload, ...baseMetadata } = checkpointData.metadata;
      await this.checkpointAdapter.saveCheckpoint(
        threadId,
        checkpointData,
        baseMetadata
      );
      this.logger.debug(
        `Saved ${type} checkpoint for execution ${executionId} with thread ID ${threadId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to save ${type} checkpoint for execution ${executionId}:`,
        error
      );
      // Don't throw - checkpointing should not break workflow execution
    }
  }

  /**
   * Resume workflow from checkpoint with type safety
   */
  async resumeWorkflow<TData = WorkflowCheckpointData>(
    executionId: string
  ): Promise<TData | null> {
    if (!this.checkpointingEnabled || !this.checkpointAdapter) {
      this.logger.debug(
        `Checkpoint adapter not available, cannot resume ${executionId}`
      );
      return null;
    }

    try {
      const threadId = this.generateThreadId(executionId);
      const checkpoint = await this.checkpointAdapter.loadCheckpoint(threadId);

      if (!checkpoint) {
        this.logger.warn(`No checkpoint found for execution ${executionId}`);
        return null;
      }

      this.logger.log(
        `Resuming workflow execution ${executionId} from checkpoint`
      );
      return checkpoint.channel_values as TData;
    } catch (error) {
      this.logger.error(
        `Failed to resume workflow for execution ${executionId}:`,
        error
      );
      return null;
    }
  }

  /**
   * List checkpoints for a workflow execution with type safety
   */
  async listCheckpoints<
    TData = WorkflowCheckpointData,
    TMetadata = Record<string, unknown>
  >(
    executionId: string,
    limit = 50,
    before?: string
  ): Promise<WorkflowCheckpointListResult<TData, TMetadata>> {
    if (!this.checkpointingEnabled || !this.checkpointAdapter) {
      this.logger.debug(
        `Checkpoint adapter not available, returning empty list for ${executionId}`
      );
      return { checkpoints: [], total: 0, hasMore: false };
    }

    try {
      const threadId = this.generateThreadId(executionId);
      const result = await this.checkpointAdapter.listCheckpoints(threadId, {
        limit,
        before,
      });

      // Convert BaseCheckpointTuple[] to WorkflowCheckpointRecord[] with type safety
      const checkpoints: WorkflowCheckpointRecord<TData, TMetadata>[] = (
        result || []
      ).map((tuple, index) => {
        const [_, checkpoint, metadata] = tuple;
        const baseCheckpoint = checkpoint as {
          id?: string;
          channel_values?: TData;
        };
        const baseMetadata = metadata as WorkflowCheckpointMetadata<TMetadata>;

        return {
          id: baseCheckpoint.id || `checkpoint-${index}`,
          thread_id: threadId,
          checkpoint: {
            version: 1,
            data: baseCheckpoint.channel_values || ({} as TData),
          },
          metadata: {
            timestamp: baseMetadata.timestamp || new Date().toISOString(),
            source: baseMetadata.source || 'update',
            step: baseMetadata.step || 1,
            parents: baseMetadata.parents || {},
            executionId: baseMetadata.executionId || executionId,
            type: baseMetadata.type || 'progress',
            created_at: baseMetadata.created_at || baseMetadata.timestamp,
            payload: baseMetadata.payload,
          } as WorkflowCheckpointMetadata<TMetadata>,
        };
      });

      return {
        checkpoints,
        total: result?.length || 0,
        hasMore: (result?.length || 0) >= limit,
      };
    } catch (error) {
      this.logger.error(
        `Failed to list checkpoints for execution ${executionId}:`,
        error
      );
      return { checkpoints: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get checkpoint history for a workflow execution with type safety
   */
  async getCheckpointHistory<
    TData = WorkflowCheckpointData,
    TMetadata = Record<string, unknown>
  >(
    executionId: string
  ): Promise<WorkflowCheckpointRecord<TData, TMetadata>[]> {
    if (!this.checkpointingEnabled || !this.checkpointAdapter) {
      this.logger.debug(
        `Checkpoint adapter not available, returning empty history for ${executionId}`
      );
      return [];
    }

    try {
      const threadId = this.generateThreadId(executionId);
      const result = await this.checkpointAdapter.listCheckpoints(threadId, {
        limit: 100, // Get more for history view
      });

      // Convert BaseCheckpointTuple[] to WorkflowCheckpointRecord[] with type safety
      const checkpoints: WorkflowCheckpointRecord<TData, TMetadata>[] = (
        result || []
      ).map((tuple, index) => {
        const [_, checkpoint, metadata] = tuple;
        const baseCheckpoint = checkpoint as {
          id?: string;
          channel_values?: TData;
        };
        const baseMetadata = metadata as WorkflowCheckpointMetadata<TMetadata>;

        return {
          id: baseCheckpoint.id || `checkpoint-${index}`,
          thread_id: threadId,
          checkpoint: {
            version: 1,
            data: baseCheckpoint.channel_values || ({} as TData),
          },
          metadata: {
            timestamp: baseMetadata.timestamp || new Date().toISOString(),
            source: baseMetadata.source || 'update',
            step: baseMetadata.step || 1,
            parents: baseMetadata.parents || {},
            executionId: baseMetadata.executionId || executionId,
            type: baseMetadata.type || 'progress',
            created_at: baseMetadata.created_at || baseMetadata.timestamp,
            payload: baseMetadata.payload,
          } as WorkflowCheckpointMetadata<TMetadata>,
        };
      });

      // Sort by creation time (most recent first)
      return checkpoints.sort(
        (a, b) =>
          new Date(b.metadata.created_at).getTime() -
          new Date(a.metadata.created_at).getTime()
      );
    } catch (error) {
      this.logger.error(
        `Failed to get checkpoint history for execution ${executionId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Clean up old checkpoints for a workflow execution
   */
  async cleanupCheckpoints(
    executionId: string,
    keepLatest = 5
  ): Promise<number> {
    if (!this.checkpointingEnabled || !this.checkpointAdapter) {
      this.logger.debug(
        `Checkpoint adapter not available, skipping cleanup for ${executionId}`
      );
      return 0;
    }

    try {
      const threadId = this.generateThreadId(executionId);
      const result = await this.checkpointAdapter.listCheckpoints(threadId, {
        limit: 1000, // Get all for cleanup
      });

      if (!result || result.length <= keepLatest) {
        this.logger.debug(`No cleanup needed for execution ${executionId}`);
        return 0;
      }

      // Convert BaseCheckpointTuple[] to WorkflowCheckpointRecord[] with type safety
      const checkpoints: WorkflowCheckpointRecord<
        WorkflowCheckpointData,
        Record<string, unknown>
      >[] = result.map((tuple, index) => {
        const [_, checkpoint, metadata] = tuple;
        const baseCheckpoint = checkpoint as {
          id?: string;
          channel_values?: WorkflowCheckpointData;
        };
        const baseMetadata = metadata as WorkflowCheckpointMetadata<
          Record<string, unknown>
        >;

        return {
          id: baseCheckpoint.id || `checkpoint-${index}`,
          thread_id: threadId,
          checkpoint: {
            version: 1,
            data:
              baseCheckpoint.channel_values || ({} as WorkflowCheckpointData),
          },
          metadata: {
            timestamp: baseMetadata.timestamp || new Date().toISOString(),
            source: baseMetadata.source || 'update',
            step: baseMetadata.step || 1,
            parents: baseMetadata.parents || {},
            executionId: baseMetadata.executionId || executionId,
            type: baseMetadata.type || 'progress',
            created_at: baseMetadata.created_at || baseMetadata.timestamp,
            payload: baseMetadata.payload,
          } as WorkflowCheckpointMetadata<Record<string, unknown>>,
        };
      });

      // Sort by creation time (most recent first)
      const sortedCheckpoints = checkpoints.sort(
        (a, b) =>
          new Date(b.metadata.created_at).getTime() -
          new Date(a.metadata.created_at).getTime()
      );

      // Keep only the latest ones
      const checkpointsToDelete = sortedCheckpoints.slice(keepLatest);
      let deletedCount = 0;

      for (const checkpoint of checkpointsToDelete) {
        try {
          if (this.checkpointAdapter.deleteCheckpoint) {
            await this.checkpointAdapter.deleteCheckpoint(
              threadId,
              checkpoint.id
            );
            deletedCount++;
          }
        } catch (deleteError) {
          this.logger.error(
            `Failed to delete checkpoint ${checkpoint.id}:`,
            deleteError
          );
        }
      }

      this.logger.log(
        `Cleaned up ${deletedCount} old checkpoints for execution ${executionId}`
      );
      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup checkpoints for execution ${executionId}:`,
        error
      );
      return 0;
    }
  }

  /**
   * Check if checkpointing is available
   */
  isCheckpointingEnabled(): boolean {
    return this.checkpointingEnabled;
  }

  /**
   * Get checkpoint adapter status
   */
  getAdapterStatus(): {
    enabled: boolean;
    adapterType: string | null;
  } {
    return {
      enabled: this.checkpointingEnabled,
      adapterType: this.checkpointAdapter?.constructor?.name || null,
    };
  }
}
