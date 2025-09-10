/**
 * Minimal checkpoint interface types for consumer libraries
 * This allows libraries to optionally integrate checkpoint functionality without direct dependencies
 */

/**
 * Minimal checkpoint data structure - only essential fields needed by consumers
 */
export interface BaseCheckpoint<T = unknown> {
  id: string;
  channel_values: T;
}

/**
 * Minimal checkpoint metadata structure - only essential fields needed by consumers
 */
export interface BaseCheckpointMetadata {
  timestamp: string;
  source: 'input' | 'loop' | 'update' | 'fork';
  step: number;
  parents: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Minimal checkpoint tuple structure for consumer libraries
 */
export type BaseCheckpointTuple = readonly [
  unknown, // config
  BaseCheckpoint,
  BaseCheckpointMetadata
];

/**
 * Options for listing checkpoints - minimal interface
 */
export interface CheckpointListOptions {
  limit?: number;
  offset?: number;
  before?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Options for checkpoint cleanup - minimal interface
 */
export interface CheckpointCleanupOptions {
  threadIds?: string[];
  maxAge?: number;
}

/**
 * Abstract interface for checkpoint operations that consumer libraries can depend on.
 * This allows consumers to optionally integrate checkpoint functionality without direct dependencies.
 */
export abstract class ICheckpointAdapter {
  /**
   * Save a checkpoint for a given thread
   */
  abstract saveCheckpoint<T = unknown>(
    threadId: string,
    checkpoint: T,
    metadata?: BaseCheckpointMetadata,
    saverName?: string
  ): Promise<void>;

  /**
   * Load the latest or specific checkpoint for a thread
   */
  abstract loadCheckpoint<T = unknown>(
    threadId: string,
    checkpointId?: string,
    saverName?: string
  ): Promise<BaseCheckpoint<T> | null>;

  /**
   * List checkpoints for a thread with pagination and filtering
   */
  abstract listCheckpoints(
    threadId: string,
    options?: CheckpointListOptions,
    saverName?: string
  ): Promise<readonly BaseCheckpointTuple[]>;

  /**
   * Cleanup old checkpoints based on specified criteria
   */
  abstract cleanupCheckpoints(
    options: CheckpointCleanupOptions
  ): Promise<number>;

  /**
   * Check if checkpointing is available and healthy
   */
  abstract isHealthy(saverName?: string): Promise<boolean>;
}

/**
 * Token for dependency injection of checkpoint adapter
 */
export const CHECKPOINT_ADAPTER_TOKEN = Symbol('CHECKPOINT_ADAPTER');

/**
 * Configuration interface for checkpoint integration in consumer libraries
 */
export interface CheckpointIntegrationConfig {
  /**
   * Whether to enable checkpoint functionality
   * @default false
   */
  enabled: boolean;

  /**
   * Default saver name to use for operations
   */
  defaultSaver?: string;

  /**
   * Automatic checkpoint settings
   */
  autoCheckpoint?: {
    /**
     * Enable automatic checkpoints
     * @default false
     */
    enabled: boolean;

    /**
     * Interval between automatic checkpoints (in ms)
     * @default 30000 (30 seconds)
     */
    interval?: number;

    /**
     * Checkpoint after specific events
     */
    after?: Array<'task' | 'node' | 'error' | 'decision' | 'custom'>;
  };

  /**
   * Error handling configuration
   */
  errorHandling?: {
    /**
     * Continue execution if checkpoint fails
     * @default true
     */
    continueOnCheckpointFailure: boolean;

    /**
     * Log checkpoint errors
     * @default true
     */
    logErrors: boolean;

    /**
     * Maximum retry attempts for checkpoint operations
     * @default 3
     */
    maxRetries: number;
  };
}

/**
 * No-op implementation for when checkpointing is disabled
 */
export class NoOpCheckpointAdapter extends ICheckpointAdapter {
  async saveCheckpoint(): Promise<void> {
    // No-op: do nothing when checkpointing is disabled
  }

  async loadCheckpoint(): Promise<null> {
    // No-op: return null when checkpointing is disabled
    return null;
  }

  async listCheckpoints(): Promise<readonly BaseCheckpointTuple[]> {
    // No-op: return empty array when checkpointing is disabled
    return [];
  }

  async cleanupCheckpoints(): Promise<number> {
    // No-op: return 0 when checkpointing is disabled
    return 0;
  }

  async isHealthy(): Promise<boolean> {
    // No-op: always healthy when disabled
    return true;
  }
}
