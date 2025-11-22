import { Injectable } from '@nestjs/common';

/**
 * Checkpoint service interface for functional workflow operations
 *
 * This abstract class serves as both a contract definition and NestJS injection token
 * for checkpoint operations, enabling adapter pattern implementation while
 * maintaining type safety and dependency injection compatibility.
 *
 * Applications should provide concrete implementations of this interface by creating
 * adapters that integrate with their chosen checkpoint storage backend.
 */
@Injectable()
export abstract class ICheckpointService {
  /**
   * Save a checkpoint for the given execution
   */
  abstract saveCheckpoint<T = unknown>(
    executionId: string,
    checkpoint: T,
    metadata?: CheckpointMetadata
  ): Promise<void>;

  /**
   * Load a checkpoint for the given execution
   */
  abstract loadCheckpoint<T = unknown>(
    executionId: string,
    checkpointId?: string
  ): Promise<CheckpointTuple<T> | null>;

  /**
   * List available checkpoints for an execution
   */
  abstract listCheckpoints<T = unknown>(
    executionId: string,
    options?: ListCheckpointsOptions
  ): Promise<readonly CheckpointTuple<T>[]>;

  /**
   * Delete a specific checkpoint
   */
  abstract deleteCheckpoint(
    executionId: string,
    checkpointId: string
  ): Promise<void>;

  /**
   * Clean up old checkpoints based on options
   */
  abstract cleanupCheckpoints(
    executionId?: string,
    options?: CheckpointCleanupOptions
  ): Promise<number>;

  /**
   * Check if checkpoint system is available and healthy
   */
  abstract isHealthy(): Promise<boolean>;
}

/**
 * Metadata associated with a checkpoint
 */
export interface CheckpointMetadata {
  /**
   * Unique identifier for the checkpoint
   */
  readonly id?: string;

  /**
   * Timestamp when the checkpoint was created
   */
  readonly timestamp?: string;

  /**
   * Source of the checkpoint (e.g., 'user', 'system', 'auto')
   */
  readonly source?: 'user' | 'system' | 'auto';

  /**
   * Current step/stage in the workflow
   */
  readonly step?: number;

  /**
   * Name of the current workflow
   */
  readonly workflowName?: string;

  /**
   * Name of the current task/node
   */
  readonly currentTask?: string;

  /**
   * Additional metadata
   */
  readonly [key: string]: unknown;
}

/**
 * A checkpoint tuple containing checkpoint data and metadata
 */
export interface CheckpointTuple<T = unknown> {
  /**
   * The checkpoint data
   */
  readonly checkpoint: T;

  /**
   * Metadata about the checkpoint
   */
  readonly metadata?: CheckpointMetadata;
}

/**
 * Options for listing checkpoints
 */
export interface ListCheckpointsOptions {
  /**
   * Maximum number of checkpoints to return
   */
  readonly limit?: number;

  /**
   * Sort order for the results
   */
  readonly sortOrder?: 'asc' | 'desc';

  /**
   * Sort field
   */
  readonly sortBy?: 'timestamp' | 'step';

  /**
   * Filter by workflow name
   */
  readonly workflowName?: string;

  /**
   * Filter by source
   */
  readonly source?: 'user' | 'system' | 'auto';
}

/**
 * Options for checkpoint cleanup
 */
export interface CheckpointCleanupOptions {
  /**
   * Maximum age of checkpoints to keep (in milliseconds)
   */
  readonly maxAge?: number;

  /**
   * Maximum number of checkpoints to keep per execution
   */
  readonly maxCount?: number;

  /**
   * Whether to keep important checkpoints (marked in metadata)
   */
  readonly preserveImportant?: boolean;
}
