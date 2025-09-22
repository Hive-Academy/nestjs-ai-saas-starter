/**
 * @fileoverview Generic Document Type System for ChromaDB
 * 
 * This module provides generic document interfaces and utilities WITHOUT coupling
 * to specific business logic. Consumer applications define their own document types
 * using these generic foundations.
 */

/**
 * Base document interface that all ChromaDB documents should extend
 * Consumer applications can extend this with their specific metadata types
 */
export interface BaseDocument<TMetadata = Record<string, unknown>> {
  readonly id: string;
  readonly content: string;
  readonly metadata: TMetadata;
  readonly embedding?: readonly number[];
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly version?: number;
}

/**
 * Generic collection-to-document type mapping interface
 * Consumer applications should define their own mapping like:
 * 
 * interface MyCollectionDocumentMap {
 *   'users': UserDocument;
 *   'products': ProductDocument;
 *   'orders': OrderDocument;
 * }
 */
export interface CollectionDocumentMap<T extends string = string> {
  [K in T]: BaseDocument<any>;
}

/**
 * Type utility to get document type for a collection
 * Usage: DocumentTypeForCollection<MyCollectionDocumentMap, 'users'>
 */
export type DocumentTypeForCollection<
  TMap extends CollectionDocumentMap,
  TCollection extends keyof TMap
> = TMap[TCollection];

/**
 * Type utility to extract metadata type for a collection
 * Usage: MetadataTypeForCollection<MyCollectionDocumentMap, 'users'>
 */
export type MetadataTypeForCollection<
  TMap extends CollectionDocumentMap,
  TCollection extends keyof TMap
> = TMap[TCollection]['metadata'];

/**
 * Generic document validation schema interface
 * Consumer applications can define validation rules for their documents
 */
export interface DocumentValidationSchema {
  required: readonly string[];
  optional: readonly string[];
  types?: Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>;
  patterns?: Record<string, RegExp>;
  ranges?: Record<string, { min?: number; max?: number }>;
}

/**
 * Generic document validation result
 */
export interface DocumentValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Abstract document validator that consumer applications can extend
 */
export abstract class BaseDocumentValidator<TDocument extends BaseDocument> {
  protected abstract getSchema(): DocumentValidationSchema;

  /**
   * Validate a document against the schema
   */
  validate(document: TDocument): DocumentValidationResult {
    const schema = this.getSchema();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    for (const field of schema.required) {
      if (!(field in document.metadata)) {
        errors.push(`Required field '${field}' is missing`);
      }
    }

    // Check field types if specified
    if (schema.types) {
      for (const [field, expectedType] of Object.entries(schema.types)) {
        if (field in document.metadata) {
          const actualType = this.getFieldType(document.metadata[field]);
          if (actualType !== expectedType) {
            errors.push(`Field '${field}' should be ${expectedType}, got ${actualType}`);
          }
        }
      }
    }

    // Check patterns if specified
    if (schema.patterns) {
      for (const [field, pattern] of Object.entries(schema.patterns)) {
        if (field in document.metadata) {
          const value = document.metadata[field];
          if (typeof value === 'string' && !pattern.test(value)) {
            errors.push(`Field '${field}' does not match required pattern`);
          }
        }
      }
    }

    // Check ranges if specified
    if (schema.ranges) {
      for (const [field, range] of Object.entries(schema.ranges)) {
        if (field in document.metadata) {
          const value = document.metadata[field];
          if (typeof value === 'number') {
            if (range.min !== undefined && value < range.min) {
              errors.push(`Field '${field}' should be >= ${range.min}`);
            }
            if (range.max !== undefined && value > range.max) {
              errors.push(`Field '${field}' should be <= ${range.max}`);
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private getFieldType(value: unknown): string {
    if (value === null || value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }
}

/**
 * Document transformation utilities
 */
export class DocumentTransformUtils {
  /**
   * Transform a document to include only specified fields
   */
  static pick<T extends BaseDocument, K extends keyof T>(
    document: T,
    fields: K[]
  ): Pick<T, K> {
    const result = {} as Pick<T, K>;
    for (const field of fields) {
      if (field in document) {
        result[field] = document[field];
      }
    }
    return result;
  }

  /**
   * Transform a document to exclude specified fields
   */
  static omit<T extends BaseDocument, K extends keyof T>(
    document: T,
    fields: K[]
  ): Omit<T, K> {
    const result = { ...document };
    for (const field of fields) {
      delete result[field];
    }
    return result;
  }

  /**
   * Deep clone a document
   */
  static clone<T extends BaseDocument>(document: T): T {
    return JSON.parse(JSON.stringify(document));
  }

  /**
   * Merge two documents (second document takes precedence)
   */
  static merge<T extends BaseDocument>(doc1: T, doc2: Partial<T>): T {
    return {
      ...doc1,
      ...doc2,
      metadata: {
        ...doc1.metadata,
        ...doc2.metadata,
      },
    };
  }

  /**
   * Extract metadata fields that match a pattern
   */
  static extractMetadataByPattern<T extends BaseDocument>(
    document: T,
    pattern: RegExp
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(document.metadata)) {
      if (pattern.test(key)) {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Sanitize metadata by removing null/undefined values
   */
  static sanitizeMetadata<T extends BaseDocument>(document: T): T {
    const sanitized = { ...document };
    const cleanMetadata: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(document.metadata)) {
      if (value !== null && value !== undefined) {
        cleanMetadata[key] = value;
      }
    }
    
    sanitized.metadata = cleanMetadata as T['metadata'];
    return sanitized;
  }
}

/**
 * Document query builder utilities
 */
export class DocumentQueryBuilder<TDocument extends BaseDocument> {
  private filters: Record<string, unknown> = {};

  /**
   * Add an equality filter
   */
  where(field: string, value: unknown): this {
    this.filters[field] = { $eq: value };
    return this;
  }

  /**
   * Add an "in" filter
   */
  whereIn(field: string, values: unknown[]): this {
    this.filters[field] = { $in: values };
    return this;
  }

  /**
   * Add a "not in" filter
   */
  whereNotIn(field: string, values: unknown[]): this {
    this.filters[field] = { $nin: values };
    return this;
  }

  /**
   * Add a range filter
   */
  whereRange(field: string, min?: number, max?: number): this {
    const filter: Record<string, unknown> = {};
    if (min !== undefined) filter.$gte = min;
    if (max !== undefined) filter.$lte = max;
    this.filters[field] = filter;
    return this;
  }

  /**
   * Add a text contains filter
   */
  whereContains(field: string, text: string): this {
    this.filters[field] = { $contains: text };
    return this;
  }

  /**
   * Add a text does not contain filter
   */
  whereNotContains(field: string, text: string): this {
    this.filters[field] = { $not_contains: text };
    return this;
  }

  /**
   * Build the final filter object
   */
  build(): Record<string, unknown> {
    return { ...this.filters };
  }

  /**
   * Reset the builder
   */
  reset(): this {
    this.filters = {};
    return this;
  }
}

/**
 * Type-safe document factory
 */
export abstract class BaseDocumentFactory<TDocument extends BaseDocument> {
  /**
   * Create a new document with default values
   */
  abstract create(data: Partial<TDocument>): TDocument;

  /**
   * Create multiple documents
   */
  createMany(dataArray: Partial<TDocument>[]): TDocument[] {
    return dataArray.map(data => this.create(data));
  }

  /**
   * Create a document from partial data with validation
   */
  createWithValidation(
    data: Partial<TDocument>,
    validator: BaseDocumentValidator<TDocument>
  ): { document?: TDocument; validation: DocumentValidationResult } {
    const document = this.create(data);
    const validation = validator.validate(document);
    
    return {
      document: validation.valid ? document : undefined,
      validation,
    };
  }
}

/**
 * Generic type guards for runtime type checking
 */
export function isBaseDocument(value: unknown): value is BaseDocument {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'content' in value &&
    'metadata' in value &&
    typeof (value as any).id === 'string' &&
    typeof (value as any).content === 'string' &&
    typeof (value as any).metadata === 'object'
  );
}

export function hasRequiredMetadataFields<T extends BaseDocument>(
  document: T,
  requiredFields: string[]
): boolean {
  return requiredFields.every(field => field in document.metadata);
}

export function isDocumentOfType<T extends BaseDocument>(
  document: BaseDocument,
  typeGuard: (doc: BaseDocument) => doc is T
): doc is T {
  return typeGuard(document);
}

/**
 * Example usage for consumer applications:
 * 
 * // 1. Define your document types
 * interface UserDocument extends BaseDocument<{
 *   name: string;
 *   email: string;
 *   age: number;
 *   tags: string[];
 * }> {}
 * 
 * // 2. Create your collection-document mapping
 * interface MyCollectionDocumentMap extends CollectionDocumentMap {
 *   'users': UserDocument;
 *   'products': ProductDocument;
 *   'orders': OrderDocument;
 * }
 * 
 * // 3. Create validators
 * class UserDocumentValidator extends BaseDocumentValidator<UserDocument> {
 *   protected getSchema(): DocumentValidationSchema {
 *     return {
 *       required: ['name', 'email'],
 *       optional: ['age', 'tags'],
 *       types: {
 *         name: 'string',
 *         email: 'string',
 *         age: 'number',
 *         tags: 'array',
 *       },
 *       patterns: {
 *         email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
 *       },
 *       ranges: {
 *         age: { min: 0, max: 150 },
 *       },
 *     };
 *   }
 * }
 * 
 * // 4. Create factories
 * class UserDocumentFactory extends BaseDocumentFactory<UserDocument> {
 *   create(data: Partial<UserDocument>): UserDocument {
 *     return {
 *       id: data.id || crypto.randomUUID(),
 *       content: data.content || '',
 *       metadata: {
 *         name: '',
 *         email: '',
 *         age: 0,
 *         tags: [],
 *         ...data.metadata,
 *       },
 *       createdAt: new Date().toISOString(),
 *       version: 1,
 *       ...data,
 *     };
 *   }
 * }
 * 
 * // 5. Use with type safety
 * const factory = new UserDocumentFactory();
 * const validator = new UserDocumentValidator();
 * 
 * const { document, validation } = factory.createWithValidation({
 *   content: 'User profile content',
 *   metadata: {
 *     name: 'John Doe',
 *     email: 'john@example.com',
 *     age: 30,
 *   },
 * }, validator);
 * 
 * if (validation.valid && document) {
 *   // document is fully typed as UserDocument
 *   console.log(document.metadata.name); // TypeScript knows this is a string
 * }
 */