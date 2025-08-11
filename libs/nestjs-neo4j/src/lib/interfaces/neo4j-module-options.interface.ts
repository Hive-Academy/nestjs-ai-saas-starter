import { ModuleMetadata, Type } from '@nestjs/common';

export interface Neo4jConfig {
  connectionAcquisitionTimeout?: number;
  maxConnectionPoolSize?: number;
  maxConnectionLifetime?: number;
  connectionTimeout?: number;
  maxTransactionRetryTime?: number;
  encrypted?: any; // Neo4j driver accepts boolean or EncryptionLevel enum
  trust?: any; // Neo4j TrustStrategy - complex type from driver
  logging?: any; // Neo4j LoggingConfig - complex type
  disableLosslessIntegers?: boolean; // Common option from example
}

export interface Neo4jModuleOptions {
  uri: string;
  username: string;
  password: string;
  database?: string;
  config?: Neo4jConfig;
  healthCheck?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface Neo4jModuleOptionsFactory {
  createNeo4jOptions(): Promise<Neo4jModuleOptions> | Neo4jModuleOptions;
}

export interface Neo4jModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  name?: string;
  useExisting?: Type<Neo4jModuleOptionsFactory>;
  useClass?: Type<Neo4jModuleOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<Neo4jModuleOptions> | Neo4jModuleOptions;
  inject?: any[];
}