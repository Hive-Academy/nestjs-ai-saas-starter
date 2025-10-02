/**
 * Performance Optimization Decorators for Business Workflows
 *
 * Provides enterprise-grade performance optimizations:
 * - Intelligent caching with TTL and invalidation
 * - Request batching and deduplication
 * - Circuit breakers for external services
 * - Metrics collection and monitoring
 * - Memory usage optimization
 * - Concurrent execution management
 */

import 'reflect-metadata';
import { performance } from 'perf_hooks';

// ============================================================================
// PERFORMANCE METADATA KEYS
// ============================================================================

const CACHE_METADATA_KEY = Symbol('cache');
const BATCH_METADATA_KEY = Symbol('batch');
const CIRCUIT_BREAKER_METADATA_KEY = Symbol('circuit_breaker');
const METRICS_METADATA_KEY = Symbol('metrics');
const TIMEOUT_METADATA_KEY = Symbol('timeout');

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum cache size
  keyGenerator?: (args: any[]) => string;
  invalidateOn?: string[]; // Events that invalidate cache
}

// Simple in-memory cache implementation
class SimpleCache {
  private cache = new Map<string, { value: any; expiry: number }>();
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  get(key: string): any {
    const item = this.cache.get(key);
    if (!item) return undefined;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  set(key: string, value: any, ttl: number): void {
    // Evict oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const globalCache = new SimpleCache(5000);

/**
 * Cache method results with configurable TTL and invalidation
 */
export function Cache(config: Partial<CacheConfig> = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const cacheConfig: CacheConfig = {
      ttl: 300000, // 5 minutes default
      maxSize: 1000,
      keyGenerator: (args) =>
        `${target.constructor.name}_${propertyKey}_${JSON.stringify(args)}`,
      ...config,
    };

    descriptor.value = async function (...args: any[]) {
      const cacheKey = cacheConfig.keyGenerator!(args);

      // Try to get from cache
      const cachedResult = globalCache.get(cacheKey);
      if (cachedResult !== undefined) {
        return cachedResult;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Cache the result
      globalCache.set(cacheKey, result, cacheConfig.ttl);

      return result;
    };

    // Store metadata for cache management
    Reflect.defineMetadata(
      CACHE_METADATA_KEY,
      cacheConfig,
      target,
      propertyKey
    );

    return descriptor;
  };
}

/**
 * Invalidate cache entries based on patterns or keys
 */
export function InvalidateCache(pattern?: string | RegExp) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      // Invalidate cache entries
      if (pattern) {
        // TODO: Implement pattern-based cache invalidation
        // For now, clear all cache
        globalCache.clear();
      }

      return result;
    };

    return descriptor;
  };
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

interface BatchConfig {
  maxBatchSize: number;
  batchTimeout: number; // milliseconds
  keyExtractor?: (args: any[]) => string;
}

// Batch processing manager
class BatchManager {
  private batches = new Map<
    string,
    {
      items: Array<{
        args: any[];
        resolve: (value: any) => void;
        reject: (reason?: any) => void;
      }>;
      timeout: NodeJS.Timeout;
    }
  >();

  addToBatch(
    batchKey: string,
    args: any[],
    config: BatchConfig,
    executor: (...args: any[]) => Promise<any>
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      let batch = this.batches.get(batchKey);

      if (!batch) {
        batch = {
          items: [],
          timeout: setTimeout(() => {
            this.executeBatch(batchKey, executor, config);
          }, config.batchTimeout),
        };
        this.batches.set(batchKey, batch);
      }

      batch.items.push({ args, resolve, reject });

      // Execute immediately if batch is full
      if (batch.items.length >= config.maxBatchSize) {
        clearTimeout(batch.timeout);
        this.executeBatch(batchKey, executor, config);
      }
    });
  }

  private async executeBatch(
    batchKey: string,
    executor: (...args: any[]) => Promise<any>,
    config: BatchConfig
  ) {
    const batch = this.batches.get(batchKey);
    if (!batch) return;

    this.batches.delete(batchKey);
    clearTimeout(batch.timeout);

    try {
      // Execute all items in the batch
      const results = await Promise.allSettled(
        batch.items.map((item) => executor(...item.args))
      );

      // Resolve/reject individual promises
      results.forEach((result, index) => {
        const item = batch.items[index];
        if (result.status === 'fulfilled') {
          item.resolve(result.value);
        } else {
          item.reject(result.reason);
        }
      });
    } catch (error) {
      // Reject all promises in case of batch failure
      batch.items.forEach((item) => item.reject(error));
    }
  }
}

const batchManager = new BatchManager();

/**
 * Batch similar requests together for efficient processing
 */
export function Batch(config: Partial<BatchConfig> = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const batchConfig: BatchConfig = {
      maxBatchSize: 10,
      batchTimeout: 100, // 100ms
      keyExtractor: () => `${target.constructor.name}_${propertyKey}`,
      ...config,
    };

    descriptor.value = async function (...args: any[]) {
      const batchKey = batchConfig.keyExtractor!(args);
      return batchManager.addToBatch(
        batchKey,
        args,
        batchConfig,
        originalMethod.bind(this)
      );
    };

    Reflect.defineMetadata(
      BATCH_METADATA_KEY,
      batchConfig,
      target,
      propertyKey
    );
    return descriptor;
  };
}

// ============================================================================
// CIRCUIT BREAKER PATTERN
// ============================================================================

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number; // milliseconds
  healthCheckInterval?: number;
}

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

class CircuitBreakerImpl {
  private state = CircuitState.CLOSED;
  private failures = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = CircuitState.CLOSED;
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }
}

// Circuit breaker registry
const circuitBreakers = new Map<string, CircuitBreakerImpl>();

/**
 * Implement circuit breaker pattern for external service calls
 */
export function CircuitBreakerDecorator(
  config: Partial<CircuitBreakerConfig> = {}
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const cbConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      ...config,
    };

    const circuitKey = `${target.constructor.name}_${propertyKey}`;
    const circuitBreaker = new CircuitBreakerImpl(cbConfig);
    circuitBreakers.set(circuitKey, circuitBreaker);

    descriptor.value = async function (...args: any[]) {
      return circuitBreaker.execute(() => originalMethod.apply(this, args));
    };

    Reflect.defineMetadata(
      CIRCUIT_BREAKER_METADATA_KEY,
      cbConfig,
      target,
      propertyKey
    );
    return descriptor;
  };
}

// ============================================================================
// METRICS AND MONITORING
// ============================================================================

interface MetricsConfig {
  trackExecutionTime: boolean;
  trackMemoryUsage: boolean;
  trackErrorRate: boolean;
  sampleRate: number; // 0-1, percentage of calls to track
}

interface MethodMetrics {
  callCount: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  errorCount: number;
  errorRate: number;
  lastCall: Date;
  memoryUsage?: {
    before: number;
    after: number;
    delta: number;
  };
}

// Global metrics storage
const methodMetrics = new Map<string, MethodMetrics>();

/**
 * Collect performance metrics for method execution
 */
export function Metrics(config: Partial<MetricsConfig> = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const metricsConfig: MetricsConfig = {
      trackExecutionTime: true,
      trackMemoryUsage: false,
      trackErrorRate: true,
      sampleRate: 1.0,
      ...config,
    };

    const metricsKey = `${target.constructor.name}_${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      // Sample rate check
      if (Math.random() > metricsConfig.sampleRate) {
        return originalMethod.apply(this, args);
      }

      const startTime = metricsConfig.trackExecutionTime
        ? performance.now()
        : 0;
      const startMemory = metricsConfig.trackMemoryUsage
        ? process.memoryUsage().heapUsed
        : 0;

      let metrics = methodMetrics.get(metricsKey);
      if (!metrics) {
        metrics = {
          callCount: 0,
          totalExecutionTime: 0,
          averageExecutionTime: 0,
          errorCount: 0,
          errorRate: 0,
          lastCall: new Date(),
        };
        methodMetrics.set(metricsKey, metrics);
      }

      try {
        const result = await originalMethod.apply(this, args);

        // Update success metrics
        metrics.callCount++;

        if (metricsConfig.trackExecutionTime) {
          const executionTime = performance.now() - startTime;
          metrics.totalExecutionTime += executionTime;
          metrics.averageExecutionTime =
            metrics.totalExecutionTime / metrics.callCount;
        }

        if (metricsConfig.trackMemoryUsage) {
          const endMemory = process.memoryUsage().heapUsed;
          metrics.memoryUsage = {
            before: startMemory,
            after: endMemory,
            delta: endMemory - startMemory,
          };
        }

        metrics.lastCall = new Date();
        metrics.errorRate = metrics.errorCount / metrics.callCount;

        return result;
      } catch (error) {
        // Update error metrics
        metrics.callCount++;
        metrics.errorCount++;
        metrics.errorRate = metrics.errorCount / metrics.callCount;
        metrics.lastCall = new Date();

        throw error;
      }
    };

    Reflect.defineMetadata(
      METRICS_METADATA_KEY,
      metricsConfig,
      target,
      propertyKey
    );
    return descriptor;
  };
}

// ============================================================================
// TIMEOUT MANAGEMENT
// ============================================================================

/**
 * Add timeout to method execution
 */
export function Timeout(timeoutMs: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return Promise.race([
        originalMethod.apply(this, args),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(`Method ${propertyKey} timed out after ${timeoutMs}ms`)
            );
          }, timeoutMs);
        }),
      ]);
    };

    Reflect.defineMetadata(
      TIMEOUT_METADATA_KEY,
      timeoutMs,
      target,
      propertyKey
    );
    return descriptor;
  };
}

// ============================================================================
// CONCURRENT EXECUTION CONTROL
// ============================================================================

/**
 * Limit concurrent executions of a method
 */
export function ConcurrencyLimit(maxConcurrent: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    let currentExecutions = 0;
    const queue: Array<() => void> = [];

    descriptor.value = async function (...args: any[]) {
      return new Promise((resolve, reject) => {
        const execute = async () => {
          currentExecutions++;
          try {
            const result = await originalMethod.apply(this, args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            currentExecutions--;
            if (queue.length > 0) {
              const next = queue.shift();
              next?.();
            }
          }
        };

        if (currentExecutions < maxConcurrent) {
          execute();
        } else {
          queue.push(execute);
        }
      });
    };

    return descriptor;
  };
}

// ============================================================================
// PERFORMANCE UTILITIES
// ============================================================================

/**
 * Get metrics for a specific method
 */
export function getMethodMetrics(
  className: string,
  methodName: string
): MethodMetrics | undefined {
  return methodMetrics.get(`${className}_${methodName}`);
}

/**
 * Get all metrics
 */
export function getAllMetrics(): Map<string, MethodMetrics> {
  return new Map(methodMetrics);
}

/**
 * Clear all metrics
 */
export function clearMetrics(): void {
  methodMetrics.clear();
}

/**
 * Get circuit breaker state
 */
export function getCircuitBreakerState(
  className: string,
  methodName: string
): CircuitState | undefined {
  const circuitBreaker = circuitBreakers.get(`${className}_${methodName}`);
  return circuitBreaker?.getState();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; maxSize: number } {
  return {
    size: globalCache.size(),
    maxSize: 5000, // hardcoded for now
  };
}

/**
 * Clear cache
 */
export function clearCache(): void {
  globalCache.clear();
}

/**
 * Performance monitoring decorator that combines multiple optimizations
 */
export function Optimize(
  config: {
    cache?: Partial<CacheConfig>;
    metrics?: Partial<MetricsConfig>;
    circuitBreaker?: Partial<CircuitBreakerConfig>;
    timeout?: number;
    concurrencyLimit?: number;
  } = {}
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    // Apply multiple decorators in order
    if (config.cache) {
      Cache(config.cache)(target, propertyKey, descriptor);
    }
    if (config.metrics) {
      Metrics(config.metrics)(target, propertyKey, descriptor);
    }
    if (config.circuitBreaker) {
      CircuitBreakerDecorator(config.circuitBreaker)(
        target,
        propertyKey,
        descriptor
      );
    }
    if (config.timeout) {
      Timeout(config.timeout)(target, propertyKey, descriptor);
    }
    if (config.concurrencyLimit) {
      ConcurrencyLimit(config.concurrencyLimit)(
        target,
        propertyKey,
        descriptor
      );
    }

    return descriptor;
  };
}

// Export types for external use
export type {
  CacheConfig,
  BatchConfig,
  CircuitBreakerConfig,
  MetricsConfig,
  MethodMetrics,
};

export { CircuitState };
