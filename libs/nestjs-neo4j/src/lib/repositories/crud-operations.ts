/**
 * Internal CRUD operation helpers for @Repository decorator
 * These are NOT exported as decorators - they are internal implementation details
 * used by the @Repository decorator to generate consistent CRUD methods.
 */

import { Neo4jQueryBuilder } from '../query-builder/neo4j-query-builder';
import type { BaseEntity } from '../types/neo4j-types';
import type { QueryResult } from '../decorators/cypher-query.decorator';

/**
 * Options for find operations
 */
export interface FindOptions<T = any> {
  where?: Partial<T>;
  orderBy?: Array<{
    property: keyof T;
    direction: 'ASC' | 'DESC';
  }>;
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
 * Generate find one query using Neo4jQueryBuilder
 */
export function generateFindOneQuery<TEntity extends BaseEntity>(
  entityType: () => TEntity,
  id: string
): QueryResult {
  const builder = new Neo4jQueryBuilder()
    .match('n', entityType, { id } as Partial<TEntity>)
    .return(['n'])
    .limit(1);
    
  const queryResult = builder.build();
  const label = getEntityLabel(entityType);
  
  return {
    query: queryResult.query,
    params: queryResult.params,
    description: `Find ${label} with ID: ${id}`,
    tags: ['findOne', label.toLowerCase()]
  };
}

/**
 * Generate find many query using Neo4jQueryBuilder
 */
export function generateFindManyQuery<TEntity extends BaseEntity>(
  entityType: () => TEntity,
  options?: FindOptions<TEntity>
): QueryResult {
  const builder = new Neo4jQueryBuilder<TEntity>()
    .match('n', entityType);

  // Add WHERE conditions
  if (options?.where) {
    const whereConditions: string[] = [];
    const whereParams: Record<string, any> = {};
    Object.entries(options.where).forEach(([key, value], index) => {
      const paramName = `whereParam${index}`;
      whereConditions.push(`n.${key} = $${paramName}`);
      whereParams[paramName] = value;
    });
    if (whereConditions.length > 0) {
      builder.whereRaw(whereConditions.join(' AND '), whereParams);
    }
  }

  builder.return(['n']);

  // Add ORDER BY clauses
  if (options?.orderBy && options.orderBy.length > 0) {
    options.orderBy.forEach(order => {
      builder.orderBy(`n.${String(order.property)}`, order.direction);
    });
  }

  // Add pagination
  if (options?.skip) {
    builder.skip(options.skip);
  }
  if (options?.limit) {
    builder.limit(options.limit);
  }

  const queryResult = builder.build();
  const label = getEntityLabel(entityType);
  
  return {
    query: queryResult.query,
    params: queryResult.params,
    description: `Find ${label} entities with filtering`,
    tags: ['findMany', label.toLowerCase()]
  };
}

/**
 * Generate create entity query using Neo4jQueryBuilder
 */
export function generateCreateQuery<TEntity extends BaseEntity>(
  entityType: () => TEntity,
  data: Partial<TEntity>
): QueryResult {
  const label = getEntityLabel(entityType);
  
  // Add automatic fields
  const entityData = {
    ...data,
    id: (data as any).id || `${label.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const builder = new Neo4jQueryBuilder()
    .create(`(n:${label} $data)`, { data: entityData })
    .return(['n']);

  const queryResult = builder.build();
  
  return {
    query: queryResult.query,
    params: queryResult.params,
    description: `Create new ${label} entity`,
    tags: ['create', label.toLowerCase()]
  };
}

/**
 * Generate update entity query using Neo4jQueryBuilder
 */
export function generateUpdateQuery<TEntity extends BaseEntity>(
  entityType: () => TEntity,
  id: string,
  updates: Partial<TEntity>
): QueryResult {
  const label = getEntityLabel(entityType);
  
  // Add automatic fields
  const updateData = {
    ...updates,
    updatedAt: new Date().toISOString()
  };

  const builder = new Neo4jQueryBuilder()
    .match('n', entityType, { id } as Partial<TEntity>)
    .set(updateData)
    .return(['n']);

  const queryResult = builder.build();
  
  return {
    query: queryResult.query,
    params: queryResult.params,
    description: `Update ${label} entity with ID: ${id}`,
    tags: ['update', label.toLowerCase()]
  };
}

/**
 * Generate delete entity query using Neo4jQueryBuilder
 */
export function generateDeleteQuery<TEntity extends BaseEntity>(
  entityType: () => TEntity,
  id: string,
  options?: DeleteOptions
): QueryResult {
  const label = getEntityLabel(entityType);
  
  const builder = new Neo4jQueryBuilder()
    .match('n', entityType, { id } as Partial<TEntity>);

  if (options?.detach) {
    builder.detachDelete(['n']);
  } else {
    builder.delete(['n']);
  }
  
  builder.return(['count(n) > 0 as deleted']);

  const queryResult = builder.build();
  
  return {
    query: queryResult.query,
    params: queryResult.params,
    description: `Delete ${label} entity with ID: ${id}`,
    tags: ['delete', label.toLowerCase()]
  };
}

/**
 * Generate count entities query using Neo4jQueryBuilder
 */
export function generateCountQuery<TEntity extends BaseEntity>(
  entityType: () => TEntity,
  where?: Partial<TEntity>
): QueryResult {
  const builder = new Neo4jQueryBuilder<TEntity>()
    .match('n', entityType);

  // Add WHERE conditions
  if (where) {
    const whereConditions: string[] = [];
    const whereParams: Record<string, any> = {};
    Object.entries(where).forEach(([key, value], index) => {
      const paramName = `whereParam${index}`;
      whereConditions.push(`n.${key} = $${paramName}`);
      whereParams[paramName] = value;
    });
    if (whereConditions.length > 0) {
      builder.whereRaw(whereConditions.join(' AND '), whereParams);
    }
  }

  builder.return(['count(n) as count']);

  const queryResult = builder.build();
  const label = getEntityLabel(entityType);
  
  return {
    query: queryResult.query,
    params: queryResult.params,
    description: `Count ${label} entities`,
    tags: ['count', label.toLowerCase()]
  };
}

/**
 * Generate exists entity query using Neo4jQueryBuilder
 */
export function generateExistsQuery<TEntity extends BaseEntity>(
  entityType: () => TEntity,
  id: string
): QueryResult {
  const builder = new Neo4jQueryBuilder()
    .match('n', entityType, { id } as Partial<TEntity>)
    .return(['count(n) > 0 as exists']);

  const queryResult = builder.build();
  const label = getEntityLabel(entityType);
  
  return {
    query: queryResult.query,
    params: queryResult.params,
    description: `Check if ${label} exists with ID: ${id}`,
    tags: ['exists', label.toLowerCase()]
  };
}