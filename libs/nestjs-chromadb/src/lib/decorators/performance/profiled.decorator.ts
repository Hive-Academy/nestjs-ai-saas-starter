/**
 * @fileoverview @Profiled Decorator - Performance Monitoring and Slow Query Detection
 * 
 * This decorator provides comprehensive performance monitoring specifically
 * designed for vector database operations with slow query detection.
 */

import { Logger } from '@nestjs/common';
import { 
  DecoratorMetadataRegistry, 
  DecoratorMetadataBuilder,
} from '../core/decorator-metadata';
import { ChromaMetricsService } from '../../services/chroma-metrics.service';

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
 * Performance metrics collected by the profiler
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
 * @Profiled decorator for performance monitoring and slow query detection
 * 
 * @example
 * ```typescript
 * @Injectable()
 * export class VectorSearchService {
 *   @Profiled({
 *     slowQueryThreshold: 100, // 100ms
 *     logLevel: 'slow',
 *     includeParameters: true,
 *     includeMemoryMetrics: true,
 *     category: 'vector_search',
 *     tags: { service: 'search', version: '1.0' },
 *   })
 *   async searchDocuments(collection: string, query: string, options: any): Promise<any[]> {
 *     // Operation will be automatically profiled
 *     return this.chromaService.searchDocuments(collection, [query], undefined, options);
 *   }
 * 
 *   @Profiled({
 *     slowQueryThreshold: 50,
 *     logLevel: 'all',
 *     enablePercentiles: true,
 *     samplingRate: 0.1, // Sample 10% of requests
 *   })
 *   async getDocument(collection: string, id: string): Promise<any> {
 *     return this.chromaService.getDocuments(collection, { ids: [id] });
 *   }
 * }
 * ```
 */
export function Profiled(config: ProfiledConfig = {}): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    // Store decorator metadata
    const metadata = DecoratorMetadataBuilder.createPerformanceMetadata(
      'Profiled',
      'method',
      [], // No dependencies
      config
    );
    
    DecoratorMetadataRegistry.setMetadata(target, propertyKey, metadata);

    // Store original method
    const originalMethod = descriptor.value;
    const logger = new Logger(`Profiled:${target.constructor.name}:${String(propertyKey)}`);
    
    // Performance statistics storage
    const stats: Map<string, PerformanceStatistics> = new Map();
    const executionTimes: Map<string, number[]> = new Map();
    
    // Merge config with defaults
    const finalConfig: Required<ProfiledConfig> = {
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
      metricName: `${target.constructor.name}.${String(propertyKey)}`,
      ...config,
    };
    
    // Replace method with profiled implementation
    descriptor.value = async function (...args: any[]) {
      if (!finalConfig.enabled) {
        return originalMethod.apply(this, args);
      }
      
      // Apply sampling
      if (Math.random() > finalConfig.samplingRate) {
        return originalMethod.apply(this, args);
      }
      
      const operationName = finalConfig.metricName;
      const startTime = Date.now();
      const startMemory = finalConfig.includeMemoryMetrics ? process.memoryUsage() : undefined;
      let result: any;
      let error: Error | undefined;
      let success = true;
      
      try {
        result = await originalMethod.apply(this, args);
        return result;
      } catch (err) {
        error = err instanceof Error ? err : new Error(String(err));
        success = false;
        throw err;
      } finally {
        const executionTime = Date.now() - startTime;
        const endMemory = finalConfig.includeMemoryMetrics ? process.memoryUsage() : undefined;
        
        // Create performance metrics
        const metrics: PerformanceMetrics = {
          operationName,
          executionTime,
          success,
          timestamp: new Date(),
          memoryUsage: endMemory ? {
            heapUsed: endMemory.heapUsed - (startMemory?.heapUsed || 0),
            heapTotal: endMemory.heapTotal - (startMemory?.heapTotal || 0),
            external: endMemory.external - (startMemory?.external || 0),
            rss: endMemory.rss - (startMemory?.rss || 0),
          } : undefined,
          parameters: finalConfig.includeParameters ? 
            sanitizeParameters(args, finalConfig.maxParameterLength) : undefined,
          result: finalConfig.includeResults ? 
            sanitizeResult(result, finalConfig.maxParameterLength) : undefined,
          error: error?.message,
          stackTrace: finalConfig.includeStackTrace && error ? error.stack : undefined,
          tags: finalConfig.tags,
          category: finalConfig.category,
          collection: extractCollectionName(args),
        };
        
        // Update statistics
        updateStatistics(operationName, executionTime, success, stats, executionTimes, finalConfig);
        
        // Log based on configuration
        logMetrics(metrics, finalConfig, logger);
        
        // Send to metrics service if available
        recordMetrics(this, metrics);
      }
    };
    
    // Add statistics methods to the instance
    Object.defineProperty(target, `${String(propertyKey)}_getStats`, {
      value: () => {
        const operationName = finalConfig.metricName;
        return stats.get(operationName) || null;
      },
      writable: false,
      enumerable: false,
    });
    
    Object.defineProperty(target, `${String(propertyKey)}_getExecutionTimes`, {
      value: () => {
        const operationName = finalConfig.metricName;
        return [...(executionTimes.get(operationName) || [])];
      },
      writable: false,
      enumerable: false,
    });
    
    Object.defineProperty(target, `${String(propertyKey)}_clearStats`, {
      value: () => {
        const operationName = finalConfig.metricName;
        stats.delete(operationName);
        executionTimes.delete(operationName);
      },
      writable: false,
      enumerable: false,
    });
    
    return descriptor;
  };
}

/**
 * Update performance statistics
 */
function updateStatistics(
  operationName: string,
  executionTime: number,
  success: boolean,
  stats: Map<string, PerformanceStatistics>,
  executionTimes: Map<string, number[]>,
  config: Required<ProfiledConfig>
): void {
  const currentStats = stats.get(operationName);
  const times = executionTimes.get(operationName) || [];
  
  times.push(executionTime);
  
  // Keep only last 1000 execution times for percentile calculation
  if (times.length > 1000) {
    times.shift();
  }
  
  executionTimes.set(operationName, times);
  
  const now = new Date();
  
  if (!currentStats) {
    // First request
    stats.set(operationName, {
      operationName,
      totalRequests: 1,
      successfulRequests: success ? 1 : 0,
      failedRequests: success ? 0 : 1,
      averageExecutionTime: executionTime,
      minExecutionTime: executionTime,
      maxExecutionTime: executionTime,
      percentiles: config.enablePercentiles ? calculatePercentiles(times) : undefined,
      slowQueryCount: executionTime > config.slowQueryThreshold ? 1 : 0,
      errorRate: success ? 0 : 1,
      requestsPerSecond: 0,
      lastRequest: now,
      firstRequest: now,
    });
  } else {
    // Update existing statistics
    const totalRequests = currentStats.totalRequests + 1;
    const successfulRequests = currentStats.successfulRequests + (success ? 1 : 0);
    const failedRequests = currentStats.failedRequests + (success ? 0 : 1);
    const newAverage = (currentStats.averageExecutionTime * currentStats.totalRequests + executionTime) / totalRequests;
    const timeDiff = (now.getTime() - currentStats.firstRequest.getTime()) / 1000;
    
    stats.set(operationName, {
      operationName,
      totalRequests,
      successfulRequests,
      failedRequests,
      averageExecutionTime: newAverage,
      minExecutionTime: Math.min(currentStats.minExecutionTime, executionTime),
      maxExecutionTime: Math.max(currentStats.maxExecutionTime, executionTime),
      percentiles: config.enablePercentiles ? calculatePercentiles(times) : undefined,
      slowQueryCount: currentStats.slowQueryCount + (executionTime > config.slowQueryThreshold ? 1 : 0),
      errorRate: failedRequests / totalRequests,
      requestsPerSecond: timeDiff > 0 ? totalRequests / timeDiff : 0,
      lastRequest: now,
      firstRequest: currentStats.firstRequest,
    });
  }
}

/**
 * Calculate percentiles from execution times
 */
function calculatePercentiles(times: number[]): { p50: number; p90: number; p95: number; p99: number } {
  const sorted = [...times].sort((a, b) => a - b);
  const length = sorted.length;
  
  return {
    p50: getPercentile(sorted, 0.5),
    p90: getPercentile(sorted, 0.9),
    p95: getPercentile(sorted, 0.95),
    p99: getPercentile(sorted, 0.99),
  };
}

/**
 * Get specific percentile value
 */
function getPercentile(sortedArray: number[], percentile: number): number {
  const index = Math.ceil(sortedArray.length * percentile) - 1;
  return sortedArray[Math.max(0, index)] || 0;
}

/**
 * Log metrics based on configuration
 */
function logMetrics(
  metrics: PerformanceMetrics,
  config: Required<ProfiledConfig>,
  logger: Logger
): void {
  if (config.logLevel === 'none') {
    return;
  }
  
  const isSlow = metrics.executionTime > config.slowQueryThreshold;
  const hasError = !metrics.success;
  
  if (config.logLevel === 'error' && !hasError) {
    return;
  }
  
  if (config.logLevel === 'slow' && !isSlow && !hasError) {
    return;
  }
  
  const logLevel = hasError ? 'error' : isSlow ? 'warn' : 'debug';
  const message = createLogMessage(metrics, config);
  
  switch (logLevel) {
    case 'error':
      logger.error(message, metrics.stackTrace);
      break;
    case 'warn':
      logger.warn(message);
      break;
    case 'debug':
    default:
      logger.debug(message);
      break;
  }
}

/**
 * Create log message from metrics
 */
function createLogMessage(metrics: PerformanceMetrics, config: Required<ProfiledConfig>): string {
  const parts: string[] = [
    `Operation: ${metrics.operationName}`,
    `Duration: ${metrics.executionTime}ms`,
    `Status: ${metrics.success ? 'SUCCESS' : 'ERROR'}`,
  ];
  
  if (metrics.collection) {
    parts.push(`Collection: ${metrics.collection}`);
  }
  
  if (metrics.category) {
    parts.push(`Category: ${metrics.category}`);
  }
  
  if (metrics.memoryUsage) {
    parts.push(`Memory Delta: ${formatBytes(metrics.memoryUsage.heapUsed)}`);
  }
  
  if (metrics.parameters && config.includeParameters) {
    parts.push(`Parameters: ${JSON.stringify(metrics.parameters)}`);
  }
  
  if (metrics.error) {
    parts.push(`Error: ${metrics.error}`);
  }
  
  if (Object.keys(metrics.tags || {}).length > 0) {
    parts.push(`Tags: ${JSON.stringify(metrics.tags)}`);
  }
  
  return parts.join(' | ');
}

/**
 * Extract collection name from arguments
 */
function extractCollectionName(args: any[]): string | undefined {
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
 * Sanitize parameters for logging
 */
function sanitizeParameters(params: any[], maxLength: number): any {
  try {
    const sanitized = params.map(param => {
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
function sanitizeResult(result: any, maxLength: number): any {
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
 * Format bytes in human readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Record metrics to metrics service if available
 */
function recordMetrics(instance: any, metrics: PerformanceMetrics): void {
  try {
    // Try to find metrics service
    const metricsService = getMetricsService(instance);
    if (metricsService && typeof metricsService.recordOperation === 'function') {
      metricsService.recordOperation({
        operationName: metrics.operationName,
        executionTime: metrics.executionTime,
        success: metrics.success,
        error: metrics.error,
        cacheHit: false, // Not applicable for profiling
        timestamp: metrics.timestamp,
      });
    }
  } catch (error) {
    // Silent failure - don't disrupt the main operation
  }
}

/**
 * Get metrics service from class instance
 */
function getMetricsService(instance: any): ChromaMetricsService | null {
  if (instance.metricsService) {
    return instance.metricsService;
  }
  
  if (instance.chromaMetricsService) {
    return instance.chromaMetricsService;
  }
  
  // Look for any service with recordOperation method
  for (const key of Object.keys(instance)) {
    const service = instance[key];
    if (service && typeof service.recordOperation === 'function') {
      return service;
    }
  }
  
  return null;
}

/**
 * Utility function to get performance statistics for a profiled method
 */
export function getPerformanceStatistics(instance: any, methodName: string): PerformanceStatistics | null {
  const statsMethod = instance[`${methodName}_getStats`];
  return statsMethod ? statsMethod() : null;
}

/**
 * Utility function to get execution times for a profiled method
 */
export function getExecutionTimes(instance: any, methodName: string): number[] {
  const timesMethod = instance[`${methodName}_getExecutionTimes`];
  return timesMethod ? timesMethod() : [];
}

/**
 * Utility function to clear performance statistics for a profiled method
 */
export function clearPerformanceStatistics(instance: any, methodName: string): void {
  const clearMethod = instance[`${methodName}_clearStats`];
  if (clearMethod) {
    clearMethod();
  }
}

/**
 * Global performance monitor for all profiled methods
 */
export class GlobalPerformanceMonitor {
  private static instances: Map<string, any> = new Map();
  
  static register(className: string, instance: any): void {
    this.instances.set(className, instance);
  }
  
  static getAllStatistics(): Record<string, PerformanceStatistics[]> {
    const allStats: Record<string, PerformanceStatistics[]> = {};
    
    for (const [className, instance] of this.instances) {
      const stats: PerformanceStatistics[] = [];
      
      // Find all profiled methods
      for (const prop of Object.getOwnPropertyNames(instance)) {
        if (prop.endsWith('_getStats')) {
          const methodName = prop.replace('_getStats', '');
          const methodStats = getPerformanceStatistics(instance, methodName);
          if (methodStats) {
            stats.push(methodStats);
          }
        }
      }
      
      if (stats.length > 0) {
        allStats[className] = stats;
      }
    }
    
    return allStats;
  }
  
  static clearAllStatistics(): void {
    for (const [, instance] of this.instances) {
      for (const prop of Object.getOwnPropertyNames(instance)) {
        if (prop.endsWith('_clearStats')) {
          const methodName = prop.replace('_clearStats', '');
          clearPerformanceStatistics(instance, methodName);
        }
      }
    }
  }
}

/**
 * Example usage:
 * 
 * @example Advanced profiling configuration
 * ```typescript
 * @Injectable()
 * export class DocumentService {
 *   @Profiled({
 *     slowQueryThreshold: 100,
 *     logLevel: 'slow',
 *     includeParameters: true,
 *     includeMemoryMetrics: true,
 *     enablePercentiles: true,
 *     category: 'document_operations',
 *     tags: { service: 'document', version: '2.0' },
 *   })
 *   async searchDocuments(collection: string, query: string): Promise<any[]> {
 *     return this.chromaService.searchDocuments(collection, [query]);
 *   }
 * 
 *   @Profiled({
 *     slowQueryThreshold: 50,
 *     samplingRate: 0.1, // Only profile 10% of requests
 *     logLevel: 'all',
 *   })
 *   async getDocument(id: string): Promise<any> {
 *     return this.chromaService.getDocuments('docs', { ids: [id] });
 *   }
 * 
 *   async getPerformanceReport(): Promise<any> {
 *     return {
 *       search: getPerformanceStatistics(this, 'searchDocuments'),
 *       get: getPerformanceStatistics(this, 'getDocument'),
 *       executionTimes: {
 *         search: getExecutionTimes(this, 'searchDocuments'),
 *         get: getExecutionTimes(this, 'getDocument'),
 *       },
 *     };
 *   }
 * }
 * ```
 */