import type {
  ModuleMetadata,
  Type,
  Provider,
  InjectionToken,
  OptionalFactoryDependency,
} from '@nestjs/common';
import type { EmbeddingFunction, CollectionMetadata } from 'chromadb';

/**
 * HTTP client configuration options
 */
export interface HttpClientOptions {
  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Maximum number of retries for failed requests (default: 3)
   */
  maxRetries?: number;

  /**
   * Initial delay between retries in milliseconds (default: 1000)
   */
  retryDelay?: number;

  /**
   * Backoff factor for exponential retry delay (default: 2)
   */
  retryBackoffFactor?: number;
}

/**
 * ChromaDB client configuration options
 * Uses host/port/ssl instead of deprecated 'path' parameter
 */
export interface ChromaDBClientOptions {
  /**
   * ChromaDB server host - REQUIRED in production
   */
  host: string;

  /**
   * ChromaDB server port (default: 8000)
   */
  port?: number;

  /**
   * Use SSL connection (default: false)
   */
  ssl?: boolean;

  /**
   * The tenant name in the Chroma server to connect to
   */
  tenant?: string;

  /**
   * The database name to connect to
   */
  database?: string;

  /**
   * Authentication configuration
   */
  auth?: {
    provider?: 'basic' | 'token';
    credentials?: string;
  };

  /**
   * HTTP client configuration for ChromaDB requests
   */
  http?: HttpClientOptions;
}

/**
 * Embedding provider types
 */
export type EmbeddingProviderType =
  | 'openai'
  | 'huggingface'
  | 'cohere'
  | 'custom';

/**
 * Input validation configuration
 */
export interface InputValidationConfig {
  /**
   * Maximum text length per input (default: 8000)
   */
  maxTextLength?: number;

  /**
   * Maximum number of inputs per batch
   */
  maxBatchSize?: number;

  /**
   * Validate API key format
   */
  validateApiKey?: boolean;

  /**
   * Estimate token count for rate limiting
   */
  estimateTokens?: boolean;
}

/**
 * OpenAI embedding configuration
 */
export interface OpenAIEmbeddingConfig {
  apiKey: string;
  model?: string; // default: 'text-embedding-3-small'
  apiEndpoint?: string; // default: 'https://api.openai.com/v1/embeddings'
  organization?: string;
  dimensions?: number;
  batchSize?: number;
  maxInputTokens?: number;
  http?: HttpClientOptions;
  validation?: InputValidationConfig;
}

/**
 * HuggingFace embedding configuration
 */
export interface HuggingFaceEmbeddingConfig {
  apiKey?: string;
  model?: string; // default: 'sentence-transformers/all-MiniLM-L6-v2'
  apiEndpoint?: string;
  dimensions?: number;
  batchSize?: number;
  http?: HttpClientOptions;
  validation?: InputValidationConfig;
}

/**
 * Cohere embedding configuration
 */
export interface CohereEmbeddingConfig {
  apiKey: string;
  model?: string; // default: 'embed-english-v3.0'
  apiEndpoint?: string; // default: 'https://api.cohere.ai/v1/embed'
  dimensions?: number;
  batchSize?: number;
  http?: HttpClientOptions;
  validation?: InputValidationConfig;
}

/**
 * Custom embedding function interface
 */
export interface CustomEmbeddingConfig {
  embed: (texts: string[]) => Promise<number[][]>;
  dimension: number;
  batchSize?: number;
  http?: HttpClientOptions;
  validation?: InputValidationConfig;
}

/**
 * Embedding configuration union type
 */
export type EmbeddingConfig =
  | { provider: 'openai'; config: OpenAIEmbeddingConfig }
  | { provider: 'huggingface'; config: HuggingFaceEmbeddingConfig }
  | { provider: 'cohere'; config: CohereEmbeddingConfig }
  | { provider: 'custom'; config: CustomEmbeddingConfig };

/**
 * Collection configuration for forFeature
 */
export interface CollectionConfig {
  name: string;
  metadata?: CollectionMetadata;
  embeddingFunction?: EmbeddingFunction;
}

/**
 * Text processing configuration
 */
export interface TextProcessingConfig {
  /**
   * Default chunk size for text splitting (default: 1000)
   */
  chunkSize?: number;

  /**
   * Default chunk overlap for text splitting (default: 200)
   */
  chunkOverlap?: number;

  /**
   * Maximum text length for processing (default: 8000)
   */
  maxTextLength?: number;
}

/**
 * ChromaDB module configuration options
 */
export interface ChromaDBModuleOptions {
  /**
   * ChromaDB client connection options
   */
  connection: ChromaDBClientOptions;

  /**
   * Embedding provider configuration
   */
  embedding?: EmbeddingConfig;

  /**
   * Default collection name for operations
   */
  defaultCollection?: string;

  /**
   * Batch size for bulk operations (default: 100)
   */
  batchSize?: number;

  /**
   * Maximum number of connection retries (default: 3)
   * @deprecated Use connection.http.maxRetries instead
   */
  maxRetries?: number;

  /**
   * Delay between retries in milliseconds (default: 1000)
   * @deprecated Use connection.http.retryDelay instead
   */
  retryDelay?: number;

  /**
   * Enable connection health checks
   */
  enableHealthCheck?: boolean;

  /**
   * Health check interval in milliseconds (default: 30000)
   */
  healthCheckInterval?: number;

  /**
   * Log connection details on startup
   */
  logConnection?: boolean;

  /**
   * Log embedding operations for debugging
   */
  logEmbeddingOperations?: boolean;

  /**
   * Text processing configuration
   */
  textProcessing?: TextProcessingConfig;

  /**
   * Global HTTP client configuration
   */
  http?: HttpClientOptions;

  /**
   * Global input validation configuration
   */
  validation?: InputValidationConfig;
}

/**
 * Factory interface for creating ChromaDB module options
 */
export interface ChromaDBOptionsFactory {
  createChromaDBOptions: () =>
    | Promise<ChromaDBModuleOptions>
    | ChromaDBModuleOptions;
}

/**
 * Asynchronous configuration options for ChromaDB module
 */
export interface ChromaDBModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<ChromaDBOptionsFactory>;
  useClass?: Type<ChromaDBOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<ChromaDBModuleOptions> | ChromaDBModuleOptions;
  inject?: Array<InjectionToken | OptionalFactoryDependency>;
  extraProviders?: Provider[];
}
