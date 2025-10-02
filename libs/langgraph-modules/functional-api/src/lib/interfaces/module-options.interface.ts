import type { ModuleMetadata, Type } from '@nestjs/common';
import type {
  ICheckpointAdapter,
  AsyncModuleFactory,
  IStreamingService,
  IMemoryAdapter,
} from '@hive-academy/langgraph-core';

/**
 * Workflow provider type for explicit registration
 */
export type WorkflowProvider = new (...args: any[]) => any;

/**
 * Configuration options for the Functional API module (PURE CONFIGURATION)
 * NOTE: Registration is now handled by WorkflowEngineModule centrally
 */
export interface FunctionalApiModuleOptions {

  /**
   * CENTRALIZED REGISTRATION: Workflow providers registered by WorkflowEngineModule
   * This array is populated by the workflow engine's workflow registration system
   */
  readonly workflows?: WorkflowProvider[];

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

  /**
   * Optional checkpoint adapter for state persistence
   * If not provided, checkpointing will be disabled (uses NoOpCheckpointAdapter)
   */
  readonly checkpointAdapter?: ICheckpointAdapter;

  /**
   * Optional streaming service adapter for real-time events
   * If not provided, streaming will be disabled (uses NoOpStreamingService)
   */
  readonly streamingAdapter?: IStreamingService;

  /**
   * 🧠 MEMORY INTEGRATION: Optional memory adapter for 2025 cross-module memory
   * If not provided, memory features will be disabled
   */
  readonly memoryAdapter?: IMemoryAdapter;
}

/**
 * Options factory interface for async module configuration
 */
export interface FunctionalApiOptionsFactory {
  createFunctionalApiOptions: () =>
    | Promise<FunctionalApiModuleOptions>
    | FunctionalApiModuleOptions;
}

/**
 * Async module options
 */
export interface FunctionalApiModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<FunctionalApiOptionsFactory>;
  useClass?: Type<FunctionalApiOptionsFactory>;
  useFactory?: AsyncModuleFactory<FunctionalApiModuleOptions>;
  inject?: Array<Type | string | symbol>;
}
