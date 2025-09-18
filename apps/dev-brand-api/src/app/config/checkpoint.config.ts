import { MemorySaver } from '@langchain/langgraph-checkpoint';
import type { CheckpointModuleOptions } from '@hive-academy/langgraph-checkpoint';

/**
 * Checkpoint Configuration following official LangGraph patterns
 * Creates checkpoint saver instances for different storage backends
 *
 * Official LangGraph Pattern:
 * - Use BaseCheckpointSaver implementations (MemorySaver, SqliteSaver, etc.)
 * - Configure with environment variables
 * - Provide thread_id in graph invocation config
 */
export async function getCheckpointConfig(): Promise<CheckpointModuleOptions> {
  const savers = [];

  // Always provide a memory saver as fallback (official LangGraph pattern)
  savers.push({
    name: 'memory',
    saver: new MemorySaver(),
    default:
      process.env.CHECKPOINT_STORAGE === 'memory' ||
      !process.env.CHECKPOINT_STORAGE,
    metadata: {
      type: 'memory',
      description: 'In-memory checkpoint storage (non-persistent)',
      persistent: false,
      supportsStreaming: true,
    },
  });

  // Add SQLite saver if enabled and package is available
  if (process.env.CHECKPOINT_STORAGE === 'sqlite') {
    try {
      const { SqliteSaver } = await import(
        '@langchain/langgraph-checkpoint-sqlite'
      );
      const dbPath =
        process.env.CHECKPOINT_SQLITE_PATH || './data/checkpoints.db';

      const sqliteSaver = await SqliteSaver.fromConnString(dbPath);
      // Database initialization is handled internally

      savers.push({
        name: 'sqlite',
        saver: sqliteSaver,
        default: true,
        metadata: {
          type: 'sqlite',
          description: 'SQLite-based checkpoint storage',
          persistent: true,
          supportsStreaming: true,
          supportsTransactions: true,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.warn('SQLite checkpoint saver not available:', errorMessage);
      console.warn(
        'Install @langchain/langgraph-checkpoint-sqlite to use SQLite storage'
      );
    }
  }

  // Redis saver - commented out for demo, uncomment when Redis is available
  /*
  if (process.env.CHECKPOINT_STORAGE === 'redis' && process.env.REDIS_URL) {
    try {
      // Dynamic import to handle optional dependency
      const redisModule = await import('@langchain/langgraph-checkpoint-redis');
      const { RedisSaver } = redisModule;

      const redisSaver = new RedisSaver({
        url: process.env.REDIS_URL,
        keyPrefix: process.env.CHECKPOINT_REDIS_PREFIX || 'checkpoints:',
        ttl: parseInt(process.env.CHECKPOINT_REDIS_TTL || '86400', 10),
      });

      savers.push({
        name: 'redis',
        saver: redisSaver,
        default: true,
        metadata: {
          type: 'redis',
          description: 'Redis-based checkpoint storage (official LangGraph pattern)',
          persistent: true,
          supportsStreaming: true,
          requiresCleanup: true,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Redis checkpoint saver not available:', errorMessage);
      console.warn('Install @langchain/langgraph-checkpoint-redis to use Redis storage');
      console.warn('Falling back to memory storage for development');
    }
  }
  */

  // PostgreSQL saver - commented out for demo, uncomment when PostgreSQL is available
  /*
  if (process.env.CHECKPOINT_STORAGE === 'postgres' && process.env.POSTGRES_CONNECTION_STRING) {
    try {
      // Dynamic import to handle optional dependency
      const postgresModule = await import('@langchain/langgraph-checkpoint-postgres');
      const { PostgresSaver } = postgresModule;

      const postgresSaver = await PostgresSaver.fromConnString(
        process.env.POSTGRES_CONNECTION_STRING!
      );
      // Database initialization is handled internally

      savers.push({
        name: 'postgres',
        saver: postgresSaver,
        default: true,
        metadata: {
          type: 'postgres',
          description: 'PostgreSQL-based checkpoint storage (official LangGraph pattern)',
          persistent: true,
          supportsStreaming: true,
          supportsTransactions: true,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('PostgreSQL checkpoint saver not available:', errorMessage);
      console.warn('Install @langchain/langgraph-checkpoint-postgres to use PostgreSQL storage');
      console.warn('Falling back to memory storage for development');
    }
  }
  */

  return {
    savers,
    cleanup: {
      enabled: process.env.CHECKPOINT_CLEANUP_ENABLED !== 'false',
      maxAge: parseInt(process.env.CHECKPOINT_MAX_AGE || '604800000', 10), // 7 days
      maxPerThread: parseInt(
        process.env.CHECKPOINT_MAX_PER_THREAD || '100',
        10
      ),
      interval: parseInt(
        process.env.CHECKPOINT_CLEANUP_INTERVAL || '3600000',
        10
      ), // 1 hour
    },
    health: {
      enabled: process.env.CHECKPOINT_HEALTH_ENABLED !== 'false',
      checkInterval: parseInt(
        process.env.CHECKPOINT_HEALTH_INTERVAL || '30000',
        10
      ), // 30 seconds
      timeout: parseInt(process.env.CHECKPOINT_HEALTH_TIMEOUT || '5000', 10), // 5 seconds
    },
    metrics: {
      enabled: process.env.CHECKPOINT_METRICS_ENABLED !== 'false',
      collectInterval: parseInt(
        process.env.CHECKPOINT_METRICS_INTERVAL || '60000',
        10
      ), // 1 minute
    },
  };
}
