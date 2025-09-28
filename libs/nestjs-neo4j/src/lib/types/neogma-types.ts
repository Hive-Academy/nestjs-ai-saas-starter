/**
 * @fileoverview Neogma Type Definitions - Based on Actual Neogma 1.14.1 API
 *
 * This file provides type definitions that properly interface with the real Neogma library.
 * Based on actual Neogma types and patterns, not custom abstractions.
 */

import type { Record as Neo4jRecord } from 'neo4j-driver';
import type { QueryBuilder } from 'neogma';

// Re-export essential Neogma types for our use
export type { Neogma, QueryBuilder } from 'neogma';

/**
 * Base entity interface - compatible with Neogma patterns
 */
export interface NeogmaEntity {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

/**
 * Find options for our high-level API
 */
export interface FindOptions<T = any> {
  where?: Partial<T>;
  orderBy?: Array<{ [K in keyof T]?: 'ASC' | 'DESC' }>;
  limit?: number;
  skip?: number;
}

/**
 * Query result wrapper that includes metrics
 */
export interface QueryResult {
  records: Neo4jRecord[];
  summary: any;
  metrics?: {
    executionTime: number;
    recordCount: number;
  };
}

/**
 * Service metrics interface
 */
export interface NeogmaMetrics {
  totalQueries: number;
  averageQueryTime: number;
  activeConnections: number;
  errorRate: number;
  lastError?: string;
}

/**
 * High-level model interface for our service layer
 * This is our abstraction over Neogma models
 */
export interface NeogmaModelInterface {
  findOne(options: {
    where: Partial<NeogmaEntity>;
  }): Promise<{ toJson(): Record<string, unknown> } | null>;
  findMany(options?: {
    where?: Partial<NeogmaEntity>;
    limit?: number;
    skip?: number;
    orderBy?: Array<{ [key: string]: 'ASC' | 'DESC' }>;
  }): Promise<Array<{ toJson(): Record<string, unknown> }>>;
  create(
    data: Omit<NeogmaEntity, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<{ toJson(): Record<string, unknown> }>;
  update(
    data: Partial<Omit<NeogmaEntity, 'id' | 'createdAt'>>,
    options: { where: Partial<NeogmaEntity> }
  ): Promise<{ toJson(): Record<string, unknown> } | null>;
  delete(options: {
    where: Partial<NeogmaEntity>;
    detach?: boolean;
  }): Promise<number>;
  count(options?: { where?: Partial<NeogmaEntity> }): Promise<number>;
  getLabel(): string;
}

/**
 * Typed model interface for type safety
 */
export type TypedNeogmaModel<T extends NeogmaEntity> = NeogmaModelInterface;

/**
 * Alias for compatibility
 */
export type NeogmaModel<T extends NeogmaEntity = NeogmaEntity> =
  TypedNeogmaModel<T>;

/**
 * Our high-level service interface
 */
export interface INeogmaService {
  // Model registration (our custom layer)
  registerModel<T extends NeogmaEntity>(
    name: string,
    model: TypedNeogmaModel<T>
  ): void;
  getModel<T extends NeogmaEntity>(modelName: string): TypedNeogmaModel<T>;
  getRegisteredModels(): string[];

  // High-level CRUD operations (our abstraction)
  findById<T extends NeogmaEntity>(
    modelName: string,
    id: string
  ): Promise<T | null>;
  findMany<T extends NeogmaEntity>(
    modelName: string,
    options?: FindOptions<T>
  ): Promise<T[]>;
  create<T extends NeogmaEntity>(
    modelName: string,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<T>;
  update<T extends NeogmaEntity>(
    modelName: string,
    id: string,
    updates: Partial<Omit<T, 'id' | 'createdAt'>>
  ): Promise<T | null>;
  delete<T extends NeogmaEntity>(
    modelName: string,
    id: string,
    detach?: boolean
  ): Promise<boolean>;
  count<T extends NeogmaEntity>(
    modelName: string,
    where?: Partial<T>
  ): Promise<number>;
  exists<T extends NeogmaEntity>(
    modelName: string,
    id: string
  ): Promise<boolean>;

  // Direct Neogma access
  run(cypher: string, params?: Record<string, any>): Promise<QueryResult>;
  createQueryBuilder(): QueryBuilder;

  // Connection management
  verifyConnectivity(): Promise<void>;
  close(): Promise<void>;

  // Metrics
  getMetrics(): NeogmaMetrics;
}

/**
 * Neogma query builder interface
 * This re-exports the actual Neogma QueryBuilder type
 */
export type NeogmaQueryBuilder = QueryBuilder;

/**
 * Error classes
 */
export class NeogmaNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NeogmaNotFoundError';
  }
}

export class NeogmaConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NeogmaConnectionError';
  }
}

/**
 * Type aliases for backward compatibility
 */
export type TypedFindOptions<T> = FindOptions<T>;
export type NeogmaInstanceType<T> = T & { toJson(): T };

/**
 * Configuration interfaces
 */
export interface TransactionConfig {
  timeout?: number;
  metadata?: Record<string, any>;
}

export interface QueryExecutionOptions {
  timeout?: number;
  cache?: {
    enabled: boolean;
    ttl: number;
  };
}

/**
 * Repository interface for our @Repository decorator
 */
export interface NeogmaRepository<T extends NeogmaEntity = NeogmaEntity> {
  findById(id: string): Promise<T | null>;
  findAll(options?: FindOptions<T>): Promise<T[]>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  count(where?: Partial<T>): Promise<number>;
  exists(id: string): Promise<boolean>;
}
