/**
 * Vector Database Interface
 * 
 * This interface abstracts vector database operations to avoid direct coupling
 * with ChromaDBService. Any vector database implementation (ChromaDB, Pinecone, 
 * Weaviate, etc.) can implement this interface.
 */
export interface IVectorDatabase {
  /**
   * Add documents with embeddings to a collection
   */
  addDocuments(
    collectionName: string,
    params: {
      ids: string[];
      documents: string[];
      metadatas?: Record<string, any>[];
      embeddings?: number[][];
    }
  ): Promise<void>;

  /**
   * Query documents by similarity
   */
  queryDocuments(
    collectionName: string,
    params: {
      queryTexts?: string[];
      queryEmbeddings?: number[][];
      nResults?: number;
      where?: Record<string, any>;
      include?: string[];
    }
  ): Promise<{
    ids: string[][];
    documents?: string[][];
    metadatas?: Record<string, any>[][];
    distances?: number[][];
    embeddings?: number[][][];
  }>;

  /**
   * Get documents by IDs
   */
  getDocuments(
    collectionName: string,
    params: {
      ids?: string[];
      where?: Record<string, any>;
      limit?: number;
      offset?: number;
      include?: string[];
    }
  ): Promise<{
    ids: string[];
    documents?: string[];
    metadatas?: Record<string, any>[];
    embeddings?: number[][];
  }>;

  /**
   * Update documents in collection
   */
  updateDocuments(
    collectionName: string,
    params: {
      ids: string[];
      documents?: string[];
      metadatas?: Record<string, any>[];
      embeddings?: number[][];
    }
  ): Promise<void>;

  /**
   * Delete documents from collection
   */
  deleteDocuments(
    collectionName: string,
    params: {
      ids?: string[];
      where?: Record<string, any>;
    }
  ): Promise<void>;

  /**
   * Create a collection
   */
  createCollection(
    name: string,
    metadata?: Record<string, any>
  ): Promise<void>;

  /**
   * Delete a collection
   */
  deleteCollection(name: string): Promise<void>;

  /**
   * Get or create a collection
   */
  getOrCreateCollection(
    name: string,
    metadata?: Record<string, any>
  ): Promise<any>;

  /**
   * List all collections
   */
  listCollections(): Promise<string[]>;

  /**
   * Count documents in collection
   */
  countDocuments(collectionName: string): Promise<number>;

  /**
   * Peek at documents in collection
   */
  peekDocuments(
    collectionName: string,
    limit?: number
  ): Promise<{
    ids: string[];
    documents?: string[];
    metadatas?: Record<string, any>[];
  }>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Vector database provider token for dependency injection
 */
export const VECTOR_DATABASE_PROVIDER = 'VECTOR_DATABASE_PROVIDER';