/**
 * NeogmaConnectionService - Connection lifecycle and health management
 *
 * Focused service for managing Neogma connections, health checks,
 * and configuration management.
 */

import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Neogma } from 'neogma';
import { NEO4J_OPTIONS } from '../constants/constants';
import type { Neo4jModuleOptions } from '../interfaces/neo4j-module-options.interface';
import { InjectNeogma } from '../neogma/neogma.decorators';
import { NeogmaMetricsService } from './neogma-metrics.service';

/**
 * Connection status information
 */
export interface ConnectionStatus {
  connected: boolean;
  latency?: number;
  serverInfo?: {
    version: string;
    edition: string;
    database: string;
  };
  error?: string;
  lastChecked: Date;
}

/**
 * Connection configuration information
 */
export interface ConnectionInfo {
  url: string;
  database: string;
  username: string;
  isConnected: boolean;
  connectionTime?: number;
  config: {
    maxConnectionPoolSize?: number;
    connectionTimeout?: number;
    maxTransactionRetryTime?: number;
  };
}

/**
 * Health check options
 */
export interface HealthCheckOptions {
  timeout?: number;
  retries?: number;
  includeServerInfo?: boolean;
}

/**
 * NeogmaConnectionService - Manage Neogma connections and health
 */
@Injectable()
export class NeogmaConnectionService implements OnModuleDestroy {
  private readonly logger = new Logger(NeogmaConnectionService.name);
  private connectionStartTime?: number;
  private lastHealthCheck?: ConnectionStatus;

  constructor(
    @InjectNeogma() private readonly neogma: Neogma,
    @Inject(NEO4J_OPTIONS) private readonly options: Neo4jModuleOptions,
    private readonly metricsService: NeogmaMetricsService
  ) {
    this.logger.log('NeogmaConnectionService initialized');
    this.connectionStartTime = Date.now();

    // Automatic health checks removed - consumers should call checkHealthNow() when needed
    // This prevents unnecessary database load and initialization race conditions
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('NeogmaConnectionService shutting down');
    await this.closeConnections();
  }

  // ==================== CONNECTION MANAGEMENT ====================

  /**
   * Verify connectivity to Neo4j through Neogma
   */
  async verifyConnectivity(
    options?: HealthCheckOptions
  ): Promise<ConnectionStatus> {
    const startTime = Date.now();
    const timeout = options?.timeout || 5000;
    const retries = options?.retries || 1;
    const includeServerInfo = options?.includeServerInfo ?? true;

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.logger.debug(
          `Connection verification attempt ${attempt}/${retries}`
        );

        // Use Promise.race for timeout handling
        const verificationPromise =
          this.performConnectivityCheck(includeServerInfo);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error('Connection verification timeout')),
            timeout
          );
        });

        const result = await Promise.race([
          verificationPromise,
          timeoutPromise,
        ]);
        const latency = Date.now() - startTime;

        const status: ConnectionStatus = {
          connected: true,
          latency,
          lastChecked: new Date(),
          ...result,
        };

        this.lastHealthCheck = status;
        this.metricsService.recordConnectionTime(latency);

        this.logger.debug(`Connection verified successfully in ${latency}ms`);
        return status;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `Connection verification attempt ${attempt} failed: ${lastError.message}`
        );

        if (attempt < retries) {
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    // All attempts failed
    this.metricsService.recordConnectionFailure();
    const status: ConnectionStatus = {
      connected: false,
      error: lastError?.message || 'Connection verification failed',
      lastChecked: new Date(),
    };

    this.lastHealthCheck = status;
    this.logger.error(
      `Connection verification failed after ${retries} attempts: ${status.error}`
    );
    return status;
  }

  /**
   * Get current connection information
   */
  getConnectionInfo(): ConnectionInfo {
    const connectionTime = this.connectionStartTime
      ? Date.now() - this.connectionStartTime
      : undefined;

    return {
      url: this.options.uri,
      database: this.options.database || 'neo4j',
      username: this.options.username,
      isConnected: this.lastHealthCheck?.connected ?? false,
      connectionTime,
      config: {
        maxConnectionPoolSize: this.options.config?.maxConnectionPoolSize,
        connectionTimeout: this.options.config?.connectionTimeout,
        maxTransactionRetryTime: this.options.config?.maxTransactionRetryTime,
      },
    };
  }

  /**
   * Get last health check result
   */
  getLastHealthCheck(): ConnectionStatus | null {
    return this.lastHealthCheck || null;
  }

  /**
   * Force a health check now
   */
  async checkHealthNow(
    options?: HealthCheckOptions
  ): Promise<ConnectionStatus> {
    this.logger.debug('Performing on-demand health check');
    return this.verifyConnectivity(options);
  }

  // ==================== CONNECTION LIFECYCLE ====================

  /**
   * Close all connections gracefully
   */
  async closeConnections(): Promise<void> {
    try {
      this.logger.log('Closing Neogma connections');

      // Neogma handles connection closure internally
      // We'll call close on the driver if available
      if (this.neogma && typeof (this.neogma as any).close === 'function') {
        await (this.neogma as any).close();
      }

      this.logger.log('Connections closed successfully');
    } catch (error) {
      this.logger.error(
        `Error closing connections: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }

  /**
   * Test basic connectivity with a simple query
   */
  async testBasicConnectivity(): Promise<boolean> {
    try {
      await this.neogma.queryRunner.run('RETURN 1 as test');
      return true;
    } catch (error) {
      this.logger.error(
        `Basic connectivity test failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      return false;
    }
  }

  // ==================== CONFIGURATION ====================

  /**
   * Get Neo4j configuration
   */
  getConfiguration(): Neo4jModuleOptions {
    // Return a safe copy without sensitive information
    return {
      uri: this.options.uri,
      username: this.options.username,
      password: '[REDACTED]',
      database: this.options.database,
      config: this.options.config,
      healthCheck: this.options.healthCheck,
      retryAttempts: this.options.retryAttempts,
      retryDelay: this.options.retryDelay,
    };
  }

  /**
   * Check if health checks are enabled
   */
  isHealthCheckEnabled(): boolean {
    return this.options.healthCheck !== false;
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Perform the actual connectivity check
   */
  private async performConnectivityCheck(includeServerInfo: boolean): Promise<{
    serverInfo?: ConnectionStatus['serverInfo'];
  }> {
    // Basic connectivity test
    await this.neogma.queryRunner.run('RETURN 1 as test');

    const result: { serverInfo?: ConnectionStatus['serverInfo'] } = {};

    if (includeServerInfo) {
      try {
        // Get server information
        const serverResult = await this.neogma.queryRunner.run(`
          CALL dbms.components() YIELD name, versions, edition
          RETURN name, versions[0] as version, edition
          LIMIT 1
        `);

        if (serverResult.records.length > 0) {
          const record = serverResult.records[0];
          result.serverInfo = {
            version: record.get('version'),
            edition: record.get('edition'),
            database: this.options.database || 'neo4j',
          };
        }
      } catch (error) {
        // Server info is optional, don't fail if we can't get it
        this.logger.debug(
          `Could not retrieve server info: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    return result;
  }

  /**
   * NOTE: Automatic periodic health checks have been removed.
   *
   * Rationale:
   * - Prevents unnecessary database load
   * - Avoids initialization race conditions
   * - Consumers have better control over monitoring
   * - Health checks should be triggered by actual usage, not timers
   *
   * For health monitoring, integrate with NestJS Terminus:
   * @example
   * ```typescript
   * @Injectable()
   * export class Neo4jHealthIndicator extends HealthIndicator {
   *   constructor(private neo4jConnection: NeogmaConnectionService) {
   *     super();
   *   }
   *
   *   async isHealthy(key: string) {
   *     const status = await this.neo4jConnection.checkHealthNow({
   *       timeout: 3000,
   *       retries: 1,
   *     });
   *     return this.getStatus(key, status.connected, status);
   *   }
   * }
   * ```
   */
}
