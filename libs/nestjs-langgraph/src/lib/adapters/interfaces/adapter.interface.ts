/**
 * Base adapter status interface for diagnostic information
 * All adapters must provide this information for monitoring and debugging
 */
export interface BaseAdapterStatus {
  /** Whether enterprise/advanced functionality is available */
  enterpriseAvailable: boolean;
  /** Whether the adapter is running in fallback mode */
  fallbackMode: boolean;
  /** List of available capabilities */
  capabilities: string[];
}

/**
 * Extended adapter status with additional provider information
 * Used by adapters that have multiple service providers
 */
export interface ExtendedAdapterStatus extends BaseAdapterStatus {
  /** Additional provider availability flags */
  [key: string]: boolean | string[] | unknown;
}

/**
 * Generic adapter status type that can accommodate different adapter needs
 */
export type AdapterStatus = BaseAdapterStatus | ExtendedAdapterStatus;

/**
 * Common interface that all module adapters must implement
 *
 * This interface ensures consistency across all adapters while allowing
 * for domain-specific functionality through generic type parameters.
 *
 * @template TConfig Configuration type for the adapter
 * @template TResult Return type for the adapter's main operations
 */
export interface IModuleAdapter<TConfig = unknown, TResult = unknown> {
  /**
   * Check if enterprise/advanced functionality is available
   *
   * This is the primary method for determining adapter capabilities.
   * Should return true if enterprise services are injected and functional.
   *
   * @returns true if enterprise features are available, false otherwise
   */
  isEnterpriseAvailable(): boolean;

  /**
   * Get comprehensive adapter status for diagnostics
   *
   * Provides detailed information about adapter state, capabilities,
   * and available services for monitoring and debugging purposes.
   *
   * @returns Detailed status information including capabilities and provider availability
   */
  getAdapterStatus(): AdapterStatus;
}

/**
 * Interface for adapters that support creation operations
 * Most adapters will implement this alongside IModuleAdapter
 *
 * @template TConfig Configuration type for creation
 * @template TResult Type of created instance
 */
export interface ICreatableAdapter<TConfig = unknown, TResult = unknown>
  extends IModuleAdapter<TConfig, TResult> {
  /**
   * Create an instance based on configuration
   *
   * @param config Configuration for the instance
   * @returns Created instance or Promise thereof
   */
  create(config: TConfig): TResult | Promise<TResult>;
}

/**
 * Interface for adapters that support execution operations
 * Used by adapters that perform workflow or task execution
 *
 * @template TInput Input type for execution
 * @template TOutput Output type for execution
 */
export interface IExecutableAdapter<TInput = unknown, TOutput = unknown>
  extends IModuleAdapter {
  /**
   * Execute an operation with given input
   *
   * @param input Input for the operation
   * @param options Optional execution options
   * @returns Execution result or Promise thereof
   */
  execute(input: TInput, options?: unknown): TOutput | Promise<TOutput>;
}

/**
 * Interface for adapters that support streaming operations
 * Used by adapters that provide real-time data streams
 *
 * @template TInput Input type for streaming
 * @template TOutput Output type for streaming
 */
export interface IStreamableAdapter<TInput = unknown, TOutput = unknown>
  extends IModuleAdapter {
  /**
   * Stream data based on input
   *
   * @param input Input for the stream
   * @param options Optional streaming options
   * @returns Async generator for streaming data
   */
  stream(
    input: TInput,
    options?: unknown
  ): AsyncGenerator<TOutput, void, unknown>;
}

/**
 * Interface for adapters that support cleanup operations
 * Important for resource management and graceful shutdown
 */
export interface ICleanableAdapter extends IModuleAdapter {
  /**
   * Clean up adapter resources
   * Should be called during application shutdown or module destruction
   *
   * @returns Promise that resolves when cleanup is complete
   */
  cleanup(): Promise<void>;
}

/**
 * Comprehensive adapter interface that combines all capabilities
 * Use this for adapters that need full functionality
 *
 * @template TConfig Configuration type
 * @template TInput Input type for operations
 * @template TOutput Output type for operations
 */
export interface IFullAdapter<
  TConfig = unknown,
  TInput = unknown,
  TOutput = unknown
> extends ICreatableAdapter<TConfig, unknown>,
    IExecutableAdapter<TInput, TOutput>,
    IStreamableAdapter<TInput, TOutput>,
    ICleanableAdapter {}
