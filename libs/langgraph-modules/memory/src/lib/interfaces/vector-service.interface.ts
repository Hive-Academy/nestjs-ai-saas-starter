import { Injectable } from '@nestjs/common';
import type { MemoryEntry, MemoryMetadata } from './memory.interface';

/**
 * Vector database service interface for memory storage operations
 *
 * This abstract class serves as both a contract definition and NestJS injection token
 * for vector database operations, enabling adapter pattern implementation while
 * maintaining type safety and dependency injection compatibility.
 */
@Injectable()
export abstract class IVectorService {
  /**
   * Store a single document in the vector database
   */
  abstract store(collection: string, data: VectorStoreData): Promise<string>;

  /**
   * Store multiple documents in batch
   */
  abstract storeBatch(
    collection: string,
    data: readonly VectorStoreData[]
  ): Promise<readonly string[]>;

  /**
   * Search for similar documents using vector similarity
   */
  abstract search(
    collection: string,
    query: VectorSearchQuery
  ): Promise<readonly VectorSearchResult[]>;

  /**
   * Delete documents by IDs
   */
  abstract delete(collection: string, ids: readonly string[]): Promise<void>;

  /**
   * Delete documents by filter criteria
   */
  abstract deleteByFilter(
    collection: string,
    filter: Record<string, unknown>
  ): Promise<number>;

  /**
   * Get collection statistics
   */
  abstract getStats(collection: string): Promise<VectorStats>;

  /**
   * Get documents with optional filtering
   */
  abstract getDocuments(
    collection: string,
    options?: VectorGetOptions
  ): Promise<VectorGetResult>;

  // ===================================================================
  // Memory-Specific Business Methods
  // ===================================================================
  // These methods contain ALL business logic for memory operations.
  // Application adapters (ChromaVectorAdapter) implement these methods
  // with full business logic including:
  // - UUID generation
  // - MemoryEntry creation
  // - Metadata handling
  // - Collection name management (via repository)
  //
  // Library services (MemoryStorageService) delegate to these methods.
  // ===================================================================

  /**
   * Store a single memory entry with rich metadata
   *
   * @param threadId - The conversation thread identifier
   * @param content - The memory content to store
   * @param metadata - Optional metadata for the memory entry
   * @param userId - Optional user identifier
   * @returns The created MemoryEntry with generated ID and timestamps
   *
   * @example
   * ```typescript
   * const memory = await vectorService.storeMemory(
   *   'thread-123',
   *   'User prefers dark mode',
   *   { type: 'preference', importance: 0.8 },
   *   'user-456'
   * );
   * ```
   */
  abstract storeMemory(
    threadId: string,
    content: string,
    metadata?: Partial<MemoryMetadata>,
    userId?: string
  ): Promise<MemoryEntry>;

  /**
   * Store multiple memory entries in a single batch operation
   *
   * @param threadId - The conversation thread identifier
   * @param entries - Array of memory entries to store
   * @param userId - Optional user identifier
   * @returns Array of created MemoryEntry objects
   *
   * @example
   * ```typescript
   * const memories = await vectorService.storeMemoriesBatch('thread-123', [
   *   { content: 'User likes pizza', metadata: { type: 'preference' } },
   *   { content: 'Meeting scheduled for 3pm', metadata: { type: 'fact' } }
   * ], 'user-456');
   * ```
   */
  abstract storeMemoriesBatch(
    threadId: string,
    entries: Array<{ content: string; metadata?: Partial<MemoryMetadata> }>,
    userId?: string
  ): Promise<MemoryEntry[]>;

  /**
   * Retrieve all memories for a specific conversation thread
   *
   * @param threadId - The conversation thread identifier
   * @param limit - Optional maximum number of memories to retrieve
   * @returns Array of MemoryEntry objects ordered by creation date
   *
   * @example
   * ```typescript
   * const recentMemories = await vectorService.retrieveByThread('thread-123', 10);
   * ```
   */
  abstract retrieveByThread(
    threadId: string,
    limit?: number
  ): Promise<MemoryEntry[]>;

  /**
   * Search for semantically similar memories using vector similarity
   *
   * @param query - The search query text
   * @param filter - Optional metadata filter criteria
   * @param limit - Optional maximum number of results
   * @returns Array of MemoryEntry objects ordered by relevance
   *
   * @example
   * ```typescript
   * const similar = await vectorService.searchMemoriesSimilar(
   *   'user preferences',
   *   { type: 'preference' },
   *   5
   * );
   * ```
   */
  abstract searchMemoriesSimilar(
    query: string,
    filter?: Record<string, unknown>,
    limit?: number
  ): Promise<MemoryEntry[]>;

  /**
   * Delete specific memories by their IDs
   *
   * @param memoryIds - Array of memory IDs to delete
   * @returns Number of memories successfully deleted
   *
   * @example
   * ```typescript
   * const deletedCount = await vectorService.deleteMemories(['mem-1', 'mem-2']);
   * ```
   */
  abstract deleteMemories(memoryIds: readonly string[]): Promise<number>;

  /**
   * Clear all memories for a specific conversation thread
   *
   * @param threadId - The conversation thread identifier
   * @returns Promise that resolves when all memories are cleared
   *
   * @example
   * ```typescript
   * await vectorService.clearThread('thread-123');
   * ```
   */
  abstract clearThread(threadId: string): Promise<void>;

  /**
   * Get the total count of memories for a specific thread
   *
   * @param threadId - The conversation thread identifier
   * @returns The number of memories in the thread
   *
   * @example
   * ```typescript
   * const count = await vectorService.getThreadCount('thread-123');
   * ```
   */
  abstract getThreadCount(threadId: string): Promise<number>;

  /**
   * Get comprehensive statistics about stored memories
   *
   * @returns Statistics including total count, average size, and storage usage
   *
   * @example
   * ```typescript
   * const stats = await vectorService.getVectorStats();
   * console.log(`Total memories: ${stats.totalMemories}`);
   * console.log(`Average size: ${stats.averageSize} bytes`);
   * console.log(`Storage used: ${stats.totalStorageUsed} bytes`);
   * ```
   */
  abstract getVectorStats(): Promise<{
    totalMemories: number;
    averageSize: number;
    totalStorageUsed: number;
  }>;

  /**
   * Get operational metrics for monitoring and performance analysis
   *
   * @returns Metrics including search counts, timing, and cache performance
   *
   * @example
   * ```typescript
   * const metrics = await vectorService.getOperationMetrics();
   * console.log(`Search count: ${metrics.searchCount}`);
   * console.log(`Average search time: ${metrics.averageSearchTime}ms`);
   * console.log(`Cache hit rate: ${metrics.cacheHitRate}%`);
   * ```
   */
  abstract getOperationMetrics(): Promise<{
    searchCount: number;
    averageSearchTime: number;
    summarizationCount: number;
    cacheHitRate: number;
  }>;

  /**
   * Build vector-based semantic relationships between memories
   *
   * Finds similar memories using vector similarity search and returns
   * pairs of related memory IDs with their similarity scores. This data
   * can then be used to create relationships in a graph database.
   *
   * @param maxRelationships - Maximum relationships per memory
   * @param similarityThreshold - Minimum similarity score (0-1)
   * @param countLimit - Maximum number of memories to process
   * @returns Array of memory pairs with similarity scores
   *
   * @example
   * ```typescript
   * const relationships = await vectorService.buildVectorBasedRelationships(5, 0.7, 1000);
   * // Returns: [{ fromId: 'mem1', toId: 'mem2', score: 0.85 }, ...]
   * ```
   */
  abstract buildVectorBasedRelationships(
    maxRelationships: number,
    similarityThreshold: number,
    countLimit: number
  ): Promise<
    ReadonlyArray<{
      fromMemoryId: string;
      toMemoryId: string;
      similarityScore: number;
    }>
  >;

  // ===================================================================
  // Store-Specific Business Methods (LangGraph Store Pattern)
  // ===================================================================
  // These methods contain ALL business logic for Store operations.
  // Application adapters (ChromaVectorAdapter) implement these methods
  // with full business logic delegating to LangGraphStoreRepository.
  //
  // Library services (StoreStorageService) delegate to these methods.
  // ===================================================================

  /**
   * Store an item in the LangGraph Store with vector embedding
   *
   * @param namespace - Hierarchical namespace path
   * @param key - Item key within namespace
   * @param value - Item value to store
   * @returns Promise that resolves when item is stored
   *
   * @example
   * ```typescript
   * await vectorService.putStoreItem(
   *   ['user', 'user-123', 'preferences'],
   *   'theme',
   *   { mode: 'dark', fontSize: 14 }
   * );
   * ```
   */
  abstract putStoreItem(
    namespace: string[],
    key: string,
    value: Record<string, unknown>
  ): Promise<void>;

  /**
   * Retrieve an item from the Store by namespace and key
   *
   * @param namespace - Hierarchical namespace path
   * @param key - Item key within namespace
   * @returns Store item value or null if not found
   *
   * @example
   * ```typescript
   * const preferences = await vectorService.getStoreItem(
   *   ['user', 'user-123', 'preferences'],
   *   'theme'
   * );
   * ```
   */
  abstract getStoreItem(
    namespace: string[],
    key: string
  ): Promise<Record<string, unknown> | null>;

  /**
   * Search Store items by vector similarity
   *
   * @param namespacePrefix - Namespace prefix to filter by
   * @param query - Search query text
   * @param limit - Optional maximum number of results
   * @param filter - Optional metadata filter criteria
   * @returns Array of matching store items with similarity scores
   *
   * @example
   * ```typescript
   * const results = await vectorService.searchStoreItems(
   *   ['user', 'user-123'],
   *   'dark mode preferences',
   *   5
   * );
   * ```
   */
  abstract searchStoreItems(
    namespacePrefix: string[],
    query: string,
    limit?: number,
    filter?: Record<string, unknown>
  ): Promise<
    Array<{
      namespace: string[];
      key: string;
      value: Record<string, unknown>;
      score: number;
    }>
  >;

  /**
   * List all items in a namespace
   *
   * @param namespacePrefix - Namespace prefix to filter by
   * @param limit - Optional maximum number of items
   * @param offset - Optional offset for pagination
   * @returns Array of store items in namespace
   *
   * @example
   * ```typescript
   * const items = await vectorService.listStoreItems(
   *   ['user', 'user-123'],
   *   10,
   *   0
   * );
   * ```
   */
  abstract listStoreItems(
    namespacePrefix: string[],
    limit?: number,
    offset?: number
  ): Promise<
    Array<{
      namespace: string[];
      key: string;
      value: Record<string, unknown>;
    }>
  >;

  /**
   * Delete a specific Store item
   *
   * @param namespace - Hierarchical namespace path
   * @param key - Item key to delete
   * @returns Promise that resolves when item is deleted
   *
   * @example
   * ```typescript
   * await vectorService.deleteStoreItem(
   *   ['user', 'user-123', 'preferences'],
   *   'theme'
   * );
   * ```
   */
  abstract deleteStoreItem(namespace: string[], key: string): Promise<void>;

  /**
   * Delete entire namespace and all items within
   *
   * @param namespacePrefix - Namespace prefix to delete
   * @returns Promise that resolves when namespace is deleted
   *
   * @example
   * ```typescript
   * await vectorService.deleteStoreNamespace(['user', 'user-123']);
   * // Deletes all items under ['user', 'user-123', ...]
   * ```
   */
  abstract deleteStoreNamespace(namespacePrefix: string[]): Promise<void>;

  /**
   * Get statistics for a namespace
   *
   * @param namespacePrefix - Namespace prefix to analyze
   * @returns Statistics including item count and child namespaces
   *
   * @example
   * ```typescript
   * const stats = await vectorService.getStoreNamespaceStats(['user', 'user-123']);
   * console.log(`Items: ${stats.itemCount}`);
   * console.log(`Child namespaces: ${stats.namespaces.length}`);
   * ```
   */
  abstract getStoreNamespaceStats(
    namespacePrefix: string[]
  ): Promise<{ itemCount: number; namespaces: string[][] }>;

  /**
   * Common validation method for collection names
   * Available to all implementations as template method
   */
  protected validateCollection(collection: string): void {
    if (!collection?.trim()) {
      throw new InvalidCollectionError(
        'Collection name is required and cannot be empty'
      );
    }

    if (collection.length > 100) {
      throw new InvalidCollectionError(
        'Collection name cannot exceed 100 characters'
      );
    }

    // Basic sanitization check
    if (!/^[a-zA-Z0-9_-]+$/.test(collection)) {
      throw new InvalidCollectionError(
        'Collection name can only contain alphanumeric characters, underscores, and hyphens'
      );
    }
  }

  /**
   * Common validation for document IDs
   */
  protected validateIds(ids: readonly string[]): void {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new InvalidInputError(
        'Document IDs array is required and cannot be empty'
      );
    }

    const invalidIds = ids.filter((id) => !id?.trim());
    if (invalidIds.length > 0) {
      throw new InvalidInputError('All document IDs must be non-empty strings');
    }
  }

  /**
   * Common validation for store data
   */
  protected validateStoreData(data: VectorStoreData): void {
    if (!data.document?.trim()) {
      throw new InvalidInputError(
        'Document content is required and cannot be empty'
      );
    }

    if (data.document.length > 100000) {
      throw new InvalidInputError('Document content cannot exceed 100KB');
    }

    if (data.metadata && typeof data.metadata !== 'object') {
      throw new InvalidInputError('Metadata must be a valid object');
    }

    if (data.embedding && !Array.isArray(data.embedding)) {
      throw new InvalidInputError('Embedding must be a number array');
    }
  }
}

/**
 * Data structure for storing documents in vector database
 */
export interface VectorStoreData {
  /** Optional document ID - if not provided, will be auto-generated */
  readonly id?: string;

  /** Document content/text to be embedded */
  readonly document: string;

  /** Optional metadata associated with the document */
  readonly metadata?: Record<string, unknown>;

  /** Optional pre-computed embedding vector */
  readonly embedding?: readonly number[];
}

/**
 * Query parameters for vector similarity search
 */
export interface VectorSearchQuery {
  /** Text query to search for (will be embedded automatically) */
  readonly queryText?: string;

  /** Pre-computed query embedding */
  readonly queryEmbedding?: readonly number[];

  /** Filter criteria for metadata */
  readonly filter?: Record<string, unknown>;

  /** Maximum number of results to return */
  readonly limit?: number;

  /** Minimum similarity threshold (0-1) */
  readonly minScore?: number;
}

/**
 * Search result containing document and similarity information
 */
export interface VectorSearchResult {
  /** Document ID */
  readonly id: string;

  /** Document content */
  readonly document: string;

  /** Document metadata */
  readonly metadata?: Record<string, unknown>;

  /** Distance from query (lower = more similar) */
  readonly distance?: number;

  /** Similarity score (0-1, higher = more similar) */
  readonly relevanceScore?: number;
}

/**
 * Collection statistics
 */
export interface VectorStats {
  /** Total number of documents in collection */
  readonly documentCount: number;

  /** Size of collection in bytes */
  readonly collectionSize: number;

  /** When the collection was last updated */
  readonly lastUpdated: Date;

  /** Number of dimensions in embeddings */
  readonly dimensions?: number;
}

/**
 * Options for getting documents
 */
export interface VectorGetOptions {
  /** Specific document IDs to retrieve */
  readonly ids?: readonly string[];

  /** Filter criteria for metadata */
  readonly where?: Record<string, unknown>;

  /** Maximum number of documents to return */
  readonly limit?: number;

  /** Number of documents to skip */
  readonly offset?: number;

  /** Include document content in results */
  readonly includeDocuments?: boolean;

  /** Include metadata in results */
  readonly includeMetadata?: boolean;

  /** Include embeddings in results */
  readonly includeEmbeddings?: boolean;
}

/**
 * Result from getting documents
 */
export interface VectorGetResult {
  /** Document IDs */
  readonly ids: readonly string[];

  /** Document contents (if requested) */
  readonly documents?: readonly (string | null)[];

  /** Document metadata (if requested) */
  readonly metadatas?: readonly (Record<string, unknown> | null)[];

  /** Document embeddings (if requested) */
  readonly embeddings?: readonly (readonly number[] | null)[];
}

/**
 * Error thrown when collection name is invalid
 */
export class InvalidCollectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCollectionError';
  }
}

/**
 * Error thrown when input parameters are invalid
 */
export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}

/**
 * Error thrown when vector operations fail
 */
export class VectorOperationError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VectorOperationError';
  }
}
