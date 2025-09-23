/**
 * @fileoverview Consolidated Core Type System for ChromaDB Integration
 *
 * This is the SINGLE SOURCE OF TRUTH for all document and validation types.
 * Uses proper layering: Application types (BaseDocument) + Wire types (ChromaDB native)
 */

import type { Metadata, GetResult, QueryResult } from 'chromadb';

// ========================================
// Core Document Types (Application Layer)
// ========================================

/**
 * Base document interface - PRIMARY document type for all application code
 * This is the main interface consumers should use and extend
 */
export interface BaseDocument<TMetadata = Record<string, any>> {
  readonly id: string;
  readonly content: string;
  readonly metadata: TMetadata;
  readonly embedding?: readonly number[];
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly version?: number;
}

/**
 * ChromaDB wire document type - for actual ChromaDB operations only
 * Uses ChromaDB's expected property names and types
 */
export interface ChromaWireDocument {
  readonly id: string;
  readonly document?: string;  // ChromaDB expects 'document' not 'content'
  readonly metadata?: Metadata; // ChromaDB's native Metadata type
  readonly embedding?: number[]; // Mutable array for ChromaDB operations
}

// ========================================
// Search and Query Types
// ========================================

/**
 * Search options for ChromaDB operations
 */
export interface ChromaSearchOptions {
  readonly nResults?: number;
  readonly where?: Record<string, any>;
  readonly whereDocument?: Record<string, any>;
  readonly includeMetadata?: boolean;
  readonly includeDocuments?: boolean;
  readonly includeDistances?: boolean;
  readonly includeEmbeddings?: boolean;
}

/**
 * Search result type - uses ChromaDB's native QueryResult
 */
export type ChromaSearchResult<TMetadata = Metadata> = QueryResult<TMetadata>;

/**
 * Options for getting documents
 */
export interface GetDocumentsOptions {
  readonly ids?: string[];
  readonly where?: Record<string, any>;
  readonly limit?: number;
  readonly offset?: number;
  readonly whereDocument?: Record<string, any>;
  readonly include?: ReadonlyArray<'metadatas' | 'documents' | 'distances' | 'embeddings'>;
  readonly includeMetadata?: boolean;
  readonly includeDocuments?: boolean;
  readonly includeEmbeddings?: boolean;
}

/**
 * Bulk operation options
 */
export interface ChromaBulkOptions {
  readonly batchSize?: number;
  readonly upsert?: boolean;
  readonly validateIds?: boolean;
  readonly autoChunk?: boolean;
  readonly chunkingStrategy?: 'recursive' | 'token' | 'character' | 'markdown' | 'semantic' | 'smart';
  readonly chunkSize?: number;
  readonly chunkOverlap?: number;
  readonly preserveChunkRelationships?: boolean;
  readonly extractMetadata?: boolean;
  readonly extractTopics?: boolean;
  readonly extractKeywords?: boolean;
  readonly analyzeComplexity?: boolean;
  readonly calculateReadingTime?: boolean;
  readonly detectCrossReferences?: boolean;
  readonly extractCodeMetadata?: boolean;
}

// ========================================
// Collection Types
// ========================================

/**
 * Collection information
 */
export interface ChromaCollectionInfo<TMetadata = Metadata> {
  readonly name: string;
  readonly id: string;
  readonly metadata?: TMetadata;
  readonly dimension?: number;
  readonly count?: number;
}

// ========================================
// Validation Types (SINGLE SOURCE OF TRUTH)
// ========================================

/**
 * Document validation schema
 */
export interface DocumentValidationSchema {
  readonly requireId?: boolean;  readonly requireDocument?: boolean;  readonly requireMetadata?: boolean;  readonly maxDocumentLength?: number;
  readonly required?: readonly string[];
  readonly optional?: readonly string[];
  readonly types?: Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>;
  readonly patterns?: Record<string, RegExp>;
  readonly ranges?: Record<string, { readonly min?: number; readonly max?: number }>;
}

/**
 * Validation result - SINGLE interface for all validation operations
 */
/**
 * Mutable validation result for internal use during validation
 */
export interface MutableValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedData?: any;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors:  string[];
  readonly warnings:  string[];
  readonly validatedData?: any;
}

// ========================================
// Type Conversion Utilities
// ========================================

/**
 * Convert BaseDocument to ChromaWireDocument for ChromaDB operations
 */
export function toChromaWireDocument<T extends BaseDocument>(doc: T): ChromaWireDocument {
  return {
    id: doc.id,
    document: doc.content,
    metadata: doc.metadata as Metadata,
    embedding: doc.embedding ? [...doc.embedding] : undefined,
  };
}

/**
 * Convert ChromaWireDocument to BaseDocument for application use
 */
export function fromChromaWireDocument<TMetadata = Record<string, any>>(
  wireDoc: ChromaWireDocument,
  additionalFields?: Partial<BaseDocument<TMetadata>>
): BaseDocument<TMetadata> {
  return {
    id: wireDoc.id,
    content: wireDoc.document || '',
    metadata: (wireDoc.metadata || {}) as TMetadata,
    embedding: wireDoc.embedding ? Object.freeze([...wireDoc.embedding]) : undefined,
    ...additionalFields,
  };
}

/**
 * Convert array of BaseDocuments to ChromaWireDocuments
 */
export function toChromaWireDocuments<T extends BaseDocument>(docs: readonly T[]): ChromaWireDocument[] {
  return docs.map(toChromaWireDocument);
}

/**
 * Convert array of ChromaWireDocuments to BaseDocuments
 */
export function fromChromaWireDocuments<TMetadata = Record<string, any>>(
  wireDocs: readonly ChromaWireDocument[]
): BaseDocument<TMetadata>[] {
  return wireDocs.map(doc => fromChromaWireDocument<TMetadata>(doc));
}

/**
 * Type guard for BaseDocument
 */
export function isBaseDocument(value: unknown): value is BaseDocument {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'content' in value &&
    'metadata' in value &&
    typeof (value as BaseDocument).id === 'string' &&
    typeof (value as BaseDocument).content === 'string' &&
    typeof (value as BaseDocument).metadata === 'object'
  );
}

/**
 * Type guard for ChromaWireDocument
 */
export function isChromaWireDocument(value: unknown): value is ChromaWireDocument {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as ChromaWireDocument).id === 'string'
  );
}

// ========================================
// Collection Document Mapping (Generic Foundation)
// ========================================

/**
 * Generic collection-to-document type mapping interface
 * Consumer applications should define their own mapping
 */
export type CollectionDocumentMap<T extends string = string> = {
  readonly [K in T]: BaseDocument<Record<string, any>>;
};

/**
 * Type utility to get document type for a collection
 */
export type DocumentTypeForCollection<
  TMap extends CollectionDocumentMap,
  TCollection extends keyof TMap
> = TMap[TCollection];

/**
 * Type utility to extract metadata type for a collection
 */
export type MetadataTypeForCollection<
  TMap extends CollectionDocumentMap,
  TCollection extends keyof TMap
> = TMap[TCollection] extends BaseDocument<infer TMeta> ? TMeta : never;
