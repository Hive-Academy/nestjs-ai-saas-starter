/**
 * @fileoverview Base Model Service for Neo4j Operations
 * 
 * This service provides a high-level abstraction layer for working with Neo4j entities.
 * It implements common CRUD operations, validation, and type safety for graph entities.
 * 
 * Features:
 * - Generic type-safe CRUD operations
 * - Entity validation and transformation
 * - Connection management and error handling
 * - Caching and performance optimization
 * - Hook system for custom business logic
 */

import { Injectable, Type } from '@nestjs/common';
import { Neo4jService } from '../services/neo4j.service';
import { QueryResult, Node, Relationship } from 'neo4j-driver';
import type { Record } from 'neo4j-driver';
import {
  Neo4jPrimitive,
  Neo4jProperties,
  Neo4jWhereClause,
  Neo4jSortOrder,
  Neo4jSortOrderArray,
  Neo4jCompatibleEntity,
  Neo4jCreateData,
  Neo4jUpdateData
} from '../types/neo4j-types';

/**
 * Base entity interface that all models must extend
 */
export interface BaseEntity {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
  [key: string]: Neo4jPrimitive | undefined;
}

/**
 * Entity metadata configuration
 */
export interface EntityMetadata<T = any> {
  /** Primary label for the entity */
  label: string;
  /** Additional labels */
  additionalLabels?: string[];
  /** Properties that should be indexed */
  indexedProperties?: string[];
  /** Unique constraints */
  uniqueConstraints?: string[];
  /** Validation schema */
  validation?: {
    required?: string[];
    format?: { [key: string]: string | RegExp };
    range?: { [key: string]: { min?: number; max?: number } };
  };
  /** Default values for properties */
  defaults?: Partial<T>;
  /** Property transformations */
  transforms?: {
    input?: Partial<{ [K in keyof T]: (value: T[K]) => T[K] }>;
    output?: Partial<{ [K in keyof T]: (value: T[K]) => T[K] }>;
  };
}

/**
 * Query options for model operations
 */
export interface ModelQueryOptions<T extends Neo4jCompatibleEntity = Neo4jCompatibleEntity> {
  /** Include deleted entities (soft delete) */
  includeDeleted?: boolean;
  /** Sort options */
  orderBy?: Neo4jSortOrderArray<T>;
  /** Pagination */
  limit?: number;
  skip?: number;
  /** Include related entities */
  include?: string[];
  /** Custom where conditions */
  where?: Neo4jWhereClause;
  /** Transaction context */
  transactionId?: string;
  /** Cache options */
  cache?: {
    enabled: boolean;
    ttl?: number;
    key?: string;
  };
}

/**
 * Entity lifecycle hooks
 */
export interface EntityHooks<T extends BaseEntity> {
  beforeCreate?(entity: Partial<T>): Promise<Partial<T>> | Partial<T>;
  afterCreate?(entity: T): Promise<void> | void;
  beforeUpdate?(id: string, updates: Partial<T>): Promise<Partial<T>> | Partial<T>;
  afterUpdate?(entity: T): Promise<void> | void;
  beforeDelete?(id: string): Promise<void> | void;
  afterDelete?(id: string): Promise<void> | void;
  beforeFind?(query: ModelQueryOptions): Promise<ModelQueryOptions> | ModelQueryOptions;
  afterFind?(entities: T[]): Promise<T[]> | T[];
}

/**
 * Base model service providing CRUD operations for Neo4j entities
 */
@Injectable()
export abstract class BaseModelService<T extends BaseEntity> {
  protected abstract metadata: EntityMetadata<T>;
  protected hooks: EntityHooks<T> = {};

  constructor(protected readonly neo4j: Neo4jService) {}

  /**
   * Create a new entity
   */
  async create(data: Neo4jCreateData<T>): Promise<T> {
    // Apply defaults
    const entityData = { ...this.metadata.defaults, ...data } as Partial<T>;

    // Run before create hook
    const processedData = this.hooks.beforeCreate 
      ? await this.hooks.beforeCreate(entityData)
      : entityData;

    // Validate data
    this.validateEntity(processedData);

    // Transform input data
    const transformedData = this.transformInput(processedData);

    // Add system properties
    const now = new Date();
    const finalData = {
      ...transformedData,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
      version: 1,
    } as any;

    // Build labels clause
    const labels = [this.metadata.label, ...(this.metadata.additionalLabels || [])];
    const labelsClause = labels.map(label => `:${label}`).join('');

    // Execute creation query
    const result = await this.neo4j.write(async (session) => {
      const queryResult = await session.run(
        `CREATE (n${labelsClause} $properties) RETURN n`,
        { properties: finalData as any }
      );

      return this.transformOutput(queryResult.records[0].get('n').properties) as T;
    });

    // Run after create hook
    if (this.hooks.afterCreate) {
      await this.hooks.afterCreate(result);
    }

    return result;
  }

  /**
   * Find entity by ID
   */
  async findById(id: string, options: ModelQueryOptions<T> = {}): Promise<T | null> {
    const processedOptions = this.hooks.beforeFind 
      ? await this.hooks.beforeFind(options)
      : options;

    const whereClause = this.buildWhereClause({ id, ...processedOptions.where }, processedOptions);
    const includeClause = this.buildIncludeClause(processedOptions.include);

    const result = await this.neo4j.read(async (session) => {
      const queryResult = await session.run(
        `
        MATCH (n:${this.metadata.label} ${whereClause})
        ${includeClause}
        RETURN n ${processedOptions.include ? ', ' + processedOptions.include.join(', ') : ''}
        `,
        { id }
      );

      if (queryResult.records.length === 0) {
        return null;
      }

      return this.transformOutput(queryResult.records[0].get('n').properties) as T;
    });

    if (result && this.hooks.afterFind) {
      const processed = await this.hooks.afterFind([result]);
      return processed[0] || null;
    }

    return result;
  }

  /**
   * Find multiple entities
   */
  async findMany(options: ModelQueryOptions<T> = {}): Promise<T[]> {
    const processedOptions = this.hooks.beforeFind 
      ? await this.hooks.beforeFind(options)
      : options;

    const whereClause = this.buildWhereClause(processedOptions.where, processedOptions);
    const orderClause = this.buildOrderClause(processedOptions.orderBy);
    const limitClause = this.buildLimitClause(processedOptions.limit, processedOptions.skip);
    const includeClause = this.buildIncludeClause(processedOptions.include);

    const results = await this.neo4j.read(async (session) => {
      const queryResult = await session.run(
        `
        MATCH (n:${this.metadata.label} ${whereClause})
        ${includeClause}
        RETURN n ${processedOptions.include ? ', ' + processedOptions.include.join(', ') : ''}
        ${orderClause}
        ${limitClause}
        `
      );

      return queryResult.records.map(record => 
        this.transformOutput(record.get('n').properties) as T
      );
    });

    if (this.hooks.afterFind) {
      return await this.hooks.afterFind(results);
    }

    return results;
  }

  /**
   * Update entity by ID
   */
  async update(id: string, updates: Neo4jUpdateData<T>): Promise<T> {
    // Run before update hook
    const processedUpdates = this.hooks.beforeUpdate 
      ? await this.hooks.beforeUpdate(id, updates as Partial<T>)
      : updates;

    // Validate updates
    this.validateEntity(processedUpdates as Partial<T>, false);

    // Transform input data
    const transformedUpdates = this.transformInput(processedUpdates as Partial<T>);

    // Add system properties
    const finalUpdates = {
      ...transformedUpdates,
      updatedAt: new Date(),
    };

    // Build update clauses
    const setClause = Object.keys(finalUpdates)
      .map(key => `n.${key} = $updates.${key}`)
      .join(', ');

    const result = await this.neo4j.write(async (session) => {
      // First get current version for optimistic locking
      const currentResult = await session.run(
        `MATCH (n:${this.metadata.label} {id: $id}) RETURN n.version as version`,
        { id }
      );

      if (currentResult.records.length === 0) {
        throw new Error(`Entity with id ${id} not found`);
      }

      const currentVersion = currentResult.records[0].get('version');
      const newVersion = currentVersion + 1;

      // Update with version increment
      const updateResult = await session.run(
        `
        MATCH (n:${this.metadata.label} {id: $id, version: $currentVersion})
        SET ${setClause}, n.version = $newVersion
        RETURN n
        `,
        { 
          id, 
          currentVersion,
          newVersion,
          updates: finalUpdates 
        }
      );

      if (updateResult.records.length === 0) {
        throw new Error(`Entity with id ${id} was modified by another process`);
      }

      return this.transformOutput(updateResult.records[0].get('n').properties) as T;
    });

    // Run after update hook
    if (this.hooks.afterUpdate) {
      await this.hooks.afterUpdate(result);
    }

    return result;
  }

  /**
   * Delete entity by ID (soft delete by default)
   */
  async delete(id: string, hardDelete = false): Promise<boolean> {
    // Run before delete hook
    if (this.hooks.beforeDelete) {
      await this.hooks.beforeDelete(id);
    }

    const result = await this.neo4j.write(async (session) => {
      if (hardDelete) {
        // Hard delete - remove the node and all relationships
        const deleteResult = await session.run(
          `
          MATCH (n:${this.metadata.label} {id: $id})
          DETACH DELETE n
          RETURN count(n) as deletedCount
          `,
          { id }
        );

        return deleteResult.records[0].get('deletedCount').toNumber() > 0;
      } else {
        // Soft delete - mark as deleted
        const updateResult = await session.run(
          `
          MATCH (n:${this.metadata.label} {id: $id})
          SET n.deletedAt = $deletedAt, n.updatedAt = $updatedAt
          RETURN count(n) as updatedCount
          `,
          { 
            id, 
            deletedAt: new Date(),
            updatedAt: new Date()
          }
        );

        return updateResult.records[0].get('updatedCount').toNumber() > 0;
      }
    });

    // Run after delete hook
    if (this.hooks.afterDelete) {
      await this.hooks.afterDelete(id);
    }

    return result;
  }

  /**
   * Count entities matching criteria
   */
  async count(where?: Neo4jWhereClause): Promise<number> {
    const whereClause = this.buildWhereClause(where, { includeDeleted: false });

    const result = await this.neo4j.read(async (session) => {
      const queryResult = await session.run(
        `MATCH (n:${this.metadata.label} ${whereClause}) RETURN count(n) as count`
      );

      return queryResult.records[0].get('count').toNumber();
    });

    return result;
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.neo4j.read(async (session) => {
      const queryResult = await session.run(
        `MATCH (n:${this.metadata.label} {id: $id}) RETURN count(n) as count`,
        { id }
      );

      return queryResult.records[0].get('count').toNumber() > 0;
    });

    return result;
  }

  /**
   * Bulk operations
   */
  async createMany(entities: Array<Neo4jCreateData<T>>): Promise<T[]> {
    const results: T[] = [];

    for (const entity of entities) {
      const result = await this.create(entity);
      results.push(result);
    }

    return results;
  }

  async updateMany(updates: Array<{ id: string; data: Neo4jUpdateData<T> }>): Promise<T[]> {
    const results: T[] = [];

    for (const update of updates) {
      const result = await this.update(update.id, update.data);
      results.push(result);
    }

    return results;
  }

  async deleteMany(ids: string[], hardDelete = false): Promise<number> {
    let deletedCount = 0;

    for (const id of ids) {
      const deleted = await this.delete(id, hardDelete);
      if (deleted) deletedCount++;
    }

    return deletedCount;
  }

  /**
   * Register lifecycle hooks
   */
  registerHooks(hooks: Partial<EntityHooks<T>>): void {
    this.hooks = { ...this.hooks, ...hooks };
  }

  /**
   * Validate entity data
   */
  protected validateEntity(data: Partial<T>, isCreate = true): void {
    if (!this.metadata.validation) return;

    const { required, format, range } = this.metadata.validation;

    // Check required fields (only for create operations)
    if (isCreate && required) {
      for (const field of required) {
        if (!(field in data) || data[field as keyof T] == null) {
          throw new Error(`Required field '${field}' is missing`);
        }
      }
    }

    // Check format constraints
    if (format) {
      for (const [field, pattern] of Object.entries(format)) {
        const value = data[field as keyof T];
        if (value != null) {
          const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
          if (!regex.test(String(value))) {
            throw new Error(`Field '${field}' does not match required format`);
          }
        }
      }
    }

    // Check range constraints
    if (range) {
      for (const [field, constraint] of Object.entries(range)) {
        const value = data[field as keyof T];
        if (typeof value === 'number') {
          if (constraint.min != null && value < constraint.min) {
            throw new Error(`Field '${field}' must be at least ${constraint.min}`);
          }
          if (constraint.max != null && value > constraint.max) {
            throw new Error(`Field '${field}' must be at most ${constraint.max}`);
          }
        }
      }
    }
  }

  /**
   * Transform input data before saving
   */
  protected transformInput(data: Partial<T>): Partial<T> {
    if (!this.metadata.transforms?.input) return data;

    const transformed = { ...data };
    for (const [field, transform] of Object.entries(this.metadata.transforms.input)) {
      if (field in transformed) {
        transformed[field as keyof T] = transform(transformed[field as keyof T]);
      }
    }

    return transformed;
  }

  /**
   * Transform output data after loading
   */
  protected transformOutput(data: any): Partial<T> {
    if (!this.metadata.transforms?.output) return data as Partial<T>;

    const transformed = { ...data };
    for (const [field, transform] of Object.entries(this.metadata.transforms.output)) {
      if (field in transformed) {
        transformed[field] = transform(transformed[field]);
      }
    }

    return transformed as Partial<T>;
  }

  /**
   * Build WHERE clause for queries
   */
  protected buildWhereClause(where?: Neo4jWhereClause, options: ModelQueryOptions<T> = {}): string {
    const conditions: string[] = [];

    // Add soft delete filter
    if (!options.includeDeleted) {
      conditions.push('(n.deletedAt IS NULL OR n.deletedAt = "")');
    }

    // Add custom where conditions
    if (where) {
      for (const [key, value] of Object.entries(where)) {
        if (value != null) {
          conditions.push(`n.${key} = $${key}`);
        }
      }
    }

    return conditions.length > 0 ? `{${conditions.join(' AND ')}}` : '';
  }

  /**
   * Build ORDER BY clause
   */
  protected buildOrderClause(orderBy?: Neo4jSortOrderArray<T>): string {
    if (!orderBy || orderBy.length === 0) return '';

    const orderExpressions = orderBy.map(order => `n.${order.property} ${order.direction}`);
    return `ORDER BY ${orderExpressions.join(', ')}`;
  }

  /**
   * Build LIMIT/SKIP clause
   */
  protected buildLimitClause(limit?: number, skip?: number): string {
    const clauses: string[] = [];

    if (skip && skip > 0) {
      clauses.push(`SKIP ${skip}`);
    }

    if (limit && limit > 0) {
      clauses.push(`LIMIT ${limit}`);
    }

    return clauses.join(' ');
  }

  /**
   * Build INCLUDE clause for related entities
   */
  protected buildIncludeClause(include?: string[]): string {
    if (!include || include.length === 0) return '';

    // This would be expanded to handle relationship traversal
    return include.map(rel => `OPTIONAL MATCH (n)-[:${rel.toUpperCase()}]->(${rel})`).join('\n');
  }

  /**
   * Generate unique ID for new entities
   */
  protected generateId(): string {
    return `${this.metadata.label.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}