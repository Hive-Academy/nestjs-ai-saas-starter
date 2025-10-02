/**
 * @fileoverview Neo4j Type Definitions
 *
 * This file provides comprehensive type definitions for Neo4j operations,
 * ensuring type safety across all database interactions.
 */

import type { Integer } from 'neo4j-driver';

/**
 * Primitive types supported by Neo4j
 */
export type Neo4jPrimitive =
  | string
  | number
  | boolean
  | Date
  | null
  | Array<string | number | boolean | Date>;

/**
 * Neo4j compatible value type - more specific than any primitive
 */
export type Neo4jCompatibleValue =
  | Neo4jPrimitive
  | Neo4jPrimitive[]
  | Neo4jRecordShape
  | Neo4jRecordShape[]
  | Integer;

/**
 * Neo4j property object (node or relationship properties)
 */
export type Neo4jProperties = Record<string, Neo4jPrimitive>;

/**
 * Query parameter types for Neo4j operations (FIXED: Using Neo4jCompatibleValue)
 */
export type Neo4jQueryParams = Record<string, Neo4jCompatibleValue>;

/**
 * Where clause interface for type-safe filtering
 */
export interface Neo4jWhereClause {
  [key: string]:
    | Neo4jPrimitive
    | {
        $in?: Neo4jPrimitive[];
        $gt?: number | Date;
        $lt?: number | Date;
        $gte?: number | Date;
        $lte?: number | Date;
        $regex?: string;
        $exists?: boolean;
        $ne?: Neo4jPrimitive;
      };
}

/**
 * Sort order specification with proper type constraints
 */
export interface Neo4jSortOrder<T = Neo4jRecordShape> {
  property: Extract<keyof T, string> | string;
  direction: 'ASC' | 'DESC';
}

/**
 * Generic record shape for Neo4j operations
 */
export interface Neo4jRecordShape {
  [key: string]: Neo4jPrimitive;
}

/**
 * Type-safe property mapping for entities
 */
export type Neo4jPropertyMap<T> = {
  [K in keyof T]: T[K] extends Neo4jPrimitive ? T[K] : never;
};

/**
 * Partial property map for updates
 */
export type Neo4jPartialPropertyMap<T> = Partial<Neo4jPropertyMap<T>>;

/**
 * Sort order array type
 */
export type Neo4jSortOrderArray<T = Neo4jRecordShape> = Array<
  Neo4jSortOrder<T>
>;

/**
 * Query result transformation type
 */
export interface Neo4jQueryResult<T = Neo4jRecordShape> {
  records: T[];
  summary: {
    query: string;
    parameters: Neo4jQueryParams;
    resultAvailableAfter: number;
    resultConsumedAfter: number;
  };
}

/**
 * Node identity type
 */
export interface Neo4jNodeIdentity {
  id: string;
  labels: string[];
}

/**
 * Relationship identity type
 */
export interface Neo4jRelationshipIdentity {
  id: string;
  type: string;
  startNodeId: string;
  endNodeId: string;
}

/**
 * Transaction context interface
 */
export interface Neo4jTransactionContext {
  transactionId?: string;
  timeout?: number;
  metadata?: Neo4jProperties;
}

/**
 * Query options with proper typing
 */
export interface Neo4jQueryOptions<T = Neo4jRecordShape> {
  where?: Neo4jWhereClause;
  orderBy?: Neo4jSortOrderArray<T>;
  limit?: number;
  skip?: number;
  includeDeleted?: boolean;
  transaction?: Neo4jTransactionContext;
}

/**
 * Create operation data type (excludes system fields)
 */
export type Neo4jCreateData<T> = Omit<
  T,
  'id' | 'createdAt' | 'updatedAt' | 'version'
>;

/**
 * Update operation data type (excludes immutable fields)
 */
export type Neo4jUpdateData<T> = Partial<
  Omit<T, 'id' | 'createdAt' | 'version'>
>;

/**
 * DELETED: BaseEntity interface - now use Neogma's NeogmaModel directly
 * See ELIMINATION_MAPPING.md for details
 */

/**
 * Base entity class for Neo4j entities
 *
 * Extend this class instead of defining your own entity structure to avoid
 * TypeScript index signature issues.
 *
 * @example
 * ```typescript
 * @Neo4jEntity('User')
 * export class User extends Neo4jBaseEntity {
 *   @Neo4jProp() name!: string;
 *   @Neo4jProp() email!: string;
 *   // No need for [key: string]: any
 * }
 * ```
 */
export abstract class Neo4jBaseEntity {
  version?: number;

  // Index signature handled here, inherited by all entities
  [key: string]: any;
}

/**
 * Type constraint for entities that can be used with Neo4j operations
 * Now entities can either extend Neo4jBaseEntity OR have their own structure
 */
export type Neo4jCompatibleEntity = Neo4jBaseEntity;

/**
 * Property validation constraints
 */
export interface Neo4jPropertyConstraints<T> {
  required?: Array<keyof T>;
  optional?: Array<keyof T>;
  readonly?: Array<keyof T>;
  indexed?: Array<keyof T>;
  unique?: Array<keyof T>;
}

/**
 * Bulk operation data types
 */
export interface Neo4jBulkCreateData<T> {
  entities: Array<Neo4jCreateData<T>>;
  batchSize?: number;
  continueOnError?: boolean;
}

export interface Neo4jBulkUpdateData<T> {
  updates: Array<{
    id: string;
    data: Neo4jUpdateData<T>;
  }>;
  batchSize?: number;
  continueOnError?: boolean;
}

/**
 * Index and constraint operation types
 */
export interface Neo4jIndexDefinition {
  label: string;
  properties: string[];
  type?: 'BTREE' | 'FULLTEXT' | 'LOOKUP';
  name?: string;
}

export interface Neo4jConstraintDefinition {
  label: string;
  properties: string[];
  type: 'UNIQUE' | 'NODE_KEY' | 'NOT_NULL' | 'EXISTS';
  name?: string;
}

/**
 * Error types for better error handling
 */
export interface Neo4jOperationError extends Error {
  code: string;
  query?: string;
  parameters?: Neo4jQueryParams;
  context?: Neo4jProperties;
}

/**
 * Type guards for runtime type checking
 */
export function isNeo4jPrimitive(value: unknown): value is Neo4jPrimitive {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof Date ||
    (Array.isArray(value) &&
      value.every(
        (v) =>
          typeof v === 'string' ||
          typeof v === 'number' ||
          typeof v === 'boolean' ||
          v instanceof Date
      ))
  );
}

export function isNeo4jProperties(value: unknown): value is Neo4jProperties {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value as Record<string, unknown>).every((v) =>
      isNeo4jPrimitive(v)
    )
  );
}

export function isNeo4jCompatibleEntity(
  value: unknown
): value is Neo4jCompatibleEntity {
  if (typeof value !== 'object' || value === null) return false;
  const entity = value as Record<string, unknown>;
  return (
    (!entity.id || typeof entity.id === 'string') &&
    (!entity.createdAt || entity.createdAt instanceof Date) &&
    (!entity.updatedAt || entity.updatedAt instanceof Date) &&
    (!entity.version || typeof entity.version === 'number')
  );
}
