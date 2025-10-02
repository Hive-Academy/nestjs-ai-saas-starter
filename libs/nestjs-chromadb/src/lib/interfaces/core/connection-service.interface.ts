/**
 * Connection-focused service interface following Interface Segregation Principle
 * Clients needing only connection and health check operations
 */

import type { ChromaClient } from 'chromadb';

/**
 * ChromaDB connection service interface - focused only on connection operations
 */
export interface ChromaDBConnectionServiceInterface {
  /**
   * Get the ChromaDB client instance
   */
  getClient(): ChromaClient;

  /**
   * Check if connection to ChromaDB is healthy
   */
  isHealthy(): Promise<boolean>;

  /**
   * Get heartbeat from ChromaDB server
   */
  heartbeat(): Promise<number>;

  /**
   * Get ChromaDB server version
   */
  version(): Promise<string>;

  /**
   * Reset the entire ChromaDB instance (use with caution)
   */
  reset(): Promise<boolean>;
}
