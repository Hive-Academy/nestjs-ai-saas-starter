/**
 * @fileoverview Refactored @Retry Decorator - Strategy Pattern Implementation
 *
 * This decorator orchestrates retry logic using the Strategy pattern for extensible
 * and maintainable retry operations with sophisticated error handling.
 */

import { Logger } from '@nestjs/common';
import {
  DecoratorMetadataRegistry,
  DecoratorMetadataBuilder,
} from '../../core/decorator-metadata';

import {
  RetryDelayCalculator,
  RetryStrategyFactory,
  JitterService,
} from './retry-strategies';
import { CircuitBreaker } from './circuit-breaker';
import {
  type ErrorClassifier,
  ErrorClassification,
  ErrorClassifierFactory,
} from './error-classifier';
import {
  type RetryConfig,
  type ResolvedRetryConfig,
  RetryConfigResolver,
  RetryConfigValidator,
} from './retry-config';

/**
 * Retry statistics for monitoring and observability
 */
export interface RetryStatistics {
  readonly operationName: string;
  readonly totalAttempts: number;
  readonly successfulOperations: number;
  readonly failedOperations: number;
  readonly totalRetries: number;
  readonly averageAttempts: number;
  readonly circuitBreakerTrips: number;
  readonly fallbackExecutions: number;
  readonly lastOperation: Date;
  readonly errorDistribution: Record<string, number>;
  readonly averageLatency: number;
  readonly maxLatency: number;
  readonly minLatency: number;
}

/**
 * Internal retry context for tracking execution state
 */
interface RetryContext {
  attempt: number;
  startTime: number;
  operationName: string;
  logger: Logger;
  statistics: RetryStatistics;
  delayCalculator: RetryDelayCalculator;
  circuitBreaker?: CircuitBreaker;
  errorClassifier: ErrorClassifier;
  config: ResolvedRetryConfig;
}

/**
 * Enhanced @Retry decorator using Strategy pattern
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class VectorService {
 *   @Retry({
 *     maxAttempts: 5,
 *     strategy: 'exponential',
 *     circuitBreaker: {
 *       enabled: true,
 *       failureThreshold: 5,
 *       resetTimeout: 30000,
 *     },
 *     fallback: {
 *       enabled: true,
 *       fallbackFunction: async () => [],
 *     }
 *   })
 *   async searchVectors(collection: string, query: string): Promise<any[]> {
 *     return this.chromaService.searchDocuments(collection, [query]);
 *   }
 * }
 * ```
 */
export function Retry(config: RetryConfig = {}): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    // Validate configuration
    RetryConfigValidator.validateAndThrow(config);

    // Resolve configuration with defaults
    const resolvedConfig = RetryConfigResolver.resolve(config);

    // Store decorator metadata
    const metadata = DecoratorMetadataBuilder.createPerformanceMetadata(
      'Retry',
      'method',
      [], // No dependencies
      resolvedConfig
    );

    DecoratorMetadataRegistry.setMetadata(target, propertyKey, metadata);

    // Store original method
    const originalMethod = descriptor.value;
    const operationName = `${target.constructor.name}.${String(propertyKey)}`;
    const logger = new Logger(`Retry:${operationName}`);

    // Initialize components using Strategy pattern
    const delayCalculator = new RetryDelayCalculator(
      RetryStrategyFactory.createStrategy(resolvedConfig.strategy, {
        backoffMultiplier: resolvedConfig.backoffMultiplier,
        maxDelay: resolvedConfig.maxDelay,
        customDelay: resolvedConfig.customDelay,
      }),
      {
        enabled: resolvedConfig.jitter,
        maxJitterPercent: resolvedConfig.maxJitter,
      }
    );

    const circuitBreaker = resolvedConfig.circuitBreaker.enabled
      ? new CircuitBreaker(resolvedConfig.circuitBreaker)
      : undefined;

    const errorClassifier = ErrorClassifierFactory.createForDomain(
      'vectorDatabase',
      {
        retryableErrors: resolvedConfig.retryableErrors,
        nonRetryableErrors: resolvedConfig.nonRetryableErrors,
        customPredicate: resolvedConfig.retryPredicate,
      }
    );

    // Initialize statistics
    const statistics: RetryStatistics = createInitialStatistics(operationName);

    // Create retry context
    const retryContext: RetryContext = {
      attempt: 0,
      startTime: 0,
      operationName,
      logger,
      statistics,
      delayCalculator,
      circuitBreaker,
      errorClassifier,
      config: resolvedConfig,
    };

    // Replace method with retry implementation
    descriptor.value = async function (...args: any[]) {
      return await executeWithRetry.call(
        this,
        originalMethod,
        args,
        retryContext
      );
    };

    // Add utility methods to the instance
    addUtilityMethods(target, propertyKey, retryContext);

    return descriptor;
  };
}

/**
 * Main retry execution logic
 */
async function executeWithRetry(
  originalMethod: (...args: any[]) => any,
  args: any[],
  context: RetryContext
): Promise<any> {
  context.startTime = Date.now();
  context.attempt = 0;

  // Check circuit breaker before starting
  if (context.circuitBreaker && !context.circuitBreaker.canExecute()) {
    updateStatistics(context, 'circuit_breaker_open');

    if (
      context.config.logging.enabled &&
      context.config.logging.logCircuitBreaker
    ) {
      context.logger.warn('Circuit breaker is open, skipping operation');
    }

    return handleFallback(context, args, new Error('Circuit breaker is open'));
  }

  let lastError: Error;

  while (context.attempt < context.config.maxAttempts) {
    context.attempt++;
    updateStatistics(context, 'attempt');

    try {
      const result = context.config.timeout.enabled
        ? await executeWithTimeout(originalMethod.apply(this, args), context)
        : await originalMethod.apply(this, args);

      // Success - update circuit breaker and return
      if (context.circuitBreaker) {
        context.circuitBreaker.recordSuccess();
      }

      updateStatistics(context, 'success');
      logAttemptResult(context, 'success');

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Classify the error
      const classification = context.errorClassifier.classify(
        lastError,
        context.attempt
      );

      // Handle based on classification
      if (classification.classification === ErrorClassification.NON_RETRYABLE) {
        updateStatistics(context, 'non_retryable_error', lastError);
        logAttemptResult(
          context,
          'non_retryable_error',
          lastError,
          classification.reason
        );
        throw lastError;
      }

      if (
        classification.classification === ErrorClassification.CIRCUIT_BREAKER
      ) {
        if (context.circuitBreaker) {
          context.circuitBreaker.recordFailure();
        }
        updateStatistics(context, 'circuit_breaker_error', lastError);
        logAttemptResult(
          context,
          'circuit_breaker_error',
          lastError,
          classification.reason
        );
      } else {
        // Retryable error
        if (context.circuitBreaker) {
          context.circuitBreaker.recordFailure();
        }
        updateStatistics(context, 'retryable_error', lastError);
      }

      // If this is the last attempt, break the loop
      if (context.attempt >= context.config.maxAttempts) {
        break;
      }

      // Calculate delay and wait
      const delay = context.delayCalculator.calculateDelay(
        context.attempt,
        context.config.baseDelay
      );

      logAttemptResult(
        context,
        'retrying',
        lastError,
        `Retrying in ${delay}ms`
      );
      await sleep(delay);
    }
  }

  // All attempts failed - try fallback
  updateStatistics(context, 'all_attempts_failed', lastError);

  if (context.config.logging.enabled && context.config.logging.logFailures) {
    context.logger.error(
      `All ${context.config.maxAttempts} attempts failed. Last error: ${lastError.message}`
    );
  }

  return handleFallback(context, args, lastError);
}

/**
 * Execute a promise with timeout
 */
async function executeWithTimeout<T>(
  promise: Promise<T>,
  context: RetryContext
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(
      () =>
        reject(
          new Error(
            context.config.timeout.timeoutMessage || 'Operation timed out'
          )
        ),
      context.config.timeout.timeoutMs
    );
  });

  return Promise.race([promise, timeout]);
}

/**
 * Handle fallback execution when all retries fail
 */
async function handleFallback(
  context: RetryContext,
  args: any[],
  error: Error
): Promise<any> {
  if (context.config.fallback.enabled) {
    updateStatistics(context, 'fallback');

    if (context.config.logging.enabled && context.config.logging.logFallback) {
      context.logger.log('Executing fallback function');
    }

    if (context.config.fallback.fallbackFunction) {
      return await context.config.fallback.fallbackFunction.apply(this, args);
    } else if (context.config.fallback.fallbackValue !== undefined) {
      return context.config.fallback.fallbackValue;
    }
  }

  throw error;
}

/**
 * Log attempt results based on configuration
 */
function logAttemptResult(
  context: RetryContext,
  type:
    | 'success'
    | 'retrying'
    | 'non_retryable_error'
    | 'circuit_breaker_error',
  error?: Error,
  message?: string
): void {
  if (!context.config.logging.enabled) {
    return;
  }

  const logMessage = message || (error ? error.message : '');
  const attemptInfo = `Attempt ${context.attempt}`;

  switch (type) {
    case 'success':
      if (context.config.logging.logSuccess && context.attempt > 1) {
        context.logger.log(`${attemptInfo}: Operation succeeded after retries`);
      }
      break;

    case 'retrying':
      if (context.config.logging.logAttempts) {
        context.logger.warn(`${attemptInfo}: ${logMessage}`);
      }
      break;

    case 'non_retryable_error':
      if (context.config.logging.logFailures) {
        context.logger.error(
          `${attemptInfo}: Non-retryable error - ${logMessage}`
        );
      }
      break;

    case 'circuit_breaker_error':
      if (context.config.logging.logCircuitBreaker) {
        context.logger.warn(
          `${attemptInfo}: Circuit breaker error - ${logMessage}`
        );
      }
      break;
  }
}

/**
 * Update retry statistics
 */
function updateStatistics(
  context: RetryContext,
  event:
    | 'attempt'
    | 'success'
    | 'all_attempts_failed'
    | 'retryable_error'
    | 'non_retryable_error'
    | 'circuit_breaker_error'
    | 'circuit_breaker_open'
    | 'fallback',
  error?: Error
): void {
  const mutableStats = context.statistics as any;
  const currentTime = Date.now();
  const latency = currentTime - context.startTime;

  switch (event) {
    case 'attempt':
      mutableStats.totalAttempts++;
      mutableStats.lastOperation = new Date();
      break;

    case 'success':
      mutableStats.successfulOperations++;
      updateLatencyStats(mutableStats, latency);
      updateAverageAttempts(mutableStats, context.attempt);
      break;

    case 'all_attempts_failed':
      mutableStats.failedOperations++;
      updateLatencyStats(mutableStats, latency);
      break;

    case 'retryable_error':
      mutableStats.totalRetries++;
      if (error) {
        updateErrorDistribution(mutableStats, error);
      }
      break;

    case 'non_retryable_error':
      if (error) {
        updateErrorDistribution(mutableStats, error);
      }
      break;

    case 'circuit_breaker_error':
    case 'circuit_breaker_open':
      mutableStats.circuitBreakerTrips++;
      if (error) {
        updateErrorDistribution(mutableStats, error);
      }
      break;

    case 'fallback':
      mutableStats.fallbackExecutions++;
      break;
  }
}

/**
 * Helper functions for statistics updates
 */
function updateLatencyStats(stats: any, latency: number): void {
  stats.maxLatency = Math.max(stats.maxLatency, latency);
  stats.minLatency =
    stats.minLatency === 0 ? latency : Math.min(stats.minLatency, latency);

  const totalOps = stats.successfulOperations + stats.failedOperations;
  stats.averageLatency =
    (stats.averageLatency * (totalOps - 1) + latency) / totalOps;
}

function updateAverageAttempts(stats: any, attempts: number): void {
  stats.averageAttempts =
    (stats.averageAttempts * (stats.successfulOperations - 1) + attempts) /
    stats.successfulOperations;
}

function updateErrorDistribution(stats: any, error: Error): void {
  const errorKey = error.constructor.name || 'Unknown';
  stats.errorDistribution[errorKey] =
    (stats.errorDistribution[errorKey] || 0) + 1;
}

/**
 * Create initial statistics object
 */
function createInitialStatistics(operationName: string): RetryStatistics {
  return {
    operationName,
    totalAttempts: 0,
    successfulOperations: 0,
    failedOperations: 0,
    totalRetries: 0,
    averageAttempts: 0,
    circuitBreakerTrips: 0,
    fallbackExecutions: 0,
    lastOperation: new Date(),
    errorDistribution: {},
    averageLatency: 0,
    maxLatency: 0,
    minLatency: 0,
  };
}

/**
 * Add utility methods to the target instance
 */
function addUtilityMethods(
  target: any,
  propertyKey: string | symbol,
  context: RetryContext
): void {
  const methodName = String(propertyKey);

  Object.defineProperty(target, `${methodName}_getRetryStats`, {
    value: () => ({ ...context.statistics }),
    writable: false,
    enumerable: false,
  });

  Object.defineProperty(target, `${methodName}_resetRetryStats`, {
    value: () => {
      Object.assign(
        context.statistics,
        createInitialStatistics(context.operationName)
      );
    },
    writable: false,
    enumerable: false,
  });

  if (context.circuitBreaker) {
    Object.defineProperty(target, `${methodName}_getCircuitBreakerState`, {
      value: () => context.circuitBreaker!.getStats(),
      writable: false,
      enumerable: false,
    });

    Object.defineProperty(target, `${methodName}_resetCircuitBreaker`, {
      value: () => context.circuitBreaker!.reset(),
      writable: false,
      enumerable: false,
    });
  }
}

/**
 * Utility function to sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Re-export types and utilities for backward compatibility
export type { RetryConfig, ResolvedRetryConfig };
export { RetryConfigPresets } from './retry-config';
export { StrategyPresets } from './retry-strategies';
export { ErrorClassificationPresets } from './error-classifier';
export { CircuitBreakerFactory } from './circuit-breaker';

/**
 * Utility functions for external access to retry statistics
 */
export function getRetryStatistics(
  instance: any,
  methodName: string
): RetryStatistics | null {
  const statsMethod = instance[`${methodName}_getRetryStats`];
  return statsMethod ? statsMethod() : null;
}

export function resetRetryStatistics(instance: any, methodName: string): void {
  const resetMethod = instance[`${methodName}_resetRetryStats`];
  if (resetMethod) {
    resetMethod();
  }
}

export function getCircuitBreakerState(
  instance: any,
  methodName: string
): any | null {
  const stateMethod = instance[`${methodName}_getCircuitBreakerState`];
  return stateMethod ? stateMethod() : null;
}

export function resetCircuitBreaker(instance: any, methodName: string): void {
  const resetMethod = instance[`${methodName}_resetCircuitBreaker`];
  if (resetMethod) {
    resetMethod();
  }
}
