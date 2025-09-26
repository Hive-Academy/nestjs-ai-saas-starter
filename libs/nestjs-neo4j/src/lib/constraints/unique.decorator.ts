/**
 * @fileoverview Unique constraint decorators for Neo4j
 *
 * Implements UNIQUE constraints for both single properties and compound property combinations.
 * Supports both class-level decorators for compound unique constraints and property-level
 * decorators for single property unique constraints.
 */

import { SetMetadata } from '@nestjs/common';
import {
  CONSTRAINT_METADATA_KEYS,
  type UniqueConstraintMetadata,
  type UniqueOptions,
  createConstraintMetadata,
} from '../interfaces/constraint-metadata.interface';

/**
 * Configuration for unique constraint decorators
 */
export interface UniqueConfig extends Omit<UniqueOptions, 'validation'> {
  /** Properties that must be unique (for class-level decorator) */
  properties?: string[];
  /** Custom constraint name */
  name?: string;
  /** Error message for constraint violations */
  errorMessage?: string;
  /** Whether to create constraint on startup */
  createOnStartup?: boolean;
  /** Whether null values are considered unique */
  nullsDistinct?: boolean;
  /** Index provider */
  provider?: string;
  /** Case sensitivity for string comparisons */
  caseSensitive?: boolean;
  /** Description for documentation */
  description?: string;
}

/**
 * @ClassUnique class-level decorator for compound unique constraints
 *
 * Creates a unique constraint on a combination of properties.
 * Use this when you need to ensure uniqueness across multiple properties together.
 *
 * Features:
 * - Ensures uniqueness of property combinations
 * - Automatically creates backing index
 * - Runtime validation before database operations
 * - Configurable null handling
 * - Custom error messages
 *
 * @example
 * ```typescript
 * @Neo4jEntity({ label: 'User' })
 * @ClassUnique(['email', 'tenantId'])
 * @ClassUnique(['username', 'domain'])
 * export class User {
 *   @Neo4jProp()
 *   email: string;
 *
 *   @Neo4jProp()
 *   tenantId: string;
 *
 *   @Neo4jProp()
 *   username: string;
 *
 *   @Neo4jProp()
 *   domain: string;
 * }
 *
 * // With custom configuration
 * @ClassUnique(['email'], {
 *   name: 'user_email_unique',
 *   errorMessage: 'Email address must be unique',
 *   nullsDistinct: true,
 *   caseSensitive: false
 * })
 * export class UniqueUser {
 *   @Neo4jProp()
 *   email: string;
 * }
 * ```
 *
 * @param properties - Array of property names that must be unique together
 * @param config - Additional configuration options
 */
export function ClassUnique(
  properties: string[],
  config?: UniqueConfig
): ClassDecorator {
  return function (constructor: any) {
    // Validate input parameters
    const finalConfig = config || {};
    validateUniqueConfig(properties, finalConfig);

    // Get entity metadata for label information
    const entityMetadata = Reflect.getMetadata('entity', constructor);
    const label = entityMetadata?.label || constructor.name;

    // Create constraint metadata
    const constraintMetadata =
      createConstraintMetadata<UniqueConstraintMetadata>({
        type: 'UNIQUE',
        target: 'class',
        properties: [...properties], // Create a copy to avoid mutations
        label,
        options: {
          name:
            finalConfig.name ||
            `${label.toLowerCase()}_unique_${properties.join('_')}`,
          errorMessage:
            finalConfig.errorMessage ||
            `Unique constraint violation: properties ${properties.join(
              ', '
            )} must be unique`,
          createOnStartup: finalConfig.createOnStartup !== false, // Default to true
          nullsDistinct: finalConfig.nullsDistinct !== false, // Default to true
          provider: finalConfig.provider,
          caseSensitive: finalConfig.caseSensitive !== false, // Default to true
        },
        description:
          finalConfig.description ||
          `Unique constraint on ${label} for properties: ${properties.join(
            ', '
          )}`,
      });

    // Store constraint metadata on the class
    const existingUniqueConstraints =
      Reflect.getMetadata(CONSTRAINT_METADATA_KEYS.UNIQUE, constructor) || [];
    existingUniqueConstraints.push(constraintMetadata);
    SetMetadata(
      CONSTRAINT_METADATA_KEYS.UNIQUE,
      existingUniqueConstraints
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
    addUniqueValidationMethods(constructor.prototype, constraintMetadata);

    return constructor;
  };
}

/**
 * @PropUnique property-level decorator for single property unique constraints
 *
 * Creates a unique constraint on a single property. Use this as a property decorator
 * when you need to ensure a single property is unique across all entities.
 *
 * Features:
 * - Simple property-level usage
 * - Type-safe property targeting
 * - Configurable null handling
 * - Runtime validation
 *
 * @example
 * ```typescript
 * @Neo4jEntity({ label: 'User' })
 * export class User {
 *   @PropUnique()
 *   @Neo4jProp()
 *   email: string;
 *
 *   @PropUnique({
 *     name: 'user_username_unique',
 *     caseSensitive: false,
 *     errorMessage: 'Username must be unique'
 *   })
 *   @Neo4jProp()
 *   username: string;
 *
 *   @Neo4jProp()
 *   name: string;
 * }
 * ```
 *
 * @param config - Configuration options for the unique constraint
 */
export function PropUnique(
  config?: Omit<UniqueConfig, 'properties'>
): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    const propertyName = String(propertyKey);

    // Validate configuration
    const finalConfig = config || {};
    validateUniquePropertyConfig(propertyName, finalConfig);

    // Get entity metadata for label information
    const entityMetadata = Reflect.getMetadata('entity', target.constructor);
    const label = entityMetadata?.label || target.constructor.name;

    // Create constraint metadata
    const constraintMetadata =
      createConstraintMetadata<UniqueConstraintMetadata>({
        type: 'UNIQUE',
        target: 'property',
        properties: [propertyName],
        label,
        options: {
          name:
            finalConfig.name || `${label.toLowerCase()}_${propertyName}_unique`,
          errorMessage:
            finalConfig.errorMessage ||
            `Property '${propertyName}' must be unique`,
          createOnStartup: finalConfig.createOnStartup !== false, // Default to true
          nullsDistinct: finalConfig.nullsDistinct !== false, // Default to true
          provider: finalConfig.provider,
          caseSensitive: finalConfig.caseSensitive !== false, // Default to true
        },
        description:
          finalConfig.description ||
          `Unique constraint on ${label}.${propertyName}`,
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

    // Also store in unique constraints collection
    const existingUniqueConstraints =
      Reflect.getMetadata(
        CONSTRAINT_METADATA_KEYS.UNIQUE,
        target.constructor
      ) || [];
    existingUniqueConstraints.push(constraintMetadata);
    SetMetadata(
      CONSTRAINT_METADATA_KEYS.UNIQUE,
      existingUniqueConstraints
    )(target.constructor);

    // Add validation methods to the prototype
    addUniqueValidationMethods(target, constraintMetadata);
  };
}

/**
 * Multiple unique constraints decorator for complex entities
 *
 * Allows defining multiple unique constraints on a single entity in a single decorator.
 * Useful for entities that need multiple uniqueness guarantees.
 *
 * @example
 * ```typescript
 * @UniqueConstraints([
 *   { properties: ['email'] },
 *   { properties: ['username', 'domain'] },
 *   { properties: ['externalId'], nullsDistinct: false }
 * ])
 * export class User {
 *   @Neo4jProp()
 *   email: string;
 *
 *   @Neo4jProp()
 *   username: string;
 *
 *   @Neo4jProp()
 *   domain: string;
 *
 *   @Neo4jProp()
 *   externalId?: string;
 * }
 * ```
 */
export function UniqueConstraints(
  constraints: Array<{ properties: string[] } & UniqueConfig>
): ClassDecorator {
  return function (constructor: any) {
    // Apply each unique constraint
    constraints.forEach((constraintConfig, index) => {
      const { properties, ...config } = constraintConfig;

      // Add index suffix to avoid naming conflicts
      const configWithIndex = {
        ...config,
        name: config.name || `unique_constraint_${index}`,
        description: config.description || `Unique constraint ${index + 1}`,
      };

      Unique(properties, configWithIndex)(constructor);
    });

    return constructor;
  };
}

/**
 * Add validation methods to entity prototype
 */
function addUniqueValidationMethods(
  prototype: any,
  constraintMetadata: UniqueConstraintMetadata
): void {
  const methodSuffix = constraintMetadata.properties.join('_');
  const methodName = `validateUnique_${methodSuffix}`;

  // Add validation method
  if (!prototype[methodName]) {
    prototype[methodName] = function (): { valid: boolean; errors: string[] } {
      const errors: string[] = [];
      const values: Record<string, any> = {};

      // Check if properties have values (considering nullsDistinct option)
      for (const property of constraintMetadata.properties) {
        const value = this[property];

        if (value === null || value === undefined) {
          if (constraintMetadata.options?.nullsDistinct === false) {
            // Multiple nulls are allowed, skip validation
            continue;
          }
        }

        values[property] = value;

        // Case sensitivity handling for strings
        if (
          typeof value === 'string' &&
          constraintMetadata.options?.caseSensitive === false
        ) {
          values[property] = value.toLowerCase();
        }
      }

      // If all values are null and nullsDistinct is false, skip validation
      const hasNonNullValues = Object.values(values).some(
        (v) => v !== null && v !== undefined
      );
      if (
        !hasNonNullValues &&
        constraintMetadata.options?.nullsDistinct === false
      ) {
        return { valid: true, errors: [] };
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    };
  }

  // Add unique value extraction method
  const extractMethodName = `getUniqueValues_${methodSuffix}`;
  if (!prototype[extractMethodName]) {
    prototype[extractMethodName] = function (): Record<string, any> {
      const values: Record<string, any> = {};

      for (const property of constraintMetadata.properties) {
        let value = this[property];

        // Apply case sensitivity transformation
        if (
          typeof value === 'string' &&
          constraintMetadata.options?.caseSensitive === false
        ) {
          value = value.toLowerCase();
        }

        values[property] = value;
      }

      return values;
    };
  }

  // Add Cypher query generation for uniqueness checks
  const queryMethodName = `getUniqueQuery_${methodSuffix}`;
  if (!prototype[queryMethodName]) {
    prototype[queryMethodName] = function (excludeId?: string): {
      query: string;
      params: Record<string, any>;
    } {
      const values = this[extractMethodName]();
      const conditions: string[] = [];
      const params: Record<string, any> = {};

      // Build WHERE conditions
      constraintMetadata.properties.forEach((prop) => {
        const value = values[prop];
        if (value !== null && value !== undefined) {
          conditions.push(`n.${prop} = $${prop}`);
          params[prop] = value;
        } else if (constraintMetadata.options?.nullsDistinct !== false) {
          conditions.push(`n.${prop} IS NULL`);
        }
      });

      // Exclude current entity if updating
      if (excludeId) {
        conditions.push('n.id <> $excludeId');
        params.excludeId = excludeId;
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      return {
        query: `MATCH (n:${constraintMetadata.label}) ${whereClause} RETURN count(n) as count`,
        params,
      };
    };
  }
}

/**
 * Validate unique constraint configuration
 */
function validateUniqueConfig(
  properties: string[],
  config: UniqueConfig
): void {
  // Validate properties array
  if (!Array.isArray(properties)) {
    throw new Error('Unique decorator requires an array of property names');
  }

  if (properties.length === 0) {
    throw new Error('Unique decorator requires at least one property');
  }

  // Check for duplicate properties
  const uniqueProperties = new Set(properties);
  if (uniqueProperties.size !== properties.length) {
    throw new Error('Unique decorator properties must be unique');
  }

  // Validate property names
  properties.forEach((property, index) => {
    if (typeof property !== 'string') {
      throw new Error(`Unique property at index ${index} must be a string`);
    }

    if (property.trim().length === 0) {
      throw new Error(`Unique property at index ${index} cannot be empty`);
    }

    // Basic validation for Neo4j property names
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(property)) {
      throw new Error(
        `Unique property '${property}' must be a valid Neo4j property name`
      );
    }
  });

  // Validate configuration options
  if (config.name && typeof config.name !== 'string') {
    throw new Error('Unique name must be a string');
  }

  if (config.errorMessage && typeof config.errorMessage !== 'string') {
    throw new Error('Unique errorMessage must be a string');
  }

  if (
    config.nullsDistinct !== undefined &&
    typeof config.nullsDistinct !== 'boolean'
  ) {
    throw new Error('Unique nullsDistinct must be a boolean');
  }

  if (
    config.caseSensitive !== undefined &&
    typeof config.caseSensitive !== 'boolean'
  ) {
    throw new Error('Unique caseSensitive must be a boolean');
  }

  if (config.provider && typeof config.provider !== 'string') {
    throw new Error('Unique provider must be a string');
  }
}

/**
 * Validate unique property constraint configuration
 */
function validateUniquePropertyConfig(
  propertyName: string,
  config: Omit<UniqueConfig, 'properties'>
): void {
  if (!propertyName || typeof propertyName !== 'string') {
    throw new Error('UniqueProperty decorator requires a valid property name');
  }

  // Basic validation for Neo4j property names
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(propertyName)) {
    throw new Error(
      `UniqueProperty '${propertyName}' must be a valid Neo4j property name`
    );
  }

  // Validate configuration options (same as validateUniqueConfig but without properties)
  if (config.name && typeof config.name !== 'string') {
    throw new Error('UniqueProperty name must be a string');
  }

  if (config.errorMessage && typeof config.errorMessage !== 'string') {
    throw new Error('UniqueProperty errorMessage must be a string');
  }

  if (
    config.nullsDistinct !== undefined &&
    typeof config.nullsDistinct !== 'boolean'
  ) {
    throw new Error('UniqueProperty nullsDistinct must be a boolean');
  }

  if (
    config.caseSensitive !== undefined &&
    typeof config.caseSensitive !== 'boolean'
  ) {
    throw new Error('UniqueProperty caseSensitive must be a boolean');
  }

  if (config.provider && typeof config.provider !== 'string') {
    throw new Error('UniqueProperty provider must be a string');
  }
}

/**
 * Utility function to extract unique constraints from a class
 */
export function getUniqueConstraints(
  constructor: any
): UniqueConstraintMetadata[] {
  return (
    Reflect.getMetadata(CONSTRAINT_METADATA_KEYS.UNIQUE, constructor) || []
  );
}

/**
 * Utility function to check if a class has unique constraints
 */
export function hasUniqueConstraints(constructor: any): boolean {
  return getUniqueConstraints(constructor).length > 0;
}

/**
 * Generate Neo4j CREATE CONSTRAINT query for unique constraint
 */
export function generateUniqueConstraintQuery(
  constraint: UniqueConstraintMetadata
): { query: string; name: string } {
  const constraintName =
    constraint.options?.name ||
    `${
      constraint.label?.toLowerCase() || 'node'
    }_unique_${constraint.properties.join('_')}`;

  const propertiesClause = constraint.properties
    .map((prop) => `n.${prop}`)
    .join(', ');

  let query = `CREATE CONSTRAINT ${constraintName} FOR (n:${constraint.label}) REQUIRE (${propertiesClause}) IS UNIQUE`;

  // Add provider options if specified
  if (constraint.options?.provider) {
    query += ` OPTIONS {indexProvider: '${constraint.options.provider}'}`;
  }

  return {
    query,
    name: constraintName,
  };
}
