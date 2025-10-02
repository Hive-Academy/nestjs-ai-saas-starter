/**
 * Collection-focused service interface following Interface Segregation Principle
 * Clients needing only collection management operations
 */

import type { Collection } from 'chromadb';
import type { ChromaCollectionInfo } from '../../types/documents/result-types.type';

/**
 * ChromaDB collection service interface - focused only on collection operations
 */
export interface ChromaDBCollectionServiceInterface {
  /**
   * List all collections
   */
  listCollections(): Promise<ChromaCollectionInfo[]>;

  /**
   * Create a new collection
   */
  createCollection(
    name: string,
    metadata?: Record<string, any>,
    embeddingFunction?: unknown,
    getOrCreate?: boolean
  ): Promise<Collection>;

  /**
   * Get an existing collection
   */
  getCollection(name: string, embeddingFunction?: unknown): Promise<Collection>;

  /**
   * Delete a collection
   */
  deleteCollection(name: string): Promise<void>;

  /**
   * Check if a collection exists
   */
  collectionExists(name: string): Promise<boolean>;

  /**
   * Get collection metadata
   */
  getCollectionMetadata(name: string): Promise<Record<string, any> | null>;

  /**
   * Update collection metadata
   */
  updateCollectionMetadata(
    name: string,
    metadata: Record<string, any>
  ): Promise<void>;
}
