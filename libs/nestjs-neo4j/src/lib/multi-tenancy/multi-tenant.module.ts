/**
 * @fileoverview Multi-Tenant Neo4j Module
 * 
 * This module provides multi-tenancy support for Neo4j operations following
 * NestJS best practices. It implements database-per-tenant isolation with
 * automatic tenant resolution and connection management.
 * 
 * Features:
 * - Multiple tenant resolution strategies
 * - Request-scoped tenant context
 * - Connection pooling per tenant
 * - Tenant configuration management
 * - Admin operations support
 */

import { Module, DynamicModule, Provider, Global } from '@nestjs/common';
import { TenantContextService, TenantResolutionStrategy, TenantConfigProvider, DefaultTenantStrategies, InMemoryTenantConfigProvider, DatabaseTenantConfigProvider } from './tenant-context.service';
import { MultiTenantNeo4jService, TenantConnectionManager } from './multi-tenant-neo4j.service';
import { MultiTenantDecorators } from './multi-tenant.decorators';

/**
 * Multi-tenant module configuration
 */
export interface MultiTenantModuleOptions {
  /** Tenant resolution strategy */
  resolutionStrategy: TenantResolutionStrategy;
  /** Tenant configuration provider */
  configProvider?: 'memory' | 'database' | TenantConfigProvider;
  /** Global module registration */
  isGlobal?: boolean;
  /** Enable admin operations */
  enableAdminOperations?: boolean;
  /** Default tenant for fallback */
  defaultTenant?: string;
  /** Connection pool settings per tenant */
  connectionPool?: {
    maxPoolSize?: number;
    connectionTimeout?: number;
    maxLifetime?: number;
  };
}

/**
 * Async configuration for multi-tenant module
 */
export interface MultiTenantModuleAsyncOptions {
  imports?: any[];
  useFactory?: (...args: any[]) => Promise<MultiTenantModuleOptions> | MultiTenantModuleOptions;
  inject?: any[];
  isGlobal?: boolean;
}

/**
 * Multi-tenant Neo4j module
 */
@Global()
@Module({})
export class MultiTenantNeo4jModule {
  /**
   * Configure multi-tenancy with static options
   */
  static forRoot(options: MultiTenantModuleOptions): DynamicModule {
    const providers = this.createProviders(options);
    
    return {
      module: MultiTenantNeo4jModule,
      providers,
      exports: [
        TenantContextService,
        MultiTenantNeo4jService,
        TenantConnectionManager,
        'TENANT_RESOLUTION_STRATEGY',
        'TENANT_CONFIG_PROVIDER'
      ],
      global: options.isGlobal !== false
    };
  }

  /**
   * Configure multi-tenancy with async options
   */
  static forRootAsync(options: MultiTenantModuleAsyncOptions): DynamicModule {
    const providers = [
      ...this.createAsyncProviders(options),
      TenantContextService,
      MultiTenantNeo4jService,
      TenantConnectionManager
    ];

    return {
      module: MultiTenantNeo4jModule,
      imports: options.imports || [],
      providers,
      exports: [
        TenantContextService,
        MultiTenantNeo4jService,
        TenantConnectionManager,
        'TENANT_RESOLUTION_STRATEGY',
        'TENANT_CONFIG_PROVIDER'
      ],
      global: options.isGlobal !== false
    };
  }

  /**
   * Feature module registration for specific features
   */
  static forFeature(): DynamicModule {
    return {
      module: MultiTenantNeo4jModule,
      providers: [MultiTenantDecorators],
      exports: [MultiTenantDecorators]
    };
  }

  /**
   * Create providers for static configuration
   */
  private static createProviders(options: MultiTenantModuleOptions): Provider[] {
    return [
      {
        provide: 'TENANT_RESOLUTION_STRATEGY',
        useValue: options.resolutionStrategy
      },
      {
        provide: 'TENANT_CONFIG_PROVIDER',
        useValue: this.createConfigProvider(options.configProvider)
      },
      {
        provide: 'MULTI_TENANT_OPTIONS',
        useValue: options
      },
      TenantContextService,
      MultiTenantNeo4jService,
      TenantConnectionManager
    ];
  }

  /**
   * Create async providers
   */
  private static createAsyncProviders(options: MultiTenantModuleAsyncOptions): Provider[] {
    return [
      {
        provide: 'MULTI_TENANT_OPTIONS',
        useFactory: options.useFactory!,
        inject: options.inject || []
      },
      {
        provide: 'TENANT_RESOLUTION_STRATEGY',
        useFactory: (config: MultiTenantModuleOptions) => config.resolutionStrategy,
        inject: ['MULTI_TENANT_OPTIONS']
      },
      {
        provide: 'TENANT_CONFIG_PROVIDER',
        useFactory: (config: MultiTenantModuleOptions) => this.createConfigProvider(config.configProvider),
        inject: ['MULTI_TENANT_OPTIONS']
      }
    ];
  }

  /**
   * Create tenant configuration provider
   */
  private static createConfigProvider(provider?: 'memory' | 'database' | TenantConfigProvider): TenantConfigProvider {
    if (!provider || provider === 'memory') {
      return new InMemoryTenantConfigProvider();
    }
    
    if (provider === 'database') {
      return new DatabaseTenantConfigProvider(null as any); // Will be injected
    }
    
    if (typeof provider === 'object') {
      return provider;
    }
    
    throw new Error('Invalid tenant config provider');
  }
}

/**
 * Convenience configurations for common use cases
 */
export class MultiTenantConfigurations {
  /**
   * Header-based tenant resolution (most common for APIs)
   */
  static headerBased(headerName: string = 'x-tenant-id'): MultiTenantModuleOptions {
    return {
      resolutionStrategy: DefaultTenantStrategies.header(headerName),
      configProvider: 'memory',
      isGlobal: true
    };
  }

  /**
   * Subdomain-based tenant resolution (good for web applications)
   */
  static subdomainBased(): MultiTenantModuleOptions {
    return {
      resolutionStrategy: DefaultTenantStrategies.subdomain(),
      configProvider: 'memory',
      isGlobal: true
    };
  }

  /**
   * JWT-based tenant resolution (from authenticated user)
   */
  static jwtBased(userProperty: string = 'tenantId'): MultiTenantModuleOptions {
    return {
      resolutionStrategy: DefaultTenantStrategies.jwt(userProperty),
      configProvider: 'memory',
      isGlobal: true
    };
  }

  /**
   * Path parameter-based tenant resolution
   */
  static pathBased(paramName: string = 'tenantId'): MultiTenantModuleOptions {
    return {
      resolutionStrategy: DefaultTenantStrategies.pathParam(paramName),
      configProvider: 'memory',
      isGlobal: true
    };
  }

  /**
   * Database-stored tenant configuration
   */
  static withDatabaseConfig(strategy: TenantResolutionStrategy): MultiTenantModuleOptions {
    return {
      resolutionStrategy: strategy,
      configProvider: 'database',
      isGlobal: true,
      enableAdminOperations: true
    };
  }

  /**
   * Production configuration with custom provider
   */
  static production(
    strategy: TenantResolutionStrategy,
    configProvider: TenantConfigProvider
  ): MultiTenantModuleOptions {
    return {
      resolutionStrategy: strategy,
      configProvider,
      isGlobal: true,
      enableAdminOperations: true,
      connectionPool: {
        maxPoolSize: 50,
        connectionTimeout: 30000,
        maxLifetime: 3600000
      }
    };
  }
}

/**
 * Example usage configurations
 */
export namespace MultiTenantExamples {
  /**
   * Example 1: Simple header-based multi-tenancy
   */
  export const headerBasedExample = {
    imports: [
      MultiTenantNeo4jModule.forRoot(
        MultiTenantConfigurations.headerBased('x-tenant-id')
      )
    ]
  };

  /**
   * Example 2: Subdomain-based with custom validation
   */
  export const subdomainExample = {
    imports: [
      MultiTenantNeo4jModule.forRoot({
        resolutionStrategy: {
          extractTenantId: (request) => {
            const host = request.get('host');
            return host?.split('.')[0] || null;
          },
          validateAccess: async (request, tenantId) => {
            // Custom validation logic
            return tenantId !== 'admin'; // Prevent admin subdomain access
          }
        },
        configProvider: 'memory',
        isGlobal: true
      })
    ]
  };

  /**
   * Example 3: Async configuration with environment
   */
  export const asyncExample = {
    imports: [
      MultiTenantNeo4jModule.forRootAsync({
        useFactory: async (configService: any) => ({
          resolutionStrategy: DefaultTenantStrategies.header(
            configService.get('TENANT_HEADER', 'x-tenant-id')
          ),
          configProvider: configService.get('NODE_ENV') === 'production' ? 'database' : 'memory',
          isGlobal: true,
          defaultTenant: configService.get('DEFAULT_TENANT', 'default')
        }),
        inject: ['ConfigService']
      })
    ]
  };

  /**
   * Example 4: Multiple strategies with fallback
   */
  export const multiStrategyExample = {
    imports: [
      MultiTenantNeo4jModule.forRoot({
        resolutionStrategy: {
          extractTenantId: (request) => {
            // Try header first
            let tenantId = request.headers['x-tenant-id'] as string;
            
            // Fallback to JWT
            if (!tenantId && (request as any).user) {
              tenantId = (request as any).user.tenantId;
            }
            
            // Fallback to subdomain
            if (!tenantId) {
              const host = request.get('host');
              tenantId = host?.split('.')[0] || 'default';
            }
            
            return tenantId;
          }
        },
        configProvider: 'database',
        isGlobal: true
      })
    ]
  };
}