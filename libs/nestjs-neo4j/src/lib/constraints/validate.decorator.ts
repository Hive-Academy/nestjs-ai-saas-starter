/**
 * @fileoverview Validation constraint decorators for Neo4j
 *
 * Implements comprehensive property validation including format validation,
 * range validation, length validation, and custom validation functions.
 * Provides runtime validation before database operations.
 */

import { SetMetadata } from '@nestjs/common';
import {
  CONSTRAINT_METADATA_KEYS,
  type ValidationConstraintMetadata,
  type ValidationOptions,
  type ValidationConfig,
  type ValidationFormat,
  type RangeValidation,
  type LengthValidation,
  type CustomValidation,
  createConstraintMetadata,
} from '../interfaces/constraint-metadata.interface';

/**
 * Configuration for validation decorators
 */
export interface ValidateConfig extends Omit<ValidationOptions, 'validation'> {
  /** Validation configuration */
  validation: ValidationConfig;
  /** Custom constraint name */
  name?: string;
  /** Error message for constraint violations */
  errorMessage?: string;
  /** Whether to create constraint on startup */
  createOnStartup?: boolean;
  /** Description for documentation */
  description?: string;
}

/**
 * @Validate property decorator for comprehensive property validation
 *
 * Provides extensive validation capabilities including format validation,
 * range validation, length validation, and custom validation functions.
 *
 * Features:
 * - Format validation (email, URL, UUID, regex patterns)
 * - Range validation for numeric values
 * - Length validation for strings and arrays
 * - Custom validation functions
 * - Async validation support
 * - Detailed error reporting
 *
 * @example
 * ```typescript
 * @Neo4jEntity({ label: 'User' })
 * export class User {
 *   @Validate({
 *     validation: {
 *       format: 'email',
 *       required: true
 *     }
 *   })
 *   @Neo4jProp()
 *   email: string;
 *
 *   @Validate({
 *     validation: {
 *       range: { min: 18, max: 120 }
 *     }
 *   })
 *   @Neo4jProp()
 *   age: number;
 *
 *   @Validate({
 *     validation: {
 *       length: { min: 8, max: 100 },
 *       custom: {
 *         validator: (value) => value.includes('@'),
 *         message: 'Username must contain @'
 *       }
 *     }
 *   })
 *   @Neo4jProp()
 *   username: string;
 *
 *   @Validate({
 *     validation: {
 *       format: { pattern: /^[A-Z]{2,4}$/, flags: 'i' },
 *       required: true
 *     }
 *   })
 *   @Neo4jProp()
 *   countryCode: string;
 * }
 * ```
 *
 * @param config - Validation configuration
 */
export function Validate(config?: ValidateConfig): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    const propertyName = String(propertyKey);

    // Default configuration if none provided
    const finalConfig = config || {
      validation: {
        required: false,
      },
    };

    // Validate configuration
    validateValidationConfig(propertyName, finalConfig);

    // Get entity metadata for label information
    const entityMetadata = Reflect.getMetadata('entity', target.constructor);
    const label = entityMetadata?.label || target.constructor.name;

    // Create constraint metadata
    const constraintMetadata =
      createConstraintMetadata<ValidationConstraintMetadata>({
        type: 'VALIDATION',
        target: 'property',
        properties: [propertyName],
        label,
        options: {
          name:
            finalConfig.name ||
            `${label.toLowerCase()}_${propertyName}_validation`,
          errorMessage:
            finalConfig.errorMessage ||
            `Validation failed for property '${propertyName}'`,
          createOnStartup: finalConfig.createOnStartup !== false, // Default to true
          validation: finalConfig.validation,
        },
        description:
          finalConfig.description ||
          `Validation constraint on ${label}.${propertyName}`,
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

    // Also store in validation constraints collection
    const existingValidationConstraints =
      Reflect.getMetadata(
        CONSTRAINT_METADATA_KEYS.VALIDATION,
        target.constructor
      ) || [];
    existingValidationConstraints.push(constraintMetadata);
    SetMetadata(
      CONSTRAINT_METADATA_KEYS.VALIDATION,
      existingValidationConstraints
    )(target.constructor);

    // Add validation methods to the prototype
    addValidationMethods(target, constraintMetadata);
  };
}

/**
 * Specialized validation decorators for common use cases
 */

/**
 * Options for shorthand validation decorators
 */
export interface ShorthandValidationConfig
  extends Omit<ValidateConfig, 'validation'> {
  /** Whether the field is required */
  required?: boolean;
}

/**
 * @Email decorator for email validation
 */
export function Email(
  config: ShorthandValidationConfig = {}
): PropertyDecorator {
  return Validate({
    ...config,
    validation: {
      format: 'email',
      required: config.required ?? true,
    },
    errorMessage: config.errorMessage || 'Must be a valid email address',
  });
}

/**
 * @Url decorator for URL validation
 */
export function Url(
  config: Omit<ValidateConfig, 'validation'> = {}
): PropertyDecorator {
  return Validate({
    ...config,
    validation: {
      format: 'url',
      required: true,
    },
    errorMessage: config.errorMessage || 'Must be a valid URL',
  });
}

/**
 * @Uuid decorator for UUID validation
 */
export function Uuid(
  config: Omit<ValidateConfig, 'validation'> = {}
): PropertyDecorator {
  return Validate({
    ...config,
    validation: {
      format: 'uuid',
      required: true,
    },
    errorMessage: config.errorMessage || 'Must be a valid UUID',
  });
}

/**
 * @Range decorator for numeric range validation
 */
export function Range(
  range: RangeValidation,
  config: Omit<ValidateConfig, 'validation'> = {}
): PropertyDecorator {
  return Validate({
    ...config,
    validation: {
      range,
      required: true,
    },
    errorMessage:
      config.errorMessage ||
      `Must be between ${range.min || '-∞'} and ${range.max || '∞'}`,
  });
}

/**
 * @Length decorator for string/array length validation
 */
export function Length(
  length: LengthValidation,
  config: Omit<ValidateConfig, 'validation'> = {}
): PropertyDecorator {
  return Validate({
    ...config,
    validation: {
      length,
      required: true,
    },
    errorMessage:
      config.errorMessage ||
      `Length must be between ${length.min || 0} and ${length.max || '∞'}`,
  });
}

/**
 * @Pattern decorator for regex pattern validation
 */
export function Pattern(
  pattern: RegExp,
  config: Omit<ValidateConfig, 'validation'> = {}
): PropertyDecorator {
  return Validate({
    ...config,
    validation: {
      format: { pattern },
      required: true,
    },
    errorMessage: config.errorMessage || `Must match pattern ${pattern.source}`,
  });
}

/**
 * @Custom decorator for custom validation functions
 */
export function Custom(
  validator: CustomValidation,
  config: Omit<ValidateConfig, 'validation'> = {}
): PropertyDecorator {
  return Validate({
    ...config,
    validation: {
      custom: validator,
      required: true,
    },
    errorMessage:
      config.errorMessage || validator.message || 'Custom validation failed',
  });
}

/**
 * Add validation methods to entity prototype
 */
function addValidationMethods(
  prototype: any,
  constraintMetadata: ValidationConstraintMetadata
): void {
  const propertyName = constraintMetadata.properties[0];
  const methodName = `validateProperty_${propertyName}`;

  // Add validation method
  if (!prototype[methodName]) {
    prototype[methodName] = async function (): Promise<{
      valid: boolean;
      errors: string[];
      value?: any;
    }> {
      const errors: string[] = [];
      const value = this[propertyName];
      const validation = constraintMetadata.options.validation;

      // Check required validation
      if (validation.required && (value === null || value === undefined)) {
        errors.push(`Property '${propertyName}' is required`);
        return { valid: false, errors };
      }

      // Skip further validation if value is null/undefined and not required
      if (!validation.required && (value === null || value === undefined)) {
        return { valid: true, errors: [], value };
      }

      // Format validation
      if (validation.format) {
        const formatResult = validateFormat(
          value,
          validation.format,
          propertyName
        );
        if (!formatResult.valid) {
          errors.push(...formatResult.errors);
        }
      }

      // Range validation
      if (validation.range) {
        const rangeResult = validateRange(
          value,
          validation.range,
          propertyName
        );
        if (!rangeResult.valid) {
          errors.push(...rangeResult.errors);
        }
      }

      // Length validation
      if (validation.length) {
        const lengthResult = validateLength(
          value,
          validation.length,
          propertyName
        );
        if (!lengthResult.valid) {
          errors.push(...lengthResult.errors);
        }
      }

      // Custom validation
      if (validation.custom) {
        const customResult = await validateCustom(
          value,
          validation.custom,
          propertyName,
          this
        );
        if (!customResult.valid) {
          errors.push(...customResult.errors);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        value,
      };
    };
  }

  // Add sync validation method (for non-async validations)
  const syncMethodName = `validatePropertySync_${propertyName}`;
  if (!prototype[syncMethodName]) {
    prototype[syncMethodName] = function (): {
      valid: boolean;
      errors: string[];
      value?: any;
    } {
      const errors: string[] = [];
      const value = this[propertyName];
      const validation = constraintMetadata.options.validation;

      // Check required validation
      if (validation.required && (value === null || value === undefined)) {
        errors.push(`Property '${propertyName}' is required`);
        return { valid: false, errors };
      }

      // Skip further validation if value is null/undefined and not required
      if (!validation.required && (value === null || value === undefined)) {
        return { valid: true, errors: [], value };
      }

      // Format validation
      if (validation.format) {
        const formatResult = validateFormat(
          value,
          validation.format,
          propertyName
        );
        if (!formatResult.valid) {
          errors.push(...formatResult.errors);
        }
      }

      // Range validation
      if (validation.range) {
        const rangeResult = validateRange(
          value,
          validation.range,
          propertyName
        );
        if (!rangeResult.valid) {
          errors.push(...rangeResult.errors);
        }
      }

      // Length validation
      if (validation.length) {
        const lengthResult = validateLength(
          value,
          validation.length,
          propertyName
        );
        if (!lengthResult.valid) {
          errors.push(...lengthResult.errors);
        }
      }

      // Custom validation (only if not async)
      if (validation.custom && !validation.custom.async) {
        try {
          const result = validation.custom.validator(value, this);
          if (typeof result === 'string') {
            errors.push(result);
          } else if (result === false) {
            errors.push(
              validation.custom.message ||
                `Custom validation failed for '${propertyName}'`
            );
          }
        } catch (error) {
          errors.push(
            `Custom validation error for '${propertyName}': ${
              error instanceof Error ? error.message : String(error)
            }`
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
}

/**
 * Format validation implementation
 */
function validateFormat(
  value: any,
  format: ValidationFormat,
  propertyName: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof value !== 'string') {
    errors.push(
      `Property '${propertyName}' must be a string for format validation`
    );
    return { valid: false, errors };
  }

  let regex: RegExp;
  let errorMessage: string;

  if (typeof format === 'string') {
    switch (format) {
      case 'email':
        regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        errorMessage = 'Must be a valid email address';
        break;
      case 'url':
        regex =
          /^https?:\/\/(?:[-\w.])+(?:[:\d]+)?(?:\/(?:[\w._~!$&'()*+,;=:@]|%[\da-f]{2})*)*(?:\?(?:[\w._~!$&'()*+,;=:@/?]|%[\da-f]{2})*)?(?:#(?:[\w._~!$&'()*+,;=:@/?]|%[\da-f]{2})*)?$/i;
        errorMessage = 'Must be a valid URL';
        break;
      case 'uuid':
        regex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        errorMessage = 'Must be a valid UUID';
        break;
      case 'date':
        regex = /^\d{4}-\d{2}-\d{2}$/;
        errorMessage = 'Must be a valid date (YYYY-MM-DD)';
        break;
      case 'datetime':
        regex =
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;
        errorMessage = 'Must be a valid datetime (ISO 8601)';
        break;
      case 'time':
        regex = /^\d{2}:\d{2}:\d{2}(?:\.\d{3})?$/;
        errorMessage = 'Must be a valid time (HH:MM:SS)';
        break;
      case 'phone':
        regex = /^\+?[\d\s\-()]+$/;
        errorMessage = 'Must be a valid phone number';
        break;
      case 'creditcard':
        regex = /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/;
        errorMessage = 'Must be a valid credit card number';
        break;
      case 'json':
        try {
          JSON.parse(value);
          return { valid: true, errors: [] };
        } catch {
          errors.push('Must be valid JSON');
          return { valid: false, errors };
        }
      default:
        errors.push(`Unknown format type: ${format}`);
        return { valid: false, errors };
    }
  } else if ('pattern' in format) {
    regex = format.pattern;
    errorMessage = `Must match pattern ${format.pattern.source}`;
  } else if ('regex' in format) {
    regex = new RegExp(format.regex, format.flags);
    errorMessage = `Must match pattern ${format.regex}`;
  } else {
    errors.push('Invalid format configuration');
    return { valid: false, errors };
  }

  if (!regex.test(value)) {
    errors.push(errorMessage);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Range validation implementation
 */
function validateRange(
  value: any,
  range: RangeValidation,
  propertyName: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof value !== 'number') {
    errors.push(
      `Property '${propertyName}' must be a number for range validation`
    );
    return { valid: false, errors };
  }

  if (range.min !== undefined) {
    if (range.exclusive && value <= range.min) {
      errors.push(
        `Property '${propertyName}' must be greater than ${range.min}`
      );
    } else if (!range.exclusive && value < range.min) {
      errors.push(`Property '${propertyName}' must be at least ${range.min}`);
    }
  }

  if (range.max !== undefined) {
    if (range.exclusive && value >= range.max) {
      errors.push(`Property '${propertyName}' must be less than ${range.max}`);
    } else if (!range.exclusive && value > range.max) {
      errors.push(`Property '${propertyName}' must be at most ${range.max}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Length validation implementation
 */
function validateLength(
  value: any,
  length: LengthValidation,
  propertyName: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  let valueLength: number;

  if (typeof value === 'string') {
    valueLength = value.length;
  } else if (Array.isArray(value)) {
    valueLength = value.length;
  } else {
    errors.push(
      `Property '${propertyName}' must be a string or array for length validation`
    );
    return { valid: false, errors };
  }

  if (length.exact !== undefined) {
    if (valueLength !== length.exact) {
      errors.push(
        `Property '${propertyName}' must be exactly ${length.exact} characters/items long`
      );
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  if (length.min !== undefined && valueLength < length.min) {
    errors.push(
      `Property '${propertyName}' must be at least ${length.min} characters/items long`
    );
  }

  if (length.max !== undefined && valueLength > length.max) {
    errors.push(
      `Property '${propertyName}' must be at most ${length.max} characters/items long`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Custom validation implementation
 */
async function validateCustom(
  value: any,
  custom: CustomValidation,
  propertyName: string,
  entity: any
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    const result = await custom.validator(value, entity);

    if (typeof result === 'string') {
      errors.push(result);
    } else if (result === false) {
      errors.push(
        custom.message || `Custom validation failed for '${propertyName}'`
      );
    }
  } catch (error) {
    errors.push(
      `Custom validation error for '${propertyName}': ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate validation constraint configuration
 */
function validateValidationConfig(
  propertyName: string,
  config: ValidateConfig
): void {
  if (!propertyName || typeof propertyName !== 'string') {
    throw new Error('Validate decorator requires a valid property name');
  }

  if (!config.validation || typeof config.validation !== 'object') {
    throw new Error('Validate decorator requires a validation configuration');
  }

  const { validation } = config;

  // Validate format configuration
  if (validation.format) {
    if (typeof validation.format === 'string') {
      const validFormats = [
        'email',
        'url',
        'uuid',
        'date',
        'datetime',
        'time',
        'phone',
        'creditcard',
        'json',
      ];
      if (!validFormats.includes(validation.format)) {
        throw new Error(`Invalid format type: ${validation.format}`);
      }
    } else if (typeof validation.format === 'object') {
      if (
        'pattern' in validation.format &&
        !(validation.format.pattern instanceof RegExp)
      ) {
        throw new Error('Format pattern must be a RegExp');
      }
      if (
        'regex' in validation.format &&
        typeof validation.format.regex !== 'string'
      ) {
        throw new Error('Format regex must be a string');
      }
    } else {
      throw new Error('Format must be a string or object with pattern/regex');
    }
  }

  // Validate range configuration
  if (validation.range) {
    if (typeof validation.range !== 'object') {
      throw new Error('Range validation must be an object');
    }
    if (
      validation.range.min !== undefined &&
      typeof validation.range.min !== 'number'
    ) {
      throw new Error('Range min must be a number');
    }
    if (
      validation.range.max !== undefined &&
      typeof validation.range.max !== 'number'
    ) {
      throw new Error('Range max must be a number');
    }
    if (
      validation.range.min !== undefined &&
      validation.range.max !== undefined &&
      validation.range.min > validation.range.max
    ) {
      throw new Error('Range min cannot be greater than max');
    }
  }

  // Validate length configuration
  if (validation.length) {
    if (typeof validation.length !== 'object') {
      throw new Error('Length validation must be an object');
    }
    if (
      validation.length.min !== undefined &&
      typeof validation.length.min !== 'number'
    ) {
      throw new Error('Length min must be a number');
    }
    if (
      validation.length.max !== undefined &&
      typeof validation.length.max !== 'number'
    ) {
      throw new Error('Length max must be a number');
    }
    if (
      validation.length.exact !== undefined &&
      typeof validation.length.exact !== 'number'
    ) {
      throw new Error('Length exact must be a number');
    }
    if (
      validation.length.min !== undefined &&
      validation.length.max !== undefined &&
      validation.length.min > validation.length.max
    ) {
      throw new Error('Length min cannot be greater than max');
    }
  }

  // Validate custom configuration
  if (validation.custom) {
    if (typeof validation.custom !== 'object') {
      throw new Error('Custom validation must be an object');
    }
    if (typeof validation.custom.validator !== 'function') {
      throw new Error('Custom validator must be a function');
    }
    if (
      validation.custom.message &&
      typeof validation.custom.message !== 'string'
    ) {
      throw new Error('Custom validation message must be a string');
    }
  }
}

/**
 * Utility function to extract validation constraints from a class
 */
export function getValidationConstraints(
  constructor: any
): ValidationConstraintMetadata[] {
  return (
    Reflect.getMetadata(CONSTRAINT_METADATA_KEYS.VALIDATION, constructor) || []
  );
}

/**
 * Utility function to check if a class has validation constraints
 */
export function hasValidationConstraints(constructor: any): boolean {
  return getValidationConstraints(constructor).length > 0;
}

/**
 * Utility to validate all validation constraints on an entity
 */
export async function validateAllValidationConstraints(
  entity: any
): Promise<{ valid: boolean; errors: string[] }> {
  const constructor = entity.constructor;
  const constraints = getValidationConstraints(constructor);
  const allErrors: string[] = [];

  for (const constraint of constraints) {
    const propertyName = constraint.properties[0];
    const methodName = `validateProperty_${propertyName}`;

    if (typeof entity[methodName] === 'function') {
      const result = await entity[methodName]();
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

/**
 * Utility to validate all validation constraints synchronously
 */
export function validateAllValidationConstraintsSync(entity: any): {
  valid: boolean;
  errors: string[];
} {
  const constructor = entity.constructor;
  const constraints = getValidationConstraints(constructor);
  const allErrors: string[] = [];

  for (const constraint of constraints) {
    const propertyName = constraint.properties[0];
    const methodName = `validatePropertySync_${propertyName}`;

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
