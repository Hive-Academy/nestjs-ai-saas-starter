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
import { IChromaConnection } from '../../interfaces/core/database-abstractions.interface';

/**
 * Connection configuration interface
 */
export interface ConnectionConfig {
  host: string;
  port: number;
  ssl?: boolean;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

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
  private isConnected = false;
  private connectionTime?: number;
  private lastHealthCheck?: Date;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(
    @Inject(CHROMADB_CLIENT) private readonly client: ChromaClient,
    @Inject('ConnectionConfig') private readonly config: ConnectionConfig
  ) {}

  /**
   * Initialize connection on module startup
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
      this.startHealthChecking();
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
    this.stopHealthChecking();
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
   */
  async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    if (!this.config.retryAttempts || this.config.retryAttempts < 1) {
      this.config.retryAttempts = 3;
    }

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        // Ensure connection is healthy before operation
        if (!this.isConnected) {
          await this.connect();
        }

        return await this.withTimeout(operation(), this.config.timeout);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Mark connection as unhealthy on connection errors
        if (this.isConnectionError(error)) {
          this.isConnected = false;
        }

        // Don't retry on last attempt
        if (attempt === this.config.retryAttempts) {
          break;
        }

        // Wait before retry with exponential backoff
        const delay = this.config.retryDelay ?? 1000 * Math.pow(2, attempt - 1);
        await this.delay(delay);

        this.logger.warn(
          `Connection retry attempt ${attempt} after error: ${lastError.message}`
        );
      }
    }

    throw lastError!;
  }

  /**
   * Test connection with timeout
   */
  private async performConnectionTest(): Promise<void> {
    try {
      // Simple heartbeat operation
      await this.withTimeout(
        this.client.heartbeat(),
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
   * Start periodic health checking
   */
  private startHealthChecking(): void {
    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.isHealthy();
      } catch (error) {
        this.logger.warn('Periodic health check failed', error);
      }
    }, 30000);
  }

  /**
   * Stop periodic health checking
   */
  private stopHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

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
}
