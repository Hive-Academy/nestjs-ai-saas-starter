import type { ModuleMetadata, Type } from '@nestjs/common';
import type { Config } from 'neo4j-driver';

export interface Neo4jConfig {
  connectionAcquisitionTimeout?: number;
  maxConnectionPoolSize?: number;
  maxConnectionLifetime?: number;
  connectionTimeout?: number;
  maxTransactionRetryTime?: number;
  encrypted?: boolean;
  trust?: string;
  logging?: {
    level: string;
    logger?: (level: string, message: string) => void;
  };
  disableLosslessIntegers?: boolean;
}

export interface Neo4jModuleOptions {
  uri: string;
  username: string;
  password: string;
  database?: string;
  config?: Config;
  healthCheck?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface Neo4jModuleOptionsFactory {
  createNeo4jOptions: () => Promise<Neo4jModuleOptions> | Neo4jModuleOptions;
}

export interface Neo4jModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  name?: string;
  useExisting?: Type<Neo4jModuleOptionsFactory>;
  useClass?: Type<Neo4jModuleOptionsFactory>;
  useFactory?: (...args: unknown[]) => Promise<Neo4jModuleOptions> | Neo4jModuleOptions;
  inject?: Array<Type | string | symbol | { token: string | symbol; optional: boolean }>;
}
