/**
 * Embedding-focused interface following Interface Segregation Principle
 * Handles only embedding providers and validation
 */

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
 * HTTP client configuration options for embedding providers
 */
export interface EmbeddingHttpOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  retryBackoffFactor?: number;
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
  http?: EmbeddingHttpOptions;
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
  http?: EmbeddingHttpOptions;
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
  http?: EmbeddingHttpOptions;
  validation?: InputValidationConfig;
}

/**
 * Custom embedding function interface
 */
export interface CustomEmbeddingConfig {
  embed: (texts: string[]) => Promise<number[][]>;
  dimension: number;
  batchSize?: number;
  http?: EmbeddingHttpOptions;
  validation?: InputValidationConfig;
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
 * Embedding configuration union type
 */
export type EmbeddingConfig =
  | { provider: 'openai'; config: OpenAIEmbeddingConfig }
  | { provider: 'huggingface'; config: HuggingFaceEmbeddingConfig }
  | { provider: 'cohere'; config: CohereEmbeddingConfig }
  | { provider: 'custom'; config: CustomEmbeddingConfig };

/**
 * Embedding-focused interface - clients needing only embedding configuration
 */
export interface ChromaDBEmbeddingOptions {
  /**
   * Embedding provider configuration
   */
  embedding?: EmbeddingConfig;

  /**
   * Global input validation configuration
   */
  validation?: InputValidationConfig;

  /**
   * Log embedding operations for debugging
   */
  logEmbeddingOperations?: boolean;
}
