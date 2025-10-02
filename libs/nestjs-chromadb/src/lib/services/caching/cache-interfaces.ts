/**
 * Cache operation interfaces following Interface Segregation Principle
 * Each interface represents a focused set of related operations
 */

/**
 * Core cache operations interface
 */
export interface ICacheOperations {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): boolean;
  refreshTtl(key: string, ttl?: number): Promise<boolean>;
}

/**
 * Cache statistics interface with mutable internals
 */
export interface ICacheStatistics {
  incrementHits(): void;
  incrementMisses(): void;
  getStatistics(): Readonly<CacheStatistics>;
  getVectorStatistics(): Readonly<VectorStatistics>;
  getHealthStatus(): HealthStatus;
}

/**
 * Cache cleanup and eviction interface
 */
export interface ICacheCleanup {
  deletePattern(pattern: string | RegExp): Promise<number>;
  evictExpired(): Promise<number>;
  invalidateCollection(collectionName: string): Promise<number>;
  invalidateByOperation(operation: string): Promise<number>;
}

/**
 * Vector-specific cache operations interface
 */
export interface IVectorCacheOperations {
  cacheVectorSearch(
    collectionName: string,
    queryHash: string,
    results: any,
    ttl?: number
  ): Promise<void>;
  getCachedVectorSearch(
    collectionName: string,
    queryHash: string
  ): Promise<any | null>;
  cacheEmbedding(
    text: string,
    embedding: number[],
    ttl?: number
  ): Promise<void>;
  getCachedEmbedding(text: string): Promise<number[] | null>;
  cacheEmbeddingBatch(
    textEmbeddingPairs: Array<{ text: string; embedding: number[] }>,
    ttl?: number
  ): Promise<void>;
  preloadEmbeddings(
    texts: string[],
    embeddingGenerator: (texts: string[]) => Promise<number[][]>
  ): Promise<void>;
}

/**
 * Cache statistics data structure (immutable)
 */
export interface CacheStatistics {
  readonly hits: number;
  readonly misses: number;
  readonly size: number;
  readonly totalSizeBytes: number;
  readonly entries: number;
  readonly hitRate: number;
  readonly averageAccessCount: number;
  readonly oldestEntry: number;
  readonly newestEntry: number;
}

/**
 * Vector-specific statistics (immutable)
 */
export interface VectorStatistics {
  readonly vectorSearches: number;
  readonly embeddings: number;
  readonly totalVectorCacheSize: number;
  readonly vectorHitRate: number;
}

/**
 * Health status interface
 */
export interface HealthStatus {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly issues: readonly string[];
  readonly statistics: CacheStatistics;
}

/**
 * Mutable internal cache statistics (for implementation)
 */
export interface MutableCacheStats {
  hits: number;
  misses: number;
}

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  maxSize?: number;
  maxSizeBytes?: number;
  defaultTtl?: number;
  cleanupInterval?: number;
  enableLRU?: boolean;
  enableStatistics?: boolean;
}

/**
 * Cache key generation utilities
 */
export interface ICacheKeyGenerator {
  generateVectorSearchKey(collectionName: string, queryHash: string): string;
  generateEmbeddingKey(text: string): string;
  generateOperationKey(operation: string): string;
  generateCollectionKey(collectionName: string): string;
  hashString(str: string): string;
}

/**
 * TTL calculation utilities
 */
export interface ITtlCalculator {
  calculateDefaultTtl(): number;
  calculateVectorSearchTtl(defaultTtl: number): number;
  calculateEmbeddingTtl(defaultTtl: number): number;
  isExpired(expiresAt: number): boolean;
}
