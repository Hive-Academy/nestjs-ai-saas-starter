import type {
  BaseCheckpointSaver,
  CheckpointMetadata,
} from '@langchain/langgraph';

/**
 * Enhanced checkpoint metadata with additional tracking information
 */
export interface EnhancedCheckpointMetadata extends CheckpointMetadata {
  /**
   * Thread ID associated with this checkpoint
   */
  threadId?: string;

  /**
   * Checkpoint creation timestamp
   */
  timestamp?: string;

  /**
   * Checkpoint version for compatibility
   */
  version?: string;

  /**
   * Workflow name that created this checkpoint
   */
  workflowName?: string;

  /**
   * Current workflow step/node (overrides base step which is number)
   */
  stepName?: string;

  /**
   * Node type (e.g., 'task', 'decision', 'human-approval')
   */
  nodeType?: string;

  /**
   * Execution duration for this step in milliseconds
   */
  executionDuration?: number;

  /**
   * Error information if step failed
   */
  error?: string;

  /**
   * Branch information for time travel
   */
  branchName?: string;

  /**
   * Parent thread ID for branched executions
   */
  parentThreadId?: string;

  /**
   * Parent checkpoint ID for branched executions
   */
  parentCheckpointId?: string;

  /**
   * Branch creation timestamp
   */
  branchCreatedAt?: string;

  /**
   * Branch description
   */
  branchDescription?: string;

  /**
   * Custom metadata fields
   */
  [key: string]: unknown;
}

/**
 * Enhanced checkpoint interface with additional functionality
 */
export interface EnhancedCheckpoint<T = Record<string, unknown>> {
  /**
   * Base checkpoint properties (copied from Checkpoint<T>)
   */
  id: string;
  channel_values: T;
  pending_sends?: any[];
  v?: number;
  ts?: string;
  channel_versions?: Record<string, number>;
  versions_seen?: Record<string, Record<string, number>>;
  [key: string]: any;
  /**
   * Enhanced metadata
   */
  metadata?: EnhancedCheckpointMetadata;

  /**
   * Checkpoint size in bytes (for monitoring)
   */
  size?: number;

  /**
   * Compression used (if any)
   */
  compression?: 'none' | 'gzip' | 'lz4';

  /**
   * Checksum for integrity verification
   */
  checksum?: string;
}

/**
 * Checkpoint tuple with enhanced metadata
 */
export type EnhancedCheckpointTuple<T = Record<string, unknown>> = [
  config: unknown, // RunnableConfig type import can be complex
  checkpoint: EnhancedCheckpoint<T>,
  metadata: EnhancedCheckpointMetadata
];

/**
 * Options for listing checkpoints
 */
export interface ListCheckpointsOptions {
  /**
   * Maximum number of checkpoints to return
   */
  limit?: number;

  /**
   * Offset for pagination
   */
  offset?: number;

  /**
   * Filter by workflow name
   */
  workflowName?: string;

  /**
   * Filter by date range
   */
  dateRange?: {
    from?: Date;
    to?: Date;
  };

  /**
   * Filter by branch name
   */
  branchName?: string;

  /**
   * Include only specific metadata fields
   */
  includeFields?: string[];

  /**
   * Exclude specific metadata fields
   */
  excludeFields?: string[];

  /**
   * Sort order
   */
  sortOrder?: 'asc' | 'desc';

  /**
   * Sort by field
   */
  sortBy?: 'timestamp' | 'stepName' | 'executionDuration';
}

/**
 * Checkpoint cleanup options
 */
export interface CheckpointCleanupOptions {
  /**
   * Maximum age of checkpoints to keep
   */
  maxAge?: number;

  /**
   * Maximum number of checkpoints per thread
   */
  maxPerThread?: number;

  /**
   * Threads to exclude from cleanup
   */
  excludeThreads?: string[];

  /**
   * Dry run mode (don't actually delete)
   */
  dryRun?: boolean;

  /**
   * Callback for each deleted checkpoint
   */
  onDelete?: (checkpointId: string, threadId: string) => void;
}

/**
 * Base checkpoint saver interface with enhanced functionality
 */
export interface EnhancedBaseCheckpointSaver extends BaseCheckpointSaver {
  /**
   * Get checkpoint statistics
   */
  getStats?: () => Promise<import('./checkpoint-stats.interface').CheckpointStats>;

  /**
   * Cleanup old checkpoints
   */
  cleanup?: (options?: CheckpointCleanupOptions) => Promise<number>;

  /**
   * Health check for the storage backend
   */
  healthCheck?: () => Promise<boolean>;

  /**
   * Get storage backend information
   */
  getStorageInfo?: () => Promise<{
    type: string;
    version?: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    details?: Record<string, unknown>;
  }>;
}