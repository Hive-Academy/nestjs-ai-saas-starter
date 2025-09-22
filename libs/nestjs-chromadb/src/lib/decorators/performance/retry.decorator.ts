/**
 * @fileoverview @Retry Decorator - Resilient Operations with Exponential Backoff
 * 
 * This decorator provides resilient operation patterns with intelligent retry logic
 * specifically designed for vector database operations and network failures.
 */

import { Logger } from '@nestjs/common';
import { 
  DecoratorMetadataRegistry, 
  DecoratorMetadataBuilder,
} from '../core/decorator-metadata';

/**
 * Configuration for @Retry decorator
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  readonly maxAttempts?: number;
  
  /** Base delay in milliseconds between retries */
  readonly baseDelay?: number;
  
  /** Maximum delay in milliseconds */
  readonly maxDelay?: number;
  
  /** Exponential backoff multiplier */
  readonly backoffMultiplier?: number;
  
  /** Add random jitter to prevent thundering herd */
  readonly jitter?: boolean;
  
  /** Maximum jitter amount (percentage of delay) */
  readonly maxJitter?: number;
  
  /** Retry strategy */
  readonly strategy?: 'exponential' | 'linear' | 'fixed' | 'custom';
  
  /** Custom delay function */
  readonly customDelay?: (attempt: number, baseDelay: number) => number;
  
  /** Predicate to determine if error should trigger retry */
  readonly retryPredicate?: (error: Error, attempt: number) => boolean;
  
  /** Errors that should trigger retry */
  readonly retryableErrors?: Array<string | RegExp | (new (...args: any[]) => Error)>;
  
  /** Errors that should not trigger retry */
  readonly nonRetryableErrors?: Array<string | RegExp | (new (...args: any[]) => Error)>;
  
  /** Timeout for individual attempts */
  readonly attemptTimeout?: number;
  
  /** Circuit breaker configuration */
  readonly circuitBreaker?: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeout: number;
  };
  
  /** Fallback function when all retries fail */
  readonly fallback?: (...args: any[]) => any | Promise<any>;
  
  /** Log retry attempts */
  readonly logRetries?: boolean;
  
  /** Operation category for metrics */
  readonly category?: string;
  
  /** Tags for metrics */
  readonly tags?: Record<string, string>;
}

/**
 * Retry statistics for monitoring
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
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  failures: number;
  isOpen: boolean;
  lastFailureTime: number;
  nextAttemptTime: number;
}

/**
 * @Retry decorator for resilient operations with exponential backoff
 * 
 * @example
 * ```typescript
 * @Injectable()
 * export class VectorService {
 *   @Retry({
 *     maxAttempts: 5,
 *     baseDelay: 1000, // 1 second
 *     strategy: 'exponential',
 *     backoffMultiplier: 2,
 *     jitter: true,
 *     retryableErrors: [
 *       'ECONNRESET',
 *       'ETIMEDOUT',
 *       /network/i,
 *       ConnectionError,
 *     ],
 *     nonRetryableErrors: [
 *       'ENOTFOUND',
 *       ValidationError,
 *     ],
 *   })
 *   async searchVectors(collection: string, query: string): Promise<any[]> {
 *     // This operation will be retried on network failures
 *     return this.chromaService.searchDocuments(collection, [query]);
 *   }
 * 
 *   @Retry({
 *     maxAttempts: 3,
 *     strategy: 'fixed',
 *     baseDelay: 500,
 *     circuitBreaker: {
 *       enabled: true,
 *       failureThreshold: 5,
 *       resetTimeout: 30000, // 30 seconds
 *     },
 *     fallback: async () => [], // Return empty array as fallback
 *   })
 *   async getDocuments(collection: string): Promise<any[]> {
 *     return this.chromaService.getDocuments(collection);
 *   }
 * }
 * ```
 */
export function Retry(config: RetryConfig = {}): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    // Store decorator metadata
    const metadata = DecoratorMetadataBuilder.createPerformanceMetadata(
      'Retry',
      'method',
      [], // No dependencies
      config
    );
    
    DecoratorMetadataRegistry.setMetadata(target, propertyKey, metadata);

    // Store original method
    const originalMethod = descriptor.value;
    const logger = new Logger(`Retry:${target.constructor.name}:${String(propertyKey)}`);
    
    // Merge config with defaults
    const finalConfig: Required<RetryConfig> = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      maxJitter: 0.1,
      strategy: 'exponential',
      customDelay: undefined,
      retryPredicate: undefined,
      retryableErrors: [
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ECONNREFUSED',
        /timeout/i,
        /connection/i,
        /network/i,
      ],
      nonRetryableErrors: [
        /validation/i,
        /unauthorized/i,
        /forbidden/i,
        /not found/i,
      ],
      attemptTimeout: 0,
      circuitBreaker: {
        enabled: false,
        failureThreshold: 5,
        resetTimeout: 60000,
      },
      fallback: undefined,
      logRetries: true,
      category: 'general',
      tags: {},
      ...config,
    };
    
    // Circuit breaker state
    const circuitBreaker: CircuitBreakerState = {
      failures: 0,
      isOpen: false,
      lastFailureTime: 0,
      nextAttemptTime: 0,
    };
    
    // Statistics tracking
    const statistics: RetryStatistics = {
      operationName: `${target.constructor.name}.${String(propertyKey)}`,
      totalAttempts: 0,
      successfulOperations: 0,
      failedOperations: 0,
      totalRetries: 0,
      averageAttempts: 0,
      circuitBreakerTrips: 0,
      fallbackExecutions: 0,
      lastOperation: new Date(),
      errorDistribution: {},
    };
    
    // Replace method with retry implementation
    descriptor.value = async function (...args: any[]) {
      const operationStart = Date.now();
      
      // Check circuit breaker
      if (finalConfig.circuitBreaker.enabled && isCircuitBreakerOpen(circuitBreaker, finalConfig)) {
        if (finalConfig.logRetries) {
          logger.warn('Circuit breaker is open, skipping operation');
        }
        
        if (finalConfig.fallback) {
          updateStatistics('fallback');
          return await finalConfig.fallback.apply(this, args);
        }
        
        throw new Error('Circuit breaker is open');
      }
      
      let lastError: Error;
      let attempt = 0;
      
      while (attempt < finalConfig.maxAttempts) {
        attempt++;
        updateStatistics('attempt');
        
        try {
          const result = finalConfig.attemptTimeout > 0
            ? await withTimeout(originalMethod.apply(this, args), finalConfig.attemptTimeout)
            : await originalMethod.apply(this, args);
          
          // Success - reset circuit breaker and return result
          if (finalConfig.circuitBreaker.enabled) {
            resetCircuitBreaker(circuitBreaker);
          }
          
          updateStatistics('success', undefined, attempt);
          
          if (finalConfig.logRetries && attempt > 1) {
            logger.log(`Operation succeeded on attempt ${attempt}`);
          }
          
          return result;
          
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          // Check if this error should trigger a retry
          if (!shouldRetry(lastError, attempt, finalConfig)) {
            updateStatistics('non_retryable_error', lastError, attempt);
            
            if (finalConfig.logRetries) {
              logger.error(`Non-retryable error on attempt ${attempt}: ${lastError.message}`);
            }
            
            throw lastError;
          }
          
          // Update circuit breaker on retryable error
          if (finalConfig.circuitBreaker.enabled) {
            recordCircuitBreakerFailure(circuitBreaker, finalConfig);
          }
          
          updateStatistics('retryable_error', lastError, attempt);
          
          // If this is the last attempt, don't wait
          if (attempt >= finalConfig.maxAttempts) {
            break;
          }
          
          // Calculate delay for next attempt
          const delay = calculateDelay(attempt, finalConfig);
          
          if (finalConfig.logRetries) {
            logger.warn(
              `Attempt ${attempt} failed: ${lastError.message}. Retrying in ${delay}ms`
            );
          }
          
          // Wait before next attempt
          await sleep(delay);
        }
      }
      
      // All attempts failed
      updateStatistics('failure', lastError, attempt);
      
      if (finalConfig.logRetries) {
        logger.error(
          `All ${finalConfig.maxAttempts} attempts failed. Last error: ${lastError.message}`
        );
      }
      
      // Try fallback if available
      if (finalConfig.fallback) {
        updateStatistics('fallback');
        
        if (finalConfig.logRetries) {
          logger.log('Executing fallback function');
        }
        
        return await finalConfig.fallback.apply(this, args);
      }
      
      throw lastError;
      
      function updateStatistics(
        event: 'attempt' | 'success' | 'failure' | 'retryable_error' | 'non_retryable_error' | 'fallback',
        error?: Error,
        attemptNumber?: number
      ): void {
        const mutableStats = statistics as any;
        
        switch (event) {
          case 'attempt':
            mutableStats.totalAttempts++;
            mutableStats.lastOperation = new Date();
            break;
            
          case 'success':
            mutableStats.successfulOperations++;
            if (attemptNumber) {
              mutableStats.averageAttempts = 
                (mutableStats.averageAttempts * (mutableStats.successfulOperations - 1) + attemptNumber) / 
                mutableStats.successfulOperations;
            }
            break;
            
          case 'failure':
            mutableStats.failedOperations++;
            break;
            
          case 'retryable_error':
            mutableStats.totalRetries++;
            if (error) {
              const errorKey = error.constructor.name || 'Unknown';
              mutableStats.errorDistribution[errorKey] = (mutableStats.errorDistribution[errorKey] || 0) + 1;
            }
            break;
            
          case 'non_retryable_error':
            if (error) {
              const errorKey = error.constructor.name || 'Unknown';
              mutableStats.errorDistribution[errorKey] = (mutableStats.errorDistribution[errorKey] || 0) + 1;
            }
            break;
            
          case 'fallback':
            mutableStats.fallbackExecutions++;
            break;
        }
      }
    };
    
    // Add statistics methods to the instance
    Object.defineProperty(target, `${String(propertyKey)}_getRetryStats`, {
      value: () => ({ ...statistics }),
      writable: false,
      enumerable: false,
    });
    
    Object.defineProperty(target, `${String(propertyKey)}_resetRetryStats`, {
      value: () => {
        Object.assign(statistics, {
          totalAttempts: 0,
          successfulOperations: 0,
          failedOperations: 0,
          totalRetries: 0,
          averageAttempts: 0,
          circuitBreakerTrips: 0,
          fallbackExecutions: 0,
          errorDistribution: {},
        });
      },
      writable: false,
      enumerable: false,
    });
    
    Object.defineProperty(target, `${String(propertyKey)}_getCircuitBreakerState`, {
      value: () => ({ ...circuitBreaker }),
      writable: false,
      enumerable: false,
    });
    
    Object.defineProperty(target, `${String(propertyKey)}_resetCircuitBreaker`, {
      value: () => resetCircuitBreaker(circuitBreaker),
      writable: false,
      enumerable: false,
    });
    
    return descriptor;
  };
}

/**
 * Determine if an error should trigger a retry
 */
function shouldRetry(error: Error, attempt: number, config: Required<RetryConfig>): boolean {
  // Use custom predicate if provided
  if (config.retryPredicate) {
    return config.retryPredicate(error, attempt);
  }
  
  const errorMessage = error.message;
  const errorName = error.constructor.name;
  
  // Check non-retryable errors first
  for (const nonRetryable of config.nonRetryableErrors) {
    if (typeof nonRetryable === 'string') {
      if (errorMessage.includes(nonRetryable) || errorName.includes(nonRetryable)) {
        return false;
      }
    } else if (nonRetryable instanceof RegExp) {
      if (nonRetryable.test(errorMessage) || nonRetryable.test(errorName)) {
        return false;
      }
    } else if (typeof nonRetryable === 'function') {
      if (error instanceof nonRetryable) {
        return false;
      }
    }
  }
  
  // Check retryable errors
  for (const retryable of config.retryableErrors) {
    if (typeof retryable === 'string') {
      if (errorMessage.includes(retryable) || errorName.includes(retryable)) {
        return true;
      }
    } else if (retryable instanceof RegExp) {
      if (retryable.test(errorMessage) || retryable.test(errorName)) {
        return true;
      }
    } else if (typeof retryable === 'function') {
      if (error instanceof retryable) {
        return true;
      }
    }
  }
  
  // Default: retry on common network/timeout errors
  return /timeout|network|connection|reset|refused/i.test(errorMessage);
}

/**
 * Calculate delay for next retry attempt
 */
function calculateDelay(attempt: number, config: Required<RetryConfig>): number {
  let delay: number;
  
  switch (config.strategy) {
    case 'linear':
      delay = config.baseDelay * attempt;
      break;
      
    case 'fixed':
      delay = config.baseDelay;
      break;
      
    case 'custom':
      if (config.customDelay) {
        delay = config.customDelay(attempt, config.baseDelay);
      } else {
        delay = config.baseDelay;
      }
      break;
      
    case 'exponential':
    default:
      delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
      break;
  }
  
  // Apply maximum delay limit
  delay = Math.min(delay, config.maxDelay);
  
  // Add jitter if enabled
  if (config.jitter) {
    const jitterAmount = delay * config.maxJitter * Math.random();
    delay += jitterAmount;
  }
  
  return Math.round(delay);
}

/**
 * Check if circuit breaker is open
 */
function isCircuitBreakerOpen(
  circuitBreaker: CircuitBreakerState,
  config: Required<RetryConfig>
): boolean {
  if (!circuitBreaker.isOpen) {
    return false;
  }
  
  // Check if reset timeout has passed
  const now = Date.now();
  if (now >= circuitBreaker.nextAttemptTime) {
    // Half-open state - allow one attempt
    circuitBreaker.isOpen = false;
    return false;
  }
  
  return true;
}

/**
 * Record a failure in the circuit breaker
 */
function recordCircuitBreakerFailure(
  circuitBreaker: CircuitBreakerState,
  config: Required<RetryConfig>
): void {
  circuitBreaker.failures++;
  circuitBreaker.lastFailureTime = Date.now();
  
  if (circuitBreaker.failures >= config.circuitBreaker.failureThreshold) {
    circuitBreaker.isOpen = true;
    circuitBreaker.nextAttemptTime = Date.now() + config.circuitBreaker.resetTimeout;
  }
}

/**
 * Reset the circuit breaker after a successful operation
 */
function resetCircuitBreaker(circuitBreaker: CircuitBreakerState): void {
  circuitBreaker.failures = 0;
  circuitBreaker.isOpen = false;
  circuitBreaker.nextAttemptTime = 0;
}

/**
 * Utility function to add timeout to a promise
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  
  return Promise.race([promise, timeout]);
}

/**
 * Utility function to sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Utility function to get retry statistics for a method
 */
export function getRetryStatistics(instance: any, methodName: string): RetryStatistics | null {
  const statsMethod = instance[`${methodName}_getRetryStats`];
  return statsMethod ? statsMethod() : null;
}

/**
 * Utility function to reset retry statistics for a method
 */
export function resetRetryStatistics(instance: any, methodName: string): void {
  const resetMethod = instance[`${methodName}_resetRetryStats`];
  if (resetMethod) {
    resetMethod();
  }
}

/**
 * Utility function to get circuit breaker state for a method
 */
export function getCircuitBreakerState(instance: any, methodName: string): CircuitBreakerState | null {
  const stateMethod = instance[`${methodName}_getCircuitBreakerState`];
  return stateMethod ? stateMethod() : null;
}

/**
 * Utility function to reset circuit breaker for a method
 */
export function resetCircuitBreaker(instance: any, methodName: string): void {
  const resetMethod = instance[`${methodName}_resetCircuitBreaker`];
  if (resetMethod) {
    resetMethod();
  }
}

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
    retryableErrors: [
      /connection/i,
      /timeout/i,
      /lock/i,
      /deadlock/i,
    ],
    nonRetryableErrors: [
      /constraint/i,
      /syntax/i,
      /permission/i,
    ],
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

/**
 * Example usage:
 * 
 * @example Using preset configurations
 * ```typescript
 * @Injectable()
 * export class VectorService {
 *   @Retry(RetryPresets.vectorSearch)
 *   async searchVectors(collection: string, query: string): Promise<any[]> {
 *     return this.chromaService.searchDocuments(collection, [query]);
 *   }
 * 
 *   @Retry({
 *     ...RetryPresets.network,
 *     fallback: async () => {
 *       // Return cached results or empty array
 *       return this.getCachedResults();
 *     },
 *   })
 *   async getDocuments(collection: string): Promise<any[]> {
 *     return this.chromaService.getDocuments(collection);
 *   }
 * 
 *   async getServiceHealth(): Promise<any> {
 *     return {
 *       search: getRetryStatistics(this, 'searchVectors'),
 *       documents: getRetryStatistics(this, 'getDocuments'),
 *       circuitBreakerState: {
 *         search: getCircuitBreakerState(this, 'searchVectors'),
 *         documents: getCircuitBreakerState(this, 'getDocuments'),
 *       },
 *     };
 *   }
 * }
 * ```
 */