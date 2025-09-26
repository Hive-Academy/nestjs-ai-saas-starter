/**
 * CRUD operation helpers using Neogma models directly
 * These are internal implementation details for the @Repository decorator.
 * Uses Neogma's model methods: model.findOne(), model.create(), etc.
 */

import type {
  Neo4jCompatibleEntity,
  Neo4jQueryParams,
  Neo4jRecordShape,
  Neo4jSortOrder,
} from '../types/neo4j-types';
import type { Neogma, NeogmaModel } from 'neogma';

/**
 * Query specification for CRUD operations
 */
export interface CrudQuerySpec {
  query: string;
  params: Neo4jQueryParams;
  description: string;
  tags: string[];
}

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
 * Get entity label from entity type
 */
export function getEntityLabel(entityType: () => any): string {
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
 * Neogma model interface for type safety
 */
export interface NeogmaModelInterface {
  findOne(options: {
    where: Record<string, unknown>;
  }): Promise<{ toJson(): Neo4jCompatibleEntity } | null>;
  findMany(options?: {
    where?: Record<string, unknown>;
    order?: Record<string, string>[];
    limit?: number;
    skip?: number;
  }): Promise<Array<{ toJson(): Neo4jCompatibleEntity }>>;
  create(
    data: Record<string, unknown>
  ): Promise<{ toJson(): Neo4jCompatibleEntity }>;
  update(
    data: Record<string, unknown>,
    options: { where: Record<string, unknown> }
  ): Promise<{ toJson(): Neo4jCompatibleEntity } | null>;
  delete(options: {
    where: Record<string, unknown>;
    detach?: boolean;
  }): Promise<number>;
  count(options?: { where?: Record<string, unknown> }): Promise<number>;
  getLabel?(): string;
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
    return result ? result.toJson() : null;
  } catch (error) {
    console.error('FindOne operation failed:', error);
    throw error;
  }
}

/**
 * Generate find one query spec for metadata purposes
 */
export function generateFindOneQuery<TEntity extends Neo4jCompatibleEntity>(
  entityType: () => TEntity,
  id: string
): CrudQuerySpec {
  const label = getEntityLabel(entityType);

  return {
    query: `MATCH (n:${label}) WHERE n.id = $id RETURN n LIMIT 1`,
    params: { id },
    description: `Find ${label} with ID: ${id}`,
    tags: ['findOne', label.toLowerCase()],
  };
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
 * Generate find many query spec for metadata purposes
 */
export function generateFindManyQuery<TEntity extends Neo4jCompatibleEntity>(
  entityType: () => TEntity,
  options?: FindOptions<TEntity>
): CrudQuerySpec {
  const label = getEntityLabel(entityType);

  let query = `MATCH (n:${label})`;
  const params: Neo4jQueryParams = {};

  if (options?.where) {
    const conditions = Object.entries(options.where)
      .map(([key, value], index) => {
        params[`param${index}`] = value;
        return `n.${key} = $param${index}`;
      })
      .join(' AND ');
    query += ` WHERE ${conditions}`;
  }

  query += ' RETURN n';

  if (options?.orderBy && options.orderBy.length > 0) {
    const orderClauses = options.orderBy
      .map((order) => `n.${String(order.property)} ${order.direction}`)
      .join(', ');
    query += ` ORDER BY ${orderClauses}`;
  }

  if (options?.skip) {
    query += ` SKIP ${options.skip}`;
  }

  if (options?.limit) {
    query += ` LIMIT ${options.limit}`;
  }

  return {
    query,
    params,
    description: `Find ${label} entities with filtering`,
    tags: ['findMany', label.toLowerCase()],
  };
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
 * Generate create query spec for metadata purposes
 */
export function generateCreateQuery<TEntity extends Neo4jCompatibleEntity>(
  entityType: () => TEntity,
  data: Partial<TEntity>
): CrudQuerySpec {
  const label = getEntityLabel(entityType);

  // Add automatic fields
  const entityData = {
    ...data,
    id:
      (data as any).id ||
      `${label.toLowerCase()}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    query: `CREATE (n:${label} $entityData) RETURN n`,
    params: { entityData },
    description: `Create new ${label} entity`,
    tags: ['create', label.toLowerCase()],
  };
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
    // Add automatic fields
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
 * Generate update query spec for metadata purposes
 */
export function generateUpdateQuery<TEntity extends Neo4jCompatibleEntity>(
  entityType: () => TEntity,
  id: string,
  updates: Partial<TEntity>
): CrudQuerySpec {
  const label = getEntityLabel(entityType);

  // Add automatic fields
  const updateData = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const setClause = Object.keys(updateData)
    .map((key) => `n.${key} = $${key}`)
    .join(', ');

  return {
    query: `MATCH (n:${label}) WHERE n.id = $id SET ${setClause} RETURN n`,
    params: { id, ...updateData },
    description: `Update ${label} entity with ID: ${id}`,
    tags: ['update', label.toLowerCase()],
  };
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
    const result = await model.delete({
      where: { id },
      detach: options?.detach,
    });
    return result > 0;
  } catch (error) {
    console.error('Delete operation failed:', error);
    throw error;
  }
}

/**
 * Generate delete query spec for metadata purposes
 */
export function generateDeleteQuery<TEntity extends Neo4jCompatibleEntity>(
  entityType: () => TEntity,
  id: string,
  options?: DeleteOptions
): CrudQuerySpec {
  const label = getEntityLabel(entityType);

  const deleteClause = options?.detach ? 'DETACH DELETE n' : 'DELETE n';

  return {
    query: `MATCH (n:${label}) WHERE n.id = $id ${deleteClause} RETURN count(n) > 0 as deleted`,
    params: { id },
    description: `Delete ${label} entity with ID: ${id}`,
    tags: ['delete', label.toLowerCase()],
  };
}

/**
 * Count entities using direct Neogma model method
 */
export async function count<TEntity extends Neo4jCompatibleEntity>(
  model: NeogmaModelInterface,
  where?: Partial<TEntity>
): Promise<number> {
  try {
    const queryOptions = where ? { where } : {};
    const result = await model.count(queryOptions);
    return result;
  } catch (error) {
    console.error('Count operation failed:', error);
    throw error;
  }
}

/**
 * Generate count query spec for metadata purposes
 */
export function generateCountQuery<TEntity extends Neo4jCompatibleEntity>(
  entityType: () => TEntity,
  where?: Partial<TEntity>
): CrudQuerySpec {
  const label = getEntityLabel(entityType);

  let query = `MATCH (n:${label})`;
  const params: Neo4jQueryParams = {};

  if (where) {
    const conditions = Object.entries(where)
      .map(([key, value], index) => {
        params[`param${index}`] = value;
        return `n.${key} = $param${index}`;
      })
      .join(' AND ');
    query += ` WHERE ${conditions}`;
  }

  query += ' RETURN count(n) as count';

  return {
    query,
    params,
    description: `Count ${label} entities`,
    tags: ['count', label.toLowerCase()],
  };
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

/**
 * Generate exists query spec for metadata purposes
 */
export function generateExistsQuery<TEntity extends Neo4jCompatibleEntity>(
  entityType: () => TEntity,
  id: string
): CrudQuerySpec {
  const label = getEntityLabel(entityType);

  return {
    query: `MATCH (n:${label}) WHERE n.id = $id RETURN count(n) > 0 as exists`,
    params: { id },
    description: `Check if ${label} exists with ID: ${id}`,
    tags: ['exists', label.toLowerCase()],
  };
}
