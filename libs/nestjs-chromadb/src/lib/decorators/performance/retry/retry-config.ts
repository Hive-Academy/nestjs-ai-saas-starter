/**
 * @fileoverview Retry Configuration Management - Centralized Settings
 *
 * This module provides comprehensive configuration management for retry operations,
 * including validation, defaults, and preset configurations.
 */

import type { CircuitBreakerConfig } from './circuit-breaker';

/**
 * Timeout configuration for individual attempts
 */
export interface TimeoutConfig {
  enabled: boolean;
  timeoutMs: number;
  timeoutMessage?: string;
}

/**
 * Fallback configuration for when all retries fail
 */
export interface FallbackConfig {
  enabled: boolean;
  fallbackFunction?: (...args: any[]) => any | Promise<any>;
  fallbackValue?: any;
  logFallback?: boolean;
}

/**
 * Logging configuration for retry operations
 */
export interface LoggingConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logAttempts: boolean;
  logSuccess: boolean;
  logFailures: boolean;
  logFallback: boolean;
  logCircuitBreaker: boolean;
}

/**
 * Metrics and monitoring configuration
 */
export interface MetricsConfig {
  enabled: boolean;
  category: string;
  tags: Record<string, string>;
  trackLatency: boolean;
  trackAttempts: boolean;
  trackErrors: boolean;
  trackCircuitBreaker: boolean;
}

/**
 * Comprehensive retry configuration
 */
export interface RetryConfig {
  // Basic retry settings
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;

  // Strategy configuration
  strategy?: 'exponential' | 'linear' | 'fixed' | 'custom';
  backoffMultiplier?: number;
  jitter?: boolean;
  maxJitter?: number;
  customDelay?: (attempt: number, baseDelay: number) => number;

  // Error handling
  retryPredicate?: (error: Error, attempt: number) => boolean;
  retryableErrors?: Array<string | RegExp | (new (...args: any[]) => Error)>;
  nonRetryableErrors?: Array<string | RegExp | (new (...args: any[]) => Error)>;

  // Advanced configurations
  timeout?: TimeoutConfig;
  circuitBreaker?: CircuitBreakerConfig;
  fallback?: FallbackConfig;
  logging?: LoggingConfig;
  metrics?: MetricsConfig;

  // Legacy compatibility (deprecated)
  attemptTimeout?: number;
  logRetries?: boolean;
  category?: string;
  tags?: Record<string, string>;
}

/**
 * Complete retry configuration with all defaults applied
 */
export interface ResolvedRetryConfig
  extends Required<
    Omit<
      RetryConfig,
      | 'customDelay'
      | 'retryPredicate'
      | 'retryableErrors'
      | 'nonRetryableErrors'
    >
  > {
  customDelay?: (attempt: number, baseDelay: number) => number;
  retryPredicate?: (error: Error, attempt: number) => boolean;
  retryableErrors: Array<string | RegExp | (new (...args: any[]) => Error)>;
  nonRetryableErrors: Array<string | RegExp | (new (...args: any[]) => Error)>;
}

/**
 * Configuration validator for retry settings
 */
export class RetryConfigValidator {
  /**
   * Validate retry configuration and return validation result
   * @param config Configuration to validate
   * @returns Validation result with errors if any
   */
  static validate(config: RetryConfig): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate basic settings
    if (config.maxAttempts !== undefined) {
      if (config.maxAttempts < 1) {
        errors.push('maxAttempts must be at least 1');
      }
      if (config.maxAttempts > 20) {
        warnings.push('maxAttempts > 20 may cause excessive delays');
      }
    }

    if (config.baseDelay !== undefined && config.baseDelay < 0) {
      errors.push('baseDelay must be non-negative');
    }

    if (config.maxDelay !== undefined && config.maxDelay < 0) {
      errors.push('maxDelay must be non-negative');
    }

    if (config.baseDelay !== undefined && config.maxDelay !== undefined) {
      if (config.baseDelay > config.maxDelay) {
        errors.push('baseDelay cannot be greater than maxDelay');
      }
    }

    // Validate strategy-specific settings
    if (config.strategy === 'custom' && !config.customDelay) {
      errors.push('customDelay function is required when strategy is "custom"');
    }

    if (
      config.backoffMultiplier !== undefined &&
      config.backoffMultiplier <= 0
    ) {
      errors.push('backoffMultiplier must be positive');
    }

    if (config.maxJitter !== undefined) {
      if (config.maxJitter < 0 || config.maxJitter > 1) {
        errors.push('maxJitter must be between 0 and 1');
      }
    }

    // Validate timeout configuration
    if (config.timeout) {
      if (config.timeout.timeoutMs <= 0) {
        errors.push('timeout.timeoutMs must be positive');
      }
    }

    // Validate circuit breaker configuration
    if (config.circuitBreaker && config.circuitBreaker.enabled) {
      if (config.circuitBreaker.failureThreshold <= 0) {
        errors.push('circuitBreaker.failureThreshold must be positive');
      }
      if (config.circuitBreaker.resetTimeout <= 0) {
        errors.push('circuitBreaker.resetTimeout must be positive');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate and throw if configuration is invalid
   * @param config Configuration to validate
   * @throws Error if configuration is invalid
   */
  static validateAndThrow(config: RetryConfig): void {
    const result = this.validate(config);
    if (!result.valid) {
      throw new Error(
        `Invalid retry configuration: ${result.errors.join(', ')}`
      );
    }
  }
}

/**
 * Configuration resolver that applies defaults and handles legacy settings
 */
export class RetryConfigResolver {
  /**
   * Resolve configuration with defaults and legacy compatibility
   * @param config Input configuration
   * @returns Resolved configuration with all defaults applied
   */
  static resolve(config: RetryConfig = {}): ResolvedRetryConfig {
    // Handle legacy settings
    const legacyTimeout = config.attemptTimeout;
    const legacyLogging = config.logRetries;
    const legacyCategory = config.category;
    const legacyTags = config.tags;

    // Default configurations
    const defaultTimeout: TimeoutConfig = {
      enabled: legacyTimeout !== undefined && legacyTimeout > 0,
      timeoutMs: legacyTimeout || 30000,
      timeoutMessage: 'Operation timed out',
    };

    const defaultCircuitBreaker: CircuitBreakerConfig = {
      enabled: false,
      failureThreshold: 5,
      resetTimeout: 60000,
      halfOpenMaxCalls: 3,
      volumeThreshold: 10,
      errorThresholdPercentage: 50,
    };

    const defaultFallback: FallbackConfig = {
      enabled: false,
      logFallback: true,
    };

    const defaultLogging: LoggingConfig = {
      enabled: legacyLogging !== undefined ? legacyLogging : true,
      logLevel: 'warn',
      logAttempts: true,
      logSuccess: false,
      logFailures: true,
      logFallback: true,
      logCircuitBreaker: true,
    };

    const defaultMetrics: MetricsConfig = {
      enabled: true,
      category: legacyCategory || 'general',
      tags: legacyTags || {},
      trackLatency: true,
      trackAttempts: true,
      trackErrors: true,
      trackCircuitBreaker: true,
    };

    // Resolve final configuration
    return {
      maxAttempts: config.maxAttempts ?? 3,
      baseDelay: config.baseDelay ?? 1000,
      maxDelay: config.maxDelay ?? 30000,

      strategy: config.strategy ?? 'exponential',
      backoffMultiplier: config.backoffMultiplier ?? 2,
      jitter: config.jitter ?? true,
      maxJitter: config.maxJitter ?? 0.1,
      customDelay: config.customDelay,

      retryPredicate: config.retryPredicate,
      retryableErrors: config.retryableErrors ?? [
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ECONNREFUSED',
        /timeout/i,
        /connection/i,
        /network/i,
      ],
      nonRetryableErrors: config.nonRetryableErrors ?? [
        /validation/i,
        /unauthorized/i,
        /forbidden/i,
        /not found/i,
      ],

      timeout: {
        ...defaultTimeout,
        ...config.timeout,
      },
      circuitBreaker: {
        ...defaultCircuitBreaker,
        ...config.circuitBreaker,
      },
      fallback: {
        ...defaultFallback,
        ...config.fallback,
      },
      logging: {
        ...defaultLogging,
        ...config.logging,
      },
      metrics: {
        ...defaultMetrics,
        ...config.metrics,
      },

      // Legacy compatibility (for existing code)
      attemptTimeout: config.attemptTimeout ?? 0,
      logRetries: config.logRetries ?? true,
      category: config.category ?? 'general',
      tags: config.tags ?? {},
    };
  }

  /**
   * Merge multiple configurations with precedence
   * @param configs Array of configurations in order of precedence (later overrides earlier)
   * @returns Merged configuration
   */
  static merge(...configs: RetryConfig[]): RetryConfig {
    const merged: RetryConfig = {};

    for (const config of configs) {
      Object.assign(merged, config);

      // Special handling for array properties
      if (config.retryableErrors) {
        merged.retryableErrors = [
          ...(merged.retryableErrors || []),
          ...config.retryableErrors,
        ];
      }

      if (config.nonRetryableErrors) {
        merged.nonRetryableErrors = [
          ...(merged.nonRetryableErrors || []),
          ...config.nonRetryableErrors,
        ];
      }

      // Special handling for nested objects
      if (config.timeout) {
        merged.timeout = { ...merged.timeout, ...config.timeout };
      }

      if (config.circuitBreaker) {
        merged.circuitBreaker = {
          ...merged.circuitBreaker,
          ...config.circuitBreaker,
        };
      }

      if (config.fallback) {
        merged.fallback = { ...merged.fallback, ...config.fallback };
      }

      if (config.logging) {
        merged.logging = { ...merged.logging, ...config.logging };
      }

      if (config.metrics) {
        merged.metrics = {
          ...merged.metrics,
          ...config.metrics,
          tags: {
            ...(merged.metrics?.tags || {}),
            ...(config.metrics.tags || {}),
          },
        };
      }
    }

    return merged;
  }
}

/**
 * Predefined retry configurations for common scenarios
 */
export class RetryConfigPresets {
  /**
   * Network operations with aggressive retry
   */
  static network(): RetryConfig {
    return {
      maxAttempts: 5,
      baseDelay: 1000,
      strategy: 'exponential',
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: [
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ECONNREFUSED',
        'EHOSTUNREACH',
        /timeout/i,
        /connection/i,
        /network/i,
      ],
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        resetTimeout: 30000,
      },
      logging: {
        enabled: true,
        logLevel: 'warn',
        logAttempts: true,
        logSuccess: false,
        logFailures: true,
        logFallback: true,
        logCircuitBreaker: true,
      },
    };
  }

  /**
   * Database operations with conservative retry
   */
  static database(): RetryConfig {
    return {
      maxAttempts: 3,
      baseDelay: 500,
      strategy: 'exponential',
      backoffMultiplier: 1.5,
      jitter: true,
      retryableErrors: [/connection/i, /timeout/i, /lock/i, /deadlock/i],
      nonRetryableErrors: [/constraint/i, /syntax/i, /permission/i],
      circuitBreaker: {
        enabled: true,
        failureThreshold: 3,
        resetTimeout: 60000,
      },
    };
  }

  /**
   * Vector search operations with balanced retry
   */
  static vectorSearch(): RetryConfig {
    return {
      maxAttempts: 4,
      baseDelay: 1000,
      strategy: 'exponential',
      backoffMultiplier: 1.8,
      jitter: true,
      maxDelay: 10000,
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
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        resetTimeout: 30000,
      },
      timeout: {
        enabled: true,
        timeoutMs: 30000,
      },
    };
  }

  /**
   * Critical operations with minimal retry
   */
  static critical(): RetryConfig {
    return {
      maxAttempts: 2,
      baseDelay: 100,
      strategy: 'fixed',
      jitter: false,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 3,
        resetTimeout: 60000,
      },
      logging: {
        enabled: true,
        logLevel: 'error',
        logAttempts: true,
        logSuccess: true,
        logFailures: true,
        logFallback: true,
        logCircuitBreaker: true,
      },
    };
  }

  /**
   * Quick operations with fast retry
   */
  static quick(): RetryConfig {
    return {
      maxAttempts: 3,
      baseDelay: 100,
      strategy: 'linear',
      jitter: true,
      maxJitter: 0.05,
      timeout: {
        enabled: true,
        timeoutMs: 5000,
      },
      logging: {
        enabled: false,
        logLevel: 'debug',
        logAttempts: false,
        logSuccess: false,
        logFailures: false,
        logFallback: false,
        logCircuitBreaker: false,
      },
    };
  }
}
