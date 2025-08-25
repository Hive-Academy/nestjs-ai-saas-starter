/**
 * Memory-specific error classes that wrap underlying service errors
 * Provides clear context and diagnostic information for memory operations
 */

/**
 * Context information for memory errors
 */
export interface MemoryErrorContext {
  operation: string;
  threadId?: string;
  memoryId?: string;
  service: 'chromadb' | 'neo4j' | 'embedding' | 'summarization';
  timestamp: Date;
  additionalInfo?: Record<string, unknown>;
}

/**
 * Base class for all memory-related errors
 */
export abstract class MemoryError extends Error {
  public readonly context: MemoryErrorContext;
  public override readonly cause?: Error;

  constructor(message: string, context: MemoryErrorContext, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
    this.cause = cause;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get a detailed error message with context
   */
  public getDetailedMessage(): string {
    const contextStr = [
      `Operation: ${this.context.operation}`,
      this.context.threadId ? `Thread: ${this.context.threadId}` : null,
      this.context.memoryId ? `Memory: ${this.context.memoryId}` : null,
      `Service: ${this.context.service}`,
      `Time: ${this.context.timestamp.toISOString()}`,
    ]
      .filter(Boolean)
      .join(', ');

    const causeStr = this.cause ? `\nCaused by: ${this.cause.message}` : '';

    return `${this.message} (${contextStr})${causeStr}`;
  }

  /**
   * Convert error to JSON for logging
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      cause: this.cause
        ? {
            name: this.cause.name,
            message: this.cause.message,
            stack: this.cause.stack,
          }
        : undefined,
      stack: this.stack,
    };
  }
}

/**
 * Error for ChromaDB storage operations
 */
export class MemoryStorageError extends MemoryError {
  constructor(
    message: string,
    context: Omit<MemoryErrorContext, 'service'>,
    cause?: Error
  ) {
    super(message, { ...context, service: 'chromadb' }, cause);
  }

  /**
   * Create error for document storage failures
   */
  static documentStorage(
    operation: string,
    threadId: string,
    cause: Error
  ): MemoryStorageError {
    return new MemoryStorageError(
      'Failed to store memory document in vector database',
      {
        operation,
        threadId,
        timestamp: new Date(),
        additionalInfo: { errorType: 'document_storage' },
      },
      cause
    );
  }

  /**
   * Create error for document retrieval failures
   */
  static documentRetrieval(
    operation: string,
    threadId: string,
    cause: Error
  ): MemoryStorageError {
    return new MemoryStorageError(
      'Failed to retrieve memory documents from vector database',
      {
        operation,
        threadId,
        timestamp: new Date(),
        additionalInfo: { errorType: 'document_retrieval' },
      },
      cause
    );
  }

  /**
   * Create error for search operation failures
   */
  static searchOperation(
    operation: string,
    query: string,
    cause: Error
  ): MemoryStorageError {
    return new MemoryStorageError(
      'Failed to perform semantic search in vector database',
      {
        operation,
        timestamp: new Date(),
        additionalInfo: { errorType: 'search_operation', query },
      },
      cause
    );
  }

  /**
   * Create error for collection management failures
   */
  static collectionManagement(
    operation: string,
    collectionName: string,
    cause: Error
  ): MemoryStorageError {
    return new MemoryStorageError(
      'Failed to manage vector database collection',
      {
        operation,
        timestamp: new Date(),
        additionalInfo: { errorType: 'collection_management', collectionName },
      },
      cause
    );
  }
}

/**
 * Error for Neo4j relationship operations
 */
export class MemoryRelationshipError extends MemoryError {
  constructor(
    message: string,
    context: Omit<MemoryErrorContext, 'service'>,
    cause?: Error
  ) {
    super(message, { ...context, service: 'neo4j' }, cause);
  }

  /**
   * Create error for graph storage failures
   */
  static graphStorage(
    operation: string,
    threadId: string,
    memoryId: string,
    cause: Error
  ): MemoryRelationshipError {
    return new MemoryRelationshipError(
      'Failed to store memory relationships in graph database',
      {
        operation,
        threadId,
        memoryId,
        timestamp: new Date(),
        additionalInfo: { errorType: 'graph_storage' },
      },
      cause
    );
  }

  /**
   * Create error for relationship query failures
   */
  static relationshipQuery(
    operation: string,
    threadId: string,
    cause: Error
  ): MemoryRelationshipError {
    return new MemoryRelationshipError(
      'Failed to query memory relationships in graph database',
      {
        operation,
        threadId,
        timestamp: new Date(),
        additionalInfo: { errorType: 'relationship_query' },
      },
      cause
    );
  }

  /**
   * Create error for schema initialization failures
   */
  static schemaInitialization(
    operation: string,
    cause: Error
  ): MemoryRelationshipError {
    return new MemoryRelationshipError(
      'Failed to initialize graph database schema',
      {
        operation,
        timestamp: new Date(),
        additionalInfo: { errorType: 'schema_initialization' },
      },
      cause
    );
  }

  /**
   * Create error for transaction failures
   */
  static transactionFailure(
    operation: string,
    threadId: string,
    cause: Error
  ): MemoryRelationshipError {
    return new MemoryRelationshipError(
      'Graph database transaction failed',
      {
        operation,
        threadId,
        timestamp: new Date(),
        additionalInfo: { errorType: 'transaction_failure' },
      },
      cause
    );
  }
}

/**
 * Error for embedding operations
 */
export class MemoryEmbeddingError extends MemoryError {
  constructor(
    message: string,
    context: Omit<MemoryErrorContext, 'service'>,
    cause?: Error
  ) {
    super(message, { ...context, service: 'embedding' }, cause);
  }

  /**
   * Create error for embedding generation failures
   */
  static embeddingGeneration(
    operation: string,
    textCount: number,
    cause: Error
  ): MemoryEmbeddingError {
    return new MemoryEmbeddingError(
      'Failed to generate embeddings for memory content',
      {
        operation,
        timestamp: new Date(),
        additionalInfo: { errorType: 'embedding_generation', textCount },
      },
      cause
    );
  }

  /**
   * Create error for embedding provider configuration failures
   */
  static providerConfiguration(
    operation: string,
    provider: string,
    cause: Error
  ): MemoryEmbeddingError {
    return new MemoryEmbeddingError(
      'Embedding provider configuration error',
      {
        operation,
        timestamp: new Date(),
        additionalInfo: { errorType: 'provider_configuration', provider },
      },
      cause
    );
  }

  /**
   * Create error for embedding API failures
   */
  static apiFailure(
    operation: string,
    provider: string,
    cause: Error
  ): MemoryEmbeddingError {
    return new MemoryEmbeddingError(
      'Embedding API request failed',
      {
        operation,
        timestamp: new Date(),
        additionalInfo: { errorType: 'api_failure', provider },
      },
      cause
    );
  }
}

/**
 * Error for summarization operations
 */
export class MemorySummarizationError extends MemoryError {
  constructor(
    message: string,
    context: Omit<MemoryErrorContext, 'service'>,
    cause?: Error
  ) {
    super(message, { ...context, service: 'summarization' }, cause);
  }

  /**
   * Create error for LLM API failures
   */
  static llmApiFailure(
    operation: string,
    provider: string,
    threadId: string,
    cause: Error
  ): MemorySummarizationError {
    return new MemorySummarizationError(
      'LLM API request failed during summarization',
      {
        operation,
        threadId,
        timestamp: new Date(),
        additionalInfo: { errorType: 'llm_api_failure', provider },
      },
      cause
    );
  }

  /**
   * Create error for summarization strategy failures
   */
  static strategyFailure(
    operation: string,
    strategy: string,
    threadId: string,
    cause: Error
  ): MemorySummarizationError {
    return new MemorySummarizationError(
      'Summarization strategy execution failed',
      {
        operation,
        threadId,
        timestamp: new Date(),
        additionalInfo: { errorType: 'strategy_failure', strategy },
      },
      cause
    );
  }

  /**
   * Create error for configuration issues
   */
  static configurationError(
    operation: string,
    issue: string
  ): MemorySummarizationError {
    return new MemorySummarizationError('Summarization configuration error', {
      operation,
      timestamp: new Date(),
      additionalInfo: { errorType: 'configuration_error', issue },
    });
  }
}

/**
 * Error for memory configuration issues
 */
export class MemoryConfigurationError extends MemoryError {
  constructor(
    message: string,
    context: Omit<MemoryErrorContext, 'service'>,
    cause?: Error
  ) {
    super(message, { ...context, service: 'chromadb' }, cause);
  }

  /**
   * Create error for invalid module configuration
   */
  static invalidConfiguration(
    operation: string,
    configPath: string,
    issue: string
  ): MemoryConfigurationError {
    return new MemoryConfigurationError('Invalid memory module configuration', {
      operation,
      timestamp: new Date(),
      additionalInfo: { errorType: 'invalid_configuration', configPath, issue },
    });
  }

  /**
   * Create error for missing required configuration
   */
  static missingConfiguration(
    operation: string,
    requiredConfig: string
  ): MemoryConfigurationError {
    return new MemoryConfigurationError(
      'Required memory configuration is missing',
      {
        operation,
        timestamp: new Date(),
        additionalInfo: { errorType: 'missing_configuration', requiredConfig },
      }
    );
  }
}

/**
 * Error for timeout operations
 */
export class MemoryTimeoutError extends MemoryError {
  constructor(message: string, context: MemoryErrorContext, timeoutMs: number) {
    super(message, {
      ...context,
      additionalInfo: { ...context.additionalInfo, timeoutMs },
    });
  }

  /**
   * Create error for operation timeouts
   */
  static operationTimeout(
    operation: string,
    service: MemoryErrorContext['service'],
    timeoutMs: number,
    threadId?: string
  ): MemoryTimeoutError {
    return new MemoryTimeoutError(
      `Memory operation timed out after ${timeoutMs}ms`,
      {
        operation,
        service,
        threadId,
        timestamp: new Date(),
        additionalInfo: { errorType: 'operation_timeout' },
      },
      timeoutMs
    );
  }
}

/**
 * General memory operation error
 * Used for operations that don't fit into specific error categories
 */
export class MemoryOperationError extends MemoryError {
  constructor(
    message: string,
    context: MemoryErrorContext = {},
    cause?: Error
  ) {
    super(message, context, cause);
    this.name = 'MemoryOperationError';
  }

  /**
   * Create error for general operation failures
   */
  static operationFailed(
    operation: string,
    service: MemoryErrorContext['service'],
    threadId?: string,
    cause?: Error
  ): MemoryOperationError {
    return new MemoryOperationError(
      `Memory operation '${operation}' failed`,
      {
        operation,
        service,
        threadId,
        timestamp: new Date(),
        additionalInfo: { errorType: 'operation_failed' },
      },
      cause
    );
  }
}

/**
 * Utility function to wrap errors with memory context
 */
export function wrapMemoryError(
  error: unknown,
  operation: string,
  service: MemoryErrorContext['service'],
  additionalContext?: Partial<MemoryErrorContext>
): MemoryError {
  const cause = error instanceof Error ? error : new Error(String(error));

  const context: MemoryErrorContext = {
    operation,
    service,
    timestamp: new Date(),
    ...additionalContext,
  };

  switch (service) {
    case 'chromadb':
      return new MemoryStorageError(
        'ChromaDB operation failed',
        context,
        cause
      );
    case 'neo4j':
      return new MemoryRelationshipError(
        'Neo4j operation failed',
        context,
        cause
      );
    case 'embedding':
      return new MemoryEmbeddingError(
        'Embedding operation failed',
        context,
        cause
      );
    case 'summarization':
      return new MemorySummarizationError(
        'Summarization operation failed',
        context,
        cause
      );
    default:
      return new MemoryOperationError(
        'Memory operation failed',
        context,
        cause
      );
  }
}

/**
 * Type guard to check if an error is a memory error
 */
export function isMemoryError(error: unknown): error is MemoryError {
  return error instanceof MemoryError;
}

/**
 * Extract error message safely from unknown error
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unknown error';
}
