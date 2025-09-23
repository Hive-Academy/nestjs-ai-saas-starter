import { Injectable, Logger } from '@nestjs/common';
import type { BaseDocument } from '../../../types/document-types.interface';
import type {
  DocumentValidationSchema,
  ValidationResult,
} from '../../../types/core.interface';
import { ChromaDBValidationError } from '../../../errors/chromadb.errors';
import { DocumentValidatorService } from './document-validator.service';

/**
 * Document Sanitization Service
 *
 * Handles cleaning and sanitizing of documents before storage
 * Following Single Responsibility Principle - only sanitizes documents
 */
@Injectable()
export class DocumentSanitizerService {
  private readonly logger = new Logger(DocumentSanitizerService.name);

  constructor(private readonly documentValidator: DocumentValidatorService) {}

  /**
   * Validate and sanitize documents before operation with type safety
   */
  validateAndSanitize<T extends BaseDocument>(
    documents: T[],
    schema?: DocumentValidationSchema,
    throwOnError = true
  ): T[] {
    const validation = this.documentValidator.validateDocuments(documents, schema);

    if (!validation.isValid) {
      const errorMessage = `Document validation failed: ${validation.errors.join('; ')}`;

      if (throwOnError) {
        throw new ChromaDBValidationError(errorMessage, '', null, {
          documentCount: documents.length,
          errors: validation.errors,
          warnings: validation.warnings,
        });
      } else {
        this.logger.warn(errorMessage);
      }
    }

    if (validation.warnings.length > 0) {
      this.logger.warn(`Document validation warnings: ${validation.warnings.join('; ')}`);
    }

    // Sanitize documents
    return documents.map(doc => this.sanitizeDocument(doc));
  }

  /**
   * Sanitize a single document with type safety
   */
  sanitizeDocument<T extends BaseDocument>(document: T): T {
    // Create a mutable copy for sanitization
    const mutableDoc: any = {
      ...document,
      id: document.id?.trim(),
    };

    // Sanitize document content
    if ('content' in mutableDoc && mutableDoc.content) {
      mutableDoc.content = this.sanitizeDocumentText(mutableDoc.content);
    }

    // Support legacy 'document' property
    if ('document' in mutableDoc && mutableDoc.document) {
      mutableDoc.document = this.sanitizeDocumentText(mutableDoc.document);
    }

    // Sanitize metadata
    if (mutableDoc.metadata) {
      mutableDoc.metadata = this.sanitizeMetadata(mutableDoc.metadata);
    }

    // Sanitize embedding
    if (mutableDoc.embedding) {
      mutableDoc.embedding = this.sanitizeEmbedding(mutableDoc.embedding);
    }

    return mutableDoc as T;
  }

  /**
   * Sanitize document text content
   */
  private sanitizeDocumentText(text: string): string {
    // Remove null characters and other control characters except newlines and tabs
    let sanitized = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Remove leading/trailing whitespace from each line
    sanitized = sanitized.split('\n').map(line => line.trim()).join('\n');

    // Remove excessive newlines (more than 2 consecutive)
    sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

    return sanitized;
  }

  /**
   * Sanitize and normalize metadata
   */
  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized: ChromaMetadata = {};

    Object.entries(metadata).forEach(([key, value]) => {
      // Skip null and undefined values
      if (value === null || value === undefined) {
        return;
      }

      // Sanitize key (remove special characters, normalize)
      const cleanKey = this.sanitizeMetadataKey(key);
      if (!cleanKey) {
        this.logger.warn(`Skipping metadata key '${key}' - invalid after sanitization`);
        return;
      }

      // Sanitize value based on type
      const cleanValue = this.sanitizeMetadataValue(value);
      if (cleanValue !== null && cleanValue !== undefined) {
        sanitized[cleanKey] = cleanValue;
      }
    });

    return sanitized;
  }

  /**
   * Sanitize metadata key
   */
  private sanitizeMetadataKey(key: string): string {
    if (typeof key !== 'string') {
      return '';
    }

    // Remove leading/trailing whitespace
    let cleanKey = key.trim();

    // Remove or replace invalid characters
    cleanKey = cleanKey.replace(/[^\w\-_.]/g, '_');

    // Ensure it doesn't start with underscore (reserved)
    if (cleanKey.startsWith('_')) {
      cleanKey = 'meta' + cleanKey;
    }

    // Ensure it's not empty
    if (cleanKey.length === 0) {
      return '';
    }

    return cleanKey;
  }

  /**
   * Sanitize metadata value
   */
  private sanitizeMetadataValue(value: any): string | number | boolean {
    // ChromaDB only supports string, number, and boolean values
    if (typeof value === 'string') {
      // Remove null characters and normalize whitespace
      return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
    }

    if (typeof value === 'number') {
      // Ensure it's a finite number
      return isFinite(value) ? value : 0;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    // Convert other types to strings
    if (value !== null && value !== undefined) {
      try {
        return String(value).trim();
      } catch (error) {
        this.logger.warn(`Failed to convert metadata value to string: ${error}`);
        return '';
      }
    }

    return '';
  }

  /**
   * Sanitize embedding vector
   */
  private sanitizeEmbedding(embedding: readonly number[]): number[] {
    if (!Array.isArray(embedding)) {
      this.logger.warn('Invalid embedding type, converting to empty array');
      return [];
    }

    return embedding
      .map(value => {
        // Ensure it's a finite number
        if (typeof value !== 'number' || !isFinite(value)) {
          this.logger.warn(`Invalid embedding value ${value}, replacing with 0`);
          return 0;
        }
        return value;
      })
      .filter(value => value !== null && value !== undefined);
  }

  /**
   * Remove unsafe characters from text
   */
  removeUnsafeCharacters(text: string): string {
    if (typeof text !== 'string') {
      return '';
    }

    // Remove null bytes and other potentially problematic characters
    return text
      .replace(/\0/g, '') // null bytes
      .replace(/[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/g, '') // control characters except \n and \t
      .replace(/\uFEFF/g, '') // BOM
      .replace(/[\uE000-\uF8FF]/g, '') // private use area
      .trim();
  }

  /**
   * Normalize document IDs
   */
  normalizeDocumentId(id: string): string {
    if (typeof id !== 'string') {
      return '';
    }

    // Remove invalid characters and normalize
    let normalized = id
      .trim()
      .replace(/[^\w\-_.]/g, '_') // Replace invalid chars with underscore
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores

    // Ensure it's not empty
    if (normalized.length === 0) {
      normalized = 'doc_' + Date.now();
    }

    // Ensure reasonable length
    if (normalized.length > 100) {
      normalized = normalized.substring(0, 100);
    }

    return normalized;
  }

  /**
   * Validate and clean collection name
   */
  sanitizeCollectionName(name: string): string {
    if (typeof name !== 'string') {
      throw new ChromaDBValidationError('Collection name must be a string', '', null);
    }

    let sanitized = name.trim().toLowerCase();

    // Replace invalid characters with underscores
    sanitized = sanitized.replace(/[^a-z0-9._-]/g, '_');

    // Ensure it starts with alphanumeric
    if (!/^[a-z0-9]/.test(sanitized)) {
      sanitized = 'col_' + sanitized;
    }

    // Remove consecutive dots, underscores, or hyphens
    sanitized = sanitized.replace(/[._-]+/g, '_');

    // Ensure it doesn't end with special characters
    sanitized = sanitized.replace(/[._-]+$/, '');

    // Ensure reasonable length
    if (sanitized.length > 63) {
      sanitized = sanitized.substring(0, 63);
    }

    if (sanitized.length === 0) {
      sanitized = 'collection';
    }

    return sanitized;
  }
}
