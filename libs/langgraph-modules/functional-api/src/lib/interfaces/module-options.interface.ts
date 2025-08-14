import type { ModuleMetadata, Type } from '@nestjs/common';

/**
 * Configuration options for the Functional API module
 */
export interface FunctionalApiModuleOptions {
  /**
   * Default timeout for task execution in milliseconds
   * @default 30000
   */
  readonly defaultTimeout?: number;

  /**
   * Default number of retry attempts for failed tasks
   * @default 3
   */
  readonly defaultRetryCount?: number;

  /**
   * Enable automatic checkpointing
   * @default true
   */
  readonly enableCheckpointing?: boolean;

  /**
   * Checkpoint interval in milliseconds
   * @default 5000
   */
  readonly checkpointInterval?: number;

  /**
   * Enable streaming events
   * @default false
   */
  readonly enableStreaming?: boolean;

  /**
   * Maximum number of concurrent task executions
   * @default 10
   */
  readonly maxConcurrentTasks?: number;

  /**
   * Enable cycle detection in workflow dependencies
   * @default true
   */
  readonly enableCycleDetection?: boolean;

  /**
   * Global metadata to be included in all workflow executions
   */
  readonly globalMetadata?: Record<string, unknown>;
}

/**
 * Options factory interface for async module configuration
 */
export interface FunctionalApiOptionsFactory {
  createFunctionalApiOptions: () => Promise<FunctionalApiModuleOptions> | FunctionalApiModuleOptions;
}

/**
 * Async module options
 */
export interface FunctionalApiModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<FunctionalApiOptionsFactory>;
  useClass?: Type<FunctionalApiOptionsFactory>;
  useFactory?: (...args: unknown[]) => Promise<FunctionalApiModuleOptions> | FunctionalApiModuleOptions;
  inject?: Array<Type | string | symbol>;
}