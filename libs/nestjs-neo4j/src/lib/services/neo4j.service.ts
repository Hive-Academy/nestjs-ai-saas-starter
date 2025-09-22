import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  Driver,
  Session,
  Transaction,
  ManagedTransaction,
  session as neo4jSession,
} from 'neo4j-driver';
import { NEO4J_DRIVER, NEO4J_OPTIONS } from '../constants';
import type { Neo4jModuleOptions } from '../interfaces/neo4j-module-options.interface';
import type {
  QueryResult,
  BulkOperation,
  BulkResult,
} from '../interfaces/query-result.interface';
import type { SessionOptions } from '../interfaces/neo4j-connection.interface';
import type {
  EnhancedQueryOptions,
  EnhancedQueryResult,
} from '../interfaces/query-result.interface';
import { Neo4jQueryService } from './neo4j-query.service';
import { Neo4jMetricsService } from './neo4j-metrics.service';

/**
 * Neo4j Service with enhanced features
 * Main service that coordinates with child services for specific functionality
 *
 * Features:
 * - Full backward compatibility with existing API
 * - Enhanced query execution with retry and metrics
 * - Connection pooling optimization
 * - Performance monitoring
 * - Type safety with strict mode compliance
 */
@Injectable()
export class Neo4jService {
  private readonly logger = new Logger(Neo4jService.name);

  constructor(
    @Inject(NEO4J_DRIVER) private readonly driver: Driver,
    @Inject(NEO4J_OPTIONS) private readonly options: Neo4jModuleOptions,
    private readonly queryService: Neo4jQueryService,
    private readonly metricsService: Neo4jMetricsService
  ) {
    this.logger.log('Neo4j Service initialized with enhanced features');
  }

  // ==================== ORIGINAL API (100% BACKWARD COMPATIBLE) ====================

  /**
   * Execute a read operation with session callback
   */
  async read<T>(
    operation: (session: Session) => Promise<T>,
    database?: string
  ): Promise<T> {
    const session = this.driver.session({
      database: database ?? this.options.database,
      defaultAccessMode: neo4jSession.READ,
    });

    try {
      return await operation(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Read operation failed: ${message}`, stack);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a read query (legacy method for backward compatibility)
   */
  async readQuery<T = Record<string, unknown>>(
    cypher: string,
    params?: Record<string, unknown>,
    database?: string
  ): Promise<T[]> {
    return this.read(async (session) => {
      const result = await session.run(cypher, params);
      return result.records.map((record) => record.toObject() as T);
    }, database);
  }

  /**
   * Execute a write operation with session callback
   */
  async write<T>(
    operation: (session: Session) => Promise<T>,
    database?: string
  ): Promise<T> {
    const session = this.driver.session({
      database: database ?? this.options.database,
      defaultAccessMode: neo4jSession.WRITE,
    });

    try {
      return await operation(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Write operation failed: ${message}`, stack);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a write query (legacy method for backward compatibility)
   */
  async writeQuery<T = Record<string, unknown>>(
    cypher: string,
    params?: Record<string, unknown>,
    database?: string
  ): Promise<T[]> {
    return this.write(async (session) => {
      const result = await session.run(cypher, params);
      return result.records.map((record) => record.toObject() as T);
    }, database);
  }

  /**
   * Execute any query with detailed result information
   */
  async run<T = Record<string, unknown>>(
    cypher: string,
    params?: Record<string, unknown>,
    options?: SessionOptions
  ): Promise<QueryResult<T>> {
    const sessionConfig = {
      database: options?.database ?? this.options.database,
      defaultAccessMode: options?.defaultAccessMode
        ? options.defaultAccessMode === 'READ'
          ? neo4jSession.READ
          : neo4jSession.WRITE
        : neo4jSession.WRITE,
      bookmarks: options?.bookmarks,
      fetchSize: options?.fetchSize,
    };

    const session = this.driver.session(sessionConfig);

    try {
      const result = await session.run(cypher, params);

      return {
        records: result.records.map((record) => record.toObject() as T),
        summary: {
          query: {
            text: result.summary.query.text,
            parameters: result.summary.query.parameters,
          },
          counters: result.summary.counters.updates(),
          updateStatistics: {
            containsUpdates: result.summary.counters.containsUpdates(),
            containsSystemUpdates:
              result.summary.counters.containsSystemUpdates?.() || false,
          },
          plan: result.summary.plan || undefined,
          profile: result.summary.profile || undefined,
          notifications: result.summary.notifications.map((n) => ({
            code: n.code,
            title: n.title,
            description: n.description,
            severity: n.severity as 'WARNING' | 'INFORMATION' | 'UNKNOWN',
            position:
              n.position &&
              'offset' in n.position &&
              typeof n.position.offset === 'number' &&
              typeof n.position.line === 'number' &&
              typeof n.position.column === 'number'
                ? {
                    offset: n.position.offset,
                    line: n.position.line,
                    column: n.position.column,
                  }
                : undefined,
          })),
          server: {
            address: result.summary.server.address ?? '',
            version: result.summary.server.agent ?? '',
          },
          resultConsumedAfter: result.summary.resultConsumedAfter.toNumber(),
          resultAvailableAfter: result.summary.resultAvailableAfter.toNumber(),
          database: result.summary.database
            ? {
                name: result.summary.database.name ?? '',
              }
            : undefined,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Query execution failed: ${message}`, stack);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Execute operations in a transaction
   */
  async runInTransaction<T>(
    work: (session: Session) => Promise<T>,
    database?: string
  ): Promise<T> {
    const session = this.driver.session({
      database: database ?? this.options.database,
      defaultAccessMode: neo4jSession.WRITE,
    });

    try {
      return await session.executeWrite(async (tx) => {
        // Create a session-like object with transaction methods
        const sessionProxy = this.createSessionProxy(session, tx);
        return await work(sessionProxy);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Transaction failed: ${message}`, stack);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Execute read operations in a transaction
   */
  async runInReadTransaction<T>(
    work: (tx: ManagedTransaction) => Promise<T>,
    database?: string
  ): Promise<T> {
    const session = this.driver.session({
      database: database ?? this.options.database,
      defaultAccessMode: neo4jSession.READ,
    });

    try {
      return await session.executeRead(work);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Read transaction failed: ${message}`, stack);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Execute bulk operations
   */
  async bulkOperation(
    operations: BulkOperation[],
    options?: { batchSize?: number; database?: string }
  ): Promise<BulkResult> {
    const batchSize = options?.batchSize || 1000;
    const database = options?.database ?? this.options.database;
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ operation: BulkOperation; error: string }> = [];

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);

      try {
        await this.write(async (session) => {
          for (const operation of batch) {
            try {
              await session.run(operation.cypher, operation.params);
              successCount++;
            } catch (error) {
              errorCount++;
              errors.push({
                operation,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }
        }, database);
      } catch (error) {
        // Session-level error
        for (const operation of batch) {
          errorCount++;
          errors.push({
            operation,
            error: error instanceof Error ? error.message : 'Session error',
          });
        }
      }
    }

    return {
      successCount,
      errorCount,
      errors,
      totalOperations: operations.length,
    };
  }

  /**
   * Verify database connectivity
   */
  async verifyConnectivity(): Promise<boolean> {
    try {
      await this.driver.verifyConnectivity();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Connectivity check failed: ${message}`);
      return false;
    }
  }

  /**
   * Get a new session instance
   */
  getSession(options?: SessionOptions): Session {
    return this.driver.session({
      database: options?.database ?? this.options.database,
      defaultAccessMode: options?.defaultAccessMode
        ? options.defaultAccessMode === 'READ'
          ? neo4jSession.READ
          : neo4jSession.WRITE
        : undefined,
      bookmarks: options?.bookmarks,
      fetchSize: options?.fetchSize,
    });
  }

  /**
   * Get the driver instance
   */
  getDriver(): Driver {
    return this.driver;
  }

  // ==================== ENHANCED API (NEW FEATURES) ====================

  /**
   * Execute a query with enhanced options and monitoring
   * Delegates to QueryService for implementation
   */
  async runEnhanced<T = Record<string, unknown>>(
    cypher: string,
    params?: Record<string, unknown>,
    options?: EnhancedQueryOptions
  ): Promise<EnhancedQueryResult<T>> {
    return this.queryService.runEnhanced<T>(
      this.driver,
      cypher,
      params,
      options
    );
  }

  /**
   * Execute a read operation with enhanced features
   */
  async readEnhanced<T>(
    operation: (session: Session) => Promise<T>,
    options?: EnhancedQueryOptions
  ): Promise<T> {
    const enhancedOptions: EnhancedQueryOptions = {
      ...options,
      defaultAccessMode: 'READ',
    };

    return this.executeWithEnhancedSession(operation, enhancedOptions);
  }

  /**
   * Execute a write operation with enhanced features
   */
  async writeEnhanced<T>(
    operation: (session: Session) => Promise<T>,
    options?: EnhancedQueryOptions
  ): Promise<T> {
    const enhancedOptions: EnhancedQueryOptions = {
      ...options,
      defaultAccessMode: 'WRITE',
    };

    return this.executeWithEnhancedSession(operation, enhancedOptions);
  }

  /**
   * Execute operations in a transaction with enhanced error handling
   */
  async runInEnhancedTransaction<T>(
    work: (tx: ManagedTransaction) => Promise<T>,
    options?: EnhancedQueryOptions & { transactionConfig?: any }
  ): Promise<T> {
    const session = this.driver.session({
      database: options?.database ?? this.options.database,
      defaultAccessMode:
        options?.defaultAccessMode === 'READ'
          ? neo4jSession.READ
          : neo4jSession.WRITE,
    });

    let retryCount = 0;
    const maxRetries = options?.retry?.enabled
      ? options.retry.attempts || 3
      : 0;

    while (retryCount <= maxRetries) {
      try {
        return await session.executeWrite(work, options?.transactionConfig);
      } catch (error) {
        retryCount++;

        if (retryCount > maxRetries || !this.isRetryableError(error)) {
          throw error;
        }

        const delay = options?.retry?.delay || 1000;
        await this.delay(delay * Math.pow(2, retryCount - 1));
      } finally {
        if (retryCount > maxRetries) {
          await session.close();
        }
      }
    }

    throw new Error('Transaction failed after all retry attempts');
  }

  /**
   * Verify connectivity with enhanced error reporting
   */
  async verifyEnhancedConnectivity(): Promise<{
    connected: boolean;
    latency?: number;
    serverInfo?: any;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      await this.driver.verifyConnectivity();
      const latency = Date.now() - startTime;
      const serverInfo = await this.driver.getServerInfo();

      return {
        connected: true,
        latency,
        serverInfo,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ==================== DELEGATE TO CHILD SERVICES ====================

  /**
   * Get comprehensive metrics summary - delegates to MetricsService
   */
  getMetrics() {
    return this.metricsService.getMetrics();
  }

  /**
   * Get connection pool metrics - delegates to MetricsService
   */
  getConnectionPoolMetrics() {
    return this.metricsService.getConnectionPoolMetrics();
  }

  /**
   * Get query performance metrics - delegates to MetricsService
   */
  getQueryMetrics(queryPattern?: string) {
    return this.metricsService.getQueryMetrics(queryPattern);
  }

  /**
   * Clear metrics data - delegates to MetricsService
   */
  clearMetrics(): void {
    this.metricsService.clearMetrics();
  }

  /**
   * Get enhanced health information
   */
  async getEnhancedHealth(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    performanceMetrics: any;
    connectionInfo: any;
    errorRate: number;
    averageResponseTime: number;
  }> {
    const connectivity = await this.verifyEnhancedConnectivity();
    const metrics = this.getMetrics();
    const connectionInfo = this.getConnectionPoolMetrics();

    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    if (!connectivity.connected) {
      status = 'unhealthy';
    } else if (metrics.errorRate > 10 || metrics.averageExecutionTime > 5000) {
      status = 'degraded';
    }

    return {
      status,
      performanceMetrics: metrics,
      connectionInfo,
      errorRate: metrics.errorRate,
      averageResponseTime: metrics.averageExecutionTime,
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Create session proxy for transaction-based operations
   */
  private createSessionProxy(
    session: Session,
    tx: ManagedTransaction
  ): Session {
    return {
      ...session,
      run: tx.run.bind(tx),
    } as Session;
  }

  /**
   * Execute operation with enhanced session management
   */
  private async executeWithEnhancedSession<T>(
    operation: (session: Session) => Promise<T>,
    options?: EnhancedQueryOptions
  ): Promise<T> {
    const session = this.driver.session({
      database: options?.database ?? this.options.database,
      defaultAccessMode:
        options?.defaultAccessMode === 'READ'
          ? neo4jSession.READ
          : neo4jSession.WRITE,
      bookmarks: options?.bookmarks,
      fetchSize: options?.fetchSize,
    });

    try {
      return await operation(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Enhanced session operation failed: ${message}`, stack);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'ServiceUnavailable',
      'SessionExpired',
      'TransientError',
      'DatabaseUnavailable',
      'ClusterNotALeader',
    ];

    return retryableErrors.some((errorType) =>
      error instanceof Error
        ? error.message
        : String(error)?.includes(errorType) || error.code?.includes(errorType)
    );
  }

  /**
   * Delay utility for retry mechanisms
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
