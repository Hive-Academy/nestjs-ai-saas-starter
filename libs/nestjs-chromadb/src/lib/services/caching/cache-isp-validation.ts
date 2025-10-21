/**
 * Interface Segregation Principle Validation
 *
 * This file demonstrates that the cache services now properly follow ISP
 * by showing how clients can depend only on the interfaces they need.
 */

import type {
  ICacheOperations,
  ICacheStatistics,
  ICacheCleanup,
  IVectorCacheOperations,
  ICacheKeyGenerator,
  ITtlCalculator,
} from './cache-interfaces';

/**
 * Example client that only needs basic cache operations
 * It doesn't need to depend on statistics, cleanup, or vector operations
 */
class BasicCacheClient {
  constructor(private readonly cache: ICacheOperations) {}

  async storeUserSession(userId: string, sessionData: any): Promise<void> {
    await this.cache.set(`session:${userId}`, sessionData, 3600000); // 1 hour
  }

  async getUserSession(userId: string): Promise<any | null> {
    return await this.cache.get(`session:${userId}`);
  }

  async endUserSession(userId: string): Promise<boolean> {
    return await this.cache.delete(`session:${userId}`);
  }
}

/**
 * Example client that only needs statistics
 * It doesn't need cache operations, cleanup, or vector operations
 */
class CacheMonitoringClient {
  constructor(private readonly stats: ICacheStatistics) {}

  async getCacheHealthReport(): Promise<{
    hitRate: number;
    status: string;
    recommendations: string[];
  }> {
    const health = this.stats.getHealthStatus();
    const statistics = this.stats.getStatistics();

    const recommendations: string[] = [];
    if (statistics.hitRate < 0.7) {
      recommendations.push(
        'Consider tuning TTL values for better cache efficiency'
      );
    }
    if (health.issues.length > 0) {
      recommendations.push('Address cache capacity or configuration issues');
    }

    return {
      hitRate: statistics.hitRate,
      status: health.status,
      recommendations,
    };
  }
}

/**
 * Example client that only needs cleanup operations
 * It doesn't need basic operations, statistics, or vector operations
 */
class CacheMaintenanceClient {
  constructor(private readonly cleanup: ICacheCleanup) {}

  async performScheduledMaintenance(): Promise<{
    expiredRemoved: number;
    patternsCleared: number;
  }> {
    const expiredRemoved = await this.cleanup.evictExpired();

    // Clear old temporary data
    const tempCleared = await this.cleanup.deletePattern(/^temp:/);
    const debugCleared = await this.cleanup.deletePattern(/^debug:/);

    return {
      expiredRemoved,
      patternsCleared: tempCleared + debugCleared,
    };
  }
}

/**
 * Example client that only needs vector operations
 * It doesn't need basic operations, statistics, or cleanup
 */
class AIModelClient {
  constructor(private readonly vectorCache: IVectorCacheOperations) {}

  async getOrCreateEmbedding(
    text: string,
    embeddingFunction: (text: string) => Promise<number[]>
  ): Promise<number[]> {
    // Try to get cached embedding first
    const cached = await this.vectorCache.getCachedEmbedding(text);
    if (cached) {
      return cached;
    }

    // Generate and cache new embedding
    const embedding = await embeddingFunction(text);
    await this.vectorCache.cacheEmbedding(text, embedding);
    return embedding;
  }

  async performVectorSearch(
    collection: string,
    queryText: string,
    searchFunction: (query: string) => Promise<any>
  ): Promise<any> {
    const queryHash = Buffer.from(queryText).toString('base64');

    // Try cached results first
    const cached = await this.vectorCache.getCachedVectorSearch(
      collection,
      queryHash
    );
    if (cached) {
      return cached;
    }

    // Perform and cache search
    const results = await searchFunction(queryText);
    await this.vectorCache.cacheVectorSearch(collection, queryHash, results);
    return results;
  }
}

/**
 * Example client that only needs utility operations
 * It doesn't need any of the main cache functionality
 */
class CacheUtilityClient {
  constructor(
    private readonly keyGen: ICacheKeyGenerator,
    private readonly ttlCalc: ITtlCalculator
  ) {}

  generateOptimizedCacheKey(
    operation: string,
    params: Record<string, any>
  ): string {
    const paramStr = JSON.stringify(params, Object.keys(params).sort());
    const hash = this.keyGen.hashString(paramStr);
    return this.keyGen.generateOperationKey(operation) + hash;
  }

  calculateOptimalTtl(
    dataType: 'embedding' | 'vectorSearch' | 'standard'
  ): number {
    const baseTtl = this.ttlCalc.calculateDefaultTtl();

    switch (dataType) {
      case 'embedding':
        return this.ttlCalc.calculateEmbeddingTtl(baseTtl);
      case 'vectorSearch':
        return this.ttlCalc.calculateVectorSearchTtl(baseTtl);
      default:
        return baseTtl;
    }
  }
}

/**
 * Demonstration of ISP compliance:
 *
 * ✅ Each client depends only on the interface it needs
 * ✅ No client is forced to depend on methods it doesn't use
 * ✅ Interfaces are focused and cohesive
 * ✅ Changes to one interface don't affect unrelated clients
 * ✅ Easy to test each client in isolation with mocks
 *
 * This is a stark contrast to the original 686 LOC monolithic service
 * where every client had to depend on all functionality.
 */

export {
  BasicCacheClient,
  CacheMonitoringClient,
  CacheMaintenanceClient,
  AIModelClient,
  CacheUtilityClient,
};
