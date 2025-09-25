/**
 * Document-focused service interface following Interface Segregation Principle
 * Clients needing only document operations (CRUD)
 */

import type {
  BaseDocument,
  GetDocumentsOptions,
  ChromaBulkOptions,
} from '../../types/documents';

/**
 * ChromaDB document service interface - focused only on document CRUD operations
 */
export interface ChromaDBDocumentServiceInterface {
  /**
   * Add documents to a collection
   */
  addDocuments<T extends BaseDocument>(
    collectionName: string,
    documents: T[],
    options?: ChromaBulkOptions
  ): Promise<void>;

  /**
   * Update documents in a collection
   */
  updateDocuments<T extends BaseDocument>(
    collectionName: string,
    documents: T[],
    options?: ChromaBulkOptions
  ): Promise<void>;

  /**
   * Upsert documents in a collection
   */
  upsertDocuments<T extends BaseDocument>(
    collectionName: string,
    documents: T[],
    options?: ChromaBulkOptions
  ): Promise<void>;

  /**
   * Delete documents from a collection
   */
  deleteDocuments(
    collectionName: string,
    ids?: string[],
    where?: Record<string, any>,
    whereDocument?: Record<string, any>
  ): Promise<void>;

  /**
   * Get documents from a collection
   */
  getDocuments(
    collectionName: string,
    options?: GetDocumentsOptions
  ): Promise<any>; // Uses ChromaDB's native GetResult

  /**
   * Count documents in a collection
   */
  countDocuments(collectionName: string): Promise<number>;

  /**
   * Peek at documents in a collection
   */
  peekDocuments(collectionName: string, limit?: number): Promise<any>; // Uses ChromaDB's native GetResult
}
