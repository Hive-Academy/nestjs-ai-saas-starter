/**
 * @fileoverview Vector Query Types - Configuration and parameter interfaces
 */

import type { Where, WhereDocument } from 'chromadb';
import type {
  ChromaSearchResult,
  BaseDocument,
} from '../../types/core.interface';

/**
 * Configuration for @VectorQuery decorator
 */
export interface VectorQueryConfig {
  /** Collection name to search in */
  readonly collection: string;

  /** Automatically generate embeddings for text queries */
  readonly autoEmbed?: boolean;

  /** Default number of results to return */
  readonly defaultLimit?: number;

  /** Default similarity threshold (0-1) */
  readonly similarityThreshold?: number;

  /** Default filters to apply */
  readonly defaultFilters?: Where;

  /** Cache results for repeated queries */
  readonly enableCaching?: boolean;

  /** Cache timeout in milliseconds */
  readonly cacheTimeout?: number;

  /** Include metadata in results */
  readonly includeMetadata?: boolean;

  /** Include documents in results */
  readonly includeDocuments?: boolean;

  /** Include embeddings in results */
  readonly includeEmbeddings?: boolean;

  /** Include distances in results */
  readonly includeDistances?: boolean;

  /** Transform results using a custom function */
  readonly resultTransformer?: (results: ChromaSearchResult) => any;

  /** Enable request logging */
  readonly enableLogging?: boolean;

  /** Service injection key override */
  readonly serviceKey?: string;

  /** Timeout for the query in milliseconds */
  readonly timeout?: number;

  /** Validate query parameters */
  readonly validateParams?: boolean;
}

/**
 * Runtime parameters for vector query execution
 */
export interface VectorQueryParams {
  /** Search queries (text or embedding vectors) */
  queries: string[] | number[][];

  /** Number of results to return */
  nResults?: number;

  /** Metadata filters */
  where?: Where;

  /** Document content filters */
  whereDocument?: WhereDocument;

  /** Override default includes */
  include?: Array<'metadatas' | 'documents' | 'distances' | 'embeddings'>;

  /** Additional search options */
  options?: Record<string, any>;

  /** Force cache bypass */
  bypassCache?: boolean;
}

/**
 * Typed vector search result with proper generics
 */
export interface TypedVectorSearchResult<
  TDocument extends BaseDocument = BaseDocument
> {
  /** Search results */
  results: ChromaSearchResult<TDocument['metadata']>;

  /** Query metadata */
  metadata: {
    queryTime: number;
    collection: string;
    totalResults: number;
    fromCache: boolean;
  };

  /** Transform results to documents */
  toDocuments(): TDocument[];

  /** Get results with scores */
  withScores(): Array<{ document: TDocument; score: number }>;
}

/**
 * Vector Query Error for specific error handling
 */
export class VectorQueryError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly collection: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'VectorQueryError';
  }
}
