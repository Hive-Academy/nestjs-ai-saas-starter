import type { Neo4jModuleOptions } from '@hive-academy/nestjs-neo4j';
import type { ConfigService } from '@nestjs/config';

/**
 * Neo4j Configuration Factory
 *
 * Provides centralized configuration for Neo4j connections and settings
 */
export const getNeo4jConfig = (...args: unknown[]): Neo4jModuleOptions => {
  const configService = args[0] as ConfigService;
  return {
    uri: configService.get('NEO4J_URI', 'bolt://localhost:7687'),
    username: configService.get('NEO4J_USERNAME', 'neo4j'),
    password: configService.get('NEO4J_PASSWORD', 'password'),
    database: configService.get('NEO4J_DATABASE', 'neo4j'),

    config: {
      maxConnectionPoolSize: parseInt(
        configService.get('NEO4J_MAX_POOL_SIZE', '100'),
        10
      ),
      connectionAcquisitionTimeout: parseInt(
        configService.get('NEO4J_CONNECTION_TIMEOUT', '60000'),
        10
      ),
      connectionTimeout: parseInt(
        configService.get('NEO4J_CONNECTION_TIMEOUT_MS', '30000'),
        10
      ),
      maxTransactionRetryTime: parseInt(
        configService.get('NEO4J_MAX_RETRY_TIME', '30000'),
        10
      ),
      encrypted: configService.get('NEO4J_ENCRYPTED', 'false') === 'true',
    },

    healthCheck: configService.get('NEO4J_HEALTH_CHECK', 'true') === 'true',

    retryAttempts: parseInt(configService.get('NEO4J_RETRY_ATTEMPTS', '5'), 10),

    retryDelay: parseInt(configService.get('NEO4J_RETRY_DELAY', '5000'), 10),
  };
};

/**
 * Environment variables reference for Neo4j Configuration
 *
 * Required Configuration:
 * - NEO4J_URI: Neo4j connection URI (default: 'bolt://localhost:7687')
 *   Examples:
 *   - Local: 'bolt://localhost:7687'
 *   - AuraDB: 'neo4j+s://your-instance.databases.neo4j.io'
 *   - Enterprise: 'neo4j://cluster:7687'
 * - NEO4J_USERNAME: Neo4j username (default: 'neo4j')
 * - NEO4J_PASSWORD: Neo4j password (default: 'password')
 *
 * Database Configuration:
 * - NEO4J_DATABASE: Target database name (default: 'neo4j')
 *   Note: Multi-database feature requires Neo4j 4.0+ Enterprise
 *
 * Connection Pool Configuration:
 * - NEO4J_MAX_POOL_SIZE: Maximum connection pool size (default: '100')
 * - NEO4J_CONNECTION_TIMEOUT: Connection acquisition timeout in ms (default: '60000')
 * - NEO4J_CONNECTION_TIMEOUT_MS: Socket connection timeout in ms (default: '30000')
 * - NEO4J_MAX_RETRY_TIME: Maximum transaction retry time in ms (default: '30000')
 *
 * Cluster Configuration (for Neo4j Enterprise):
 * - NEO4J_CLUSTER_ADDRESSES: Comma-separated cluster addresses
 *   Example: 'server1:7687,server2:7687,server3:7687'
 *
 * Security Configuration:
 * - NEO4J_ENCRYPTED: Enable encryption (default: 'false')
 *   Set to 'true' for AuraDB or production deployments
 * - NEO4J_TRUST_STRATEGY: Certificate trust strategy (default: 'TRUST_ALL_CERTIFICATES')
 *   Options: 'TRUST_ALL_CERTIFICATES' | 'TRUST_CUSTOM_CA_SIGNED_CERTIFICATES' | 'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES'
 *
 * Logging Configuration:
 * - NEO4J_LOG_LEVEL: Logging level (default: 'info')
 *   Options: 'error' | 'warn' | 'info' | 'debug'
 *
 * Health and Reliability:
 * - NEO4J_HEALTH_CHECK: Enable health checks (default: 'true')
 * - NEO4J_RETRY_ATTEMPTS: Maximum retry attempts (default: '5')
 * - NEO4J_RETRY_DELAY: Retry delay in ms (default: '5000')
 *
 * Transaction Configuration:
 * - NEO4J_TRANSACTION_TIMEOUT: Transaction timeout in ms (default: '30000')
 * - APP_NAME: Application name for metadata (default: 'NestJS-AI-SaaS-Starter')
 * - APP_VERSION: Application version for metadata (default: '1.0.0')
 *
 * Example .env configuration:
 *
 * # Local Development
 * NEO4J_URI=bolt://localhost:7687
 * NEO4J_USERNAME=neo4j
 * NEO4J_PASSWORD=your-password
 * NEO4J_DATABASE=neo4j
 *
 * # Neo4j AuraDB (Cloud)
 * NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
 * NEO4J_USERNAME=neo4j
 * NEO4J_PASSWORD=your-aura-password
 * NEO4J_ENCRYPTED=true
 * NEO4J_TRUST_STRATEGY=TRUST_SYSTEM_CA_SIGNED_CERTIFICATES
 *
 * # Production Enterprise Cluster
 * NEO4J_URI=neo4j://cluster.company.com:7687
 * NEO4J_CLUSTER_ADDRESSES=neo4j-1:7687,neo4j-2:7687,neo4j-3:7687
 * NEO4J_ENCRYPTED=true
 * NEO4J_MAX_POOL_SIZE=200
 */
