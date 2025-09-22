import { Logger } from '@nestjs/common';
import type {
  QueryOptions,
  QueryResult,
} from '../interfaces/query-result.interface';

/**
 * Query options for repository operations
 */
export interface RepositoryQueryOptions extends QueryOptions {
  /** Include soft-deleted records */
  includeSoftDeleted?: boolean;
  /** Populate relationships */
  populate?: string[];
  /** Select specific fields */
  select?: string[];
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  /** Page number (1-based) */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Offset from start */
  offset?: number;
}

/**
 * Sorting options
 */
export interface SortOptions {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  direction: 'ASC' | 'DESC';
}

/**
 * Find options combining filters, pagination, and sorting
 */
export interface FindOptions {
  /** Where conditions */
  where?: Record<string, any>;
  /** Sorting configuration */
  sort?: SortOptions | SortOptions[];
  /** Pagination configuration */
  pagination?: PaginationOptions;
  /** Repository query options */
  options?: RepositoryQueryOptions;
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  /** Current page items */
  items: T[];
  /** Total number of items */
  total: number;
  /** Current page number */
  page: number;
  /** Items per page */
  limit: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Whether there is a previous page */
  hasPrev: boolean;
}

/**
 * Abstract base repository class providing common CRUD operations
 *
 * This class serves as the foundation for all Neo4j repositories and provides:
 * - Standard CRUD operations with type safety
 * - Query builder helpers
 * - Pagination and sorting utilities
 * - Error handling and logging
 * - Performance monitoring integration
 * - Transaction management
 *
 * @template T The entity type this repository manages
 */
export abstract class BaseRepository<T = any> {
  protected readonly logger: Logger;
  protected abstract readonly entityLabel: string;
  protected abstract readonly neo4jService: any;
  protected readonly defaultOptions: RepositoryQueryOptions = {};

  constructor(
    entityLabel?: string,
    neo4jService?: any,
    defaultOptions?: RepositoryQueryOptions
  ) {
    this.logger = new Logger(this.constructor.name);

    if (entityLabel) {
      (this as any).entityLabel = entityLabel;
    }

    if (neo4jService) {
      (this as any).neo4jService = neo4jService;
    }

    if (defaultOptions) {
      this.defaultOptions = { ...this.defaultOptions, ...defaultOptions };
    }
  }

  /**
   * Find a single entity by ID
   */
  async findById(
    id: string,
    options?: RepositoryQueryOptions
  ): Promise<T | null> {
    const query = `
      MATCH (n:${this.entityLabel} {id: $id})
      ${this.buildSoftDeleteFilter(options)}
      RETURN n
      LIMIT 1
    `;

    const result = await this.executeQuery<T>(query, { id }, options);
    return result.length > 0 ? this.mapFromNeo4j(result[0]) : null;
  }

  /**
   * Find all entities matching the given criteria
   */
  async findAll(findOptions?: FindOptions): Promise<T[]> {
    const { query, params } = this.buildFindQuery(findOptions);
    const result = await this.executeQuery<T>(
      query,
      params,
      findOptions?.options
    );
    return result.map((record) => this.mapFromNeo4j(record));
  }

  /**
   * Find entities with pagination
   */
  async findPaginated(findOptions?: FindOptions): Promise<PaginatedResult<T>> {
    const pagination = findOptions?.pagination || { page: 1, limit: 10 };
    const offset =
      pagination.offset ??
      ((pagination.page || 1) - 1) * (pagination.limit || 10);

    // Get total count
    const countQuery = this.buildCountQuery(findOptions);
    const countResult = await this.executeQuery<{ count: number }>(
      countQuery.query,
      countQuery.params,
      findOptions?.options
    );
    const total = countResult[0]?.count || 0;

    // Get paginated results
    const findOptionsWithPagination = {
      ...findOptions,
      pagination: {
        ...pagination,
        offset,
      },
    };

    const items = await this.findAll(findOptionsWithPagination);

    const limit = pagination.limit || 10;
    const page = pagination.page || 1;
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Find a single entity matching the given criteria
   */
  async findOne(
    where: Partial<T>,
    options?: RepositoryQueryOptions
  ): Promise<T | null> {
    const findOptions: FindOptions = {
      where: where as Record<string, any>,
      pagination: { limit: 1 },
      options,
    };

    const results = await this.findAll(findOptions);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Create a new entity
   */
  async create(data: Partial<T>, options?: RepositoryQueryOptions): Promise<T> {
    const entityData = this.mapToNeo4j(data);

    // Generate ID if not provided
    if (!entityData.id) {
      entityData.id = this.generateId();
    }

    // Add timestamps
    const now = new Date().toISOString();
    entityData.createdAt = entityData.createdAt || now;
    entityData.updatedAt = now;

    const labels = this.getEntityLabels();
    const labelString = labels.map((label) => `:${label}`).join('');

    const query = `
      CREATE (n${labelString} $data)
      RETURN n
    `;

    const mergedOptions = {
      ...this.defaultOptions,
      ...options,
      accessMode: 'WRITE' as const,
    };
    const result = await this.executeQuery<T>(
      query,
      { data: entityData },
      mergedOptions
    );

    if (result.length === 0) {
      throw new Error(`Failed to create ${this.entityLabel} entity`);
    }

    return this.mapFromNeo4j(result[0]);
  }

  /**
   * Update an existing entity
   */
  async update(
    id: string,
    updates: Partial<T>,
    options?: RepositoryQueryOptions
  ): Promise<T | null> {
    const updateData = this.mapToNeo4j(updates);

    // Add updated timestamp
    updateData.updatedAt = new Date().toISOString();

    const query = `
      MATCH (n:${this.entityLabel} {id: $id})
      ${this.buildSoftDeleteFilter(options)}
      SET n += $updates
      RETURN n
    `;

    const mergedOptions = {
      ...this.defaultOptions,
      ...options,
      accessMode: 'WRITE' as const,
    };
    const result = await this.executeQuery<T>(
      query,
      { id, updates: updateData },
      mergedOptions
    );

    return result.length > 0 ? this.mapFromNeo4j(result[0]) : null;
  }

  /**
   * Delete an entity (soft delete by default)
   */
  async delete(
    id: string,
    options?: RepositoryQueryOptions & { hard?: boolean }
  ): Promise<boolean> {
    if (options?.hard) {
      return this.hardDelete(id, options);
    } else {
      return this.softDelete(id, options);
    }
  }

  /**
   * Soft delete an entity
   */
  async softDelete(
    id: string,
    options?: RepositoryQueryOptions
  ): Promise<boolean> {
    const query = `
      MATCH (n:${this.entityLabel} {id: $id})
      WHERE n.deletedAt IS NULL
      SET n.deletedAt = $deletedAt
      RETURN count(n) > 0 as deleted
    `;

    const mergedOptions = {
      ...this.defaultOptions,
      ...options,
      accessMode: 'WRITE' as const,
    };
    const result = await this.executeQuery<{ deleted: boolean }>(
      query,
      { id, deletedAt: new Date().toISOString() },
      mergedOptions
    );

    return result[0]?.deleted || false;
  }

  /**
   * Hard delete an entity
   */
  async hardDelete(
    id: string,
    options?: RepositoryQueryOptions
  ): Promise<boolean> {
    const query = `
      MATCH (n:${this.entityLabel} {id: $id})
      DELETE n
      RETURN count(n) > 0 as deleted
    `;

    const mergedOptions = {
      ...this.defaultOptions,
      ...options,
      accessMode: 'WRITE' as const,
    };
    const result = await this.executeQuery<{ deleted: boolean }>(
      query,
      { id },
      mergedOptions
    );

    return result[0]?.deleted || false;
  }

  /**
   * Restore a soft-deleted entity
   */
  async restore(
    id: string,
    options?: RepositoryQueryOptions
  ): Promise<boolean> {
    const query = `
      MATCH (n:${this.entityLabel} {id: $id})
      WHERE n.deletedAt IS NOT NULL
      REMOVE n.deletedAt
      RETURN count(n) > 0 as restored
    `;

    const mergedOptions = {
      ...this.defaultOptions,
      ...options,
      accessMode: 'WRITE' as const,
    };
    const result = await this.executeQuery<{ restored: boolean }>(
      query,
      { id },
      mergedOptions
    );

    return result[0]?.restored || false;
  }

  /**
   * Count entities matching the given criteria
   */
  async count(
    where?: Partial<T>,
    options?: RepositoryQueryOptions
  ): Promise<number> {
    const { query, params } = this.buildCountQuery({
      where: where as Record<string, any>,
      options,
    });
    const result = await this.executeQuery<{ count: number }>(
      query,
      params,
      options
    );
    return result[0]?.count || 0;
  }

  /**
   * Check if an entity exists
   */
  async exists(id: string, options?: RepositoryQueryOptions): Promise<boolean> {
    const query = `
      MATCH (n:${this.entityLabel} {id: $id})
      ${this.buildSoftDeleteFilter(options)}
      RETURN count(n) > 0 as exists
    `;

    const result = await this.executeQuery<{ exists: boolean }>(
      query,
      { id },
      options
    );
    return result[0]?.exists || false;
  }

  /**
   * Execute a raw Cypher query
   */
  protected async executeQuery<TResult = any>(
    query: string,
    params?: Record<string, any>,
    options?: RepositoryQueryOptions
  ): Promise<TResult[]> {
    const mergedOptions = { ...this.defaultOptions, ...options };

    try {
      let result: any;

      if (typeof this.neo4jService.run === 'function') {
        const returnedResult: QueryResult =
          await this.neo4jService.run(query, params, mergedOptions);
        result = returnedResult.records;
      } else {
        const standardResult = await this.neo4jService.run(
          query,
          params,
          mergedOptions
        );
        result = standardResult.records || standardResult;
      }

      return Array.isArray(result) ? result : [result];
    } catch (error) {
      this.logger.error(`Query execution failed in ${this.constructor.name}:`, {
        query,
        params,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Build find query with conditions, sorting, and pagination
   */
  protected buildFindQuery(findOptions?: FindOptions): {
    query: string;
    params: Record<string, any>;
  } {
    let query = `MATCH (n:${this.entityLabel})`;
    const params: Record<string, any> = {};

    // Add where conditions
    if (findOptions?.where && Object.keys(findOptions.where).length > 0) {
      const whereConditions: string[] = [];
      Object.entries(findOptions.where).forEach(([key, value]) => {
        const paramName = `where_${key}`;
        whereConditions.push(`n.${key} = $${paramName}`);
        params[paramName] = value;
      });
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add soft delete filter
    const softDeleteFilter = this.buildSoftDeleteFilter(findOptions?.options);
    if (softDeleteFilter) {
      query += findOptions?.where
        ? ` AND ${softDeleteFilter.replace('WHERE ', '')}`
        : ` ${softDeleteFilter}`;
    }

    query += ' RETURN n';

    // Add sorting
    if (findOptions?.sort) {
      const sortClauses = Array.isArray(findOptions.sort)
        ? findOptions.sort
        : [findOptions.sort];
      const orderBy = sortClauses
        .map((sort) => `n.${sort.field} ${sort.direction}`)
        .join(', ');
      query += ` ORDER BY ${orderBy}`;
    }

    // Add pagination
    if (findOptions?.pagination) {
      if (findOptions.pagination.limit) {
        query += ` LIMIT ${findOptions.pagination.limit}`;
      }
      if (findOptions.pagination.offset) {
        query += ` SKIP ${findOptions.pagination.offset}`;
      }
    }

    return { query, params };
  }

  /**
   * Build count query
   */
  protected buildCountQuery(findOptions?: {
    where?: Record<string, any>;
    options?: RepositoryQueryOptions;
  }): { query: string; params: Record<string, any> } {
    let query = `MATCH (n:${this.entityLabel})`;
    const params: Record<string, any> = {};

    // Add where conditions
    if (findOptions?.where && Object.keys(findOptions.where).length > 0) {
      const whereConditions: string[] = [];
      Object.entries(findOptions.where).forEach(([key, value]) => {
        const paramName = `where_${key}`;
        whereConditions.push(`n.${key} = $${paramName}`);
        params[paramName] = value;
      });
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add soft delete filter
    const softDeleteFilter = this.buildSoftDeleteFilter(findOptions?.options);
    if (softDeleteFilter) {
      query += findOptions?.where
        ? ` AND ${softDeleteFilter.replace('WHERE ', '')}`
        : ` ${softDeleteFilter}`;
    }

    query += ' RETURN count(n) as count';

    return { query, params };
  }

  /**
   * Build soft delete filter
   */
  protected buildSoftDeleteFilter(options?: RepositoryQueryOptions): string {
    if (options?.includeSoftDeleted) {
      return '';
    }
    return 'WHERE n.deletedAt IS NULL';
  }

  /**
   * Get entity labels (including additional labels)
   */
  protected getEntityLabels(): string[] {
    return [this.entityLabel];
  }

  /**
   * Map entity from Neo4j format to TypeScript format
   */
  protected mapFromNeo4j(record: any): T {
    if (record && typeof record === 'object' && 'n' in record) {
      return record.n;
    }
    return record;
  }

  /**
   * Map entity from TypeScript format to Neo4j format
   */
  protected mapToNeo4j(entity: Partial<T>): Record<string, any> {
    return entity as Record<string, any>;
  }

  /**
   * Generate a unique ID for new entities
   */
  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
