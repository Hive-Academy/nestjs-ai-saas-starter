/**
 * Checkpoint interfaces for workflow state persistence and recovery
 * These interfaces define how checkpoints are created, stored, and restored
 */

import type { StateSnapshot } from './state-management.interface';

/**
 * Checkpoint metadata
 */
export interface CheckpointMetadata {
  readonly id: string;
  readonly workflowId: string;
  readonly nodeId: string;
  readonly timestamp: Date;
  readonly version: number;
  readonly tags?: readonly string[];
  readonly description?: string;
  readonly userId?: string;
}

/**
 * Checkpoint data structure
 */
export interface Checkpoint<TState = unknown> {
  readonly metadata: CheckpointMetadata;
  readonly state: StateSnapshot<TState>;
  readonly size: number; // Size in bytes
  readonly compressed: boolean;
}

/**
 * Checkpoint creation options
 */
export interface CheckpointOptions {
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly compress?: boolean;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Checkpoint query filters
 */
export interface CheckpointQuery {
  readonly workflowId?: string;
  readonly nodeId?: string;
  readonly userId?: string;
  readonly tags?: readonly string[];
  readonly fromDate?: Date;
  readonly toDate?: Date;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Checkpoint restoration options
 */
export interface CheckpointRestoreOptions {
  readonly validateState?: boolean;
  readonly mergeWithCurrent?: boolean;
  readonly preserveMetadata?: boolean;
  readonly skipValidation?: boolean;
}

/**
 * Checkpoint manager interface
 */
export interface CheckpointManager<TState = unknown> {
  /**
   * Create a new checkpoint
   */
  createCheckpoint: (
    workflowId: string,
    nodeId: string,
    state: TState,
    options?: CheckpointOptions
  ) => Promise<Checkpoint<TState>>;

  /**
   * Get a specific checkpoint by ID
   */
  getCheckpoint: (checkpointId: string) => Promise<Checkpoint<TState> | null>;

  /**
   * List checkpoints matching query criteria
   */
  listCheckpoints: (query: CheckpointQuery) => Promise<Array<Checkpoint<TState>>>;

  /**
   * Restore state from a checkpoint
   */
  restoreFromCheckpoint: (
    checkpointId: string,
    options?: CheckpointRestoreOptions
  ) => Promise<TState>;

  /**
   * Delete a checkpoint
   */
  deleteCheckpoint: (checkpointId: string) => Promise<boolean>;

  /**
   * Clean up old checkpoints based on retention policy
   */
  cleanupCheckpoints: (retentionPolicy: CheckpointRetentionPolicy) => Promise<number>;

  /**
   * Get checkpoint statistics
   */
  getCheckpointStats: (workflowId?: string) => Promise<CheckpointStats>;
}

/**
 * Checkpoint retention policy
 */
export interface CheckpointRetentionPolicy {
  readonly maxAge?: number; // Maximum age in milliseconds
  readonly maxCount?: number; // Maximum number of checkpoints to keep
  readonly keepTags?: readonly string[]; // Tags to always keep regardless of policy
  readonly workflowId?: string; // Apply policy to specific workflow only
}

/**
 * Checkpoint statistics
 */
export interface CheckpointStats {
  readonly totalCount: number;
  readonly totalSize: number;
  readonly oldestCheckpoint?: Date;
  readonly newestCheckpoint?: Date;
  readonly averageSize: number;
  readonly compressionRatio?: number;
}

/**
 * Checkpoint storage backend interface
 */
export interface CheckpointStorage<TState = unknown> {
  /**
   * Store a checkpoint
   */
  store: (checkpoint: Checkpoint<TState>) => Promise<void>;

  /**
   * Retrieve a checkpoint by ID
   */
  retrieve: (checkpointId: string) => Promise<Checkpoint<TState> | null>;

  /**
   * List checkpoints matching query
   */
  list: (query: CheckpointQuery) => Promise<Array<Checkpoint<TState>>>;

  /**
   * Delete a checkpoint
   */
  delete: (checkpointId: string) => Promise<boolean>;

  /**
   * Check if storage backend is healthy
   */
  healthCheck: () => Promise<boolean>;

  /**
   * Get storage statistics
   */
  getStats: () => Promise<CheckpointStats>;
}

/**
 * Checkpoint event types
 */
export type CheckpointEventType = 
  | 'checkpoint_created'
  | 'checkpoint_restored'
  | 'checkpoint_deleted'
  | 'checkpoint_cleanup';

/**
 * Checkpoint event data
 */
export interface CheckpointEvent<TState = unknown> {
  readonly type: CheckpointEventType;
  readonly checkpointId: string;
  readonly workflowId: string;
  readonly timestamp: Date;
  readonly metadata?: Record<string, unknown>;
  readonly checkpoint?: Checkpoint<TState>;
}

/**
 * Checkpoint configuration options for internal use (renamed to avoid conflict with module options)
 */
export interface CheckpointSettings {
  readonly storage: 'memory' | 'redis' | 'file' | 'database';
  readonly retentionPolicy?: CheckpointRetentionPolicy;
  readonly compression?: boolean;
  readonly encryptionKey?: string;
  readonly autoCleanup?: boolean;
  readonly cleanupInterval?: number; // Interval in milliseconds
}