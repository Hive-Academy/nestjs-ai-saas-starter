/**
 * @fileoverview Repository Metadata and Configuration Types
 *
 * Defines all configuration interfaces, type definitions, and metadata
 * structures for the @ChromaRepository decorator system.
 */

import type { Where, WhereDocument } from 'chromadb';
import type { BaseDocument } from '../../types/core.interface';
import type { ChromaDBService } from '../../services/chromadb.service';

// ========================================
// Configuration Interfaces
// ========================================

/**
 * Configuration for @ChromaRepository decorator
 */
export interface ChromaRepositoryConfig {
  /** Collection name to operate on */
  readonly collection: string;

  /** Auto-generate embeddings for documents */
  readonly autoEmbed?: boolean;

  /** Enable caching for read operations */
  readonly enableCaching?: boolean;

  /** Enable batch operations */
  readonly enableBatch?: boolean;

  /** Default batch size for bulk operations */
  readonly defaultBatchSize?: number;

  /** Enable validation before operations */
  readonly enableValidation?: boolean;

  /** Auto-generate timestamps */
  readonly autoTimestamp?: boolean;

  /** Auto-generate IDs if not provided */
  readonly autoGenerateIds?: boolean;

  /** Default embedding model to use */
  readonly defaultEmbeddingModel?: string;

  /** Enable soft delete (mark as deleted instead of removing) */
  readonly enableSoftDelete?: boolean;

  /** Error handling strategy */
  readonly errorHandling?: 'throw' | 'log_and_continue' | 'silent';
}

// ========================================
// Operation Options Interfaces
// ========================================

/**
 * Repository operation options
 */
export interface RepositoryOperationOptions {
  /** Skip validation for this operation */
  skipValidation?: boolean;

  /** Skip caching for this operation */
  skipCache?: boolean;

  /** Override batch size */
  batchSize?: number;

  /** Custom embedding model */
  embeddingModel?: string;

  /** Include additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Repository search options
 */
export interface RepositorySearchOptions extends RepositoryOperationOptions {
  /** Number of results to return */
  limit?: number;

  /** Similarity threshold */
  threshold?: number;

  /** Metadata filters */
  where?: Where;

  /** Document content filters */
  whereDocument?: WhereDocument;

  /** Include options */
  include?: {
    metadata?: boolean;
    documents?: boolean;
    distances?: boolean;
    embeddings?: boolean;
  };
}

// ========================================
// Result Types
// ========================================

/**
 * Repository operation result
 */
export interface RepositoryOperationResult<
  TDocument extends BaseDocument = BaseDocument
> {
  readonly success: boolean;
  readonly operationTime: number;
  readonly documentsProcessed: number;
  readonly errors?: string[];
  readonly documents?: TDocument[];
}

/**
 * Search result with similarity score
 */
export interface RepositorySearchResultWithScore<
  TDocument extends BaseDocument = BaseDocument
> {
  readonly document: TDocument;
  readonly score: number;
  readonly distance?: number;
}

// ========================================
// Repository Interface
// ========================================

/**
 * Complete repository interface that will be implemented by the decorator
 */
export interface ChromaRepository<
  TDocument extends BaseDocument = BaseDocument
> {
  // CRUD Operations
  create(
    document: Omit<TDocument, 'id'>,
    options?: RepositoryOperationOptions
  ): Promise<TDocument>;
  createMany(
    documents: Omit<TDocument, 'id'>[],
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult<TDocument>>;

  findById(
    id: string,
    options?: RepositoryOperationOptions
  ): Promise<TDocument | null>;
  findByIds(
    ids: string[],
    options?: RepositoryOperationOptions
  ): Promise<TDocument[]>;
  findAll(options?: RepositoryOperationOptions): Promise<TDocument[]>;

  update(
    id: string,
    updates: Partial<TDocument>,
    options?: RepositoryOperationOptions
  ): Promise<TDocument | null>;
  updateMany(
    updates: Array<{ id: string; data: Partial<TDocument> }>,
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult<TDocument>>;

  upsert(
    document: TDocument,
    options?: RepositoryOperationOptions
  ): Promise<TDocument>;
  upsertMany(
    documents: TDocument[],
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult<TDocument>>;

  delete(id: string, options?: RepositoryOperationOptions): Promise<boolean>;
  deleteMany(
    ids: string[],
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult>;
  deleteByFilter(
    where?: Where,
    whereDocument?: WhereDocument,
    options?: RepositoryOperationOptions
  ): Promise<RepositoryOperationResult>;

  // Search Operations
  search(
    query: string,
    options?: RepositorySearchOptions
  ): Promise<TDocument[]>;
  searchWithScores(
    query: string,
    options?: RepositorySearchOptions
  ): Promise<RepositorySearchResultWithScore<TDocument>[]>;
  searchSimilar(
    embedding: number[],
    options?: RepositorySearchOptions
  ): Promise<TDocument[]>;

  // Aggregation Operations
  count(where?: Where, whereDocument?: WhereDocument): Promise<number>;
  exists(id: string): Promise<boolean>;
  peek(limit?: number): Promise<TDocument[]>;

  // Collection Operations
  clear(): Promise<void>;
  getCollectionInfo(): Promise<{
    name: string;
    count: number;
    metadata?: Record<string, unknown>;
  }>;
}

// ========================================
// Constructor Types
// ========================================

/**
 * Type constraint for repository constructor parameters
 */
export interface RepositoryConstructor<
  TDocument extends BaseDocument = BaseDocument
> {
  new (...args: any[]): ChromaRepository<TDocument>;
}

/**
 * Type-safe repository instance interface
 */
export interface RepositoryInstance<
  TDocument extends BaseDocument = BaseDocument
> extends ChromaRepository<TDocument> {
  readonly chromaService: ChromaDBService;
}

// ========================================
// Factory Functions
// ========================================

/**
 * Type-safe repository factory function signature
 */
export type RepositoryFactory<TDocument extends BaseDocument> = (
  config: ChromaRepositoryConfig,
  chromaService: ChromaDBService
) => ChromaRepository<TDocument>;

// ========================================
// Type Guards
// ========================================

/**
 * Type guard to check if an object implements ChromaRepository interface
 */
export function isChromaRepository<TDocument extends BaseDocument>(
  obj: unknown
): obj is ChromaRepository<TDocument> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as ChromaRepository<TDocument>).create === 'function' &&
    typeof (obj as ChromaRepository<TDocument>).findById === 'function' &&
    typeof (obj as ChromaRepository<TDocument>).search === 'function' &&
    typeof (obj as ChromaRepository<TDocument>).count === 'function'
  );
}

/**
 * Type guard to check if value is ChromaDBService
 */
export function isChromaDBService(value: unknown): value is ChromaDBService {
  return (
    typeof value === 'object' &&
    value !== null &&
    'searchDocuments' in value &&
    'addDocuments' in value &&
    'getDocuments' in value &&
    typeof (value as ChromaDBService).searchDocuments === 'function' &&
    typeof (value as ChromaDBService).addDocuments === 'function' &&
    typeof (value as ChromaDBService).getDocuments === 'function'
  );
}

// ========================================
// Utility Types
// ========================================

/**
 * Extract document type from repository type
 */
export type ExtractDocumentType<T> = T extends ChromaRepository<infer TDocument>
  ? TDocument
  : never;

/**
 * Extract metadata type from document type
 */
export type ExtractMetadataType<TDocument> = TDocument extends BaseDocument<
  infer TMetadata
>
  ? TMetadata
  : never;
