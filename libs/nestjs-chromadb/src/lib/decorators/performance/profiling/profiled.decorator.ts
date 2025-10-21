/**
 * @fileoverview Clean Profiled Decorator - Focused decorator implementation using composed services
 *
 * Single Responsibility: Provides the @Profiled decorator interface while delegating
 * all concerns to specialized modules (config, metrics collection, reporting).
 */

import {
  DecoratorMetadataRegistry,
  DecoratorMetadataBuilder,
} from '../../core/decorator-metadata';
import { type ProfiledConfig, ProfileConfigProcessor } from './profile-config';
import { MetricsCollector } from './metrics-collector';
import { PerformanceReporter } from './performance-reporter';

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
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    // Validate configuration
    const configErrors = ProfileConfigProcessor.validateConfig(config);
    if (configErrors.length > 0) {
      throw new Error(
        `Invalid @Profiled configuration: ${configErrors.join(', ')}`
      );
    }

    // Process configuration with defaults
    const finalConfig = ProfileConfigProcessor.processConfig(
      config,
      target,
      propertyKey
    );

    // Store decorator metadata
    const metadata = DecoratorMetadataBuilder.createPerformanceMetadata(
      'Profiled',
      'method',
      [], // No dependencies
      finalConfig
    );

    DecoratorMetadataRegistry.setMetadata(target, propertyKey, metadata);

    // Store original method
    const originalMethod = descriptor.value;

    // Create specialized service instances
    const metricsCollector = new MetricsCollector();
    const reporter = new PerformanceReporter(
      `Profiled:${target.constructor.name}:${String(propertyKey)}`
    );

    // Replace method with profiled implementation
    descriptor.value = async function (...args: any[]) {
      // Early exit if profiling disabled
      if (!finalConfig.enabled) {
        return originalMethod.apply(this, args);
      }

      // Apply sampling
      if (!ProfileConfigProcessor.shouldSample(finalConfig.samplingRate)) {
        return originalMethod.apply(this, args);
      }

      // Capture start state
      const startTime = Date.now();
      const startMemory = finalConfig.includeMemoryMetrics
        ? MetricsCollector.getMemorySnapshot()
        : undefined;

      let result: any;
      let error: Error | undefined;

      try {
        result = await originalMethod.apply(this, args);
        return result;
      } catch (err) {
        error = err instanceof Error ? err : new Error(String(err));
        throw err;
      } finally {
        // Capture end state and collect metrics
        const endMemory = finalConfig.includeMemoryMetrics
          ? MetricsCollector.getMemorySnapshot()
          : undefined;

        const metrics = metricsCollector.collectMetrics(
          finalConfig.metricName,
          startTime,
          startMemory,
          endMemory,
          args,
          result,
          error,
          finalConfig
        );

        // Report metrics
        reporter.logMetrics(metrics, finalConfig);

        // Record to external metrics service
        metricsCollector.recordToMetricsService(this, metrics);
      }
    };

    // Add utility methods to the instance
    attachUtilityMethods(
      target,
      propertyKey,
      metricsCollector,
      finalConfig.metricName
    );

    return descriptor;
  };
}

/**
 * Attach utility methods for accessing performance statistics
 */
function attachUtilityMethods(
  target: any,
  propertyKey: string | symbol,
  metricsCollector: MetricsCollector,
  operationName: string
): void {
  const methodName = String(propertyKey);

  // Get statistics method
  Object.defineProperty(target, `${methodName}_getStats`, {
    value: () => metricsCollector.getStatistics(operationName),
    writable: false,
    enumerable: false,
  });

  // Get execution times method
  Object.defineProperty(target, `${methodName}_getExecutionTimes`, {
    value: () => metricsCollector.getExecutionTimes(operationName),
    writable: false,
    enumerable: false,
  });

  // Clear statistics method
  Object.defineProperty(target, `${methodName}_clearStats`, {
    value: () => metricsCollector.clearStatistics(operationName),
    writable: false,
    enumerable: false,
  });
}

/**
 * Utility function to get performance statistics for a profiled method
 */
export function getPerformanceStatistics(instance: any, methodName: string) {
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
export function clearPerformanceStatistics(
  instance: any,
  methodName: string
): void {
  const clearMethod = instance[`${methodName}_clearStats`];
  if (clearMethod) {
    clearMethod();
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
