import { Injectable, Logger } from '@nestjs/common';
import type { Metadata as ChromaMetadata } from 'chromadb';
import type {
  ChromaBulkOptions,
  ChromaSearchOptions,
  DocumentValidationSchema,
  ValidationResult,
} from '../../types/core.interface';
import { IChromaValidation } from '../../interfaces/core/database-abstractions.interface';
import type { BaseDocument } from '../../types/core.interface';
import { DocumentValidatorService } from './validation/document-validator.service';
import { OptionsValidatorService } from './validation/options-validator.service';
import { DocumentSanitizerService } from './validation/document-sanitizer.service';

/**
 * ChromaDB Validation Service - Facade Pattern
 *
 * Coordinates specialized validation services to provide complete validation interface
 * Following Facade Pattern - delegates to focused validation services
 */
@Injectable()
export class ChromaDBValidationService implements IChromaValidation {
  private readonly logger = new Logger(ChromaDBValidationService.name);

  constructor(
    private readonly documentValidator: DocumentValidatorService,
    private readonly optionsValidator: OptionsValidatorService,
    private readonly documentSanitizer: DocumentSanitizerService
  ) {}

  /**
   * Validate a single document with type safety
   */
  validateDocument<T extends BaseDocument>(
    document: T,
    schema?: DocumentValidationSchema
  ): ValidationResult {
    return this.documentValidator.validateDocument(document, schema);
  }

  /**
   * Validate multiple documents with type safety
   */
  validateDocuments<T extends BaseDocument>(
    documents: T[],
    schema?: DocumentValidationSchema
  ): ValidationResult {
    return this.documentValidator.validateDocuments(documents, schema);
  }

  /**
   * Validate metadata object
   */
  validateMetadata(
    metadata: ChromaMetadata,
    schema?: DocumentValidationSchema
  ): ValidationResult {
    return this.documentValidator.validateMetadata(metadata, schema);
  }

  /**
   * Validate embedding vector
   */
  validateEmbedding(embedding: number[]): ValidationResult {
    return this.documentValidator.validateEmbedding(embedding);
  }

  /**
   * Validate collection name
   */
  validateCollectionName(name: string): ValidationResult {
    return this.optionsValidator.validateCollectionName(name);
  }

  /**
   * Validate bulk options
   */
  validateBulkOptions(options: ChromaBulkOptions): ValidationResult {
    return this.optionsValidator.validateBulkOptions(options);
  }

  /**
   * Validate search options
   */
  validateSearchOptions(options: ChromaSearchOptions): ValidationResult {
    return this.optionsValidator.validateSearchOptions(options);
  }

  /**
   * Validate and sanitize documents before operation with type safety
   */
  validateAndSanitize<T extends BaseDocument>(
    documents: T[],
    schema?: DocumentValidationSchema,
    throwOnError = true
  ): T[] {
    return this.documentSanitizer.validateAndSanitize(
      documents,
      schema,
      throwOnError
    );
  }

  /**
   * Sanitize a single document with type safety
   */
  sanitizeDocument<T extends BaseDocument>(document: T): T {
    return this.documentSanitizer.sanitizeDocument(document);
  }
}
