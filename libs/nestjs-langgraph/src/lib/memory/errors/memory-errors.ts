/**
 * Memory-specific error classes and utilities
 */

export interface MemoryErrorContext {
  operation?: string;
  threadId?: string;
  userId?: string;
  provider?: string;
  memoryId?: string;
  batchSize?: number;
  memoryCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Base memory error class
 */
export class MemoryError extends Error {
  public readonly context?: MemoryErrorContext;
  public readonly code?: string;

  constructor(message: string, context?: MemoryErrorContext, code?: string) {
    super(message);
    this.name = 'MemoryError';
    this.context = context;
    this.code = code;
    Error.captureStackTrace(this, MemoryError);
  }
}

/**
 * Storage-related memory errors
 */
export class MemoryStorageError extends MemoryError {
  constructor(message: string, context?: MemoryErrorContext, code?: string) {
    super(message, context, code);
    this.name = 'MemoryStorageError';
  }

  /**
   * Create error for document storage issues
   */
  static documentStorage(message: string, context?: MemoryErrorContext): MemoryStorageError {
    return new MemoryStorageError(message, context, 'DOCUMENT_STORAGE_ERROR');
  }

  /**
   * Create error for document retrieval issues
   */
  static documentRetrieval(message: string, context?: MemoryErrorContext): MemoryStorageError {
    return new MemoryStorageError(message, context, 'DOCUMENT_RETRIEVAL_ERROR');
  }

  /**
   * Create error for search operation issues
   */
  static searchOperation(message: string, context?: MemoryErrorContext): MemoryStorageError {
    return new MemoryStorageError(message, context, 'SEARCH_OPERATION_ERROR');
  }
}

/**
 * Relationship/graph-related memory errors
 */
export class MemoryRelationshipError extends MemoryError {
  constructor(message: string, context?: MemoryErrorContext, code?: string) {
    super(message, context, code);
    this.name = 'MemoryRelationshipError';
  }

  /**
   * Create error for graph storage issues
   */
  static graphStorage(message: string, context?: MemoryErrorContext): MemoryRelationshipError {
    return new MemoryRelationshipError(message, context, 'GRAPH_STORAGE_ERROR');
  }

  /**
   * Create error for relationship query issues
   */
  static relationshipQuery(message: string, context?: MemoryErrorContext): MemoryRelationshipError {
    return new MemoryRelationshipError(message, context, 'RELATIONSHIP_QUERY_ERROR');
  }

  /**
   * Create error for relationship creation issues
   */
  static relationshipCreation(message: string, context?: MemoryErrorContext): MemoryRelationshipError {
    return new MemoryRelationshipError(message, context, 'RELATIONSHIP_CREATION_ERROR');
  }
}

/**
 * Embedding-related memory errors
 */
export class MemoryEmbeddingError extends MemoryError {
  constructor(message: string, context?: MemoryErrorContext, code?: string) {
    super(message, context, code);
    this.name = 'MemoryEmbeddingError';
  }
}

/**
 * Summarization-related memory errors
 */
export class MemorySummarizationError extends MemoryError {
  constructor(message: string, context?: MemoryErrorContext, code?: string) {
    super(message, context, code);
    this.name = 'MemorySummarizationError';
  }
}

/**
 * Configuration-related memory errors
 */
export class MemoryConfigurationError extends MemoryError {
  constructor(message: string, context?: MemoryErrorContext, code?: string) {
    super(message, context, code);
    this.name = 'MemoryConfigurationError';
  }
}

/**
 * Timeout-related memory errors
 */
export class MemoryTimeoutError extends MemoryError {
  constructor(message: string, context?: MemoryErrorContext, code?: string) {
    super(message, context, code);
    this.name = 'MemoryTimeoutError';
  }
}

/**
 * Utility function to wrap generic errors with memory context
 */
export function wrapMemoryError(
  error: unknown,
  context?: MemoryErrorContext,
  code?: string
): MemoryError {
  if (error instanceof MemoryError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  return new MemoryError(message, context, code);
}

/**
 * Type guard to check if error is a memory error
 */
export function isMemoryError(error: unknown): error is MemoryError {
  return error instanceof MemoryError;
}

/**
 * Extract error message with fallback
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}