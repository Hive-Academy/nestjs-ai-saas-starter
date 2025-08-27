// Injection tokens for ChromaDB module
export const CHROMADB_OPTIONS = Symbol('CHROMADB_OPTIONS');
export const CHROMADB_CLIENT = Symbol('CHROMADB_CLIENT');
export const CHROMADB_CONNECTION = Symbol('CHROMADB_CONNECTION');

// Default configuration values
export const DEFAULT_CHROMA_HOST = 'localhost';
export const DEFAULT_CHROMA_PORT = 8000;
export const DEFAULT_CHROMA_SSL = false;
export const DEFAULT_COLLECTION_NAME = 'default';
export const DEFAULT_BATCH_SIZE = 100;
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_RETRY_DELAY = 1000;

// Embedding provider types (enum version)
export enum EmbeddingProviderEnum {
  HUGGINGFACE = 'huggingface',
  OPENAI = 'openai',
  COHERE = 'cohere',
  CUSTOM = 'custom',
  LOCAL = 'local',
}

// Collection metadata defaults
export const DEFAULT_COLLECTION_METADATA = {
  'hnsw:space': 'cosine',
  'hnsw:construction_ef': 200,
  'hnsw:M': 16,
};

// Error messages
export const ERRORS = {
  CONNECTION_FAILED: 'Failed to connect to ChromaDB',
  COLLECTION_NOT_FOUND: 'Collection not found',
  DOCUMENT_NOT_FOUND: 'Document not found',
  EMBEDDING_FAILED: 'Failed to generate embeddings',
  SEARCH_FAILED: 'Search operation failed',
  INVALID_CONFIG: 'Invalid ChromaDB configuration',
  NOT_INITIALIZED: 'ChromaDB client not initialized',
};
