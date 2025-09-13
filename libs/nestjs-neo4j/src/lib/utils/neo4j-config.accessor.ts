import type { Neo4jModuleOptions } from '../interfaces/neo4j-module-options.interface';

/**
 * Global storage for Neo4j module configuration
 * Set when Neo4jModule.forRoot() is called
 */
let storedNeo4jConfig: Neo4jModuleOptions = {} as Neo4jModuleOptions;

/**
 * Store Neo4j configuration for decorator access
 * Called by Neo4jModule.forRoot()
 */
export function setNeo4jConfig(config: Neo4jModuleOptions): void {
  storedNeo4jConfig = { ...config };
}

/**
 * Get stored Neo4j configuration for decorators
 * Returns the config passed to Neo4jModule.forRoot()
 */
export function getNeo4jConfig(): Neo4jModuleOptions {
  return storedNeo4jConfig;
}

/**
 * Get Neo4j config with safe defaults
 * Used by decorators to inherit module configuration
 */
export function getNeo4jConfigWithDefaults(): Neo4jModuleOptions {
  const config = getNeo4jConfig();

  return {
    uri: config.uri ?? 'bolt://localhost:7687',
    username: config.username ?? 'neo4j',
    password: config.password ?? 'password',
    database: config.database,
    config: {
      maxConnectionPoolSize: config.config?.maxConnectionPoolSize ?? 50,
      connectionAcquisitionTimeout:
        config.config?.connectionAcquisitionTimeout ?? 60000,
      connectionTimeout: config.config?.connectionTimeout ?? 5000,
      maxTransactionRetryTime: config.config?.maxTransactionRetryTime ?? 30000,
      disableLosslessIntegers: config.config?.disableLosslessIntegers ?? false,
      logging: config.config?.logging,
      userAgent: config.config?.userAgent,
      resolver: config.config?.resolver,
      ...config.config,
    },
  };
}

/**
 * Check if Neo4j is configured
 */
export function isNeo4jConfigured(): boolean {
  return Object.keys(storedNeo4jConfig).length > 0 && !!storedNeo4jConfig.uri;
}
