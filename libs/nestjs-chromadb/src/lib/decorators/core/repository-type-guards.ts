/**
 * @fileoverview Type Guards and Validation Utilities for @ChromaRepository
 *
 * This module provides runtime type validation and type guards to ensure
 * type safety throughout the repository operations.
 */

import type { BaseDocument } from '../../types/core.interface';
import type { ChromaDBService } from '../../services/chromadb.service';
import type { Metadata as ChromaMetadata } from 'chromadb';
import type { GetResult, QueryResult } from 'chromadb';

/**
 * Type guard to validate if an object is a valid BaseDocument
 */
export function isValidBaseDocument<TDocument extends BaseDocument>(
  value: unknown
): value is TDocument {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const doc = value as Record<string, unknown>;

  // Check required fields
  if (typeof doc.id !== 'string' || doc.id.length === 0) {
    return false;
  }

  if (typeof doc.content !== 'string') {
    return false;
  }

  if (typeof doc.metadata !== 'object' || doc.metadata === null) {
    return false;
  }

  // Check optional fields if present
  if (doc.embedding !== undefined && !Array.isArray(doc.embedding)) {
    return false;
  }

  if (doc.createdAt !== undefined && typeof doc.createdAt !== 'string') {
    return false;
  }

  if (doc.updatedAt !== undefined && typeof doc.updatedAt !== 'string') {
    return false;
  }

  if (doc.version !== undefined && typeof doc.version !== 'number') {
    return false;
  }

  return true;
}

/**
 * Type guard to validate ChromaDB service instance
 */
export function isValidChromaDBService(
  value: unknown
): value is ChromaDBService {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const service = value as Record<string, unknown>;

  // Check for required methods
  const requiredMethods = [
    'getClient',
    'isHealthy',
    'listCollections',
    'createCollection',
    'getCollection',
    'deleteCollection',
    'collectionExists',
    'addDocuments',
    'updateDocuments',
    'upsertDocuments',
    'getDocuments',
    'deleteDocuments',
    'searchDocuments',
    'countDocuments',
    'peekDocuments',
    'getCollectionMetadata',
    'updateCollectionMetadata',
  ];

  for (const method of requiredMethods) {
    if (typeof service[method] !== 'function') {
      return false;
    }
  }

  return true;
}

/**
 * Type guard to validate ChromaDB query result
 */
export function isValidChromaResult(
  value: unknown
): value is GetResult<ChromaMetadata> | QueryResult<ChromaMetadata> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const result = value as Record<string, unknown>;

  // Check required arrays
  if (!Array.isArray(result.ids)) {
    return false;
  }

  if (!Array.isArray(result.documents)) {
    return false;
  }

  if (!Array.isArray(result.metadatas)) {
    return false;
  }

  // All arrays should have the same length
  const length = result.ids.length;
  if (
    result.documents.length !== length ||
    result.metadatas.length !== length
  ) {
    return false;
  }

  // Check optional arrays if present
  if (result.embeddings !== undefined) {
    if (
      !Array.isArray(result.embeddings) ||
      result.embeddings.length !== length
    ) {
      return false;
    }
  }

  if (result.distances !== undefined) {
    if (!Array.isArray(result.distances)) {
      return false;
    }
    // Distances might be nested array for multiple queries
    if (result.distances.length > 0 && Array.isArray(result.distances[0])) {
      // Multiple query results
      if (result.distances[0].length !== length) {
        return false;
      }
    } else if (result.distances.length !== length) {
      return false;
    }
  }

  return true;
}

/**
 * Type guard to validate metadata for ChromaDB compatibility
 */
export function isValidChromaMetadata(value: unknown): value is ChromaMetadata {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const metadata = value as Record<string, unknown>;

  // All values must be string, number, boolean, or null
  for (const [key, val] of Object.entries(metadata)) {
    if (typeof key !== 'string') {
      return false;
    }

    if (
      val !== null &&
      typeof val !== 'string' &&
      typeof val !== 'number' &&
      typeof val !== 'boolean'
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Validation utility for repository operation options
 */
export interface RepositoryOperationValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Validate repository operation options
 */
export function validateRepositoryOperationOptions(
  options: unknown
): RepositoryOperationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (options === undefined || options === null) {
    return { valid: true, errors: [], warnings: [] };
  }

  if (typeof options !== 'object') {
    errors.push('Options must be an object');
    return { valid: false, errors, warnings };
  }

  const opts = options as Record<string, unknown>;

  // Validate optional boolean fields
  for (const field of ['skipValidation', 'skipCache']) {
    if (opts[field] !== undefined && typeof opts[field] !== 'boolean') {
      errors.push(`${field} must be a boolean`);
    }
  }

  // Validate optional number fields
  for (const field of ['batchSize']) {
    if (opts[field] !== undefined) {
      if (typeof opts[field] !== 'number' || opts[field] <= 0) {
        errors.push(`${field} must be a positive number`);
      }
    }
  }

  // Validate optional string fields
  for (const field of ['embeddingModel']) {
    if (opts[field] !== undefined && typeof opts[field] !== 'string') {
      errors.push(`${field} must be a string`);
    }
  }

  // Validate metadata if present
  if (opts.metadata !== undefined) {
    if (!isValidChromaMetadata(opts.metadata)) {
      errors.push(
        'metadata must be compatible with ChromaDB (string, number, boolean, or null values only)'
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Type assertion with runtime validation
 */
export function assertValidDocument<TDocument extends BaseDocument>(
  value: unknown,
  context = 'document'
): asserts value is TDocument {
  if (!isValidBaseDocument<TDocument>(value)) {
    throw new Error(
      `Invalid ${context}: object does not conform to BaseDocument interface`
    );
  }
}

/**
 * Type assertion for ChromaDB service
 */
export function assertValidChromaDBService(
  value: unknown,
  context = 'ChromaDB service'
): asserts value is ChromaDBService {
  if (!isValidChromaDBService(value)) {
    throw new Error(
      `Invalid ${context}: object does not implement ChromaDBService interface`
    );
  }
}

/**
 * Type assertion for ChromaDB results
 */
export function assertValidChromaResult(
  value: unknown,
  context = 'ChromaDB result'
): asserts value is GetResult<ChromaMetadata> | QueryResult<ChromaMetadata> {
  if (!isValidChromaResult(value)) {
    throw new Error(
      `Invalid ${context}: object does not conform to ChromaDB result format`
    );
  }
}

/**
 * Safe type conversion utility
 */
export class TypeSafeConverter {
  /**
   * Safely convert unknown value to BaseDocument with validation
   */
  static toDocument<TDocument extends BaseDocument>(
    value: unknown,
    fallback?: TDocument
  ): TDocument | null {
    try {
      if (isValidBaseDocument<TDocument>(value)) {
        return value;
      }
      return fallback || null;
    } catch {
      return fallback || null;
    }
  }

  /**
   * Safely convert array of unknown values to BaseDocument array
   */
  static toDocumentArray<TDocument extends BaseDocument>(
    values: unknown[],
    skipInvalid = true
  ): TDocument[] {
    const results: TDocument[] = [];

    for (const value of values) {
      try {
        if (isValidBaseDocument<TDocument>(value)) {
          results.push(value);
        } else if (!skipInvalid) {
          throw new Error('Invalid document found in array');
        }
      } catch (error) {
        if (!skipInvalid) {
          throw error;
        }
        // Skip invalid documents when skipInvalid is true
      }
    }

    return results;
  }

  /**
   * Safely extract metadata that's compatible with ChromaDB
   */
  static toChromaMetadata(metadata: Record<string, unknown>): ChromaMetadata {
    const result: ChromaMetadata = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        result[key] = value;
      } else if (value !== undefined) {
        // Convert complex types to string representation
        try {
          result[key] = JSON.stringify(value);
        } catch {
          result[key] = String(value);
        }
      }
    }

    return result;
  }
}

/**
 * Runtime type checking decorator for repository methods
 */
export function TypeSafeMethod<TArgs extends unknown[], TReturn>(
  validate: (args: TArgs) => void = () => {
    // Default validation does nothing
  }
) {
  return function (
    target: unknown,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: TArgs): Promise<TReturn> {
      try {
        // Run validation on arguments
        validate(args);

        // Call original method
        const result = await originalMethod.apply(this, args);

        // Return result (could add result validation here too)
        return result;
      } catch (error) {
        // Re-throw with additional context
        const methodName = String(propertyKey);
        const className = target?.constructor?.name || 'Unknown';
        throw new Error(
          `Type safety validation failed in ${className}.${methodName}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    };

    return descriptor;
  };
}
