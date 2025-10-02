/**
 * @fileoverview Repository Validation and Error Handling
 *
 * Provides validation logic, error handling strategies, and type safety
 * checks for repository operations.
 */

import { Logger } from '@nestjs/common';
import type { BaseDocument } from '../../types/core.interface';
import type {
  ChromaRepositoryConfig,
  RepositoryOperationOptions,
  RepositoryOperationResult,
} from './repository-metadata';

// ========================================
// Validation Logic
// ========================================

/**
 * Document validation service for repository operations
 */
export class RepositoryValidator {
  /**
   * Validate a single document before operation
   */
  async validateDocument<TDocument extends BaseDocument>(
    document: TDocument,
    config: ChromaRepositoryConfig
  ): Promise<void> {
    if (!config.enableValidation) {
      return;
    }

    // Basic validation - can be extended
    if (!document.id) {
      throw new Error('Document ID is required');
    }

    if (document.content === null || document.content === undefined) {
      throw new Error('Document content is required');
    }

    if (!document.metadata || typeof document.metadata !== 'object') {
      throw new Error('Document metadata is required and must be an object');
    }

    // Additional validations based on config
    // Check timestamp fields if they exist on the document
    if (config.autoTimestamp && 'createdAt' in document) {
      const createdAt = (document as any).createdAt;
      if (createdAt && !this.isValidDate(createdAt)) {
        throw new Error('Invalid createdAt timestamp format');
      }
    }

    if (config.autoTimestamp && 'updatedAt' in document) {
      const updatedAt = (document as any).updatedAt;
      if (updatedAt && !this.isValidDate(updatedAt)) {
        throw new Error('Invalid updatedAt timestamp format');
      }
    }

    // Check version field if it exists on the document
    if ('version' in document) {
      const version = (document as any).version;
      if (
        version !== undefined &&
        (!Number.isInteger(version) || version < 1)
      ) {
        throw new Error('Document version must be a positive integer');
      }
    }

    if (document.embedding && !Array.isArray(document.embedding)) {
      throw new Error('Document embedding must be an array of numbers');
    }

    if (
      document.embedding &&
      document.embedding.some(
        (val) => typeof val !== 'number' || !isFinite(val)
      )
    ) {
      throw new Error('Document embedding must contain only finite numbers');
    }
  }

  /**
   * Validate multiple documents before bulk operation
   */
  async validateDocuments<TDocument extends BaseDocument>(
    documents: TDocument[],
    config: ChromaRepositoryConfig
  ): Promise<void> {
    if (!config.enableValidation || documents.length === 0) {
      return;
    }

    const errors: string[] = [];

    for (let i = 0; i < documents.length; i++) {
      try {
        await this.validateDocument(documents[i], config);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Document at index ${i}: ${message}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Validation failed for ${errors.length} documents:\n${errors.join(
          '\n'
        )}`
      );
    }

    // Check for duplicate IDs
    const ids = documents.map((doc) => doc.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      throw new Error(
        `Duplicate document IDs found: ${duplicateIds.join(', ')}`
      );
    }
  }

  /**
   * Validate operation options
   */
  validateOptions(options?: RepositoryOperationOptions): void {
    if (!options) return;

    if (
      options.batchSize !== undefined &&
      (!Number.isInteger(options.batchSize) || options.batchSize < 1)
    ) {
      throw new Error('Batch size must be a positive integer');
    }

    if (options.metadata && typeof options.metadata !== 'object') {
      throw new Error('Options metadata must be an object');
    }
  }

  /**
   * Validate collection name
   */
  validateCollection(collection: string): void {
    if (!collection || typeof collection !== 'string') {
      throw new Error('Collection name must be a non-empty string');
    }

    if (collection.length > 63) {
      throw new Error('Collection name must be 63 characters or less');
    }

    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/.test(collection)) {
      throw new Error(
        'Collection name must contain only alphanumeric characters, dots, hyphens, and underscores'
      );
    }
  }

  /**
   * Check if string is a valid ISO date
   */
  private isValidDate(dateString: string): boolean {
    try {
      const date = new Date(dateString);
      return date.toISOString() === dateString;
    } catch {
      return false;
    }
  }
}

// ========================================
// Error Handling
// ========================================

/**
 * Repository error handling service
 */
export class RepositoryErrorHandler {
  private readonly logger = new Logger(RepositoryErrorHandler.name);

  /**
   * Handle single operation error based on config strategy
   */
  handleError<T>(
    operation: string,
    error: unknown,
    config: ChromaRepositoryConfig,
    options?: RepositoryOperationOptions
  ): T | null {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const message = `Repository operation '${operation}' failed: ${errorMessage}`;

    switch (config.errorHandling) {
      case 'silent':
        break;
      case 'log_and_continue':
        this.logger.error(
          message,
          error instanceof Error ? error.stack : undefined
        );
        break;
      case 'throw':
      default:
        this.logger.error(
          message,
          error instanceof Error ? error.stack : undefined
        );
        throw error instanceof Error ? error : new Error(message);
    }

    return null;
  }

  /**
   * Handle bulk operation error
   */
  handleBulkError<TDocument extends BaseDocument>(
    operation: string,
    error: unknown,
    count: number,
    config: ChromaRepositoryConfig,
    options?: RepositoryOperationOptions
  ): RepositoryOperationResult<TDocument> {
    // Log the error first
    this.handleError(
      operation,
      error,
      { ...config, errorHandling: 'log_and_continue' },
      options
    );

    const errorMessage = error instanceof Error ? error.message : String(error);

    const result: RepositoryOperationResult<TDocument> = {
      success: false,
      operationTime: 0,
      documentsProcessed: 0,
      errors: [errorMessage],
      documents: [],
    };

    // Re-throw if configured to do so
    if (config.errorHandling === 'throw') {
      throw error instanceof Error
        ? error
        : new Error(`Bulk operation '${operation}' failed: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Create detailed error with context
   */
  createContextualError(
    operation: string,
    originalError: unknown,
    context: {
      collection?: string;
      documentId?: string;
      documentCount?: number;
      options?: RepositoryOperationOptions;
    }
  ): Error {
    const originalMessage =
      originalError instanceof Error
        ? originalError.message
        : String(originalError);

    const contextParts = [
      `Operation: ${operation}`,
      context.collection && `Collection: ${context.collection}`,
      context.documentId && `Document ID: ${context.documentId}`,
      context.documentCount !== undefined &&
        `Document count: ${context.documentCount}`,
      context.options &&
        Object.keys(context.options).length > 0 &&
        `Options: ${JSON.stringify(context.options)}`,
    ].filter(Boolean);

    const contextString =
      contextParts.length > 0 ? `\nContext: ${contextParts.join(', ')}` : '';
    const fullMessage = `${originalMessage}${contextString}`;

    const error = new Error(fullMessage);
    if (originalError instanceof Error && originalError.stack) {
      error.stack = originalError.stack;
    }

    return error;
  }
}

// ========================================
// Type Safety Utilities
// ========================================

/**
 * Type safety utilities for repository operations
 */
export class RepositoryTypeSafety {
  /**
   * Ensure ID is present for document
   */
  ensureDocumentId<TDocument extends BaseDocument>(
    document: Omit<TDocument, 'id'> | TDocument,
    generateId: () => string
  ): TDocument {
    if ('id' in document && document.id) {
      return document as TDocument;
    }

    return {
      ...document,
      id: generateId(),
    } as TDocument;
  }

  /**
   * Ensure all required fields are present
   */
  ensureRequiredFields<TDocument extends BaseDocument>(
    document: Partial<TDocument>,
    config: ChromaRepositoryConfig
  ): TDocument {
    const now = new Date().toISOString();
    const enriched: any = { ...document };

    // Ensure content exists
    if (enriched.content === undefined || enriched.content === null) {
      enriched.content = '';
    }

    // Ensure metadata exists
    if (!enriched.metadata || typeof enriched.metadata !== 'object') {
      enriched.metadata = {};
    }

    // Add timestamps if enabled
    if (config.autoTimestamp) {
      if (!enriched.createdAt) {
        enriched.createdAt = now;
      }
      enriched.updatedAt = now;

      if (!enriched.version) {
        enriched.version = 1;
      }
    }

    return enriched as TDocument;
  }

  /**
   * Sanitize metadata for ChromaDB storage
   */
  sanitizeMetadata(
    metadata: Record<string, unknown>
  ): Record<string, string | number | boolean | null> {
    const sanitized: Record<string, string | number | boolean | null> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null
      ) {
        sanitized[key] = value as string | number | boolean | null;
      } else if (value !== undefined) {
        // Convert complex types to string
        try {
          sanitized[key] = JSON.stringify(value);
        } catch (error) {
          // If JSON.stringify fails, convert to string representation
          sanitized[key] = String(value);
        }
      }
    }

    return sanitized;
  }

  /**
   * Generate unique ID
   */
  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ========================================
// Singleton Instances
// ========================================

export const repositoryValidator = new RepositoryValidator();
export const repositoryErrorHandler = new RepositoryErrorHandler();
export const repositoryTypeSafety = new RepositoryTypeSafety();
