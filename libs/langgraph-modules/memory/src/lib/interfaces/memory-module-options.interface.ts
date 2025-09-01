import type { ModuleMetadata, Type } from '@nestjs/common';
import type { MemoryConfig } from './memory.interface';
import type { IVectorService } from './vector-service.interface';
import type { IGraphService } from './graph-service.interface';

/**
 * Enhanced memory module options with adapter injection support
 * Maintains 100% backward compatibility with existing MemoryConfig
 */
export interface MemoryModuleOptions extends MemoryConfig {
  /**
   * Optional adapter injection configuration
   * When not provided, default ChromaDB and Neo4j adapters are used
   */
  readonly adapters?: {
    /** Custom vector database adapter */
    readonly vector?: Type<IVectorService> | IVectorService;
    /** Custom graph database adapter */
    readonly graph?: Type<IGraphService> | IGraphService;
  };
}

// Async module options following NestJS patterns
export interface MemoryModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<MemoryOptionsFactory>;
  useClass?: Type<MemoryOptionsFactory>;
  useFactory?: (
    ...args: unknown[]
  ) => Promise<MemoryModuleOptions> | MemoryModuleOptions;
  inject?: unknown[];
}

// Factory interface for creating options
export interface MemoryOptionsFactory {
  createMemoryOptions(): Promise<MemoryModuleOptions> | MemoryModuleOptions;
}
