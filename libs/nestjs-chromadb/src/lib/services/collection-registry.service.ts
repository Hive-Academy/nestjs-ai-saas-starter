/**
 * @fileoverview CollectionRegistryService - Singleton Collection Initialization Tracker
 *
 * Purpose: Prevents duplicate collection initialization across multiple repository instances
 * Pattern: Singleton with promise caching for thread-safe initialization
 *
 * Features:
 * - Idempotent collection creation (safe for server restarts)
 * - Promise caching prevents race conditions
 * - Graceful degradation on failures
 * - Observable via logging
 * - Testable (cache can be cleared)
 *
 * @author backend-developer
 * @since 1.0.0 - Automatic collection initialization implementation
 */

import { Injectable, Logger } from '@nestjs/common';
import type { CollectionMetadata } from 'chromadb';
import { ChromaDBCollectionService } from './core/chromadb-collection.service';

/**
 * Singleton service to track and manage collection initialization
 *
 * Prevents duplicate collection creation across multiple repository instances.
 * Uses promise caching to ensure each collection is initialized exactly once
 * per application lifecycle, even with concurrent requests.
 *
 * Design Pattern: Singleton + Promise Caching
 *
 * @example
 * ```typescript
 * // In repository constructor
 * constructor(
 *   chromaDB: ChromaDBService,
 *   collectionRegistry: CollectionRegistryService
 * ) {
 *   super(Entity, 'collection-name', chromaDB, collectionRegistry);
 *   // Collection automatically initialized in background
 * }
 * ```
 */
@Injectable()
export class CollectionRegistryService {
  private readonly logger = new Logger(CollectionRegistryService.name);

  /**
   * Track initialized collections (collection name -> initialization promise)
   * Using Map for O(1) lookup performance
   * Promises cached to prevent concurrent duplicate initializations
   */
  private readonly initializationCache = new Map<string, Promise<void>>();

  /**
   * Track initialization statistics for observability
   */
  private readonly stats = {
    totalInitializations: 0,
    successfulInitializations: 0,
    failedInitializations: 0,
  };

  constructor(private readonly collectionService: ChromaDBCollectionService) {}

  /**
   * Ensure a collection exists (idempotent, singleton initialization)
   *
   * Thread-safe: Multiple concurrent calls for the same collection will share
   * the same initialization promise, preventing duplicate operations.
   *
   * Idempotent: Safe to call multiple times - uses getOrCreate internally.
   *
   * @param collectionName - Name of the collection to initialize
   * @param metadata - Optional collection metadata from entity decorator
   * @returns Promise that resolves when collection is guaranteed to exist
   *
   * @example
   * ```typescript
   * await registry.ensureCollectionExists('users', {
   *   source: 'entity-decorator',
   *   entityName: 'UserEntity'
   * });
   * ```
   */
  async ensureCollectionExists(
    collectionName: string,
    metadata?: CollectionMetadata
  ): Promise<void> {
    // Check if already initialized or in progress
    const existing = this.initializationCache.get(collectionName);
    if (existing) {
      this.logger.debug(
        `Collection '${collectionName}' already initialized or in progress - reusing existing promise`
      );
      return existing; // Reuse existing initialization promise
    }

    // Create new initialization promise
    const initPromise = this.initializeCollection(collectionName, metadata);

    // Cache the promise BEFORE awaiting to prevent race conditions
    this.initializationCache.set(collectionName, initPromise);

    this.stats.totalInitializations++;

    return initPromise;
  }

  /**
   * Internal: Perform actual collection initialization
   *
   * Uses getOrCreate to make this operation idempotent.
   * Failures are logged but don't prevent application startup.
   *
   * @param collectionName - Name of the collection
   * @param metadata - Optional metadata
   */
  private async initializeCollection(
    collectionName: string,
    metadata?: CollectionMetadata
  ): Promise<void> {
    try {
      this.logger.debug(
        `🔄 Initializing collection: ${collectionName}${
          metadata ? ` (metadata: ${JSON.stringify(metadata)})` : ''
        }`
      );

      // Use getOrCreate to make this idempotent (safe for server restarts)
      await this.collectionService.createCollection(
        collectionName,
        metadata || { source: 'auto-initialization' },
        undefined,
        true // getOrCreate = true
      );

      this.stats.successfulInitializations++;
      this.logger.log(`✅ Collection ready: ${collectionName}`);
    } catch (error) {
      // Remove from cache on failure to allow retry on next operation
      this.initializationCache.delete(collectionName);

      this.stats.failedInitializations++;

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.warn(
        `⚠️ Failed to initialize collection '${collectionName}': ${errorMessage}. ` +
          `Collection will be created lazily on first write operation.`
      );

      // Don't throw - graceful degradation
      // Collection will be created automatically on first write
    }
  }

  /**
   * Check if a collection has been initialized
   *
   * @param collectionName - Name of the collection
   * @returns true if collection initialization was attempted
   */
  isInitialized(collectionName: string): boolean {
    return this.initializationCache.has(collectionName);
  }

  /**
   * Get initialization statistics
   *
   * @returns Object with initialization metrics
   *
   * @example
   * ```typescript
   * const stats = registry.getStats();
   * console.log(`Initialized ${stats.successfulInitializations}/${stats.totalInitializations} collections`);
   * ```
   */
  getStats(): {
    totalInitializations: number;
    successfulInitializations: number;
    failedInitializations: number;
    cachedCollections: number;
  } {
    return {
      ...this.stats,
      cachedCollections: this.initializationCache.size,
    };
  }

  /**
   * Get list of initialized collection names
   *
   * @returns Array of collection names that have been initialized
   */
  getInitializedCollections(): string[] {
    return Array.from(this.initializationCache.keys());
  }

  /**
   * Clear initialization cache
   *
   * Useful for testing or hot-reloading scenarios.
   * In production, you typically don't need to call this.
   *
   * @example
   * ```typescript
   * // In tests
   * afterEach(() => {
   *   collectionRegistry.clearCache();
   * });
   * ```
   */
  clearCache(): void {
    this.initializationCache.clear();
    this.logger.debug('Collection initialization cache cleared');
  }
}
