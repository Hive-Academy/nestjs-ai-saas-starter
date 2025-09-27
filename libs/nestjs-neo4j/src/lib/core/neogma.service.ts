/**
 * Pure NeogmaService - Clean, modern implementation
 *
 * This service provides a clean, type-safe interface to Neo4j through Neogma.
 * Uses only Neogma's native features - no legacy patterns or raw Cypher.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import type { Record as Neo4jRecord } from 'neo4j-driver';
import { NEOGMA_TOKEN } from '../constants/neogma.constants';
import {
  type NeogmaEntity,
  type TypedNeogmaModel,
  type NeogmaService as INeogmaService,
  type NeogmaTransactionContext,
  type NeogmaMetrics,
  type Neogma,
  type NeogmaInstanceType,
  type NeogmaQueryBuilder,
  NeogmaNotFoundError
} from '../types/neogma-types';

/**
 * Pure NeogmaService implementation
 */
@Injectable()
export class NeogmaService implements INeogmaService {
  private readonly logger = new Logger(NeogmaService.name);
  private readonly models = new Map<string, TypedNeogmaModel<any>>();

  // Metrics tracking
  private metrics: NeogmaMetrics = {
    totalQueries: 0,
    averageQueryTime: 0,
    activeConnections: 0,
    errorRate: 0
  };

  constructor(
    @Inject(NEOGMA_TOKEN) private readonly neogma: Neogma
  ) {
  }

  // ==================== MODEL MANAGEMENT ====================

  /**
   * Register a typed Neogma model
   */
  registerModel<T extends NeogmaEntity>(
    name: string,
    model: TypedNeogmaModel<T>
  ): void {
    this.models.set(name, model);
    this.logger.debug(`Registered model: ${name}`);
  }

  /**
   * Get a typed Neogma model
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

  // ==================== ENTITY OPERATIONS ====================

  /**
   * Find entity by ID using proper Neogma model
   */
  async findById<T extends NeogmaEntity>(
    modelName: string,
    id: string
  ): Promise<T | null> {
    const startTime = Date.now();
    try {
      const model = this.getModel<T>(modelName);
      const instance = await model.findOne({ where: { id } as Partial<T> });

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
   * Find multiple entities using Neogma model
   */
  async findMany<T extends NeogmaEntity>(
    modelName: string,
    options?: {
      where?: Partial<T>;
      limit?: number;
      skip?: number;
      orderBy?: Array<{ [K in keyof T]?: 'ASC' | 'DESC' }>;
    }
  ): Promise<T[]> {
    const startTime = Date.now();
    try {
      const model = this.getModel<T>(modelName);
      const instances = await model.findMany(options);

      const results = instances.map((instance: any) => this.extractEntityData<T>(instance));
      this.recordMetrics(Date.now() - startTime, false);

      return results;
    } catch (error) {
      this.recordMetrics(Date.now() - startTime, true);
      this.handleError(error, `findMany(${modelName})`);
      throw error;
    }
  }

  /**
   * Create entity using Neogma model
   */
  async create<T extends NeogmaEntity>(
    modelName: string,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const model = this.getModel<T>(modelName);

      // Add automatic fields that Neogma expects
      const entityData = {
        ...data,
        id: this.generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any;

      const instance = await model.create(entityData);
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
   * Update entity using Neogma model
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
        updatedAt: new Date().toISOString()
      } as Partial<T>;

      const instance = await model.update(updateData, { where: { id } as Partial<T> });
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
   * Delete entity using Neogma model
   */
  async delete(modelName: string, id: string, detach = true): Promise<boolean> {
    const startTime = Date.now();
    try {
      const model = this.getModel(modelName);
      const deletedCount = await model.delete({
        where: { id } as any,
        detach
      });

      const success = deletedCount > 0;
      this.recordMetrics(Date.now() - startTime, false);
      this.logger.debug(`Deleted entity from ${modelName}: ${id} (success: ${success})`);

      return success;
    } catch (error) {
      this.recordMetrics(Date.now() - startTime, true);
      this.handleError(error, `delete(${modelName}, ${id})`);
      throw error;
    }
  }

  /**
   * Count entities using Neogma model
   */
  async count<T extends NeogmaEntity>(
    modelName: string,
    where?: Partial<T>
  ): Promise<number> {
    const startTime = Date.now();
    try {
      const model = this.getModel<T>(modelName);
      const count = await model.count(where ? { where } : undefined);

      this.recordMetrics(Date.now() - startTime, false);
      return count;
    } catch (error) {
      this.recordMetrics(Date.now() - startTime, true);
      this.handleError(error, `count(${modelName})`);
      throw error;
    }
  }

  /**
   * Check if entity exists using Neogma model
   */
  async exists(modelName: string, id: string): Promise<boolean> {
    const count = await this.count(modelName, { id } as any);
    return count > 0;
  }

  // ==================== QUERY OPERATIONS ====================

  /**
   * Execute raw query when absolutely necessary
   * Note: Use model operations instead when possible
   */
  async query<T = Record<string, unknown>>(cypher: string, params?: Record<string, unknown>): Promise<T[]> {
    const startTime = Date.now();
    try {
      this.logger.warn('Using raw query - consider using model operations instead');

      const result = await this.neogma.queryRunner.run(cypher, params);
      const records = result.records.map((record: Neo4jRecord) => record.toObject() as T);

      this.recordMetrics(Date.now() - startTime, false);
      return records;
    } catch (error) {
      this.recordMetrics(Date.now() - startTime, true);
      this.handleError(error, `query(${cypher.substring(0, 50)}...)`);
      throw error;
    }
  }

  /**
   * Execute query for single result
   */
  async queryOne<T = Record<string, unknown>>(cypher: string, params?: Record<string, unknown>): Promise<T | null> {
    const results = await this.query<T>(cypher, params);
    return results.length > 0 ? results[0] : null;
  }

  // ==================== QUERY BUILDER OPERATIONS ====================

  /**
   * Create a new QueryBuilder instance with proper Neogma integration
   */
  createQueryBuilder(): NeogmaQueryBuilder {
    const queryBuilder = new (this.neogma.constructor as any).QueryBuilder();
    // Set the queryRunner to use our Neogma instance
    queryBuilder.queryRunner = this.neogma.queryRunner;
    return queryBuilder;
  }

  /**
   * Execute a QueryBuilder instance and return typed results
   */
  async executeQueryBuilder<T = Record<string, unknown>>(queryBuilder: NeogmaQueryBuilder): Promise<T[]> {
    const startTime = Date.now();
    try {
      this.logger.debug('Executing QueryBuilder query');
      
      const result = await queryBuilder.run();
      const records = result.records.map((record: Neo4jRecord) => record.toObject() as T);

      this.recordMetrics(Date.now() - startTime, false);
      this.logger.debug(`QueryBuilder executed successfully with ${records.length} results`);
      
      return records;
    } catch (error) {
      this.recordMetrics(Date.now() - startTime, true);
      this.handleError(error, 'executeQueryBuilder');
      throw error;
    }
  }

  /**
   * Execute a QueryBuilder and return single result
   */
  async executeQueryBuilderOne<T = Record<string, unknown>>(queryBuilder: NeogmaQueryBuilder): Promise<T | null> {
    const results = await this.executeQueryBuilder<T>(queryBuilder);
    return results.length > 0 ? results[0] : null;
  }

  // ==================== TRANSACTION OPERATIONS ====================

  /**
   * Execute operations in transaction using Neogma
   */
  async transaction<T>(work: (context: NeogmaTransactionContext) => Promise<T>): Promise<T> {
    const startTime = Date.now();
    const context: NeogmaTransactionContext = {
      id: this.generateId(),
      startTime: new Date(),
      operations: 0
    };

    try {
      this.logger.debug(`Starting transaction: ${context.id}`);

      const result = await (this.neogma as any).queryRunner.executeWrite(async () => {
        // Execute work with transaction context
        return await work(context);
      });

      this.recordMetrics(Date.now() - startTime, false);
      this.logger.debug(`Transaction completed: ${context.id} (${context.operations} operations)`);

      return result;
    } catch (error) {
      this.recordMetrics(Date.now() - startTime, true);
      this.logger.error(`Transaction failed: ${context.id} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  // ==================== HEALTH & METRICS ====================

  /**
   * Health check using Neogma
   */
  async healthCheck(): Promise<{ connected: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    try {
      // Simple connectivity test
      await (this.neogma as any).queryRunner.run('RETURN 1 as test');
      const latency = Date.now() - startTime;

      return { connected: true, latency };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { connected: false, error: errorMessage };
    }
  }

  /**
   * Get service metrics
   */
  getMetrics(): NeogmaMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = {
      totalQueries: 0,
      averageQueryTime: 0,
      activeConnections: 0,
      errorRate: 0
    };
    this.logger.debug('Metrics cleared');
  }

  /**
   * Get underlying Neogma instance (use sparingly)
   */
  getNeogma(): Neogma {
    this.logger.warn('Direct Neogma access - ensure you know what you\'re doing');
    return this.neogma;
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Extract entity data from Neogma instance
   */
  private extractEntityData<T extends NeogmaEntity>(instance: NeogmaInstanceType<T>): T {
    return instance.toJson();
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
  private recordMetrics(executionTime: number, failed: boolean): void {
    this.metrics.totalQueries++;

    // Update average query time
    const totalTime = this.metrics.averageQueryTime * (this.metrics.totalQueries - 1) + executionTime;
    this.metrics.averageQueryTime = totalTime / this.metrics.totalQueries;

    // Update error rate
    if (failed) {
      const totalErrors = Math.floor(this.metrics.errorRate * this.metrics.totalQueries / 100) + 1;
      this.metrics.errorRate = (totalErrors / this.metrics.totalQueries) * 100;
    } else {
      const totalErrors = Math.floor(this.metrics.errorRate * this.metrics.totalQueries / 100);
      this.metrics.errorRate = (totalErrors / this.metrics.totalQueries) * 100;
    }
  }

  /**
   * Handle and log errors consistently
   */
  private handleError(error: any, operation: string): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Operation failed [${operation}]: ${errorMessage}`, error instanceof Error ? error.stack : undefined);

    this.metrics.lastError = error instanceof Error ? error : new Error(String(error));
  }
}
