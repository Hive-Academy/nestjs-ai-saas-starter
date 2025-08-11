import { Collection, ChromaClient, WhereDocument, Where, QueryResult, GetResult } from 'chromadb';

/**
 * Document structure for ChromaDB operations
 */
export interface ChromaDocument {
  id: string;
  document?: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

/**
 * Search result structure - using ChromaDB native types
 */
export type ChromaSearchResult = QueryResult<Record<string, any>>;

/**
 * Collection information structure
 */
export interface ChromaCollectionInfo {
  name: string;
  id: string;
  metadata?: Record<string, any>;
  dimension?: number;
  count?: number;
}

/**
 * Search options for querying collections
 */
export interface ChromaSearchOptions {
  nResults?: number;
  whereDocument?: WhereDocument;
  where?: Where;
  includeMetadata?: boolean;
  includeDocuments?: boolean;
  includeDistances?: boolean;
  includeEmbeddings?: boolean;
}

/**
 * Bulk operation options
 */
export interface ChromaBulkOptions {
  batchSize?: number;
  upsert?: boolean;
  validateIds?: boolean;
}

/**
 * ChromaDB service interface defining core operations
 */
export interface IChromaDBService {
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
    embeddingFunction?: any,
    getOrCreate?: boolean,
  ): Promise<Collection>;

  /**
   * Get an existing collection
   */
  getCollection(
    name: string,
    embeddingFunction?: any,
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
   * Add documents to a collection
   */
  addDocuments(
    collectionName: string,
    documents: ChromaDocument[],
    options?: ChromaBulkOptions,
  ): Promise<void>;

  /**
   * Update documents in a collection
   */
  updateDocuments(
    collectionName: string,
    documents: ChromaDocument[],
    options?: ChromaBulkOptions,
  ): Promise<void>;

  /**
   * Upsert documents in a collection
   */
  upsertDocuments(
    collectionName: string,
    documents: ChromaDocument[],
    options?: ChromaBulkOptions,
  ): Promise<void>;

  /**
   * Get documents from a collection
   */
  getDocuments(
    collectionName: string,
    ids?: string[],
    where?: Where,
    limit?: number,
    offset?: number,
    whereDocument?: WhereDocument,
    include?: string[],
  ): Promise<GetResult<Record<string, any>>>;

  /**
   * Delete documents from a collection
   */
  deleteDocuments(
    collectionName: string,
    ids?: string[],
    where?: Where,
    whereDocument?: WhereDocument,
  ): Promise<void>;

  /**
   * Search for similar documents
   */
  searchDocuments(
    collectionName: string,
    queryTexts?: string[],
    queryEmbeddings?: number[][],
    options?: ChromaSearchOptions,
  ): Promise<ChromaSearchResult>;

  /**
   * Count documents in a collection
   */
  countDocuments(collectionName: string): Promise<number>;

  /**
   * Peek at documents in a collection
   */
  peekDocuments(
    collectionName: string,
    limit?: number,
  ): Promise<GetResult<Record<string, any>>>;

  /**
   * Get collection metadata
   */
  getCollectionMetadata(collectionName: string): Promise<Record<string, any> | null>;

  /**
   * Update collection metadata
   */
  updateCollectionMetadata(
    collectionName: string,
    metadata: Record<string, any>,
  ): Promise<void>;
}