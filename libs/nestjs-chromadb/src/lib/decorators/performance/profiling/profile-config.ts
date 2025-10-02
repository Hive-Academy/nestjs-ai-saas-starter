/**
 * @fileoverview Profile Configuration - Configuration interfaces, validation, and defaults
 *
 * Single Responsibility: Manages all configuration-related concerns for profiling
 * including validation, defaults, and type definitions.
 */

/**
 * Configuration for @Profiled decorator
 */
export interface ProfiledConfig {
  /** Enable performance profiling */
  readonly enabled?: boolean;

  /** Slow query threshold in milliseconds */
  readonly slowQueryThreshold?: number;

  /** Log all operations or only slow ones */
  readonly logLevel?: 'all' | 'slow' | 'error' | 'none';

  /** Include operation parameters in logs */
  readonly includeParameters?: boolean;

  /** Include operation results in logs */
  readonly includeResults?: boolean;

  /** Maximum parameter length to log */
  readonly maxParameterLength?: number;

  /** Include memory usage metrics */
  readonly includeMemoryMetrics?: boolean;

  /** Include stack trace for slow operations */
  readonly includeStackTrace?: boolean;

  /** Custom metrics tags */
  readonly tags?: Record<string, string>;

  /** Operation category for grouping */
  readonly category?: string;

  /** Enable percentile calculations */
  readonly enablePercentiles?: boolean;

  /** Sampling rate (0-1) for high-frequency operations */
  readonly samplingRate?: number;

  /** Custom metric name */
  readonly metricName?: string;
}

/**
 * Performance metrics structure collected by the profiler
 */
export interface PerformanceMetrics {
  readonly operationName: string;
  readonly executionTime: number;
  readonly success: boolean;
  readonly timestamp: Date;
  readonly memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  readonly parameters?: any;
  readonly result?: any;
  readonly error?: string;
  readonly stackTrace?: string;
  readonly tags?: Record<string, string>;
  readonly category?: string;
  readonly collection?: string;
}

/**
 * Aggregated performance statistics
 */
export interface PerformanceStatistics {
  readonly operationName: string;
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly averageExecutionTime: number;
  readonly minExecutionTime: number;
  readonly maxExecutionTime: number;
  readonly percentiles?: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  readonly slowQueryCount: number;
  readonly errorRate: number;
  readonly requestsPerSecond: number;
  readonly lastRequest: Date;
  readonly firstRequest: Date;
}

/**
 * Configuration validator and processor
 */
export class ProfileConfigProcessor {
  private static readonly DEFAULT_CONFIG: Required<ProfiledConfig> = {
    enabled: true,
    slowQueryThreshold: 1000, // 1 second
    logLevel: 'slow',
    includeParameters: false,
    includeResults: false,
    maxParameterLength: 1000,
    includeMemoryMetrics: false,
    includeStackTrace: false,
    tags: {},
    category: 'general',
    enablePercentiles: false,
    samplingRate: 1.0,
    metricName: '', // Will be set dynamically
  };

  /**
   * Merge user config with defaults and generate final configuration
   */
  static processConfig(
    userConfig: ProfiledConfig,
    target: any,
    propertyKey: string | symbol
  ): Required<ProfiledConfig> {
    const metricName =
      userConfig.metricName ||
      `${target.constructor.name}.${String(propertyKey)}`;

    return {
      ...this.DEFAULT_CONFIG,
      ...userConfig,
      metricName,
    };
  }

  /**
   * Validate configuration values
   */
  static validateConfig(config: ProfiledConfig): string[] {
    const errors: string[] = [];

    if (
      config.slowQueryThreshold !== undefined &&
      config.slowQueryThreshold < 0
    ) {
      errors.push('slowQueryThreshold must be non-negative');
    }

    if (
      config.maxParameterLength !== undefined &&
      config.maxParameterLength < 0
    ) {
      errors.push('maxParameterLength must be non-negative');
    }

    if (
      config.samplingRate !== undefined &&
      (config.samplingRate < 0 || config.samplingRate > 1)
    ) {
      errors.push('samplingRate must be between 0 and 1');
    }

    if (
      config.logLevel &&
      !['all', 'slow', 'error', 'none'].includes(config.logLevel)
    ) {
      errors.push('logLevel must be one of: all, slow, error, none');
    }

    return errors;
  }

  /**
   * Check if operation should be sampled based on sampling rate
   */
  static shouldSample(samplingRate: number): boolean {
    return Math.random() <= samplingRate;
  }

  /**
   * Check if operation should be logged based on config and metrics
   */
  static shouldLog(
    config: Required<ProfiledConfig>,
    metrics: PerformanceMetrics
  ): boolean {
    if (config.logLevel === 'none') {
      return false;
    }

    const isSlow = metrics.executionTime > config.slowQueryThreshold;
    const hasError = !metrics.success;

    switch (config.logLevel) {
      case 'error':
        return hasError;
      case 'slow':
        return isSlow || hasError;
      case 'all':
        return true;
      default:
        return false;
    }
  }

  /**
   * Determine log level for the metrics
   */
  static getLogLevel(
    metrics: PerformanceMetrics,
    config: Required<ProfiledConfig>
  ): 'error' | 'warn' | 'debug' {
    if (!metrics.success) {
      return 'error';
    }

    if (metrics.executionTime > config.slowQueryThreshold) {
      return 'warn';
    }

    return 'debug';
  }

  /**
   * Get configuration summary for debugging
   */
  static getConfigSummary(
    config: Required<ProfiledConfig>
  ): Record<string, any> {
    return {
      enabled: config.enabled,
      slowQueryThreshold: `${config.slowQueryThreshold}ms`,
      logLevel: config.logLevel,
      includeParameters: config.includeParameters,
      includeResults: config.includeResults,
      includeMemoryMetrics: config.includeMemoryMetrics,
      enablePercentiles: config.enablePercentiles,
      samplingRate: `${(config.samplingRate * 100).toFixed(1)}%`,
      category: config.category,
      tagsCount: Object.keys(config.tags).length,
    };
  }
}

/**
 * Utility functions for parameter and result sanitization
 */
export class DataSanitizer {
  /**
   * Sanitize parameters for logging
   */
  static sanitizeParameters(params: any[], maxLength: number): any {
    try {
      const sanitized = params.map((param) => {
        if (typeof param === 'string' && param.length > maxLength) {
          return param.substring(0, maxLength) + '...';
        }

        if (typeof param === 'object' && param !== null) {
          const str = JSON.stringify(param);
          if (str.length > maxLength) {
            return str.substring(0, maxLength) + '...';
          }
          return param;
        }

        return param;
      });

      return sanitized;
    } catch (error) {
      return ['[Serialization Error]'];
    }
  }

  /**
   * Sanitize result for logging
   */
  static sanitizeResult(result: any, maxLength: number): any {
    try {
      if (typeof result === 'string' && result.length > maxLength) {
        return result.substring(0, maxLength) + '...';
      }

      if (Array.isArray(result)) {
        return {
          type: 'array',
          length: result.length,
          sample: result.slice(0, 3),
        };
      }

      if (typeof result === 'object' && result !== null) {
        const str = JSON.stringify(result);
        if (str.length > maxLength) {
          return {
            type: 'object',
            keys: Object.keys(result),
            truncated: true,
          };
        }
        return result;
      }

      return result;
    } catch (error) {
      return '[Serialization Error]';
    }
  }

  /**
   * Extract collection name from method arguments
   */
  static extractCollectionName(args: any[]): string | undefined {
    if (args.length > 0) {
      const first = args[0];

      if (typeof first === 'string') {
        return first;
      }

      if (first && typeof first === 'object') {
        return first.collection || first.collectionName;
      }
    }

    return undefined;
  }

  /**
   * Format bytes in human readable format
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
