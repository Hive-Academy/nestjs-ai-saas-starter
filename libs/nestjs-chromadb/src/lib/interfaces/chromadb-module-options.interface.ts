import type {
  ModuleMetadata,
  Type,
  Provider,
  InjectionToken,
  OptionalFactoryDependency,
} from '@nestjs/common';
import type { EmbeddingFunction, CollectionMetadata } from 'chromadb';

/**
 * ChromaDB client configuration options
 * Uses host/port/ssl instead of deprecated 'path' parameter
 */
export interface ChromaDBClientOptions {
  /**
   * ChromaDB server host (default: localhost)
   */
  host?: string;

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
 * OpenAI embedding configuration
 */
export interface OpenAIEmbeddingConfig {
  apiKey: string;
  model?: string; // default: 'text-embedding-ada-002'
  organization?: string;
  batchSize?: number;
}

/**
 * HuggingFace embedding configuration
 */
export interface HuggingFaceEmbeddingConfig {
  apiKey?: string;
  model?: string; // default: 'sentence-transformers/all-MiniLM-L6-v2'
  endpoint?: string;
  batchSize?: number;
}

/**
 * Cohere embedding configuration
 */
export interface CohereEmbeddingConfig {
  apiKey: string;
  model?: string; // default: 'embed-english-v2.0'
  batchSize?: number;
}

/**
 * Custom embedding function interface
 */
export interface CustomEmbeddingConfig {
  embed: (texts: string[]) => Promise<number[][]>;
  dimension: number;
  batchSize?: number;
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
   */
  maxRetries?: number;

  /**
   * Delay between retries in milliseconds (default: 1000)
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
