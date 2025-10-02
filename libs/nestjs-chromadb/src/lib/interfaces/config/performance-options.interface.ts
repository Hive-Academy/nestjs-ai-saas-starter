/**
 * Performance-focused interface following Interface Segregation Principle
 * Handles only caching, monitoring, profiling, and performance features
 */

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  /**
   * Enable performance monitoring (default: false)
   */
  caching?: boolean;

  /**
   * Enable performance profiling and metrics (default: false)
   */
  monitoring?: boolean;

  /**
   * Enable circuit breaker pattern (default: false)
   */
  circuitBreaker?: boolean;

  /**
   * Circuit breaker configuration
   */
  circuitBreakerOptions?: {
    failureThreshold?: number;
    resetTimeout?: number;
    monitoringPeriod?: number;
  };

  /**
   * Performance metrics collection configuration
   */
  metricsOptions?: {
    collectEmbeddingTime?: boolean;
    collectSearchTime?: boolean;
    collectBatchTime?: boolean;
    histogramBuckets?: number[];
  };
}

/**
 * Caching configuration for decorators and operations
 */
export interface CachingConfig {
  enabled?: boolean;
  defaultTtl?: number;
  strategy?: 'memory' | 'redis' | 'custom';
  keyPrefix?: string;
}

/**
 * Profiling configuration for performance analysis
 */
export interface ProfilingConfig {
  enabled?: boolean;
  slowQueryThreshold?: number;
  samplingRate?: number;
  includeStackTrace?: boolean;
}

/**
 * Retry configuration for resilience
 */
export interface RetryConfig {
  enabled?: boolean;
  maxAttempts?: number;
  baseDelay?: number;
  strategy?: 'linear' | 'exponential';
  retryableErrors?: (string | RegExp)[];
}

/**
 * Text processing configuration
 */
export interface TextProcessingConfig {
  /**
   * Default chunk size for text splitting (default: 1000)
   */
  chunkSize?: number;

  /**
   * Default chunk overlap for text splitting (default: 200)
   */
  chunkOverlap?: number;

  /**
   * Maximum text length for processing (default: 8000)
   */
  maxTextLength?: number;
}

/**
 * Performance-focused interface - clients needing only performance features
 */
export interface ChromaDBPerformanceOptions {
  /**
   * Batch size for bulk operations (default: 100)
   */
  batchSize?: number;

  /**
   * Maximum number of connection retries (default: 3)
   * @deprecated Use connection.http.maxRetries instead
   */
  maxRetries?: number;

  /**
   * Delay between retries in milliseconds (default: 1000)
   * @deprecated Use connection.http.retryDelay instead
   */
  retryDelay?: number;

  /**
   * Performance monitoring and optimization configuration
   */
  performance?: PerformanceConfig;

  /**
   * Text processing configuration
   */
  textProcessing?: TextProcessingConfig;

  /**
   * Global caching configuration for decorators
   */
  caching?: CachingConfig;

  /**
   * Global profiling configuration for decorators
   */
  profiling?: ProfilingConfig;

  /**
   * Global retry configuration for decorators
   */
  retry?: RetryConfig;
}
