/**
 * Utility functions for safe error handling
 */

import type { ChromaDBError } from '../errors/chromadb.errors';
import {
  ChromaDBConnectionError,
  ChromaDBCollectionError,
  ChromaDBDocumentError,
  ChromaDBEmbeddingError,
  ChromaDBSearchError,
  ChromaDBValidationError,
  ChromaDBConfigurationError,
  wrapAsChromaDBError,
} from '../errors/chromadb.errors';

/**
 * Safely extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as Record<string, unknown>).message);
  }

  return String(error);
}

/**
 * Safely extract error stack from unknown error type
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }

  if (error && typeof error === 'object' && 'stack' in error) {
    return String((error as Record<string, unknown>).stack);
  }

  return undefined;
}

/**
 * Create a standardized error object
 * @deprecated Use specific ChromaDB error classes instead
 */
export function createStandardError(
  message: string,
  originalError?: unknown,
  code?: string
): Error {
  const error = new Error(message);

  if (code) {
    (error as unknown as Record<string, unknown>).code = code;
  }

  if (originalError) {
    (error as unknown as Record<string, unknown>).originalError = originalError;

    // Try to preserve the original stack trace
    const originalStack = getErrorStack(originalError);
    if (originalStack) {
      error.stack = `${error.stack}\nCaused by: ${originalStack}`;
    }
  }

  return error;
}

/**
 * Type guard to check if error is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard to check if error has a message property
 */
export function hasMessage(error: unknown): error is { message: string } {
  return (
    error !== null &&
    error !== undefined &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Enhanced error handling for ChromaDB operations
 */
export class ChromaDBErrorHandler {
  /**
   * Handle connection errors with proper typing
   */
  public static handleConnectionError(
    error: unknown,
    context?: Record<string, unknown>
  ): ChromaDBConnectionError {
    if (error instanceof ChromaDBConnectionError) {
      return error;
    }

    const message = getErrorMessage(error);
    const cause = isError(error) ? error : undefined;

    return new ChromaDBConnectionError(
      message.includes('connect') ? message : `Connection failed: ${message}`,
      context,
      cause
    );
  }

  /**
   * Handle collection errors with proper typing
   */
  public static handleCollectionError(
    error: unknown,
    collectionName?: string,
    context?: Record<string, unknown>
  ): ChromaDBCollectionError {
    if (error instanceof ChromaDBCollectionError) {
      return error;
    }

    const message = getErrorMessage(error);
    const cause = isError(error) ? error : undefined;

    return new ChromaDBCollectionError(message, collectionName, context, cause);
  }

  /**
   * Handle document errors with proper typing
   */
  public static handleDocumentError(
    error: unknown,
    documentId?: string,
    context?: Record<string, unknown>
  ): ChromaDBDocumentError {
    if (error instanceof ChromaDBDocumentError) {
      return error;
    }

    const message = getErrorMessage(error);
    const cause = isError(error) ? error : undefined;

    return new ChromaDBDocumentError(message, documentId, context, cause);
  }

  /**
   * Handle embedding errors with proper typing
   */
  public static handleEmbeddingError(
    error: unknown,
    provider?: string,
    context?: Record<string, unknown>
  ): ChromaDBEmbeddingError {
    if (error instanceof ChromaDBEmbeddingError) {
      return error;
    }

    const message = getErrorMessage(error);
    const cause = isError(error) ? error : undefined;

    return new ChromaDBEmbeddingError(message, provider, context, cause);
  }

  /**
   * Handle search errors with proper typing
   */
  public static handleSearchError(
    error: unknown,
    query?: string | number[],
    context?: Record<string, unknown>
  ): ChromaDBSearchError {
    if (error instanceof ChromaDBSearchError) {
      return error;
    }

    const message = getErrorMessage(error);
    const cause = isError(error) ? error : undefined;

    return new ChromaDBSearchError(message, query, context, cause);
  }

  /**
   * Handle validation errors with proper typing
   */
  public static handleValidationError(
    error: unknown,
    field?: string,
    value?: unknown,
    context?: Record<string, unknown>
  ): ChromaDBValidationError {
    if (error instanceof ChromaDBValidationError) {
      return error;
    }

    const message = getErrorMessage(error);
    const cause = isError(error) ? error : undefined;

    return new ChromaDBValidationError(message, field, value, context, cause);
  }

  /**
   * Handle configuration errors with proper typing
   */
  public static handleConfigurationError(
    error: unknown,
    configField?: string,
    context?: Record<string, unknown>
  ): ChromaDBConfigurationError {
    if (error instanceof ChromaDBConfigurationError) {
      return error;
    }

    const message = getErrorMessage(error);
    const cause = isError(error) ? error : undefined;

    return new ChromaDBConfigurationError(message, configField, context, cause);
  }

  /**
   * Generic error handler that wraps unknown errors as ChromaDB errors
   */
  public static handleGenericError(
    error: unknown,
    defaultMessage = 'ChromaDB operation failed',
    context?: Record<string, unknown>
  ): ChromaDBError {
    return wrapAsChromaDBError(error, defaultMessage, context);
  }

  /**
   * Async wrapper for operations that may throw errors
   */
  public static async wrapAsync<T>(
    operation: () => Promise<T>,
    errorHandler: (error: unknown) => ChromaDBError
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw errorHandler(error);
    }
  }

  /**
   * Sync wrapper for operations that may throw errors
   */
  public static wrap<T>(
    operation: () => T,
    errorHandler: (error: unknown) => ChromaDBError
  ): T {
    try {
      return operation();
    } catch (error) {
      throw errorHandler(error);
    }
  }
}

/**
 * Utility function to safely execute async operations with error handling
 */
export async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw wrapAsChromaDBError(error, errorMessage, context);
  }
}

/**
 * Utility function to safely execute sync operations with error handling
 */
export function safeOperation<T>(
  operation: () => T,
  errorMessage: string,
  context?: Record<string, unknown>
): T {
  try {
    return operation();
  } catch (error) {
    throw wrapAsChromaDBError(error, errorMessage, context);
  }
}

// Re-export error classes and utilities for convenience
export {
  ChromaDBError,
  ChromaDBConnectionError,
  ChromaDBCollectionError,
  ChromaDBDocumentError,
  ChromaDBEmbeddingError,
  ChromaDBSearchError,
  ChromaDBValidationError,
  ChromaDBConfigurationError,
  isChromaDBError,
  wrapAsChromaDBError,
} from '../errors/chromadb.errors';
