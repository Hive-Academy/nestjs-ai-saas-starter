import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  Driver,
  Session,
  Transaction,
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

@Injectable()
export class Neo4jService {
  private readonly logger = new Logger(Neo4jService.name);

  constructor(
    @Inject(NEO4J_DRIVER) private readonly driver: Driver,
    @Inject(NEO4J_OPTIONS) private readonly options: Neo4jModuleOptions
  ) {}

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
   * Execute a query with full result details
   */
  async run<T = Record<string, unknown>>(
    cypher: string,
    params?: Record<string, unknown>,
    options?: SessionOptions
  ): Promise<QueryResult<T>> {
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
          plan: result.summary.plan,
          profile: result.summary.profile,
          notifications: result.summary.notifications,
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
   * Run operations in a transaction
   */
  public async runInTransaction<T>(
    work: (session: Session) => Promise<T>,
    database?: string
  ): Promise<T> {
    const session = this.driver.session({
      database: database ?? this.options.database,
      defaultAccessMode: neo4jSession.WRITE,
    });

    try {
      return await work(session);
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
   * Run operations in a read transaction
   */
  public async runInReadTransaction<T>(
    work: (tx: Transaction) => Promise<T>,
    database?: string
  ): Promise<T> {
    const session = this.driver.session({
      database: database ?? this.options.database,
      defaultAccessMode: neo4jSession.READ,
    });

    try {
      const result = await session.readTransaction(work);
      return result;
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
   * Execute bulk operations with session callback
   */
  public async bulk<T>(
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
      this.logger.error(`Bulk operation failed: ${message}`, stack);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Execute multiple operations in a single transaction (legacy method)
   */
  public async bulkOperations(operations: BulkOperation[]): Promise<BulkResult> {
    const session = this.driver.session({
      database: this.options.database,
    });
    const tx = session.beginTransaction();

    try {
      const results: QueryResult[] = [];

      for (const op of operations) {
        const result = await tx.run(op.cypher, op.params);
        results.push({
          records: result.records.map((r) => r.toObject()),
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
            notifications: result.summary.notifications,
            server: {
              address: result.summary.server.address ?? '',
              version: result.summary.server.agent ?? '',
            },
            resultConsumedAfter: result.summary.resultConsumedAfter.toNumber(),
            resultAvailableAfter:
              result.summary.resultAvailableAfter.toNumber(),
          },
        });
      }

      await tx.commit();
      return { success: true, results };
    } catch (error) {
      await tx.rollback();
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Bulk operations failed: ${message}`, stack);
      return {
        success: false,
        results: [],
        errors: [error instanceof Error ? error : new Error(message)],
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Get a session for manual control
   */
  public getSession(options?: SessionOptions): Session {
    return this.driver.session({
      database: options?.database ?? this.options.database,
      defaultAccessMode:
        options?.defaultAccessMode === 'READ'
          ? neo4jSession.READ
          : neo4jSession.WRITE,
      bookmarks: options?.bookmarks,
      fetchSize: options?.fetchSize,
    });
  }

  /**
   * Verify connectivity
   */
  public async verifyConnectivity(): Promise<boolean> {
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
   * Get driver instance for advanced operations
   */
  public getDriver(): Driver {
    return this.driver;
  }

  /**
   * Close the driver connection
   */
  public async close(): Promise<void> {
    await this.driver.close();
  }
}
