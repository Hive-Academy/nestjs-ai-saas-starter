/**
 * Search-focused service interface following Interface Segregation Principle
 * Clients needing only search and similarity operations
 */

import type {
  ChromaSearchOptions,
  ChromaSearchResult,
} from '../../types/documents';

/**
 * ChromaDB search service interface - focused only on search operations
 */
export interface ChromaDBSearchServiceInterface {
  /**
   * Search for similar documents
   */
  searchDocuments(
    collectionName: string,
    queryTexts?: string[],
    queryEmbeddings?: number[][],
    options?: ChromaSearchOptions
  ): Promise<ChromaSearchResult>;

  /**
   * Similarity search with automatic embedding generation
   */
  similaritySearch(
    collectionName: string,
    query: string,
    options?: {
      limit?: number;
      where?: Record<string, any>;
      whereDocument?: Record<string, any>;
    }
  ): Promise<{
    ids: string[];
    documents: (string | null)[];
    metadatas: (Record<string, unknown> | null)[];
    distances: number[];
  }>;
}
