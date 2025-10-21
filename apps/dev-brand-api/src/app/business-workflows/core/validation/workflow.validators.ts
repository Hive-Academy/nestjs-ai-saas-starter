/**
 * Comprehensive Validation Decorators for Business Workflows
 *
 * Provides enterprise-grade validation with:
 * - Type-safe validation decorators
 * - Context-aware error messages
 * - Performance optimized validation
 * - Proper error hierarchy integration
 * - Runtime type checking
 */

import 'reflect-metadata';
import {
  InputValidationError,
  StateValidationError,
} from '../errors/business-workflow.errors';

// ============================================================================
// VALIDATION METADATA KEYS
// ============================================================================

const VALIDATION_METADATA_KEY = Symbol('validation');
const PARAMETER_METADATA_KEY = Symbol('parameter_validation');
// Reserved for future state validation features
// const STATE_METADATA_KEY = Symbol('state_validation');

// ============================================================================
// VALIDATION RULE TYPES
// ============================================================================

interface ValidationRule {
  type: string;
  constraint?: any;
  message?: string;
  optional?: boolean;
}

interface ParameterValidation {
  index: number;
  rules: ValidationRule[];
  parameterName: string;
}

interface StateValidation {
  propertyKey: string;
  rules: ValidationRule[];
}

// ============================================================================
// CORE VALIDATION DECORATORS
// ============================================================================

/**
 * Required field validation
 * Ensures the field is not null, undefined, or empty string
 */
export function Required(message?: string) {
  return function (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number
  ) {
    const validationRule: ValidationRule = {
      type: 'required',
      message: message || `Field is required`,
    };

    if (typeof parameterIndex === 'number') {
      // Parameter validation
      addParameterValidation(
        target,
        propertyKey as string,
        parameterIndex,
        validationRule,
        'value'
      );
    } else {
      // Property validation
      addPropertyValidation(target, propertyKey as string, validationRule);
    }
  };
}

/**
 * String length validation
 */
export function StringLength(min?: number, max?: number, message?: string) {
  return function (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number
  ) {
    const validationRule: ValidationRule = {
      type: 'stringLength',
      constraint: { min, max },
      message:
        message ||
        `String length must be between ${min || 0} and ${
          max || 'unlimited'
        } characters`,
    };

    if (typeof parameterIndex === 'number') {
      addParameterValidation(
        target,
        propertyKey as string,
        parameterIndex,
        validationRule,
        'value'
      );
    } else {
      addPropertyValidation(target, propertyKey as string, validationRule);
    }
  };
}

/**
 * Type validation
 */
export function IsType(
  expectedType: 'string' | 'number' | 'boolean' | 'object' | 'array',
  message?: string
) {
  return function (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number
  ) {
    const validationRule: ValidationRule = {
      type: 'isType',
      constraint: expectedType,
      message: message || `Value must be of type ${expectedType}`,
    };

    if (typeof parameterIndex === 'number') {
      addParameterValidation(
        target,
        propertyKey as string,
        parameterIndex,
        validationRule,
        'value'
      );
    } else {
      addPropertyValidation(target, propertyKey as string, validationRule);
    }
  };
}

/**
 * Email validation
 */
export function IsEmail(message?: string) {
  return function (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number
  ) {
    const validationRule: ValidationRule = {
      type: 'isEmail',
      message: message || 'Must be a valid email address',
    };

    if (typeof parameterIndex === 'number') {
      addParameterValidation(
        target,
        propertyKey as string,
        parameterIndex,
        validationRule,
        'value'
      );
    } else {
      addPropertyValidation(target, propertyKey as string, validationRule);
    }
  };
}

/**
 * URL validation
 */
export function IsUrl(message?: string) {
  return function (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number
  ) {
    const validationRule: ValidationRule = {
      type: 'isUrl',
      message: message || 'Must be a valid URL',
    };

    if (typeof parameterIndex === 'number') {
      addParameterValidation(
        target,
        propertyKey as string,
        parameterIndex,
        validationRule,
        'value'
      );
    } else {
      addPropertyValidation(target, propertyKey as string, validationRule);
    }
  };
}

/**
 * Pattern validation (regex)
 */
export function Matches(pattern: RegExp, message?: string) {
  return function (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number
  ) {
    const validationRule: ValidationRule = {
      type: 'matches',
      constraint: pattern,
      message: message || `Value must match pattern ${pattern.toString()}`,
    };

    if (typeof parameterIndex === 'number') {
      addParameterValidation(
        target,
        propertyKey as string,
        parameterIndex,
        validationRule,
        'value'
      );
    } else {
      addPropertyValidation(target, propertyKey as string, validationRule);
    }
  };
}

/**
 * Numeric range validation
 */
export function Range(min?: number, max?: number, message?: string) {
  return function (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number
  ) {
    const validationRule: ValidationRule = {
      type: 'range',
      constraint: { min, max },
      message:
        message || `Value must be between ${min || '-∞'} and ${max || '+∞'}`,
    };

    if (typeof parameterIndex === 'number') {
      addParameterValidation(
        target,
        propertyKey as string,
        parameterIndex,
        validationRule,
        'value'
      );
    } else {
      addPropertyValidation(target, propertyKey as string, validationRule);
    }
  };
}

/**
 * Array validation
 */
export function IsArray(
  minLength?: number,
  maxLength?: number,
  message?: string
) {
  return function (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number
  ) {
    const validationRule: ValidationRule = {
      type: 'isArray',
      constraint: { minLength, maxLength },
      message:
        message ||
        `Must be an array with length between ${minLength || 0} and ${
          maxLength || 'unlimited'
        }`,
    };

    if (typeof parameterIndex === 'number') {
      addParameterValidation(
        target,
        propertyKey as string,
        parameterIndex,
        validationRule,
        'value'
      );
    } else {
      addPropertyValidation(target, propertyKey as string, validationRule);
    }
  };
}

/**
 * Enum validation
 */
export function IsEnum(enumObject: any, message?: string) {
  return function (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number
  ) {
    const validationRule: ValidationRule = {
      type: 'isEnum',
      constraint: enumObject,
      message:
        message ||
        `Value must be one of: ${Object.values(enumObject).join(', ')}`,
    };

    if (typeof parameterIndex === 'number') {
      addParameterValidation(
        target,
        propertyKey as string,
        parameterIndex,
        validationRule,
        'value'
      );
    } else {
      addPropertyValidation(target, propertyKey as string, validationRule);
    }
  };
}

// ============================================================================
// BUSINESS-SPECIFIC VALIDATORS
// ============================================================================

/**
 * GitHub username validation
 */
export function IsGitHubUsername(message?: string) {
  const githubUsernamePattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]){0,38}$/;
  return Matches(
    githubUsernamePattern,
    message ||
      'Must be a valid GitHub username (1-39 characters, alphanumeric and hyphens)'
  );
}

/**
 * Platform validation for content creation
 */
export function IsPlatform(message?: string) {
  const platforms = ['linkedin', 'devto', 'twitter', 'medium', 'hashnode'];
  return IsEnum(
    platforms.reduce((acc, platform) => ({ ...acc, [platform]: platform }), {}),
    message || `Platform must be one of: ${platforms.join(', ')}`
  );
}

/**
 * Content type validation
 */
export function IsContentType(message?: string) {
  const contentTypes = [
    'technical-insights',
    'career-updates',
    'thought-leadership',
    'tutorials',
    'case-studies',
    'technology-reviews',
  ];
  return IsEnum(
    contentTypes.reduce((acc, type) => ({ ...acc, [type]: type }), {}),
    message || `Content type must be one of: ${contentTypes.join(', ')}`
  );
}

/**
 * Agent ID validation
 */
export function IsAgentId(message?: string) {
  const agentPattern = /^[a-z][a-z0-9-]*[a-z0-9]$/;
  return Matches(
    agentPattern,
    message ||
      'Agent ID must be lowercase, start with letter, and contain only letters, numbers, and hyphens'
  );
}

/**
 * Workflow state validation
 */
export function IsWorkflowState(message?: string) {
  return function (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number
  ) {
    const validationRule: ValidationRule = {
      type: 'isWorkflowState',
      message: message || 'Must be a valid workflow state object',
    };

    if (typeof parameterIndex === 'number') {
      addParameterValidation(
        target,
        propertyKey as string,
        parameterIndex,
        validationRule,
        'state'
      );
    } else {
      addPropertyValidation(target, propertyKey as string, validationRule);
    }
  };
}

// ============================================================================
// METHOD-LEVEL VALIDATION DECORATORS
// ============================================================================

/**
 * Validate all parameters of a method
 */
export function ValidateParameters(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const parameterValidations = getParameterValidations(target, propertyKey);

    if (parameterValidations.length > 0) {
      validateParameters(args, parameterValidations, propertyKey);
    }

    return originalMethod.apply(this, args);
  };

  return descriptor;
}

/**
 * Validate workflow state before method execution
 */
export function ValidateState(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    // Find state parameter (usually first or second parameter)
    const stateArg = args.find(
      (arg) => arg && typeof arg === 'object' && arg.metadata
    );

    if (stateArg) {
      validateWorkflowState(stateArg, propertyKey);
    }

    return originalMethod.apply(this, args);
  };

  return descriptor;
}

/**
 * Comprehensive validation (both parameters and state)
 */
export function Validate(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  // Apply both parameter and state validation
  ValidateParameters(target, propertyKey, descriptor);
  ValidateState(target, propertyKey, descriptor);

  return descriptor;
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Add parameter validation metadata
 */
function addParameterValidation(
  target: any,
  methodName: string,
  parameterIndex: number,
  rule: ValidationRule,
  parameterName: string
) {
  const existingValidations =
    Reflect.getMetadata(PARAMETER_METADATA_KEY, target, methodName) || [];

  let paramValidation = existingValidations.find(
    (pv: ParameterValidation) => pv.index === parameterIndex
  );
  if (!paramValidation) {
    paramValidation = { index: parameterIndex, rules: [], parameterName };
    existingValidations.push(paramValidation);
  }

  paramValidation.rules.push(rule);
  Reflect.defineMetadata(
    PARAMETER_METADATA_KEY,
    existingValidations,
    target,
    methodName
  );
}

/**
 * Add property validation metadata
 */
function addPropertyValidation(
  target: any,
  propertyKey: string,
  rule: ValidationRule
) {
  const existingValidations =
    Reflect.getMetadata(VALIDATION_METADATA_KEY, target) || [];

  let propValidation = existingValidations.find(
    (pv: StateValidation) => pv.propertyKey === propertyKey
  );
  if (!propValidation) {
    propValidation = { propertyKey, rules: [] };
    existingValidations.push(propValidation);
  }

  propValidation.rules.push(rule);
  Reflect.defineMetadata(VALIDATION_METADATA_KEY, existingValidations, target);
}

/**
 * Get parameter validations for a method
 */
function getParameterValidations(
  target: any,
  methodName: string
): ParameterValidation[] {
  return Reflect.getMetadata(PARAMETER_METADATA_KEY, target, methodName) || [];
}

/**
 * Validate method parameters
 */
function validateParameters(
  args: any[],
  validations: ParameterValidation[],
  methodName: string
) {
  for (const validation of validations) {
    const value = args[validation.index];

    for (const rule of validation.rules) {
      const isValid = validateValue(value, rule);
      if (!isValid) {
        throw new InputValidationError(
          validation.parameterName,
          value,
          rule.message ||
            `Validation failed for parameter ${validation.parameterName}`,
          { methodName, parameterIndex: validation.index, rule: rule.type }
        );
      }
    }
  }
}

/**
 * Validate workflow state
 */
function validateWorkflowState(state: any, methodName: string) {
  // Basic workflow state structure validation
  if (!state || typeof state !== 'object') {
    throw new StateValidationError(
      'unknown',
      'state',
      'State must be a valid object',
      state,
      { methodName }
    );
  }

  // Check for required state properties
  const requiredProperties = ['messages', 'metadata'];
  for (const prop of requiredProperties) {
    if (!(prop in state)) {
      throw new StateValidationError(
        'unknown',
        prop,
        `Required state property '${prop}' is missing`,
        state,
        { methodName, missingProperty: prop }
      );
    }
  }

  // Validate messages array
  if (!Array.isArray(state.messages)) {
    throw new StateValidationError(
      'unknown',
      'messages',
      'State messages must be an array',
      state.messages,
      { methodName }
    );
  }

  // Validate metadata object
  if (typeof state.metadata !== 'object' || state.metadata === null) {
    throw new StateValidationError(
      'unknown',
      'metadata',
      'State metadata must be an object',
      state.metadata,
      { methodName }
    );
  }
}

/**
 * Validate a single value against a rule
 */
export function validateValue(value: any, rule: ValidationRule): boolean {
  // Handle optional fields
  if (rule.optional && (value === null || value === undefined)) {
    return true;
  }

  switch (rule.type) {
    case 'required':
      return value !== null && value !== undefined && value !== '';

    case 'stringLength': {
      if (typeof value !== 'string') return false;
      const { min: minVal = 0, max: maxVal = Infinity } = rule.constraint;
      return value.length >= minVal && value.length <= maxVal;
    }

    case 'isType': {
      if (rule.constraint === 'array') {
        return Array.isArray(value);
      }
      return typeof value === rule.constraint;
    }

    case 'isEmail': {
      if (typeof value !== 'string') return false;
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailPattern.test(value);
    }

    case 'isUrl':
      if (typeof value !== 'string') return false;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }

    case 'matches':
      if (typeof value !== 'string') return false;
      return rule.constraint.test(value);

    case 'range': {
      if (typeof value !== 'number') return false;
      const { min: minRange = -Infinity, max: maxRange = Infinity } =
        rule.constraint;
      return value >= minRange && value <= maxRange;
    }

    case 'isArray': {
      if (!Array.isArray(value)) return false;
      const {
        minLength: minArrayLength = 0,
        maxLength: maxArrayLength = Infinity,
      } = rule.constraint;
      return value.length >= minArrayLength && value.length <= maxArrayLength;
    }

    case 'isEnum':
      return Object.values(rule.constraint).includes(value);

    case 'isWorkflowState':
      return validateWorkflowStateStructure(value);

    default:
      return true; // Unknown rule types pass by default
  }
}

/**
 * Validate workflow state structure
 */
function validateWorkflowStateStructure(value: any): boolean {
  if (!value || typeof value !== 'object') return false;
  if (!Array.isArray(value.messages)) return false;
  if (!value.metadata || typeof value.metadata !== 'object') return false;
  return true;
}

// ============================================================================
// VALIDATION UTILITIES FOR EXTERNAL USE
// ============================================================================

/**
 * Manual validation function for custom scenarios
 */
export function validateValueWithRules(
  value: any,
  rules: ValidationRule[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const rule of rules) {
    const isValid = validateValue(value, rule);
    if (!isValid) {
      errors.push(rule.message || `Validation failed for rule: ${rule.type}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate object against schema
 */
export function validateObject(
  obj: any,
  schema: Record<string, ValidationRule[]>
): { isValid: boolean; errors: Record<string, string[]> } {
  const errors: Record<string, string[]> = {};

  for (const [key, rules] of Object.entries(schema)) {
    const value = obj[key];
    const result = validateValueWithRules(value, rules);

    if (!result.isValid) {
      errors[key] = result.errors;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Export validation rule interface for custom validators
export type { ValidationRule, ParameterValidation, StateValidation };
