/**
 * @fileoverview Index constraint decorators for Neo4j
 *
 * Implements INDEX creation for both single properties and compound property combinations.
 * Supports various index types including BTREE, TEXT, RANGE, POINT, and LOOKUP indexes.
 */

import { SetMetadata } from '@nestjs/common';
import {
  CONSTRAINT_METADATA_KEYS,
  type IndexConstraintMetadata,
  type IndexOptions,
  createConstraintMetadata,
} from '../interfaces/constraint-metadata.interface';

/**
 * Configuration for index decorators
 */
export interface IndexDecoratorConfig extends Omit<IndexOptions, 'validation'> {
  /** Properties to index (for class-level decorator) */
  properties?: string[];
  /** Custom index name */
  name?: string;
  /** Index type */
  type?: 'BTREE' | 'TEXT' | 'RANGE' | 'POINT' | 'LOOKUP';
  /** Index provider */
  provider?: string;
  /** Index configuration options */
  config?: Record<string, any>;
  /** Whether to create unique index */
  unique?: boolean;
  /** Whether to create index on startup */
  createOnStartup?: boolean;
  /** Description for documentation */
  description?: string;
}

/**
 * @ClassIndex class-level decorator for compound indexes
 *
 * Creates an index on a combination of properties for improved query performance.
 * Use this when you need to optimize queries that filter on multiple properties together.
 *
 * Features:
 * - Multiple index types (BTREE, TEXT, RANGE, POINT, LOOKUP)
 * - Configurable index providers
 * - Unique index support
 * - Custom index configuration
 * - Performance optimization for queries
 *
 * @example
 * ```typescript
 * @Neo4jEntity({ label: 'User' })
 * @ClassIndex(['status', 'createdAt'])
 * @ClassIndex(['tenantId', 'email'], { type: 'BTREE', unique: true })
 * export class User {
 *   @Neo4jProp()
 *   status: string;
 *
 *   @Neo4jProp()
 *   createdAt: Date;
 *
 *   @Neo4jProp()
 *   tenantId: string;
 *
 *   @Neo4jProp()
 *   email: string;
 * }
 *
 * // Text index for full-text search
 * @ClassIndex(['title', 'content'], {
 *   type: 'TEXT',
 *   name: 'article_fulltext_index',
 *   config: {
 *     'fulltext.analyzer': 'standard',
 *     'fulltext.eventually_consistent': true
 *   }
 * })
 * export class Article {
 *   @Neo4jProp()
 *   title: string;
 *
 *   @Neo4jProp()
 *   content: string;
 * }
 * ```
 *
 * @param properties - Array of property names to index together
 * @param config - Additional configuration options
 */
export function ClassIndex(
  properties: string[],
  config: IndexDecoratorConfig = {}
): ClassDecorator {
  return function (constructor: any) {
    // Validate input parameters
    validateIndexConfig(properties, config);

    // Get entity metadata for label information
    const entityMetadata = Reflect.getMetadata('entity', constructor);
    const label = entityMetadata?.label || constructor.name;

    // Create constraint metadata
    const constraintMetadata =
      createConstraintMetadata<IndexConstraintMetadata>({
        type: 'INDEX',
        target: 'class',
        properties: [...properties], // Create a copy to avoid mutations
        label,
        options: {
          name:
            config.name ||
            `${label.toLowerCase()}_index_${properties.join('_')}`,
          createOnStartup: config.createOnStartup !== false, // Default to true
          indexConfig: {
            type: config.type || 'BTREE',
            provider: config.provider,
            config: config.config,
            unique: config.unique || false,
            name: config.name,
          },
        },
        description:
          config.description ||
          `Index on ${label} for properties: ${properties.join(', ')}`,
      });

    // Store constraint metadata on the class
    const existingIndexConstraints =
      Reflect.getMetadata(CONSTRAINT_METADATA_KEYS.INDEX, constructor) || [];
    existingIndexConstraints.push(constraintMetadata);
    SetMetadata(
      CONSTRAINT_METADATA_KEYS.INDEX,
      existingIndexConstraints
    )(constructor);

    // Also add to class constraints collection
    const existingClassConstraints =
      Reflect.getMetadata(
        CONSTRAINT_METADATA_KEYS.CLASS_CONSTRAINTS,
        constructor
      ) || [];
    existingClassConstraints.push(constraintMetadata);
    SetMetadata(
      CONSTRAINT_METADATA_KEYS.CLASS_CONSTRAINTS,
      existingClassConstraints
    )(constructor);

    // Add index utility methods to the prototype
    addIndexMethods(constructor.prototype, constraintMetadata);

    return constructor;
  };
}

/**
 * @PropIndex property-level decorator for single property indexes
 *
 * Creates an index on a single property. Use this as a property decorator
 * when you need to optimize queries that filter on a specific property.
 *
 * Features:
 * - Simple property-level usage
 * - Type-safe property targeting
 * - Configurable index types
 * - Performance optimization
 *
 * @example
 * ```typescript
 * @Neo4jEntity({ label: 'User' })
 * export class User {
 *   @PropIndex()
 *   @Neo4jProp()
 *   email: string;
 *
 *   @PropIndex({
 *     type: 'TEXT',
 *     name: 'user_search_index'
 *   })
 *   @Neo4jProp()
 *   searchableContent: string;
 *
 *   @PropIndex({
 *     type: 'RANGE',
 *     config: { 'spatial.cartesian.min': [-100, -100], 'spatial.cartesian.max': [100, 100] }
 *   })
 *   @Neo4jProp()
 *   location: { x: number; y: number };
 *
 *   @Neo4jProp()
 *   name: string; // Not indexed
 * }
 * ```
 *
 * @param config - Configuration options for the index
 */
export function PropIndex(
  config: Omit<IndexDecoratorConfig, 'properties'> = {}
): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    const propertyName = String(propertyKey);

    // Validate configuration
    validateIndexPropertyConfig(propertyName, config);

    // Get entity metadata for label information
    const entityMetadata = Reflect.getMetadata('entity', target.constructor);
    const label = entityMetadata?.label || target.constructor.name;

    // Create constraint metadata
    const constraintMetadata =
      createConstraintMetadata<IndexConstraintMetadata>({
        type: 'INDEX',
        target: 'property',
        properties: [propertyName],
        label,
        options: {
          name: config.name || `${label.toLowerCase()}_${propertyName}_index`,
          createOnStartup: config.createOnStartup !== false, // Default to true
          indexConfig: {
            type: config.type || 'BTREE',
            provider: config.provider,
            config: config.config,
            unique: config.unique || false,
            name: config.name,
          },
        },
        description: config.description || `Index on ${label}.${propertyName}`,
      });

    // Store constraint metadata on the property
    const existingPropertyConstraints =
      Reflect.getMetadata(
        CONSTRAINT_METADATA_KEYS.PROPERTY_CONSTRAINTS,
        target
      ) || new Map();
    const propertyConstraints =
      existingPropertyConstraints.get(propertyKey) || [];
    propertyConstraints.push(constraintMetadata);
    existingPropertyConstraints.set(propertyKey, propertyConstraints);
    SetMetadata(
      CONSTRAINT_METADATA_KEYS.PROPERTY_CONSTRAINTS,
      existingPropertyConstraints
    )(target);

    // Also store in index constraints collection
    const existingIndexConstraints =
      Reflect.getMetadata(CONSTRAINT_METADATA_KEYS.INDEX, target.constructor) ||
      [];
    existingIndexConstraints.push(constraintMetadata);
    SetMetadata(
      CONSTRAINT_METADATA_KEYS.INDEX,
      existingIndexConstraints
    )(target.constructor);

    // Add index utility methods to the prototype
    addIndexMethods(target, constraintMetadata);
  };
}

/**
 * Specialized index decorators for common use cases
 */

/**
 * @TextIndex decorator for full-text search indexes
 *
 * Creates a TEXT index optimized for full-text search operations.
 *
 * @example
 * ```typescript
 * @TextIndex(['title', 'content'], {
 *   name: 'article_search',
 *   config: { 'fulltext.analyzer': 'standard' }
 * })
 * export class Article {
 *   @Neo4jProp()
 *   title: string;
 *
 *   @Neo4jProp()
 *   content: string;
 * }
 * ```
 */
export function TextIndex(
  properties: string[],
  config: Omit<IndexDecoratorConfig, 'type'> = {}
): ClassDecorator {
  return ClassIndex(properties, {
    ...config,
    type: 'TEXT',
    name: config.name || `text_index_${properties.join('_')}`,
  });
}

/**
 * @RangeIndex decorator for range query optimization
 *
 * Creates a RANGE index optimized for range queries and sorting.
 *
 * @example
 * ```typescript
 * @RangeIndex(['createdAt', 'updatedAt'])
 * export class TimestampedEntity {
 *   @Neo4jProp()
 *   createdAt: Date;
 *
 *   @Neo4jProp()
 *   updatedAt: Date;
 * }
 * ```
 */
export function RangeIndex(
  properties: string[],
  config: Omit<IndexDecoratorConfig, 'type'> = {}
): ClassDecorator {
  return ClassIndex(properties, {
    ...config,
    type: 'RANGE',
    name: config.name || `range_index_${properties.join('_')}`,
  });
}

/**
 * @PointIndex decorator for spatial/geographic data
 *
 * Creates a POINT index for spatial queries and geographic data.
 *
 * @example
 * ```typescript
 * @PointIndex(['location'], {
 *   config: {
 *     'spatial.cartesian.min': [-180, -90],
 *     'spatial.cartesian.max': [180, 90]
 *   }
 * })
 * export class Location {
 *   @Neo4jProp()
 *   location: { x: number; y: number };
 * }
 * ```
 */
export function PointIndex(
  properties: string[],
  config: Omit<IndexDecoratorConfig, 'type'> = {}
): ClassDecorator {
  return ClassIndex(properties, {
    ...config,
    type: 'POINT',
    name: config.name || `point_index_${properties.join('_')}`,
  });
}

/**
 * @LookupIndex decorator for exact match optimization
 *
 * Creates a LOOKUP index optimized for exact value lookups.
 *
 * @example
 * ```typescript
 * @LookupIndex(['status', 'category'])
 * export class Product {
 *   @Neo4jProp()
 *   status: 'active' | 'inactive' | 'pending';
 *
 *   @Neo4jProp()
 *   category: string;
 * }
 * ```
 */
export function LookupIndex(
  properties: string[],
  config: Omit<IndexDecoratorConfig, 'type'> = {}
): ClassDecorator {
  return ClassIndex(properties, {
    ...config,
    type: 'LOOKUP',
    name: config.name || `lookup_index_${properties.join('_')}`,
  });
}

/**
 * Multiple indexes decorator for complex entities
 *
 * Allows defining multiple indexes on a single entity in a single decorator.
 *
 * @example
 * ```typescript
 * @Indexes([
 *   { properties: ['email'], type: 'BTREE', unique: true },
 *   { properties: ['status', 'createdAt'], type: 'RANGE' },
 *   { properties: ['title', 'content'], type: 'TEXT' }
 * ])
 * export class User {
 *   @Neo4jProp()
 *   email: string;
 *
 *   @Neo4jProp()
 *   status: string;
 *
 *   @Neo4jProp()
 *   createdAt: Date;
 *
 *   @Neo4jProp()
 *   title: string;
 *
 *   @Neo4jProp()
 *   content: string;
 * }
 * ```
 */
export function Indexes(
  indexes: Array<{ properties: string[] } & IndexDecoratorConfig>
): ClassDecorator {
  return function (constructor: any) {
    // Apply each index constraint
    indexes.forEach((indexConfig, index) => {
      const { properties, ...config } = indexConfig;

      // Add index suffix to avoid naming conflicts
      const configWithIndex = {
        ...config,
        name: config.name || `index_${index}`,
        description: config.description || `Index ${index + 1}`,
      };

      ClassIndex(properties, configWithIndex)(constructor);
    });

    return constructor;
  };
}

/**
 * Add index utility methods to entity prototype
 */
function addIndexMethods(
  prototype: any,
  constraintMetadata: IndexConstraintMetadata
): void {
  const methodSuffix = constraintMetadata.properties.join('_');

  // Add index info method
  const infoMethodName = `getIndexInfo_${methodSuffix}`;
  if (!prototype[infoMethodName]) {
    prototype[infoMethodName] = function (): {
      name: string;
      type: string;
      properties: string[];
      unique: boolean;
    } {
      return {
        name: constraintMetadata.options?.name || '',
        type: constraintMetadata.options?.indexConfig?.type || 'BTREE',
        properties: constraintMetadata.properties,
        unique: constraintMetadata.options?.indexConfig?.unique || false,
      };
    };
  }

  // Add optimized query hint method
  const hintMethodName = `getIndexHint_${methodSuffix}`;
  if (!prototype[hintMethodName]) {
    prototype[hintMethodName] = function (): string {
      const indexName = constraintMetadata.options?.name;
      if (indexName) {
        return `USING INDEX ${indexName}`;
      }
      return '';
    };
  }

  // Add index coverage check method
  const coverageMethodName = `checkIndexCoverage_${methodSuffix}`;
  if (!prototype[coverageMethodName]) {
    prototype[coverageMethodName] = function (queryProperties: string[]): {
      covered: boolean;
      coverageRatio: number;
      missingProperties: string[];
    } {
      const indexProperties = new Set(constraintMetadata.properties);

      const coveredProperties = queryProperties.filter((prop) =>
        indexProperties.has(prop)
      );
      const missingProperties = queryProperties.filter(
        (prop) => !indexProperties.has(prop)
      );

      const coverageRatio =
        queryProperties.length > 0
          ? coveredProperties.length / queryProperties.length
          : 1;
      const covered =
        missingProperties.length === 0 && queryProperties.length > 0;

      return {
        covered,
        coverageRatio,
        missingProperties,
      };
    };
  }
}

/**
 * Validate index configuration
 */
function validateIndexConfig(
  properties: string[],
  config: IndexDecoratorConfig
): void {
  // Validate properties array
  if (!Array.isArray(properties)) {
    throw new Error('ClassIndex decorator requires an array of property names');
  }

  if (properties.length === 0) {
    throw new Error('ClassIndex decorator requires at least one property');
  }

  // Check for duplicate properties
  const uniqueProperties = new Set(properties);
  if (uniqueProperties.size !== properties.length) {
    throw new Error('ClassIndex decorator properties must be unique');
  }

  // Validate property names
  properties.forEach((property, index) => {
    if (typeof property !== 'string') {
      throw new Error(`ClassIndex property at index ${index} must be a string`);
    }

    if (property.trim().length === 0) {
      throw new Error(`ClassIndex property at index ${index} cannot be empty`);
    }

    // Basic validation for Neo4j property names
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(property)) {
      throw new Error(
        `ClassIndex property '${property}' must be a valid Neo4j property name`
      );
    }
  });

  // Validate configuration options
  if (config.name && typeof config.name !== 'string') {
    throw new Error('ClassIndex name must be a string');
  }

  if (
    config.type &&
    !['BTREE', 'TEXT', 'RANGE', 'POINT', 'LOOKUP'].includes(config.type)
  ) {
    throw new Error(
      'ClassIndex type must be one of: BTREE, TEXT, RANGE, POINT, LOOKUP'
    );
  }

  if (config.provider && typeof config.provider !== 'string') {
    throw new Error('ClassIndex provider must be a string');
  }

  if (config.unique !== undefined && typeof config.unique !== 'boolean') {
    throw new Error('ClassIndex unique must be a boolean');
  }

  if (config.config && typeof config.config !== 'object') {
    throw new Error('ClassIndex config must be an object');
  }
}

/**
 * Validate index property constraint configuration
 */
function validateIndexPropertyConfig(
  propertyName: string,
  config: Omit<IndexDecoratorConfig, 'properties'>
): void {
  if (!propertyName || typeof propertyName !== 'string') {
    throw new Error('PropIndex decorator requires a valid property name');
  }

  // Basic validation for Neo4j property names
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(propertyName)) {
    throw new Error(
      `PropIndex '${propertyName}' must be a valid Neo4j property name`
    );
  }

  // Validate configuration options (same as validateIndexConfig but without properties)
  if (config.name && typeof config.name !== 'string') {
    throw new Error('PropIndex name must be a string');
  }

  if (
    config.type &&
    !['BTREE', 'TEXT', 'RANGE', 'POINT', 'LOOKUP'].includes(config.type)
  ) {
    throw new Error(
      'PropIndex type must be one of: BTREE, TEXT, RANGE, POINT, LOOKUP'
    );
  }

  if (config.provider && typeof config.provider !== 'string') {
    throw new Error('PropIndex provider must be a string');
  }

  if (config.unique !== undefined && typeof config.unique !== 'boolean') {
    throw new Error('PropIndex unique must be a boolean');
  }

  if (config.config && typeof config.config !== 'object') {
    throw new Error('PropIndex config must be an object');
  }
}

/**
 * Utility function to extract index constraints from a class
 */
export function getIndexConstraints(
  constructor: any
): IndexConstraintMetadata[] {
  return Reflect.getMetadata(CONSTRAINT_METADATA_KEYS.INDEX, constructor) || [];
}

/**
 * Utility function to check if a class has index constraints
 */
export function hasIndexConstraints(constructor: any): boolean {
  return getIndexConstraints(constructor).length > 0;
}

/**
 * Generate Neo4j CREATE INDEX query
 */
export function generateIndexQuery(constraint: IndexConstraintMetadata): {
  query: string;
  name: string;
} {
  const indexName =
    constraint.options?.indexConfig?.name ||
    constraint.options?.name ||
    `${
      constraint.label?.toLowerCase() || 'node'
    }_index_${constraint.properties.join('_')}`;

  const propertiesClause = constraint.properties
    .map((prop) => `n.${prop}`)
    .join(', ');
  const indexType = constraint.options?.indexConfig?.type || 'BTREE';

  let query: string;

  if (indexType === 'TEXT') {
    // Full-text index
    query = `CREATE FULLTEXT INDEX ${indexName} FOR (n:${constraint.label}) ON EACH [${propertiesClause}]`;
  } else if (constraint.options?.indexConfig?.unique) {
    // Unique index (same as unique constraint)
    query = `CREATE CONSTRAINT ${indexName} FOR (n:${constraint.label}) REQUIRE (${propertiesClause}) IS UNIQUE`;
  } else {
    // Regular index
    query = `CREATE INDEX ${indexName} FOR (n:${constraint.label}) ON (${propertiesClause})`;
  }

  // Add provider options if specified
  if (constraint.options?.indexConfig?.provider) {
    query += ` OPTIONS {indexProvider: '${constraint.options.indexConfig.provider}'`;

    // Add custom config if provided
    if (constraint.options.indexConfig.config) {
      const configEntries = Object.entries(
        constraint.options.indexConfig.config
      )
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ');
      query += `, ${configEntries}`;
    }

    query += '}';
  }

  return {
    query,
    name: indexName,
  };
}
