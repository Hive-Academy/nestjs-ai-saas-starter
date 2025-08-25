import type { ChromaDBService } from '@hive-academy/nestjs-chromadb';
import type { Neo4jService } from '@hive-academy/nestjs-neo4j';

/**
 * Database connection provider interface for memory module
 * Supports ChromaDB (vector database) and Neo4j (graph database) providers
 */
export interface IDatabaseConnectionProvider {
  /** Type of database provider */
  type: 'chromadb' | 'neo4j' | 'custom';

  /** Database service connection instance */
  connection: ChromaDBService | Neo4jService | any;

  /** Check if the connection is healthy and available */
  isHealthy(): Promise<boolean>;

  /** Optional configuration metadata */
  metadata?: {
    collectionName?: string;
    database?: string;
    version?: string;
    [key: string]: unknown;
  };
}

/**
 * Memory provider configuration for different database providers
 */
export interface MemoryProviderConfig {
  /** Vector database configuration (ChromaDB) */
  vector?: {
    type: 'chromadb';
    collection: string;
    connection?: 'auto'; // Auto-detect from module imports
    metadata?: Record<string, unknown>;
  };

  /** Graph database configuration (Neo4j) */
  graph?: {
    type: 'neo4j';
    database?: string;
    connection?: 'auto'; // Auto-detect from module imports
    metadata?: Record<string, unknown>;
  };

  /** Custom database provider */
  custom?: {
    type: 'custom';
    provider: IDatabaseConnectionProvider;
  };
}

/**
 * Status information for database providers
 */
export interface DatabaseProviderStatus {
  /** Provider type */
  type: 'chromadb' | 'neo4j' | 'custom';

  /** Whether the provider is available and healthy */
  available: boolean;

  /** Connection health status */
  healthy: boolean;

  /** Provider capabilities */
  capabilities: string[];

  /** Optional error information if not available */
  error?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Factory pattern for creating database providers
 */
export interface IDatabaseProviderFactory {
  /** Get all available database providers */
  getAvailableProviders(): Promise<IDatabaseConnectionProvider[]>;

  /** Get provider by type */
  getProvider(
    type: 'chromadb' | 'neo4j' | 'custom'
  ): Promise<IDatabaseConnectionProvider | null>;

  /** Check if a specific provider type is available */
  isProviderAvailable(type: 'chromadb' | 'neo4j' | 'custom'): Promise<boolean>;

  /** Get status of all providers */
  getProvidersStatus(): Promise<DatabaseProviderStatus[]>;

  /** Create a memory database configuration from available providers */
  createMemoryConfig(
    preferences?: Partial<MemoryProviderConfig>
  ): Promise<MemoryProviderConfig>;
}

/**
 * Memory detection result for auto-configuration
 */
export interface MemoryDetectionResult {
  /** Whether any database providers are available */
  hasProviders: boolean;

  /** Available vector database providers */
  vectorProviders: IDatabaseConnectionProvider[];

  /** Available graph database providers */
  graphProviders: IDatabaseConnectionProvider[];

  /** Custom providers */
  customProviders: IDatabaseConnectionProvider[];

  /** Recommended configuration based on available providers */
  recommendedConfig: MemoryProviderConfig | null;

  /** Feature flags based on available services */
  features: {
    semanticSearch: boolean;
    graphTraversal: boolean;
    persistentMemory: boolean;
    crossThreadMemory: boolean;
  };
}
