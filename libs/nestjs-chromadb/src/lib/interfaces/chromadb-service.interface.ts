/**
 * @fileoverview ChromaDB Service Interface - Uses Consolidated Type System
 * 
 * This interface uses the consolidated type system from types/core.interface.ts
 * All duplicate types have been removed and replaced with single source of truth
 */

import type { ChromaClient, Collection } from 'chromadb';
import type {
  BaseDocument,
  ChromaWireDocument,
  ChromaSearchOptions,
  ChromaSearchResult,
  ChromaBulkOptions,
  ChromaCollectionInfo,
  GetDocumentsOptions,
} from '../types/core.interface';

/**
 * Main ChromaDB service interface
 * Uses consolidated types with proper layering:
 * - BaseDocument for application-level operations  
 * - ChromaWireDocument for low-level ChromaDB operations
 */
export interface ChromaDBServiceInterface {
  // ========================================
  // Connection Operations
  // ========================================
  
  /**
   * Get the ChromaDB client instance
   */
  getClient(): ChromaClient;

  /**
   * Check if connection to ChromaDB is healthy
   */
  isHealthy(): Promise<boolean>;

  /**
   * Get heartbeat from ChromaDB server
   */
  heartbeat(): Promise<number>;

  /**
   * Get ChromaDB server version
   */
  version(): Promise<string>;

  /**
   * Reset the entire ChromaDB instance (use with caution)
   */
  reset(): Promise<boolean>;

  // ========================================
  // Collection Management
  // ========================================

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
  getCollection(
    name: string,
    embeddingFunction?: unknown
  ): Promise<Collection>;

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

  // ========================================
  // Document Operations (Application Level - uses BaseDocument)
  // ========================================

  /**
   * Add documents to a collection
   */
  addDocuments<T extends BaseDocument>(
    collectionName: string,
    documents: T[],
    options?: ChromaBulkOptions
  ): Promise<void>;

  /**
   * Update documents in a collection
   */
  updateDocuments<T extends BaseDocument>(
    collectionName: string,
    documents: T[],
    options?: ChromaBulkOptions
  ): Promise<void>;

  /**
   * Upsert documents in a collection
   */
  upsertDocuments<T extends BaseDocument>(
    collectionName: string,
    documents: T[],
    options?: ChromaBulkOptions
  ): Promise<void>;

  /**
   * Delete documents from a collection
   */
  deleteDocuments(
    collectionName: string,
    ids?: string[],
    where?: Record<string, any>,
    whereDocument?: Record<string, any>
  ): Promise<void>;

  /**
   * Get documents from a collection
   */
  getDocuments(
    collectionName: string,
    options?: GetDocumentsOptions
  ): Promise<any>; // Uses ChromaDB's native GetResult

  /**
   * Count documents in a collection
   */
  countDocuments(collectionName: string): Promise<number>;

  /**
   * Peek at documents in a collection
   */
  peekDocuments(collectionName: string, limit?: number): Promise<any>; // Uses ChromaDB's native GetResult

  /**
   * Search for similar documents
   */
  searchDocuments(
    collectionName: string,
    queryTexts?: string[],
    queryEmbeddings?: number[][],
    options?: ChromaSearchOptions
  ): Promise<ChromaSearchResult>;

  /**
   * Similarity search with automatic embedding generation
   */
  similaritySearch(
    collectionName: string,
    query: string,
    options?: { limit?: number; where?: Record<string, any>; whereDocument?: Record<string, any> }
  ): Promise<{
    ids: string[];
    documents: (string | null)[];
    metadatas: (Record<string, unknown> | null)[];
    distances: number[];
  }>;
}