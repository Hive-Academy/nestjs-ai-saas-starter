import type {
  Checkpoint,
  CheckpointMetadata} from '@langchain/langgraph';
import {
  BaseCheckpointSaver
} from '@langchain/langgraph';
import type {
  RedisCheckpointConfig,
  EnhancedCheckpoint,
  EnhancedCheckpointMetadata,
  CheckpointStats,
  CheckpointCleanupOptions,
  EnhancedBaseCheckpointSaver,
  EnhancedCheckpointTuple,
  ListCheckpointsOptions,
} from '../../interfaces/checkpoint.interface';

/**
 * Redis-based checkpoint saver with optimized storage patterns
 */
export class RedisCheckpointSaver implements EnhancedBaseCheckpointSaver
{
  private redis: any; // Redis client
  private readonly keyPrefix: string;
  private readonly ttl: number;

  constructor(private readonly config: RedisCheckpointConfig) {
    super();
    this.keyPrefix = config.keyPrefix || 'langgraph:checkpoint:';
    this.ttl = config.ttl || 3600; // 1 hour default
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      // Dynamic import of Redis
      const { Redis } = await import('ioredis');

      if (this.config.url) {
        this.redis = new Redis(this.config.url, this.config.options);
      } else {
        this.redis = new Redis({
          host: this.config.host || 'localhost',
          port: this.config.port || 6379,
          password: this.config.password,
          db: this.config.db || 0,
          ...this.config.options,
        });
      }

      // Test connection
      await this.redis.ping();
    } catch (error) {
      throw new Error(
        `Failed to initialize Redis connection: ${error.message}`
      );
    }
  }

  /**
   * Save checkpoint to Redis
   */
  async put(
    config: any,
    checkpoint: Checkpoint,
    metadata?: CheckpointMetadata
  ): Promise<void> {
    const threadId = config.configurable?.thread_id;
    const checkpointId = checkpoint.id;

    if (!threadId || !checkpointId) {
      throw new Error('Thread ID and Checkpoint ID are required');
    }

    const checkpointKey = `${this.keyPrefix}${threadId}:${checkpointId}`;
    const threadKey = `${this.keyPrefix}thread:${threadId}:checkpoints`;

    // Create enhanced checkpoint
    const enhancedCheckpoint: EnhancedCheckpoint = {
      ...checkpoint,
      metadata: {
        ...metadata,
        threadId,
        timestamp: new Date().toISOString(),
      } as EnhancedCheckpointMetadata,
      size: JSON.stringify(checkpoint).length,
    };

    const checkpointData = {
      checkpoint: enhancedCheckpoint,
      metadata: enhancedCheckpoint.metadata,
    };

    // Use Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline();

    // Store checkpoint data with TTL
    pipeline.setex(checkpointKey, this.ttl, JSON.stringify(checkpointData));

    // Add to sorted set for chronological ordering (score is timestamp)
    pipeline.zadd(threadKey, Date.now(), checkpointId);

    // Set TTL on thread index
    pipeline.expire(threadKey, this.ttl);

    await pipeline.exec();
  }

  /**
   * Get checkpoint from Redis
   */
  async get(config: any): Promise<Checkpoint | null> {
    const threadId = config.configurable?.thread_id;
    const checkpointId = config.configurable?.checkpoint_id;

    if (!threadId) {
      throw new Error('Thread ID is required');
    }

    let targetCheckpointId = checkpointId;

    // If no specific checkpoint ID, get the latest
    if (!targetCheckpointId) {
      const threadKey = `${this.keyPrefix}thread:${threadId}:checkpoints`;
      const latest = await this.redis.zrevrange(threadKey, 0, 0);

      if (latest.length === 0) {
        return null;
      }

      targetCheckpointId = latest[0];
    }

    const checkpointKey = `${this.keyPrefix}${threadId}:${targetCheckpointId}`;
    const data = await this.redis.get(checkpointKey);

    if (!data) {
      return null;
    }

    try {
      const parsed = JSON.parse(data);
      return parsed.checkpoint;
    } catch (error) {
      throw new Error(`Failed to parse checkpoint data: ${error.message}`);
    }
  }

  /**
   * List checkpoints for a thread
   */
  async list(
    config: any,
    options?: ListCheckpointsOptions
  ): Promise<EnhancedCheckpointTuple[]> {
    const threadId = config.configurable?.thread_id;

    if (!threadId) {
      throw new Error('Thread ID is required');
    }

    const threadKey = `${this.keyPrefix}thread:${threadId}:checkpoints`;
    const limit = options?.limit || 10;
    const offset = options?.offset || 0;

    // Get checkpoint IDs in reverse chronological order
    const checkpointIds = await this.redis.zrevrange(
      threadKey,
      offset,
      offset + limit - 1
    );

    const results: EnhancedCheckpointTuple[] = [];

    // Use pipeline to fetch all checkpoints efficiently
    const pipeline = this.redis.pipeline();
    const checkpointKeys: string[] = [];

    for (const checkpointId of checkpointIds) {
      const checkpointKey = `${this.keyPrefix}${threadId}:${checkpointId}`;
      checkpointKeys.push(checkpointKey);
      pipeline.get(checkpointKey);
    }

    const pipelineResults = await pipeline.exec();

    for (let i = 0; i < pipelineResults.length; i++) {
      const [error, data] = pipelineResults[i];

      if (error || !data) {
        continue;
      }

      try {
        const parsed = JSON.parse(data as string);
        const checkpointId = checkpointIds[i];

        results.push([
          {
            configurable: { thread_id: threadId, checkpoint_id: checkpointId },
          },
          parsed.checkpoint,
          parsed.metadata,
        ]);
      } catch (parseError) {
        // Skip corrupted data
        continue;
      }
    }

    return results;
  }

  /**
   * Get checkpoint statistics
   */
  async getStats(): Promise<CheckpointStats> {
    const pipeline = this.redis.pipeline();

    // Get all checkpoint keys
    pipeline.keys(`${this.keyPrefix}*:*`);
    // Get all thread keys
    pipeline.keys(`${this.keyPrefix}thread:*:checkpoints`);

    const [checkpointKeysResult, threadKeysResult] = await pipeline.exec();

    const checkpointKeys = (checkpointKeysResult[1] as string[]) || [];
    const threadKeys = (threadKeysResult[1] as string[]) || [];

    const totalCheckpoints = checkpointKeys.length;
    const activeThreads = threadKeys.length;

    // Calculate storage usage (approximate)
    let totalSize = 0;
    if (checkpointKeys.length > 0) {
      // Sample a few checkpoints to estimate average size
      const sampleSize = Math.min(10, checkpointKeys.length);
      const sampleKeys = checkpointKeys.slice(0, sampleSize);

      const samplePipeline = this.redis.pipeline();
      for (const key of sampleKeys) {
        samplePipeline.strlen(key);
      }

      const sampleResults = await samplePipeline.exec();
      const sampleTotalSize = sampleResults.reduce(
        (sum, [, size]) => sum + ((size as number) || 0),
        0
      );
      const averageSize = sampleTotalSize / sampleSize;
      totalSize = averageSize * totalCheckpoints;
    }

    // Count recent checkpoints (last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let recentCheckpoints = 0;

    for (const threadKey of threadKeys) {
      const recentCount = await this.redis.zcount(
        threadKey,
        oneHourAgo,
        '+inf'
      );
      recentCheckpoints += recentCount;
    }

    return {
      totalCheckpoints,
      activeThreads,
      averageSize: totalCheckpoints > 0 ? totalSize / totalCheckpoints : 0,
      totalStorageUsed: totalSize,
      recentCheckpoints,
      averageSaveTime: 5, // Redis operations are typically fast
      averageLoadTime: 3,
      errorRate: 0, // Would need to track this separately
      storageType: 'redis',
      lastCleanup: new Date(),
    };
  }

  /**
   * Cleanup old checkpoints
   */
  async cleanup(options: CheckpointCleanupOptions = {}): Promise<number> {
    let cleanedCount = 0;

    // Get all thread keys
    const threadKeys = await this.redis.keys(
      `${this.keyPrefix}thread:*:checkpoints`
    );

    for (const threadKey of threadKeys) {
      const threadId = this.extractThreadIdFromKey(threadKey);

      if (options.excludeThreads?.includes(threadId)) {
        continue;
      }

      // Clean up by age
      if (options.maxAge) {
        const cutoffTime = Date.now() - options.maxAge;
        const oldCheckpointIds = await this.redis.zrangebyscore(
          threadKey,
          '-inf',
          cutoffTime
        );

        for (const checkpointId of oldCheckpointIds) {
          const checkpointKey = `${this.keyPrefix}${threadId}:${checkpointId}`;

          // Remove from both the checkpoint data and the thread index
          const pipeline = this.redis.pipeline();
          pipeline.del(checkpointKey);
          pipeline.zrem(threadKey, checkpointId);
          await pipeline.exec();

          cleanedCount++;

          if (options.onDelete) {
            options.onDelete(checkpointId, threadId);
          }
        }
      }

      // Clean up by max per thread
      if (options.maxPerThread) {
        const totalCheckpoints = await this.redis.zcard(threadKey);

        if (totalCheckpoints > options.maxPerThread) {
          // Get oldest checkpoints to remove
          const toRemoveCount = totalCheckpoints - options.maxPerThread;
          const oldestCheckpointIds = await this.redis.zrange(
            threadKey,
            0,
            toRemoveCount - 1
          );

          for (const checkpointId of oldestCheckpointIds) {
            const checkpointKey = `${this.keyPrefix}${threadId}:${checkpointId}`;

            // Remove from both the checkpoint data and the thread index
            const pipeline = this.redis.pipeline();
            pipeline.del(checkpointKey);
            pipeline.zrem(threadKey, checkpointId);
            await pipeline.exec();

            cleanedCount++;

            if (options.onDelete) {
              options.onDelete(checkpointId, threadId);
            }
          }
        }
      }

      // Clean up empty thread indexes
      const remainingCount = await this.redis.zcard(threadKey);
      if (remainingCount === 0) {
        await this.redis.del(threadKey);
      }
    }

    return cleanedCount;
  }

  /**
   * Health check for Redis storage
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get storage information
   */
  async getStorageInfo(): Promise<{
    type: string;
    version?: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    details?: Record<string, any>;
  }> {
    try {
      const info = await this.redis.info('server');
      const isHealthy = await this.healthCheck();

      // Parse Redis version from info
      const versionMatch = info.match(/redis_version:([^\r\n]+)/);
      const version = versionMatch ? versionMatch[1] : undefined;

      return {
        type: 'redis',
        version,
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          host: this.config.host,
          port: this.config.port,
          db: this.config.db,
          keyPrefix: this.keyPrefix,
          ttl: this.ttl,
        },
      };
    } catch (error) {
      return {
        type: 'redis',
        status: 'unhealthy',
        details: {
          error: error.message,
        },
      };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  /**
   * Extract thread ID from Redis thread key
   */
  private extractThreadIdFromKey(threadKey: string): string {
    // Format: langgraph:checkpoint:thread:THREAD_ID:checkpoints
    const parts = threadKey.split(':');
    return parts[parts.length - 2]; // Second to last part is the thread ID
  }
}
