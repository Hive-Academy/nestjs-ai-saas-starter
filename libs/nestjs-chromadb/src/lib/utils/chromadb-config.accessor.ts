import type { ChromaDBModuleOptions } from '../interfaces/chromadb-module-options.interface';

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

  return {
    batchSize: config.batchSize ?? 100,
    maxRetries: config.maxRetries ?? 3,
    retryDelay: config.retryDelay ?? 1000,
    enableHealthCheck: config.enableHealthCheck ?? true,
    healthCheckInterval: config.healthCheckInterval ?? 30000,
    logConnection: config.logConnection ?? true,
    connection: {
      host: config.connection?.host ?? 'localhost',
      port: config.connection?.port ?? 8000,
      ssl: config.connection?.ssl ?? false,
      tenant: config.connection?.tenant,
      database: config.connection?.database,
    },
    embedding: config.embedding,
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
