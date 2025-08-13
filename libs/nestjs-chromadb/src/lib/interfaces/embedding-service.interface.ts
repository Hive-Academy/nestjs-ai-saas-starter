/**
 * Represents a numeric vector embedding
 */
export type EmbeddingVector = readonly number[];

/**
 * Represents embedding metadata constraints
 */
export interface EmbeddingMetadata {
  readonly dimension: number;
  readonly model: string;
  readonly provider: string;
}

/**
 * Generic interface for embedding service implementations
 */
export interface EmbeddingServiceInterface<TVector extends EmbeddingVector = EmbeddingVector> {
  /**
   * Check if the embedding service is properly configured
   */
  isConfigured: () => boolean;

  /**
   * Generate embeddings for multiple texts
   */
  embed: (texts: readonly string[]) => Promise<readonly TVector[]>;

  /**
   * Generate embedding for a single text
   */
  embedSingle: (text: string) => Promise<TVector>;

  /**
   * Get the dimension of embeddings produced
   */
  getDimension: () => number;

  /**
   * Get the model name being used
   */
  getModel: () => string;

  /**
   * Get embedding metadata
   */
  getMetadata?: () => EmbeddingMetadata;
}

/**
 * Document structure for embedding operations with type constraints
 */
export interface EmbeddableDocument<TVector extends EmbeddingVector = EmbeddingVector> {
  readonly document?: string;
  readonly embedding?: TVector;
  readonly [key: string]: unknown;
}

/**
 * Options for embedding operations with type constraints
 */
export interface EmbeddingOperationOptions<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly field?: keyof T;
  readonly target?: keyof T;
  readonly includeEmbedding?: boolean;
  readonly batchSize?: number;
  readonly maxRetries?: number;
}

/**
 * Result of an embedding operation
 */
export interface EmbeddingResult<TVector extends EmbeddingVector = EmbeddingVector> {
  readonly success: boolean;
  readonly embedding?: TVector;
  readonly error?: string;
  readonly metadata?: EmbeddingMetadata;
}

/**
 * Batch embedding request
 */
export interface BatchEmbeddingRequest {
  readonly texts: readonly string[];
  readonly ids?: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

/**
 * Batch embedding response
 */
export interface BatchEmbeddingResponse<TVector extends EmbeddingVector = EmbeddingVector> {
  readonly embeddings: readonly TVector[];
  readonly ids?: readonly string[];
  readonly metadata?: EmbeddingMetadata;
  readonly errors?: readonly string[];
}
