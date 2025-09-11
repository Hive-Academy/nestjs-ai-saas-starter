import type { DiscoveredClass } from '@golevelup/nestjs-discovery';
import { Logger } from '@nestjs/common';
import { getClassTools } from '../decorators/tool.decorator';

/**
 * Utility for intelligent provider filtering in discovery services
 * This prevents scanning of health indicators, drivers, and configuration objects
 */
export class DiscoveryFilterUtil {
  private static readonly logger = new Logger(DiscoveryFilterUtil.name);

  /**
   * List of class names and patterns to exclude from scanning
   * These are known to cause issues when scanned for decorators
   */
  private static readonly EXCLUDED_PATTERNS = [
    // TypeORM related
    'TypeOrmHealthIndicator',
    'TypeOrmCoreModule',
    'Driver',
    'Connection',
    'Repository',
    'EntityManager',
    'QueryRunner',
    'DataSource',

    // NestJS core
    'HealthCheckService',
    'TerminusLogger',
    'HttpHealthIndicator',
    'DiskHealthIndicator',
    'MemoryHealthIndicator',
    'MicroserviceHealthIndicator',

    // Discovery and core services that would cause circular deps
    'DiscoveryService',
    'ModuleRef',
    'ApplicationContext',
    'NestContainer',

    // Configuration and environment
    'ConfigService',
    'ConfigModule',
    'Logger',
    'LoggerService',

    // Redis/Cache related
    'RedisHealthIndicator',
    'CacheModule',
    'RedisModule',

    // HTTP/Network related
    'HttpModule',
    'HttpService',
    'AxiosInstance',

    // Neo4j specific
    'Neo4jService',
    'Neo4jHealthIndicator',
    'Neo4jDriver',
    'Session',

    // ChromaDB specific
    'ChromaClient',
    'ChromaHealthIndicator',

    // Monitoring and metrics
    'PrometheusModule',
    'MetricsModule',
    'TracingModule',
  ];

  /**
   * Safe filter for Tool-decorated providers
   * Only includes providers that have @Tool decorated methods
   */
  static createToolFilter(
    excludeServiceNames: string[] = []
  ): (discovered: DiscoveredClass) => boolean {
    return (discovered: DiscoveredClass) => {
      try {
        // Basic safety checks
        if (!discovered.instance || typeof discovered.instance !== 'object') {
          return false;
        }

        // Check constructor and name existence
        if (
          !discovered.instance.constructor ||
          !discovered.instance.constructor.name
        ) {
          return false;
        }

        const className = discovered.instance.constructor.name;

        // Exclude specific service names (for avoiding circular dependencies)
        if (excludeServiceNames.includes(className)) {
          return false;
        }

        // Exclude known problematic patterns
        if (this.isExcludedClass(className)) {
          return false;
        }

        // Pre-filter: Only include classes that have @Tool decorated methods
        // This is the key optimization - check for decorators BEFORE trying to access instance
        const hasToolMethods = this.hasToolDecorators(
          discovered.instance.constructor
        );

        if (hasToolMethods) {
          this.logger.debug(`Including tool provider: ${className}`);
        }

        return hasToolMethods;
      } catch (error) {
        // If any error occurs during filtering, exclude the provider
        this.logger.warn(
          `Failed to filter provider ${discovered.name || 'unknown'}:`,
          error instanceof Error ? error.message : String(error)
        );
        return false;
      }
    };
  }

  /**
   * Safe filter for Entrypoint-decorated providers
   * Only includes providers that have @Entrypoint or @Task decorated methods
   */
  static createWorkflowFilter(
    excludeServiceNames: string[] = []
  ): (discovered: DiscoveredClass) => boolean {
    return (discovered: DiscoveredClass) => {
      try {
        // Basic safety checks
        if (!discovered.instance || typeof discovered.instance !== 'object') {
          return false;
        }

        // Check constructor and name existence
        if (
          !discovered.instance.constructor ||
          !discovered.instance.constructor.name
        ) {
          return false;
        }

        const className = discovered.instance.constructor.name;

        // Exclude specific service names (for avoiding circular dependencies)
        if (excludeServiceNames.includes(className)) {
          return false;
        }

        // Exclude known problematic patterns
        if (this.isExcludedClass(className)) {
          return false;
        }

        // Pre-filter: Only include classes that have workflow decorators
        const hasWorkflowMethods = this.hasWorkflowDecorators(
          discovered.instance.constructor
        );

        if (hasWorkflowMethods) {
          this.logger.debug(`Including workflow provider: ${className}`);
        }

        return hasWorkflowMethods;
      } catch (error) {
        // If any error occurs during filtering, exclude the provider
        this.logger.warn(
          `Failed to filter provider ${discovered.name || 'unknown'}:`,
          error instanceof Error ? error.message : String(error)
        );
        return false;
      }
    };
  }

  /**
   * Check if a class name matches excluded patterns
   */
  private static isExcludedClass(className: string): boolean {
    return this.EXCLUDED_PATTERNS.some((pattern) => {
      // Support both exact matches and pattern matching
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(className);
      }
      return className.includes(pattern);
    });
  }

  /**
   * Check if a class has @Tool decorated methods without instantiating
   */
  private static hasToolDecorators(targetClass: any): boolean {
    try {
      // Use the existing getClassTools function which reads metadata
      const tools = getClassTools(targetClass);
      return tools.length > 0;
    } catch (error) {
      // If we can't get metadata, it doesn't have tool decorators
      return false;
    }
  }

  /**
   * Check if a class has workflow decorators (@Entrypoint, @Task)
   * This imports the metadata getters safely to avoid circular dependencies
   */
  private static hasWorkflowDecorators(targetClass: any): boolean {
    try {
      // Import metadata keys from the appropriate modules
      const WORKFLOW_ENTRYPOINT_KEY = 'functional:entrypoint';
      const WORKFLOW_TASK_KEY = 'functional:task';

      // Check for entrypoint metadata
      const entrypointMethods =
        Reflect.getMetadata(WORKFLOW_ENTRYPOINT_KEY, targetClass) || [];
      if (entrypointMethods.length > 0) {
        return true;
      }

      // Check for task metadata
      const taskMethods =
        Reflect.getMetadata(WORKFLOW_TASK_KEY, targetClass) || [];
      if (taskMethods.length > 0) {
        return true;
      }

      // Also check prototype methods for individual metadata
      const prototype = targetClass.prototype;
      if (!prototype) {
        return false;
      }

      const methodNames = Object.getOwnPropertyNames(prototype);
      for (const methodName of methodNames) {
        if (methodName === 'constructor') continue;

        // Check if method has entrypoint or task metadata
        const hasEntrypoint = Reflect.hasMetadata(
          WORKFLOW_ENTRYPOINT_KEY,
          prototype,
          methodName
        );
        const hasTask = Reflect.hasMetadata(
          WORKFLOW_TASK_KEY,
          prototype,
          methodName
        );

        if (hasEntrypoint || hasTask) {
          return true;
        }
      }

      return false;
    } catch (error) {
      // If we can't get metadata, it doesn't have workflow decorators
      return false;
    }
  }

  /**
   * Create a general purpose safe provider filter
   * This can be used as a fallback when specific decorator filtering isn't needed
   */
  static createSafeFilter(
    excludeServiceNames: string[] = []
  ): (discovered: DiscoveredClass) => boolean {
    return (discovered: DiscoveredClass) => {
      try {
        // Basic safety checks
        if (!discovered.instance || typeof discovered.instance !== 'object') {
          return false;
        }

        // Check constructor and name existence
        if (
          !discovered.instance.constructor ||
          !discovered.instance.constructor.name
        ) {
          return false;
        }

        const className = discovered.instance.constructor.name;

        // Exclude specific service names
        if (excludeServiceNames.includes(className)) {
          return false;
        }

        // Exclude known problematic patterns
        if (this.isExcludedClass(className)) {
          return false;
        }

        return true;
      } catch (error) {
        // If any error occurs during filtering, exclude the provider
        this.logger.warn(
          `Failed to filter provider ${discovered.name || 'unknown'}:`,
          error instanceof Error ? error.message : String(error)
        );
        return false;
      }
    };
  }
}
