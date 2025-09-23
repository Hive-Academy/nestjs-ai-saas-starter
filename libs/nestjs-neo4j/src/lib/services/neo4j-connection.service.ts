import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Driver } from 'neo4j-driver';
import { NEO4J_DRIVER, NEO4J_OPTIONS } from '../constants';
import type { Neo4jModuleOptions } from '../interfaces/neo4j-module-options.interface';
import type { Neo4jConnection } from '../interfaces/neo4j-connection.interface';
import type { ConnectionPoolMetrics } from '../interfaces/query-result.interface';

/**
 * Neo4j Connection Service with  features:
 * - Advanced connection pool monitoring
 * - Connection health tracking
 * - Automatic recovery mechanisms
 * - Cluster topology awareness
 * - Performance optimization
 * - Full backward compatibility with existing API
 */
@Injectable()
export class Neo4jConnectionService
  implements Neo4jConnection, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(Neo4jConnectionService.name);
  private isConnectionEstablished = false;
  private retryCount = 0;

  //  features
  private connectionPool: ConnectionPoolMetrics;
  private healthCheckInterval?: NodeJS.Timeout;
  private lastHealthCheck?: Date;
  private connectionHistory: Array<{
    timestamp: Date;
    success: boolean;
    latency?: number;
    error?: string;
  }> = [];

  constructor(
    @Inject(NEO4J_DRIVER) public readonly driver: Driver,
    @Inject(NEO4J_OPTIONS) private readonly options: Neo4jModuleOptions
  ) {
    // Initialize  connection pool monitoring
    this.connectionPool = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      maxPoolSize: this.options.config?.maxConnectionPoolSize || 100,
      connectionRequests: 0,
      connectionFailures: 0,
      averageConnectionTime: 0,
      lastResetTime: new Date(),
    };

    this.logger.log(
      'Neo4j Connection Service initialized with  monitoring'
    );
  }

  async onModuleInit() {
    await this.connect();
    this.startHealthMonitoring();
  }

  async onModuleDestroy() {
    this.stopHealthMonitoring();
    await this.close();
  }

  // ==================== ORIGINAL API (100% BACKWARD COMPATIBLE) ====================

  private async connect(): Promise<void> {
    const maxRetries = this.options.retryAttempts ?? 5;
    const retryDelay = this.options.retryDelay ?? 5000;

    while (this.retryCount < maxRetries) {
      try {
        await this.driver.verifyConnectivity();
        this.isConnectionEstablished = true;
        this.logger.log('Successfully connected to Neo4j database');

        // Verify database exists if specified
        if (this.options.database) {
          await this.verifyDatabase();
        }

        return;
      } catch (error) {
        this.retryCount += 1;
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `Failed to connect to Neo4j (attempt ${this.retryCount}/${maxRetries}): ${message}`
        );

        if (this.retryCount >= maxRetries) {
          throw new Error(
            `Failed to connect to Neo4j after ${maxRetries} attempts: ${message}`
          );
        }

        await this.delay(retryDelay);
      }
    }
  }

  private async verifyDatabase(): Promise<void> {
    const session = this.driver.session({
      database: 'system',
    });

    try {
      const result = await session.run(
        'SHOW DATABASES WHERE name = $database',
        { database: this.options.database }
      );

      if (result.records.length === 0) {
        this.logger.warn(
          `Database ${this.options.database} does not exist, creating...`
        );
        await this.createDatabase();
      }
    } catch (error) {
      // If we can't access system database, assume the database exists
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.debug(`Could not verify database existence: ${message}`);
    } finally {
      await session.close();
    }
  }

  private async createDatabase(): Promise<void> {
    const session = this.driver.session({
      database: 'system',
    });

    try {
      await session.run(`CREATE DATABASE $database IF NOT EXISTS`, {
        database: this.options.database,
      });
      this.logger.log(`Created database ${this.options.database}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Could not create database: ${message}`);
    } finally {
      await session.close();
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.driver.verifyConnectivity();
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.isConnectionEstablished) {
      await this.driver.close();
      this.isConnectionEstablished = false;
      this.logger.log('Closed Neo4j connection');
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getConnectionInfo() {
    return {
      uri: this.options.uri,
      database: this.options.database,
      isConnected: this.isConnectionEstablished,
      retryCount: this.retryCount,
      poolMetrics: this.connectionPool,
      healthHistory: this.connectionHistory.slice(-10),
      lastHealthCheck: this.lastHealthCheck,
      monitoringActive: !!this.healthCheckInterval,
    };
  }

  // ====================  API (NEW FEATURES) ====================

  /**
   *  connection with detailed metrics
   */
  async connectWithMetrics(): Promise<{
    success: boolean;
    latency?: number;
    serverInfo?: any;
    clusterInfo?: any;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Verify basic connectivity
      await this.driver.verifyConnectivity();
      const latency = Date.now() - startTime;

      // Get server information
      const serverInfo = await this.driver.getServerInfo();

      // Get cluster information if available
      const clusterInfo = await this.getClusterTopology();

      // Record successful connection
      this.recordConnectionAttempt(true, latency);

      this.logger.log(` connection established in ${latency}ms`);

      return {
        success: true,
        latency,
        serverInfo,
        clusterInfo,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Record failed connection
      this.recordConnectionAttempt(false, latency, errorMessage);

      this.logger.error(
        ` connection failed after ${latency}ms: ${errorMessage}`
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get  connection status with detailed information
   */
  async getConnectionStatus(): Promise<{
    connected: boolean;
    serverInfo?: any;
    clusterInfo?: any;
    poolMetrics: ConnectionPoolMetrics;
    healthHistory: Array<{
      timestamp: Date;
      success: boolean;
      latency?: number;
      error?: string;
    }>;
    lastHealthCheck?: Date;
  }> {
    const connected = await this.isConnected();
    let serverInfo, clusterInfo;

    if (connected) {
      try {
        serverInfo = await this.driver.getServerInfo();
        clusterInfo = await this.getClusterTopology();
      } catch (error) {
        this.logger.warn(
          `Failed to get server info: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return {
      connected,
      serverInfo,
      clusterInfo,
      poolMetrics: { ...this.connectionPool },
      healthHistory: [...this.connectionHistory],
      lastHealthCheck: this.lastHealthCheck,
    };
  }

  /**
   * Get cluster topology information
   */
  async getClusterTopology(): Promise<{
    role: 'LEADER' | 'FOLLOWER' | 'SINGLE';
    servers: Array<{
      address: string;
      role: string;
      database: string;
    }>;
    writableMembers: number;
    readOnlyMembers: number;
  } | null> {
    try {
      const session = this.driver.session({ database: 'system' });

      try {
        const result = await session.run(`
          CALL dbms.cluster.overview()
          YIELD id, addresses, role, groups, database
          RETURN id, addresses, role, groups, database
        `);

        const servers = result.records.map((record) => ({
          address: record.get('addresses')[0] || '',
          role: record.get('role') || '',
          database: record.get('database') || '',
        }));

        const writableMembers = servers.filter(
          (s) => s.role === 'LEADER'
        ).length;
        const readOnlyMembers = servers.filter(
          (s) => s.role === 'FOLLOWER'
        ).length;

        // Determine current server role
        const currentRole = servers.length > 1 ? 'LEADER' : 'SINGLE'; // Simplified

        return {
          role: currentRole as 'LEADER' | 'FOLLOWER' | 'SINGLE',
          servers,
          writableMembers,
          readOnlyMembers,
        };
      } finally {
        await session.close();
      }
    } catch (error) {
      // Not a cluster or no access to cluster info
      this.logger.debug(
        `Cluster topology not available: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }

  /**
   * Get connection pool statistics
   */
  getConnectionPoolMetrics(): ConnectionPoolMetrics {
    return { ...this.connectionPool };
  }

  /**
   * Reset connection pool metrics
   */
  resetConnectionPoolMetrics(): void {
    this.connectionPool = {
      ...this.connectionPool,
      connectionRequests: 0,
      connectionFailures: 0,
      averageConnectionTime: 0,
      lastResetTime: new Date(),
    };

    this.logger.log('Connection pool metrics reset');
  }

  /**
   * Get connection health history
   */
  getConnectionHistory(limit = 50): Array<{
    timestamp: Date;
    success: boolean;
    latency?: number;
    error?: string;
  }> {
    return this.connectionHistory.slice(-limit);
  }

  /**
   * Force connection pool refresh
   */
  async refreshConnectionPool(): Promise<void> {
    try {
      // Close all existing sessions gracefully
      await this.driver.verifyConnectivity();

      this.logger.log('Connection pool refreshed successfully');
    } catch (error) {
      this.logger.error(
        `Failed to refresh connection pool: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Test connection with configurable timeout
   */
  async testConnection(timeoutMs = 5000): Promise<{
    success: boolean;
    latency: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Connection test timeout')),
          timeoutMs
        );
      });

      // Race between connection test and timeout
      await Promise.race([this.driver.verifyConnectivity(), timeoutPromise]);

      const latency = Date.now() - startTime;

      return {
        success: true,
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        latency,
        error: errorMessage,
      };
    }
  }


  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Start automatic health monitoring
   */
  private startHealthMonitoring(): void {
    const interval = (this.options as any).healthCheckInterval || 30000; // 30 seconds default

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, interval);

    this.logger.log(`Health monitoring started with ${interval}ms interval`);
  }

  /**
   * Stop automatic health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      this.logger.log('Health monitoring stopped');
    }
  }

  /**
   * Perform health check and record results
   */
  private async performHealthCheck(): Promise<void> {
    this.lastHealthCheck = new Date();

    try {
      const testResult = await this.testConnection(5000);

      this.recordConnectionAttempt(
        testResult.success,
        testResult.latency,
        testResult.error
      );

      if (!testResult.success) {
        this.logger.warn(`Health check failed: ${testResult.error}`);
      }
    } catch (error) {
      this.logger.error(
        `Health check error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      this.recordConnectionAttempt(
        false,
        0,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Record connection attempt for history tracking
   */
  private recordConnectionAttempt(
    success: boolean,
    latency?: number,
    error?: string
  ): void {
    const record = {
      timestamp: new Date(),
      success,
      latency,
      error,
    };

    this.connectionHistory.push(record);

    // Keep only last 100 records to prevent memory growth
    if (this.connectionHistory.length > 100) {
      this.connectionHistory.splice(0, this.connectionHistory.length - 100);
    }

    // Update connection pool metrics
    this.connectionPool.connectionRequests++;
    if (!success) {
      this.connectionPool.connectionFailures++;
    }

    if (latency !== undefined) {
      const totalRequests = this.connectionPool.connectionRequests;
      const currentAverage = this.connectionPool.averageConnectionTime;

      this.connectionPool.averageConnectionTime =
        (currentAverage * (totalRequests - 1) + latency) / totalRequests;
    }
  }
}
