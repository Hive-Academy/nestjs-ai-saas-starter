/**
 * @fileoverview Core Retry Decorator Implementation - Main execution logic
 */

import { Logger } from '@nestjs/common';
import {
  DecoratorMetadataRegistry,
  DecoratorMetadataBuilder,
} from '../../core/decorator-metadata';

import { RetryDelayCalculator, RetryStrategyFactory } from './retry-strategies';
import type { CircuitBreaker } from './circuit-breaker';
import {
  ErrorClassification,
  type ErrorClassifier,
  ErrorClassifierFactory,
} from './error-classifier';
import {
  type RetryConfig,
  type ResolvedRetryConfig,
  RetryConfigResolver,
  RetryConfigValidator,
} from './retry-config';
import {
  type RetryStatistics,
  updateRetryStatistics,
} from './retry-statistics';
import { getOrCreateCircuitBreaker } from './retry-circuit-breaker';

/**
 * Retry execution context
 */
export interface RetryContext {
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
 * @Retry Decorator - Strategy Pattern Implementation
 *
 * This decorator orchestrates retry logic using the Strategy pattern for extensible
 * and maintainable retry operations with sophisticated error handling.
 *
 * @example
 * ```typescript
 * @Retry({
 *   maxAttempts: 3,
 *   strategy: 'exponential',
 *   backoffMultiplier: 2,
 *   baseDelay: 1000,
 *   circuitBreaker: { enabled: true }
 * })
 * async addDocuments(documents: Document[]): Promise<void> {
 *   // Your vector operation here
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
      ? getOrCreateCircuitBreaker(
          target,
          String(propertyKey),
          resolvedConfig.circuitBreaker
        )
      : undefined;

    const errorClassifier = ErrorClassifierFactory.createForDomain(
      'vectorDatabase',
      {
        retryableErrors: resolvedConfig.retryableErrors,
        nonRetryableErrors: resolvedConfig.nonRetryableErrors,
        customPredicate: resolvedConfig.retryPredicate
          ? (error: Error, attempt: number) =>
              resolvedConfig.retryPredicate!(error, attempt)
                ? ErrorClassification.RETRYABLE
                : ErrorClassification.NON_RETRYABLE
          : undefined,
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

    return descriptor;
  };
}

/**
 * Main retry execution logic
 */
async function executeWithRetry(
  this: any,
  originalMethod: (...args: any[]) => any,
  args: any[],
  context: RetryContext
): Promise<any> {
  context.startTime = Date.now();
  context.attempt = 0;

  // Check circuit breaker before starting
  if (context.circuitBreaker && !context.circuitBreaker.canExecute()) {
    updateRetryStatistics(this, context.operationName, {
      circuitBreakerTrips: context.statistics.circuitBreakerTrips + 1,
    });

    if (
      context.config.logging.enabled &&
      context.config.logging.logCircuitBreaker
    ) {
      context.logger.warn('Circuit breaker is open, skipping operation');
    }

    return handleFallback(context, args, new Error('Circuit breaker is open'));
  }

  let lastError: Error = new Error('Unknown error');

  while (context.attempt < context.config.maxAttempts) {
    context.attempt++;
    updateRetryStatistics(this, context.operationName, {
      totalAttempts: context.statistics.totalAttempts + 1,
    });

    try {
      const result = context.config.timeout.enabled
        ? await executeWithTimeout(originalMethod.apply(this, args), context)
        : await originalMethod.apply(this, args);

      // Success - update circuit breaker and return
      if (context.circuitBreaker) {
        context.circuitBreaker.recordSuccess();
      }

      updateRetryStatistics(this, context.operationName, {
        successfulOperations: context.statistics.successfulOperations + 1,
        lastOperation: new Date(),
      });

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
        updateRetryStatistics(this, context.operationName, {
          failedOperations: context.statistics.failedOperations + 1,
        });

        logAttemptResult(
          context,
          'non_retryable_error',
          lastError,
          classification.reason
        );
        throw lastError;
      }

      if (context.circuitBreaker) {
        context.circuitBreaker.recordFailure();
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
  updateRetryStatistics(this, context.operationName, {
    failedOperations: context.statistics.failedOperations + 1,
  });

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
    updateRetryStatistics(this, context.operationName, {
      fallbackExecutions: context.statistics.fallbackExecutions + 1,
    });

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
    case 'circuit_breaker_error':
      if (context.config.logging.logFailures) {
        context.logger.error(`${attemptInfo}: ${logMessage}`);
      }
      break;
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create initial statistics
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
