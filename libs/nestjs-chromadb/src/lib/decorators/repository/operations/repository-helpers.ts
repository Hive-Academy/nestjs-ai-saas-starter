/**
 * @fileoverview Repository Helper Methods
 *
 * Contains shared utility methods for repository operations
 * Following Single Responsibility Principle - handles data transformation and utilities
 */

import { Logger } from '@nestjs/common';
import type { GetResult, QueryResult, Metadata } from 'chromadb';
import type {
  BaseDocument,
  ChromaWireDocument,
  ChromaBulkOptions,
  ChromaSearchOptions,
} from '../../../types/core.interface';
import type {
  ChromaRepositoryConfig,
  RepositoryOperationOptions,
  RepositorySearchOptions,
} from '../repository-metadata';
import { repositoryTypeSafety } from '../repository-validator';

/**
 * Repository Helpers
 * Shared utility methods for data transformation and validation
 */
export class RepositoryHelpers<TDocument extends BaseDocument = BaseDocument> {
  private readonly logger = new Logger(RepositoryHelpers.name);

  constructor(
    private readonly config: ChromaRepositoryConfig,
    private readonly chromaService: any // ChromaDBService interface
  ) {}

  // =====================================================================
  // Document Transformation Methods
  // =====================================================================

  enrichDocument(
    document: Omit<TDocument, 'id'> | TDocument,
    options?: RepositoryOperationOptions,
    existingId?: string
  ): TDocument {
    const base = repositoryTypeSafety.ensureRequiredFields(
      { ...document } as Partial<TDocument>,
      this.config
    );

    // Handle ID generation/assignment
    let id: string;
    if (existingId) {
      id = existingId;
    } else if (!('id' in document) && this.config.autoGenerateIds) {
      id = repositoryTypeSafety.generateId();
    } else if ('id' in document && document.id) {
      id = document.id;
    } else {
      id = repositoryTypeSafety.generateId();
    }

    // Create enriched document with proper immutability
    const enriched: TDocument = {
      ...base,
      id,
      metadata: options?.metadata
        ? {
            ...base.metadata,
            ...options.metadata,
          }
        : base.metadata,
    } as TDocument;

    return enriched;
  }

  documentToChromaWire(document: TDocument): ChromaWireDocument {
    return {
      id: document.id,
      document: document.content,
      metadata: repositoryTypeSafety.sanitizeMetadata(document.metadata),
      embedding: document.embedding ? [...document.embedding] : undefined,
    };
  }

  chromaResultToDocument(
    result: GetResult<Metadata> | QueryResult<Metadata>,
    index: number
  ): TDocument {
    if (!result.ids || !result.documents || !result.metadatas) {
      throw new Error('Invalid ChromaDB result: missing required fields');
    }

    if (index >= result.ids.length) {
      throw new Error(
        `Index ${index} out of bounds for result with ${result.ids.length} documents`
      );
    }

    const id = result.ids[index];
    const content = result.documents[index];
    const metadata = result.metadatas[index];

    if (!id || content === null || content === undefined || !metadata) {
      throw new Error(`Document at index ${index} is missing required fields`);
    }

    return {
      id,
      content,
      metadata: metadata as TDocument['metadata'],
      embedding: result.embeddings?.[index]
        ? Object.freeze([...result.embeddings[index]])
        : undefined,
    } as TDocument;
  }

  chromaResultToDocuments(
    result: GetResult<Metadata> | QueryResult<Metadata>
  ): TDocument[] {
    if (!result.ids || !Array.isArray(result.ids)) {
      return [];
    }

    const documents: TDocument[] = [];

    for (let i = 0; i < result.ids.length; i++) {
      try {
        documents.push(this.chromaResultToDocument(result, i));
      } catch (error) {
        this.logger.warn(`Failed to convert document at index ${i}: ${error}`);
        // Continue processing other documents
      }
    }

    return documents;
  }

  // =====================================================================
  // Options Creation Methods
  // =====================================================================

  createBulkOptions(options?: RepositoryOperationOptions): ChromaBulkOptions {
    return {
      batchSize: options?.batchSize || this.config.defaultBatchSize || 100,
    };
  }

  createSearchOptions(options?: RepositorySearchOptions): ChromaSearchOptions {
    return {
      nResults: options?.limit || 10,
      where: options?.where,
      whereDocument: options?.whereDocument,
      includeMetadata: options?.include?.metadata ?? true,
      includeDocuments: options?.include?.documents ?? true,
      includeDistances: options?.include?.distances ?? false,
      includeEmbeddings: options?.include?.embeddings ?? false,
    };
  }

  // =====================================================================
  // Utility Methods
  // =====================================================================

  logOperation(operation: string, duration: number, count: number): void {
    this.logger.debug(
      `${operation} completed in ${duration}ms for ${count} document(s)`
    );
  }

  validateCollection(): void {
    if (!this.config.collection) {
      throw new Error('Collection name is required');
    }
    if (typeof this.config.collection !== 'string') {
      throw new Error('Collection name must be a string');
    }
    if (this.config.collection.trim().length === 0) {
      throw new Error('Collection name cannot be empty');
    }
  }

  validateDocumentId(id: string): void {
    if (!id) {
      throw new Error('Document ID is required');
    }
    if (typeof id !== 'string') {
      throw new Error('Document ID must be a string');
    }
    if (id.trim().length === 0) {
      throw new Error('Document ID cannot be empty');
    }
  }

  validateDocumentIds(ids: string[]): void {
    if (!Array.isArray(ids)) {
      throw new Error('Document IDs must be an array');
    }
    if (ids.length === 0) {
      throw new Error('At least one document ID is required');
    }
    ids.forEach((id, index) => {
      try {
        this.validateDocumentId(id);
      } catch (error) {
        throw new Error(`Invalid ID at index ${index}: ${error}`);
      }
    });
  }

  validateSearchQuery(query: string): void {
    if (!query) {
      throw new Error('Search query is required');
    }
    if (typeof query !== 'string') {
      throw new Error('Search query must be a string');
    }
    if (query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }
  }

  validateEmbedding(embedding: number[]): void {
    if (!Array.isArray(embedding)) {
      throw new Error('Embedding must be an array of numbers');
    }
    if (embedding.length === 0) {
      throw new Error('Embedding cannot be empty');
    }
    if (
      !embedding.every((value) => typeof value === 'number' && !isNaN(value))
    ) {
      throw new Error('All embedding values must be valid numbers');
    }
  }

  // =====================================================================
  // Performance and Metrics Methods
  // =====================================================================

  async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      this.logger.debug(
        `Operation ${operationName} completed in ${duration}ms`,
        {
          operation: operationName,
          duration,
          success: true,
          ...context,
        }
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(
        `Operation ${operationName} failed after ${duration}ms`,
        {
          operation: operationName,
          duration,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          ...context,
        }
      );

      throw error;
    }
  }

  createOperationContext(
    operation: string,
    extras?: Record<string, any>
  ): Record<string, any> {
    return {
      collection: this.config.collection,
      operation,
      timestamp: new Date().toISOString(),
      ...extras,
    };
  }

  // =====================================================================
  // Error Recovery Methods
  // =====================================================================

  async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delayMs = 1000,
    operationName?: string
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) {
          this.logger.error(
            `Operation ${
              operationName || 'unknown'
            } failed after ${maxRetries} attempts`,
            {
              attempts: maxRetries,
              finalError: lastError.message,
            }
          );
          break;
        }

        this.logger.warn(
          `Operation ${
            operationName || 'unknown'
          } attempt ${attempt} failed, retrying...`,
          {
            attempt,
            maxRetries,
            error: lastError.message,
            retryDelayMs: delayMs,
          }
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        // Exponential backoff
        delayMs *= 1.5;
      }
    }

    throw (
      lastError || new Error(`Operation failed after ${maxRetries} attempts`)
    );
  }

  isRetriableError(error: Error): boolean {
    const retriablePatterns = [
      /network/i,
      /timeout/i,
      /connection/i,
      /temporary/i,
      /rate.limit/i,
      /service.unavailable/i,
    ];

    return retriablePatterns.some(
      (pattern) =>
        pattern.test(error.message) || (error.name && pattern.test(error.name))
    );
  }
}
