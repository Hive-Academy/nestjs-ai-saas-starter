import type { TimeTravelConfig } from '@hive-academy/langgraph-time-travel';

/**
 * Time Travel Module Configuration for dev-brand-api
 * Enables workflow debugging and state history replay
 * Automatically disabled in production unless explicitly enabled
 */
export function getTimeTravelConfig(): TimeTravelConfig {
  const environment = process.env.NODE_ENV || 'development';
  const isProduction = environment === 'production';

  // Time-Travel is primarily a debugging tool - disabled in production by default
  const isEnabled =
    !isProduction || process.env.ENABLE_TIME_TRAVEL_PROD === 'true';

  return {
    // Maximum number of checkpoints to keep per thread
    maxCheckpointsPerThread: parseInt(
      process.env.TIME_TRAVEL_MAX_CHECKPOINTS_PER_THREAD ||
        (isProduction ? '50' : '100')
    ),

    // Maximum age of checkpoints in milliseconds
    maxCheckpointAge: parseInt(
      process.env.TIME_TRAVEL_MAX_CHECKPOINT_AGE ||
        (isProduction ? '86400000' : '604800000') // 1 day prod, 7 days dev
    ),

    // Whether to enable automatic checkpoint creation
    enableAutoCheckpoint:
      isEnabled && process.env.TIME_TRAVEL_AUTO_CHECKPOINT !== 'false',

    // Checkpoint creation interval in milliseconds
    checkpointInterval: parseInt(
      process.env.TIME_TRAVEL_CHECKPOINT_INTERVAL || '60000' // 1 minute
    ),

    // Whether to enable branch management (dev/staging only)
    enableBranching:
      isEnabled &&
      !isProduction &&
      process.env.TIME_TRAVEL_ENABLE_BRANCHING !== 'false',

    // Maximum number of branches per thread (reduced in production)
    maxBranchesPerThread: parseInt(
      process.env.TIME_TRAVEL_MAX_BRANCHES_PER_THREAD ||
        (isProduction ? '3' : '10')
    ),

    // Storage backend configuration
    storage: {
      type:
        (process.env.TIME_TRAVEL_STORAGE_TYPE as
          | 'memory'
          | 'redis'
          | 'postgres'
          | 'sqlite') || 'memory',
      config: {
        // Redis configuration (if using redis)
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),

        // PostgreSQL configuration (if using postgres)
        database:
          process.env.TIME_TRAVEL_POSTGRES_DB ||
          process.env.POSTGRES_DB ||
          'timetravel',
        username:
          process.env.TIME_TRAVEL_POSTGRES_USER || process.env.POSTGRES_USER,
        password:
          process.env.TIME_TRAVEL_POSTGRES_PASSWORD ||
          process.env.POSTGRES_PASSWORD,

        // SQLite configuration (if using sqlite)
        path: process.env.TIME_TRAVEL_SQLITE_PATH || './data/timetravel.db',
      },
    },
  };
}
