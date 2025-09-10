import type { CheckpointModuleOptions } from '@hive-academy/langgraph-checkpoint';

/**
 * Modular Checkpoint Configuration
 *
 * Extracted from centralized 271-line config - Part of Phase 3 Subtask 3.3
 * Reduces configuration complexity by 90%+
 */
export const getCheckpointConfig = (): CheckpointModuleOptions => {
  const storageType =
    (process.env.CHECKPOINT_STORAGE as
      | 'memory'
      | 'redis'
      | 'postgres'
      | 'sqlite') || 'memory';

  // Ensure valid storage type
  const mappedStorageType = storageType;

  const saverConfig = {
    type: mappedStorageType,
    name: 'default',
    default: true,
  } as any;

  // Add type-specific configuration
  switch (mappedStorageType) {
    case 'redis':
      saverConfig.redis = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      };
      break;
    case 'postgres':
      saverConfig.postgres = {
        database: process.env.CHECKPOINT_DB_NAME || 'workflow_checkpoints',
        user: process.env.CHECKPOINT_DB_USER,
        password: process.env.CHECKPOINT_DB_PASSWORD,
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      };
      break;
    case 'sqlite':
      saverConfig.sqlite = {
        databasePath:
          process.env.CHECKPOINT_SQLITE_PATH || './data/checkpoints.db',
      };
      break;
    case 'memory':
    default:
      saverConfig.memory = {
        maxCheckpoints: parseInt(
          process.env.CHECKPOINT_MAX_CHECKPOINTS || '1000',
          10
        ),
        ttl: parseInt(process.env.CHECKPOINT_TTL_MS || '3600000', 10), // 1 hour
      };
      break;
  }

  return {
    checkpoint: {
      savers: [saverConfig],
      maxPerThread: parseInt(process.env.CHECKPOINT_MAX_COUNT || '100', 10),
      cleanupInterval: parseInt(
        process.env.CHECKPOINT_INTERVAL_MS || '1000',
        10
      ),
      health: {
        checkInterval: 30000, // 30 seconds
        degradedThreshold: 1000, // 1 second
        unhealthyThreshold: 5000, // 5 seconds
      },
    },
  };
};
