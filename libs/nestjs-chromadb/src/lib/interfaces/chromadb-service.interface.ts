import type { Collection, ChromaClient, WhereDocument, Where, QueryResult, GetResult } from 'chromadb';

/**
 * ChromaDB metadata type - supports string, number, boolean, and null values
 */
export interface ChromaMetadata {
  readonly [key: string]: string | number | boolean | null;
}

/**
 * Metadata filter operators
 */
export type MetadataFilterOperator = '$eq' | '$ne' | '$gt' | '$gte' | '$lt' | '$lte' | '$in' | '$nin';

/**
 * Single metadata filter condition
 */
export interface MetadataFilterCondition<T = string | number | boolean | null> {
  readonly [K in MetadataFilterOperator]?: T | readonly T[];
}

/**
 * Metadata filter with type constraints
 */
export type MetadataFilter<TMetadata extends ChromaMetadata = ChromaMetadata> = {
  readonly [K in keyof TMetadata]?: TMetadata[K] | MetadataFilterCondition<TMetadata[K]>;
};

/**
 * Document content filter
 */
export interface DocumentFilter {
  readonly $contains?: string;
  readonly $not_contains?: string;
}

/**
 * Embedding vector representation
 */
export interface EmbeddingVector {
  readonly values: readonly number[];
  readonly dimension: number;
}

/**
 * ChromaDB query parameters with proper typing
 */
export interface ChromaQuery<TMetadata extends ChromaMetadata = ChromaMetadata> {
  readonly queryEmbeddings?: readonly EmbeddingVector[] | readonly number[][];
  readonly queryTexts?: readonly string[];
  readonly nResults?: number;
  readonly where?: MetadataFilter<TMetadata>;
  readonly whereDocument?: DocumentFilter;
  readonly include?: ReadonlyArray<'metadatas' | 'documents' | 'distances' | 'embeddings'>;
}

/**
 * Document structure for ChromaDB operations
 */
export interface ChromaDocument<TMetadata extends ChromaMetadata = ChromaMetadata> {
  readonly id: string;
  readonly document?: string;
  readonly metadata?: TMetadata;
  readonly embedding?: readonly number[];
}

/**
 * Search result structure - using ChromaDB native types with proper metadata typing
 */
export type ChromaSearchResult<TMetadata extends ChromaMetadata = ChromaMetadata> = QueryResult<TMetadata>;

/**
 * Collection information structure
 */
export interface ChromaCollectionInfo<TMetadata extends ChromaMetadata = ChromaMetadata> {
  readonly name: string;
  readonly id: string;
  readonly metadata?: TMetadata;
  readonly dimension?: number;
  readonly count?: number;
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
export interface ChromaDBServiceInterface {
  /**
   * Get the ChromaDB client instance
   */
  getClient: () => ChromaClient;

  /**
   * Check if connection to ChromaDB is healthy
   */
  isHealthy: () => Promise<boolean>;

  /**
   * Get heartbeat from ChromaDB server
   */
  heartbeat: () => Promise<number>;

  /**
   * Get ChromaDB server version
   */
  version: () => Promise<string>;

  /**
   * Reset the entire ChromaDB instance (use with caution)
   */
  reset: () => Promise<boolean>;

  /**
   * List all collections
   */
  listCollections: () => Promise<ChromaCollectionInfo[]>;

  /**
   * Create a new collection
   */
  createCollection: <TMetadata extends ChromaMetadata = ChromaMetadata>(
    name: string,
    metadata?: TMetadata,
    embeddingFunction?: unknown,
    getOrCreate?: boolean,
  ) => Promise<Collection>;

  /**
   * Get an existing collection
   */
  getCollection: (
    name: string,
    embeddingFunction?: unknown,
  ) => Promise<Collection>;

  /**
   * Delete a collection
   */
  deleteCollection: (name: string) => Promise<void>;

  /**
   * Check if a collection exists
   */
  collectionExists: (name: string) => Promise<boolean>;

  /**
   * Add documents to a collection
   */
  addDocuments: (
    collectionName: string,
    documents: ChromaDocument[],
    options?: ChromaBulkOptions,
  ) => Promise<void>;

  /**
   * Update documents in a collection
   */
  updateDocuments: (
    collectionName: string,
    documents: ChromaDocument[],
    options?: ChromaBulkOptions,
  ) => Promise<void>;

  /**
   * Upsert documents in a collection
   */
  upsertDocuments: (
    collectionName: string,
    documents: ChromaDocument[],
    options?: ChromaBulkOptions,
  ) => Promise<void>;

  /**
   * Get documents from a collection
   */
  getDocuments: (
    collectionName: string,
    ids?: string[],
    where?: Where,
    limit?: number,
    offset?: number,
    whereDocument?: WhereDocument,
    include?: string[],
  ) => Promise<GetResult<Record<string, unknown>>>;

  /**
   * Delete documents from a collection
   */
  deleteDocuments: (
    collectionName: string,
    ids?: string[],
    where?: Where,
    whereDocument?: WhereDocument,
  ) => Promise<void>;

  /**
   * Search for similar documents
   */
  searchDocuments: (
    collectionName: string,
    queryTexts?: string[],
    queryEmbeddings?: number[][],
    options?: ChromaSearchOptions,
  ) => Promise<ChromaSearchResult>;

  /**
   * Count documents in a collection
   */
  countDocuments: (collectionName: string) => Promise<number>;

  /**
   * Peek at documents in a collection
   */
  peekDocuments: (
    collectionName: string,
    limit?: number,
  ) => Promise<GetResult<Record<string, unknown>>>;

  /**
   * Get collection metadata
   */
  getCollectionMetadata: (collectionName: string) => Promise<Record<string, unknown> | null>;

  /**
   * Update collection metadata
   */
  updateCollectionMetadata: (
    collectionName: string,
    metadata: Record<string, unknown>,
  ) => Promise<void>;
}
