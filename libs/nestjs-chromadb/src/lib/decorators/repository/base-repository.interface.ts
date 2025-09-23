/**
 * @fileoverview Base Repository Interface - Abstract class for all repository implementations
 *
 * This provides the contract that all repository classes must implement when using
 * the @ChromaRepository decorator. This fixes the decorator resolution issues.
 */

import type { Where, WhereDocument } from 'chromadb';
import type { BaseDocument } from '../../types/document-types.interface';

/**
 * Repository operation options for fine-grained control
 */
export interface RepositoryOperationOptions {
  /** Include embeddings in the response */
  includeEmbeddings?: boolean;
  /** Include metadata in the response */
  includeMetadata?: boolean;
  /** Include document content in the response */
  includeDocuments?: boolean;
  /** Custom metadata to add to the operation */
  metadata?: Record<string, unknown>;
  /** Timeout for the operation in milliseconds */
  timeout?: number;
}

/**
 * Search-specific options extending base operation options
 */
export interface RepositorySearchOptions extends RepositoryOperationOptions {
  /** Number of results to return */
  limit?: number;
  /** Minimum similarity score threshold */
  minScore?: number;
  /** Where clause for metadata filtering */
  where?: Where;
  /** Where clause for document content filtering */
  whereDocument?: WhereDocument;
}

/**
 * Result wrapper for bulk operations
 */
export interface RepositoryOperationResult<TDocument extends BaseDocument = BaseDocument> {
  /** Successfully processed documents */
  success: TDocument[];
  /** Failed operations with error details */
  errors: Array<{
    document?: Partial<TDocument>;
    error: string;
    index: number;
  }>;
  /** Total number of documents processed */
  total: number;
  /** Number of successful operations */
  successCount: number;
  /** Number of failed operations */
  errorCount: number;
}

/**
 * Input type for document creation (omits auto-generated fields)
 */
export type CreateDocumentInput<TDocument extends BaseDocument> = Omit<TDocument, 'id'> & {
  id?: string; // Optional ID for manual specification
};

/**
 * Search result with similarity score
 */
export interface SearchResultWithScore<TDocument extends BaseDocument = BaseDocument> {
  /** The document */
  document: TDocument;
  /** Similarity score (0-1, higher is more similar) */
  score: number;
  /** Distance metric (lower is more similar) */
  distance?: number;
}

/**
 * Abstract base class that all repository implementations must extend
 *
 * This class defines the contract for repository operations and ensures
 * type safety throughout the decorator system.
 */
export abstract class BaseChromaRepository<TDocument extends BaseDocument = BaseDocument> {
  // =====================================================================
  // CRUD OPERATIONS
  // =====================================================================

  /**
   * Create a single document in the collection
   */
  abstract create(
    document: CreateDocumentInput<TDocument>,
    options?: RepositoryOperationOptions
  ): Promise<TDocument>;

  /**
   * Create multiple documents in the collection
   */
  abstract createMany(
    documents: CreateDocumentInput<TDocument>[],
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult<TDocument>>;

  /**
   * Find a document by its ID
   */
  abstract findById(
    id: string,
    options?: RepositoryOperationOptions
  ): Promise<TDocument | null>;

  /**
   * Find multiple documents by their IDs
   */
  abstract findByIds(
    ids: string[],
    options?: RepositoryOperationOptions
  ): Promise<TDocument[]>;

  /**
   * Find all documents in the collection
   */
  abstract findAll(
    options?: RepositoryOperationOptions
  ): Promise<TDocument[]>;

  /**
   * Update a document by ID
   */
  abstract update(
    id: string,
    updates: Partial<TDocument>,
    options?: RepositoryOperationOptions
  ): Promise<TDocument | null>;

  /**
   * Update multiple documents
   */
  abstract updateMany(
    updates: Array<{ id: string; data: Partial<TDocument> }>,
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult<TDocument>>;

  /**
   * Create or update a document (upsert operation)
   */
  abstract upsert(
    document: TDocument,
    options?: RepositoryOperationOptions
  ): Promise<TDocument>;

  /**
   * Create or update multiple documents
   */
  abstract upsertMany(
    documents: TDocument[],
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult<TDocument>>;

  /**
   * Delete a document by ID
   */
  abstract delete(
    id: string,
    options?: RepositoryOperationOptions
  ): Promise<boolean>;

  /**
   * Delete multiple documents by IDs
   */
  abstract deleteMany(
    ids: string[],
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult>;

  /**
   * Delete documents matching filter criteria
   */
  abstract deleteByFilter(
    where?: Where,
    whereDocument?: WhereDocument,
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult>;

  // =====================================================================
  // SEARCH OPERATIONS
  // =====================================================================

  /**
   * Search documents using text query
   */
  abstract search(
    query: string,
    options?: RepositorySearchOptions
  ): Promise<TDocument[]>;

  /**
   * Search documents with similarity scores
   */
  abstract searchWithScores(
    query: string,
    options?: RepositorySearchOptions
  ): Promise<SearchResultWithScore<TDocument>[]>;

  /**
   * Search using embedding vectors directly
   */
  abstract searchSimilar(
    embedding: number[],
    options?: RepositorySearchOptions
  ): Promise<TDocument[]>;

  // =====================================================================
  // AGGREGATION OPERATIONS
  // =====================================================================

  /**
   * Count documents matching criteria
   */
  abstract count(
    where?: Where,
    whereDocument?: WhereDocument
  ): Promise<number>;

  /**
   * Check if a document exists by ID
   */
  abstract exists(id: string): Promise<boolean>;

  /**
   * Peek at a sample of documents
   */
  abstract peek(limit?: number): Promise<TDocument[]>;

  // =====================================================================
  // COLLECTION OPERATIONS
  // =====================================================================

  /**
   * Clear all documents from the collection
   */
  abstract clear(): Promise<void>;

  /**
   * Get collection information and statistics
   */
  abstract getCollectionInfo(): Promise<{
    name: string;
    count: number;
    metadata?: Record<string, unknown>;
  }>;
}

/**
 * Type guard to check if an object implements the BaseChromaRepository interface
 */
export function isBaseChromaRepository<T extends BaseDocument>(
  obj: unknown
): obj is BaseChromaRepository<T> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).create === 'function' &&
    typeof (obj as any).findById === 'function' &&
    typeof (obj as any).search === 'function'
  );
}

/**
 * Constructor type for repository classes
 */
export type RepositoryConstructor<TDocument extends BaseDocument = BaseDocument> = new (
  ...args: any[]
) => BaseChromaRepository<TDocument>;
