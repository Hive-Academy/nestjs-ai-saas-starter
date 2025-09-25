/**
 * Query-focused types following Interface Segregation Principle
 * Handles search options, query parameters and search behavior
 */

import type { QueryResult, Metadata } from 'chromadb';

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
export type ChromaSearchResult<TMetadata extends Metadata = Metadata> =
  QueryResult<TMetadata>;

/**
 * Options for getting documents
 */
export interface GetDocumentsOptions {
  readonly ids?: string[];
  readonly where?: Record<string, any>;
  readonly limit?: number;
  readonly offset?: number;
  readonly whereDocument?: Record<string, any>;
  readonly include?: ReadonlyArray<
    'metadatas' | 'documents' | 'distances' | 'embeddings'
  >;
  readonly includeMetadata?: boolean;
  readonly includeDocuments?: boolean;
  readonly includeEmbeddings?: boolean;
}

/**
 * Create a complete QueryResult with all required properties
 */
export function createQueryResult<TMetadata extends Metadata = Metadata>(
  ids: string[][],
  documents?: (string | null)[][] | null,
  metadatas?: (TMetadata | null)[][] | null,
  distances?: (number | null)[][] | null,
  embeddings?: (number[] | null)[][] | null,
  include?: string[],
  uris?: (string | null)[][] | null
): QueryResult<TMetadata> {
  return {
    ids,
    documents: documents || [[]],
    metadatas: metadatas || [[]],
    distances: distances || [[]],
    embeddings: embeddings || [[]],
    include: include || [],
    uris: uris || [[]],
  } as QueryResult<TMetadata>;
}
