/**
 * Runtime type validation and type guards for ChromaDB operations
 */

import type {
  ChromaDocument,
  ChromaSearchOptions,
  ChromaBulkOptions,
} from '../interfaces/chromadb-service.interface';
import type {
  ChromaDBModuleOptions,
  EmbeddingConfig,
  CollectionConfig,
} from '../interfaces/chromadb-module-options.interface';
import { ChromaDBValidationError } from '../errors/chromadb.errors';

/**
 * Type guard to check if a value is a valid embedding vector
 */
export function isEmbeddingVector(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === 'number' && isFinite(item))
  );
}

/**
 * Type guard to check if a value is a valid document ID
 */
export function isValidDocumentId(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length > 0 && value.trim() === value
  );
}

/**
 * Type guard to check if a value is valid metadata
 */
export function isValidMetadata(
  value: unknown
): value is Record<string, string | number | boolean | null> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const metadata = value as Record<string, unknown>;
  return Object.values(metadata).every(
    (val) =>
      val === null ||
      typeof val === 'string' ||
      typeof val === 'number' ||
      typeof val === 'boolean'
  );
}

/**
 * Type guard for metadata filter operators
 */
export function isMetadataFilterOperator(
  value: unknown
): value is '$eq' | '$ne' | '$gt' | '$gte' | '$lt' | '$lte' | '$in' | '$nin' {
  return (
    typeof value === 'string' &&
    ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin'].includes(value)
  );
}

/**
 * Type guard for metadata filter condition
 */
export function isMetadataFilterCondition(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const condition = value as Record<string, unknown>;
  return Object.keys(condition).every((key) => isMetadataFilterOperator(key));
}

/**
 * Type guard for metadata filter
 */
export function isValidMetadataFilter(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const filter = value as Record<string, unknown>;
  return Object.values(filter).every(
    (val) =>
      val === null ||
      typeof val === 'string' ||
      typeof val === 'number' ||
      typeof val === 'boolean' ||
      Array.isArray(val) ||
      isMetadataFilterCondition(val)
  );
}

/**
 * Type guard for document filter
 */
export function isValidDocumentFilter(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const filter = value as Record<string, unknown>;
  const validKeys = ['$contains', '$not_contains'];

  return Object.entries(filter).every(
    ([key, val]) => validKeys.includes(key) && typeof val === 'string'
  );
}

/**
 * Type guard to check if a value is a valid ChromaDocument
 */
export function isValidChromaDocument(value: unknown): value is ChromaDocument {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const doc = value as Record<string, unknown>;

  // ID is required and must be a valid string
  if (!isValidDocumentId(doc.id)) {
    return false;
  }

  // Document text is optional but must be a string if present
  if (doc.document !== undefined && typeof doc.document !== 'string') {
    return false;
  }

  // Embedding is optional but must be a valid vector if present
  if (doc.embedding !== undefined && !isEmbeddingVector(doc.embedding)) {
    return false;
  }

  // Metadata is optional but must be valid if present
  if (doc.metadata !== undefined && !isValidMetadata(doc.metadata)) {
    return false;
  }

  return true;
}

/**
 * Type guard to check if a value is a valid array of ChromaDocuments
 */
export function isValidChromaDocumentArray(
  value: unknown
): value is ChromaDocument[] {
  return Array.isArray(value) && value.every(isValidChromaDocument);
}

/**
 * Type guard to check if a value is valid search options
 */
export function isValidSearchOptions(
  value: unknown
): value is ChromaSearchOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return true; // Options are optional
  }

  const options = value as Record<string, unknown>;

  // Check nResults if present
  if (options.nResults !== undefined) {
    if (
      typeof options.nResults !== 'number' ||
      options.nResults < 1 ||
      !Number.isInteger(options.nResults)
    ) {
      return false;
    }
  }

  // Check where clause if present
  if (
    options.where !== undefined &&
    (typeof options.where !== 'object' || Array.isArray(options.where))
  ) {
    return false;
  }

  // Check whereDocument if present
  if (
    options.whereDocument !== undefined &&
    (typeof options.whereDocument !== 'object' ||
      Array.isArray(options.whereDocument))
  ) {
    return false;
  }

  return true;
}

/**
 * Type guard to check if a value is valid bulk options
 */
export function isValidBulkOptions(value: unknown): value is ChromaBulkOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return true; // Options are optional
  }

  const options = value as Record<string, unknown>;

  // Check batchSize if present
  if (options.batchSize !== undefined) {
    if (
      typeof options.batchSize !== 'number' ||
      options.batchSize < 1 ||
      !Number.isInteger(options.batchSize)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Type guard to check if a value is a valid collection name
 */
export function isValidCollectionName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 63 &&
    /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/.test(value)
  );
}

/**
 * Type guard to check if a value is valid embedding configuration
 */
export function isValidEmbeddingConfig(
  value: unknown
): value is EmbeddingConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const config = value as Record<string, unknown>;

  // Provider is required
  if (typeof config.provider !== 'string') {
    return false;
  }

  // Config object is required
  if (
    !config.config ||
    typeof config.config !== 'object' ||
    Array.isArray(config.config)
  ) {
    return false;
  }

  return true;
}

/**
 * Type guard to check if a value is valid collection configuration
 */
export function isValidCollectionConfig(
  value: unknown
): value is CollectionConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const config = value as Record<string, unknown>;

  // Name is required and must be valid
  if (!isValidCollectionName(config.name)) {
    return false;
  }

  // Metadata is optional but must be valid if present
  if (config.metadata !== undefined && !isValidMetadata(config.metadata)) {
    return false;
  }

  return true;
}

/**
 * Validation function that throws typed errors
 */
export function validateChromaDocument(
  value: unknown,
  context?: string
): asserts value is ChromaDocument {
  if (!isValidChromaDocument(value)) {
    throw new ChromaDBValidationError(
      `Invalid ChromaDocument${context ? ` in ${context}` : ''}`,
      'document',
      value
    );
  }
}

/**
 * Validation function for document arrays
 */
export function validateChromaDocumentArray(
  value: unknown,
  context?: string
): asserts value is ChromaDocument[] {
  if (!isValidChromaDocumentArray(value)) {
    throw new ChromaDBValidationError(
      `Invalid ChromaDocument array${context ? ` in ${context}` : ''}`,
      'documents',
      value
    );
  }
}

/**
 * Validation function for collection names
 */
export function validateCollectionName(
  value: unknown,
  context?: string
): asserts value is string {
  if (!isValidCollectionName(value)) {
    throw new ChromaDBValidationError(
      `Invalid collection name${
        context ? ` in ${context}` : ''
      }. Must be 1-63 characters, start and end with alphanumeric, contain only alphanumeric, dots, underscores, and hyphens`,
      'collectionName',
      value
    );
  }
}

/**
 * Validation function for embedding vectors
 */
export function validateEmbeddingVector(
  value: unknown,
  context?: string
): asserts value is number[] {
  if (!isEmbeddingVector(value)) {
    throw new ChromaDBValidationError(
      `Invalid embedding vector${
        context ? ` in ${context}` : ''
      }. Must be a non-empty array of finite numbers`,
      'embedding',
      value
    );
  }
}

/**
 * Validation function for metadata
 */
export function validateMetadata(
  value: unknown,
  context?: string
): asserts value is Record<string, string | number | boolean | null> {
  if (!isValidMetadata(value)) {
    throw new ChromaDBValidationError(
      `Invalid metadata${
        context ? ` in ${context}` : ''
      }. Must be an object with string, number, boolean, or null values`,
      'metadata',
      value
    );
  }
}

/**
 * Validation function for search options
 */
export function validateSearchOptions(
  value: unknown,
  context?: string
): asserts value is ChromaSearchOptions {
  if (!isValidSearchOptions(value)) {
    throw new ChromaDBValidationError(
      `Invalid search options${context ? ` in ${context}` : ''}`,
      'searchOptions',
      value
    );
  }
}

/**
 * Validation function for bulk options
 */
export function validateBulkOptions(
  value: unknown,
  context?: string
): asserts value is ChromaBulkOptions {
  if (!isValidBulkOptions(value)) {
    throw new ChromaDBValidationError(
      `Invalid bulk options${context ? ` in ${context}` : ''}`,
      'bulkOptions',
      value
    );
  }
}

/**
 * Comprehensive validation for module options
 */
export function validateModuleOptions(
  value: unknown
): asserts value is ChromaDBModuleOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ChromaDBValidationError(
      'Module options must be an object',
      'moduleOptions',
      value
    );
  }

  const options = value as Record<string, unknown>;

  // Connection is required
  if (
    !options.connection ||
    typeof options.connection !== 'object' ||
    Array.isArray(options.connection)
  ) {
    throw new ChromaDBValidationError(
      'Connection configuration is required',
      'connection',
      options.connection
    );
  }

  const connection = options.connection as Record<string, unknown>;

  // Host is required
  if (typeof connection.host !== 'string' || connection.host.length === 0) {
    throw new ChromaDBValidationError(
      'Connection host must be a non-empty string',
      'connection.host',
      connection.host
    );
  }

  // Port is required and must be a valid port number
  if (
    typeof connection.port !== 'number' ||
    connection.port < 1 ||
    connection.port > 65535 ||
    !Number.isInteger(connection.port)
  ) {
    throw new ChromaDBValidationError(
      'Connection port must be a valid port number (1-65535)',
      'connection.port',
      connection.port
    );
  }

  // SSL is optional but must be boolean if present
  if (connection.ssl !== undefined && typeof connection.ssl !== 'boolean') {
    throw new ChromaDBValidationError(
      'Connection SSL must be a boolean',
      'connection.ssl',
      connection.ssl
    );
  }

  // Validate embedding config if present
  if (
    options.embedding !== undefined &&
    !isValidEmbeddingConfig(options.embedding)
  ) {
    throw new ChromaDBValidationError(
      'Invalid embedding configuration',
      'embedding',
      options.embedding
    );
  }
}

/**
 * Runtime type checking utility for development/debugging
 */
export function createTypeChecker<T>(
  typeName: string,
  validator: (value: unknown) => value is T
): {
  check: (value: unknown) => value is T;
  assert: (value: unknown, context?: string) => asserts value is T;
  validate: (value: unknown, context?: string) => T;
} {
  return {
    check: (value: unknown): value is T => validator(value),
    assert: (value: unknown, context?: string): asserts value is T => {
      if (!validator(value)) {
        throw new ChromaDBValidationError(
          `Expected ${typeName}${context ? ` in ${context}` : ''}`,
          typeName,
          value
        );
      }
    },
    validate: (value: unknown, context?: string): T => {
      if (!validator(value)) {
        throw new ChromaDBValidationError(
          `Expected ${typeName}${context ? ` in ${context}` : ''}`,
          typeName,
          value
        );
      }
      return value;
    },
  };
}
