import { Injectable, Logger } from '@nestjs/common';
import { Driver, Session, session as neo4jSession } from 'neo4j-driver';
import {
  QueryOptions,
  QueryResult,
} from '../interfaces/query-result.interface';
import { Neo4jMetricsService } from './neo4j-metrics.service';

/**
 * Neo4j Query Service
 * Handles  query execution with retry, caching, and profiling
 */
@Injectable()
export class Neo4jQueryService {
  private readonly logger = new Logger(Neo4jQueryService.name);

  constructor(private readonly metricsService: Neo4jMetricsService) {}

  /**
   * Execute a query with  options and monitoring
   */
  async run<T = Record<string, unknown>>(
    driver: Driver,
    cypher: string,
    params?: Record<string, unknown>,
    options?: QueryOptions
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const queryId = this.metricsService.generateQueryId();
    const sessionStartTime = Date.now();

    // Update connection metrics
    this.metricsService.recordConnectionAttempt(true);

    let session: Session;
    try {
      session = this.createSession(driver, options);
      const sessionCreationTime = Date.now() - sessionStartTime;
      this.metricsService.updateConnectionMetrics(sessionCreationTime);
      this.metricsService.incrementActiveSessions();
    } catch (error) {
      this.metricsService.recordConnectionAttempt(false);
      this.logger.error(
        `Failed to create session for query ${queryId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }

    let retryCount = 0;
    const maxRetries = options?.retry?.enabled
      ? options.retry.attempts || 3
      : 0;

    while (retryCount <= maxRetries) {
      try {
        const planningStartTime = Date.now();

        // Configure session with  options
        const result = await this.executeQueryWithProfiling(
          session,
          cypher,
          params,
          options
        );

        const planningTime = Date.now() - planningStartTime;
        const executionTime = Date.now() - startTime;

        // Build  result
        const returnedResult: QueryResult<T> = {
          records: result.records as T[],
          summary: result.summary,
          performance: {
            executionTime: executionTime - planningTime,
            planningTime,
            totalTime: executionTime,
            cacheHit: false, // TODO: Implement caching
            retryCount,
          },
          connectionInfo: {
            poolSize:
              this.metricsService.getConnectionPoolMetrics().maxPoolSize,
            activeConnections:
              this.metricsService.getConnectionPoolMetrics().activeConnections,
            idleConnections:
              this.metricsService.getConnectionPoolMetrics().idleConnections,
          },
          metadata: {
            queryId,
            timestamp: new Date(),
            sessionId: session.toString(),
            tags: options?.metrics?.tags,
          },
        };

        // Collect metrics if enabled
        if (options?.metrics?.enabled !== false) {
          this.metricsService.collectQueryMetrics(
            cypher,
            returnedResult as QueryResult<Record<string, unknown>>,
            options
          );
        }

        return returnedResult;
      } catch (error) {
        retryCount++;

        if (retryCount > maxRetries || !this.isRetryableError(error)) {
          this.logger.error(
            `Query ${queryId} failed after ${retryCount} attempts: ${
              error instanceof Error ? error.message : String(error)
            }`,
            error instanceof Error ? error.stack : undefined
          );
          throw error;
        }

        const delay = options?.retry?.delay || 1000;
        this.logger.warn(
          `Query ${queryId} failed (attempt ${retryCount}/${
            maxRetries + 1
          }), retrying in ${delay}ms: ${
            error instanceof Error ? error.message : String(error)
          }`
        );

        await this.delay(delay * Math.pow(2, retryCount - 1)); // Exponential backoff
      } finally {
        if (session && retryCount > maxRetries) {
          await session.close();
          this.metricsService.decrementActiveSessions();
        }
      }
    }

    // This should never be reached due to the throw in catch block
    throw new Error('Unexpected end of retry loop');
  }

  /**
   * Create an  session with optimized configuration
   */
  private createSession(driver: Driver, options?: QueryOptions): Session {
    return driver.session({
      database: options?.database,
      defaultAccessMode:
        options?.defaultAccessMode === 'READ'
          ? neo4jSession.READ
          : neo4jSession.WRITE,
      bookmarks: options?.bookmarks,
      fetchSize: options?.fetchSize,
    });
  }

  /**
   * Execute query with profiling information
   */
  private async executeQueryWithProfiling(
    session: Session,
    cypher: string,
    params?: Record<string, unknown>,
    options?: QueryOptions
  ): Promise<QueryResult> {
    let queryToExecute = cypher;

    // Add profiling if requested
    if (options?.profile) {
      queryToExecute = `PROFILE ${cypher}`;
    } else if (options?.explain) {
      queryToExecute = `EXPLAIN ${cypher}`;
    }

    // Configure query timeout
    const runOptions: any = {};
    if (options?.timeout) {
      runOptions.timeout = options.timeout;
    }

    const result = await session.run(queryToExecute, params, runOptions);

    return {
      records: result.records.map((record) => record.toObject()),
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
