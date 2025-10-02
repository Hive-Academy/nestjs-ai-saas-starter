/**
 * Profiling-focused options types following Interface Segregation Principle
 * Handles performance monitoring, metrics collection, and profiling behavior
 */

/**
 * Profiling configuration for performance analysis
 */
export interface ProfilingOptions {
  readonly enabled?: boolean;
  readonly slowQueryThreshold?: number;
  readonly samplingRate?: number;
  readonly includeStackTrace?: boolean;
}

/**
 * Performance metrics collection configuration
 */
export interface MetricsOptions {
  readonly collectEmbeddingTime?: boolean;
  readonly collectSearchTime?: boolean;
  readonly collectBatchTime?: boolean;
  readonly histogramBuckets?: readonly number[];
}

/**
 * Performance monitoring options
 */
export interface PerformanceMonitoringOptions {
  /**
   * Enable performance monitoring (default: false)
   */
  readonly monitoring?: boolean;

  /**
   * Enable performance profiling and metrics (default: false)
   */
  readonly profiling?: boolean;

  /**
   * Performance metrics collection configuration
   */
  readonly metricsOptions?: MetricsOptions;
}

/**
 * Sampling configuration for profiling
 */
export interface SamplingOptions {
  readonly rate?: number; // 0.0 to 1.0
  readonly strategy?: 'random' | 'time-based' | 'request-based';
  readonly minInterval?: number;
  readonly maxSamplesPerWindow?: number;
}

/**
 * Trace collection options
 */
export interface TraceOptions {
  readonly enabled?: boolean;
  readonly includeStackTrace?: boolean;
  readonly maxTraceDepth?: number;
  readonly traceSlowOperations?: boolean;
  readonly traceErrors?: boolean;
}
