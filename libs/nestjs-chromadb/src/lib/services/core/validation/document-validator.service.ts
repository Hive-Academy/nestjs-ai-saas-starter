import { Injectable, Logger } from '@nestjs/common';
import type {
  BaseDocument,
  DocumentValidationSchema,
  ValidationResult,
  MutableValidationResult,
} from '../../../types/core.interface';

/**
 * Document Validation Service
 *
 * Handles validation of individual documents and document collections
 * Following Single Responsibility Principle - only validates documents
 */
@Injectable()
export class DocumentValidatorService {
  private readonly logger = new Logger(DocumentValidatorService.name);

  /**
   * Validate a single document with type safety
   */
  validateDocument<T extends BaseDocument>(
    document: T,
    schema?: DocumentValidationSchema
  ): ValidationResult {
    const result: MutableValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Apply default schema if none provided
    const validationSchema = schema || this.getDefaultDocumentSchema();

    // Validate document ID
    if (validationSchema.requireId && !document.id) {
      result.errors.push('Document ID is required');
    }

    if (document.id && typeof document.id !== 'string') {
      result.errors.push('Document ID must be a string');
    }

    if (document.id && document.id.trim().length === 0) {
      result.errors.push('Document ID cannot be empty');
    }

    // Validate document content
    if (validationSchema.required?.includes('content') && !document.content) {
      result.errors.push('Document content is required');
    }

    if (document.content && typeof document.content !== 'string') {
      result.errors.push('Document content must be a string');
    }

    const maxLength = validationSchema.ranges?.content?.max;
    if (document.content && maxLength && document.content.length > maxLength) {
      result.errors.push(
        `Document content exceeds maximum length of ${maxLength} characters`
      );
    }

    // Validate metadata
    if (document.metadata) {
      const metadataValidation = this.validateMetadata(document.metadata, validationSchema);
      result.errors.push(...metadataValidation.errors);
      result.warnings.push(...metadataValidation.warnings);
    } else if (validationSchema.required?.includes('metadata')) {
      result.errors.push('Document metadata is required');
    }

    // Validate embedding
    if (document.embedding) {
      const embeddingValidation = this.validateEmbedding(document.embedding);
      result.errors.push(...embeddingValidation.errors);
      result.warnings.push(...embeddingValidation.warnings);
    }

    result.isValid = result.errors.length === 0;

    if (!result.isValid) {
      this.logger.warn(`Document validation failed for ID '${document.id}': ${result.errors.join(', ')}`);
    }

    return result;
  }

  /**
   * Validate multiple documents with type safety
   */
  validateDocuments<T extends BaseDocument>(
    documents: T[],
    schema?: DocumentValidationSchema
  ): ValidationResult {
    const result: MutableValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!Array.isArray(documents)) {
      result.errors.push('Documents must be an array');
      result.isValid = false;
      return result;
    }

    if (documents.length === 0) {
      result.warnings.push('Empty documents array provided');
      return result;
    }

    // Check for duplicate IDs
    const ids = documents.map(doc => doc.id).filter(Boolean);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      result.errors.push(`Duplicate document IDs found: ${[...new Set(duplicateIds)].join(', ')}`);
    }

    // Validate each document
    documents.forEach((doc, index) => {
      const docValidation = this.validateDocument(doc, schema);

      if (!docValidation.isValid) {
        result.errors.push(`Document at index ${index}: ${docValidation.errors.join(', ')}`);
      }

      result.warnings.push(
        ...docValidation.warnings.map(warning => `Document at index ${index}: ${warning}`)
      );
    });

    result.isValid = result.errors.length === 0;

    if (!result.isValid) {
      this.logger.error(`Batch validation failed: ${result.errors.join('; ')}`);
    }

    return result;
  }

  /**
   * Validate metadata object
   */
  validateMetadata(
    metadata: Record<string, any>,
    schema?: DocumentValidationSchema
  ): ValidationResult {
    const result: MutableValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!metadata || typeof metadata !== 'object') {
      result.errors.push('Metadata must be an object');
      result.isValid = false;
      return result;
    }

    // Check for null values (ChromaDB doesn't support null)
    Object.entries(metadata).forEach(([key, value]) => {
      if (value === null) {
        result.errors.push(`Metadata key '${key}' cannot have null value`);
      }

      if (value === undefined) {
        result.warnings.push(`Metadata key '${key}' has undefined value, will be ignored`);
      }

      // ChromaDB only supports string, number, and boolean values
      if (
        typeof value !== 'string' &&
        typeof value !== 'number' &&
        typeof value !== 'boolean' &&
        value !== null &&
        value !== undefined
      ) {
        result.errors.push(
          `Metadata key '${key}' has unsupported type '${typeof value}'. Only string, number, and boolean are allowed`
        );
      }
    });

    // Check allowed keys
    if (schema?.allowedMetadataKeys) {
      const invalidKeys = Object.keys(metadata).filter(
        key => !schema.allowedMetadataKeys!.includes(key)
      );
      if (invalidKeys.length > 0) {
        result.errors.push(`Invalid metadata keys: ${invalidKeys.join(', ')}`);
      }
    }

    // Check forbidden keys
    if (schema?.forbiddenMetadataKeys) {
      const forbiddenKeys = Object.keys(metadata).filter(
        key => schema.forbiddenMetadataKeys!.includes(key)
      );
      if (forbiddenKeys.length > 0) {
        result.errors.push(`Forbidden metadata keys: ${forbiddenKeys.join(', ')}`);
      }
    }

    // Apply custom validation rules
    if (schema?.metadataValidation) {
      Object.entries(schema.metadataValidation).forEach(([key, validator]) => {
        if (Object.prototype.hasOwnProperty.call(metadata, key) && !validator(metadata[key])) {
          result.errors.push(`Metadata key '${key}' failed custom validation`);
        }
      });
    }

    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Validate embedding vector
   */
  validateEmbedding(embedding: number[]): ValidationResult {
    const result: MutableValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!Array.isArray(embedding)) {
      result.errors.push('Embedding must be an array of numbers');
      result.isValid = false;
      return result;
    }

    if (embedding.length === 0) {
      result.errors.push('Embedding cannot be empty');
      result.isValid = false;
      return result;
    }

    // Check if all values are numbers
    const nonNumbers = embedding.filter(value => typeof value !== 'number' || isNaN(value));
    if (nonNumbers.length > 0) {
      result.errors.push('All embedding values must be valid numbers');
    }

    // Check for infinite values
    const infiniteValues = embedding.filter(value => !isFinite(value));
    if (infiniteValues.length > 0) {
      result.errors.push('Embedding contains infinite or NaN values');
    }

    // Warning for very large embeddings
    if (embedding.length > 4096) {
      result.warnings.push(`Large embedding dimension (${embedding.length}), consider dimensionality reduction`);
    }

    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Get default document validation schema
   */
  private getDefaultDocumentSchema(): DocumentValidationSchema {
    return {
      requireId: true,
      requireDocument: false,
      requireMetadata: false,
      maxDocumentLength: 1000000, // 1MB
      forbiddenMetadataKeys: ['_id', '_rev', '_type'],
    };
  }
}
