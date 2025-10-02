import type { ChromaDBModuleOptions } from '../../interfaces/config/module-options.interface';

/**
 * Global storage for ChromaDB module configuration
 * Set when ChromaDBModule.forRoot() is called
 */
let storedChromaDBConfig: ChromaDBModuleOptions | null = null;

/**
 * Store ChromaDB configuration for decorator access
 * Called by ChromaDBModule.forRoot()
 */
export function setChromaDBConfig(config: ChromaDBModuleOptions): void {
  storedChromaDBConfig = { ...config };
}

/**
 * Get stored ChromaDB configuration for decorators
 * Returns the config passed to ChromaDBModule.forRoot()
 */
export function getChromaDBConfig(): ChromaDBModuleOptions {
  return storedChromaDBConfig || ({} as ChromaDBModuleOptions);
}

/**
 * Get ChromaDB config with safe defaults
 * Used by decorators to inherit module configuration
 */
export function getChromaDBConfigWithDefaults(): ChromaDBModuleOptions {
  const config = getChromaDBConfig();

  // Validate required configuration
  if (!config.connection?.host) {
    throw new Error(
      'ChromaDB host is required. Please configure connection.host in your module options. ' +
        'For development, use "localhost". For production, specify your ChromaDB server host.'
    );
  }

  return {
    batchSize: config.batchSize ?? 100,
    maxRetries: config.maxRetries ?? 3,
    retryDelay: config.retryDelay ?? 1000,
    enableHealthCheck: config.enableHealthCheck ?? true,
    healthCheckInterval: config.healthCheckInterval ?? 30000,
    logConnection: config.logConnection ?? true,
    logEmbeddingOperations: config.logEmbeddingOperations ?? false,
    connection: {
      host: config.connection.host, // Required - no default
      port: config.connection?.port ?? 8000,
      ssl: config.connection?.ssl ?? false,
      tenant: config.connection?.tenant,
      database: config.connection?.database,
      http: {
        timeout: config.connection?.http?.timeout ?? 30000,
        maxRetries: config.connection?.http?.maxRetries ?? 3,
        retryDelay: config.connection?.http?.retryDelay ?? 1000,
        retryBackoffFactor: config.connection?.http?.retryBackoffFactor ?? 2,
        ...config.connection?.http,
      },
    },
    embedding: config.embedding,
    textProcessing: {
      chunkSize: config.textProcessing?.chunkSize ?? 1000,
      chunkOverlap: config.textProcessing?.chunkOverlap ?? 200,
      maxTextLength: config.textProcessing?.maxTextLength ?? 8000,
      ...config.textProcessing,
    },
    http: {
      timeout: config.http?.timeout ?? 30000,
      maxRetries: config.http?.maxRetries ?? 3,
      retryDelay: config.http?.retryDelay ?? 1000,
      retryBackoffFactor: config.http?.retryBackoffFactor ?? 2,
      ...config.http,
    },
    validation: {
      maxTextLength: config.validation?.maxTextLength ?? 8000,
      maxBatchSize: config.validation?.maxBatchSize ?? 100,
      validateApiKey: config.validation?.validateApiKey ?? false,
      estimateTokens: config.validation?.estimateTokens ?? false,
      ...config.validation,
    },
  };
}

/**
 * Check if ChromaDB is configured
 */
export function isChromaDBConfigured(): boolean {
  return (
    storedChromaDBConfig !== null &&
    Object.keys(storedChromaDBConfig).length > 0
  );
}
