import { Injectable } from '@nestjs/common';

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
