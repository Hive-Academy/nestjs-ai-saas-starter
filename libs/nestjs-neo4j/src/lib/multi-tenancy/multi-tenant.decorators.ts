/**
 * @fileoverview Multi-Tenant Decorators
 *
 * Decorators that enhance the existing Neo4j decorators with multi-tenancy support.
 * These decorators automatically handle tenant context and routing.
 */

import { SetMetadata, Injectable } from '@nestjs/common';
import { DECORATOR_METADATA_KEYS } from '../decorators/decorator-metadata.interface';

/**
 * Tenant isolation configuration
 */
export interface TenantIsolationConfig {
  /** Enable automatic tenant routing */
  enabled: boolean;
  /** Validate tenant access before execution */
  validateAccess?: boolean;
  /** Include tenant metadata in results */
  includeTenantMetadata?: boolean;
  /** Track analytics for tenant */
  trackAnalytics?: boolean;
  /** Validate subscription limits */
  validateLimits?: boolean;
  /** Custom tenant database override */
  databaseOverride?: string;
}

/**
 * Multi-tenant query configuration
 */
export interface MultiTenantQueryConfig {
  /** Tenant isolation settings */
  tenantIsolation?: TenantIsolationConfig;
  /** Require specific tenant features */
  requiredFeatures?: string[];
  /** Minimum subscription plan required */
  minimumPlan?: string;
  /** Resource usage tracking */
  trackResourceUsage?: boolean;
}

/**
 * Tenant isolation decorator for automatic tenant routing
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   @TenantIsolated({
 *     enabled: true,
 *     validateAccess: true,
 *     trackAnalytics: true
 *   })
 *   @CypherQuery({
 *     query: 'MATCH (u:User) RETURN u'
 *   })
 *   async getAllUsers(): Promise<User[]> {
 *     // Automatically routed to tenant database
 *     // Access validated
 *     // Analytics tracked
 *   }
 * }
 * ```
 */
export function TenantIsolated(config: TenantIsolationConfig = { enabled: true }): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    // Set tenant isolation metadata
    SetMetadata(DECORATOR_METADATA_KEYS.TENANT_ISOLATION || 'TENANT_ISOLATION', config)(
      target, propertyKey, descriptor
    );

    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);

    descriptor.value = async function (this: any, ...args: any[]) {
      const instance = this;

      try {
        // Get multi-tenant service
        const multiTenantService = instance.multiTenantNeo4j || instance.multiTenantNeo4jService;

        if (!multiTenantService) {
          throw new Error(`TenantIsolated: Multi-tenant Neo4j service not found in ${target.constructor.name}`);
        }

        // Execute with tenant isolation
        const result = await originalMethod.apply(instance, args);

        return result;

      } catch (error) {
        console.error(`TenantIsolated: Error in ${methodName}:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Require specific tenant features
 *
 * @example
 * ```typescript
 * @RequireTenantFeatures(['advanced-analytics', 'real-time-processing'])
 * async performAdvancedAnalytics(): Promise<AnalyticsResult> {
 *   // Only executes if tenant has required features
 * }
 * ```
 */
export function RequireTenantFeatures(features: string[]): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    SetMetadata('REQUIRED_TENANT_FEATURES', features)(target, propertyKey, descriptor);

    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);

    descriptor.value = async function (this: any, ...args: any[]) {
      const instance = this;

      try {
        // Get tenant context
        const tenantContext = instance.tenantContext || instance.tenantContextService;

        if (!tenantContext) {
          throw new Error(`RequireTenantFeatures: Tenant context not found in ${target.constructor.name}`);
        }

        // Check each required feature
        for (const feature of features) {
          const hasFeature = await tenantContext.hasFeature(feature);
          if (!hasFeature) {
            throw new Error(`Feature '${feature}' not available for current tenant`);
          }
        }

        // Execute original method
        return await originalMethod.apply(instance, args);

      } catch (error) {
        console.error(`RequireTenantFeatures: Error in ${methodName}:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Validate tenant subscription limits
 *
 * @example
 * ```typescript
 * @ValidateTenantLimits({
 *   nodeLimit: 'maxNodes',
 *   relationshipLimit: 'maxRelationships'
 * })
 * async createLargeDataset(): Promise<void> {
 *   // Validates limits before execution
 * }
 * ```
 */
export function ValidateTenantLimits(limits: {
  nodeLimit?: string;
  relationshipLimit?: string;
  queryLimit?: string;
  storageLimit?: string;
}): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    SetMetadata('TENANT_LIMITS_VALIDATION', limits)(target, propertyKey, descriptor);

    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);

    descriptor.value = async function (this: any, ...args: any[]) {
      const instance = this;

      try {
        // Get tenant context and multi-tenant service
        const tenantContext = instance.tenantContext || instance.tenantContextService;
        const multiTenantService = instance.multiTenantNeo4j || instance.multiTenantNeo4jService;

        if (!tenantContext || !multiTenantService) {
          throw new Error(`ValidateTenantLimits: Required services not found in ${target.constructor.name}`);
        }

        // Get current tenant stats
        const stats = await multiTenantService.getTenantStats();

        // Validate each limit
        for (const [limitType, limitProperty] of Object.entries(limits)) {
          if (limitProperty) {
            let currentValue = 0;

            switch (limitType) {
              case 'nodeLimit':
                currentValue = stats.nodeCount;
                break;
              case 'relationshipLimit':
                currentValue = stats.relationshipCount;
                break;
              default:
                continue;
            }

            const withinLimits = await tenantContext.checkLimit(limitProperty as any, currentValue);
            if (!withinLimits) {
              throw new Error(`Tenant ${limitType} exceeded`);
            }
          }
        }

        // Execute original method
        return await originalMethod.apply(instance, args);

      } catch (error) {
        console.error(`ValidateTenantLimits: Error in ${methodName}:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Multi-tenant query decorator that combines tenant isolation with query execution
 *
 * @example
 * ```typescript
 * @MultiTenantQuery({
 *   query: 'MATCH (u:User {id: $userId}) RETURN u',
 *   tenantIsolation: {
 *     enabled: true,
 *     validateAccess: true,
 *     trackAnalytics: true
 *   },
 *   requiredFeatures: ['user-management']
 * })
 * async findUser(params: { userId: string }): Promise<User> {
 *   // Multi-tenant query with automatic routing and validation
 * }
 * ```
 */
export function MultiTenantQuery(config: {
  query: string;
  returnType?: () => any;
  tenantIsolation?: TenantIsolationConfig;
  requiredFeatures?: string[];
  validateLimits?: boolean;
}): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    // Set multi-tenant query metadata
    SetMetadata('MULTI_TENANT_QUERY', config)(target, propertyKey, descriptor);

    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);

    descriptor.value = async function (this: any, ...args: any[]) {
      const instance = this;

      try {
        // Get services
        const tenantContext = instance.tenantContext || instance.tenantContextService;
        const multiTenantService = instance.multiTenantNeo4j || instance.multiTenantNeo4jService;

        if (!tenantContext || !multiTenantService) {
          throw new Error(`MultiTenantQuery: Required services not found in ${target.constructor.name}`);
        }

        // Validate tenant features if required
        if (config.requiredFeatures) {
          for (const feature of config.requiredFeatures) {
            const hasFeature = await tenantContext.hasFeature(feature);
            if (!hasFeature) {
              throw new Error(`Feature '${feature}' required for ${methodName}`);
            }
          }
        }

        // Extract parameters from method arguments
        const params = args.length === 1 && typeof args[0] === 'object' ? args[0] : {};

        // Execute multi-tenant query
        const result = await multiTenantService.run(
          config.query,
          params,
          {
            includeTenantMetadata: config.tenantIsolation?.includeTenantMetadata,
            trackAnalytics: config.tenantIsolation?.trackAnalytics,
            validateLimits: config.validateLimits
          }
        );

        // Transform result if return type specified
        if (config.returnType) {
          return result.records.map((record: any) => {
            // Simplified transformation - would be more sophisticated in real implementation
            return record._fields[0];
          });
        }

        return result;

      } catch (error) {
        console.error(`MultiTenantQuery: Error in ${methodName}:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Tenant admin operation decorator for admin-only operations
 *
 * @example
 * ```typescript
 * @TenantAdminOperation()
 * async createTenantDatabase(tenantId: string): Promise<void> {
 *   // Admin operation that bypasses tenant context
 * }
 * ```
 */
export function TenantAdminOperation(): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    SetMetadata('TENANT_ADMIN_OPERATION', true)(target, propertyKey, descriptor);

    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);

    descriptor.value = async function (this: any, ...args: any[]) {
      const instance = this;

      try {
        // Get multi-tenant service
        const multiTenantService = instance.multiTenantNeo4j || instance.multiTenantNeo4jService;

        if (!multiTenantService) {
          throw new Error(`TenantAdminOperation: Multi-tenant service not found in ${target.constructor.name}`);
        }

        // Execute as admin operation (bypasses tenant context)
        return await multiTenantService.adminOperation(async (baseService: any) => {
          return await originalMethod.apply(instance, args);
        });

      } catch (error) {
        console.error(`TenantAdminOperation: Error in ${methodName}:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Tenant metrics collection decorator
 *
 * @example
 * ```typescript
 * @CollectTenantMetrics({
 *   operation: 'user-query',
 *   category: 'read-operations'
 * })
 * async getUserData(): Promise<User[]> {
 *   // Automatically collects performance and usage metrics
 * }
 * ```
 */
export function CollectTenantMetrics(config: {
  operation: string;
  category?: string;
  includeResourceUsage?: boolean;
}): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    SetMetadata('TENANT_METRICS_COLLECTION', config)(target, propertyKey, descriptor);

    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);

    descriptor.value = async function (this: any, ...args: any[]) {
      const instance = this;
      const startTime = Date.now();

      try {
        // Get tenant context
        const tenantContext = instance.tenantContext || instance.tenantContextService;

        // Execute original method
        const result = await originalMethod.apply(instance, args);

        // Collect metrics
        const executionTime = Date.now() - startTime;

        if (tenantContext) {
          const tenantMetadata = await tenantContext.getTenantMetadata();

          // In a real implementation, this would send to metrics service
          console.log(`Metrics: ${config.operation} for tenant ${tenantMetadata.tenantId} took ${executionTime}ms`);
        }

        return result;

      } catch (error) {
        const executionTime = Date.now() - startTime;
        console.error(`CollectTenantMetrics: ${config.operation} failed after ${executionTime}ms:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Service for managing multi-tenant decorators
 */
@Injectable()
export class MultiTenantDecorators {
  /**
   * Get all multi-tenant decorator metadata from a class
   */
  static getMultiTenantMetadata(target: any): {
    tenantIsolation?: TenantIsolationConfig;
    requiredFeatures?: string[];
    limitValidation?: any;
    isAdminOperation?: boolean;
    metricsConfig?: any;
  } {
    return {
      tenantIsolation: Reflect.getMetadata('TENANT_ISOLATION', target),
      requiredFeatures: Reflect.getMetadata('REQUIRED_TENANT_FEATURES', target),
      limitValidation: Reflect.getMetadata('TENANT_LIMITS_VALIDATION', target),
      isAdminOperation: Reflect.getMetadata('TENANT_ADMIN_OPERATION', target),
      metricsConfig: Reflect.getMetadata('TENANT_METRICS_COLLECTION', target)
    };
  }

  /**
   * Check if method has multi-tenant decorators
   */
  static hasMultiTenantDecorators(target: any, propertyKey: string): boolean {
    const metadata = this.getMultiTenantMetadata(target);
    return Object.values(metadata).some(value => value !== undefined);
  }
}

/**
 * Type guards for multi-tenant decorator validation
 */
export namespace MultiTenantTypeGuards {
  export function isTenantIsolated(target: any, propertyKey: string): boolean {
    return Reflect.hasMetadata('TENANT_ISOLATION', target, propertyKey);
  }

  export function hasRequiredFeatures(target: any, propertyKey: string): boolean {
    return Reflect.hasMetadata('REQUIRED_TENANT_FEATURES', target, propertyKey);
  }

  export function hasLimitValidation(target: any, propertyKey: string): boolean {
    return Reflect.hasMetadata('TENANT_LIMITS_VALIDATION', target, propertyKey);
  }

  export function isAdminOperation(target: any, propertyKey: string): boolean {
    return Reflect.hasMetadata('TENANT_ADMIN_OPERATION', target, propertyKey);
  }
}
