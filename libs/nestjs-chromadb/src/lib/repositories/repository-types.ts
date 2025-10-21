/**
 * @fileoverview Repository Type Definitions
 *
 * Type definitions for ChromaDB repository operations.
 * These types provide type-safe interfaces for CRUD operations,
 * search options, and operation results.
 *
 * @since 1.0.0
 */

import type { ChromaDBRepository } from './chromadb-repository';
import type {
  BaseDocument,
  Where,
  WhereDocument,
} from '../types/core.interface';

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
export interface RepositoryOperationResult<
  TDocument extends BaseDocument = BaseDocument
> {
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
 * Input type for document creation (omits auto-generated fields and methods)
 * Only includes data properties from the document type
 */
export type CreateDocumentInput<TDocument extends BaseDocument> = {
  content: string;
  metadata: TDocument extends BaseDocument<infer TMetadata> ? TMetadata : never;
  embedding?: readonly number[];
  id?: string;
} & Partial<Omit<TDocument, 'id' | 'content' | 'metadata' | 'embedding'>>;

/**
 * Input type for upsert operations (requires id field)
 */
export type UpsertDocumentInput<TDocument extends BaseDocument> =
  CreateDocumentInput<TDocument> & {
    id: string;
  };

/**
 * Search result with similarity score
 */
export interface SearchResultWithScore<
  TDocument extends BaseDocument = BaseDocument
> {
  /** The document */
  document: TDocument;
  /** Similarity score (0-1, higher is more similar) */
  score: number;
  /** Distance metric (lower is more similar) */
  distance?: number;
}

/**
 * Type guard to check if an object implements the ChromaDBRepository interface
 */
export function isBaseChromaRepository<T extends BaseDocument>(
  obj: unknown
): obj is ChromaDBRepository<T> {
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
export type RepositoryConstructor<
  TDocument extends BaseDocument = BaseDocument
> = new (...args: any[]) => ChromaDBRepository<TDocument>;
