/**
 * @fileoverview Production Multi-Tenant Deployment Examples
 *
 * Comprehensive examples for deploying multi-tenant Neo4j applications
 * in production environments with scaling strategies, monitoring,
 * backup procedures, and disaster recovery.
 *
 * This file demonstrates:
 * - Scaling strategies and performance optimization
 * - Monitoring and observability per tenant
 * - Backup and disaster recovery per tenant
 * - Compliance and audit trail management
 * - Production deployment patterns
 */

import { Injectable, Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule, Cron, Interval } from '@nestjs/schedule';
import { HealthCheckModule, TerminusModule } from '@nestjs/terminus';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import {
  MultiTenantNeo4jModule,
  MultiTenantNeo4jService,
  TenantContextService,
  TenantConnectionManager
} from '../../../index';

// ============================================================================
// 1. PRODUCTION CONFIGURATION
// ============================================================================

/**
 * Production configuration interface
 */
interface ProductionConfig {
  // Environment
  environment: 'staging' | 'production';
  region: string;
  availabilityZone: string;

  // Neo4j Cluster Configuration
  neo4j: {
    clusterNodes: string[];
    readReplicas: string[];
    username: string;
    password: string;
    encrypted: boolean;
    trustStrategy: 'TRUST_ALL_CERTIFICATES' | 'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES';

    // Connection pooling
    maxConnectionPoolSize: number;
    connectionAcquisitionTimeout: number;
    maxConnectionLifetime: number;
    connectionTimeout: number;

    // Performance
    fetchSize: number;
    logging: boolean;
  };

  // Multi-tenancy settings
  multiTenant: {
    strategy: 'database-per-tenant' | 'schema-per-tenant';
    maxTenantsPerNode: number;
    tenantCacheSize: number;
    tenantConfigTTL: number;

    // Resource limits
    defaultLimits: {
      maxMemoryPerTenant: string; // e.g., '512MB'
      maxQueriesPerSecond: number;
      maxConnectionsPerTenant: number;
    };
  };

  // Monitoring
  monitoring: {
    metricsEnabled: boolean;
    tracingEnabled: boolean;
    loggingLevel: 'error' | 'warn' | 'info' | 'debug';
    alerting: {
      slackWebhook?: string;
      emailRecipients: string[];
      pagerDutyKey?: string;
    };
  };

  // Backup & Recovery
  backup: {
    enabled: boolean;
    schedule: string; // Cron expression
    retentionDays: number;
    storageType: 's3' | 'gcs' | 'azure' | 'local';
    storageConfig: Record<string, any>;
    encryption: boolean;
  };

  // Security
  security: {
    auditLogging: boolean;
    encryptionAtRest: boolean;
    encryptionInTransit: boolean;
    complianceMode: 'SOC2' | 'HIPAA' | 'GDPR' | 'PCI' | 'none';
    dataRetentionDays: number;
  };
}

/**
 * Production configuration service
 */
@Injectable()
export class ProductionConfigService {
  private config: ProductionConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadProductionConfig();
  }

  getConfig(): ProductionConfig {
    return this.config;
  }

  private loadProductionConfig(): ProductionConfig {
    return {
      environment: this.configService.get('NODE_ENV') as 'staging' | 'production',
      region: this.configService.get('AWS_REGION', 'us-east-1'),
      availabilityZone: this.configService.get('AWS_AZ', 'us-east-1a'),

      neo4j: {
        clusterNodes: this.configService.get('NEO4J_CLUSTER_NODES', 'localhost:7687').split(','),
        readReplicas: this.configService.get('NEO4J_READ_REPLICAS', '').split(',').filter(Boolean),
        username: this.configService.get('NEO4J_USERNAME', 'neo4j'),
        password: this.configService.get('NEO4J_PASSWORD'),
        encrypted: this.configService.get('NEO4J_ENCRYPTED', 'true') === 'true',
        trustStrategy: this.configService.get('NEO4J_TRUST_STRATEGY', 'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES') as any,

        maxConnectionPoolSize: parseInt(this.configService.get('NEO4J_MAX_POOL_SIZE', '200')),
        connectionAcquisitionTimeout: parseInt(this.configService.get('NEO4J_CONNECTION_TIMEOUT', '60000')),
        maxConnectionLifetime: parseInt(this.configService.get('NEO4J_MAX_LIFETIME', '3600000')),
        connectionTimeout: parseInt(this.configService.get('NEO4J_CONNECT_TIMEOUT', '30000')),

        fetchSize: parseInt(this.configService.get('NEO4J_FETCH_SIZE', '1000')),
        logging: this.configService.get('NEO4J_LOGGING', 'false') === 'true'
      },

      multiTenant: {
        strategy: this.configService.get('MULTI_TENANT_STRATEGY', 'database-per-tenant') as any,
        maxTenantsPerNode: parseInt(this.configService.get('MAX_TENANTS_PER_NODE', '100')),
        tenantCacheSize: parseInt(this.configService.get('TENANT_CACHE_SIZE', '1000')),
        tenantConfigTTL: parseInt(this.configService.get('TENANT_CONFIG_TTL', '300')),

        defaultLimits: {
          maxMemoryPerTenant: this.configService.get('MAX_MEMORY_PER_TENANT', '512MB'),
          maxQueriesPerSecond: parseInt(this.configService.get('MAX_QUERIES_PER_SECOND', '100')),
          maxConnectionsPerTenant: parseInt(this.configService.get('MAX_CONNECTIONS_PER_TENANT', '20'))
        }
      },

      monitoring: {
        metricsEnabled: this.configService.get('METRICS_ENABLED', 'true') === 'true',
        tracingEnabled: this.configService.get('TRACING_ENABLED', 'true') === 'true',
        loggingLevel: this.configService.get('LOG_LEVEL', 'info') as any,
        alerting: {
          slackWebhook: this.configService.get('SLACK_WEBHOOK'),
          emailRecipients: this.configService.get('ALERT_EMAILS', '').split(',').filter(Boolean),
          pagerDutyKey: this.configService.get('PAGERDUTY_KEY')
        }
      },

      backup: {
        enabled: this.configService.get('BACKUP_ENABLED', 'true') === 'true',
        schedule: this.configService.get('BACKUP_SCHEDULE', '0 2 * * *'), // 2 AM daily
        retentionDays: parseInt(this.configService.get('BACKUP_RETENTION_DAYS', '30')),
        storageType: this.configService.get('BACKUP_STORAGE_TYPE', 's3') as any,
        storageConfig: {
          bucket: this.configService.get('BACKUP_S3_BUCKET'),
          region: this.configService.get('BACKUP_S3_REGION', 'us-east-1'),
          accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
          secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY')
        },
        encryption: this.configService.get('BACKUP_ENCRYPTION', 'true') === 'true'
      },

      security: {
        auditLogging: this.configService.get('AUDIT_LOGGING', 'true') === 'true',
        encryptionAtRest: this.configService.get('ENCRYPTION_AT_REST', 'true') === 'true',
        encryptionInTransit: this.configService.get('ENCRYPTION_IN_TRANSIT', 'true') === 'true',
        complianceMode: this.configService.get('COMPLIANCE_MODE', 'SOC2') as any,
        dataRetentionDays: parseInt(this.configService.get('DATA_RETENTION_DAYS', '2555')) // 7 years
      }
    };
  }
}

// ============================================================================
// 2. PERFORMANCE MONITORING AND METRICS
// ============================================================================

/**
 * Multi-tenant performance monitoring service
 */
@Injectable()
export class MultiTenantMonitoringService implements OnModuleInit {
  private metricsCollectors = new Map<string, any>();

  constructor(
    private readonly configService: ProductionConfigService,
    private readonly connectionManager: TenantConnectionManager
  ) {}

  async onModuleInit() {
    if (this.configService.getConfig().monitoring.metricsEnabled) {
      this.initializeMetricsCollection();
    }
  }

  /**
   * Collect tenant-specific performance metrics
   */
  @Interval(30000) // Every 30 seconds
  async collectTenantMetrics(): Promise<void> {
    const connectionStats = this.connectionManager.getConnectionStats();

    for (const [tenantDatabase, stats] of Object.entries(connectionStats)) {
      try {
        await this.collectDatabaseMetrics(tenantDatabase, stats);
        await this.collectQueryMetrics(tenantDatabase);
        await this.collectResourceMetrics(tenantDatabase);
      } catch (error) {
        console.error(`Failed to collect metrics for tenant ${tenantDatabase}:`, error);
      }
    }
  }

  /**
   * Monitor tenant query performance
   */
  async trackQueryPerformance(
    tenantId: string,
    query: string,
    executionTime: number,
    recordCount: number
  ): Promise<void> {
    const config = this.configService.getConfig();

    // Track slow queries
    if (executionTime > 1000) { // Queries over 1 second
      console.warn(`Slow query detected for tenant ${tenantId}: ${executionTime}ms`);

      if (config.monitoring.alerting.slackWebhook) {
        await this.sendSlowQueryAlert(tenantId, query, executionTime);
      }
    }

    // Update metrics
    this.updateQueryMetrics(tenantId, executionTime, recordCount);
  }

  /**
   * Monitor tenant resource usage
   */
  async monitorResourceUsage(tenantId: string): Promise<{
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    connectionCount: number;
    withinLimits: boolean;
    alerts: string[];
  }> {
    const config = this.configService.getConfig();
    const alerts: string[] = [];

    // Get actual resource usage (simplified)
    const resourceUsage = {
      memoryUsage: Math.random() * 100, // Would get from actual monitoring
      cpuUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
      connectionCount: Math.floor(Math.random() * 50)
    };

    // Check against limits
    let withinLimits = true;

    if (resourceUsage.memoryUsage > 90) {
      alerts.push('Memory usage above 90%');
      withinLimits = false;
    }

    if (resourceUsage.cpuUsage > 80) {
      alerts.push('CPU usage above 80%');
      withinLimits = false;
    }

    if (resourceUsage.connectionCount > config.multiTenant.defaultLimits.maxConnectionsPerTenant) {
      alerts.push('Connection limit exceeded');
      withinLimits = false;
    }

    // Send alerts if necessary
    if (!withinLimits) {
      await this.sendResourceAlert(tenantId, resourceUsage, alerts);
    }

    return {
      ...resourceUsage,
      withinLimits,
      alerts
    };
  }

  /**
   * Generate tenant health report
   */
  async generateHealthReport(tenantId: string): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    performance: {
      avgQueryTime: number;
      slowQueries: number;
      errorRate: number;
    };
    resources: {
      memoryUsage: number;
      diskUsage: number;
      connectionCount: number;
    };
    recommendations: string[];
  }> {
    // This would involve complex health calculations
    return {
      overall: 'healthy',
      performance: {
        avgQueryTime: 25,
        slowQueries: 0,
        errorRate: 0.1
      },
      resources: {
        memoryUsage: 45,
        diskUsage: 60,
        connectionCount: 8
      },
      recommendations: [
        'Consider adding indexes for frequently queried properties',
        'Monitor connection usage during peak hours'
      ]
    };
  }

  private initializeMetricsCollection(): void {
    // Initialize Prometheus collectors or other metrics systems
  }

  private async collectDatabaseMetrics(tenantDatabase: string, stats: any): Promise<void> {
    // Collect database-specific metrics
  }

  private async collectQueryMetrics(tenantDatabase: string): Promise<void> {
    // Collect query performance metrics
  }

  private async collectResourceMetrics(tenantDatabase: string): Promise<void> {
    // Collect resource usage metrics
  }

  private updateQueryMetrics(tenantId: string, executionTime: number, recordCount: number): void {
    // Update query metrics collectors
  }

  private async sendSlowQueryAlert(tenantId: string, query: string, executionTime: number): Promise<void> {
    // Send alert via configured channels
  }

  private async sendResourceAlert(tenantId: string, usage: any, alerts: string[]): Promise<void> {
    // Send resource alert via configured channels
  }
}

// ============================================================================
// 3. BACKUP AND DISASTER RECOVERY
// ============================================================================

/**
 * Multi-tenant backup and recovery service
 */
@Injectable()
export class MultiTenantBackupService {
  constructor(
    private readonly configService: ProductionConfigService,
    private readonly multiTenantNeo4j: MultiTenantNeo4jService,
    private readonly connectionManager: TenantConnectionManager
  ) {}

  /**
   * Scheduled backup for all tenants
   */
  @Cron('0 2 * * *') // Daily at 2 AM
  async scheduledBackup(): Promise<void> {
    const config = this.configService.getConfig();

    if (!config.backup.enabled) {
      return;
    }

    console.log('Starting scheduled backup for all tenants');

    try {
      const connectionStats = this.connectionManager.getConnectionStats();
      const tenants = Object.keys(connectionStats);

      for (const tenantDatabase of tenants) {
        try {
          await this.backupTenant(tenantDatabase);
        } catch (error) {
          console.error(`Failed to backup tenant ${tenantDatabase}:`, error);
          await this.sendBackupFailureAlert(tenantDatabase, error);
        }
      }

      // Clean up old backups
      await this.cleanupOldBackups();

      console.log('Scheduled backup completed successfully');
    } catch (error) {
      console.error('Scheduled backup failed:', error);
      await this.sendBackupFailureAlert('all-tenants', error);
    }
  }

  /**
   * Backup specific tenant
   */
  async backupTenant(tenantDatabase: string): Promise<{
    backupId: string;
    path: string;
    size: number;
    duration: number;
    checksum: string;
  }> {
    const config = this.configService.getConfig();
    const startTime = Date.now();
    const backupId = `backup_${tenantDatabase}_${new Date().toISOString().replace(/[:.]/g, '-')}`;

    console.log(`Starting backup for tenant database: ${tenantDatabase}`);

    try {
      // Create backup using Neo4j admin tools
      const backupPath = await this.createDatabaseBackup(tenantDatabase, backupId);

      // Compress backup if needed
      const compressedPath = await this.compressBackup(backupPath);

      // Encrypt backup if enabled
      const encryptedPath = config.backup.encryption ?
        await this.encryptBackup(compressedPath) : compressedPath;

      // Upload to storage
      const storagePath = await this.uploadBackup(encryptedPath, tenantDatabase, backupId);

      // Calculate checksum
      const checksum = await this.calculateChecksum(encryptedPath);

      // Get file size
      const stats = await this.getFileStats(encryptedPath);

      const duration = Date.now() - startTime;

      // Record backup metadata
      await this.recordBackupMetadata({
        backupId,
        tenantDatabase,
        storagePath,
        size: stats.size,
        duration,
        checksum,
        timestamp: new Date(),
        encrypted: config.backup.encryption
      });

      // Clean up local files
      await this.cleanupLocalBackup(backupPath, compressedPath, encryptedPath);

      console.log(`Backup completed for ${tenantDatabase}: ${backupId} (${duration}ms)`);

      return {
        backupId,
        path: storagePath,
        size: stats.size,
        duration,
        checksum
      };
    } catch (error) {
      console.error(`Backup failed for ${tenantDatabase}:`, error);
      throw error;
    }
  }

  /**
   * Restore tenant from backup
   */
  async restoreTenant(
    tenantDatabase: string,
    backupId: string,
    options: {
      targetDatabase?: string;
      pointInTime?: Date;
      force?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    newDatabase: string;
    duration: number;
    recordsRestored: number;
  }> {
    const startTime = Date.now();
    const targetDatabase = options.targetDatabase || `${tenantDatabase}_restored_${Date.now()}`;

    console.log(`Starting restore for tenant ${tenantDatabase} from backup ${backupId}`);

    try {
      // Download backup from storage
      const localBackupPath = await this.downloadBackup(tenantDatabase, backupId);

      // Decrypt if necessary
      const decryptedPath = await this.decryptBackup(localBackupPath);

      // Decompress backup
      const extractedPath = await this.decompressBackup(decryptedPath);

      // Verify backup integrity
      await this.verifyBackupIntegrity(extractedPath, backupId);

      // Restore database
      const recordsRestored = await this.restoreDatabase(extractedPath, targetDatabase);

      // Clean up local files
      await this.cleanupLocalBackup(localBackupPath, decryptedPath, extractedPath);

      const duration = Date.now() - startTime;

      console.log(`Restore completed: ${targetDatabase} (${duration}ms, ${recordsRestored} records)`);

      return {
        success: true,
        newDatabase: targetDatabase,
        duration,
        recordsRestored
      };
    } catch (error) {
      console.error(`Restore failed for ${tenantDatabase}:`, error);
      throw error;
    }
  }

  /**
   * List available backups for tenant
   */
  async listTenantBackups(tenantDatabase: string): Promise<Array<{
    backupId: string;
    timestamp: Date;
    size: number;
    encrypted: boolean;
    checksum: string;
    status: 'completed' | 'failed' | 'in_progress';
  }>> {
    // This would query backup metadata storage
    return [];
  }

  /**
   * Test restore process (dry run)
   */
  async testRestore(tenantDatabase: string, backupId: string): Promise<{
    valid: boolean;
    issues: string[];
    estimatedRestoreTime: number;
  }> {
    try {
      // Download and validate backup without actually restoring
      const localBackupPath = await this.downloadBackup(tenantDatabase, backupId);
      const issues: string[] = [];

      // Verify integrity
      try {
        await this.verifyBackupIntegrity(localBackupPath, backupId);
      } catch (error) {
        issues.push(`Integrity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Estimate restore time based on backup size
      const stats = await this.getFileStats(localBackupPath);
      const estimatedRestoreTime = Math.floor(stats.size / 1024 / 1024) * 1000; // Rough estimate: 1MB/sec

      // Clean up
      await this.cleanupLocalBackup(localBackupPath);

      return {
        valid: issues.length === 0,
        issues,
        estimatedRestoreTime
      };
    } catch (error) {
      return {
        valid: false,
        issues: [error instanceof Error ? error.message : 'Unknown error'],
        estimatedRestoreTime: 0
      };
    }
  }

  private async createDatabaseBackup(tenantDatabase: string, backupId: string): Promise<string> {
    // Use Neo4j admin tools to create backup
    return `/tmp/backups/${backupId}`;
  }

  private async compressBackup(path: string): Promise<string> {
    // Compress backup using gzip or similar
    return `${path}.gz`;
  }

  private async encryptBackup(path: string): Promise<string> {
    // Encrypt backup using AES-256
    return `${path}.enc`;
  }

  private async uploadBackup(localPath: string, tenantDatabase: string, backupId: string): Promise<string> {
    const config = this.configService.getConfig();

    switch (config.backup.storageType) {
      case 's3':
        return await this.uploadToS3(localPath, tenantDatabase, backupId);
      case 'gcs':
        return await this.uploadToGCS(localPath, tenantDatabase, backupId);
      case 'azure':
        return await this.uploadToAzure(localPath, tenantDatabase, backupId);
      default:
        return await this.uploadToLocal(localPath, tenantDatabase, backupId);
    }
  }

  private async uploadToS3(localPath: string, tenantDatabase: string, backupId: string): Promise<string> {
    // Upload to AWS S3
    return `s3://bucket/backups/${tenantDatabase}/${backupId}`;
  }

  private async uploadToGCS(localPath: string, tenantDatabase: string, backupId: string): Promise<string> {
    // Upload to Google Cloud Storage
    return `gs://bucket/backups/${tenantDatabase}/${backupId}`;
  }

  private async uploadToAzure(localPath: string, tenantDatabase: string, backupId: string): Promise<string> {
    // Upload to Azure Blob Storage
    return `azure://container/backups/${tenantDatabase}/${backupId}`;
  }

  private async uploadToLocal(localPath: string, tenantDatabase: string, backupId: string): Promise<string> {
    // Store locally (not recommended for production)
    return `/backup/storage/${tenantDatabase}/${backupId}`;
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    // Calculate SHA-256 checksum
    return 'sha256checksum';
  }

  private async getFileStats(filePath: string): Promise<{ size: number }> {
    // Get file statistics
    return { size: 1024 * 1024 }; // 1MB example
  }

  private async recordBackupMetadata(metadata: any): Promise<void> {
    // Record backup metadata in database
  }

  private async cleanupLocalBackup(...paths: string[]): Promise<void> {
    // Clean up local backup files
  }

  private async cleanupOldBackups(): Promise<void> {
    const config = this.configService.getConfig();
    // Remove backups older than retention period
  }

  private async downloadBackup(tenantDatabase: string, backupId: string): Promise<string> {
    // Download backup from storage
    return `/tmp/restore/${backupId}`;
  }

  private async decryptBackup(path: string): Promise<string> {
    // Decrypt backup
    return path.replace('.enc', '');
  }

  private async decompressBackup(path: string): Promise<string> {
    // Decompress backup
    return path.replace('.gz', '');
  }

  private async verifyBackupIntegrity(path: string, backupId: string): Promise<void> {
    // Verify backup integrity using checksum
  }

  private async restoreDatabase(backupPath: string, targetDatabase: string): Promise<number> {
    // Restore database from backup
    return 1000; // Number of records restored
  }

  private async sendBackupFailureAlert(tenant: string, error: any): Promise<void> {
    // Send backup failure alert
  }
}

// ============================================================================
// 4. HEALTH CHECKS AND READINESS PROBES
// ============================================================================

/**
 * Multi-tenant health check service
 */
@Injectable()
export class MultiTenantHealthService {
  constructor(
    private readonly connectionManager: TenantConnectionManager,
    private readonly monitoringService: MultiTenantMonitoringService
  ) {}

  /**
   * Overall system health check
   */
  async checkSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, {
      status: 'pass' | 'fail' | 'warn';
      message: string;
      duration: number;
    }>;
    uptime: number;
  }> {
    const startTime = Date.now();
    const checks: Record<string, any> = {};

    // Check Neo4j cluster connectivity
    checks.neo4jCluster = await this.checkNeo4jCluster();

    // Check tenant connections
    checks.tenantConnections = await this.checkTenantConnections();

    // Check system resources
    checks.systemResources = await this.checkSystemResources();

    // Check backup system
    checks.backupSystem = await this.checkBackupSystem();

    // Check monitoring system
    checks.monitoring = await this.checkMonitoringSystem();

    // Determine overall status
    const hasFailures = Object.values(checks).some((check: any) => check.status === 'fail');
    const hasWarnings = Object.values(checks).some((check: any) => check.status === 'warn');

    const status = hasFailures ? 'unhealthy' : (hasWarnings ? 'degraded' : 'healthy');

    return {
      status,
      checks,
      uptime: process.uptime() * 1000 // Convert to milliseconds
    };
  }

  /**
   * Tenant-specific health check
   */
  async checkTenantHealth(tenantId: string): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    database: {
      connected: boolean;
      responseTime: number;
      recordCount: number;
    };
    resources: {
      memoryUsage: number;
      connectionCount: number;
      withinLimits: boolean;
    };
    lastActivity: Date;
  }> {
    const startTime = Date.now();

    try {
      // Check database connectivity
      const dbHealth = await this.checkTenantDatabase(tenantId);

      // Check resource usage
      const resourceHealth = await this.monitoringService.monitorResourceUsage(tenantId);

      // Get last activity
      const lastActivity = await this.getLastTenantActivity(tenantId);

      const status = dbHealth.connected && resourceHealth.withinLimits ? 'healthy' : 'unhealthy';

      return {
        status,
        database: dbHealth,
        resources: {
          memoryUsage: resourceHealth.memoryUsage,
          connectionCount: resourceHealth.connectionCount,
          withinLimits: resourceHealth.withinLimits
        },
        lastActivity
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        database: {
          connected: false,
          responseTime: Date.now() - startTime,
          recordCount: 0
        },
        resources: {
          memoryUsage: 0,
          connectionCount: 0,
          withinLimits: false
        },
        lastActivity: new Date(0)
      };
    }
  }

  /**
   * Readiness probe for Kubernetes
   */
  async readinessProbe(): Promise<{ ready: boolean; reason?: string }> {
    try {
      // Check if system can accept traffic
      const connectionStats = this.connectionManager.getConnectionStats();
      const activeConnections = Object.keys(connectionStats).length;

      if (activeConnections === 0) {
        return { ready: false, reason: 'No active tenant connections' };
      }

      // Check if any critical services are down
      const systemHealth = await this.checkSystemHealth();
      const criticalChecks = ['neo4jCluster', 'tenantConnections'];

      for (const check of criticalChecks) {
        if (systemHealth.checks[check]?.status === 'fail') {
          return { ready: false, reason: `Critical service ${check} is down` };
        }
      }

      return { ready: true };
    } catch (error) {
      return { ready: false, reason: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Liveness probe for Kubernetes
   */
  async livenessProbe(): Promise<{ alive: boolean; reason?: string }> {
    try {
      // Simple health check to ensure the service is responsive
      const startTime = Date.now();

      // Test basic functionality
      const connectionStats = this.connectionManager.getConnectionStats();

      const responseTime = Date.now() - startTime;

      if (responseTime > 5000) { // 5 seconds
        return { alive: false, reason: 'Service response time too slow' };
      }

      return { alive: true };
    } catch (error) {
      return { alive: false, reason: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async checkNeo4jCluster(): Promise<{
    status: 'pass' | 'fail' | 'warn';
    message: string;
    duration: number;
  }> {
    const startTime = Date.now();

    try {
      // Check cluster connectivity and status
      // This would use Neo4j driver to check cluster

      return {
        status: 'pass',
        message: 'Neo4j cluster is healthy',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'fail',
        message: error instanceof Error ? error.message : 'Neo4j cluster check failed',
        duration: Date.now() - startTime
      };
    }
  }

  private async checkTenantConnections(): Promise<{
    status: 'pass' | 'fail' | 'warn';
    message: string;
    duration: number;
  }> {
    const startTime = Date.now();

    try {
      const connectionStats = this.connectionManager.getConnectionStats();
      const activeConnections = Object.keys(connectionStats).length;

      if (activeConnections === 0) {
        return {
          status: 'warn',
          message: 'No active tenant connections',
          duration: Date.now() - startTime
        };
      }

      return {
        status: 'pass',
        message: `${activeConnections} tenant connections active`,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'fail',
        message: error instanceof Error ? error.message : 'Tenant connection check failed',
        duration: Date.now() - startTime
      };
    }
  }

  private async checkSystemResources(): Promise<{
    status: 'pass' | 'fail' | 'warn';
    message: string;
    duration: number;
  }> {
    const startTime = Date.now();

    try {
      // Check system resources (memory, CPU, disk)
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);

      const memoryUsagePercent = (heapUsedMB / heapTotalMB) * 100;

      if (memoryUsagePercent > 90) {
        return {
          status: 'fail',
          message: `High memory usage: ${memoryUsagePercent.toFixed(1)}%`,
          duration: Date.now() - startTime
        };
      }

      if (memoryUsagePercent > 80) {
        return {
          status: 'warn',
          message: `Memory usage: ${memoryUsagePercent.toFixed(1)}%`,
          duration: Date.now() - startTime
        };
      }

      return {
        status: 'pass',
        message: `Memory usage: ${memoryUsagePercent.toFixed(1)}%`,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'fail',
        message: error instanceof Error ? error.message : 'System resource check failed',
        duration: Date.now() - startTime
      };
    }
  }

  private async checkBackupSystem(): Promise<{
    status: 'pass' | 'fail' | 'warn';
    message: string;
    duration: number;
  }> {
    const startTime = Date.now();

    try {
      // Check backup system health
      // This would verify backup storage connectivity, recent backup status, etc.

      return {
        status: 'pass',
        message: 'Backup system operational',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'warn',
        message: error instanceof Error ? error.message : 'Backup system check failed',
        duration: Date.now() - startTime
      };
    }
  }

  private async checkMonitoringSystem(): Promise<{
    status: 'pass' | 'fail' | 'warn';
    message: string;
    duration: number;
  }> {
    const startTime = Date.now();

    try {
      // Check monitoring system health
      // This would verify metrics collection, alerting, etc.

      return {
        status: 'pass',
        message: 'Monitoring system operational',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'warn',
        message: error instanceof Error ? error.message : 'Monitoring system check failed',
        duration: Date.now() - startTime
      };
    }
  }

  private async checkTenantDatabase(tenantId: string): Promise<{
    connected: boolean;
    responseTime: number;
    recordCount: number;
  }> {
    // Check specific tenant database connectivity
    return {
      connected: true,
      responseTime: 25,
      recordCount: 1000
    };
  }

  private async getLastTenantActivity(tenantId: string): Promise<Date> {
    // Get timestamp of last tenant activity
    return new Date();
  }
}

// ============================================================================
// 5. PRODUCTION DEPLOYMENT MODULE
// ============================================================================

/**
 * Complete production deployment module
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.production', '.env']
    }),
    ScheduleModule.forRoot(),
    HealthCheckModule,
    TerminusModule,
    PrometheusModule.register(),
    MultiTenantNeo4jModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const prodConfig = new ProductionConfigService(configService);
        const config = prodConfig.getConfig();

        return {
          resolutionStrategy: {
            extractTenantId: (request) => {
              // Production tenant resolution
              return request.headers['x-tenant-id'] as string ||
                     request.user?.organizationId ||
                     null;
            },
            validateAccess: async (request, tenantId) => {
              // Production access validation
              return true; // Implement proper validation
            }
          },
          configProvider: 'database',
          isGlobal: true,
          enableAdminOperations: true,
          connectionPool: {
            maxPoolSize: config.neo4j.maxConnectionPoolSize,
            connectionTimeout: config.neo4j.connectionAcquisitionTimeout,
            maxLifetime: config.neo4j.maxConnectionLifetime
          }
        };
      }
    })
  ],
  providers: [
    ProductionConfigService,
    MultiTenantMonitoringService,
    MultiTenantBackupService,
    MultiTenantHealthService
  ],
  exports: [
    ProductionConfigService,
    MultiTenantMonitoringService,
    MultiTenantBackupService,
    MultiTenantHealthService
  ]
})
export class ProductionMultiTenantModule {}

// ============================================================================
// DEPLOYMENT CONFIGURATION EXAMPLES
// ============================================================================

/*
DOCKER COMPOSE EXAMPLE:

version: '3.8'
services:
  neo4j-cluster:
    image: neo4j:5.0-enterprise
    environment:
      - NEO4J_AUTH=neo4j/production-password
      - NEO4J_ACCEPT_LICENSE_AGREEMENT=yes
      - NEO4J_causal__clustering_expected__core__cluster__size=3
      - NEO4J_causal__clustering_initial__discovery__members=neo4j-1:5000,neo4j-2:5000,neo4j-3:5000
    ports:
      - "7687:7687"
      - "7474:7474"
    volumes:
      - neo4j-data:/data
      - neo4j-logs:/logs
      - ./backups:/backups

  app:
    image: your-app:latest
    environment:
      - NODE_ENV=production
      - NEO4J_CLUSTER_NODES=neo4j-1:7687,neo4j-2:7687,neo4j-3:7687
      - METRICS_ENABLED=true
      - BACKUP_ENABLED=true
      - BACKUP_SCHEDULE=0 2 * * *
    ports:
      - "3000:3000"
    depends_on:
      - neo4j-cluster

KUBERNETES DEPLOYMENT EXAMPLE:

apiVersion: apps/v1
kind: Deployment
metadata:
  name: multi-tenant-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: multi-tenant-app
  template:
    metadata:
      labels:
        app: multi-tenant-app
    spec:
      containers:
      - name: app
        image: your-app:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: NEO4J_CLUSTER_NODES
          valueFrom:
            secretKeyRef:
              name: neo4j-config
              key: cluster-nodes
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"

MONITORING CONFIGURATION:

# Prometheus configuration
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'multi-tenant-app'
    static_configs:
      - targets: ['app:3000']
    scrape_interval: 5s
    metrics_path: /metrics

# Grafana dashboard configuration
{
  "dashboard": {
    "title": "Multi-Tenant Neo4j Dashboard",
    "panels": [
      {
        "title": "Tenant Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "neo4j_tenant_connections_total"
          }
        ]
      },
      {
        "title": "Query Performance by Tenant",
        "type": "heatmap",
        "targets": [
          {
            "expr": "neo4j_query_duration_seconds_bucket"
          }
        ]
      }
    ]
  }
}

BACKUP CONFIGURATION:

# S3 backup configuration
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
BACKUP_S3_BUCKET=your-backup-bucket
BACKUP_S3_REGION=us-east-1
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
BACKUP_ENCRYPTION=true

# Automated restore testing
#!/bin/bash
# test-restore.sh
for tenant in $(get-tenant-list); do
  latest_backup=$(get-latest-backup $tenant)
  if [ -n "$latest_backup" ]; then
    test-restore $tenant $latest_backup
    if [ $? -eq 0 ]; then
      echo "✓ Restore test passed for $tenant"
    else
      echo "✗ Restore test failed for $tenant"
      send-alert "Restore test failed for $tenant"
    fi
  fi
done
*/
