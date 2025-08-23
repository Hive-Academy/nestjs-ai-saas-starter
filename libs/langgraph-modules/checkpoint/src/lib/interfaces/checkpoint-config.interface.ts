/**
 * Configuration interfaces for checkpoint savers
 */

/**
 * Enhanced checkpoint configuration for multiple storage backends
 */
export interface CheckpointConfig {
  /**
   * Checkpoint saver type
   */
  type: 'memory' | 'redis' | 'postgres' | 'sqlite';

  /**
   * Whether checkpointing is enabled
   */
  enabled?: boolean;

  /**
   * Storage backend type
   */
  storage?: 'memory' | 'database' | 'redis' | 'postgres' | 'custom';

  /**
   * Storage configuration object
   */
  storageConfig?: Record<string, any>;

  /**
   * Custom saver implementation
   */
  saver?: any;

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
  options?: Record<string, unknown>;
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
  ssl?: boolean | Record<string, unknown>;
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
  options?: Record<string, unknown>;
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