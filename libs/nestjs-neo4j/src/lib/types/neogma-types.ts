/**
 * Pure Neogma Types - Clean, type-safe interfaces
 * 
 * This file contains all the type definitions for our clean Neogma implementation.
 * No legacy patterns, no mixed approaches - pure Neogma types only.
 */

// Import actual Neogma types for proper type safety
import type { Neogma as NeogmaInstance, NeogmaModel as BaseNeogmaModel, QueryBuilder, Neo4jSupportedProperties } from 'neogma';

// Core Neogma types - properly typed for enterprise use with correct generics
export type NeogmaModel<
  SchemaType extends Neo4jSupportedProperties = Neo4jSupportedProperties,
  PrimaryKeyField extends Record<string, unknown> = Record<string, unknown>,
  RelationshipCreationKeys extends Record<string, unknown> = Record<string, unknown>,
  StaticsType extends Record<string, unknown> = Record<string, unknown>
> = BaseNeogmaModel<SchemaType, PrimaryKeyField, RelationshipCreationKeys, StaticsType>;

export type NeogmaInstanceType<T> = T & { toJson(): T }; // Instance type with toJson method
export type Where<T = Record<string, unknown>> = Partial<T>; // Where clause type
export type Neogma = NeogmaInstance; // The main Neogma instance
export type NeogmaQueryBuilder = QueryBuilder; // QueryBuilder type from neogma

/**
 * Base entity interface that all Neogma entities must implement
 */
export interface NeogmaEntity extends Record<string, unknown> {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Generic Neogma model interface with proper type safety
 */
export interface TypedNeogmaModel<T extends NeogmaEntity> {
  findOne(options: { where: Partial<T> }): Promise<NeogmaInstanceType<T> | null>;
  findMany(options?: { 
    where?: Partial<T>; 
    limit?: number; 
    skip?: number;
    orderBy?: Array<{ [K in keyof T]?: 'ASC' | 'DESC' }>;
  }): Promise<NeogmaInstanceType<T>[]>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<NeogmaInstanceType<T>>;
  update(
    data: Partial<Omit<T, 'id' | 'createdAt'>>, 
    options: { where: Partial<T> }
  ): Promise<NeogmaInstanceType<T> | null>;
  delete(options: { where: Partial<T>; detach?: boolean }): Promise<number>;
  count(options?: { where?: Partial<T> }): Promise<number>;
  getLabel(): string;
}

/**
 * Query options for Neogma operations
 */
export interface NeogmaQueryOptions {
  /** Transaction context */
  session?: any;
  /** Database name */
  database?: string;
  /** Query timeout */
  timeout?: number;
}

/**
 * Find options with type safety
 */
export interface TypedFindOptions<T extends NeogmaEntity> {
  where?: Where<T>;
  limit?: number;
  skip?: number;
  orderBy?: Array<{
    field: keyof T;
    direction: 'ASC' | 'DESC';
  }>;
}

/**
 * Relationship configuration for typed relationships
 */
export interface TypedRelationshipConfig<
  TSource extends NeogmaEntity,
  TTarget extends NeogmaEntity,
  TRelProps = Record<string, any>
> {
  type: string;
  direction: 'IN' | 'OUT' | 'BOTH';
  sourceModel: TypedNeogmaModel<TSource>;
  targetModel: TypedNeogmaModel<TTarget>;
  properties?: TRelProps;
}

/**
 * Graph traversal options with full type safety
 */
export interface TypedGraphTraversalOptions<T extends NeogmaEntity> {
  maxDepth?: number;
  minDepth?: number;
  relationshipTypes?: string[];
  direction?: 'IN' | 'OUT' | 'BOTH';
  nodeFilter?: Where<T>;
  relationshipFilter?: Where;
  limit?: number;
}

/**
 * Path result with type safety
 */
export interface TypedPathResult<T extends NeogmaEntity> {
  nodes: T[];
  relationships: any[];
  length: number;
  weight?: number;
}

/**
 * Repository interface with full Neogma typing
 */
export interface NeogmaRepository<T extends NeogmaEntity> {
  // Basic CRUD with type safety
  findById(id: string): Promise<T | null>;
  findMany(options?: TypedFindOptions<T>): Promise<T[]>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: string, data: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  count(where?: Where<T>): Promise<number>;
  exists(id: string): Promise<boolean>;
}

/**
 * Graph repository interface with type safety
 */
export interface NeogmaGraphRepository<T extends NeogmaEntity> extends NeogmaRepository<T> {
  // Graph-specific operations
  findNeighbors(nodeId: string, options?: TypedGraphTraversalOptions<T>): Promise<T[]>;
  findShortestPath(fromId: string, toId: string): Promise<TypedPathResult<T> | null>;
  calculateDegreeCentrality(nodeId: string): Promise<number>;
}

/**
 * Service interface with type safety and QueryBuilder support
 */
export interface NeogmaService {
  // Model operations
  getModel<T extends NeogmaEntity>(modelName: string): TypedNeogmaModel<T>;
  
  // Query operations (legacy - prefer QueryBuilder)
  query<T = any>(cypher: string, params?: Record<string, any>): Promise<T[]>;
  queryOne<T = any>(cypher: string, params?: Record<string, any>): Promise<T | null>;
  
  // QueryBuilder operations (preferred)
  createQueryBuilder(): NeogmaQueryBuilder;
  executeQueryBuilder<T = any>(queryBuilder: NeogmaQueryBuilder): Promise<T[]>;
  executeQueryBuilderOne<T = any>(queryBuilder: NeogmaQueryBuilder): Promise<T | null>;
  
  // Transaction operations
  transaction<T>(work: (tx: any) => Promise<T>): Promise<T>;
  
  // Health operations
  healthCheck(): Promise<{ connected: boolean; latency?: number }>;
}

/**
 * Model registration interface
 */
export interface ModelRegistration<T extends NeogmaEntity> {
  name: string;
  schema: NeogmaModelSchema<T>;
  relationships?: Record<string, TypedRelationshipConfig<any, any>>;
}

/**
 * Schema definition for Neogma models
 */
export interface NeogmaModelSchema<T extends NeogmaEntity> {
  label: string;
  properties: {
    [K in keyof T]: {
      type: 'string' | 'number' | 'boolean' | 'datetime' | 'array' | 'object';
      required?: boolean;
      default?: T[K];
      unique?: boolean;
      index?: boolean;
    };
  };
  primaryKey?: keyof T;
}

/**
 * Error types for better error handling
 */
export class NeogmaNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NeogmaNotFoundError';
  }
}

export class NeogmaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NeogmaValidationError';
  }
}

export class NeogmaConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NeogmaConnectionError';
  }
}

/**
 * Transaction context for proper transaction handling
 */
export interface NeogmaTransactionContext {
  id: string;
  startTime: Date;
  operations: number;
}

/**
 * Metrics interface for monitoring
 */
export interface NeogmaMetrics {
  totalQueries: number;
  averageQueryTime: number;
  activeConnections: number;
  errorRate: number;
  lastError?: Error;
}