/**
 * @fileoverview Database Abstraction Interfaces - Core ChromaDB Service Contracts
 *
 * This file defines the interfaces for dependency inversion principle implementation,
 * allowing different implementations of core database functionality.
 */

import type {
  ChromaClient,
  Collection,
  CollectionMetadata,
  Where,
  WhereDocument,
  GetResult,
  Metadata as ChromaMetadata,
} from 'chromadb';
import type {
  BaseDocument,
  ChromaWireDocument,
  ChromaSearchResult,
  ChromaCollectionInfo,
  ChromaSearchOptions,
  ChromaBulkOptions,
  GetDocumentsOptions,
  ValidationResult,
  DocumentValidationSchema,
} from '../../types/core.interface';

/**
 * Connection management interface
 */
export interface IChromaConnection {
  /**
   * Establish connection to ChromaDB
   */
  connect(): Promise<void>;

  /**
   * Disconnect from ChromaDB
   */
  disconnect(): Promise<void>;

  /**
   * Get the ChromaDB client instance
   */
  getClient(): ChromaClient;

  /**
   * Check if the connection is healthy
   */
  isHealthy(): Promise<boolean>;

  /**
   * Get connection configuration
   */
  getConfig(): {
    host: string;
    port: number;
    ssl: boolean;
  };

  /**
   * Reconnect to the database
   */
  reconnect(): Promise<void>;
}

/**
 * Core Operations Interface - combines high-level and low-level operations
 *
 * Abstracts CRUD and collection management operations with full type safety
 * Following Interface Segregation Principle
 */
export interface IChromaOperations {
  // High-level Generic Operations (Repository Pattern)
  create<T extends BaseDocument>(collection: string, document: T): Promise<T>;

  createMany<T extends BaseDocument>(
    collection: string,
    documents: T[]
  ): Promise<T[]>;

  findById<T extends BaseDocument>(
    collection: string,
    id: string
  ): Promise<T | null>;

  findByIds<T extends BaseDocument>(
    collection: string,
    ids: string[]
  ): Promise<T[]>;

  findAll<T extends BaseDocument>(
    collection: string,
    options?: {
      where?: Record<string, any>;
      whereDocument?: Record<string, any>;
      limit?: number;
      offset?: number;
    }
  ): Promise<T[]>;

  update<T extends BaseDocument>(
    collection: string,
    id: string,
    updates: Partial<T>
  ): Promise<T>;

  updateMany<T extends BaseDocument>(
    collection: string,
    updates: Array<{ id: string; data: Partial<T> }>
  ): Promise<T[]>;

  delete(collection: string, id: string): Promise<boolean>;

  deleteMany(collection: string, ids: string[]): Promise<boolean>;

  search<T extends BaseDocument>(
    collection: string,
    query: string,
    options?: {
      limit?: number;
      where?: Record<string, any>;
      whereDocument?: Record<string, any>;
    }
  ): Promise<T[]>;

  count(
    collection: string,
    where?: Record<string, any>,
    whereDocument?: Record<string, any>
  ): Promise<number>;

  // Low-level ChromaDB Operations (Raw ChromaDB API)
  listCollections(): Promise<ChromaCollectionInfo[]>;
  createCollection(
    name: string,
    metadata?: Record<string, unknown>,
    embeddingFunction?: unknown,
    getOrCreate?: boolean
  ): Promise<Collection>;
  getCollection(name: string, embeddingFunction?: unknown): Promise<Collection>;
  deleteCollection(name: string): Promise<void>;
  collectionExists(name: string): Promise<boolean>;

  addDocuments(
    collectionName: string,
    documents: ChromaWireDocument[],
    options?: ChromaBulkOptions
  ): Promise<void>;
  updateDocuments(
    collectionName: string,
    documents: ChromaWireDocument[],
    options?: ChromaBulkOptions
  ): Promise<void>;
  upsertDocuments(
    collectionName: string,
    documents: ChromaWireDocument[],
    options?: ChromaBulkOptions
  ): Promise<void>;
  deleteDocuments(
    collectionName: string,
    ids?: string[],
    where?: Where,
    whereDocument?: WhereDocument
  ): Promise<void>;

  getDocuments(
    collectionName: string,
    options?: GetDocumentsOptions
  ): Promise<GetResult>;
  countDocuments(collectionName: string): Promise<number>;
  peekDocuments(collectionName: string, limit?: number): Promise<GetResult>;
  searchDocuments(
    collectionName: string,
    queryTexts: string[],
    queryEmbeddings?: number[][],
    options?: ChromaSearchOptions
  ): Promise<ChromaSearchResult>;

  getCollectionMetadata(name: string): Promise<Record<string, any> | null>;
  updateCollectionMetadata(
    name: string,
    metadata: Record<string, any>
  ): Promise<void>;

  reset(): Promise<boolean>;
}

// DocumentValidationSchema now imported from consolidated types

/**
 * Validation service interface - matches ChromaDBValidationService
 */
export interface IChromaValidation {
  /**
   * Validate a single document with optional schema
   */
  validateDocument<T extends BaseDocument>(
    document: T,
    schema?: DocumentValidationSchema
  ): ValidationResult;

  /**
   * Validate multiple documents with optional schema
   */
  validateDocuments<T extends BaseDocument>(
    documents: T[],
    schema?: DocumentValidationSchema
  ): ValidationResult;

  /**
   * Validate metadata structure
   */
  validateMetadata(
    metadata: ChromaMetadata,
    schema?: DocumentValidationSchema
  ): ValidationResult;

  /**
   * Validate embedding vector
   */
  validateEmbedding(embedding: number[]): ValidationResult;

  /**
   * Validate collection name
   */
  validateCollectionName(name: string): ValidationResult;

  /**
   * Validate bulk operation options
   */
  validateBulkOptions(options: ChromaBulkOptions): ValidationResult;

  /**
   * Validate search options
   */
  validateSearchOptions(options: ChromaSearchOptions): ValidationResult;

  /**
   * Validate and sanitize documents before operation
   */
  validateAndSanitize<T extends BaseDocument>(
    documents: T[],
    schema?: DocumentValidationSchema,
    throwOnError?: boolean
  ): T[];
}

/**
 * Collection management interface
 */
export interface IChromaCollectionManager {
  /**
   * Create a new collection
   */
  createCollection(
    name: string,
    metadata?: CollectionMetadata
  ): Promise<Collection>;

  /**
   * Get an existing collection
   */
  getCollection(name: string): Promise<Collection>;

  /**
   * List all collections
   */
  listCollections(): Promise<string[]>;

  /**
   * Delete a collection
   */
  deleteCollection(name: string): Promise<void>;

  /**
   * Check if collection exists
   */
  collectionExists(name: string): Promise<boolean>;

  /**
   * Get collection metadata
   */
  getCollectionMetadata(name: string): Promise<CollectionMetadata>;

  /**
   * Update collection metadata
   */
  updateCollectionMetadata(
    name: string,
    metadata: CollectionMetadata
  ): Promise<void>;
}

/**
 * Health monitoring interface
 */
export interface IChromaHealthMonitor {
  /**
   * Perform basic health check
   */
  checkHealth(): Promise<HealthStatus>;

  /**
   * Perform detailed system check
   */
  checkSystemHealth(): Promise<SystemHealthStatus>;

  /**
   * Get connection statistics
   */
  getConnectionStats(): Promise<ConnectionStats>;

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Promise<PerformanceMetrics>;
}

// ValidationResult now imported from consolidated types

/**
 * Health status structure
 */
export interface HealthStatus {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Timestamp of check */
  timestamp: Date;
  /** Response time in milliseconds */
  responseTime: number;
  /** Additional details */
  details?: Record<string, any>;
}

/**
 * System health status structure
 */
export interface SystemHealthStatus extends HealthStatus {
  /** Database connection health */
  database: HealthStatus;
  /** Memory health */
  memory: HealthStatus;
  /** Disk health */
  disk: HealthStatus;
  /** Network health */
  network: HealthStatus;
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
  /** Number of active connections */
  activeConnections: number;
  /** Total connections created */
  totalConnections: number;
  /** Failed connection attempts */
  failedConnections: number;
  /** Average connection time */
  averageConnectionTime: number;
  /** Last successful connection */
  lastSuccessfulConnection: Date;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Operation counts by type */
  operationCounts: Record<string, number>;
  /** Average response times by operation */
  averageResponseTimes: Record<string, number>;
  /** Error rates by operation */
  errorRates: Record<string, number>;
  /** Throughput (operations per second) */
  throughput: number;
  /** Memory usage statistics */
  memoryUsage: {
    used: number;
    available: number;
    percentage: number;
  };
}
