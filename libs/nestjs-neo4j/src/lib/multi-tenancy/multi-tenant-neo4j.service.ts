/**
 * @fileoverview Multi-Tenant Neo4j Service
 *
 * This service extends the base Neo4j service with multi-tenancy support.
 * It automatically routes database operations to the correct tenant database
 * and provides tenant-aware query execution.
 *
 * Features:
 * - Automatic tenant database selection
 * - Connection pooling per tenant
 * - Tenant-aware query execution
 * - Resource monitoring per tenant
 * - Security and access control
 */

import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { Driver, Session, Transaction, QueryResult } from 'neo4j-driver';
import { TenantContextService } from './tenant-context.service';
import { NeogmaService } from '../core/neogma.service';
import { Neo4jRecordShape } from '../types/neo4j-types';

/**
 * Multi-tenant query options
 */
export interface MultiTenantQueryOptions {
  /** Override tenant database (admin operations only) */
  tenantDatabase?: string;
  /** Include tenant metadata in result */
  includeTenantMetadata?: boolean;
  /** Validate tenant limits before execution */
  validateLimits?: boolean;
  /** Track query for tenant analytics */
  trackAnalytics?: boolean;
  /** Standard Neo4j query options */
  accessMode?: 'READ' | 'WRITE';
  timeout?: number;
  database?: string; // Will be overridden by tenant database
}

/**
 * Tenant-aware query result
 */
export interface MultiTenantQueryResult<
  T extends Neo4jRecordShape = Neo4jRecordShape
> extends QueryResult {
  /** Tenant metadata */
  tenantMetadata?: {
    tenantId: string;
    databaseName: string;
    executionTime: number;
    resourceUsage?: {
      memoryUsed: number;
      nodesAccessed: number;
      relationshipsAccessed: number;
    };
  };
}

/**
 * Tenant connection manager for connection pooling
 */
@Injectable()
export class TenantConnectionManager implements OnModuleDestroy {
  private connectionPools = new Map<string, Driver>();
  private connectionConfigs = new Map<string, any>();

  constructor(
    @Inject('NEO4J_DRIVER_CONFIG') private readonly baseConfig: any
  ) {}

  /**
   * Get or create driver for tenant
   */
  async getDriverForTenant(tenantDatabase: string): Promise<Driver> {
    if (!this.connectionPools.has(tenantDatabase)) {
      await this.createTenantConnection(tenantDatabase);
    }

    return this.connectionPools.get(tenantDatabase)!;
  }

  /**
   * Create new connection for tenant
   */
  private async createTenantConnection(tenantDatabase: string): Promise<void> {
    const neo4j = await import('neo4j-driver');

    // Tenant-specific configuration
    const tenantConfig = {
      ...this.baseConfig,
      // Add tenant-specific connection pool settings
      maxConnectionPoolSize: Math.max(
        10,
        Math.floor(this.baseConfig.maxConnectionPoolSize / 4)
      ),
      connectionAcquisitionTimeout:
        this.baseConfig.connectionAcquisitionTimeout || 60000,
      maxConnectionLifetime: this.baseConfig.maxConnectionLifetime || 3600000,
    };

    const driver = neo4j.driver(
      this.baseConfig.uri,
      neo4j.auth.basic(this.baseConfig.username, this.baseConfig.password),
      tenantConfig
    );

    // Verify connection
    await driver.verifyConnectivity();

    // Ensure tenant database exists
    await this.ensureTenantDatabase(driver, tenantDatabase);

    this.connectionPools.set(tenantDatabase, driver);
    this.connectionConfigs.set(tenantDatabase, tenantConfig);

    console.log(
      `Created connection pool for tenant database: ${tenantDatabase}`
    );
  }

  /**
   * Ensure tenant database exists in Neo4j
   */
  private async ensureTenantDatabase(
    driver: Driver,
    databaseName: string
  ): Promise<void> {
    if (databaseName === 'neo4j' || databaseName === 'system') {
      return; // Default databases, no need to create
    }

    const session = driver.session({ database: 'system' });

    try {
      // Check if database exists
      const result = await session.run('SHOW DATABASES');
      const databases = result.records.map((record) => record.get('name'));

      if (!databases.includes(databaseName)) {
        // Create tenant database
        await session.run(`CREATE DATABASE \`${databaseName}\``);
        console.log(`Created tenant database: ${databaseName}`);

        // Wait for database to be available
        await this.waitForDatabaseAvailable(driver, databaseName);
      }
    } catch (error) {
      console.error(`Failed to ensure tenant database ${databaseName}:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Wait for database to become available
   */
  private async waitForDatabaseAvailable(
    driver: Driver,
    databaseName: string,
    maxAttempts = 30
  ): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const session = driver.session({ database: databaseName });
        await session.run('RETURN 1');
        await session.close();
        return;
      } catch (error) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    throw new Error(`Tenant database ${databaseName} did not become available`);
  }

  /**
   * Get connection statistics for monitoring
   */
  getConnectionStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [tenantDatabase] of this.connectionPools) {
      stats[tenantDatabase] = {
        isConnected: true, // Driver doesn't have isConnected property
        // Additional stats would come from driver metrics if available
      };
    }

    return stats;
  }

  /**
   * Cleanup connections on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    const closePromises = Array.from(this.connectionPools.values()).map(
      (driver) => driver.close()
    );
    await Promise.all(closePromises);
    this.connectionPools.clear();
    this.connectionConfigs.clear();
  }
}

/**
 * Multi-tenant Neo4j service
 */
@Injectable()
export class MultiTenantNeo4jService {
  constructor(
    private readonly connectionManager: TenantConnectionManager,
    private readonly tenantContext: TenantContextService,
    @Inject('BASE_NEO4J_SERVICE')
    private readonly baseNeo4jService: NeogmaService
  ) {}

  /**
   * Execute query with automatic tenant routing
   */
  async run<T extends Neo4jRecordShape = Neo4jRecordShape>(
    cypher: string,
    params?: Record<string, unknown>,
    options?: MultiTenantQueryOptions
  ): Promise<MultiTenantQueryResult<T>> {
    const startTime = Date.now();

    // Validate tenant access
    await this.tenantContext.validateAccess();

    // Get tenant database
    const tenantDatabase =
      options?.tenantDatabase || (await this.tenantContext.getTenantDatabase());
    const tenantId = await this.tenantContext.getTenantId();

    // Validate limits if requested
    if (options?.validateLimits) {
      await this.validateTenantLimits(cypher, params);
    }

    // Get tenant-specific driver
    const driver = await this.connectionManager.getDriverForTenant(
      tenantDatabase
    );

    // Execute query
    const session = driver.session({
      database: tenantDatabase,
      defaultAccessMode: options?.accessMode || 'READ',
    });

    try {
      const result = await session.run(cypher, params);
      const executionTime = Date.now() - startTime;

      // Track analytics if requested
      if (options?.trackAnalytics) {
        await this.trackQueryAnalytics(tenantId, cypher, executionTime, result);
      }

      // Build tenant-aware result
      const multiTenantResult: MultiTenantQueryResult<T> = {
        records: result.records as any,
        summary: result.summary,
        tenantMetadata: options?.includeTenantMetadata
          ? {
              tenantId,
              databaseName: tenantDatabase,
              executionTime,
              resourceUsage: await this.calculateResourceUsage(result),
            }
          : undefined,
      };

      return multiTenantResult;
    } finally {
      await session.close();
    }
  }

  /**
   * Execute write operation with automatic tenant routing
   */
  async write<T>(
    operation: (session: Session) => Promise<T>,
    options?: Omit<MultiTenantQueryOptions, 'accessMode'>
  ): Promise<T> {
    await this.tenantContext.validateAccess();

    const tenantDatabase =
      options?.tenantDatabase || (await this.tenantContext.getTenantDatabase());
    const driver = await this.connectionManager.getDriverForTenant(
      tenantDatabase
    );

    const session = driver.session({
      database: tenantDatabase,
      defaultAccessMode: 'WRITE',
    });

    try {
      return await operation(session);
    } finally {
      await session.close();
    }
  }

  /**
   * Execute read operation with automatic tenant routing
   */
  async read<T>(
    operation: (session: Session) => Promise<T>,
    options?: Omit<MultiTenantQueryOptions, 'accessMode'>
  ): Promise<T> {
    await this.tenantContext.validateAccess();

    const tenantDatabase =
      options?.tenantDatabase || (await this.tenantContext.getTenantDatabase());
    const driver = await this.connectionManager.getDriverForTenant(
      tenantDatabase
    );

    const session = driver.session({
      database: tenantDatabase,
      defaultAccessMode: 'READ',
    });

    try {
      return await operation(session);
    } finally {
      await session.close();
    }
  }

  /**
   * Execute transaction with automatic tenant routing
   */
  async runInTransaction<T>(
    work: (transaction: Transaction) => Promise<T>,
    options?: MultiTenantQueryOptions
  ): Promise<T> {
    await this.tenantContext.validateAccess();

    const tenantDatabase =
      options?.tenantDatabase || (await this.tenantContext.getTenantDatabase());
    const driver = await this.connectionManager.getDriverForTenant(
      tenantDatabase
    );

    const session = driver.session({
      database: tenantDatabase,
      defaultAccessMode: options?.accessMode || 'WRITE',
    });

    try {
      return await session.executeWrite((tx) => work(tx as any));
    } finally {
      await session.close();
    }
  }

  /**
   * Get tenant-specific session
   */
  async getSession(options?: MultiTenantQueryOptions): Promise<Session> {
    await this.tenantContext.validateAccess();

    const tenantDatabase =
      options?.tenantDatabase || (await this.tenantContext.getTenantDatabase());
    const driver = await this.connectionManager.getDriverForTenant(
      tenantDatabase
    );

    return driver.session({
      database: tenantDatabase,
      defaultAccessMode: options?.accessMode || 'READ',
    });
  }

  /**
   * Get tenant database statistics
   */
  async getTenantStats(): Promise<{
    nodeCount: number;
    relationshipCount: number;
    labels: string[];
    relationshipTypes: string[];
    databaseSize: number;
  }> {
    const result = await this.read(async (session) => {
      const [nodeCountResult, relCountResult, labelsResult, typesResult] =
        await Promise.all([
          session.run('MATCH (n) RETURN count(n) as count'),
          session.run('MATCH ()-[r]-() RETURN count(r) as count'),
          session.run('CALL db.labels()'),
          session.run('CALL db.relationshipTypes()'),
        ]);

      return {
        nodeCount: nodeCountResult.records[0]?.get('count').toNumber() || 0,
        relationshipCount:
          relCountResult.records[0]?.get('count').toNumber() || 0,
        labels: labelsResult.records.map((r) => r.get('label')),
        relationshipTypes: typesResult.records.map((r) =>
          r.get('relationshipType')
        ),
        databaseSize: 0, // Would need system query to get actual size
      };
    });

    return result;
  }

  /**
   * Execute admin operation (requires admin privileges)
   */
  async adminOperation<T>(
    operation: (service: NeogmaService) => Promise<T>
  ): Promise<T> {
    // Admin operations use the base service without tenant context
    return operation(this.baseNeo4jService);
  }

  /**
   * Validate tenant subscription limits
   */
  private async validateTenantLimits(
    cypher: string,
    params?: Record<string, unknown>
  ): Promise<void> {
    const tenantConfig = await this.tenantContext.getTenantConfig();

    if (!tenantConfig.subscription?.limits) {
      return; // No limits configured
    }

    const stats = await this.getTenantStats();
    const limits = tenantConfig.subscription.limits;

    // Check node limit
    if (limits.maxNodes && stats.nodeCount >= limits.maxNodes) {
      // Only allow if it's not a CREATE operation
      if (cypher.toLowerCase().includes('create')) {
        throw new Error('Tenant node limit exceeded');
      }
    }

    // Check relationship limit
    if (
      limits.maxRelationships &&
      stats.relationshipCount >= limits.maxRelationships
    ) {
      if (
        cypher.toLowerCase().includes('create') &&
        cypher.toLowerCase().includes('relationship')
      ) {
        throw new Error('Tenant relationship limit exceeded');
      }
    }
  }

  /**
   * Track query analytics for tenant
   */
  private async trackQueryAnalytics(
    tenantId: string,
    query: string,
    executionTime: number,
    result: QueryResult
  ): Promise<void> {
    // In a real implementation, this would store analytics data
    console.log(
      `Analytics: Tenant ${tenantId} executed query in ${executionTime}ms, returned ${result.records.length} records`
    );
  }

  /**
   * Calculate resource usage from query result
   */
  private async calculateResourceUsage(result: QueryResult): Promise<{
    memoryUsed: number;
    nodesAccessed: number;
    relationshipsAccessed: number;
  }> {
    // Simplified calculation - in real implementation would use query profile
    return {
      memoryUsed: result.records.length * 100, // Rough estimate
      nodesAccessed: result.records.length,
      relationshipsAccessed: 0,
    };
  }
}
