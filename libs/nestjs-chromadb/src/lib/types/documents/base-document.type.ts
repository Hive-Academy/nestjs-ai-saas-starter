/**
 * Base document types following Interface Segregation Principle
 * Focused on core document structure and behavior
 */

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
  readonly document?: string; // ChromaDB expects 'document' not 'content'
  readonly metadata?: Record<string, any>; // ChromaDB metadata compatible type
  readonly embedding?: number[]; // Mutable array for ChromaDB operations
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
export function isChromaWireDocument(
  value: unknown
): value is ChromaWireDocument {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as ChromaWireDocument).id === 'string'
  );
}

/**
 * Type guard for document arrays
 */
export function isDocumentArray(value: unknown): value is BaseDocument[] {
  return Array.isArray(value) && value.every((item) => isBaseDocument(item));
}

/**
 * Get content from either document type (union type handler)
 */
export function getContentFromDocument(
  doc: ChromaWireDocument | BaseDocument
): string {
  if ('document' in doc && doc.document !== undefined) {
    return doc.document; // ChromaWireDocument
  }
  if ('content' in doc) {
    return doc.content; // BaseDocument
  }
  return '';
}

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
