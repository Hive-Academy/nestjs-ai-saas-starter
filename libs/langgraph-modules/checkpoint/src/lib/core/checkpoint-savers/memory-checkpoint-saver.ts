import {
  BaseCheckpointSaver,
  Checkpoint,
  CheckpointMetadata,
} from '@langchain/langgraph';
import {
  MemoryCheckpointConfig,
  EnhancedCheckpoint,
  EnhancedCheckpointMetadata,
  CheckpointStats,
  CheckpointCleanupOptions,
  EnhancedBaseCheckpointSaver,
  EnhancedCheckpointTuple,
  ListCheckpointsOptions,
} from '../../interfaces/checkpoint.interface';

/**
 * In-memory checkpoint saver with TTL and cleanup capabilities
 */
export class MemoryCheckpointSaver
  extends BaseCheckpointSaver
  implements EnhancedBaseCheckpointSaver
{
  private readonly checkpoints = new Map<string, EnhancedCheckpoint>();
  private readonly threadCheckpoints = new Map<string, Set<string>>();
  private readonly checkpointTimestamps = new Map<string, number>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private readonly config: MemoryCheckpointConfig = {}) {
    super();
    this.startCleanupTimer();
  }

  /**
   * Save checkpoint to memory
   */
  async put(
    config: { configurable: { thread_id: string } },
    checkpoint: Checkpoint,
    metadata?: CheckpointMetadata
  ): Promise<void> {
    const threadId = config.configurable?.thread_id;
    const checkpointId = checkpoint.id;

    if (!threadId || !checkpointId) {
      throw new Error('Thread ID and Checkpoint ID are required');
    }

    const key = this.getCheckpointKey(threadId, checkpointId);
    const now = Date.now();

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

    // Store checkpoint
    this.checkpoints.set(key, enhancedCheckpoint);
    this.checkpointTimestamps.set(key, now);

    // Track thread checkpoints
    if (!this.threadCheckpoints.has(threadId)) {
      this.threadCheckpoints.set(threadId, new Set());
    }
    const threadCheckpointSet = this.threadCheckpoints.get(threadId);
    if (threadCheckpointSet) {
      threadCheckpointSet.add(checkpointId);
    }

    // Enforce max checkpoints per thread
    await this.enforceMaxCheckpoints(threadId);
  }

  /**
   * Get checkpoint from memory
   */
  async get(config: {
    configurable: { thread_id: string; checkpoint_id?: string };
  }): Promise<Checkpoint | null> {
    const threadId = config.configurable?.thread_id;
    const checkpointId = config.configurable?.checkpoint_id;

    if (!threadId) {
      throw new Error('Thread ID is required');
    }

    let targetCheckpointId = checkpointId;

    // If no specific checkpoint ID, get the latest
    if (!targetCheckpointId) {
      targetCheckpointId = await this.getLatestCheckpointId(threadId);
      if (!targetCheckpointId) {
        return null;
      }
    }

    const key = this.getCheckpointKey(threadId, targetCheckpointId);
    const checkpoint = this.checkpoints.get(key);

    if (!checkpoint) {
      return null;
    }

    // Check TTL
    if (this.isExpired(key)) {
      this.removeCheckpoint(key, threadId, targetCheckpointId);
      return null;
    }

    return checkpoint;
  }

  /**
   * List checkpoints for a thread
   */
  async list(
    config: { configurable: { thread_id: string } },
    options?: ListCheckpointsOptions
  ): Promise<EnhancedCheckpointTuple[]> {
    const threadId = config.configurable?.thread_id;

    if (!threadId) {
      throw new Error('Thread ID is required');
    }

    const threadCheckpointIds = this.threadCheckpoints.get(threadId);
    if (!threadCheckpointIds) {
      return [];
    }

    const results: EnhancedCheckpointTuple[] = [];

    for (const checkpointId of threadCheckpointIds) {
      const key = this.getCheckpointKey(threadId, checkpointId);
      const checkpoint = this.checkpoints.get(key);

      if (!checkpoint || this.isExpired(key)) {
        // Remove expired checkpoint
        this.removeCheckpoint(key, threadId, checkpointId);
        continue;
      }

      results.push([
        { configurable: { thread_id: threadId, checkpoint_id: checkpointId } },
        checkpoint,
        checkpoint.metadata as EnhancedCheckpointMetadata,
      ]);
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => {
      const timestampA = new Date(a[2].timestamp || 0).getTime();
      const timestampB = new Date(b[2].timestamp || 0).getTime();
      return timestampB - timestampA;
    });

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || results.length;

    return results.slice(offset, offset + limit);
  }

  /**
   * Get checkpoint statistics
   */
  async getStats(): Promise<CheckpointStats> {
    // Clean up expired checkpoints first
    await this.cleanupExpired();

    const totalCheckpoints = this.checkpoints.size;
    const activeThreads = this.threadCheckpoints.size;

    let totalSize = 0;
    for (const checkpoint of this.checkpoints.values()) {
      totalSize += checkpoint.size || 0;
    }

    const averageSize = totalCheckpoints > 0 ? totalSize / totalCheckpoints : 0;

    // Count recent checkpoints (last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let recentCheckpoints = 0;

    for (const timestamp of this.checkpointTimestamps.values()) {
      if (timestamp > oneHourAgo) {
        recentCheckpoints++;
      }
    }

    return {
      totalCheckpoints,
      activeThreads,
      averageSize,
      totalStorageUsed: totalSize,
      recentCheckpoints,
      averageSaveTime: 1, // Memory operations are very fast
      averageLoadTime: 1,
      errorRate: 0, // Memory operations rarely fail
      storageType: 'memory',
      lastCleanup: new Date(),
    };
  }

  /**
   * Cleanup old checkpoints
   */
  async cleanup(options: CheckpointCleanupOptions = {}): Promise<number> {
    let cleanedCount = 0;

    // Clean up expired checkpoints
    cleanedCount += await this.cleanupExpired();

    // Clean up by age
    if (options.maxAge) {
      const cutoffTime = Date.now() - options.maxAge;
      const keysToRemove: string[] = [];

      for (const [key, timestamp] of this.checkpointTimestamps) {
        if (timestamp < cutoffTime) {
          keysToRemove.push(key);
        }
      }

      for (const key of keysToRemove) {
        const { threadId, checkpointId } = this.parseCheckpointKey(key);
        if (!options.excludeThreads?.includes(threadId)) {
          this.removeCheckpoint(key, threadId, checkpointId);
          cleanedCount++;

          if (options.onDelete) {
            options.onDelete(checkpointId, threadId);
          }
        }
      }
    }

    // Clean up by max per thread
    if (options.maxPerThread) {
      for (const [threadId, checkpointIds] of this.threadCheckpoints) {
        if (options.excludeThreads?.includes(threadId)) {
          continue;
        }

        if (checkpointIds.size > options.maxPerThread) {
          // Get checkpoints sorted by timestamp (oldest first)
          const threadCheckpoints = Array.from(checkpointIds)
            .map((checkpointId) => ({
              checkpointId,
              key: this.getCheckpointKey(threadId, checkpointId),
              timestamp:
                this.checkpointTimestamps.get(
                  this.getCheckpointKey(threadId, checkpointId)
                ) || 0,
            }))
            .sort((a, b) => a.timestamp - b.timestamp);

          // Remove oldest checkpoints
          const toRemove = threadCheckpoints.slice(
            0,
            threadCheckpoints.length - options.maxPerThread
          );

          for (const { key, checkpointId } of toRemove) {
            this.removeCheckpoint(key, threadId, checkpointId);
            cleanedCount++;

            if (options.onDelete) {
              options.onDelete(checkpointId, threadId);
            }
          }
        }
      }
    }

    return cleanedCount;
  }

  /**
   * Health check for memory storage
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - verify we can store and retrieve
      const testKey = 'health-check-test';
      const testCheckpoint: Checkpoint = {
        id: testKey,
        channel_values: { test: true },
        version: '1.0.0',
      };

      await this.put(
        { configurable: { thread_id: 'health-check' } },
        testCheckpoint
      );

      const retrieved = await this.get({
        configurable: { thread_id: 'health-check', checkpoint_id: testKey },
      });

      // Clean up test data
      const key = this.getCheckpointKey('health-check', testKey);
      this.removeCheckpoint(key, 'health-check', testKey);

      return retrieved !== null;
    } catch {
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
    details?: Record<string, unknown>;
  }> {
    const isHealthy = await this.healthCheck();

    return {
      type: 'memory',
      version: '1.0.0',
      status: isHealthy ? 'healthy' : 'unhealthy',
      details: {
        totalCheckpoints: this.checkpoints.size,
        activeThreads: this.threadCheckpoints.size,
        memoryUsage: process.memoryUsage(),
      },
    };
  }

  /**
   * Close the memory saver and cleanup resources
   */
  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.checkpoints.clear();
    this.threadCheckpoints.clear();
    this.checkpointTimestamps.clear();
  }

  /**
   * Generate checkpoint key
   */
  private getCheckpointKey(threadId: string, checkpointId: string): string {
    return `${threadId}:${checkpointId}`;
  }

  /**
   * Parse checkpoint key
   */
  private parseCheckpointKey(key: string): {
    threadId: string;
    checkpointId: string;
  } {
    const [threadId, checkpointId] = key.split(':', 2);
    return { threadId, checkpointId };
  }

  /**
   * Get latest checkpoint ID for a thread
   */
  private async getLatestCheckpointId(
    threadId: string
  ): Promise<string | null> {
    const threadCheckpointIds = this.threadCheckpoints.get(threadId);
    if (!threadCheckpointIds || threadCheckpointIds.size === 0) {
      return null;
    }

    // Find the checkpoint with the latest timestamp
    let latestCheckpointId: string | null = null;
    let latestTimestamp = 0;

    for (const checkpointId of threadCheckpointIds) {
      const key = this.getCheckpointKey(threadId, checkpointId);
      const timestamp = this.checkpointTimestamps.get(key) || 0;

      if (timestamp > latestTimestamp) {
        latestTimestamp = timestamp;
        latestCheckpointId = checkpointId;
      }
    }

    return latestCheckpointId;
  }

  /**
   * Check if checkpoint is expired
   */
  private isExpired(key: string): boolean {
    if (!this.config.ttl) {
      return false;
    }

    const timestamp = this.checkpointTimestamps.get(key);
    if (!timestamp) {
      return true;
    }

    return Date.now() - timestamp > this.config.ttl;
  }

  /**
   * Remove checkpoint from all data structures
   */
  private removeCheckpoint(
    key: string,
    threadId: string,
    checkpointId: string
  ): void {
    this.checkpoints.delete(key);
    this.checkpointTimestamps.delete(key);

    const threadCheckpointIds = this.threadCheckpoints.get(threadId);
    if (threadCheckpointIds) {
      threadCheckpointIds.delete(checkpointId);

      // Remove thread entry if no checkpoints left
      if (threadCheckpointIds.size === 0) {
        this.threadCheckpoints.delete(threadId);
      }
    }
  }

  /**
   * Enforce maximum checkpoints per thread
   */
  private async enforceMaxCheckpoints(threadId: string): Promise<void> {
    const maxCheckpoints = this.config.maxCheckpoints || 1000;
    const threadCheckpointIds = this.threadCheckpoints.get(threadId);

    if (!threadCheckpointIds || threadCheckpointIds.size <= maxCheckpoints) {
      return;
    }

    // Get checkpoints sorted by timestamp (oldest first)
    const checkpoints = Array.from(threadCheckpointIds)
      .map((checkpointId) => ({
        checkpointId,
        key: this.getCheckpointKey(threadId, checkpointId),
        timestamp:
          this.checkpointTimestamps.get(
            this.getCheckpointKey(threadId, checkpointId)
          ) || 0,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest checkpoints
    const toRemove = checkpoints.slice(0, checkpoints.length - maxCheckpoints);

    for (const { key, checkpointId } of toRemove) {
      this.removeCheckpoint(key, threadId, checkpointId);
    }
  }

  /**
   * Clean up expired checkpoints
   */
  private async cleanupExpired(): Promise<number> {
    if (!this.config.ttl) {
      return 0;
    }

    const now = Date.now();
    const keysToRemove: string[] = [];

    for (const [key, timestamp] of this.checkpointTimestamps) {
      if (now - timestamp > this.config.ttl) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      const { threadId, checkpointId } = this.parseCheckpointKey(key);
      this.removeCheckpoint(key, threadId, checkpointId);
    }

    return keysToRemove.length;
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    const cleanupInterval = this.config.cleanupInterval || 300000; // 5 minutes

    if (cleanupInterval > 0) {
      this.cleanupInterval = setInterval(async () => {
        await this.cleanupExpired();
      }, cleanupInterval);
    }
  }
}
