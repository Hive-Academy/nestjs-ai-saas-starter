/**
 * @fileoverview Neogma QueryRunner Service
 *
 * Provides enhanced query execution capabilities with metrics, caching,
 * and proper NestJS dependency injection using Neogma's QueryRunner.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { QueryRunner, QueryBuilder, type Runnable, type Neogma } from 'neogma';
import type { QueryResult as Neo4jQueryResult } from 'neo4j-driver';
import type { QueryResult } from '../types/neogma-types';
import { NeogmaService } from '../services/neogma.service';
import { NEOGMA_TOKEN } from '../neogma/neogma.constants';

/**
 * Query execution options
 */
export interface QueryExecutionOptions {
  /** Session or transaction to use */
  session?: Runnable | null;
  /** Enable query metrics */
  enableMetrics?: boolean;
  /** Query timeout in milliseconds */
  timeout?: number;
  /** Maximum retries on failure */
  retries?: number;
  /** Enable query logging */
  enableLogging?: boolean;
}

/**
 * Query execution result with enhanced metadata
 */
export interface EnhancedQueryResult<T = any> extends QueryResult {
  /** Typed records */
  data: T[];
  /** Execution metadata */
  metadata: {
    executionTime: number;
    recordCount: number;
    hasMore: boolean;
    queryHash: string;
  };
}

/**
 * Batch query operation
 */
export interface BatchQueryOperation {
  /** Query builder or raw query */
  query: QueryBuilder | { cypher: string; params: Record<string, any> };
  /** Operation identifier */
  id: string;
  /** Options for this specific query */
  options?: Partial<QueryExecutionOptions>;
}

/**
 * Batch execution result
 */
export interface BatchQueryResult {
  /** Individual results keyed by operation ID */
  results: Record<string, EnhancedQueryResult>;
  /** Overall execution metadata */
  metadata: {
    totalExecutionTime: number;
    successCount: number;
    errorCount: number;
    errors: Array<{ id: string; error: Error }>;
  };
}

/**
 * Enhanced QueryRunner Service
 *
 * Wraps Neogma's QueryRunner with additional functionality for
 * type-safe query execution, metrics, caching, and error handling.
 */
@Injectable()
export class NeogmaQueryRunnerService {
  private readonly logger = new Logger(NeogmaQueryRunnerService.name);
  private readonly queryRunner: QueryRunner;
  private readonly queryCache = new Map<string, any>();
  private readonly defaultOptions: Required<QueryExecutionOptions>;

  constructor(
    @Inject(NEOGMA_TOKEN) private readonly neogma: Neogma,
    private readonly neogmaService: NeogmaService
  ) {
    // Get the QueryRunner from Neogma using proper DI
    this.queryRunner = new QueryRunner({
      driver: this.neogma.driver,
    });

    this.defaultOptions = {
      session: null,
      enableMetrics: true,
      timeout: 30000,
      retries: 2,
      enableLogging: false,
    };
  }

  /**
   * Execute a QueryBuilder with enhanced features
   */
  async execute<T = any>(
    query: QueryBuilder,
    options?: Partial<QueryExecutionOptions>
  ): Promise<EnhancedQueryResult<T>> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();

    try {
      const cypher = query.getStatement();
      const params = query.getBindParam().get();
      const queryHash = this.generateQueryHash(cypher, params);

      if (opts.enableLogging) {
        this.logger.debug(`Executing query: ${cypher}`, { params });
      }

      // Execute with retries
      const result = await this.executeWithRetries(
        cypher,
        params,
        opts.session,
        opts.retries,
        opts.timeout
      );

      const executionTime = Date.now() - startTime;
      const recordCount = result.records.length;

      if (opts.enableMetrics) {
        this.recordMetrics(executionTime, true, recordCount);
      }

      return {
        records: result.records,
        summary: result.summary,
        metrics: {
          executionTime,
          recordCount,
        },
        data: this.extractTypedRecords<T>(result.records),
        metadata: {
          executionTime,
          recordCount,
          hasMore: false, // Neo4j doesn't provide this info by default
          queryHash,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (opts.enableMetrics) {
        this.recordMetrics(executionTime, false, 0);
      }

      this.logger.error('Query execution failed:', {
        error: (error as Error).message,
        cypher: query.getStatement(),
        params: query.getBindParam().get(),
      });

      throw this.enhanceError(error, query);
    }
  }

  /**
   * Execute raw Cypher query
   */
  async executeRaw<T = any>(
    cypher: string,
    params: Record<string, any> = {},
    options?: Partial<QueryExecutionOptions>
  ): Promise<EnhancedQueryResult<T>> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();

    try {
      const queryHash = this.generateQueryHash(cypher, params);

      if (opts.enableLogging) {
        this.logger.debug(`Executing raw query: ${cypher}`, { params });
      }

      const result = await this.executeWithRetries(
        cypher,
        params,
        opts.session,
        opts.retries,
        opts.timeout
      );

      const executionTime = Date.now() - startTime;
      const recordCount = result.records.length;

      if (opts.enableMetrics) {
        this.recordMetrics(executionTime, true, recordCount);
      }

      return {
        records: result.records,
        summary: result.summary,
        metrics: {
          executionTime,
          recordCount,
        },
        data: this.extractTypedRecords<T>(result.records),
        metadata: {
          executionTime,
          recordCount,
          hasMore: false,
          queryHash,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (opts.enableMetrics) {
        this.recordMetrics(executionTime, false, 0);
      }

      this.logger.error('Raw query execution failed:', {
        error: (error as Error).message,
        cypher,
        params,
      });

      throw this.enhanceError(error, { cypher, params });
    }
  }

  /**
   * Execute multiple queries in batch
   */
  async executeBatch(
    operations: BatchQueryOperation[],
    options?: Partial<QueryExecutionOptions>
  ): Promise<BatchQueryResult> {
    const startTime = Date.now();
    const results: Record<string, EnhancedQueryResult> = {};
    const errors: Array<{ id: string; error: Error }> = [];

    for (const operation of operations) {
      try {
        const opOptions = { ...options, ...operation.options };

        let result: EnhancedQueryResult;
        if (operation.query instanceof QueryBuilder) {
          result = await this.execute(operation.query, opOptions);
        } else {
          result = await this.executeRaw(
            operation.query.cypher,
            operation.query.params,
            opOptions
          );
        }

        results[operation.id] = result;
      } catch (error) {
        errors.push({ id: operation.id, error: error as Error });
      }
    }

    const totalExecutionTime = Date.now() - startTime;
    const successCount = Object.keys(results).length;
    const errorCount = errors.length;

    return {
      results,
      metadata: {
        totalExecutionTime,
        successCount,
        errorCount,
        errors,
      },
    };
  }

  /**
   * Execute query in transaction
   */
  async executeInTransaction<T>(
    operation: (queryRunner: NeogmaQueryRunnerServiceTx) => Promise<T>
  ): Promise<T> {
    return this.neogmaService.runInTransaction(async (tx) => {
      // Create a new service instance with the transaction
      const txService = new NeogmaQueryRunnerServiceTx(tx, this.logger);
      return operation(txService);
    });
  }

  /**
   * Get query execution statistics
   */
  getStats() {
    return {
      totalQueries: this.metrics.totalQueries,
      avgExecutionTime: this.metrics.avgExecutionTime,
      errorRate: this.metrics.errorRate,
      cacheSize: this.queryCache.size,
    };
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear();
    this.logger.debug('Query cache cleared');
  }

  // Private metrics tracking
  private metrics = {
    totalQueries: 0,
    totalExecutionTime: 0,
    avgExecutionTime: 0,
    errorCount: 0,
    errorRate: 0,
  };

  /**
   * Execute query with retry logic
   */
  private async executeWithRetries(
    cypher: string,
    params: Record<string, any>,
    session: Runnable | null,
    retries: number,
    timeout: number
  ): Promise<Neo4jQueryResult> {
    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const promise = session
          ? this.queryRunner.run(cypher, params, session)
          : this.queryRunner.run(cypher, params);

        // Add timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), timeout);
        });

        return await Promise.race([promise, timeoutPromise]);
      } catch (error) {
        lastError = error as Error;

        if (attempt < retries && this.isRetryableError(error)) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw lastError!;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Common retryable Neo4j errors
    const retryableCodes = [
      'Neo.TransientError.Transaction.DeadlockDetected',
      'Neo.TransientError.Network.UnknownFailure',
      'Neo.TransientError.Transaction.LockClientStopped',
    ];

    return retryableCodes.some((code) => error.code === code);
  }

  /**
   * Extract typed records from Neo4j result
   */
  private extractTypedRecords<T>(records: any[]): T[] {
    return records.map((record) => {
      const obj: any = {};
      record.keys.forEach((key: string) => {
        obj[key] = record.get(key);
      });
      return obj as T;
    });
  }

  /**
   * Generate hash for query caching
   */
  private generateQueryHash(
    cypher: string,
    params: Record<string, any>
  ): string {
    const content = cypher + JSON.stringify(params);
    return Buffer.from(content).toString('base64').slice(0, 16);
  }

  /**
   * Record execution metrics
   */
  private recordMetrics(
    executionTime: number,
    success: boolean,
    recordCount: number
  ): void {
    this.metrics.totalQueries++;
    this.metrics.totalExecutionTime += executionTime;
    this.metrics.avgExecutionTime =
      this.metrics.totalExecutionTime / this.metrics.totalQueries;

    if (!success) {
      this.metrics.errorCount++;
    }

    this.metrics.errorRate =
      this.metrics.errorCount / this.metrics.totalQueries;
  }

  /**
   * Enhance error with additional context
   */
  private enhanceError(error: any, queryInfo: any): Error {
    const enhanced = new Error(error.message);
    enhanced.name = 'QueryExecutionError';
    enhanced.stack = error.stack;
    (enhanced as any).queryInfo = queryInfo;
    (enhanced as any).code = error.code;
    return enhanced;
  }
}

/**
 * Transaction-scoped QueryRunner service
 */
class NeogmaQueryRunnerServiceTx {
  private logger: Logger;

  constructor(private tx: any, logger: Logger) {
    this.logger = logger;
  }

  async execute<T = any>(
    query: QueryBuilder,
    options?: Partial<QueryExecutionOptions>
  ): Promise<EnhancedQueryResult<T>> {
    const cypher = query.getStatement();
    const params = query.getBindParam().get();
    return this.executeRaw<T>(cypher, params, options);
  }

  async executeRaw<T = any>(
    cypher: string,
    params: Record<string, any> = {},
    options?: Partial<QueryExecutionOptions>
  ): Promise<EnhancedQueryResult<T>> {
    const startTime = Date.now();

    try {
      const result = await this.tx.run(cypher, params);
      const executionTime = Date.now() - startTime;
      const recordCount = result.records.length;

      return {
        records: result.records,
        summary: result.summary,
        metrics: {
          executionTime,
          recordCount,
        },
        data: this.extractTypedRecords<T>(result.records),
        metadata: {
          executionTime,
          recordCount,
          hasMore: false,
          queryHash: this.generateQueryHash(cypher, params),
        },
      };
    } catch (error) {
      this.logger.error('Transaction query execution failed:', {
        error: (error as Error).message,
        cypher,
        params,
      });

      throw this.enhanceError(error, { cypher, params });
    }
  }

  private extractTypedRecords<T>(records: any[]): T[] {
    return records.map((record) => {
      const obj: any = {};
      record.keys.forEach((key: string) => {
        obj[key] = record.get(key);
      });
      return obj as T;
    });
  }

  private generateQueryHash(
    cypher: string,
    params: Record<string, any>
  ): string {
    const content = cypher + JSON.stringify(params);
    return Buffer.from(content).toString('base64').slice(0, 16);
  }

  private enhanceError(error: any, queryInfo: any): Error {
    const enhanced = new Error((error as Error).message);
    enhanced.name = 'TransactionQueryExecutionError';
    enhanced.stack = (error as Error).stack;
    (enhanced as any).queryInfo = queryInfo;
    (enhanced as any).code = (error as any).code;
    return enhanced;
  }
}
