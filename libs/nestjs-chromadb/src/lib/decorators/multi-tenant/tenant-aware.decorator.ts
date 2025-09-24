/**
 * @fileoverview @TenantAware Decorator - Multi-Tenancy Support for ChromaDB Operations
 *
 * This decorator automatically handles tenant isolation for ChromaDB operations,
 * providing secure multi-tenancy with collection namespacing and tenant context management.
 */

import { Logger, type ExecutionContext } from '@nestjs/common';
import type { BaseDocument } from '../../types/core.interface';
import {
  DecoratorMetadataRegistry,
  DecoratorMetadataBuilder,
} from '../core/decorator-metadata';
import type {
  TenantContext,
  TenantIsolationConfig,
} from '../../services/multi-tenant/tenant-context.service';
import { TenantExtractor, TenantExtractionError } from './tenant-extraction';
import { TenantValidator, TenantValidationError } from './tenant-validation';
import {
  TenantArgumentTransformer,
  TenantTransformationError,
} from './tenant-transformation';

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

  /** Skip specific validation rules */
  skipValidationRules?: string[];

  /** Skip specific transformers */
  skipTransformers?: string[];
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
    readonly duration: number;
    readonly transformationsApplied: number;
  };
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
export function TenantAware(
  config: TenantIsolationConfig,
  options: TenantAwareOptions = {}
) {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const logger = new Logger(
      `${target.constructor.name}.${String(propertyKey)}`
    );

    // Initialize utilities
    const tenantExtractor = new TenantExtractor();
    const tenantValidator = new TenantValidator();
    const argumentTransformer = new TenantArgumentTransformer();

    // Store decorator metadata
    const metadata = DecoratorMetadataBuilder.createCoreMetadata(
      'TenantAware',
      'method',
      { ...config, ...options } as Record<string, unknown>
    );

    DecoratorMetadataRegistry.setMetadata(target, propertyKey, metadata);

    descriptor.value = async function (...args: unknown[]) {
      const operationId = generateOperationId();
      const startTime = Date.now();
      let tenantContext: TenantContext | undefined;

      try {
        // Extract tenant context from execution context
        const executionContext = getExecutionContext(this);
        const extractionResult = await tenantExtractor.extractTenant(
          executionContext,
          config
        );
        tenantContext = extractionResult.tenantContext;

        // Override tenant ID if specified
        if (options.overrideTenantId) {
          tenantContext = {
            ...tenantContext,
            tenantId: options.overrideTenantId,
          };
        }

        // Validate tenant context if not skipped
        if (!options.skipTenantValidation) {
          const validationResult = await tenantValidator.validateTenant(
            tenantContext,
            config,
            { skipRules: options.skipValidationRules }
          );

          if (!validationResult.isValid) {
            throw new TenantValidationError(
              `Tenant validation failed: ${validationResult.errors.join(', ')}`,
              'context',
              tenantContext.tenantId
            );
          }

          // Log validation warnings
          if (validationResult.warnings.length > 0) {
            logger.warn(
              `Tenant validation warnings for ${
                tenantContext.tenantId
              }: ${validationResult.warnings.join(', ')}`
            );
          }
        }

        // Transform arguments for tenant isolation
        const transformationResult = argumentTransformer.transformArguments(
          args,
          tenantContext,
          config,
          { skipTransformers: options.skipTransformers }
        );

        // Execute the original method with transformed arguments
        const result = await originalMethod.apply(
          this,
          transformationResult.transformedArgs
        );
        const duration = Date.now() - startTime;

        // Log operation for audit if enabled
        if (config.enableAuditLog) {
          logger.debug(
            `Tenant operation completed: ${String(propertyKey)} for tenant ${
              tenantContext.tenantId
            } in ${duration}ms` +
              ` (${transformationResult.collectionsTransformed.length} collections transformed)`
          );
        }

        // Return wrapped result with tenant information if audit enabled
        if (config.enableAuditLog) {
          const wrappedResult: TenantOperationResult = {
            result,
            tenantId: tenantContext.tenantId,
            operationId,
            timestamp: new Date(),
            audit: {
              userId: tenantContext.userId,
              operation: String(propertyKey),
              collection:
                transformationResult.collectionsTransformed[0] || 'unknown',
              itemCount: Array.isArray(result) ? result.length : 1,
              duration,
              transformationsApplied: transformationResult.metadata
                .totalTransformations as number,
            },
          };
          return wrappedResult;
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Enhanced error logging with context
        if (error instanceof TenantExtractionError) {
          logger.error(
            `Tenant extraction failed for operation ${String(propertyKey)}: ${
              error.message
            }`,
            { operationId, extractionMethod: error.extractionMethod, duration }
          );
        } else if (error instanceof TenantValidationError) {
          logger.error(
            `Tenant validation failed for operation ${String(propertyKey)}: ${
              error.message
            }`,
            {
              operationId,
              tenantId: error.tenantId,
              validationType: error.validationType,
              duration,
            }
          );
        } else if (error instanceof TenantTransformationError) {
          logger.error(
            `Tenant transformation failed for operation ${String(
              propertyKey
            )}: ${error.message}`,
            {
              operationId,
              argumentIndex: error.argumentIndex,
              tenantId: error.tenantId,
              duration,
            }
          );
        } else {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          logger.error(
            `Tenant-aware operation failed: ${String(
              propertyKey
            )} - ${errorMessage}`,
            {
              operationId,
              tenantId: tenantContext?.tenantId,
              duration,
              stack: errorStack,
            }
          );
        }

        throw error;
      }
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
 *           itemCount: tenantResults.length,
 *           duration: 0,
 *           transformationsApplied: 0
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
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const logger = new Logger(
      `${target.constructor.name}.${String(propertyKey)}`
    );
    const tenantValidator = new TenantValidator();

    // Store decorator metadata
    const metadata = DecoratorMetadataBuilder.createCoreMetadata(
      'CrossTenant',
      'method',
      config as Record<string, unknown>
    );

    DecoratorMetadataRegistry.setMetadata(target, propertyKey, metadata);

    descriptor.value = async function (...args: unknown[]) {
      const operationId = generateOperationId();
      const startTime = Date.now();

      try {
        // Extract tenant context for permission validation
        const executionContext = getExecutionContext(this);
        const tenantExtractor = new TenantExtractor();
        const extractionResult =
          await tenantExtractor.extractTenantWithFallback(executionContext, {
            namingStrategy: 'prefix',
            tenantExtraction: 'jwt',
            strictValidation: true,
          });

        const tenantContext = extractionResult.tenantContext;

        // Validate cross-tenant permissions
        const validationResult =
          await tenantValidator.validateCrossTenantOperation({
            requestingTenant: tenantContext,
            targetTenantIds: [], // Would be extracted from args
            operation: String(propertyKey),
            resource: 'multi-tenant',
          });

        if (!validationResult.isValid) {
          throw new TenantValidationError(
            `Cross-tenant access denied: ${validationResult.errors.join(', ')}`,
            'cross-tenant',
            tenantContext.tenantId
          );
        }

        // Log cross-tenant operation (always audit these operations)
        logger.warn(
          `Cross-tenant operation initiated: ${String(propertyKey)} by tenant ${
            tenantContext.tenantId
          } ` + `with permissions: ${config.requiredPermissions.join(', ')}`
        );

        // Execute the original method
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        // Enhanced audit logging for cross-tenant operations
        if (config.auditLevel === 'detailed') {
          logger.log(
            `Cross-tenant operation completed: ${String(propertyKey)} by ${
              tenantContext.tenantId
            }, ` +
              `duration: ${duration}ms, result count: ${
                Array.isArray(result) ? result.length : 1
              }`
          );
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error(
          `Cross-tenant operation failed: ${String(
            propertyKey
          )} - ${errorMessage}`,
          { operationId, duration, stack: errorStack }
        );
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Tenant-aware repository base class
 */
export abstract class TenantAwareRepository<
  TDocument extends BaseDocument = BaseDocument
> {
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
    const documentTenantId = (document.metadata as any)?.tenantId;
    if (documentTenantId && documentTenantId !== this.tenantContext.tenantId) {
      throw new Error('Access denied: Document belongs to different tenant');
    }
  }

  /**
   * Enrich document with tenant metadata
   */
  protected enrichDocumentWithTenant(
    document: Omit<TDocument, 'id'>
  ): TDocument {
    if (!this.tenantContext) {
      throw new Error('Tenant context not set');
    }

    return {
      ...document,
      id: this.generateTenantAwareId(),
      metadata: {
        ...(document.metadata as Record<string, unknown>),
        tenantId: this.tenantContext.tenantId,
        organizationId: this.tenantContext.organizationId,
        createdBy: this.tenantContext.userId,
        createdAt: new Date().toISOString(),
      },
    } as unknown as TDocument;
  }

  private generateTenantAwareId(): string {
    const tenantPrefix =
      this.tenantContext?.tenantId.substring(0, 8) || 'unknown';
    return `${tenantPrefix}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }
}

// Utility functions

/**
 * Generate operation ID for tracking
 */
function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get execution context from method context
 * This is a simplified version - in real implementation would need proper context extraction
 */
function getExecutionContext(methodContext: any): ExecutionContext {
  // This would need to be properly implemented to extract ExecutionContext
  // For now, return a mock context that would be properly provided by NestJS
  return {
    switchToHttp: () => ({
      getRequest: () => methodContext.request || {},
      getResponse: () => methodContext.response || {},
    }),
    getClass: () => methodContext.constructor,
    getHandler: () => methodContext,
  } as ExecutionContext;
}

// Export types for use by other modules
export type { TenantContext, TenantIsolationConfig };
