/**
 * @fileoverview Multi-Tenant Module Setup Examples
 *
 * Comprehensive examples for setting up the MultiTenantNeo4jModule
 * with different strategies and configurations for enterprise environments.
 *
 * This file demonstrates:
 * - Module configuration patterns
 * - Database-per-tenant vs Schema-per-tenant strategies
 * - Connection pooling optimization
 * - Environment-specific configurations
 * - Production deployment patterns
 */

import { Module, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  MultiTenantNeo4jModule,
  MultiTenantConfigurations,
  MultiTenantModuleOptions,
  TenantResolutionStrategy,
  TenantConfigProvider,
  DefaultTenantStrategies,
  InMemoryTenantConfigProvider,
  DatabaseTenantConfigProvider,
  TenantConfig
} from '../../../index';

// ============================================================================
// 1. BASIC MULTI-TENANT MODULE CONFIGURATIONS
// ============================================================================

/**
 * Example 1: Simple Header-Based Multi-Tenancy
 * Best for: API-first applications, microservices
 */
@Module({
  imports: [
    MultiTenantNeo4jModule.forRoot(
      MultiTenantConfigurations.headerBased('x-tenant-id')
    )
  ]
})
export class BasicHeaderTenantModule {}

/**
 * Example 2: Subdomain-Based Multi-Tenancy
 * Best for: SaaS web applications with custom domains
 */
@Module({
  imports: [
    MultiTenantNeo4jModule.forRoot(
      MultiTenantConfigurations.subdomainBased()
    )
  ]
})
export class SubdomainTenantModule {}

/**
 * Example 3: JWT-Based Multi-Tenancy
 * Best for: Authenticated applications with user-tenant relationships
 */
@Module({
  imports: [
    MultiTenantNeo4jModule.forRoot(
      MultiTenantConfigurations.jwtBased('organizationId')
    )
  ]
})
export class JwtTenantModule {}

// ============================================================================
// 2. DATABASE-PER-TENANT STRATEGY (RECOMMENDED FOR ENTERPRISE)
// ============================================================================

/**
 * Database-per-tenant configuration with production settings
 * Provides complete isolation and optimal performance
 */
const databasePerTenantConfig: MultiTenantModuleOptions = {
  resolutionStrategy: DefaultTenantStrategies.header('x-tenant-id'),
  configProvider: 'database',
  isGlobal: true,
  enableAdminOperations: true,
  defaultTenant: 'system',
  connectionPool: {
    maxPoolSize: 50,        // Per tenant database
    connectionTimeout: 30000, // 30 seconds
    maxLifetime: 3600000    // 1 hour
  }
};

@Module({
  imports: [
    ConfigModule.forRoot(),
    MultiTenantNeo4jModule.forRoot(databasePerTenantConfig)
  ]
})
export class DatabasePerTenantModule {}

// ============================================================================
// 3. SCHEMA-PER-TENANT STRATEGY (ALTERNATIVE APPROACH)
// ============================================================================

/**
 * Custom tenant resolution strategy for schema-based isolation
 * Uses constraint-based tenant filtering within single database
 */
export class SchemPerTenantStrategy implements TenantResolutionStrategy {
  extractTenantId(request: any): string | null {
    // Extract from multiple sources with fallbacks
    let tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId && request.user?.organizationId) {
      tenantId = request.user.organizationId;
    }

    if (!tenantId) {
      const host = request.get('host');
      tenantId = host?.split('.')[0];
    }

    return tenantId;
  }

  async validateAccess(request: any, tenantId: string): Promise<boolean> {
    // Custom validation logic
    if (tenantId === 'admin' || tenantId === 'system') {
      return request.user?.role === 'super-admin';
    }

    // Validate tenant exists and is active
    return this.validateTenantStatus(tenantId);
  }

  private async validateTenantStatus(tenantId: string): Promise<boolean> {
    // In production, check tenant status from database/cache
    return true; // Simplified for example
  }
}

/**
 * Schema-per-tenant module with custom validation
 */
@Module({
  imports: [
    MultiTenantNeo4jModule.forRoot({
      resolutionStrategy: new SchemPerTenantStrategy(),
      configProvider: 'database',
      isGlobal: true,
      enableAdminOperations: true,
      connectionPool: {
        maxPoolSize: 100, // Single database, larger pool
        connectionTimeout: 60000,
        maxLifetime: 7200000 // 2 hours
      }
    })
  ]
})
export class SchemaPerTenantModule {}

// ============================================================================
// 4. ASYNC CONFIGURATION WITH ENVIRONMENT VARIABLES
// ============================================================================

/**
 * Async module configuration that adapts to environment
 * Supports development, staging, and production configurations
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env.local', '.env']
    }),
    MultiTenantNeo4jModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<MultiTenantModuleOptions> => {
        const environment = configService.get('NODE_ENV', 'development');
        const tenantHeader = configService.get('TENANT_HEADER', 'x-tenant-id');

        // Environment-specific configurations
        const baseConfig: MultiTenantModuleOptions = {
          resolutionStrategy: DefaultTenantStrategies.header(tenantHeader),
          isGlobal: true,
          defaultTenant: configService.get('DEFAULT_TENANT', 'default')
        };

        switch (environment) {
          case 'production':
            return {
              ...baseConfig,
              configProvider: 'database',
              enableAdminOperations: true,
              connectionPool: {
                maxPoolSize: configService.get('TENANT_MAX_POOL_SIZE', 50),
                connectionTimeout: configService.get('TENANT_CONNECTION_TIMEOUT', 30000),
                maxLifetime: configService.get('TENANT_MAX_LIFETIME', 3600000)
              }
            };

          case 'staging':
            return {
              ...baseConfig,
              configProvider: 'database',
              enableAdminOperations: true,
              connectionPool: {
                maxPoolSize: 25,
                connectionTimeout: 30000,
                maxLifetime: 1800000 // 30 minutes
              }
            };

          default: // development
            return {
              ...baseConfig,
              configProvider: 'memory',
              enableAdminOperations: true,
              connectionPool: {
                maxPoolSize: 10,
                connectionTimeout: 10000,
                maxLifetime: 900000 // 15 minutes
              }
            };
        }
      }
    })
  ]
})
export class EnvironmentAdaptiveModule {}

// ============================================================================
// 5. CUSTOM TENANT CONFIGURATION PROVIDERS
// ============================================================================

/**
 * Redis-based tenant configuration provider for high-performance caching
 */
@Injectable()
export class RedisTenantConfigProvider implements TenantConfigProvider {
  private readonly cache = new Map<string, TenantConfig>();

  constructor(
    // @Inject('REDIS_CLIENT') private readonly redis: any
  ) {}

  async getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
    // Check local cache first
    if (this.cache.has(tenantId)) {
      return this.cache.get(tenantId)!;
    }

    // In production: check Redis, then database
    // const cached = await this.redis.get(`tenant:${tenantId}`);
    // if (cached) return JSON.parse(cached);

    // Fallback to database lookup
    const config = await this.loadFromDatabase(tenantId);
    if (config) {
      this.cache.set(tenantId, config);
    }

    return config;
  }

  async getAllTenants(): Promise<TenantConfig[]> {
    // In production: scan Redis keys or query database
    return Array.from(this.cache.values());
  }

  async createTenant(config: Omit<TenantConfig, 'metadata'>): Promise<TenantConfig> {
    const tenantConfig: TenantConfig = {
      ...config,
      metadata: {
        createdAt: new Date(),
        createdBy: 'system'
      }
    };

    // Store in database and cache
    await this.storeInDatabase(tenantConfig);
    this.cache.set(config.tenantId, tenantConfig);

    return tenantConfig;
  }

  async updateTenant(tenantId: string, updates: Partial<TenantConfig>): Promise<TenantConfig> {
    const existing = await this.getTenantConfig(tenantId);
    if (!existing) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const updated = { ...existing, ...updates };
    await this.storeInDatabase(updated);
    this.cache.set(tenantId, updated);

    return updated;
  }

  async deleteTenant(tenantId: string): Promise<void> {
    await this.removeFromDatabase(tenantId);
    this.cache.delete(tenantId);
  }

  private async loadFromDatabase(tenantId: string): Promise<TenantConfig | null> {
    // Simplified - would use actual database connection
    return null;
  }

  private async storeInDatabase(config: TenantConfig): Promise<void> {
    // Store in database
  }

  private async removeFromDatabase(tenantId: string): Promise<void> {
    // Remove from database
  }
}

/**
 * Module with custom Redis-based tenant config provider
 */
@Module({
  imports: [
    MultiTenantNeo4jModule.forRootAsync({
      useFactory: () => ({
        resolutionStrategy: DefaultTenantStrategies.header('x-tenant-id'),
        configProvider: new RedisTenantConfigProvider(),
        isGlobal: true,
        enableAdminOperations: true
      })
    })
  ],
  providers: [RedisTenantConfigProvider]
})
export class RedisConfigProviderModule {}

// ============================================================================
// 6. MULTI-STRATEGY TENANT RESOLUTION
// ============================================================================

/**
 * Advanced tenant resolution with multiple fallback strategies
 * Provides maximum flexibility for complex enterprise scenarios
 */
export class MultiStrategyTenantResolver implements TenantResolutionStrategy {
  extractTenantId(request: any): string | null {
    // Strategy 1: Authorization header (JWT token)
    if (request.user?.organizationId) {
      return request.user.organizationId;
    }

    // Strategy 2: Custom tenant header
    const headerTenant = request.headers['x-tenant-id'] as string;
    if (headerTenant) {
      return headerTenant;
    }

    // Strategy 3: Subdomain extraction
    const host = request.get('host');
    if (host) {
      const subdomain = host.split('.')[0];
      if (subdomain && !['www', 'api', 'admin'].includes(subdomain)) {
        return subdomain;
      }
    }

    // Strategy 4: URL path parameter
    const pathTenant = request.params?.tenantId;
    if (pathTenant) {
      return pathTenant;
    }

    // Strategy 5: Query parameter fallback
    const queryTenant = request.query?.tenant as string;
    if (queryTenant) {
      return queryTenant;
    }

    return null; // No tenant resolution possible
  }

  async validateAccess(request: any, tenantId: string): Promise<boolean> {
    // Comprehensive access validation

    // Check blacklisted tenants
    if (this.isBlacklisted(tenantId)) {
      return false;
    }

    // Validate IP restrictions for tenant
    if (!await this.validateIPAccess(request, tenantId)) {
      return false;
    }

    // Check user permissions for tenant
    if (request.user && !await this.validateUserTenantAccess(request.user, tenantId)) {
      return false;
    }

    // Validate tenant subscription status
    return await this.validateTenantStatus(tenantId);
  }

  private isBlacklisted(tenantId: string): boolean {
    const blacklist = ['admin', 'system', 'api', 'www', 'root', 'test'];
    return blacklist.includes(tenantId.toLowerCase());
  }

  private async validateIPAccess(request: any, tenantId: string): Promise<boolean> {
    // In production: check tenant IP whitelist
    return true;
  }

  private async validateUserTenantAccess(user: any, tenantId: string): Promise<boolean> {
    // In production: verify user has access to tenant
    return true;
  }

  private async validateTenantStatus(tenantId: string): Promise<boolean> {
    // In production: check tenant is active and not suspended
    return true;
  }
}

@Module({
  imports: [
    MultiTenantNeo4jModule.forRoot({
      resolutionStrategy: new MultiStrategyTenantResolver(),
      configProvider: 'database',
      isGlobal: true,
      enableAdminOperations: true
    })
  ]
})
export class MultiStrategyModule {}

// ============================================================================
// 7. TENANT INITIALIZATION SERVICE
// ============================================================================

/**
 * Service to initialize and manage tenant databases
 */
@Injectable()
export class TenantInitializationService implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    // Would inject tenant config provider and connection manager
  ) {}

  async onModuleInit() {
    // Initialize default tenants in development
    if (this.configService.get('NODE_ENV') === 'development') {
      await this.initializeDefaultTenants();
    }
  }

  async initializeDefaultTenants(): Promise<void> {
    const defaultTenants: Array<Omit<TenantConfig, 'metadata'>> = [
      {
        tenantId: 'acme-corp',
        name: 'Acme Corporation',
        databaseName: 'tenant_acme_corp',
        status: 'active',
        subscription: {
          plan: 'enterprise',
          limits: {
            maxNodes: 1000000,
            maxRelationships: 5000000,
            maxQueries: 10000
          }
        },
        config: {
          features: ['advanced-analytics', 'real-time-processing', 'audit-logs']
        }
      },
      {
        tenantId: 'startup-inc',
        name: 'Startup Inc',
        databaseName: 'tenant_startup_inc',
        status: 'trial',
        subscription: {
          plan: 'starter',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          limits: {
            maxNodes: 10000,
            maxRelationships: 50000,
            maxQueries: 1000
          }
        },
        config: {
          features: ['basic-analytics']
        }
      }
    ];

    for (const tenantConfig of defaultTenants) {
      await this.createTenantIfNotExists(tenantConfig);
    }
  }

  private async createTenantIfNotExists(config: Omit<TenantConfig, 'metadata'>): Promise<void> {
    // In production: check if tenant exists and create if needed
    console.log(`Ensuring tenant ${config.tenantId} exists with database ${config.databaseName}`);
  }
}

/**
 * Complete module with initialization service
 */
@Module({
  imports: [
    ConfigModule.forRoot(),
    MultiTenantNeo4jModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        resolutionStrategy: new MultiStrategyTenantResolver(),
        configProvider: 'database',
        isGlobal: true,
        enableAdminOperations: true,
        defaultTenant: configService.get('DEFAULT_TENANT', 'default')
      })
    })
  ],
  providers: [TenantInitializationService]
})
export class CompleteTenantModule {}

// ============================================================================
// 8. PRODUCTION DEPLOYMENT CONFIGURATION
// ============================================================================

/**
 * Production-ready multi-tenant module configuration
 * Includes monitoring, health checks, and optimization
 */
const productionConfig: MultiTenantModuleOptions = {
  resolutionStrategy: new MultiStrategyTenantResolver(),
  configProvider: new RedisTenantConfigProvider(),
  isGlobal: true,
  enableAdminOperations: true,
  defaultTenant: 'system',
  connectionPool: {
    maxPoolSize: 100,      // High for production load
    connectionTimeout: 60000,  // 60 seconds for slow networks
    maxLifetime: 7200000   // 2 hours for stability
  }
};

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env.production', '.env']
    }),
    MultiTenantNeo4jModule.forRoot(productionConfig)
  ],
  providers: [
    TenantInitializationService,
    RedisTenantConfigProvider
  ]
})
export class ProductionMultiTenantModule {}

// ============================================================================
// USAGE EXAMPLES AND BEST PRACTICES
// ============================================================================

/*
DEPLOYMENT CHECKLIST:

1. Environment Variables:
   - NEO4J_URI: Main Neo4j cluster URI
   - TENANT_HEADER: Header name for tenant resolution
   - DEFAULT_TENANT: Fallback tenant ID
   - TENANT_MAX_POOL_SIZE: Connection pool size per tenant
   - REDIS_URL: Redis connection for config caching

2. Database Setup:
   - Create system database for tenant metadata
   - Set up proper indexes and constraints
   - Configure backup strategies per tenant database

3. Security Considerations:
   - Implement proper tenant validation
   - Set up IP whitelisting for sensitive tenants
   - Configure audit logging per tenant
   - Encrypt tenant-specific configuration

4. Monitoring:
   - Track connection pool utilization per tenant
   - Monitor query performance across tenants
   - Set up alerts for tenant limit violations
   - Implement health checks for tenant databases

5. Performance Optimization:
   - Use Redis for tenant config caching
   - Implement connection warming for high-traffic tenants
   - Set appropriate timeout values
   - Monitor and optimize query patterns per tenant

6. Disaster Recovery:
   - Regular backups per tenant database
   - Cross-region replication for critical tenants
   - Recovery procedures documented per tenant type
   - Test restore procedures regularly
*/
