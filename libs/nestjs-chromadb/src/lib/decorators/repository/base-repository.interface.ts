/**
 * @fileoverview Base Repository Interface - Base class for all repository implementations
 *
 * This provides the contract that all repository classes must implement when using
 * the @ChromaRepository decorator. This fixes the decorator resolution issues.
 */

import type {
  BaseDocument,
  Where,
  WhereDocument,
} from '../../types/core.interface';

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
 * Base class that all repository implementations must extend
 *
 * This class defines the contract for repository operations and ensures
 * type safety throughout the decorator system.
 *
 * All methods throw errors by default and are implemented by the @ChromaRepository decorator at runtime.
 */
export class BaseChromaRepository<
  TDocument extends BaseDocument = BaseDocument
> {
  create(
    document: CreateDocumentInput<TDocument>,
    options?: RepositoryOperationOptions
  ): Promise<TDocument> {
    throw new Error('Method implemented by @ChromaRepository decorator');
  }

  createMany(
    documents: CreateDocumentInput<TDocument>[],
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult<TDocument>> {
    throw new Error('Method implemented by @ChromaRepository decorator');
  }

  findById(
    id: string,
    options?: RepositoryOperationOptions
  ): Promise<TDocument | null> {
    throw new Error('Method implemented by @ChromaRepository decorator');
  }

  findByIds(
    ids: string[],
    options?: RepositoryOperationOptions
  ): Promise<TDocument[]> {
    throw new Error('Method implemented by @ChromaRepository decorator');
  }

  findAll(
    options?: RepositoryOperationOptions & {
      where?: Where;
      whereDocument?: WhereDocument;
      limit?: number;
      orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
    }
  ): Promise<TDocument[]> {
    throw new Error('Method implemented by @ChromaRepository decorator');
  }

  update(
    id: string,
    updates: Partial<TDocument>,
    options?: RepositoryOperationOptions
  ): Promise<TDocument | null> {
    throw new Error('Method implemented by @ChromaRepository decorator');
  }

  updateMany(
    updates: Array<{ id: string; data: Partial<TDocument> }>,
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult<TDocument>> {
    throw new Error('Method implemented by @ChromaRepository decorator');
  }

  upsert(
    document: UpsertDocumentInput<TDocument>,
    options?: RepositoryOperationOptions
  ): Promise<TDocument> {
    throw new Error('Method implemented by @ChromaRepository decorator');
  }

  upsertMany(
    documents: UpsertDocumentInput<TDocument>[],
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult<TDocument>> {
    throw new Error('Method implemented by @ChromaRepository decorator');
  }

  delete(id: string, options?: RepositoryOperationOptions): Promise<boolean> {
    throw new Error('Method implemented by @ChromaRepository decorator');
  }

  deleteMany(
    ids: string[],
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult> {
    throw new Error('Method implemented by @ChromaRepository decorator');
  }

  deleteByFilter(
    where?: Where,
    whereDocument?: WhereDocument,
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult> {
    throw new Error('Method implemented by @ChromaRepository decorator');
  }

  search(
    query: string,
    options?: RepositorySearchOptions
  ): Promise<TDocument[]> {
    throw new Error('Method implemented by @ChromaRepository decorator');
  }

  searchWithScores(
    query: string,
    options?: RepositorySearchOptions
  ): Promise<SearchResultWithScore<TDocument>[]> {
    throw new Error('Method implemented by @ChromaRepository decorator');
  }

  searchSimilar(
    embedding: number[],
    options?: RepositorySearchOptions
  ): Promise<TDocument[]> {
    throw new Error('Method implemented by @ChromaRepository decorator');
  }

  count(where?: Where, whereDocument?: WhereDocument): Promise<number> {
    throw new Error('Method implemented by @ChromaRepository decorator');
  }

  exists(id: string): Promise<boolean> {
    throw new Error('Method implemented by @ChromaRepository decorator');
  }

  peek(limit?: number): Promise<TDocument[]> {
    throw new Error('Method implemented by @ChromaRepository decorator');
  }

  clear(): Promise<void> {
    throw new Error('Method implemented by @ChromaRepository decorator');
  }

  getCollectionInfo(): Promise<{
    name: string;
    count: number;
    metadata?: Record<string, unknown>;
  }> {
    throw new Error('Method implemented by @ChromaRepository decorator');
  }
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
export type RepositoryConstructor<
  TDocument extends BaseDocument = BaseDocument
> = new (...args: any[]) => BaseChromaRepository<TDocument>;
