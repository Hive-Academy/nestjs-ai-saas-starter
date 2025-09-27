/**
 * CRUD operation helpers using Neogma models directly
 * These are internal implementation details for the @Repository decorator.
 * Uses Neogma's model methods: model.findOne(), model.create(), etc.
 * NO RAW CYPHER QUERIES - Pure Neogma model operations only.
 */

import type {
  Neo4jCompatibleEntity,
  Neo4jRecordShape,
  Neo4jSortOrder,
} from '../types/neo4j-types';

export interface FindOptions<T = Neo4jRecordShape> {
  where?: Partial<T>;
  orderBy?: Array<Neo4jSortOrder<T>>;
  limit?: number;
  skip?: number;
}

/**
 * Options for delete operations
 */
export interface DeleteOptions {
  detach?: boolean;
}

/**
 * Neogma model interface for CRUD operations
 */
export interface NeogmaModelInterface {
  findOne(options: { where: Record<string, unknown> }): Promise<{ toJson(): any } | null>;
  findMany(options?: any): Promise<Array<{ toJson(): any }>>;
  create(data: Record<string, unknown>): Promise<{ toJson(): any }>;
  update(data: Record<string, unknown>, options: { where: Record<string, unknown> }): Promise<{ toJson(): any } | null>;
  delete(options: { where: Record<string, unknown>; detach?: boolean }): Promise<number>;
  count(options?: { where?: Record<string, unknown> }): Promise<number>;
  getLabel(): string | undefined;
}

/**
 * Get entity label from entity type
 */
export function getEntityLabel(entityType: () => unknown): string {
  try {
    const entity = entityType();
    if (typeof entity === 'function') {
      return entity.name;
    }
    if (entity && entity.constructor) {
      return entity.constructor.name;
    }
    return 'Entity';
  } catch {
    return 'Entity';
  }
}

/**
 * Find one entity using direct Neogma model method
 */
export async function findOne<TEntity extends Neo4jCompatibleEntity>(
  model: NeogmaModelInterface,
  id: string
): Promise<TEntity | null> {
  try {
    const result = await model.findOne({ where: { id } });
    return result ? (result.toJson() as TEntity) : null;
  } catch (error) {
    console.error('FindOne operation failed:', error);
    throw error;
  }
}

/**
 * Find many entities using direct Neogma model method
 */
export async function findMany<TEntity extends Neo4jCompatibleEntity>(
  model: NeogmaModelInterface,
  options?: FindOptions<TEntity>
): Promise<TEntity[]> {
  try {
    const queryOptions: {
      where?: Partial<TEntity>;
      order?: Record<string, string>[];
      limit?: number;
      skip?: number;
    } = {};

    if (options?.where) {
      queryOptions.where = options.where;
    }

    if (options?.orderBy && options.orderBy.length > 0) {
      queryOptions.order = options.orderBy.map((order) => ({
        [order.property as string]: order.direction,
      }));
    }

    if (options?.limit) {
      queryOptions.limit = options.limit;
    }

    if (options?.skip) {
      queryOptions.skip = options.skip;
    }

    const results = await model.findMany(queryOptions);
    return results.map((result) => result.toJson() as TEntity);
  } catch (error) {
    console.error('FindMany operation failed:', error);
    throw error;
  }
}

/**
 * Create entity using direct Neogma model method
 */
export async function create<TEntity extends Neo4jCompatibleEntity>(
  model: NeogmaModelInterface,
  data: Partial<TEntity>
): Promise<TEntity> {
  try {
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
    return result.toJson() as TEntity;
  } catch (error) {
    console.error('Create operation failed:', error);
    throw error;
  }
}

/**
 * Update entity using direct Neogma model method
 */
export async function update<TEntity extends Neo4jCompatibleEntity>(
  model: NeogmaModelInterface,
  id: string,
  updates: Partial<TEntity>
): Promise<TEntity | null> {
  try {
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const result = await model.update(updateData, { where: { id } });
    return result ? (result.toJson() as TEntity) : null;
  } catch (error) {
    console.error('Update operation failed:', error);
    throw error;
  }
}

/**
 * Delete entity using direct Neogma model method
 */
export async function deleteEntity<TEntity extends Neo4jCompatibleEntity>(
  model: NeogmaModelInterface,
  id: string,
  options?: DeleteOptions
): Promise<boolean> {
  try {
    const deletedCount = await model.delete({
      where: { id },
      detach: options?.detach ?? true,
    });
    return deletedCount > 0;
  } catch (error) {
    console.error('Delete operation failed:', error);
    throw error;
  }
}

/**
 * Count entities using direct Neogma model method
 */
export async function count<TEntity extends Neo4jCompatibleEntity>(
  model: NeogmaModelInterface,
  where?: Partial<TEntity>
): Promise<number> {
  try {
    return await model.count(where ? { where } : undefined);
  } catch (error) {
    console.error('Count operation failed:', error);
    throw error;
  }
}

/**
 * Check if entity exists using direct Neogma model method
 */
export async function exists<TEntity extends Neo4jCompatibleEntity>(
  model: NeogmaModelInterface,
  id: string
): Promise<boolean> {
  try {
    const result = await model.findOne({ where: { id } });
    return result !== null;
  } catch (error) {
    console.error('Exists operation failed:', error);
    throw error;
  }
}