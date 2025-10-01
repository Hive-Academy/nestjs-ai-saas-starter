/**
 * @fileoverview ChromaDB Performance Monitoring Service
 *
 * Handles performance monitoring, metrics collection, and operation timing
 * Following Single Responsibility Principle - focused only on performance concerns
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { ChromaCacheService } from '../caching/chroma-cache.service';
import { ChromaMetricsService } from '../chroma-metrics.service';

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  enableMetrics?: boolean;
  enableCaching?: boolean;
  cacheTimeout?: number;
  operationTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Operation metrics for performance tracking
 */
export interface OperationMetrics {
  operationName: string;
  executionTime: number;
  success: boolean;
  error?: string;
  cacheHit?: boolean;
  timestamp: Date;
}

/**
 * ChromaDB Performance Service
 *
 * Provides monitoring, caching, and performance tracking capabilities
 */
@Injectable()
export class ChromaDBPerformanceService {
  private readonly logger = new Logger(ChromaDBPerformanceService.name);

  private readonly defaultConfig: PerformanceConfig = {
    enableMetrics: true,
    enableCaching: true,
    cacheTimeout: 300000, // 5 minutes
    operationTimeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  };

  constructor(
    @Optional() private readonly metricsService?: ChromaMetricsService,
    @Optional() private readonly cacheService?: ChromaCacheService,
    private readonly config: PerformanceConfig = {}
  ) {}

  /**
   * Get effective configuration with defaults
   */
  getConfig(): PerformanceConfig {
    return { ...this.defaultConfig, ...this.config };
  }

  /**
   * Execute operation with comprehensive monitoring, caching, and error handling
   */
  async executeWithMonitoring<T>(
    operationName: string,
    operation: () => Promise<T>,
    cacheKey?: string
  ): Promise<T> {
    const startTime = Date.now();
    let cacheHit = false;
    const effectiveConfig = this.getConfig();

    try {
      // Check cache first if enabled and key provided
      if (effectiveConfig.enableCaching && cacheKey && this.cacheService) {
        const cached = await this.cacheService.get<T>(cacheKey);
        if (cached !== null) {
          cacheHit = true;
          this.recordMetrics(
            operationName,
            Date.now() - startTime,
            true,
            undefined,
            true
          );
          return cached;
        }
      }

      // Execute operation
      const result = await operation();

      // Cache result if caching is enabled
      if (effectiveConfig.enableCaching && cacheKey && this.cacheService) {
        await this.cacheService.set(
          cacheKey,
          result,
          effectiveConfig.cacheTimeout
        );
      }

      this.recordMetrics(
        operationName,
        Date.now() - startTime,
        true,
        undefined,
        cacheHit
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.recordMetrics(
        operationName,
        executionTime,
        false,
        errorMessage,
        cacheHit
      );
      throw error;
    }
  }

  /**
   * Record operation metrics
   */
  recordMetrics(
    operationName: string,
    executionTime: number,
    success: boolean,
    error?: string,
    cacheHit?: boolean
  ): void {
    const effectiveConfig = this.getConfig();

    if (!effectiveConfig.enableMetrics || !this.metricsService) {
      return;
    }

    const metrics: OperationMetrics = {
      operationName,
      executionTime,
      success,
      error,
      cacheHit,
      timestamp: new Date(),
    };

    this.metricsService.recordOperation(metrics);
  }

  /**
   * Generate cache key for operations
   */
  generateCacheKey(operation: string, ...params: any[]): string {
    const keyParts = [operation, ...params.map((p) => JSON.stringify(p))];
    const keyString = keyParts.join(':');
    return `chroma:${this.hashCode(keyString)}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private hashCode(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash);
  }

  /**
   * Execute operation with timeout
   */
  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs?: number
  ): Promise<T> {
    const effectiveTimeout =
      timeoutMs || this.getConfig().operationTimeout || 30000;

    return Promise.race([
      operation(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`Operation timed out after ${effectiveTimeout}ms`)
            ),
          effectiveTimeout
        )
      ),
    ]);
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operationName: string,
    operation: () => Promise<T>,
    maxRetries?: number,
    delayMs?: number
  ): Promise<T> {
    const effectiveConfig = this.getConfig();
    const retries = maxRetries ?? effectiveConfig.retryAttempts ?? 3;
    const delay = delayMs ?? effectiveConfig.retryDelay ?? 1000;

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === retries) {
          this.logger.error(
            `Operation ${operationName} failed after ${retries} attempts`,
            {
              attempts: retries,
              finalError: lastError.message,
            }
          );
          break;
        }

        if (this.isRetriableError(lastError)) {
          this.logger.warn(
            `Operation ${operationName} attempt ${attempt} failed, retrying...`,
            {
              attempt,
              maxRetries: retries,
              error: lastError.message,
              retryDelayMs: delay,
            }
          );

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          // Non-retriable error, fail immediately
          break;
        }
      }
    }

    throw (
      lastError ||
      new Error(`Operation ${operationName} failed after ${retries} attempts`)
    );
  }

  /**
   * Check if error is retriable
   */
  private isRetriableError(error: Error): boolean {
    const retriablePatterns = [
      /network/i,
      /timeout/i,
      /connection/i,
      /temporary/i,
      /rate.limit/i,
      /service.unavailable/i,
      /502/,
      /503/,
      /504/,
    ];

    return retriablePatterns.some(
      (pattern) =>
        pattern.test(error.message) || (error.name && pattern.test(error.name))
    );
  }

  /**
   * Measure operation execution time
   */
  async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; executionTime: number }> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const executionTime = Date.now() - startTime;

      this.logger.debug(
        `Operation ${operationName} completed in ${executionTime}ms`
      );

      return { result, executionTime };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error(
        `Operation ${operationName} failed after ${executionTime}ms`,
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );

      throw error;
    }
  }

  /**
   * Clear cache for specific keys or patterns
   */
  async clearCache(keyOrPattern?: string): Promise<void> {
    if (!this.cacheService) {
      return;
    }

    if (keyOrPattern) {
      await this.cacheService.delete(keyOrPattern);
    } else {
      // Clear all cache entries (pattern-based clearing not supported by clear method)
      await this.cacheService.clear();
    }
  }

  /**
   * Get cache statistics if available
   */
  async getCacheStats(): Promise<{
    size?: number;
    hitRate?: number;
    missRate?: number;
  }> {
    if (!this.cacheService || !('getStats' in this.cacheService)) {
      return {};
    }

    try {
      return await (this.cacheService as any).getStats();
    } catch (error) {
      this.logger.warn('Failed to get cache statistics', { error });
      return {};
    }
  }
}
