import {
  BaseCheckpointSaver,
  Checkpoint,
  CheckpointMetadata,
} from '@langchain/langgraph';

/**
 * Enhanced checkpoint configuration for multiple storage backends
 */
export interface CheckpointConfig {
  /**
   * Checkpoint saver type
   */
  type: 'memory' | 'redis' | 'postgres' | 'sqlite';

  /**
   * Unique name for this checkpoint saver
   */
  name?: string;

  /**
   * Whether this is the default saver
   */
  default?: boolean;

  /**
   * Redis-specific configuration
   */
  redis?: RedisCheckpointConfig;

  /**
   * PostgreSQL-specific configuration
   */
  postgres?: PostgresCheckpointConfig;

  /**
   * SQLite-specific configuration
   */
  sqlite?: SqliteCheckpointConfig;

  /**
   * Memory saver configuration
   */
  memory?: MemoryCheckpointConfig;
}

/**
 * Redis checkpoint saver configuration
 */
export interface RedisCheckpointConfig {
  /**
   * Redis connection host
   */
  host?: string;

  /**
   * Redis connection port
   */
  port?: number;

  /**
   * Redis password
   */
  password?: string;

  /**
   * Redis database number
   */
  db?: number;

  /**
   * Key prefix for checkpoint keys
   */
  keyPrefix?: string;

  /**
   * TTL for checkpoint data in seconds
   */
  ttl?: number;

  /**
   * Redis connection URL (alternative to host/port)
   */
  url?: string;

  /**
   * Additional Redis options
   */
  options?: Record<string, any>;
}

/**
 * PostgreSQL checkpoint saver configuration
 */
export interface PostgresCheckpointConfig {
  /**
   * PostgreSQL connection string
   */
  connectionString?: string;

  /**
   * Database host
   */
  host?: string;

  /**
   * Database port
   */
  port?: number;

  /**
   * Database name
   */
  database?: string;

  /**
   * Database user
   */
  user?: string;

  /**
   * Database password
   */
  password?: string;

  /**
   * Table name for checkpoints
   */
  tableName?: string;

  /**
   * Schema name
   */
  schemaName?: string;

  /**
   * Connection pool configuration
   */
  pool?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  };

  /**
   * SSL configuration
   */
  ssl?: boolean | Record<string, any>;
}

/**
 * SQLite checkpoint saver configuration
 */
export interface SqliteCheckpointConfig {
  /**
   * Database file path
   */
  databasePath?: string;

  /**
   * Table name for checkpoints
   */
  tableName?: string;

  /**
   * Enable WAL mode for better concurrency
   */
  walMode?: boolean;

  /**
   * Busy timeout in milliseconds
   */
  busyTimeout?: number;

  /**
   * Additional SQLite options
   */
  options?: Record<string, any>;
}

/**
 * Memory checkpoint saver configuration
 */
export interface MemoryCheckpointConfig {
  /**
   * Maximum number of checkpoints to keep in memory
   */
  maxCheckpoints?: number;

  /**
   * TTL for checkpoints in milliseconds
   */
  ttl?: number;

  /**
   * Cleanup interval in milliseconds
   */
  cleanupInterval?: number;
}

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
  [key: string]: any;
}

/**
 * Enhanced checkpoint interface with additional functionality
 */
export interface EnhancedCheckpoint<T = any> extends Checkpoint<T> {
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
export type EnhancedCheckpointTuple<T = any> = [
  config: any, // RunnableConfig
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
 * Checkpoint save error details
 */
export interface CheckpointSaveError extends Error {
  /**
   * Error code
   */
  code: string;

  /**
   * Thread ID that failed
   */
  threadId?: string;

  /**
   * Checkpoint ID that failed
   */
  checkpointId?: string;

  /**
   * Original error cause
   */
  cause?: Error;

  /**
   * Retry attempt number
   */
  retryAttempt?: number;

  /**
   * Whether this error is retryable
   */
  retryable?: boolean;
}

/**
 * Checkpoint load error details
 */
export interface CheckpointLoadError extends Error {
  /**
   * Error code
   */
  code: string;

  /**
   * Thread ID that failed
   */
  threadId?: string;

  /**
   * Checkpoint ID that failed
   */
  checkpointId?: string;

  /**
   * Original error cause
   */
  cause?: Error;
}

/**
 * Checkpoint statistics for monitoring
 */
export interface CheckpointStats {
  /**
   * Total number of checkpoints
   */
  totalCheckpoints: number;

  /**
   * Number of active threads
   */
  activeThreads: number;

  /**
   * Average checkpoint size in bytes
   */
  averageSize: number;

  /**
   * Total storage used in bytes
   */
  totalStorageUsed: number;

  /**
   * Checkpoints created in last hour
   */
  recentCheckpoints: number;

  /**
   * Average save time in milliseconds
   */
  averageSaveTime: number;

  /**
   * Average load time in milliseconds
   */
  averageLoadTime: number;

  /**
   * Error rate (0-1)
   */
  errorRate: number;

  /**
   * Storage backend type
   */
  storageType: string;

  /**
   * Last cleanup timestamp
   */
  lastCleanup?: Date;
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
  getStats?(): Promise<CheckpointStats>;

  /**
   * Cleanup old checkpoints
   */
  cleanup?(options?: CheckpointCleanupOptions): Promise<number>;

  /**
   * Health check for the storage backend
   */
  healthCheck?(): Promise<boolean>;

  /**
   * Get storage backend information
   */
  getStorageInfo?(): Promise<{
    type: string;
    version?: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    details?: Record<string, any>;
  }>;
}
