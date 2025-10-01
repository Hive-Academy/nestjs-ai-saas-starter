import { Injectable, Logger } from '@nestjs/common';
import type {
  ICacheStatistics,
  CacheStatistics,
  VectorStatistics,
  HealthStatus,
  CacheEntry,
  CacheConfig,
  MutableCacheStats,
} from './cache-interfaces';

/**
 * Cache statistics service - handles hit/miss tracking and health monitoring
 * Follows Single Responsibility Principle
 */
@Injectable()
export class CacheStatisticsService implements ICacheStatistics {
  private readonly logger = new Logger(CacheStatisticsService.name);

  constructor(
    private readonly cache: Map<string, CacheEntry>,
    private readonly config: Required<CacheConfig>,
    private readonly stats: MutableCacheStats
  ) {}

  /**
   * Increment cache hits
   */
  incrementHits(): void {
    if (this.config.enableStatistics) {
      this.stats.hits++;
    }
  }

  /**
   * Increment cache misses
   */
  incrementMisses(): void {
    if (this.config.enableStatistics) {
      this.stats.misses++;
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  getStatistics(): Readonly<CacheStatistics> {
    if (!this.config.enableStatistics) {
      return {
        hits: 0,
        misses: 0,
        size: this.cache.size,
        totalSizeBytes: this.getTotalSizeBytes(),
        entries: this.cache.size,
        hitRate: 0,
        averageAccessCount: 0,
        oldestEntry: 0,
        newestEntry: 0,
      };
    }

    const totalOperations = this.stats.hits + this.stats.misses;
    const hitRate = totalOperations > 0 ? this.stats.hits / totalOperations : 0;

    const entries = Array.from(this.cache.values());
    const totalAccessCount = entries.reduce(
      (sum, entry) => sum + entry.accessCount,
      0
    );
    const averageAccessCount =
      entries.length > 0 ? totalAccessCount / entries.length : 0;

    const creationTimes = entries.map((entry) => entry.createdAt);
    const oldestEntry =
      creationTimes.length > 0 ? Math.min(...creationTimes) : 0;
    const newestEntry =
      creationTimes.length > 0 ? Math.max(...creationTimes) : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      totalSizeBytes: this.getTotalSizeBytes(),
      entries: this.cache.size,
      hitRate,
      averageAccessCount,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Get vector-specific cache statistics
   */
  getVectorStatistics(): Readonly<VectorStatistics> {
    const vectorKeys = this.getKeys().filter(
      (key) =>
        key.startsWith('chroma:vectorSearch:') ||
        key.startsWith('chroma:embedding:')
    );

    const vectorSearchKeys = vectorKeys.filter((key) =>
      key.startsWith('chroma:vectorSearch:')
    );
    const embeddingKeys = vectorKeys.filter((key) =>
      key.startsWith('chroma:embedding:')
    );

    const vectorEntries = vectorKeys
      .map((key) => this.cache.get(key))
      .filter(Boolean);
    const totalVectorCacheSize = vectorEntries.reduce(
      (sum, entry) => sum + (entry?.size || 0),
      0
    );

    // Calculate hit rate for vector operations (approximation)
    const vectorOperations = this.stats.hits + this.stats.misses;
    const vectorHitRate =
      vectorOperations > 0 ? vectorKeys.length / vectorOperations : 0;

    return {
      vectorSearches: vectorSearchKeys.length,
      embeddings: embeddingKeys.length,
      totalVectorCacheSize,
      vectorHitRate,
    };
  }

  /**
   * Get cache health status with issues analysis
   */
  getHealthStatus(): HealthStatus {
    const stats = this.getStatistics();
    const issues: string[] = [];

    // Check cache utilization
    if (stats.entries >= this.config.maxSize * 0.9) {
      issues.push(
        `Cache near capacity: ${stats.entries}/${this.config.maxSize} entries`
      );
    }

    if (stats.totalSizeBytes >= this.config.maxSizeBytes * 0.9) {
      const currentMB = (stats.totalSizeBytes / 1024 / 1024).toFixed(1);
      const maxMB = (this.config.maxSizeBytes / 1024 / 1024).toFixed(1);
      issues.push(`Cache memory near limit: ${currentMB}MB/${maxMB}MB`);
    }

    // Check hit rate
    if (stats.hitRate < 0.5 && this.stats.hits + this.stats.misses > 100) {
      issues.push(`Low cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    }

    // Determine status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (issues.length === 0) {
      status = 'healthy';
    } else if (issues.length <= 1) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      issues: Object.freeze(issues),
      statistics: stats,
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.logger.debug('Cache statistics reset');
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics(): {
    readonly hitRatePercent: number;
    readonly missRatePercent: number;
    readonly utilizationPercent: number;
    readonly memoryUtilizationPercent: number;
    readonly averageEntrySize: number;
  } {
    const stats = this.getStatistics();
    const totalOperations = this.stats.hits + this.stats.misses;

    const hitRatePercent = totalOperations > 0 ? stats.hitRate * 100 : 0;
    const missRatePercent = 100 - hitRatePercent;
    const utilizationPercent = (stats.entries / this.config.maxSize) * 100;
    const memoryUtilizationPercent =
      (stats.totalSizeBytes / this.config.maxSizeBytes) * 100;
    const averageEntrySize =
      stats.entries > 0 ? stats.totalSizeBytes / stats.entries : 0;

    return {
      hitRatePercent,
      missRatePercent,
      utilizationPercent,
      memoryUtilizationPercent,
      averageEntrySize,
    };
  }

  // =====================================================================
  // Private Methods
  // =====================================================================

  /**
   * Get all cache keys
   */
  private getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get total size of all cache entries in bytes
   */
  private getTotalSizeBytes(): number {
    return Array.from(this.cache.values()).reduce(
      (total, entry) => total + entry.size,
      0
    );
  }
}
