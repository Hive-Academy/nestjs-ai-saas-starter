/**
 * @fileoverview Retry Decorator - Public API and re-exports
 *
 * This module provides the main @Retry decorator with a clean API by
 * re-exporting from focused, split implementation modules.
 */

// Re-export main decorator
export { Retry } from './retry-core';

// Re-export types and utilities
export type { RetryStatistics } from './retry-statistics';
export { getRetryStatistics, resetRetryStatistics } from './retry-statistics';

export {
  getCircuitBreakerState,
  resetCircuitBreaker,
} from './retry-circuit-breaker';

// Re-export config types
export type { RetryConfig } from './retry-config';

// Re-export presets for convenience
export { RetryConfigPresets } from './retry-config';
export { StrategyPresets } from './retry-strategies';
export { ErrorClassificationPresets } from './error-classifier';
export { CircuitBreakerFactory } from './circuit-breaker';
