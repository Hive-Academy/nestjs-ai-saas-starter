/**
 * @fileoverview Tenant Extraction Utilities - Extract tenant context from execution contexts
 */

import { type ExecutionContext, Logger } from '@nestjs/common';
import type {
  TenantContext,
  TenantIsolationConfig,
} from '../../services/multi-tenant/tenant-context.service';

/**
 * Tenant extraction error with context
 */
export class TenantExtractionError extends Error {
  constructor(
    message: string,
    public readonly extractionMethod: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TenantExtractionError';
  }
}

/**
 * Tenant extraction result
 */
export interface TenantExtractionResult {
  readonly tenantContext: TenantContext;
  readonly extractionMethod: string;
  readonly reliability: 'high' | 'medium' | 'low';
  readonly metadata: Record<string, unknown>;
}

/**
 * Extraction strategy interface
 */
export interface TenantExtractionStrategy {
  readonly name: string;
  readonly priority: number;
  extract(context: ExecutionContext): Promise<TenantContext | null>;
  isAvailable(context: ExecutionContext): boolean;
}

/**
 * Header-based tenant extraction strategy
 */
export class HeaderExtractionStrategy implements TenantExtractionStrategy {
  readonly name = 'header';
  readonly priority = 10;
  private readonly logger = new Logger(HeaderExtractionStrategy.name);

  isAvailable(context: ExecutionContext): boolean {
    try {
      const request = context.switchToHttp().getRequest();
      return !!request?.headers;
    } catch {
      return false;
    }
  }

  async extract(context: ExecutionContext): Promise<TenantContext | null> {
    try {
      const request = context.switchToHttp().getRequest();
      const tenantId =
        request.headers['x-tenant-id'] ||
        request.headers['tenant-id'] ||
        request.headers['X-Tenant-ID'] ||
        request.headers['Tenant-ID'];

      if (!tenantId) {
        return null;
      }

      // Extract additional context from headers
      const organizationId =
        request.headers['x-organization-id'] ||
        request.headers['organization-id'];

      const region = request.headers['x-region'] || request.headers['region'];

      return {
        tenantId: String(tenantId),
        organizationId: organizationId ? String(organizationId) : undefined,
        region: region ? String(region) : undefined,
        metadata: {
          extractionMethod: 'header',
          userAgent: request.headers['user-agent'],
          extractedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Header extraction failed: ${errorMessage}`);
      return null;
    }
  }
}

/**
 * Query parameter tenant extraction strategy
 */
export class QueryExtractionStrategy implements TenantExtractionStrategy {
  readonly name = 'query';
  readonly priority = 8;
  private readonly logger = new Logger(QueryExtractionStrategy.name);

  isAvailable(context: ExecutionContext): boolean {
    try {
      const request = context.switchToHttp().getRequest();
      return !!request?.query;
    } catch {
      return false;
    }
  }

  async extract(context: ExecutionContext): Promise<TenantContext | null> {
    try {
      const request = context.switchToHttp().getRequest();
      const tenantId =
        request.query.tenantId ||
        request.query.tenant_id ||
        request.query.tenant;

      if (!tenantId) {
        return null;
      }

      const organizationId =
        request.query.organizationId ||
        request.query.organization_id ||
        request.query.org;

      return {
        tenantId: String(tenantId),
        organizationId: organizationId ? String(organizationId) : undefined,
        metadata: {
          extractionMethod: 'query',
          queryParams: Object.keys(request.query),
          extractedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Query extraction failed: ${errorMessage}`);
      return null;
    }
  }
}

/**
 * JWT token tenant extraction strategy
 */
export class JWTExtractionStrategy implements TenantExtractionStrategy {
  readonly name = 'jwt';
  readonly priority = 15;
  private readonly logger = new Logger(JWTExtractionStrategy.name);

  isAvailable(context: ExecutionContext): boolean {
    try {
      const request = context.switchToHttp().getRequest();
      return !!request?.user;
    } catch {
      return false;
    }
  }

  async extract(context: ExecutionContext): Promise<TenantContext | null> {
    try {
      const request = context.switchToHttp().getRequest();
      const user = request.user;

      if (!user?.tenantId) {
        return null;
      }

      return {
        tenantId: String(user.tenantId),
        organizationId: user.organizationId
          ? String(user.organizationId)
          : undefined,
        userId:
          user.id || user.userId ? String(user.id || user.userId) : undefined,
        permissions: Array.isArray(user.permissions)
          ? user.permissions
          : undefined,
        tier: user.tier as 'free' | 'pro' | 'enterprise' | undefined,
        metadata: {
          extractionMethod: 'jwt',
          userEmail: user.email,
          roles: user.roles,
          extractedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`JWT extraction failed: ${errorMessage}`);
      return null;
    }
  }
}

/**
 * Context metadata tenant extraction strategy
 */
export class ContextExtractionStrategy implements TenantExtractionStrategy {
  readonly name = 'context';
  readonly priority = 5;
  private readonly logger = new Logger(ContextExtractionStrategy.name);

  isAvailable(context: ExecutionContext): boolean {
    try {
      return !!(context.getClass() || context.getHandler());
    } catch {
      return false;
    }
  }

  async extract(context: ExecutionContext): Promise<TenantContext | null> {
    try {
      // Extract from NestJS execution context metadata
      const classMetadata = (context.getClass() as any)['tenantId'];
      const handlerMetadata = (context.getHandler() as any)['tenantId'];

      const tenantId = handlerMetadata || classMetadata;

      if (!tenantId) {
        return null;
      }

      return {
        tenantId: String(tenantId),
        metadata: {
          extractionMethod: 'context',
          className: context.getClass().name,
          handlerName: context.getHandler().name,
          extractedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Context extraction failed: ${errorMessage}`);
      return null;
    }
  }
}

/**
 * Custom tenant extraction strategy
 */
export class CustomExtractionStrategy implements TenantExtractionStrategy {
  readonly name = 'custom';
  readonly priority = 20;

  constructor(
    private readonly customExtractor: (
      context: ExecutionContext
    ) => Promise<string> | string
  ) {}

  isAvailable(context: ExecutionContext): boolean {
    return typeof this.customExtractor === 'function';
  }

  async extract(context: ExecutionContext): Promise<TenantContext | null> {
    try {
      const tenantId = await this.customExtractor(context);

      if (!tenantId) {
        return null;
      }

      return {
        tenantId: String(tenantId),
        metadata: {
          extractionMethod: 'custom',
          extractedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new TenantExtractionError(
        `Custom extraction failed: ${errorMessage}`,
        'custom',
        { originalError: errorMessage }
      );
    }
  }
}

/**
 * Main tenant extractor that manages multiple strategies
 */
export class TenantExtractor {
  private readonly logger = new Logger(TenantExtractor.name);
  private readonly strategies = new Map<string, TenantExtractionStrategy>();

  constructor() {
    // Register default strategies
    this.registerStrategy(new HeaderExtractionStrategy());
    this.registerStrategy(new QueryExtractionStrategy());
    this.registerStrategy(new JWTExtractionStrategy());
    this.registerStrategy(new ContextExtractionStrategy());
  }

  /**
   * Register a custom extraction strategy
   */
  registerStrategy(strategy: TenantExtractionStrategy): void {
    this.strategies.set(strategy.name, strategy);
    this.logger.debug(
      `Registered tenant extraction strategy: ${strategy.name}`
    );
  }

  /**
   * Extract tenant context using configured strategy
   */
  async extractTenant(
    context: ExecutionContext,
    config: TenantIsolationConfig
  ): Promise<TenantExtractionResult> {
    // Handle custom extraction first
    if (config.tenantExtraction === 'custom' && config.customExtraction) {
      const customStrategy = new CustomExtractionStrategy(
        config.customExtraction
      );
      return this.tryExtraction(customStrategy, context);
    }

    // Use specific strategy
    const strategy = this.strategies.get(config.tenantExtraction);
    if (strategy) {
      return this.tryExtraction(strategy, context);
    }

    throw new TenantExtractionError(
      `Unknown tenant extraction strategy: ${config.tenantExtraction}`,
      config.tenantExtraction
    );
  }

  /**
   * Extract tenant using fallback strategy (try all available strategies)
   */
  async extractTenantWithFallback(
    context: ExecutionContext,
    config: TenantIsolationConfig
  ): Promise<TenantExtractionResult> {
    const sortedStrategies = Array.from(this.strategies.values())
      .filter((strategy) => strategy.isAvailable(context))
      .sort((a, b) => b.priority - a.priority);

    const errors: string[] = [];

    for (const strategy of sortedStrategies) {
      try {
        const result = await this.tryExtraction(strategy, context);
        if (result.tenantContext.tenantId) {
          return result;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push(`${strategy.name}: ${errorMessage}`);
      }
    }

    // Try default tenant if configured
    if (config.defaultTenant) {
      this.logger.warn('Using default tenant for development/testing');
      return {
        tenantContext: {
          tenantId: config.defaultTenant,
          metadata: {
            extractionMethod: 'default',
            extractedAt: new Date().toISOString(),
          },
        },
        extractionMethod: 'default',
        reliability: 'low',
        metadata: {
          defaultTenantUsed: true,
          attemptedStrategies: sortedStrategies.map((s) => s.name),
        },
      };
    }

    throw new TenantExtractionError(
      `Failed to extract tenant ID using any strategy. Errors: ${errors.join(
        '; '
      )}`,
      'fallback',
      { attemptedStrategies: sortedStrategies.map((s) => s.name), errors }
    );
  }

  /**
   * Validate extracted tenant context
   */
  validateExtractedContext(
    tenantContext: TenantContext,
    config: TenantIsolationConfig
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!tenantContext.tenantId) {
      errors.push('Tenant ID is required');
    }

    if (tenantContext.tenantId && tenantContext.tenantId.length < 3) {
      errors.push('Tenant ID must be at least 3 characters long');
    }

    if (
      tenantContext.tenantId &&
      !/^[a-zA-Z0-9_-]+$/.test(tenantContext.tenantId)
    ) {
      errors.push('Tenant ID contains invalid characters');
    }

    // Strict validation if enabled
    if (config.strictValidation) {
      if (
        !tenantContext.organizationId &&
        tenantContext.tier === 'enterprise'
      ) {
        errors.push('Enterprise tenants must have organization ID');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private async tryExtraction(
    strategy: TenantExtractionStrategy,
    context: ExecutionContext
  ): Promise<TenantExtractionResult> {
    const tenantContext = await strategy.extract(context);

    if (!tenantContext) {
      throw new TenantExtractionError(
        `Strategy ${strategy.name} returned null`,
        strategy.name
      );
    }

    // Determine reliability based on strategy
    const reliability = this.getReliability(strategy.name);

    return {
      tenantContext,
      extractionMethod: strategy.name,
      reliability,
      metadata: {
        strategyPriority: strategy.priority,
        extractedAt: new Date().toISOString(),
      },
    };
  }

  private getReliability(strategyName: string): 'high' | 'medium' | 'low' {
    switch (strategyName) {
      case 'jwt':
        return 'high';
      case 'header':
        return 'high';
      case 'custom':
        return 'medium';
      case 'query':
        return 'medium';
      case 'context':
        return 'low';
      case 'default':
        return 'low';
      default:
        return 'medium';
    }
  }
}
