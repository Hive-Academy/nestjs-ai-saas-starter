import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import {
  ICheckpointAdapter,
  NodeIdBuilder,
} from '@hive-academy/langgraph-core';

export interface WorkflowCheckpointRecord {
  id: string;
  thread_id: string;
  checkpoint: {
    version: number;
    data: any;
  };
  metadata: {
    source: string;
    type: string;
    executionId: string;
    created_at: string;
    [key: string]: any;
  };
}

export interface WorkflowCheckpointListResult {
  checkpoints: WorkflowCheckpointRecord[];
  total: number;
  hasMore: boolean;
}

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
        .addScope('workflow-engine')
        .addScope('execution')
        .addIdentifier(executionId)
        .build();
    } catch (error) {
      this.logger.warn('NodeIdBuilder failed, using fallback pattern:', error);
      // Fallback to simple pattern if NodeIdBuilder fails
      return `workflow-engine.execution.${executionId}`;
    }
  }

  /**
   * Save a checkpoint for workflow execution
   */
  async saveCheckpoint(
    executionId: string,
    data: any,
    type: 'initial' | 'progress' | 'final' | 'error' = 'progress',
    metadata: Record<string, any> = {}
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

      const checkpointData: WorkflowCheckpointRecord = {
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
          source: 'workflow-engine',
          type,
          executionId,
          created_at: timestamp,
          ...metadata,
        },
      };

      await this.checkpointAdapter.putCheckpoint(checkpointData);
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
   * Resume workflow from checkpoint
   */
  async resumeWorkflow(executionId: string): Promise<any | null> {
    if (!this.checkpointingEnabled || !this.checkpointAdapter) {
      this.logger.debug(
        `Checkpoint adapter not available, cannot resume ${executionId}`
      );
      return null;
    }

    try {
      const threadId = this.generateThreadId(executionId);
      const checkpoint = await this.checkpointAdapter.getCheckpoint(threadId);

      if (!checkpoint) {
        this.logger.warn(`No checkpoint found for execution ${executionId}`);
        return null;
      }

      this.logger.log(
        `Resuming workflow execution ${executionId} from checkpoint`
      );
      return checkpoint.checkpoint.data;
    } catch (error) {
      this.logger.error(
        `Failed to resume workflow for execution ${executionId}:`,
        error
      );
      return null;
    }
  }

  /**
   * List checkpoints for a workflow execution
   */
  async listCheckpoints(
    executionId: string,
    limit = 50,
    before?: string
  ): Promise<WorkflowCheckpointListResult> {
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

      return {
        checkpoints: result || [],
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
   * Get checkpoint history for a workflow execution
   */
  async getCheckpointHistory(
    executionId: string
  ): Promise<WorkflowCheckpointRecord[]> {
    if (!this.checkpointingEnabled || !this.checkpointAdapter) {
      this.logger.debug(
        `Checkpoint adapter not available, returning empty history for ${executionId}`
      );
      return [];
    }

    try {
      const threadId = this.generateThreadId(executionId);
      const checkpoints = await this.checkpointAdapter.listCheckpoints(
        threadId,
        {
          limit: 100, // Get more for history view
        }
      );

      // Sort by creation time (most recent first)
      return (checkpoints || []).sort(
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
      const checkpoints = await this.checkpointAdapter.listCheckpoints(
        threadId,
        {
          limit: 1000, // Get all for cleanup
        }
      );

      if (!checkpoints || checkpoints.length <= keepLatest) {
        this.logger.debug(`No cleanup needed for execution ${executionId}`);
        return 0;
      }

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
            await this.checkpointAdapter.deleteCheckpoint(checkpoint.id);
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
