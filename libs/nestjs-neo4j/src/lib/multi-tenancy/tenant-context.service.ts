/**
 * @fileoverview Tenant Context Service for Multi-Tenancy Support
 *
 * This service implements database-per-tenant multi-tenancy for Neo4j following
 * NestJS best practices. Each tenant gets their own Neo4j database for maximum
 * data isolation and security.
 *
 * Features:
 * - Request-scoped tenant resolution
 * - Dynamic database connection management
 * - Tenant validation and security
 * - Connection pooling per tenant
 * - Automatic cleanup and optimization
 */

import {
  Injectable,
  Scope,
  Inject,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { Driver } from 'neo4j-driver';

/**
 * Tenant configuration interface
 */
export interface TenantConfig {
  /** Unique tenant identifier */
  tenantId: string;
  /** Tenant display name */
  name: string;
  /** Neo4j database name for this tenant */
  databaseName: string;
  /** Tenant-specific configuration */
  config?: {
    /** Custom connection settings */
    connectionSettings?: Record<string, any>;
    /** Resource limits */
    limits?: {
      maxConnections?: number;
      queryTimeout?: number;
      maxMemory?: string;
    };
    /** Feature flags for tenant */
    features?: string[];
  };
  /** Tenant status */
  status: 'active' | 'suspended' | 'trial' | 'archived';
  /** Subscription information */
  subscription?: {
    plan: string;
    expiresAt?: Date;
    limits: {
      maxNodes?: number;
      maxRelationships?: number;
      maxQueries?: number;
    };
  };
  /** Security settings */
  security?: {
    allowedIPs?: string[];
    requireMFA?: boolean;
    dataRegion?: string;
  };
  /** Metadata */
  metadata?: {
    createdAt: Date;
    createdBy: string;
    tags?: string[];
  };
}

/**
 * Tenant resolution strategy
 */
export interface TenantResolutionStrategy {
  /** Extract tenant ID from request */
  extractTenantId(request: Request): string | null;
  /** Validate tenant access */
  validateAccess?(request: Request, tenantId: string): Promise<boolean>;
  /** Get tenant configuration */
  getTenantConfig?(tenantId: string): Promise<TenantConfig | null>;
}

/**
 * Default strategies for tenant resolution
 */
export class DefaultTenantStrategies {
  /**
   * Header-based tenant resolution (recommended for APIs)
   */
  static header(headerName = 'x-tenant-id'): TenantResolutionStrategy {
    return {
      extractTenantId: (request: Request) => {
        return (request.headers[headerName] as string) || null;
      },
    };
  }

  /**
   * Subdomain-based tenant resolution (good for web apps)
   */
  static subdomain(): TenantResolutionStrategy {
    return {
      extractTenantId: (request: Request) => {
        const host = request.get('host');
        if (!host) return null;

        const subdomain = host.split('.')[0];
        return subdomain !== 'www' && subdomain !== 'api' ? subdomain : null;
      },
    };
  }

  /**
   * JWT-based tenant resolution (from authenticated user)
   */
  static jwt(userProperty = 'tenantId'): TenantResolutionStrategy {
    return {
      extractTenantId: (request: Request) => {
        const user = (request as any).user;
        return user?.[userProperty] || null;
      },
    };
  }

  /**
   * Path-based tenant resolution (/api/tenants/:tenantId/...)
   */
  static pathParam(paramName = 'tenantId'): TenantResolutionStrategy {
    return {
      extractTenantId: (request: Request) => {
        return (request as any).params?.[paramName] || null;
      },
    };
  }

  /**
   * Query parameter tenant resolution (?tenantId=...)
   */
  static queryParam(paramName = 'tenantId'): TenantResolutionStrategy {
    return {
      extractTenantId: (request: Request) => {
        return (request.query[paramName] as string) || null;
      },
    };
  }
}

/**
 * Tenant context service - request scoped for per-request tenant resolution
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private _tenantId: string | null = null;
  private _tenantConfig: TenantConfig | null = null;
  private _validated = false;

  constructor(
    @Inject(REQUEST) private readonly request: Request,
    @Inject('TENANT_RESOLUTION_STRATEGY')
    private readonly strategy: TenantResolutionStrategy,
    @Inject('TENANT_CONFIG_PROVIDER')
    private readonly configProvider: TenantConfigProvider
  ) {}

  /**
   * Get current tenant ID with lazy resolution
   */
  async getTenantId(): Promise<string> {
    if (this._tenantId === null) {
      await this.resolveTenant();
    }

    if (!this._tenantId) {
      throw new BadRequestException('No tenant context available');
    }

    return this._tenantId;
  }

  /**
   * Set tenant ID explicitly (for testing or special cases)
   */
  async setTenant(tenantId: string): Promise<void> {
    this._tenantId = tenantId;
    this._tenantConfig = null;
    this._validated = false;
    await this.resolveTenant();
  }

  /**
   * Get all tenants from the provider
   */
  async getAllTenants(): Promise<TenantConfig[]> {
    return await this.configProvider.getAllTenants();
  }

  /**
   * Get current tenant configuration
   */
  async getTenantConfig(): Promise<TenantConfig> {
    if (this._tenantConfig === null) {
      await this.resolveTenant();
    }

    if (!this._tenantConfig) {
      throw new BadRequestException('Tenant configuration not found');
    }

    return this._tenantConfig;
  }

  /**
   * Get tenant database name for Neo4j operations
   */
  async getTenantDatabase(): Promise<string> {
    const config = await this.getTenantConfig();
    return config.databaseName;
  }

  /**
   * Check if tenant has specific feature enabled
   */
  async hasFeature(feature: string): Promise<boolean> {
    const config = await this.getTenantConfig();
    return config.config?.features?.includes(feature) || false;
  }

  /**
   * Check if tenant is within subscription limits
   */
  async checkLimit(
    limitType: keyof NonNullable<TenantConfig['subscription']>['limits'],
    currentValue: number
  ): Promise<boolean> {
    const config = await this.getTenantConfig();
    const limit = config.subscription?.limits[limitType];

    if (limit === undefined) return true; // No limit set
    return currentValue <= limit;
  }

  /**
   * Validate tenant access for current request
   */
  async validateAccess(): Promise<void> {
    if (this._validated) return;

    const tenantId = await this.getTenantId();
    const config = await this.getTenantConfig();

    // Check tenant status
    if (config.status === 'suspended') {
      throw new ForbiddenException('Tenant account is suspended');
    }

    if (config.status === 'archived') {
      throw new ForbiddenException('Tenant account is archived');
    }

    // Check subscription expiry
    if (
      config.subscription?.expiresAt &&
      config.subscription.expiresAt < new Date()
    ) {
      throw new ForbiddenException('Tenant subscription has expired');
    }

    // Check IP restrictions
    if (config.security?.allowedIPs) {
      const clientIP = this.getClientIP();
      if (!config.security.allowedIPs.includes(clientIP)) {
        throw new ForbiddenException('Access denied from this IP address');
      }
    }

    // Custom validation from strategy
    if (this.strategy.validateAccess) {
      const isValid = await this.strategy.validateAccess(
        this.request,
        tenantId
      );
      if (!isValid) {
        throw new ForbiddenException('Tenant access validation failed');
      }
    }

    this._validated = true;
  }

  /**
   * Get tenant-specific metadata for logging/analytics
   */
  async getTenantMetadata(): Promise<Record<string, any>> {
    const config = await this.getTenantConfig();

    return {
      tenantId: config.tenantId,
      tenantName: config.name,
      plan: config.subscription?.plan,
      region: config.security?.dataRegion,
      features: config.config?.features || [],
      status: config.status,
    };
  }

  /**
   * Resolve tenant from request using configured strategy
   */
  private async resolveTenant(): Promise<void> {
    // Extract tenant ID using strategy
    this._tenantId = this.strategy.extractTenantId(this.request);

    if (!this._tenantId) {
      return; // No tenant context - might be a public endpoint
    }

    // Get tenant configuration
    if (this.strategy.getTenantConfig) {
      this._tenantConfig = await this.strategy.getTenantConfig(this._tenantId);
    } else {
      this._tenantConfig = await this.configProvider.getTenantConfig(
        this._tenantId
      );
    }

    if (!this._tenantConfig) {
      throw new BadRequestException(`Tenant '${this._tenantId}' not found`);
    }
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(): string {
    const forwarded = this.request.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    return (
      this.request.connection.remoteAddress ||
      this.request.socket.remoteAddress ||
      '127.0.0.1'
    );
  }
}

/**
 * Tenant configuration provider interface
 */
export interface TenantConfigProvider {
  getTenantConfig(tenantId: string): Promise<TenantConfig | null>;
  getAllTenants(): Promise<TenantConfig[]>;
  createTenant(config: Omit<TenantConfig, 'metadata'>): Promise<TenantConfig>;
  updateTenant(
    tenantId: string,
    updates: Partial<TenantConfig>
  ): Promise<TenantConfig>;
  deleteTenant(tenantId: string): Promise<void>;
}

/**
 * In-memory tenant configuration provider (for development)
 */
@Injectable()
export class InMemoryTenantConfigProvider implements TenantConfigProvider {
  private tenants = new Map<string, TenantConfig>();

  constructor() {
    // Add default tenant for development
    this.tenants.set('default', {
      tenantId: 'default',
      name: 'Default Tenant',
      databaseName: 'neo4j',
      status: 'active',
      metadata: {
        createdAt: new Date(),
        createdBy: 'system',
      },
    });
  }

  async getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
    return this.tenants.get(tenantId) || null;
  }

  async getAllTenants(): Promise<TenantConfig[]> {
    return Array.from(this.tenants.values());
  }

  async createTenant(
    config: Omit<TenantConfig, 'metadata'>
  ): Promise<TenantConfig> {
    const tenantConfig: TenantConfig = {
      ...config,
      metadata: {
        createdAt: new Date(),
        createdBy: 'system',
      },
    };

    this.tenants.set(config.tenantId, tenantConfig);
    return tenantConfig;
  }

  async updateTenant(
    tenantId: string,
    updates: Partial<TenantConfig>
  ): Promise<TenantConfig> {
    const existing = this.tenants.get(tenantId);
    if (!existing) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const updated = { ...existing, ...updates };
    this.tenants.set(tenantId, updated);
    return updated;
  }

  async deleteTenant(tenantId: string): Promise<void> {
    this.tenants.delete(tenantId);
  }
}

/**
 * Database-based tenant configuration provider
 */
@Injectable()
export class DatabaseTenantConfigProvider implements TenantConfigProvider {
  constructor(
    @Inject('NEO4J_ADMIN_DRIVER') private readonly adminDriver: Driver
  ) {}

  async getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
    const session = this.adminDriver.session();

    try {
      const result = await session.run(
        'MATCH (t:Tenant {tenantId: $tenantId}) RETURN t',
        { tenantId }
      );

      if (result.records.length === 0) {
        return null;
      }

      return result.records[0].get('t').properties as TenantConfig;
    } finally {
      await session.close();
    }
  }

  async getAllTenants(): Promise<TenantConfig[]> {
    const session = this.adminDriver.session();

    try {
      const result = await session.run('MATCH (t:Tenant) RETURN t');
      return result.records.map(
        (record) => record.get('t').properties as TenantConfig
      );
    } finally {
      await session.close();
    }
  }

  async createTenant(
    config: Omit<TenantConfig, 'metadata'>
  ): Promise<TenantConfig> {
    const session = this.adminDriver.session();

    try {
      const tenantConfig: TenantConfig = {
        ...config,
        metadata: {
          createdAt: new Date(),
          createdBy: 'system',
        },
      };

      await session.run('CREATE (t:Tenant $config) RETURN t', {
        config: tenantConfig,
      });

      return tenantConfig;
    } finally {
      await session.close();
    }
  }

  async updateTenant(
    tenantId: string,
    updates: Partial<TenantConfig>
  ): Promise<TenantConfig> {
    const session = this.adminDriver.session();

    try {
      const result = await session.run(
        'MATCH (t:Tenant {tenantId: $tenantId}) SET t += $updates RETURN t',
        { tenantId, updates }
      );

      if (result.records.length === 0) {
        throw new Error(`Tenant ${tenantId} not found`);
      }

      return result.records[0].get('t').properties as TenantConfig;
    } finally {
      await session.close();
    }
  }

  async deleteTenant(tenantId: string): Promise<void> {
    const session = this.adminDriver.session();

    try {
      await session.run('MATCH (t:Tenant {tenantId: $tenantId}) DELETE t', {
        tenantId,
      });
    } finally {
      await session.close();
    }
  }
}
