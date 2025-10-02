import { MultiTenantConfigurations } from '@hive-academy/nestjs-neo4j';
import type { ConfigService } from '@nestjs/config';

/**
 * Multi-Tenant Neo4j Configuration
 *
 * Provides configuration for multi-tenant Neo4j setup with various
 * tenant identification strategies:
 * - Header-based: Uses x-tenant-id header
 * - Subdomain-based: Extracts tenant from subdomain
 * - JWT-based: Extracts tenant from JWT token
 */
export const getMultiTenantNeo4jConfig = (
  configService: ConfigService
): ReturnType<typeof MultiTenantConfigurations.headerBased> => {
  const strategy = configService.get('MULTI_TENANT_STRATEGY', 'header');

  switch (strategy) {
    case 'header':
      return MultiTenantConfigurations.headerBased('x-tenant-id');

    case 'subdomain':
      return MultiTenantConfigurations.subdomainBased();

    case 'jwt':
      return MultiTenantConfigurations.jwtBased('tenantId');

    default:
      return MultiTenantConfigurations.headerBased('x-tenant-id');
  }
};

/**
 * Multi-Tenant Database Configuration
 *
 * Defines how tenant databases are managed and isolated
 */
export const getMultiTenantDatabaseConfig = (configService: ConfigService) => {
  return {
    // Database isolation strategy
    isolation: configService.get('NEO4J_TENANT_ISOLATION', 'database') as
      | 'database'
      | 'schema'
      | 'prefix',

    // Default tenant for fallback
    defaultTenant: configService.get('NEO4J_DEFAULT_TENANT', 'default'),

    // Automatic database creation
    autoCreateDatabases:
      configService.get('NEO4J_AUTO_CREATE_TENANT_DB', 'true') === 'true',

    // Database naming strategy
    databaseNaming: {
      prefix: configService.get('NEO4J_TENANT_DB_PREFIX', 'tenant_'),
      suffix: configService.get('NEO4J_TENANT_DB_SUFFIX', ''),
      transform: configService.get('NEO4J_TENANT_DB_TRANSFORM', 'lowercase') as
        | 'lowercase'
        | 'uppercase'
        | 'none',
    },

    // Connection pooling per tenant
    connectionPooling: {
      maxPoolSizePerTenant: parseInt(
        configService.get('NEO4J_MAX_POOL_PER_TENANT', '20'),
        10
      ),
      minPoolSizePerTenant: parseInt(
        configService.get('NEO4J_MIN_POOL_PER_TENANT', '5'),
        10
      ),
      connectionTimeout: parseInt(
        configService.get('NEO4J_TENANT_CONNECTION_TIMEOUT', '30000'),
        10
      ),
    },

    // Tenant discovery and validation
    validation: {
      enableTenantValidation:
        configService.get('NEO4J_VALIDATE_TENANTS', 'true') === 'true',
      allowedTenants: configService
        .get('NEO4J_ALLOWED_TENANTS', '')
        .split(',')
        .filter(Boolean),
      denyListedTenants: configService
        .get('NEO4J_DENIED_TENANTS', '')
        .split(',')
        .filter(Boolean),
    },

    // Monitoring and metrics per tenant
    monitoring: {
      collectPerTenantMetrics:
        configService.get('NEO4J_TENANT_METRICS', 'true') === 'true',
      metricsRetentionDays: parseInt(
        configService.get('NEO4J_TENANT_METRICS_RETENTION', '30'),
        10
      ),
    },
  };
};
