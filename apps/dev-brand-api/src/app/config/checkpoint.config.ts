import type { CheckpointModuleOptions } from '@hive-academy/langgraph-checkpoint';

/**
 * Modular Checkpoint Configuration
 *
 * Extracted from centralized 271-line config - Part of Phase 3 Subtask 3.3
 * Reduces configuration complexity by 90%+
 */
export const getCheckpointConfig = (): CheckpointModuleOptions => ({
  checkpoint: {
    savers: [
      {
        storage:
          (process.env.CHECKPOINT_STORAGE as
            | 'memory'
            | 'redis'
            | 'postgresql'
            | 'sqlite') || 'memory',
        config: {
          // Redis configuration
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),

          // PostgreSQL configuration
          database: process.env.CHECKPOINT_DB_NAME || 'workflow_checkpoints',
          username: process.env.CHECKPOINT_DB_USER,
          password: process.env.CHECKPOINT_DB_PASSWORD,

          // SQLite configuration
          path: process.env.CHECKPOINT_SQLITE_PATH || './data/checkpoints.db',
        },
      },
    ],
    maxPerThread: parseInt(process.env.CHECKPOINT_MAX_COUNT || '100', 10),
    cleanupInterval: parseInt(process.env.CHECKPOINT_INTERVAL_MS || '1000', 10),
    health: {
      checkInterval: 30000, // 30 seconds
      degradedThreshold: 1000, // 1 second
      unhealthyThreshold: 5000, // 5 seconds
    },
  },
});
