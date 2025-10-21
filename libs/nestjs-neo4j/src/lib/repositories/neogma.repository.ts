/**
 * Pure NeogmaRepository - Clean implementation using only Neogma features
 *
 * This repository provides type-safe CRUD operations using Neogma models.
 * No raw Cypher, no legacy patterns - pure Neogma model operations.
 */

import { Injectable, Logger } from '@nestjs/common';
import type {
  NeogmaEntity,
  TypedNeogmaModel,
  NeogmaRepository as INeogmaRepository,
  TypedFindOptions,
  FindOptions,
} from '../types/neogma-types';
import { NeogmaNotFoundError } from '../types/neogma-types';
import { NeogmaService } from '../services/neogma.service';

/**
 * Base repository implementation using pure Neogma patterns
 */
@Injectable()
export abstract class NeogmaRepository<T extends NeogmaEntity>
  implements INeogmaRepository<T>
{
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly neogmaService: NeogmaService,
    protected readonly modelName: string
  ) {
    this.logger.log(
      `${this.constructor.name} initialized for model: ${modelName}`
    );
  }

  /**
   * Get the typed Neogma model for this repository
   */
  protected getModel(): TypedNeogmaModel<T> {
    return this.neogmaService.getModel<T>(this.modelName);
  }

  // ==================== BASIC CRUD OPERATIONS ====================

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T | null> {
    this.logger.debug(`Finding ${this.modelName} by ID: ${id}`);
    return this.neogmaService.findById<T>(this.modelName, id);
  }

  /**
   * Find all entities (alias for findMany with no options)
   */
  async findAll(options?: FindOptions<T>): Promise<T[]> {
    this.logger.debug(`Finding all ${this.modelName} entities`, options);
    return this.neogmaService.findMany<T>(this.modelName, options);
  }

  /**
   * Find multiple entities with type-safe options
   */
  async findMany(options?: TypedFindOptions<T>): Promise<T[]> {
    this.logger.debug(`Finding many ${this.modelName} entities`, options);

    // Convert our typed options to Neogma format
    const neogmaOptions = options
      ? {
          where: options.where,
          limit: options.limit,
          skip: options.skip,
          orderBy: options.orderBy
            ?.map((order) => {
              const orderObj: { [key: string]: 'ASC' | 'DESC' } = {};
              orderObj[order.field as string] = order.direction as
                | 'ASC'
                | 'DESC';
              return orderObj;
            })
            .filter(Boolean),
        }
      : undefined;

    return this.neogmaService.findMany<T>(
      this.modelName,
      neogmaOptions as FindOptions<T>
    );
  }

  /**
   * Create new entity
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    this.logger.debug(`Creating ${this.modelName} entity`, data);
    return this.neogmaService.create<T>(this.modelName, data);
  }

  /**
   * Update existing entity
   */
  async update(
    id: string,
    data: Partial<Omit<T, 'id' | 'createdAt'>>
  ): Promise<T | null> {
    this.logger.debug(`Updating ${this.modelName} entity: ${id}`, data);
    return this.neogmaService.update<T>(this.modelName, id, data);
  }

  /**
   * Delete entity
   */
  async delete(id: string, detach = true): Promise<boolean> {
    this.logger.debug(`Deleting ${this.modelName} entity: ${id}`);
    return this.neogmaService.delete(this.modelName, id, detach);
  }

  /**
   * Count entities
   */
  async count(where?: Partial<T>): Promise<number> {
    this.logger.debug(`Counting ${this.modelName} entities`, where);
    return this.neogmaService.count<T>(this.modelName, where);
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    this.logger.debug(`Checking existence of ${this.modelName} entity: ${id}`);
    return this.neogmaService.exists(this.modelName, id);
  }

  // ==================== CONVENIENCE METHODS ====================

  /**
   * Find entity by ID or throw error
   */
  async findByIdOrFail(id: string): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new NeogmaNotFoundError(
        `${this.modelName} with id '${id}' not found`
      );
    }
    return entity;
  }

  /**
   * Find one entity by criteria
   */
  async findOne(where: Partial<T>): Promise<T | null> {
    const results = await this.findMany({ where, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Find one entity by criteria or throw error
   */
  async findOneOrFail(where: Partial<T>): Promise<T> {
    const entity = await this.findOne(where);
    if (!entity) {
      throw new NeogmaNotFoundError(
        `${this.modelName} not found with criteria: ${JSON.stringify(where)}`
      );
    }
    return entity;
  }

  /**
   * Update or create (upsert) entity
   */
  async upsert(
    where: Partial<T>,
    updateData: Partial<Omit<T, 'id' | 'createdAt'>>,
    createData: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<T> {
    const existing = await this.findOne(where);

    if (existing) {
      return (await this.update(existing.id, updateData)) || existing;
    } else {
      return await this.create(createData);
    }
  }

  /**
   * Find entities with pagination
   */
  async findWithPagination(
    page: number,
    limit: number,
    where?: Partial<T>
  ): Promise<{ entities: T[]; total: number; hasMore: boolean }> {
    const skip = (page - 1) * limit;

    const [entities, total] = await Promise.all([
      this.findMany({ where, limit: limit + 1, skip }),
      this.count(where),
    ]);

    const hasMore = entities.length > limit;
    const resultEntities = hasMore ? entities.slice(0, limit) : entities;

    return {
      entities: resultEntities,
      total,
      hasMore,
    };
  }

  /**
   * Bulk create entities
   */
  async bulkCreate(
    dataArray: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<T[]> {
    this.logger.debug(
      `Bulk creating ${dataArray.length} ${this.modelName} entities`
    );

    const results: T[] = [];

    // Use transaction for bulk operations
    await this.neogmaService.transaction(async () => {
      for (const data of dataArray) {
        const entity = await this.create(data);
        results.push(entity);
      }
    });

    return results;
  }

  /**
   * Delete multiple entities by IDs
   */
  async bulkDelete(ids: string[]): Promise<number> {
    this.logger.debug(`Bulk deleting ${ids.length} ${this.modelName} entities`);

    let deletedCount = 0;

    await this.neogmaService.transaction(async () => {
      for (const id of ids) {
        const success = await this.delete(id);
        if (success) deletedCount++;
      }
    });

    return deletedCount;
  }

  // ==================== VALIDATION HELPERS ====================

  /**
   * Validate entity data before operations
   */
  protected validateEntityData(data: Partial<T>): void {
    // Override in subclasses for specific validation
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid entity data: must be an object');
    }
  }

  /**
   * Sanitize entity data
   */
  protected sanitizeEntityData<TData extends Partial<T>>(data: TData): TData {
    // Override in subclasses for specific sanitization
    // Remove any undefined values
    const sanitized = { ...data };
    Object.keys(sanitized).forEach((key) => {
      if (sanitized[key as keyof TData] === undefined) {
        delete sanitized[key as keyof TData];
      }
    });
    return sanitized;
  }

  // ==================== QUERY HELPERS ====================

  /**
   * Execute custom operation within transaction
   */
  protected async executeInTransaction<TResult>(
    operation: () => Promise<TResult>
  ): Promise<TResult> {
    return this.neogmaService.transaction(async () => {
      return await operation();
    });
  }

  /**
   * Log operation performance
   */
  protected logPerformance(operation: string, startTime: number): void {
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      this.logger.warn(
        `Slow operation detected: ${operation} took ${duration}ms`
      );
    } else {
      this.logger.debug(`Operation completed: ${operation} took ${duration}ms`);
    }
  }
}
