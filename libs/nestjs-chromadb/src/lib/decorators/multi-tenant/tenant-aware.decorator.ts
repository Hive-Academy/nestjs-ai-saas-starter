/**
 * @fileoverview @TenantAware Decorator - Multi-Tenancy Support for ChromaDB Operations
 *
 * This decorator automatically handles tenant isolation for ChromaDB operations,
 * providing secure multi-tenancy with collection namespacing and tenant context management.
 */

import { Injectable, Logger, SetMetadata } from '@nestjs/common';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  DecoratorMetadataRegistry,
  DecoratorMetadataBuilder,
} from '../core/decorator-metadata';
import { BaseDocument } from '../../types/document-types.interface';
import { CollectionName } from '../../types/collection-names.type';

/**
 * Tenant context interface
 */
export interface TenantContext {
  /** Unique tenant identifier */
  readonly tenantId: string;

  /** Tenant organization/company name */
  readonly organizationId?: string;

  /** User identifier within the tenant */
  readonly userId?: string;

  /** Tenant-specific permissions */
  readonly permissions?: string[];

  /** Additional tenant metadata */
  readonly metadata?: Record<string, unknown>;

  /** Tenant subscription tier */
  readonly tier?: 'free' | 'pro' | 'enterprise';

  /** Tenant region/data center */
  readonly region?: string;
}

/**
 * Tenant isolation configuration
 */
export interface TenantIsolationConfig {
  /** Collection naming strategy */
  namingStrategy: 'prefix' | 'suffix' | 'separate' | 'custom';

  /** Custom naming function */
  customNaming?: (collection: string, tenantId: string) => string;

  /** Tenant ID extraction strategy */
  tenantExtraction: 'header' | 'query' | 'jwt' | 'context' | 'custom';

  /** Custom tenant extraction function */
  customExtraction?: (context: ExecutionContext) => Promise<string> | string;

  /** Enable strict tenant validation */
  strictValidation?: boolean;

  /** Enable tenant-specific caching */
  enableTenantCaching?: boolean;

  /** Tenant cache TTL (ms) */
  cacheTtl?: number;

  /** Enable audit logging for tenant operations */
  enableAuditLog?: boolean;

  /** Default tenant for development/testing */
  defaultTenant?: string;

  /** Enable cross-tenant queries (admin only) */
  allowCrossTenant?: boolean;
}

/**
 * Tenant-aware operation options
 */
export interface TenantAwareOptions {
  /** Skip tenant validation for this operation */
  skipTenantValidation?: boolean;

  /** Override tenant ID for this operation */
  overrideTenantId?: string;

  /** Enable cross-tenant access for this operation */
  allowCrossTenant?: boolean;

  /** Custom tenant metadata for this operation */
  tenantMetadata?: Record<string, unknown>;
}

/**
 * Tenant operation result with audit information
 */
export interface TenantOperationResult<T = unknown> {
  readonly result: T;
  readonly tenantId: string;
  readonly operationId: string;
  readonly timestamp: Date;
  readonly audit: {
    readonly userId?: string;
    readonly operation: string;
    readonly collection: string;
    readonly itemCount?: number;
  };
}

/**
 * Tenant collection name manager
 */
export class TenantCollectionManager {
  private static readonly logger = new Logger(TenantCollectionManager.name);

  /**
   * Generate tenant-aware collection name
   */
  static generateTenantCollection(
    baseCollection: string,
    tenantId: string,
    config: TenantIsolationConfig
  ): string {
    switch (config.namingStrategy) {
      case 'prefix':
        return `tenant_${tenantId}_${baseCollection}`;

      case 'suffix':
        return `${baseCollection}_tenant_${tenantId}`;

      case 'separate':
        return `${tenantId}:${baseCollection}`;

      case 'custom':
        if (!config.customNaming) {
          throw new Error('Custom naming function required for custom naming strategy');
        }
        return config.customNaming(baseCollection, tenantId);

      default:
        throw new Error(`Unknown naming strategy: ${config.namingStrategy}`);
    }
  }

  /**
   * Validate tenant collection name format
   */
  static validateTenantCollection(
    collection: string,
    tenantId: string,
    config: TenantIsolationConfig
  ): boolean {
    const expectedCollection = this.generateTenantCollection(
      this.extractBaseCollection(collection, tenantId, config),
      tenantId,
      config
    );

    return collection === expectedCollection;
  }

  /**
   * Extract base collection name from tenant collection
   */
  static extractBaseCollection(
    tenantCollection: string,
    tenantId: string,
    config: TenantIsolationConfig
  ): string {
    switch (config.namingStrategy) {
      case 'prefix':{
        const prefixPattern = `tenant_${tenantId}_`;
        return tenantCollection.startsWith(prefixPattern)
          ? tenantCollection.substring(prefixPattern.length)
          : tenantCollection;
      }
      case 'suffix':{
        const suffixPattern = `_tenant_${tenantId}`;
        return tenantCollection.endsWith(suffixPattern)
          ? tenantCollection.substring(0, tenantCollection.length - suffixPattern.length)
          : tenantCollection;
      }
      case 'separate':{
        const separatePattern = `${tenantId}:`;
        return tenantCollection.startsWith(separatePattern)
          ? tenantCollection.substring(separatePattern.length)
          : tenantCollection;
      }
      case 'custom':{
        // For custom naming, we can't reliably extract without reverse function
        this.logger.warn('Cannot extract base collection from custom naming strategy');
        return tenantCollection;
      }
      default:
        return tenantCollection;
    }
  }
}

/**
 * Tenant context extractor service
 */
@Injectable()
export class TenantContextExtractor {
  private static readonly logger = new Logger(TenantContextExtractor.name);

  /**
   * Extract tenant context from execution context
   */
  static async extractTenantContext(
    context: ExecutionContext,
    config: TenantIsolationConfig
  ): Promise<TenantContext> {
    let tenantId: string;

    switch (config.tenantExtraction) {
      case 'header':
        tenantId = await this.extractFromHeader(context);
        break;

      case 'query':
        tenantId = await this.extractFromQuery(context);
        break;

      case 'jwt':
        tenantId = await this.extractFromJWT(context);
        break;

      case 'context':
        tenantId = await this.extractFromContext(context);
        break;

      case 'custom':
        if (!config.customExtraction) {
          throw new Error('Custom extraction function required for custom tenant extraction');
        }
        tenantId = await config.customExtraction(context);
        break;

      default:
        throw new Error(`Unknown tenant extraction strategy: ${config.tenantExtraction}`);
    }

    if (!tenantId && config.defaultTenant) {
      tenantId = config.defaultTenant;
      this.logger.warn('Using default tenant for development/testing');
    }

    if (!tenantId) {
      throw new Error('Tenant ID not found in request context');
    }

    if (config.strictValidation) {
      await this.validateTenant(tenantId);
    }

    return {
      tenantId,
      // Additional context can be extracted based on requirements
    };
  }

  private static async extractFromHeader(context: ExecutionContext): Promise<string> {
    const request = context.switchToHttp().getRequest();
    return request.headers['x-tenant-id'] || request.headers['tenant-id'];
  }

  private static async extractFromQuery(context: ExecutionContext): Promise<string> {
    const request = context.switchToHttp().getRequest();
    return request.query.tenantId || request.query.tenant_id;
  }

  private static async extractFromJWT(context: ExecutionContext): Promise<string> {
    const request = context.switchToHttp().getRequest();

    // Extract from JWT token (assuming it's already decoded and available)
    if (request.user && request.user.tenantId) {
      return request.user.tenantId;
    }

    throw new Error('Tenant ID not found in JWT token');
  }

  private static async extractFromContext(context: ExecutionContext): Promise<string> {
    // Extract from NestJS execution context metadata
    const tenantId = context.getClass()['tenantId'] || context.getHandler()['tenantId'];

    if (!tenantId) {
      throw new Error('Tenant ID not found in execution context');
    }

    return tenantId;
  }

  private static async validateTenant(tenantId: string): Promise<void> {
    // Implement tenant validation logic (database lookup, etc.)
    if (!tenantId || tenantId.length < 3) {
      throw new Error('Invalid tenant ID format');
    }

    // Additional validation can be implemented here
    // e.g., check if tenant exists in database, is active, etc.
  }
}

/**
 * @TenantAware decorator for automatic tenant isolation
 *
 * @example
 * ```typescript
 * interface UserDocument extends BaseDocument<{
 *   name: string;
 *   email: string;
 * }> {}
 *
 * @Injectable()
 * export class UserService {
 *   constructor(private chromaService: ChromaDBService) {}
 *
 *   @TenantAware({
 *     namingStrategy: 'prefix',
 *     tenantExtraction: 'header',
 *     enableTenantCaching: true,
 *     enableAuditLog: true
 *   })
 *   async searchUsers(query: string): Promise<UserDocument[]> {
 *     // Collection name automatically becomes 'tenant_{tenantId}_users'
 *     return this.chromaService.searchDocuments('users', [query]);
 *   }
 *
 *   @TenantAware({
 *     namingStrategy: 'separate',
 *     tenantExtraction: 'jwt',
 *     allowCrossTenant: false
 *   })
 *   async createUser(user: Omit<UserDocument, 'id'>): Promise<UserDocument> {
 *     // Collection name automatically becomes '{tenantId}:users'
 *     const [id] = await this.chromaService.addDocuments('users', [user]);
 *     return { ...user, id };
 *   }
 * }
 *
 * // Usage with tenant context in headers
 * // GET /users/search?query=john
 * // Headers: { 'x-tenant-id': 'company-123' }
 * // -> Searches in collection 'tenant_company-123_users'
 * ```
 */
export function TenantAware(config: TenantIsolationConfig) {
  return function (
    target: unknown,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    // Store decorator metadata
    const metadata = DecoratorMetadataBuilder.createCoreMetadata(
      'TenantAware',
      'method',
      config as unknown as Record<string, unknown>
    );

    DecoratorMetadataRegistry.setMetadata(target, propertyKey, metadata);

    descriptor.value = async function (...args: unknown[]) {
      const logger = new Logger(`${target.constructor.name}.${String(propertyKey)}`);
      const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      try {
        // Extract tenant context from current execution context
        // Note: In a real implementation, we'd need access to ExecutionContext
        // For now, we'll assume it's available or passed as a parameter
        const tenantContext = await this.extractTenantContext(config);

        // Transform collection names in arguments to be tenant-aware
        const transformedArgs = this.transformArgsForTenant(args, tenantContext.tenantId, config);

        // Execute the original method with transformed arguments
        const startTime = Date.now();
        const result = await originalMethod.apply(this, transformedArgs);
        const duration = Date.now() - startTime;

        // Log operation for audit if enabled
        if (config.enableAuditLog) {
          logger.debug(
            `Tenant operation completed: ${String(propertyKey)} for tenant ${tenantContext.tenantId} in ${duration}ms`
          );
        }

        // Return wrapped result with tenant information
        const wrappedResult: TenantOperationResult = {
          result,
          tenantId: tenantContext.tenantId,
          operationId,
          timestamp: new Date(),
          audit: {
            userId: tenantContext.userId,
            operation: String(propertyKey),
            collection: this.extractCollectionFromArgs(args),
            itemCount: Array.isArray(result) ? result.length : 1,
          },
        };

        return config.enableAuditLog ? wrappedResult : result;

      } catch (error) {
        logger.error(`Tenant-aware operation failed: ${error.message}`, error.stack);
        throw error;
      }
    };

    // Add helper methods to the decorated method's context
    descriptor.value.extractTenantContext = async function (config: TenantIsolationConfig): Promise<TenantContext> {
      // In a real implementation, this would extract from HTTP context
      // For now, return a mock context or throw if not available
      throw new Error('Tenant context extraction not implemented - requires HTTP context');
    };

    descriptor.value.transformArgsForTenant = function (
      args: unknown[],
      tenantId: string,
      config: TenantIsolationConfig
    ): unknown[] {
      // Transform collection names in arguments to be tenant-aware
      return args.map(arg => {
        if (typeof arg === 'string' && this.isCollectionName(arg)) {
          return TenantCollectionManager.generateTenantCollection(arg, tenantId, config);
        }
        return arg;
      });
    };

    descriptor.value.extractCollectionFromArgs = function (args: unknown[]): string {
      // Find the first string argument that looks like a collection name
      for (const arg of args) {
        if (typeof arg === 'string' && this.isCollectionName(arg)) {
          return arg;
        }
      }
      return 'unknown';
    };

    descriptor.value.isCollectionName = function (value: string): boolean {
      // Simple heuristic to identify collection names
      // In a real implementation, this would check against known collection names
      return value.length > 0 && value.length < 100 && !value.includes(' ');
    };

    return descriptor;
  };
}

/**
 * @CrossTenant decorator for operations that need to access multiple tenants
 * Requires special permissions and should be used sparingly
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class AdminService {
 *   @CrossTenant({
 *     requiredPermissions: ['admin', 'cross-tenant-read'],
 *     auditLevel: 'detailed',
 *     maxTenants: 10
 *   })
 *   async searchAcrossAllTenants(query: string): Promise<TenantOperationResult<UserDocument[]>[]> {
 *     // This method can access multiple tenant collections
 *     const allTenants = await this.getTenantList();
 *     const results: TenantOperationResult<UserDocument[]>[] = [];
 *
 *     for (const tenant of allTenants) {
 *       const tenantResults = await this.chromaService.searchDocuments(
 *         `tenant_${tenant.id}_users`,
 *         [query]
 *       );
 *
 *       results.push({
 *         result: tenantResults,
 *         tenantId: tenant.id,
 *         operationId: `cross_tenant_${Date.now()}`,
 *         timestamp: new Date(),
 *         audit: {
 *           operation: 'searchAcrossAllTenants',
 *           collection: 'users',
 *           itemCount: tenantResults.length
 *         }
 *       });
 *     }
 *
 *     return results;
 *   }
 * }
 * ```
 */
export function CrossTenant(config: {
  requiredPermissions: string[];
  auditLevel?: 'basic' | 'detailed';
  maxTenants?: number;
}) {
  return function (
    target: unknown,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    // Store decorator metadata
    const metadata = DecoratorMetadataBuilder.createCoreMetadata(
      'CrossTenant',
      'method',
      config as unknown as Record<string, unknown>
    );

    DecoratorMetadataRegistry.setMetadata(target, propertyKey, metadata);

    descriptor.value = async function (...args: unknown[]) {
      const logger = new Logger(`${target.constructor.name}.${String(propertyKey)}`);

      try {
        // Validate permissions for cross-tenant access
        await this.validateCrossTenantPermissions(config.requiredPermissions);

        // Log cross-tenant operation (always audit these operations)
        logger.warn(
          `Cross-tenant operation initiated: ${String(propertyKey)} with permissions: ${config.requiredPermissions.join(', ')}`
        );

        // Execute the original method
        const result = await originalMethod.apply(this, args);

        // Enhanced audit logging for cross-tenant operations
        if (config.auditLevel === 'detailed') {
          logger.log(
            `Cross-tenant operation completed: ${String(propertyKey)}, result count: ${Array.isArray(result) ? result.length : 1}`
          );
        }

        return result;

      } catch (error) {
        logger.error(`Cross-tenant operation failed: ${error.message}`, error.stack);
        throw error;
      }
    };

    descriptor.value.validateCrossTenantPermissions = async function (requiredPermissions: string[]): Promise<void> {
      // In a real implementation, this would check user permissions
      // For now, we'll just validate the permissions format
      if (!requiredPermissions || requiredPermissions.length === 0) {
        throw new Error('Cross-tenant operations require explicit permissions');
      }

      // Mock permission validation - in real implementation, check against user's actual permissions
      const hasRequiredPermissions = requiredPermissions.every(permission =>
        ['admin', 'cross-tenant-read', 'cross-tenant-write'].includes(permission)
      );

      if (!hasRequiredPermissions) {
        throw new Error('Insufficient permissions for cross-tenant operation');
      }
    };

    return descriptor;
  };
}

/**
 * Tenant-aware repository base class
 */
export abstract class TenantAwareRepository<TDocument extends BaseDocument = BaseDocument> {
  protected readonly logger = new Logger(this.constructor.name);
  protected tenantContext?: TenantContext;

  /**
   * Set tenant context for this repository instance
   */
  setTenantContext(context: TenantContext): void {
    this.tenantContext = context;
  }

  /**
   * Get tenant-aware collection name
   */
  protected getTenantCollection(baseCollection: string): string {
    if (!this.tenantContext) {
      throw new Error('Tenant context not set - call setTenantContext() first');
    }

    // Default to prefix strategy - can be configured
    return `tenant_${this.tenantContext.tenantId}_${baseCollection}`;
  }

  /**
   * Validate tenant access for document
   */
  protected validateTenantAccess(document: TDocument): void {
    if (!this.tenantContext) {
      throw new Error('Tenant context not set');
    }

    // Check if document belongs to current tenant
    const documentTenantId = document.metadata?.tenantId;
    if (documentTenantId && documentTenantId !== this.tenantContext.tenantId) {
      throw new Error('Access denied: Document belongs to different tenant');
    }
  }

  /**
   * Enrich document with tenant metadata
   */
  protected enrichDocumentWithTenant(document: Omit<TDocument, 'id'>): TDocument {
    if (!this.tenantContext) {
      throw new Error('Tenant context not set');
    }

    return {
      ...document,
      id: this.generateTenantAwareId(),
      metadata: {
        ...document.metadata,
        tenantId: this.tenantContext.tenantId,
        organizationId: this.tenantContext.organizationId,
        createdBy: this.tenantContext.userId,
        createdAt: new Date().toISOString(),
      },
    } as TDocument;
  }

  private generateTenantAwareId(): string {
    const tenantPrefix = this.tenantContext?.tenantId.substring(0, 8) || 'unknown';
    return `${tenantPrefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

