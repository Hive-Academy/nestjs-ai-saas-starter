import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  MemoryEntry,
  MemoryRetentionPolicy,
} from '../interfaces/memory.interface';

/**
 * Specialized service for memory retention policies and cleanup operations
 *
 * Responsibilities:
 * - Memory retention policy enforcement
 * - Cleanup scheduling and execution
 * - Eviction strategy implementation (LRU, LFU, FIFO, importance-based)
 * - Memory lifecycle management
 * - Storage optimization and pruning
 * - Automatic cleanup scheduling
 *
 * This service implements configurable retention policies that can be
 * reused across different memory storage implementations and contexts.
 */
@Injectable()
export class MemoryRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MemoryRetentionService.name);
  private cleanupInterval?: NodeJS.Timeout;
  private cleanupStats = {
    lastCleanupTime: new Date(),
    totalCleanupsRun: 0,
    totalMemoriesRemoved: 0,
    averageCleanupTime: 0,
  };

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.startCleanupScheduler();
    this.logger.log(
      'Memory retention service initialized with cleanup scheduling'
    );
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.logger.log('Memory retention service cleanup scheduler stopped');
    }
  }

  /**
   * Execute cleanup based on retention policies
   *
   * @param getAllMemories Function to retrieve all memories for evaluation
   * @param deleteMemories Function to delete memories by IDs
   * @returns Number of memories cleaned up
   */
  async executeCleanup(
    getAllMemories: () => Promise<MemoryEntry[]>,
    deleteMemories: (memoryIds: string[]) => Promise<number>
  ): Promise<number> {
    const startTime = Date.now();
    let totalCleaned = 0;

    try {
      this.logger.debug('Starting memory cleanup execution');

      // Get current retention policy
      const policy = this.getRetentionPolicy();

      // Get all memories for evaluation
      const allMemories = await getAllMemories();

      if (allMemories.length === 0) {
        this.logger.debug('No memories found for cleanup');
        return 0;
      }

      this.logger.debug(
        `Evaluating ${allMemories.length} memories for cleanup`
      );

      // Apply different cleanup strategies
      let memoriesToDelete: MemoryEntry[] = [];

      // 1. Age-based cleanup
      if (policy.maxAge && policy.maxAge > 0) {
        const ageBasedCandidates = this.identifyAgedMemories(
          allMemories,
          policy.maxAge
        );
        memoriesToDelete = [...memoriesToDelete, ...ageBasedCandidates];
        this.logger.debug(
          `Found ${ageBasedCandidates.length} aged memories for cleanup`
        );
      }

      // 2. Per-thread limit cleanup
      if (policy.maxPerThread && policy.maxPerThread > 0) {
        const threadBasedCandidates = this.identifyExcessThreadMemories(
          allMemories,
          policy.maxPerThread,
          policy.evictionStrategy || 'lru'
        );
        memoriesToDelete = [...memoriesToDelete, ...threadBasedCandidates];
        this.logger.debug(
          `Found ${threadBasedCandidates.length} excess per-thread memories for cleanup`
        );
      }

      // 3. Total limit cleanup
      if (
        policy.maxTotal &&
        policy.maxTotal > 0 &&
        allMemories.length > policy.maxTotal
      ) {
        const totalBasedCandidates = this.identifyExcessTotalMemories(
          allMemories,
          policy.maxTotal,
          policy.evictionStrategy || 'lru'
        );
        memoriesToDelete = [...memoriesToDelete, ...totalBasedCandidates];
        this.logger.debug(
          `Found ${totalBasedCandidates.length} excess total memories for cleanup`
        );
      }

      // Remove duplicates and persistent memories
      const uniqueMemoriesToDelete =
        this.deduplicateAndFilterPersistent(memoriesToDelete);

      if (uniqueMemoriesToDelete.length > 0) {
        const memoryIds = uniqueMemoriesToDelete.map((m) => m.id);
        totalCleaned = await deleteMemories(memoryIds);

        this.logger.log(`Memory cleanup removed ${totalCleaned} memories`);
      }

      // Update cleanup statistics
      const cleanupTime = Date.now() - startTime;
      this.updateCleanupStats(totalCleaned, cleanupTime);

      return totalCleaned;
    } catch (error) {
      this.logger.error('Memory cleanup execution failed', error);
      throw error;
    }
  }

  /**
   * Preview what cleanup would remove without actually deleting
   */
  async previewCleanup(getAllMemories: () => Promise<MemoryEntry[]>): Promise<{
    totalMemories: number;
    memoriesToDelete: number;
    breakdown: {
      aged: number;
      perThreadExcess: number;
      totalExcess: number;
    };
    estimatedSpaceSaved: number;
  }> {
    try {
      const policy = this.getRetentionPolicy();
      const allMemories = await getAllMemories();

      let memoriesToDelete: MemoryEntry[] = [];
      const breakdown = { aged: 0, perThreadExcess: 0, totalExcess: 0 };

      // Age-based analysis
      if (policy.maxAge && policy.maxAge > 0) {
        const ageBasedCandidates = this.identifyAgedMemories(
          allMemories,
          policy.maxAge
        );
        memoriesToDelete = [...memoriesToDelete, ...ageBasedCandidates];
        breakdown.aged = ageBasedCandidates.length;
      }

      // Per-thread analysis
      if (policy.maxPerThread && policy.maxPerThread > 0) {
        const threadBasedCandidates = this.identifyExcessThreadMemories(
          allMemories,
          policy.maxPerThread,
          policy.evictionStrategy || 'lru'
        );
        memoriesToDelete = [...memoriesToDelete, ...threadBasedCandidates];
        breakdown.perThreadExcess = threadBasedCandidates.length;
      }

      // Total limit analysis
      if (
        policy.maxTotal &&
        policy.maxTotal > 0 &&
        allMemories.length > policy.maxTotal
      ) {
        const totalBasedCandidates = this.identifyExcessTotalMemories(
          allMemories,
          policy.maxTotal,
          policy.evictionStrategy || 'lru'
        );
        memoriesToDelete = [...memoriesToDelete, ...totalBasedCandidates];
        breakdown.totalExcess = totalBasedCandidates.length;
      }

      const uniqueMemoriesToDelete =
        this.deduplicateAndFilterPersistent(memoriesToDelete);

      // Estimate space saved (rough calculation based on average content length)
      const averageContentLength =
        allMemories.reduce((sum, m) => sum + m.content.length, 0) /
        allMemories.length;
      const estimatedSpaceSaved =
        uniqueMemoriesToDelete.length * averageContentLength * 2; // Factor in metadata

      return {
        totalMemories: allMemories.length,
        memoriesToDelete: uniqueMemoriesToDelete.length,
        breakdown,
        estimatedSpaceSaved,
      };
    } catch (error) {
      this.logger.error('Memory cleanup preview failed', error);
      throw error;
    }
  }

  /**
   * Apply eviction strategy to sort memories for deletion
   */
  applyEvictionStrategy(
    memories: MemoryEntry[],
    count: number,
    strategy: string
  ): MemoryEntry[] {
    if (memories.length <= count) {
      return [];
    }

    const sortedMemories = this.sortMemoriesForEviction(
      [...memories],
      strategy
    );
    return sortedMemories.slice(count); // Return excess memories beyond the limit
  }

  /**
   * Get current retention policy from configuration
   */
  getRetentionPolicy(): MemoryRetentionPolicy {
    return {
      maxAge: this.configService.get<number>('memory.retention.maxAge'),
      maxPerThread: this.configService.get<number>(
        'memory.retention.maxPerThread'
      ),
      maxTotal: this.configService.get<number>('memory.retention.maxTotal'),
      cleanupInterval: this.configService.get<number>(
        'memory.retention.cleanupInterval',
        3600000
      ), // 1 hour
      evictionStrategy: this.configService.get<
        'lru' | 'lfu' | 'fifo' | 'importance'
      >('memory.retention.evictionStrategy', 'lru'),
    };
  }

  /**
   * Get cleanup statistics
   */
  getCleanupStats(): {
    lastCleanupTime: Date;
    totalCleanupsRun: number;
    totalMemoriesRemoved: number;
    averageCleanupTime: number;
  } {
    return { ...this.cleanupStats };
  }

  /**
   * Identify memories that exceed age limits
   */
  private identifyAgedMemories(
    memories: MemoryEntry[],
    maxAge: number
  ): MemoryEntry[] {
    const cutoffTime = Date.now() - maxAge;
    return memories.filter(
      (memory) =>
        memory.createdAt.getTime() < cutoffTime && !memory.metadata.persistent
    );
  }

  /**
   * Identify excess memories per thread
   */
  private identifyExcessThreadMemories(
    memories: MemoryEntry[],
    maxPerThread: number,
    strategy: string
  ): MemoryEntry[] {
    const memoriesByThread = new Map<string, MemoryEntry[]>();

    // Group memories by thread
    for (const memory of memories) {
      if (!memoriesByThread.has(memory.threadId)) {
        memoriesByThread.set(memory.threadId, []);
      }
      memoriesByThread.get(memory.threadId)!.push(memory);
    }

    const excessMemories: MemoryEntry[] = [];

    // Find excess memories for each thread
    for (const [_threadId, threadMemories] of memoriesByThread.entries()) {
      if (threadMemories.length > maxPerThread) {
        const sorted = this.sortMemoriesForEviction(threadMemories, strategy);
        const excess = sorted.slice(maxPerThread);
        excessMemories.push(...excess);
      }
    }

    return excessMemories;
  }

  /**
   * Identify excess memories across all threads
   */
  private identifyExcessTotalMemories(
    memories: MemoryEntry[],
    maxTotal: number,
    strategy: string
  ): MemoryEntry[] {
    if (memories.length <= maxTotal) {
      return [];
    }

    const sorted = this.sortMemoriesForEviction(memories, strategy);
    return sorted.slice(maxTotal);
  }

  /**
   * Sort memories for eviction based on strategy
   */
  private sortMemoriesForEviction(
    memories: MemoryEntry[],
    strategy: string
  ): MemoryEntry[] {
    const sorted = [...memories];

    switch (strategy) {
      case 'lru': // Least Recently Used
        return sorted.sort((a, b) => {
          const aTime = a.lastAccessedAt?.getTime() ?? a.createdAt.getTime();
          const bTime = b.lastAccessedAt?.getTime() ?? b.createdAt.getTime();
          return aTime - bTime;
        });

      case 'lfu': // Least Frequently Used
        return sorted.sort((a, b) => a.accessCount - b.accessCount);

      case 'fifo': // First In, First Out
        return sorted.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
        );

      case 'importance': // Lowest importance first
        return sorted.sort(
          (a, b) => (a.metadata.importance ?? 0) - (b.metadata.importance ?? 0)
        );

      default:
        this.logger.warn(`Unknown eviction strategy: ${strategy}, using LRU`);
        return this.sortMemoriesForEviction(memories, 'lru');
    }
  }

  /**
   * Remove duplicates and filter out persistent memories
   */
  private deduplicateAndFilterPersistent(
    memories: MemoryEntry[]
  ): MemoryEntry[] {
    const seen = new Set<string>();
    const filtered: MemoryEntry[] = [];

    for (const memory of memories) {
      if (!seen.has(memory.id) && !memory.metadata.persistent) {
        seen.add(memory.id);
        filtered.push(memory);
      }
    }

    return filtered;
  }

  /**
   * Start cleanup scheduler
   */
  private startCleanupScheduler(): void {
    const policy = this.getRetentionPolicy();
    const interval = policy.cleanupInterval;

    if (interval && interval > 0) {
      this.cleanupInterval = setInterval(async () => {
        try {
          this.logger.debug('Scheduled cleanup triggered');
          // Note: This would need to be injected with actual cleanup functions
          // For now, it's a placeholder that logs the attempt
          this.logger.debug(
            'Scheduled cleanup requires cleanup functions - skipping'
          );
        } catch (error) {
          this.logger.error('Scheduled memory cleanup failed:', error);
        }
      }, interval);

      this.logger.log(
        `Memory cleanup scheduler started (interval: ${interval}ms)`
      );
    }
  }

  /**
   * Update cleanup statistics
   */
  private updateCleanupStats(cleaned: number, cleanupTime: number): void {
    this.cleanupStats.lastCleanupTime = new Date();
    this.cleanupStats.totalCleanupsRun++;
    this.cleanupStats.totalMemoriesRemoved += cleaned;

    // Calculate moving average cleanup time
    const prevAvg = this.cleanupStats.averageCleanupTime;
    const count = this.cleanupStats.totalCleanupsRun;
    this.cleanupStats.averageCleanupTime =
      (prevAvg * (count - 1) + cleanupTime) / count;
  }
}
