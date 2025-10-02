/**
 * Error handling utilities for consistent error management across the ChromaDB library
 */

export interface ErrorContext {
  [key: string]: any;
}

/**
 * Handles unknown errors by converting them to typed Error instances
 */
export function handleUnknownError(error: unknown, operation: string): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(`${operation}: ${String(error)}`);
}

/**
 * Logs unknown errors with consistent format
 */
export function logUnknownError(
  logger: any,
  error: unknown,
  operation: string,
  context?: ErrorContext
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  if (context) {
    logger.error(`${operation} failed:`, errorMessage, errorStack, context);
  } else {
    logger.error(`${operation} failed:`, errorMessage, errorStack);
  }
}

/**
 * Gets safe error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Gets safe error stack from unknown error
 */
export function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

/**
 * Creates a typed error from unknown error with context
 */
export function createTypedError(
  error: unknown,
  operation: string,
  context?: ErrorContext
): Error {
  const message = error instanceof Error ? error.message : String(error);
  const contextStr = context ? ` (${JSON.stringify(context)})` : '';

  if (error instanceof Error) {
    // Preserve original error but enhance message with context
    const enhancedError = new Error(`${operation}: ${message}${contextStr}`);
    enhancedError.stack = error.stack;
    enhancedError.cause = error;
    return enhancedError;
  }

  return new Error(`${operation}: ${message}${contextStr}`);
}
