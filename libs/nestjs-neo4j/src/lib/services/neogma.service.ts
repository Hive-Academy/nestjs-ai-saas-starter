/**
 * Primary NeogmaService - Modern, Neogma-first database service
 *
 * This service provides a clean, type-safe interface to Neo4j through Neogma.
 * No legacy Neo4j driver patterns - Neogma only for simplicity and performance.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import type {
  Neogma,
  NeogmaModel,
  QueryRunner,
  ModelInstance,
  Where,
} from 'neogma';
import { NEO4J_OPTIONS } from '../constants';
import { InjectNeogma } from '../neogma/neogma.decorators';
import type {
  Neo4jCompatibleEntity,
  Neo4jQueryParams,
} from '../types/neo4j-types';

// Inline interface due to build configuration issue
interface Neo4jModuleOptions {
  url: string;
  username: string;
  password: string;
  database?: string;
  config?: any;
  healthCheck?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Find options for Neogma queries
 */
export interface FindOptions<T = any> {
  where?: Where;
  limit?: number;
  skip?: number;
  orderBy?: Array<{
    property: keyof T | string;
    direction: 'ASC' | 'DESC';
  }>;
}

/**
 * Health status interface
 */
export interface HealthStatus {
  connected: boolean;
  latency?: number;
  database?: string;
  error?: string;
}

/**
 * Service metrics interface
 */
export interface ServiceMetrics {
  totalQueries: number;
  averageExecutionTime: number;
  errorRate: number;
  activeConnections: number;
}

/**
 * Transaction work function type
 */
export type TransactionWork<T> = (runner: QueryRunner) => Promise<T>;

/**
 * Primary NeogmaService - Clean, modern, Neogma-only interface
 */
@Injectable()
export class NeogmaService {
  private readonly logger = new Logger(NeogmaService.name);
  private queryCount = 0;
  private totalExecutionTime = 0;
  private errorCount = 0;

  constructor(
    @InjectNeogma() private readonly neogma: Neogma,
    @Inject(NEO4J_OPTIONS) private readonly options: Neo4jModuleOptions
  ) {
    this.logger.log(
      'NeogmaService initialized with modern Neogma-only architecture'
    );
  }

  // ==================== MODEL OPERATIONS ====================

  /**
   * Find a single entity by ID using Neogma model
   */
  async findOne<T extends Neo4jCompatibleEntity>(
    model: NeogmaModel,
    id: string
  ): Promise<T | null> {
    const startTime = Date.now();
    try {
      this.logger.debug(`Finding entity with ID: ${id}`);

      const result = await model.findOne({ where: { id } });
      const entity = result ? (result.toJson() as T) : null;

      this.recordQuery(Date.now() - startTime, false);
      return entity;
    } catch (error) {
      this.recordQuery(Date.now() - startTime, true);
      this.logger.error(
        `Failed to find entity: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  /**
   * Find multiple entities using Neogma model
   */
  async findMany<T extends Neo4jCompatibleEntity>(
    model: NeogmaModel,
    options?: FindOptions<T>
  ): Promise<T[]> {
    const startTime = Date.now();
    try {
      this.logger.debug(`Finding entities with options:`, options);

      const findOptions: any = {};

      if (options?.where) {
        findOptions.where = options.where;
      }

      if (options?.limit) {
        findOptions.limit = options.limit;
      }

      if (options?.skip) {
        findOptions.skip = options.skip;
      }

      if (options?.orderBy && options.orderBy.length > 0) {
        findOptions.order = options.orderBy.map((order) => ({
          [order.property as string]: order.direction,
        }));
      }

      const results = await model.findMany(findOptions);
      const entities = results.map((result) => result.toJson() as T);

      this.recordQuery(Date.now() - startTime, false);
      return entities;
    } catch (error) {
      this.recordQuery(Date.now() - startTime, true);
      this.logger.error(
        `Failed to find entities: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  /**
   * Create a new entity using Neogma model
   */
  async create<T extends Neo4jCompatibleEntity>(
    model: NeogmaModel,
    data: Partial<T>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      this.logger.debug(`Creating entity with data:`, data);

      // Add automatic fields
      const entityData = {
        ...data,
        id:
          (data as any).id ||
          `${
            model.getLabel()?.toLowerCase() || 'entity'
          }_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await model.create(entityData);
      const entity = result.toJson() as T;

      this.recordQuery(Date.now() - startTime, false);
      return entity;
    } catch (error) {
      this.recordQuery(Date.now() - startTime, true);
      this.logger.error(
        `Failed to create entity: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  /**
   * Update an existing entity using Neogma model
   */
  async update<T extends Neo4jCompatibleEntity>(
    model: NeogmaModel,
    id: string,
    updates: Partial<T>
  ): Promise<T | null> {
    const startTime = Date.now();
    try {
      this.logger.debug(`Updating entity ${id} with:`, updates);

      // Add automatic updatedAt timestamp
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const result = await model.update(updateData, { where: { id } });
      const entity = result ? (result.toJson() as T) : null;

      this.recordQuery(Date.now() - startTime, false);
      return entity;
    } catch (error) {
      this.recordQuery(Date.now() - startTime, true);
      this.logger.error(
        `Failed to update entity: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  /**
   * Delete an entity using Neogma model
   */
  async delete(model: NeogmaModel, id: string): Promise<boolean> {
    const startTime = Date.now();
    try {
      this.logger.debug(`Deleting entity with ID: ${id}`);

      const result = await model.delete({ where: { id }, detach: true });
      const deleted = result > 0;

      this.recordQuery(Date.now() - startTime, false);
      return deleted;
    } catch (error) {
      this.recordQuery(Date.now() - startTime, true);
      this.logger.error(
        `Failed to delete entity: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  /**
   * Count entities using Neogma model
   */
  async count(model: NeogmaModel, where?: Where): Promise<number> {
    const startTime = Date.now();
    try {
      this.logger.debug(`Counting entities with where:`, where);

      const options = where ? { where } : {};
      const result = await model.count(options);

      this.recordQuery(Date.now() - startTime, false);
      return result;
    } catch (error) {
      this.recordQuery(Date.now() - startTime, true);
      this.logger.error(
        `Failed to count entities: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  // ==================== QUERY OPERATIONS ====================

  /**
   * Execute a Cypher query and return multiple results
   */
  async query<T = any>(
    cypher: string,
    params?: Neo4jQueryParams
  ): Promise<T[]> {
    const startTime = Date.now();
    try {
      this.logger.debug(`Executing query: ${cypher}`, { params });

      const result = await this.neogma.queryRunner.run(cypher, params);
      const records = result.records.map((record) => record.toObject() as T);

      this.recordQuery(Date.now() - startTime, false);
      return records;
    } catch (error) {
      this.recordQuery(Date.now() - startTime, true);
      this.logger.error(
        `Query failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  /**
   * Execute a Cypher query and return single result
   */
  async queryOne<T = any>(
    cypher: string,
    params?: Neo4jQueryParams
  ): Promise<T | null> {
    const results = await this.query<T>(cypher, params);
    return results.length > 0 ? results[0] : null;
  }

  // ==================== TRANSACTION OPERATIONS ====================

  /**
   * Execute operations within a Neogma transaction
   */
  async transaction<T>(work: TransactionWork<T>): Promise<T> {
    const startTime = Date.now();
    try {
      this.logger.debug('Starting Neogma transaction');

      const result = await this.neogma.queryRunner
        .session({
          database: this.options.database,
          defaultAccessMode: 'WRITE',
        })
        .executeWrite(async (tx) => {
          return await work(this.neogma.queryRunner);
        });

      this.recordQuery(Date.now() - startTime, false);
      this.logger.debug('Transaction completed successfully');
      return result;
    } catch (error) {
      this.recordQuery(Date.now() - startTime, true);
      this.logger.error(
        `Transaction failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  // ==================== HEALTH & METRICS ====================

  /**
   * Check the health of the Neogma connection
   */
  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      // Simple connectivity test using Neogma
      await this.neogma.queryRunner.run('RETURN 1 as test');
      const latency = Date.now() - startTime;

      return {
        connected: true,
        latency,
        database: this.options.database,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get service performance metrics
   */
  getMetrics(): ServiceMetrics {
    return {
      totalQueries: this.queryCount,
      averageExecutionTime:
        this.queryCount > 0 ? this.totalExecutionTime / this.queryCount : 0,
      errorRate:
        this.queryCount > 0 ? (this.errorCount / this.queryCount) * 100 : 0,
      activeConnections: 1, // Neogma manages this internally
    };
  }

  /**
   * Clear accumulated metrics
   */
  clearMetrics(): void {
    this.queryCount = 0;
    this.totalExecutionTime = 0;
    this.errorCount = 0;
    this.logger.debug('Metrics cleared');
  }

  /**
   * Get the underlying Neogma instance for advanced usage
   */
  getNeogma(): Neogma {
    return this.neogma;
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Record query execution metrics
   */
  private recordQuery(executionTime: number, failed: boolean): void {
    this.queryCount++;
    this.totalExecutionTime += executionTime;
    if (failed) {
      this.errorCount++;
    }
  }
}
