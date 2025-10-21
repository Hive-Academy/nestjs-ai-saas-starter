/**
 * @fileoverview @Retry Decorator - Strategy Pattern Implementation
 *
 * This decorator provides resilient operation patterns using the Strategy pattern
 * for extensible retry logic specifically designed for vector database operations.
 */

// Re-export from the new Strategy pattern implementation
export {
  Retry,
  type RetryConfig,
  type RetryStatistics,
} from './retry/retry.decorator';
export { RetryConfigPresets } from './retry/retry-config';
export { StrategyPresets } from './retry/retry-strategies';
export { ErrorClassificationPresets } from './retry/error-classifier';
export { CircuitBreakerFactory } from './retry/circuit-breaker';
export {
  getRetryStatistics,
  resetRetryStatistics,
  getCircuitBreakerState,
  resetCircuitBreaker,
} from './retry/retry.decorator';

/**
 * Predefined retry configurations for common scenarios
 */
export const RetryPresets = {
  /**
   * Configuration for network operations with exponential backoff
   */
  network: {
    maxAttempts: 5,
    baseDelay: 1000,
    strategy: 'exponential' as const,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      /timeout/i,
      /connection/i,
      /network/i,
    ],
  },

  /**
   * Configuration for database operations
   */
  database: {
    maxAttempts: 3,
    baseDelay: 500,
    strategy: 'exponential' as const,
    backoffMultiplier: 1.5,
    jitter: true,
    retryableErrors: [/connection/i, /timeout/i, /lock/i, /deadlock/i],
    nonRetryableErrors: [/constraint/i, /syntax/i, /permission/i],
  },

  /**
   * Configuration for vector search operations
   */
  vectorSearch: {
    maxAttempts: 4,
    baseDelay: 1000,
    strategy: 'exponential' as const,
    backoffMultiplier: 1.8,
    jitter: true,
    maxDelay: 10000,
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      resetTimeout: 30000,
    },
    retryableErrors: [
      /timeout/i,
      /connection/i,
      /service unavailable/i,
      /internal server error/i,
    ],
    nonRetryableErrors: [
      /validation/i,
      /unauthorized/i,
      /forbidden/i,
      /bad request/i,
    ],
  },

  /**
   * Configuration for critical operations with fallback
   */
  critical: {
    maxAttempts: 2,
    baseDelay: 100,
    strategy: 'fixed' as const,
    jitter: false,
    circuitBreaker: {
      enabled: true,
      failureThreshold: 3,
      resetTimeout: 60000,
    },
  },
} as const;
