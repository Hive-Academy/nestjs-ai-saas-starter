/**
 * @fileoverview NotNull constraint decorator for Neo4j
 *
 * Implements NOT NULL constraints for properties to ensure they cannot be null or undefined.
 * Note: Neo4j currently supports property existence constraints, but this decorator provides
 * both runtime validation and can be used to create property existence constraints.
 */

import { SetMetadata } from '@nestjs/common';
import {
  CONSTRAINT_METADATA_KEYS,
  type NotNullConstraintMetadata,
  type NotNullOptions,
  createConstraintMetadata,
} from '../interfaces/constraint-metadata.interface';

/**
 * Configuration for the @NotNull decorator
 */
export interface NotNullConfig extends Omit<NotNullOptions, 'validation'> {
  /** Custom constraint name */
  name?: string;
  /** Error message for constraint violations */
  errorMessage?: string;
  /** Whether to create constraint on startup */
  createOnStartup?: boolean;
  /** Whether empty strings are considered null */
  treatEmptyAsNull?: boolean;
  /** Default value to use instead of null */
  defaultValue?: any;
  /** Description for documentation */
  description?: string;
}

/**
 * @NotNull property decorator for enforcing non-null constraints
 *
 * Ensures that a property cannot be null or undefined. Provides runtime validation
 * and can create property existence constraints in Neo4j.
 *
 * Features:
 * - Runtime validation before database operations
 * - Property existence constraint creation in Neo4j
 * - Configurable empty string handling
 * - Default value support
 * - Custom error messages
 *
 * @example
 * ```typescript
 * @Neo4jEntity({ label: 'User' })
 * export class User {
 *   @NotNull()
 *   @Neo4jProperty()
 *   id: string;
 *
 *   @NotNull({
 *     errorMessage: 'Email is required',
 *     treatEmptyAsNull: true
 *   })
 *   @Neo4jProperty()
 *   email: string;
 *
 *   @NotNull({
 *     defaultValue: 'Unknown',
 *     treatEmptyAsNull: true
 *   })
 *   @Neo4jProperty()
 *   name: string;
 *
 *   @Neo4jProperty()
 *   optionalField?: string; // Not decorated with @NotNull
 * }
 * ```
 *
 * @param config - Configuration options for the not null constraint
 */
export function NotNull(config?: NotNullConfig): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    const propertyName = String(propertyKey);

    const finalConfig = config || {};

    // Validate configuration
    validateNotNullConfig(propertyName, finalConfig);

    // Get entity metadata for label information
    const entityMetadata = Reflect.getMetadata('entity', target.constructor);
    const label = entityMetadata?.label || target.constructor.name;

    // Create constraint metadata
    const constraintMetadata =
      createConstraintMetadata<NotNullConstraintMetadata>({
        type: 'NOT_NULL',
        target: 'property',
        properties: [propertyName],
        label,
        options: {
          name:
            finalConfig.name ||
            `${label.toLowerCase()}_${propertyName}_not_null`,
          errorMessage:
            finalConfig.errorMessage ||
            `Property '${propertyName}' cannot be null or undefined`,
          createOnStartup: finalConfig.createOnStartup !== false, // Default to true
          treatEmptyAsNull: finalConfig.treatEmptyAsNull || false,
          defaultValue: finalConfig.defaultValue,
        },
        description:
          finalConfig.description ||
          `Not null constraint on ${label}.${propertyName}`,
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

    // Also store in not null constraints collection
    const existingNotNullConstraints =
      Reflect.getMetadata(
        CONSTRAINT_METADATA_KEYS.NOT_NULL,
        target.constructor
      ) || [];
    existingNotNullConstraints.push(constraintMetadata);
    SetMetadata(
      CONSTRAINT_METADATA_KEYS.NOT_NULL,
      existingNotNullConstraints
    )(target.constructor);

    // Add validation methods to the prototype
    addNotNullValidationMethods(target, constraintMetadata);

    // Add property getter/setter with validation
    addPropertyValidation(target, propertyKey, constraintMetadata);
  };
}

/**
 * @Required decorator - alias for @NotNull with treatEmptyAsNull: true
 *
 * Convenience decorator that treats empty strings as null values.
 * Useful for form validation where empty strings should be considered invalid.
 *
 * @example
 * ```typescript
 * @Neo4jEntity({ label: 'User' })
 * export class User {
 *   @Required()
 *   @Neo4jProperty()
 *   email: string; // Cannot be null, undefined, or empty string
 *
 *   @Required({ defaultValue: 'Anonymous' })
 *   @Neo4jProperty()
 *   name: string; // Uses default if empty
 * }
 * ```
 */
export function Required(
  config?: Omit<NotNullConfig, 'treatEmptyAsNull'>
): PropertyDecorator {
  const finalConfig = config || {};
  return NotNull({
    ...finalConfig,
    treatEmptyAsNull: true,
    errorMessage:
      finalConfig.errorMessage || `Property is required and cannot be empty`,
  });
}

/**
 * @NotEmpty decorator - ensures strings are not empty (but can be null)
 *
 * Different from @Required - allows null/undefined but not empty strings.
 * Useful when a property is optional but must have content when provided.
 *
 * @example
 * ```typescript
 * @Neo4jEntity({ label: 'User' })
 * export class User {
 *   @NotEmpty()
 *   @Neo4jProperty()
 *   description?: string; // Can be null but not empty string
 * }
 * ```
 */
export function NotEmpty(
  config?: Omit<NotNullConfig, 'treatEmptyAsNull'>
): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    const propertyName = String(propertyKey);

    const finalConfig = config || {};

    const notEmptyConfig: NotNullConfig = {
      ...finalConfig,
      name:
        finalConfig.name ||
        `${target.constructor.name.toLowerCase()}_${propertyName}_not_empty`,
      errorMessage:
        finalConfig.errorMessage ||
        `Property '${propertyName}' cannot be empty`,
      // Custom validation for not empty
    };

    // Apply NotNull decorator with custom validation
    NotNull(notEmptyConfig)(target, propertyKey);

    // Add additional empty string validation
    addNotEmptyValidation(target, propertyKey);
  };
}

/**
 * Add validation methods to entity prototype
 */
function addNotNullValidationMethods(
  prototype: any,
  constraintMetadata: NotNullConstraintMetadata
): void {
  const propertyName = constraintMetadata.properties[0];
  const methodName = `validateNotNull_${propertyName}`;

  // Add validation method
  if (!prototype[methodName]) {
    prototype[methodName] = function (): {
      valid: boolean;
      errors: string[];
      value?: any;
    } {
      const errors: string[] = [];
      let value = this[propertyName];

      // Check for null/undefined
      if (value === null || value === undefined) {
        // Use default value if provided
        if (constraintMetadata.options?.defaultValue !== undefined) {
          value = constraintMetadata.options.defaultValue;
          this[propertyName] = value;
        } else {
          errors.push(
            constraintMetadata.options?.errorMessage ||
              `Property '${propertyName}' cannot be null or undefined`
          );
        }
      }

      // Check for empty strings if configured
      if (
        constraintMetadata.options?.treatEmptyAsNull &&
        typeof value === 'string' &&
        value.trim() === ''
      ) {
        // Use default value if provided
        if (constraintMetadata.options?.defaultValue !== undefined) {
          value = constraintMetadata.options.defaultValue;
          this[propertyName] = value;
        } else {
          errors.push(
            constraintMetadata.options?.errorMessage ||
              `Property '${propertyName}' cannot be empty`
          );
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        value,
      };
    };
  }

  // Add value normalization method
  const normalizeMethodName = `normalizeNotNull_${propertyName}`;
  if (!prototype[normalizeMethodName]) {
    prototype[normalizeMethodName] = function (): any {
      let value = this[propertyName];

      // Apply default value if null/undefined
      if (
        (value === null || value === undefined) &&
        constraintMetadata.options?.defaultValue !== undefined
      ) {
        value = constraintMetadata.options.defaultValue;
        this[propertyName] = value;
      }

      // Apply default value if empty string and treatEmptyAsNull is true
      if (
        constraintMetadata.options?.treatEmptyAsNull &&
        typeof value === 'string' &&
        value.trim() === '' &&
        constraintMetadata.options?.defaultValue !== undefined
      ) {
        value = constraintMetadata.options.defaultValue;
        this[propertyName] = value;
      }

      return value;
    };
  }
}

/**
 * Add property-level validation with getter/setter
 */
function addPropertyValidation(
  prototype: any,
  propertyKey: string | symbol,
  constraintMetadata: NotNullConstraintMetadata
): void {
  const propertyName = String(propertyKey);
  const privatePropertyName = `_${propertyName}`;

  // Store the original property descriptor
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    prototype,
    propertyKey
  );

  // Define new property with validation
  Object.defineProperty(prototype, propertyKey, {
    get(): any {
      return this[privatePropertyName];
    },
    set(value: any): void {
      // Apply default value if null/undefined
      if (
        (value === null || value === undefined) &&
        constraintMetadata.options?.defaultValue !== undefined
      ) {
        value = constraintMetadata.options.defaultValue;
      }

      // Apply default value if empty string and treatEmptyAsNull is true
      if (
        constraintMetadata.options?.treatEmptyAsNull &&
        typeof value === 'string' &&
        value.trim() === '' &&
        constraintMetadata.options?.defaultValue !== undefined
      ) {
        value = constraintMetadata.options.defaultValue;
      }

      this[privatePropertyName] = value;
    },
    enumerable: true,
    configurable: true,
  });

  // If there was an original setter, preserve its behavior
  if (originalDescriptor?.set) {
    const originalSetter = originalDescriptor.set;
    Object.defineProperty(prototype, propertyKey, {
      get(): any {
        return this[privatePropertyName];
      },
      set(value: any): void {
        // Apply our validation first
        if (
          (value === null || value === undefined) &&
          constraintMetadata.options?.defaultValue !== undefined
        ) {
          value = constraintMetadata.options.defaultValue;
        }

        if (
          constraintMetadata.options?.treatEmptyAsNull &&
          typeof value === 'string' &&
          value.trim() === '' &&
          constraintMetadata.options?.defaultValue !== undefined
        ) {
          value = constraintMetadata.options.defaultValue;
        }

        // Then call original setter
        originalSetter.call(this, value);
        this[privatePropertyName] = value;
      },
      enumerable: true,
      configurable: true,
    });
  }
}

/**
 * Add not empty validation (separate from not null)
 */
function addNotEmptyValidation(
  prototype: any,
  propertyKey: string | symbol
): void {
  const propertyName = String(propertyKey);
  const methodName = `validateNotEmpty_${propertyName}`;

  if (!prototype[methodName]) {
    prototype[methodName] = function (): { valid: boolean; errors: string[] } {
      const errors: string[] = [];
      const value = this[propertyName];

      // Allow null/undefined for NotEmpty (different from Required)
      if (
        value !== null &&
        value !== undefined &&
        typeof value === 'string' &&
        value.trim() === ''
      ) {
        errors.push(`Property '${propertyName}' cannot be empty`);
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    };
  }
}

/**
 * Validate not null constraint configuration
 */
function validateNotNullConfig(
  propertyName: string,
  config: NotNullConfig
): void {
  if (!propertyName || typeof propertyName !== 'string') {
    throw new Error('NotNull decorator requires a valid property name');
  }

  // Basic validation for Neo4j property names
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(propertyName)) {
    throw new Error(
      `NotNull property '${propertyName}' must be a valid Neo4j property name`
    );
  }

  // Validate configuration options
  if (config.name && typeof config.name !== 'string') {
    throw new Error('NotNull name must be a string');
  }

  if (config.errorMessage && typeof config.errorMessage !== 'string') {
    throw new Error('NotNull errorMessage must be a string');
  }

  if (
    config.treatEmptyAsNull !== undefined &&
    typeof config.treatEmptyAsNull !== 'boolean'
  ) {
    throw new Error('NotNull treatEmptyAsNull must be a boolean');
  }

  if (
    config.createOnStartup !== undefined &&
    typeof config.createOnStartup !== 'boolean'
  ) {
    throw new Error('NotNull createOnStartup must be a boolean');
  }
}

/**
 * Utility function to extract not null constraints from a class
 */
export function getNotNullConstraints(
  constructor: any
): NotNullConstraintMetadata[] {
  return (
    Reflect.getMetadata(CONSTRAINT_METADATA_KEYS.NOT_NULL, constructor) || []
  );
}

/**
 * Utility function to check if a class has not null constraints
 */
export function hasNotNullConstraints(constructor: any): boolean {
  return getNotNullConstraints(constructor).length > 0;
}

/**
 * Generate Neo4j CREATE CONSTRAINT query for property existence (NOT NULL equivalent)
 */
export function generateNotNullConstraintQuery(
  constraint: NotNullConstraintMetadata
): { query: string; name: string } {
  const constraintName =
    constraint.options?.name ||
    `${constraint.label?.toLowerCase() || 'node'}_${
      constraint.properties[0]
    }_exists`;

  const propertyName = constraint.properties[0];

  // Neo4j property existence constraint
  const query = `CREATE CONSTRAINT ${constraintName} FOR (n:${constraint.label}) REQUIRE n.${propertyName} IS NOT NULL`;

  return {
    query,
    name: constraintName,
  };
}

/**
 * Utility to validate all not null constraints on an entity
 */
export function validateAllNotNullConstraints(entity: any): {
  valid: boolean;
  errors: string[];
} {
  const constructor = entity.constructor;
  const constraints = getNotNullConstraints(constructor);
  const allErrors: string[] = [];

  for (const constraint of constraints) {
    const propertyName = constraint.properties[0];
    const methodName = `validateNotNull_${propertyName}`;

    if (typeof entity[methodName] === 'function') {
      const result = entity[methodName]();
      if (!result.valid) {
        allErrors.push(...result.errors);
      }
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}
