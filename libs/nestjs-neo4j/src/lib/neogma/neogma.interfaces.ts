/**
 * @fileoverview Neogma module configuration interfaces
 */

import type { ModuleMetadata, Type } from '@nestjs/common';
import type { TrustStrategy } from 'neo4j-driver';

export interface NeogmaModuleOptions {
  /** Neo4j connection URL */
  url: string;
  /** Neo4j username */
  username: string;
  /** Neo4j password */
  password: string;
  /** Database name (optional) */
  database?: string;
  /** Additional Neogma configuration */
  config?: {
    logger?: (message: string) => void;
    disableLosslessIntegers?: boolean;
    encrypted?: boolean;
    trust?: TrustStrategy;
    userAgent?: string;
    maxConnectionLifetime?: number;
    maxConnectionPoolSize?: number;
    connectionAcquisitionTimeout?: number;
    disableDriverMetrics?: boolean;
  };
}

export interface NeogmaOptionsFactory {
  createNeogmaOptions(): Promise<NeogmaModuleOptions> | NeogmaModuleOptions;
}

export interface NeogmaModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<NeogmaOptionsFactory>;
  useClass?: Type<NeogmaOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<NeogmaModuleOptions> | NeogmaModuleOptions;
  inject?: any[];
}
