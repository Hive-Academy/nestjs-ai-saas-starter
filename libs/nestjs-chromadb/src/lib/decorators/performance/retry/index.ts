/**
 * @fileoverview Retry Strategy Pattern - Public API
 *
 * This module provides a clean public API for the retry Strategy pattern implementation.
 */

// Core decorator and types
export {
  Retry,
  type RetryConfig,
  type RetryStatistics,
} from './retry.decorator';

// Strategy pattern components
export type { RetryStrategy } from './retry-strategies';
export {
  ExponentialBackoffStrategy,
  LinearBackoffStrategy,
  FixedDelayStrategy,
  CustomDelayStrategy,
  RetryStrategyFactory,
  StrategyPresets,
  RetryDelayCalculator,
  JitterService,
} from './retry-strategies';

export type { JitterConfig } from './retry-strategies';

export {
  CircuitBreaker,
  CircuitBreakerFactory,
  CircuitBreakerState,
} from './circuit-breaker';

export type {
  CircuitBreakerConfig,
  CircuitBreakerStats,
} from './circuit-breaker';

export {
  ErrorClassifier,
  ErrorClassifierFactory,
  ErrorClassification,
  ErrorClassificationPresets,
} from './error-classifier';

export type {
  ErrorMatcher,
  ErrorClassificationConfig,
  ClassificationResult,
} from './error-classifier';

export {
  RetryConfigValidator,
  RetryConfigResolver,
  RetryConfigPresets,
} from './retry-config';

export type {
  ResolvedRetryConfig,
  TimeoutConfig,
  FallbackConfig,
  LoggingConfig,
  MetricsConfig,
} from './retry-config';

// Utility functions
export {
  getRetryStatistics,
  resetRetryStatistics,
  getCircuitBreakerState,
  resetCircuitBreaker,
} from './retry.decorator';
