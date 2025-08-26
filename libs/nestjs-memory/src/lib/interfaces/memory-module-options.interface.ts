import type { ModuleMetadata, Type } from '@nestjs/common';
import type { MemoryConfig } from './memory.interface';

// Standard NestJS module options interface
export type MemoryModuleOptions = MemoryConfig;

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
