import { HttpException, HttpStatus } from '@nestjs/common';

// Base memory exception
export class MemoryException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly context?: Record<string, unknown>
  ) {
    super(
      {
        message,
        error: 'Memory Error',
        statusCode: status,
        context,
        timestamp: new Date().toISOString(),
      },
      status
    );
  }
}

// Memory not found exception
export class MemoryNotFoundException extends MemoryException {
  constructor(threadId: string, memoryId?: string) {
    super(
      `Memory not found${memoryId ? ` with ID ${memoryId}` : ''} in thread ${threadId}`,
      HttpStatus.NOT_FOUND,
      { threadId, memoryId }
    );
  }
}

// Memory storage exception
export class MemoryStorageException extends MemoryException {
  constructor(operation: string, cause?: Error) {
    super(
      `Memory storage operation failed: ${operation}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      { operation, cause: cause?.message }
    );
  }
}

// Memory validation exception
export class MemoryValidationException extends MemoryException {
  constructor(field: string, value: unknown, reason: string) {
    super(
      `Invalid memory field '${field}': ${reason}`,
      HttpStatus.BAD_REQUEST,
      { field, value, reason }
    );
  }
}

// Memory quota exceeded exception
export class MemoryQuotaExceededException extends MemoryException {
  constructor(limit: number, current: number, quotaType: string) {
    super(
      `Memory quota exceeded: ${current}/${limit} ${quotaType}`,
      HttpStatus.PAYLOAD_TOO_LARGE,
      { limit, current, quotaType }
    );
  }
}

// Memory configuration exception
export class MemoryConfigurationException extends MemoryException {
  constructor(setting: string, reason: string) {
    super(
      `Invalid memory configuration for '${setting}': ${reason}`,
      HttpStatus.BAD_REQUEST,
      { setting, reason }
    );
  }
}

// Helper functions for error handling
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

export function wrapMemoryError(operation: string, error: unknown): MemoryException {
  if (error instanceof MemoryException) {
    return error;
  }
  
  const message = extractErrorMessage(error);
  return new MemoryStorageException(`${operation}: ${message}`, error as Error);
}