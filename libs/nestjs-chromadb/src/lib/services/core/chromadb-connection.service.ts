import {
  Injectable,
  Logger,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ChromaClient } from 'chromadb';
import {
  ChromaDBConnectionError,
  ChromaDBTimeoutError,
} from '../../errors/chromadb.errors';
import { CHROMADB_CLIENT } from '../../constants';
import { Semaphore } from 'semaphore-promise';
import { IChromaConnection } from '../../interfaces/core/database-abstractions.interface';
import type {
  ConnectionConfig,
  QueueMetrics,
} from '../../interfaces/core/database-abstractions.interface';

/**
 * Connection health status
 */
export interface ConnectionHealth {
  isConnected: boolean;
  lastHealthCheck: Date;
  connectionTime?: number;
  error?: string;
}

/**
 * ChromaDB Connection Service
 *
 * Handles connection management, health monitoring, and client lifecycle
 * Following Single Responsibility Principle - only manages connections
 */
@Injectable()
export class ChromaDBConnectionService
  implements IChromaConnection, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ChromaDBConnectionService.name);
  private readonly semaphore: Semaphore;
  private activeOperations = 0;
  private queuedOperations = 0;
  private isConnected = false;
  private connectionTime?: number;
  private lastHealthCheck?: Date;

  constructor(
    @Inject(CHROMADB_CLIENT) private readonly client: ChromaClient,
    @Inject('ConnectionConfig') private readonly config: ConnectionConfig
  ) {
    // Initialize semaphore with configurable concurrency limit
    const maxConcurrent = this.config.maxConcurrentOperations || 5;
    this.semaphore = new Semaphore(maxConcurrent);
    this.logger.log(
      `ChromaDB semaphore initialized: max ${maxConcurrent} concurrent operations`
    );
  }

  /**
   * Initialize connection on module startup
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
      // Automatic health checks removed - consumers should call isHealthy() when needed
      // This prevents unnecessary database load and initialization race conditions
      this.logger.log('ChromaDB connection initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize ChromaDB connection', error);
      throw error;
    }
  }

  /**
   * Clean up connection on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
    this.logger.log('ChromaDB connection cleaned up');
  }

  /**
   * Establish connection to ChromaDB
   */
  async connect(): Promise<void> {
    const startTime = Date.now();

    try {
      // Test connection with heartbeat
      await this.performConnectionTest();

      this.isConnected = true;
      this.connectionTime = Date.now() - startTime;
      this.lastHealthCheck = new Date();

      this.logger.log(`Connected to ChromaDB in ${this.connectionTime}ms`);
    } catch (error) {
      this.isConnected = false;
      this.connectionTime = undefined;

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to connect to ChromaDB: ${errorMessage}`);

      throw new ChromaDBConnectionError(
        `Failed to establish connection: ${errorMessage}`,
        { host: this.config.host, port: this.config.port }
      );
    }
  }

  /**
   * Disconnect from ChromaDB
   */
  async disconnect(): Promise<void> {
    try {
      this.isConnected = false;
      this.connectionTime = undefined;
      this.lastHealthCheck = undefined;

      this.logger.log('Disconnected from ChromaDB');
    } catch (error) {
      this.logger.error('Error during disconnect', error);
    }
  }

  /**
   * Get the ChromaDB client instance
   */
  getClient(): ChromaClient {
    if (!this.isConnected) {
      throw new ChromaDBConnectionError('ChromaDB client not connected', {
        host: this.config.host,
        port: this.config.port,
      });
    }

    return this.client;
  }

  /**
   * Check if connection is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.performConnectionTest();
      this.lastHealthCheck = new Date();
      return true;
    } catch (error) {
      this.logger.warn(
        `Health check failed: ${error instanceof Error ? error.message : error}`
      );
      return false;
    }
  }

  /**
   * Get detailed connection health information
   */
  getConnectionHealth(): ConnectionHealth {
    return {
      isConnected: this.isConnected,
      lastHealthCheck: this.lastHealthCheck || new Date(),
      connectionTime: this.connectionTime,
      error: this.isConnected ? undefined : 'Not connected',
    };
  }

  /**
   * Execute operation with connection retry logic
   * Enhanced with detailed timing and error tracking for debugging
   */
  async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    const operationId = `op-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const queueStart = Date.now();

    this.queuedOperations++;

    // Acquire semaphore permit (blocks if at max concurrency)
    const release = await this.semaphore.acquire();

    this.queuedOperations--;
    this.activeOperations++;

    try {
      const queueWaitTime = Date.now() - queueStart;

      this.logger.debug(
        `[${operationId}] Semaphore acquired after ${queueWaitTime}ms wait (active: ${this.activeOperations}, queued: ${this.queuedOperations})`
      );

      // Execute with existing retry logic
      return await this.executeWithRetryInternal(operation, operationId);
    } finally {
      this.activeOperations--;
      // Always release semaphore, even on error
      release();
      this.logger.debug(`[${operationId}] Semaphore released`);
    }
  }

  /**
   * Internal retry implementation (existing retry logic)
   * @private
   */
  private async executeWithRetryInternal<T>(
    operation: () => Promise<T>,
    operationId: string
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: Error;

    // Log operation start with full context
    this.logger.debug(`[${operationId}] Starting ChromaDB operation`, {
      isConnected: this.isConnected,
      maxRetries: this.config.retryAttempts || 0,
      timeout: this.config.timeout,
      timestamp: new Date().toISOString(),
    });

    if (!this.config.retryAttempts || this.config.retryAttempts < 1) {
      this.config.retryAttempts = 3;
    }

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      const attemptStartTime = Date.now();

      try {
        // Ensure connection is healthy before operation
        if (!this.isConnected) {
          this.logger.warn(
            `[${operationId}] Connection not established, reconnecting...`
          );
          await this.connect();
        }

        this.logger.debug(
          `[${operationId}] Attempt ${attempt}/${this.config.retryAttempts} - executing operation`,
          {
            timeElapsed: Date.now() - startTime,
          }
        );

        const result = await this.withTimeout(operation(), this.config.timeout);

        const duration = Date.now() - attemptStartTime;
        this.logger.debug(
          `[${operationId}] ✅ SUCCESS in ${duration}ms (total: ${
            Date.now() - startTime
          }ms)`,
          {
            attempt,
            duration,
          }
        );

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const duration = Date.now() - attemptStartTime;

        // Detailed error logging with full context
        this.logger.error(
          `[${operationId}] ❌ FAILED on attempt ${attempt}/${this.config.retryAttempts}`,
          {
            duration,
            totalTime: Date.now() - startTime,
            errorType:
              error instanceof ChromaDBTimeoutError
                ? 'TIMEOUT'
                : error instanceof ChromaDBConnectionError
                ? 'CONNECTION'
                : 'UNKNOWN',
            errorMessage: lastError.message,
            isConnectionError: this.isConnectionError(error),
            wasConnected: this.isConnected,
            willRetry: attempt < this.config.retryAttempts,
            stack: lastError.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines of stack
          }
        );

        // Mark connection as unhealthy on connection errors
        if (this.isConnectionError(error)) {
          this.logger.warn(
            `[${operationId}] Marking connection as unhealthy due to: ${lastError.message}`
          );
          this.isConnected = false;
        }

        // Don't retry on last attempt
        if (attempt === this.config.retryAttempts) {
          this.logger.error(
            `[${operationId}] 🔴 FINAL FAILURE after ${
              Date.now() - startTime
            }ms`,
            {
              totalAttempts: attempt,
              finalError: lastError.message,
            }
          );
          break;
        }

        // Wait before retry with exponential backoff
        const delay = this.config.retryDelay ?? 1000 * Math.pow(2, attempt - 1);
        this.logger.warn(
          `[${operationId}] ⏳ Waiting ${delay}ms before retry ${
            attempt + 1
          }...`
        );
        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Test connection with timeout
   * Uses v2 API endpoint (v1 is deprecated in ChromaDB 0.5+)
   */
  private async performConnectionTest(): Promise<void> {
    try {
      // Use v2 API heartbeat endpoint directly
      // Handle hosts that already include protocol (e.g., "http://localhost")
      let baseUrl: string;
      if (
        this.config.host.startsWith('http://') ||
        this.config.host.startsWith('https://')
      ) {
        baseUrl = `${this.config.host}:${this.config.port}`;
      } else {
        const protocol = this.config.ssl ? 'https' : 'http';
        baseUrl = `${protocol}://${this.config.host}:${this.config.port}`;
      }

      const heartbeatUrl = `${baseUrl}/api/v2/heartbeat`;

      await this.withTimeout(
        fetch(heartbeatUrl).then((response) => {
          if (!response.ok) {
            throw new Error(
              `Heartbeat failed with status ${response.status}: ${response.statusText}`
            );
          }
          return response.json();
        }),
        this.config.timeout || 10000
      );
    } catch (error) {
      throw new ChromaDBConnectionError(
        `Connection test failed: ${
          error instanceof Error ? error.message : error
        }`,
        { host: this.config.host, port: this.config.port }
      );
    }
  }

  /**
   * Add timeout to promise
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs = 10000
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new ChromaDBTimeoutError(`Operation timed out after ${timeoutMs}ms`)
          ),
        timeoutMs
      );
    });

    return Promise.race([promise, timeout]);
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
   * export class ChromaDBHealthIndicator extends HealthIndicator {
   *   constructor(private connection: ChromaDBConnectionService) {
   *     super();
   *   }
   *
   *   async isHealthy(key: string) {
   *     const isHealthy = await this.connection.isHealthy();
   *     const health = this.connection.getConnectionHealth();
   *
   *     return this.getStatus(key, isHealthy, {
   *       connectionTime: health.connectionTime,
   *       lastHealthCheck: health.lastHealthCheck,
   *     });
   *   }
   * }
   * ```
   */

  /**
   * Check if error is connection-related
   */
  private isConnectionError(error: unknown): boolean {
    if (
      error instanceof ChromaDBConnectionError ||
      error instanceof ChromaDBTimeoutError
    ) {
      return true;
    }

    const errorMessage =
      error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();
    return (
      errorMessage.includes('connection') ||
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('econnrefused')
    );
  }

  /**
   * Reconnect to the database
   */
  async reconnect(): Promise<void> {
    this.logger.log('Reconnecting to ChromaDB...');
    await this.disconnect();
    await this.connect();
  }

  /**
   * Get connection configuration
   */
  getConfig(): { host: string; port: number; ssl: boolean } {
    return {
      host: this.config.host,
      port: this.config.port,
      ssl: this.config.ssl || false,
    };
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get operation queue metrics for observability
   */
  getQueueMetrics(): QueueMetrics {
    const maxConcurrent = this.config.maxConcurrentOperations || 5;
    return {
      availablePermits: maxConcurrent - this.activeOperations,
      queueDepth: this.queuedOperations,
      maxConcurrent,
    };
  }
}
