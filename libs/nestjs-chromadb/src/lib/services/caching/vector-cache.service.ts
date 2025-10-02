import { Injectable, Logger } from '@nestjs/common';
import { IVectorCacheOperations, CacheConfig } from './cache-interfaces';
import { CacheOperationsService } from './cache-operations.service';
import {
  CacheKeyGeneratorService,
  TtlCalculatorService,
} from './cache-utilities.service';

/**
 * Vector-specific cache operations service - handles vector search and embedding caching
 * Follows Single Responsibility Principle
 */
@Injectable()
export class VectorCacheService implements IVectorCacheOperations {
  private readonly logger = new Logger(VectorCacheService.name);

  constructor(
    private readonly cacheOps: CacheOperationsService,
    private readonly keyGenerator: CacheKeyGeneratorService,
    private readonly ttlCalculator: TtlCalculatorService,
    private readonly config: Required<CacheConfig>
  ) {}

  /**
   * Cache vector search results with special handling for embeddings
   */
  async cacheVectorSearch(
    collectionName: string,
    queryHash: string,
    results: any,
    ttl?: number
  ): Promise<void> {
    const key = this.keyGenerator.generateVectorSearchKey(
      collectionName,
      queryHash
    );

    // Use longer TTL for vector searches as they're computationally expensive
    const vectorTtl =
      ttl ??
      this.ttlCalculator.calculateVectorSearchTtl(this.config.defaultTtl);

    await this.cacheOps.set(key, results, vectorTtl);
    this.logger.debug(`Cached vector search for collection: ${collectionName}`);
  }

  /**
   * Get cached vector search results
   */
  async getCachedVectorSearch(
    collectionName: string,
    queryHash: string
  ): Promise<any | null> {
    const key = this.keyGenerator.generateVectorSearchKey(
      collectionName,
      queryHash
    );
    const result = await this.cacheOps.get(key);

    if (result) {
      this.logger.debug(
        `Vector search cache hit for collection: ${collectionName}`
      );
    }

    return result;
  }

  /**
   * Cache embedding results
   */
  async cacheEmbedding(
    text: string,
    embedding: number[],
    ttl?: number
  ): Promise<void> {
    const key = this.keyGenerator.generateEmbeddingKey(text);

    // Embeddings rarely change, use longer TTL
    const embeddingTtl =
      ttl ?? this.ttlCalculator.calculateEmbeddingTtl(this.config.defaultTtl);

    await this.cacheOps.set(key, embedding, embeddingTtl);
    this.logger.debug(
      `Cached embedding for text hash: ${this.keyGenerator.hashString(text)}`
    );
  }

  /**
   * Get cached embedding
   */
  async getCachedEmbedding(text: string): Promise<number[] | null> {
    const key = this.keyGenerator.generateEmbeddingKey(text);
    const result = await this.cacheOps.get<number[]>(key);

    if (result) {
      this.logger.debug(
        `Embedding cache hit for text hash: ${this.keyGenerator.hashString(
          text
        )}`
      );
    }

    return result;
  }

  /**
   * Batch cache embeddings
   */
  async cacheEmbeddingBatch(
    textEmbeddingPairs: Array<{ text: string; embedding: number[] }>,
    ttl?: number
  ): Promise<void> {
    const promises = textEmbeddingPairs.map(({ text, embedding }) =>
      this.cacheEmbedding(text, embedding, ttl)
    );

    await Promise.all(promises);
    this.logger.debug(`Batch cached ${textEmbeddingPairs.length} embeddings`);
  }

  /**
   * Preload commonly used embeddings
   */
  async preloadEmbeddings(
    texts: string[],
    embeddingGenerator: (texts: string[]) => Promise<number[][]>
  ): Promise<void> {
    const uncachedTexts: string[] = [];

    // Check which texts are not cached
    for (const text of texts) {
      const cached = await this.getCachedEmbedding(text);
      if (!cached) {
        uncachedTexts.push(text);
      }
    }

    if (uncachedTexts.length === 0) {
      this.logger.debug('All embeddings already cached');
      return; // All embeddings already cached
    }

    // Generate embeddings for uncached texts
    try {
      const embeddings = await embeddingGenerator(uncachedTexts);

      // Cache the new embeddings
      const pairs = uncachedTexts.map((text, index) => ({
        text,
        embedding: embeddings[index],
      }));

      await this.cacheEmbeddingBatch(pairs);

      this.logger.log(`Preloaded ${uncachedTexts.length} embeddings`);
    } catch (error) {
      this.logger.error('Failed to preload embeddings:', error);
      throw error;
    }
  }

  /**
   * Get vector cache statistics
   */
  getVectorCacheInfo(): {
    vectorSearchCount: number;
    embeddingCount: number;
    totalVectorKeys: number;
  } {
    const keys = this.cacheOps.getKeys();

    const vectorSearchKeys = keys.filter((key) =>
      key.startsWith('chroma:vectorSearch:')
    );
    const embeddingKeys = keys.filter((key) =>
      key.startsWith('chroma:embedding:')
    );

    return {
      vectorSearchCount: vectorSearchKeys.length,
      embeddingCount: embeddingKeys.length,
      totalVectorKeys: vectorSearchKeys.length + embeddingKeys.length,
    };
  }

  /**
   * Warm up cache with frequently used embeddings
   */
  async warmupCache(
    commonTexts: string[],
    embeddingGenerator: (texts: string[]) => Promise<number[][]>
  ): Promise<{
    preloaded: number;
    skipped: number;
    errors: number;
  }> {
    let preloaded = 0;
    let skipped = 0;
    let errors = 0;

    const batchSize = 10; // Process in smaller batches to avoid overwhelming the system

    for (let i = 0; i < commonTexts.length; i += batchSize) {
      const batch = commonTexts.slice(i, i + batchSize);

      try {
        const uncached = [];
        for (const text of batch) {
          const exists = await this.getCachedEmbedding(text);
          if (!exists) {
            uncached.push(text);
          } else {
            skipped++;
          }
        }

        if (uncached.length > 0) {
          const embeddings = await embeddingGenerator(uncached);
          const pairs = uncached.map((text, idx) => ({
            text,
            embedding: embeddings[idx],
          }));

          await this.cacheEmbeddingBatch(pairs);
          preloaded += uncached.length;
        }
      } catch (error) {
        this.logger.error(
          `Failed to warm up batch starting at index ${i}:`,
          error
        );
        errors += batch.length;
      }
    }

    this.logger.log(
      `Cache warmup completed: ${preloaded} preloaded, ${skipped} skipped, ${errors} errors`
    );

    return { preloaded, skipped, errors };
  }

  /**
   * Clear all vector-related cache entries
   */
  async clearVectorCache(): Promise<number> {
    const vectorKeys = this.cacheOps
      .getKeys()
      .filter(
        (key) =>
          key.startsWith('chroma:vectorSearch:') ||
          key.startsWith('chroma:embedding:')
      );

    let deleted = 0;
    for (const key of vectorKeys) {
      const success = await this.cacheOps.delete(key);
      if (success) deleted++;
    }

    this.logger.debug(`Cleared ${deleted} vector cache entries`);
    return deleted;
  }
}
