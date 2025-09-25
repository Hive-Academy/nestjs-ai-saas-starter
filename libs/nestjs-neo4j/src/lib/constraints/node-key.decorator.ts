/**
 * @fileoverview NodeKey constraint decorator for Neo4j
 *
 * Implements NODE KEY constraints which ensure uniqueness of a combination of properties
 * and automatically create an index. Node keys are the strongest constraint type in Neo4j.
 */

import { SetMetadata } from '@nestjs/common';
import {
  CONSTRAINT_METADATA_KEYS,
  type NodeKeyConstraintMetadata,
  type NodeKeyOptions,
  createConstraintMetadata,
} from '../interfaces/constraint-metadata.interface';

/**
 * Configuration for the @NodeKey decorator
 */
export interface NodeKeyConfig extends Omit<NodeKeyOptions, 'validation'> {
  /** Properties that form the node key (required) */
  properties?: string[];
  /** Custom constraint name */
  name?: string;
  /** Error message for constraint violations */
  errorMessage?: string;
  /** Whether to create constraint on startup */
  createOnStartup?: boolean;
  /** Whether to allow partial keys */
  allowPartial?: boolean;
  /** Index provider */
  provider?: string;
  /** Description for documentation */
  description?: string;
}

/**
 * @NodeKey decorator for creating compound node key constraints
 *
 * Node keys ensure that a combination of properties is unique across all nodes
 * with the same label. They also automatically create an index for performance.
 *
 * Features:
 * - Ensures uniqueness of property combinations
 * - Automatically creates backing index
 * - Supports compound keys (multiple properties)
 * - Runtime validation before database operations
 * - Automatic constraint creation on application startup
 *
 * @example
 * ```typescript
 * @Neo4jEntity({ label: 'User' })
 * @NodeKey(['email', 'tenantId'])
 * export class User {
 *   @Neo4jProperty()
 *   email: string;
 *
 *   @Neo4jProperty()
 *   tenantId: string;
 *
 *   @Neo4jProperty()
 *   name: string;
 * }
 *
 * // Custom configuration
 * @NodeKey(['id'], {
 *   name: 'user_id_key',
 *   errorMessage: 'User ID must be unique',
 *   provider: 'btree-1.0'
 * })
 * export class UniqueUser {
 *   @Neo4jProperty()
 *   id: string;
 * }
 * ```
 *
 * @param properties - Array of property names that form the node key
 * @param config - Additional configuration options
 */
export function NodeKey(
  properties: string[],
  config: NodeKeyConfig = {}
): ClassDecorator {
  return function (constructor: any) {
    // Validate input parameters
    validateNodeKeyConfig(properties, config);

    // Get entity metadata for label information
    const entityMetadata = Reflect.getMetadata('entity', constructor);
    const label = entityMetadata?.label || constructor.name;

    // Create constraint metadata
    const constraintMetadata =
      createConstraintMetadata<NodeKeyConstraintMetadata>({
        type: 'NODE_KEY',
        target: 'class',
        properties: [...properties], // Create a copy to avoid mutations
        label,
        options: {
          name:
            config.name ||
            `${label.toLowerCase()}_node_key_${properties.join('_')}`,
          errorMessage:
            config.errorMessage ||
            `Node key violation: properties ${properties.join(
              ', '
            )} must be unique`,
          createOnStartup: config.createOnStartup !== false, // Default to true
          allowPartial: config.allowPartial || false,
          provider: config.provider,
        },
        description:
          config.description ||
          `Node key constraint on ${label} for properties: ${properties.join(
            ', '
          )}`,
      });

    // Store constraint metadata on the class
    SetMetadata(
      CONSTRAINT_METADATA_KEYS.NODE_KEY,
      constraintMetadata
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

    // Add validation methods to the prototype
    addNodeKeyValidationMethods(constructor.prototype, constraintMetadata);

    return constructor;
  };
}

/**
 * Multiple node keys decorator for complex entities
 *
 * Allows defining multiple node key constraints on a single entity.
 * Useful for entities that need multiple uniqueness guarantees.
 *
 * @example
 * ```typescript
 * @NodeKeys([
 *   { properties: ['email', 'tenantId'] },
 *   { properties: ['username', 'domain'] }
 * ])
 * export class User {
 *   @Neo4jProperty()
 *   email: string;
 *
 *   @Neo4jProperty()
 *   tenantId: string;
 *
 *   @Neo4jProperty()
 *   username: string;
 *
 *   @Neo4jProperty()
 *   domain: string;
 * }
 * ```
 */
export function NodeKeys(
  nodeKeys: Array<{ properties: string[] } & NodeKeyConfig>
): ClassDecorator {
  return function (constructor: any) {
    // Apply each node key constraint
    nodeKeys.forEach((nodeKeyConfig, index) => {
      const { properties, ...config } = nodeKeyConfig;

      // Add index suffix to avoid naming conflicts
      const configWithIndex = {
        ...config,
        name: config.name || `${config.name || 'node_key'}_${index}`,
        description: config.description || `Node key constraint ${index + 1}`,
      };

      NodeKey(properties, configWithIndex)(constructor);
    });

    return constructor;
  };
}

/**
 * Add validation methods to entity prototype
 */
function addNodeKeyValidationMethods(
  prototype: any,
  constraintMetadata: NodeKeyConstraintMetadata
): void {
  const methodName = `validateNodeKey_${constraintMetadata.properties.join(
    '_'
  )}`;

  // Add validation method
  if (!prototype[methodName]) {
    prototype[methodName] = function (): { valid: boolean; errors: string[] } {
      const errors: string[] = [];
      const values: Record<string, any> = {};

      // Check if all node key properties have values
      for (const property of constraintMetadata.properties) {
        const value = this[property];

        if (value === null || value === undefined) {
          if (!constraintMetadata.options?.allowPartial) {
            errors.push(
              `Node key property '${property}' cannot be null or undefined`
            );
          }
        } else {
          values[property] = value;
        }
      }

      // Additional validation for empty strings if configured
      if (!constraintMetadata.options?.allowPartial) {
        for (const property of constraintMetadata.properties) {
          const value = this[property];
          if (typeof value === 'string' && value.trim() === '') {
            errors.push(`Node key property '${property}' cannot be empty`);
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    };
  }

  // Add node key value extraction method
  const extractMethodName = `getNodeKeyValues_${constraintMetadata.properties.join(
    '_'
  )}`;
  if (!prototype[extractMethodName]) {
    prototype[extractMethodName] = function (): Record<string, any> {
      const values: Record<string, any> = {};

      for (const property of constraintMetadata.properties) {
        const value = this[property];
        if (value !== null && value !== undefined) {
          values[property] = value;
        }
      }

      return values;
    };
  }

  // Add Cypher query generation for node key checks
  const queryMethodName = `getNodeKeyQuery_${constraintMetadata.properties.join(
    '_'
  )}`;
  if (!prototype[queryMethodName]) {
    prototype[queryMethodName] = function (): {
      query: string;
      params: Record<string, any>;
    } {
      const values = this[extractMethodName]();
      const whereConditions = constraintMetadata.properties
        .map((prop) => `n.${prop} = $${prop}`)
        .join(' AND ');

      return {
        query: `MATCH (n:${constraintMetadata.label}) WHERE ${whereConditions} RETURN count(n) as count`,
        params: values,
      };
    };
  }
}

/**
 * Validate node key configuration
 */
function validateNodeKeyConfig(
  properties: string[],
  config: NodeKeyConfig
): void {
  // Validate properties array
  if (!Array.isArray(properties)) {
    throw new Error('NodeKey decorator requires an array of property names');
  }

  if (properties.length === 0) {
    throw new Error('NodeKey decorator requires at least one property');
  }

  // Check for duplicate properties
  const uniqueProperties = new Set(properties);
  if (uniqueProperties.size !== properties.length) {
    throw new Error('NodeKey decorator properties must be unique');
  }

  // Validate property names
  properties.forEach((property, index) => {
    if (typeof property !== 'string') {
      throw new Error(`NodeKey property at index ${index} must be a string`);
    }

    if (property.trim().length === 0) {
      throw new Error(`NodeKey property at index ${index} cannot be empty`);
    }

    // Basic validation for Neo4j property names
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(property)) {
      throw new Error(
        `NodeKey property '${property}' must be a valid Neo4j property name`
      );
    }
  });

  // Validate configuration options
  if (config.name && typeof config.name !== 'string') {
    throw new Error('NodeKey name must be a string');
  }

  if (config.errorMessage && typeof config.errorMessage !== 'string') {
    throw new Error('NodeKey errorMessage must be a string');
  }

  if (
    config.allowPartial !== undefined &&
    typeof config.allowPartial !== 'boolean'
  ) {
    throw new Error('NodeKey allowPartial must be a boolean');
  }

  if (config.provider && typeof config.provider !== 'string') {
    throw new Error('NodeKey provider must be a string');
  }

  // Validate provider format if specified
  if (config.provider) {
    const validProviders = ['btree-1.0', 'range-1.0', 'text-1.0', 'point-1.0'];
    if (!validProviders.includes(config.provider)) {
      console.warn(
        `NodeKey provider '${config.provider}' is not a standard Neo4j index provider`
      );
    }
  }
}

/**
 * Utility function to extract node key constraints from a class
 */
export function getNodeKeyConstraints(
  constructor: any
): NodeKeyConstraintMetadata[] {
  const classConstraints =
    Reflect.getMetadata(
      CONSTRAINT_METADATA_KEYS.CLASS_CONSTRAINTS,
      constructor
    ) || [];
  return classConstraints.filter(
    (constraint: any) => constraint.type === 'NODE_KEY'
  );
}

/**
 * Utility function to check if a class has node key constraints
 */
export function hasNodeKeyConstraints(constructor: any): boolean {
  return getNodeKeyConstraints(constructor).length > 0;
}

/**
 * Generate Neo4j CREATE CONSTRAINT query for node key
 */
export function generateNodeKeyConstraintQuery(
  constraint: NodeKeyConstraintMetadata
): { query: string; name: string } {
  const constraintName =
    constraint.options?.name ||
    `${
      constraint.label?.toLowerCase() || 'node'
    }_node_key_${constraint.properties.join('_')}`;

  const propertiesClause = constraint.properties
    .map((prop) => `n.${prop}`)
    .join(', ');

  let query = `CREATE CONSTRAINT ${constraintName} FOR (n:${constraint.label}) REQUIRE (${propertiesClause}) IS NODE KEY`;

  // Add provider options if specified
  if (constraint.options?.provider) {
    query += ` OPTIONS {indexProvider: '${constraint.options.provider}'}`;
  }

  return {
    query,
    name: constraintName,
  };
}
