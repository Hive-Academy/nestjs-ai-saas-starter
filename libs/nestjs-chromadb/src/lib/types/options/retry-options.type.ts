/**
 * Retry-focused options types following Interface Segregation Principle
 * Handles retry strategies, timeouts, and resilience patterns
 */

/**
 * Retry configuration for resilience
 */
export interface RetryOptions {
  readonly enabled?: boolean;
  readonly maxAttempts?: number;
  readonly baseDelay?: number;
  readonly strategy?: 'linear' | 'exponential';
  readonly retryableErrors?: readonly (string | RegExp)[];
}

/**
 * HTTP client retry configuration
 */
export interface HttpRetryOptions {
  /**
   * Maximum number of retries for failed requests (default: 3)
   */
  readonly maxRetries?: number;

  /**
   * Initial delay between retries in milliseconds (default: 1000)
   */
  readonly retryDelay?: number;

  /**
   * Backoff factor for exponential retry delay (default: 2)
   */
  readonly retryBackoffFactor?: number;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerOptions {
  readonly failureThreshold?: number;
  readonly resetTimeout?: number;
  readonly monitoringPeriod?: number;
}

/**
 * Timeout configuration options
 */
export interface TimeoutOptions {
  /**
   * Request timeout in milliseconds (default: 30000)
   */
  readonly timeout?: number;

  /**
   * Connection timeout in milliseconds
   */
  readonly connectionTimeout?: number;

  /**
   * Read timeout in milliseconds
   */
  readonly readTimeout?: number;
}
