/**
 * @fileoverview Tenant Context Service - Manages tenant context extraction and validation
 */

import { Injectable, Logger, ExecutionContext } from '@nestjs/common';
import {
  logUnknownError,
  handleUnknownError,
} from '../../utils/error-handling.utils';

/**
 * Tenant context interface
 */
export interface TenantContext {
  /** Unique tenant identifier */
  readonly tenantId: string;

  /** Tenant organization/company name */
  readonly organizationId?: string;

  /** Tenant display name */
  readonly tenantName?: string;

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

  /** Legacy naming strategy alias */
  namespacingStrategy?: 'prefix' | 'suffix' | 'separate' | 'custom';

  /** Custom naming function */
  customNaming?: (collection: string, tenantId: string) => string;

  /** Tenant ID extraction strategy */
  tenantExtraction: 'header' | 'query' | 'jwt' | 'context' | 'custom';

  /** Metadata fields configuration */
  metadataFields?: {
    tenantId?: string;
    tenantName?: string;
    organizationId?: string;
  };

  /** Document filtering strategy */
  documentFiltering?: 'none' | 'content_prefix' | 'metadata_reference';

  /** Inject tenant metadata into documents */
  injectTenantMetadata?: boolean;

  /** Maximum items per query for resource limiting */
  maxItemsPerQuery?: number;

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
 * Tenant context extraction result
 */
export interface TenantExtractionResult {
  readonly tenantContext: TenantContext;
  readonly extractionMethod: string;
  readonly isValid: boolean;
  readonly validationErrors: string[];
}

/**
 * Service responsible for extracting and managing tenant context
 */
@Injectable()
export class TenantContextService {
  private readonly logger = new Logger(TenantContextService.name);
  private readonly contextCache = new Map<string, TenantContext>();

  /**
   * Extract tenant context from execution context
   */
  async extractTenantContext(
    context: ExecutionContext,
    config: TenantIsolationConfig
  ): Promise<TenantExtractionResult> {
    const cacheKey = this.generateCacheKey(context, config);

    // Check cache first if enabled
    if (config.enableTenantCaching && this.contextCache.has(cacheKey)) {
      const cachedContext = this.contextCache.get(cacheKey)!;
      return {
        tenantContext: cachedContext,
        extractionMethod: 'cache',
        isValid: true,
        validationErrors: [],
      };
    }

    let tenantId: string;
    let extractionMethod: string;

    try {
      switch (config.tenantExtraction) {
        case 'header':
          tenantId = await this.extractFromHeader(context);
          extractionMethod = 'header';
          break;

        case 'query':
          tenantId = await this.extractFromQuery(context);
          extractionMethod = 'query';
          break;

        case 'jwt':
          tenantId = await this.extractFromJWT(context);
          extractionMethod = 'jwt';
          break;

        case 'context':
          tenantId = await this.extractFromContext(context);
          extractionMethod = 'context';
          break;

        case 'custom':
          if (!config.customExtraction) {
            throw new Error(
              'Custom extraction function required for custom tenant extraction'
            );
          }
          tenantId = await config.customExtraction(context);
          extractionMethod = 'custom';
          break;

        default:
          throw new Error(
            `Unknown tenant extraction strategy: ${config.tenantExtraction}`
          );
      }

      // Use default tenant if none found and default is configured
      if (!tenantId && config.defaultTenant) {
        tenantId = config.defaultTenant;
        extractionMethod = 'default';
        this.logger.warn('Using default tenant for development/testing');
      }

      if (!tenantId) {
        throw new Error('Tenant ID not found in request context');
      }

      // Create tenant context
      const tenantContext = await this.buildTenantContext(
        tenantId,
        context,
        config
      );

      // Validate if strict validation is enabled
      const validationErrors: string[] = [];
      if (config.strictValidation) {
        const errors = await this.validateTenantContext(tenantContext);
        validationErrors.push(...errors);
      }

      // Cache if enabled and valid
      if (config.enableTenantCaching && validationErrors.length === 0) {
        this.cacheContext(cacheKey, tenantContext, config.cacheTtl);
      }

      return {
        tenantContext,
        extractionMethod,
        isValid: validationErrors.length === 0,
        validationErrors,
      };
    } catch (error: unknown) {
      logUnknownError(this.logger, error, 'Failed to extract tenant context');
      throw handleUnknownError(error, 'Extract tenant context');
    }
  }

  /**
   * Validate tenant context
   */
  async validateTenantContext(context: TenantContext): Promise<string[]> {
    const errors: string[] = [];

    // Basic validation
    if (!context.tenantId || context.tenantId.length < 3) {
      errors.push('Invalid tenant ID format');
    }

    // Validate tenant ID format (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(context.tenantId)) {
      errors.push('Tenant ID contains invalid characters');
    }

    // Additional business logic validation can be added here
    // e.g., check if tenant exists in database, is active, etc.

    return errors;
  }

  /**
   * Clear tenant context cache
   */
  clearCache(tenantId?: string): void {
    if (tenantId) {
      // Clear specific tenant cache entries
      const keysToDelete = Array.from(this.contextCache.keys()).filter((key) =>
        key.includes(tenantId)
      );
      keysToDelete.forEach((key) => this.contextCache.delete(key));
    } else {
      // Clear all cache
      this.contextCache.clear();
    }
  }

  private async extractFromHeader(context: ExecutionContext): Promise<string> {
    const request = context.switchToHttp().getRequest();
    return request.headers['x-tenant-id'] || request.headers['tenant-id'];
  }

  private async extractFromQuery(context: ExecutionContext): Promise<string> {
    const request = context.switchToHttp().getRequest();
    return request.query.tenantId || request.query.tenant_id;
  }

  private async extractFromJWT(context: ExecutionContext): Promise<string> {
    const request = context.switchToHttp().getRequest();

    // Extract from JWT token (assuming it's already decoded and available)
    if (request.user?.tenantId) {
      return request.user.tenantId;
    }

    throw new Error('Tenant ID not found in JWT token');
  }

  private async extractFromContext(context: ExecutionContext): Promise<string> {
    // Extract from NestJS execution context metadata
    const tenantId =
      (context.getClass() as any)['tenantId'] ||
      (context.getHandler() as any)['tenantId'];

    if (!tenantId) {
      throw new Error('Tenant ID not found in execution context');
    }

    return tenantId;
  }

  private async buildTenantContext(
    tenantId: string,
    context: ExecutionContext,
    config: TenantIsolationConfig
  ): Promise<TenantContext> {
    const request = context.switchToHttp().getRequest();

    // Extract additional context information
    const organizationId =
      request.headers['x-organization-id'] || request.user?.organizationId;

    const userId = request.user?.id || request.user?.userId;

    const permissions = request.user?.permissions || [];

    const tier = request.user?.tier || 'free';

    const region = request.headers['x-region'] || 'default';

    const metadata = {
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      extractedAt: new Date().toISOString(),
    };

    return {
      tenantId,
      organizationId,
      userId,
      permissions,
      metadata,
      tier: tier as 'free' | 'pro' | 'enterprise',
      region,
    };
  }

  private generateCacheKey(
    context: ExecutionContext,
    config: TenantIsolationConfig
  ): string {
    const request = context.switchToHttp().getRequest();
    const sessionId = request.sessionID || 'no-session';
    const method = request.method;
    const url = request.url;

    return `tenant_context:${config.tenantExtraction}:${sessionId}:${method}:${url}`;
  }

  private cacheContext(
    cacheKey: string,
    context: TenantContext,
    ttl = 300000 // 5 minutes default
  ): void {
    this.contextCache.set(cacheKey, context);

    // Set TTL cleanup
    setTimeout(() => {
      this.contextCache.delete(cacheKey);
    }, ttl);
  }
}
