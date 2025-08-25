/**
 * Typed error classes for ChromaDB operations
 */

/**
 * Base error class for all ChromaDB-related errors
 */
export abstract class ChromaDBError extends Error {
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  public abstract readonly code: string;


  constructor(
    message: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.context = context;

    // Preserve the original stack trace if available
    if (cause?.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Convert error to a serializable object
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Error thrown when ChromaDB connection fails
 */
export class ChromaDBConnectionError extends ChromaDBError {
  public readonly code = 'CHROMADB_CONNECTION_ERROR';

  constructor(
    message = 'Failed to connect to ChromaDB',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, context, cause);
  }
}

/**
 * Error thrown when a collection operation fails
 */
export class ChromaDBCollectionError extends ChromaDBError {
  public readonly code: string = 'CHROMADB_COLLECTION_ERROR';

  constructor(
    message: string,
    public readonly collectionName?: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, { ...context, collectionName }, cause);
  }
}

/**
 * Error thrown when a collection is not found
 */
export class ChromaDBCollectionNotFoundError extends ChromaDBCollectionError {
  public override readonly code = 'CHROMADB_COLLECTION_NOT_FOUND';

  constructor(
    collectionName: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(`Collection '${collectionName}' not found`, collectionName, context, cause);
  }
}

/**
 * Error thrown when document operations fail
 */
export class ChromaDBDocumentError extends ChromaDBError {
  public readonly code: string = 'CHROMADB_DOCUMENT_ERROR';

  constructor(
    message: string,
    public readonly documentId?: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, { ...context, documentId }, cause);
  }
}

/**
 * Error thrown when a document is not found
 */
export class ChromaDBDocumentNotFoundError extends ChromaDBDocumentError {
  public override readonly code = 'CHROMADB_DOCUMENT_NOT_FOUND';

  constructor(
    documentId: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(`Document '${documentId}' not found`, documentId, context, cause);
  }
}

/**
 * Error thrown when embedding operations fail
 */
export class ChromaDBEmbeddingError extends ChromaDBError {
  public readonly code: string = 'CHROMADB_EMBEDDING_ERROR';

  constructor(
    message: string,
    public readonly provider?: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, { ...context, provider }, cause);
  }
}

/**
 * Error thrown when embedding provider is not configured
 */
export class ChromaDBEmbeddingNotConfiguredError extends ChromaDBEmbeddingError {
  public override readonly code = 'CHROMADB_EMBEDDING_NOT_CONFIGURED';

  constructor(
    message = 'No embedding provider configured',
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, undefined, context, cause);
  }
}

/**
 * Error thrown when search operations fail
 */
export class ChromaDBSearchError extends ChromaDBError {
  public readonly code = 'CHROMADB_SEARCH_ERROR';

  constructor(
    message: string,
    public readonly query?: string | number[],
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, { ...context, query: typeof query === 'string' ? query : '[vector]' }, cause);
  }
}

/**
 * Error thrown when validation fails
 */
export class ChromaDBValidationError extends ChromaDBError {
  public readonly code = 'CHROMADB_VALIDATION_ERROR';

  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, { ...context, field, value }, cause);
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ChromaDBConfigurationError extends ChromaDBError {
  public readonly code = 'CHROMADB_CONFIGURATION_ERROR';

  constructor(
    message: string,
    public readonly configField?: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, { ...context, configField }, cause);
  }
}

/**
 * Error thrown when operations timeout
 */
export class ChromaDBTimeoutError extends ChromaDBError {
  public readonly code = 'CHROMADB_TIMEOUT_ERROR';

  constructor(
    message: string,
    public readonly timeoutMs?: number,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, { ...context, timeoutMs }, cause);
  }
}

/**
 * Error thrown when rate limits are exceeded
 */
export class ChromaDBRateLimitError extends ChromaDBError {
  public readonly code = 'CHROMADB_RATE_LIMIT_ERROR';

  constructor(
    message: string,
    public readonly retryAfterMs?: number,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, { ...context, retryAfterMs }, cause);
  }
}

/**
 * Type guard to check if an error is a ChromaDB error
 */
export function isChromaDBError(error: unknown): error is ChromaDBError {
  return error instanceof ChromaDBError;
}

/**
 * Type guard to check if an error is a specific ChromaDB error type
 */
export function isChromaDBErrorOfType<T extends ChromaDBError>(
  error: unknown,
  errorClass: new (...args: unknown[]) => T
): error is T {
  return error instanceof errorClass;
}

/**
 * Utility function to wrap unknown errors as ChromaDB errors
 */
export function wrapAsChromaDBError(
  error: unknown,
  defaultMessage = 'ChromaDB operation failed',
  context?: Record<string, unknown>
): ChromaDBError {
  if (isChromaDBError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // Create a concrete ChromaDBError implementation
    return new (class extends ChromaDBError {
      public readonly code = 'CHROMADB_GENERIC_ERROR';
    })(error.message || defaultMessage, context, error);
  }

  // Create a concrete ChromaDBError implementation
  return new (class extends ChromaDBError {
    public readonly code = 'CHROMADB_GENERIC_ERROR';
  })(typeof error === 'string' ? error : defaultMessage, context);
}

/**
 * Error codes enum for programmatic error handling
 */
export enum ChromaDBErrorCode {
  CONNECTION_ERROR = 'CHROMADB_CONNECTION_ERROR',
  COLLECTION_ERROR = 'CHROMADB_COLLECTION_ERROR',
  COLLECTION_NOT_FOUND = 'CHROMADB_COLLECTION_NOT_FOUND',
  DOCUMENT_ERROR = 'CHROMADB_DOCUMENT_ERROR',
  DOCUMENT_NOT_FOUND = 'CHROMADB_DOCUMENT_NOT_FOUND',
  EMBEDDING_ERROR = 'CHROMADB_EMBEDDING_ERROR',
  EMBEDDING_NOT_CONFIGURED = 'CHROMADB_EMBEDDING_NOT_CONFIGURED',
  SEARCH_ERROR = 'CHROMADB_SEARCH_ERROR',
  VALIDATION_ERROR = 'CHROMADB_VALIDATION_ERROR',
  CONFIGURATION_ERROR = 'CHROMADB_CONFIGURATION_ERROR',
  TIMEOUT_ERROR = 'CHROMADB_TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'CHROMADB_RATE_LIMIT_ERROR',
}
