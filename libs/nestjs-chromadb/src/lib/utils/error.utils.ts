/**
 * Utility functions for safe error handling
 */

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
    return String((error as any).message);
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
    return String((error as any).stack);
  }
  
  return undefined;
}

/**
 * Create a standardized error object
 */
export function createStandardError(
  message: string,
  originalError?: unknown,
  code?: string
): Error {
  const error = new Error(message);
  
  if (code) {
    (error as any).code = code;
  }
  
  if (originalError) {
    (error as any).originalError = originalError;
    
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
  return error !== null && 
         error !== undefined && 
         typeof error === 'object' && 
         'message' in error &&
         typeof (error as any).message === 'string';
}