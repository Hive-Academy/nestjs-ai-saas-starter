/**
 * Connection-focused interface following Interface Segregation Principle
 * Handles only connection, authentication, and client configuration
 */

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
 * Collection configuration for forFeature
 */
export interface CollectionConfig {
  name: string;
  metadata?: CollectionMetadata;
  embeddingFunction?: EmbeddingFunction;
}

/**
 * Connection-focused interface - clients needing only connection setup
 */
export interface ChromaDBConnectionOptions {
  /**
   * ChromaDB client connection options
   */
  connection: ChromaDBClientOptions;

  /**
   * Default collection name for operations
   */
  defaultCollection?: string;

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
