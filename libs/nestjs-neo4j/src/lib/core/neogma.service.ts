/**
 * NeogmaService - Proper Neogma 1.14.1 Integration
 *
 * This service provides a clean interface to Neo4j through the actual Neogma library.
 * Uses real Neogma API patterns and QueryBuilder, not custom abstractions.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import type { Neogma } from 'neogma';
import { QueryBuilder } from 'neogma';
import { NEOGMA_TOKEN } from '../constants/neogma.constants';
import {
  type NeogmaEntity,
  type TypedNeogmaModel,
  type INeogmaService,
  type NeogmaMetrics,
  type FindOptions,
  type QueryResult,
  type NeogmaModelInterface,
  NeogmaNotFoundError,
} from '../types/neogma-types';

/**
 * NeogmaService - Bridge between our high-level API and real Neogma
 */
@Injectable()
export class NeogmaService implements INeogmaService {
  private readonly logger = new Logger(NeogmaService.name);
  private readonly models = new Map<string, NeogmaModelInterface>();

  // Metrics tracking
  private metrics: NeogmaMetrics = {
    totalQueries: 0,
    averageQueryTime: 0,
    activeConnections: 0,
    errorRate: 0,
  };

  constructor(@Inject(NEOGMA_TOKEN) private readonly neogma: Neogma) {}

  // ==================== MODEL MANAGEMENT ====================

  /**
   * Register a model interface for our high-level API
   */
  registerModel<T extends NeogmaEntity>(
    name: string,
    model: TypedNeogmaModel<T>
  ): void {
    this.models.set(name, model);
    this.logger.debug(`Registered model: ${name}`);
  }

  /**
   * Get a registered model
   */
  getModel<T extends NeogmaEntity>(modelName: string): TypedNeogmaModel<T> {
    const model = this.models.get(modelName);
    if (!model) {
      throw new NeogmaNotFoundError(`Model '${modelName}' not found`);
    }
    return model as TypedNeogmaModel<T>;
  }

  /**
   * Get all registered models
   */
  getRegisteredModels(): string[] {
    return Array.from(this.models.keys());
  }

  // ==================== HIGH-LEVEL CRUD OPERATIONS ====================

  /**
   * Find entity by ID using the model interface
   */
  async findById<T extends NeogmaEntity>(
    modelName: string,
    id: string
  ): Promise<T | null> {
    const startTime = Date.now();
    try {
      const model = this.getModel<T>(modelName);
      const instance = await model.findOne({
        where: { id } as Partial<NeogmaEntity>,
      });

      const result = instance ? this.extractEntityData<T>(instance) : null;
      this.recordMetrics(Date.now() - startTime, false);

      return result;
    } catch (error) {
      this.recordMetrics(Date.now() - startTime, true);
      this.handleError(error, `findById(${modelName}, ${id})`);
      throw error;
    }
  }

  /**
   * Find multiple entities using the model interface
   */
  async findMany<T extends NeogmaEntity>(
    modelName: string,
    options?: FindOptions<T>
  ): Promise<T[]> {
    const startTime = Date.now();
    try {
      const model = this.getModel<T>(modelName);
      const instances = await model.findMany(options as any);

      const results = instances.map((instance: any) =>
        this.extractEntityData<T>(instance)
      );
      this.recordMetrics(Date.now() - startTime, false);

      return results;
    } catch (error) {
      this.recordMetrics(Date.now() - startTime, true);
      this.handleError(error, `findMany(${modelName})`);
      throw error;
    }
  }

  /**
   * Create entity using the model interface
   */
  async create<T extends NeogmaEntity>(
    modelName: string,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const model = this.getModel<T>(modelName);

      // Add automatic fields
      const entityData = {
        ...data,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const instance = await model.create(entityData as any);
      const result = this.extractEntityData<T>(instance);

      this.recordMetrics(Date.now() - startTime, false);
      this.logger.debug(`Created entity in ${modelName}: ${result.id}`);

      return result;
    } catch (error) {
      this.recordMetrics(Date.now() - startTime, true);
      this.handleError(error, `create(${modelName})`);
      throw error;
    }
  }

  /**
   * Update entity using the model interface
   */
  async update<T extends NeogmaEntity>(
    modelName: string,
    id: string,
    updates: Partial<Omit<T, 'id' | 'createdAt'>>
  ): Promise<T | null> {
    const startTime = Date.now();
    try {
      const model = this.getModel<T>(modelName);

      // Add automatic updatedAt
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      const instance = await model.update(updateData as any, {
        where: { id } as any,
      });
      const result = instance ? this.extractEntityData<T>(instance) : null;

      this.recordMetrics(Date.now() - startTime, false);
      this.logger.debug(`Updated entity in ${modelName}: ${id}`);

      return result;
    } catch (error) {
      this.recordMetrics(Date.now() - startTime, true);
      this.handleError(error, `update(${modelName}, ${id})`);
      throw error;
    }
  }

  /**
   * Delete entity using the model interface
   */
  async delete<T extends NeogmaEntity>(
    modelName: string,
    id: string,
    detach = true
  ): Promise<boolean> {
    const startTime = Date.now();
    try {
      const model = this.getModel<T>(modelName);
      const result = await model.delete({
        where: { id } as Partial<NeogmaEntity>,
        detach,
      });

      this.recordMetrics(Date.now() - startTime, false);
      this.logger.debug(`Deleted entity in ${modelName}: ${id}`);

      return result > 0;
    } catch (error) {
      this.recordMetrics(Date.now() - startTime, true);
      this.handleError(error, `delete(${modelName}, ${id})`);
      throw error;
    }
  }

  /**
   * Count entities using the model interface
   */
  async count<T extends NeogmaEntity>(
    modelName: string,
    where?: Partial<T>
  ): Promise<number> {
    const startTime = Date.now();
    try {
      const model = this.getModel<T>(modelName);
      const result = await model.count({ where: where as any });

      this.recordMetrics(Date.now() - startTime, false);
      return result;
    } catch (error) {
      this.recordMetrics(Date.now() - startTime, true);
      this.handleError(error, `count(${modelName})`);
      throw error;
    }
  }

  /**
   * Check if entity exists using the model interface
   */
  async exists<T extends NeogmaEntity>(
    modelName: string,
    id: string
  ): Promise<boolean> {
    const result = await this.findById<T>(modelName, id);
    return result !== null;
  }

  // ==================== DIRECT NEOGMA ACCESS ====================

  /**
   * Run raw Cypher query using Neogma's QueryRunner
   */
  async run(
    cypher: string,
    params: Record<string, any> = {}
  ): Promise<QueryResult> {
    const startTime = Date.now();
    try {
      const result = await this.neogma.queryRunner.run(cypher, params);

      const queryResult: QueryResult = {
        records: result.records,
        summary: result.summary,
        metrics: {
          executionTime: Date.now() - startTime,
          recordCount: result.records.length,
        },
      };

      this.recordMetrics(Date.now() - startTime, false);
      return queryResult;
    } catch (error) {
      this.recordMetrics(Date.now() - startTime, true);
      this.handleError(error, `run(${cypher})`);
      throw error;
    }
  }

  /**
   * Create a Neogma QueryBuilder instance
   */
  createQueryBuilder(): QueryBuilder {
    return new QueryBuilder();
  }

  // ==================== CONNECTION MANAGEMENT ====================

  /**
   * Verify Neo4j connectivity
   */
  async verifyConnectivity(): Promise<void> {
    try {
      await this.neogma.verifyConnectivity();
      this.logger.log('Neo4j connectivity verified');
    } catch (error) {
      this.logger.error('Neo4j connectivity failed:', error);
      throw error;
    }
  }

  /**
   * Close Neogma connection
   */
  async close(): Promise<void> {
    try {
      await this.neogma.driver.close();
      this.logger.log('Neo4j connection closed');
    } catch (error) {
      this.logger.error('Error closing Neo4j connection:', error);
      throw error;
    }
  }

  /**
   * Get service metrics
   */
  getMetrics(): NeogmaMetrics {
    return { ...this.metrics };
  }

  // ==================== TRANSACTION HELPERS ====================

  /**
   * Run operations in a transaction
   */
  async runInTransaction<T>(
    operation: (queryRunner: any) => Promise<T>
  ): Promise<T> {
    return this.neogma.getTransaction(null, async (tx) => {
      return operation(tx);
    });
  }

  /**
   * Run operations in a write session
   */
  async write<T>(operation: (session: any) => Promise<T>): Promise<T> {
    return this.neogma.getSession(null, async (session) => {
      return operation(session);
    });
  }

  /**
   * Run operations in a read session
   */
  async read<T>(operation: (session: any) => Promise<T>): Promise<T> {
    return this.neogma.getSession(null, async (session) => {
      return operation(session);
    });
  }

  /**
   * Alias for run() method - for backward compatibility
   */
  async query(
    cypher: string,
    params: Record<string, any> = {}
  ): Promise<QueryResult> {
    return this.run(cypher, params);
  }

  /**
   * Run operations in a transaction - alias for runInTransaction
   */
  async transaction<T>(operation: (tx: any) => Promise<T>): Promise<T> {
    return this.runInTransaction(operation);
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Extract entity data from model instance
   */
  private extractEntityData<T extends NeogmaEntity>(instance: any): T {
    // Handle different types of model instance returns
    if (instance && typeof instance.toJson === 'function') {
      return instance.toJson();
    }
    if (instance && typeof instance === 'object') {
      return instance as T;
    }
    return instance;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Record operation metrics
   */
  private recordMetrics(duration: number, isError: boolean): void {
    this.metrics.totalQueries++;

    // Update average query time
    this.metrics.averageQueryTime =
      (this.metrics.averageQueryTime * (this.metrics.totalQueries - 1) +
        duration) /
      this.metrics.totalQueries;

    // Update error rate
    if (isError) {
      this.metrics.errorRate =
        (this.metrics.errorRate * (this.metrics.totalQueries - 1) + 1) /
        this.metrics.totalQueries;
    } else {
      this.metrics.errorRate =
        (this.metrics.errorRate * (this.metrics.totalQueries - 1)) /
        this.metrics.totalQueries;
    }
  }

  /**
   * Handle and log errors
   */
  private handleError(error: any, operation: string): void {
    this.logger.error(`Error in ${operation}:`, error.message);
    this.metrics.lastError = error.message;
  }
}
