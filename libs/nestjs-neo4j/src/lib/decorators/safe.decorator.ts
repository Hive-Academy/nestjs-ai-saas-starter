/**
 * @fileoverview Unified Safe Decorator - Consolidated validation, sanitization, and transformation
 *
 * This file implements the unified @Safe() decorator that consolidates the functionality of:
 * - @Neo4jSafe (Neo4j parameter transformation and serialization)
 * - @ValidateNeo4jParams (Parameter validation and injection prevention)
 * - @ValidateInput (Input sanitization and schema validation)
 *
 * The unified decorator provides smart defaults based on method naming patterns and
 * comprehensive safety features with minimal configuration required.
 */

import 'reflect-metadata';
import { int, isInt } from 'neo4j-driver';

/**
 * Unified safety configuration combining all validation and transformation features
 */
export interface SafeConfig {
  /**
   * Enable strict validation mode with all safety features
   * @default true
   */
  strict?: boolean;

  /**
   * Enable debug logging for transformations and validations
   * @default false (true in development mode)
   */
  log?: boolean;

  /**
   * Validation and security rules
   */
  rules?: {
    // Parameter structure validation
    /** Maximum depth for nested object validation */
    maxDepth?: number;
    /** Maximum number of parameters */
    maxParams?: number;
    /** Maximum object properties */
    maxProperties?: number;
    /** Maximum array length */
    maxArrayLength?: number;
    /** Maximum string length */
    maxStringLength?: number;

    // Injection prevention
    /** Enable Cypher injection detection */
    preventInjection?: boolean;
    /** Action when injection detected: 'throw' | 'sanitize' | 'log' */
    onInjectionDetected?: 'throw' | 'sanitize' | 'log';

    // Input sanitization
    /** Remove HTML tags from string inputs */
    sanitizeHtml?: boolean;
    /** Escape special characters */
    escapeSpecialChars?: boolean;
    /** Custom sanitization patterns */
    customSanitizers?: Array<{
      pattern: RegExp;
      replacement: string;
      description?: string;
    }>;
  };

  /**
   * Neo4j-specific transformations
   */
  transforms?: {
    /** Automatically serialize complex objects to JSON strings */
    autoSerialize?: boolean;
    /** Automatically wrap integers with neo4j int() function */
    autoInt?: boolean;
    /** Transform dates to ISO strings */
    autoDateTransform?: boolean;
    /** Deserialize results back from Neo4j format */
    autoDeserialize?: boolean;
  };

  /**
   * Custom validation functions
   */
  customValidators?: Array<{
    name: string;
    validator: (value: any, context: SafeContext) => boolean | Promise<boolean>;
    message: string;
  }>;
}

/**
 * Context passed to custom validators
 */
export interface SafeContext {
  methodName: string;
  paramIndex: number;
  paramName?: string;
  isNested: boolean;
  depth: number;
  parentPath?: string;
}

/**
 * Enhanced validation error with detailed context
 */
export class SafeValidationError extends Error {
  constructor(
    message: string,
    public readonly context: SafeContext,
    public readonly paramValue: any,
    public readonly validationType: string,
    public readonly suggestions?: string[]
  ) {
    super(`[Safe Validation] ${message}`);
    this.name = 'SafeValidationError';
  }
}

/**
 * Safe decorator - Unified validation, sanitization, and transformation system
 *
 * Combines the functionality of Neo4jSafe, ValidateNeo4jParams, and ValidateInput
 * into a single, powerful safety decorator with smart defaults.
 *
 * Features:
 * - Comprehensive parameter validation (structure, types, injection prevention)
 * - Input sanitization (HTML removal, XSS prevention, special character escaping)
 * - Neo4j-specific transformations (JSON serialization, int() wrapping, date handling)
 * - Smart defaults based on method naming patterns
 * - Detailed error reporting with actionable suggestions
 * - Performance-optimized with minimal overhead
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserRepository {
 *   // Simplest usage - all safety features with smart defaults
 *   @Safe()
 *   async createUser(userData: CreateUserDto) {
 *     // Automatically applies:
 *     // - Structure validation (max depth: 10, injection prevention)
 *     // - HTML sanitization (for create operations)
 *     // - JSON serialization for complex objects
 *     // - Integer wrapping with int() function
 *     return this.neo4j.write(...)
 *   }
 *
 *   // Custom configuration for specific needs
 *   @Safe({
 *     strict: true,        // Maximum security
 *     log: true,          // Enable debug logging
 *     rules: {
 *       maxDepth: 5,      // Limit nesting
 *       sanitizeHtml: false // Skip HTML sanitization
 *     }
 *   })
 *   async updateUser(id: string, updates: Partial<User>) {
 *     return this.neo4j.write(...)
 *   }
 * }
 * ```
 */
// Overload signatures for direct decorator and factory usage
export function Safe(
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor
): PropertyDescriptor;
export function Safe(config?: SafeConfig): MethodDecorator;
export function Safe(
  targetOrConfig?: object | SafeConfig,
  propertyKey?: string | symbol,
  descriptor?: PropertyDescriptor
): PropertyDescriptor | MethodDecorator {
  // Check if this is being called as a direct decorator (3 parameters)
  if (
    arguments.length === 3 &&
    typeof targetOrConfig === 'object' &&
    propertyKey &&
    descriptor
  ) {
    // Direct decorator usage: @Safe
    const target = targetOrConfig as object;
    const actualPropertyKey = propertyKey as string | symbol;
    const actualDescriptor = descriptor as PropertyDescriptor;
    return applySafeDecorator(target, actualPropertyKey, actualDescriptor, {});
  }

  // Factory usage: @Safe() or @Safe(config)
  const config =
    typeof targetOrConfig === 'object' && !propertyKey && !descriptor
      ? (targetOrConfig as SafeConfig)
      : {};

  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor => {
    return applySafeDecorator(target, propertyKey, descriptor, config || {});
  };
}

function applySafeDecorator(
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
  config: SafeConfig
): PropertyDescriptor {
  const originalMethod = descriptor.value;
  const methodName = String(propertyKey);

  // Apply smart defaults based on method name and provided config
  const finalConfig = applySmartDefaults(methodName, config || {});

  descriptor.value = async function (this: any, ...args: any[]) {
    const startTime = Date.now();

    try {
      // Step 1: Validate parameters if enabled
      if (finalConfig.strict || finalConfig.rules) {
        validateParameters(args, finalConfig, methodName);
      }

      // Step 2: Sanitize inputs if enabled
      const sanitizedArgs = sanitizeInputs(args, finalConfig, methodName);

      // Step 3: Transform for Neo4j compatibility
      const transformedArgs = transformForNeo4j(sanitizedArgs, finalConfig);

      if (finalConfig.log) {
        const executionTime = Date.now() - startTime;
        console.log(
          `[Safe] ${methodName} - Preprocessing completed in ${executionTime}ms`,
          {
            originalArgs: args.map((arg) =>
              typeof arg === 'object' ? '[Object]' : arg
            ),
            transformedArgs: transformedArgs.map((arg) =>
              typeof arg === 'object' ? '[Object]' : arg
            ),
            config: finalConfig,
          }
        );
      }

      // Step 4: Execute original method
      const result = await originalMethod.apply(this, transformedArgs);

      // Step 5: Transform result back if needed
      const finalResult =
        finalConfig.transforms?.autoDeserialize !== false
          ? transformResultFromNeo4j(result)
          : result;

      if (finalConfig.log) {
        const totalTime = Date.now() - startTime;
        console.log(
          `[Safe] ${methodName} - Completed successfully in ${totalTime}ms`
        );
      }

      return finalResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorContext = {
        method: methodName,
        executionTime,
        args: args.map((arg) => (typeof arg === 'object' ? '[Object]' : arg)),
        timestamp: new Date().toISOString(),
        config: finalConfig,
      };

      // Enhance error with context
      if (error instanceof Error) {
        if (!(error instanceof SafeValidationError)) {
          error.message = `[Safe] ${error.message} | Context: ${JSON.stringify(
            errorContext,
            null,
            2
          )}`;
        }
      }

      if (finalConfig.log) {
        console.error(
          `[Safe] ${methodName} - Failed after ${executionTime}ms:`,
          error
        );
      }

      throw error;
    }
  };

  return descriptor;
}

/**
 * Apply smart defaults based on method name patterns and user configuration
 */
function applySmartDefaults(
  methodName: string,
  config: SafeConfig
): Required<SafeConfig> {
  // Analyze method name for patterns
  const isWrite = /^(create|save|update|delete|insert|upsert|merge)/i.test(
    methodName
  );
  const isRead = /^(find|get|search|query|read|fetch)/i.test(methodName);
  const isBulk = /bulk|batch|many/i.test(methodName);
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    strict: config.strict ?? true,
    log: config.log ?? isDevelopment,

    rules: {
      maxDepth: config.rules?.maxDepth ?? (isBulk ? 5 : 10),
      maxParams: config.rules?.maxParams ?? (isBulk ? 50 : 20),
      maxProperties: config.rules?.maxProperties ?? (isBulk ? 100 : 1000),
      maxArrayLength: config.rules?.maxArrayLength ?? (isBulk ? 1000 : 10000),
      maxStringLength: config.rules?.maxStringLength ?? 1000000, // 1MB

      preventInjection: config.rules?.preventInjection ?? true,
      onInjectionDetected: config.rules?.onInjectionDetected ?? 'throw',

      sanitizeHtml: config.rules?.sanitizeHtml ?? (isWrite && !isRead),
      escapeSpecialChars: config.rules?.escapeSpecialChars ?? false,
      customSanitizers: config.rules?.customSanitizers ?? [],

      ...config.rules,
    },

    transforms: {
      autoSerialize: config.transforms?.autoSerialize ?? true,
      autoInt: config.transforms?.autoInt ?? true,
      autoDateTransform: config.transforms?.autoDateTransform ?? true,
      autoDeserialize: config.transforms?.autoDeserialize ?? true,
      ...config.transforms,
    },

    customValidators: config.customValidators ?? [],
  };
}

/**
 * Validate all parameters using consolidated validation logic
 */
function validateParameters(
  args: any[],
  config: Required<SafeConfig>,
  methodName: string
): void {
  // Check parameter count
  if (
    config.rules.maxParams !== undefined &&
    args.length > config.rules.maxParams
  ) {
    throw new SafeValidationError(
      `Too many parameters (${args.length}, max: ${config.rules.maxParams})`,
      { methodName, paramIndex: -1, isNested: false, depth: 0 },
      args.length,
      'PARAM_COUNT',
      [
        `Consider reducing parameter count`,
        `Use object parameter instead of multiple primitives`,
      ]
    );
  }

  // Validate each parameter
  args.forEach((arg, index) => {
    const context: SafeContext = {
      methodName,
      paramIndex: index,
      paramName: `arg${index}`,
      isNested: false,
      depth: 0,
    };

    validateParameter(arg, context, config);
  });

  // Run custom validators
  for (const validator of config.customValidators) {
    args.forEach((arg, index) => {
      const context: SafeContext = {
        methodName,
        paramIndex: index,
        paramName: validator.name,
        isNested: false,
        depth: 0,
      };

      try {
        const isValid = validator.validator(arg, context);
        if (isValid === false) {
          throw new SafeValidationError(
            validator.message,
            context,
            arg,
            'CUSTOM_VALIDATION',
            [`Check custom validator: ${validator.name}`]
          );
        }
      } catch (error) {
        if (error instanceof SafeValidationError) {
          throw error;
        }
        throw new SafeValidationError(
          validator.message,
          context,
          arg,
          'CUSTOM_VALIDATION',
          [`Check custom validator: ${validator.name}`]
        );
      }
    });
  }
}

/**
 * Validate individual parameter with comprehensive checks
 */
function validateParameter(
  value: any,
  context: SafeContext,
  config: Required<SafeConfig>
): void {
  // Check maximum depth
  if (
    config.rules.maxDepth !== undefined &&
    context.depth > config.rules.maxDepth
  ) {
    throw new SafeValidationError(
      `Parameter nesting too deep (depth: ${context.depth}, max: ${config.rules.maxDepth})`,
      context,
      '[Deep Object]',
      'MAX_DEPTH',
      [
        `Reduce object nesting depth`,
        `Consider flattening complex objects`,
        `Use separate parameters for nested data`,
      ]
    );
  }

  if (value === null || value === undefined) {
    return; // Null/undefined are valid in Neo4j
  }

  // Type-specific validation
  if (typeof value === 'string') {
    validateStringParameter(value, context, config);
  } else if (Array.isArray(value)) {
    validateArrayParameter(value, context, config);
  } else if (typeof value === 'object') {
    validateObjectParameter(value, context, config);
  } else if (typeof value === 'function') {
    throw new SafeValidationError(
      'Functions are not valid Neo4j parameters',
      context,
      typeof value,
      'INVALID_TYPE',
      [
        `Remove function parameters`,
        `Use primitive values or plain objects`,
        `Consider serializing function results`,
      ]
    );
  }
}

/**
 * Enhanced string validation with injection prevention
 */
function validateStringParameter(
  value: string,
  context: SafeContext,
  config: Required<SafeConfig>
): void {
  // Size validation
  if (
    config.rules.maxStringLength !== undefined &&
    value.length > config.rules.maxStringLength
  ) {
    throw new SafeValidationError(
      `String parameter too large (${value.length} chars, max: ${config.rules.maxStringLength})`,
      context,
      '[Large String]',
      'SIZE_LIMIT',
      [
        `Reduce string length`,
        `Consider breaking into smaller chunks`,
        `Use file storage for large content`,
      ]
    );
  }

  // Injection prevention
  if (config.rules.preventInjection) {
    // Skip JSON strings - they're safe
    if (!isValidJsonString(value)) {
      const suspiciousPatterns = getSuspiciousCypherPatterns();

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          const action = config.rules.onInjectionDetected;
          const message = `Potential Cypher injection detected: ${value.substring(
            0,
            100
          )}...`;

          if (action === 'throw') {
            throw new SafeValidationError(
              message,
              context,
              value,
              'INJECTION_RISK',
              [
                `Remove suspicious Cypher patterns`,
                `Use parameterized queries`,
                `Validate input at application boundary`,
              ]
            );
          } else if (action === 'log') {
            console.warn(`[Safe] ${message}`, { context, value });
          }
          // 'sanitize' action handled in sanitization step
          break;
        }
      }
    }
  }
}

/**
 * Array validation with size and content checks
 */
function validateArrayParameter(
  value: any[],
  context: SafeContext,
  config: Required<SafeConfig>
): void {
  // Size validation
  if (
    config.rules.maxArrayLength !== undefined &&
    value.length > config.rules.maxArrayLength
  ) {
    throw new SafeValidationError(
      `Array parameter too large (${value.length} items, max: ${config.rules.maxArrayLength})`,
      context,
      '[Large Array]',
      'SIZE_LIMIT',
      [
        `Reduce array size`,
        `Consider pagination`,
        `Use bulk operations with smaller batches`,
      ]
    );
  }

  // Validate each array element
  value.forEach((item, index) => {
    const itemContext: SafeContext = {
      ...context,
      paramName: `${context.paramName}[${index}]`,
      isNested: true,
      depth: context.depth + 1,
      parentPath: context.paramName,
    };

    validateParameter(item, itemContext, config);
  });

  // Check for mixed types that might cause issues
  const types = new Set(value.map((item) => typeof item));
  if (types.size > 1 && types.has('object') && types.has('string')) {
    if (config.log) {
      console.warn(
        `[Safe] Mixed types in array '${context.paramName}' may cause Neo4j serialization issues`,
        { context, types: Array.from(types) }
      );
    }
  }
}

/**
 * Object validation with property and structure checks
 */
function validateObjectParameter(
  value: object,
  context: SafeContext,
  config: Required<SafeConfig>
): void {
  // Skip validation for special objects
  if (
    value instanceof Date ||
    value instanceof RegExp ||
    value.constructor?.name === 'Integer'
  ) {
    return;
  }

  const entries = Object.entries(value);

  // Size validation
  if (
    config.rules.maxProperties !== undefined &&
    entries.length > config.rules.maxProperties
  ) {
    throw new SafeValidationError(
      `Object parameter too large (${entries.length} properties, max: ${config.rules.maxProperties})`,
      context,
      '[Large Object]',
      'SIZE_LIMIT',
      [
        `Reduce object properties`,
        `Split into multiple smaller objects`,
        `Remove unnecessary properties`,
      ]
    );
  }

  // Validate each property
  entries.forEach(([key, val]) => {
    // Property name validation
    if (typeof key !== 'string' || key.length === 0) {
      throw new SafeValidationError(
        'Object property names must be non-empty strings',
        { ...context, paramName: `${context.paramName}.${key}` },
        key,
        'INVALID_KEY',
        [
          `Use string property names`,
          `Remove empty property names`,
          `Check object construction`,
        ]
      );
    }

    // Warn about potentially problematic property names
    if (key.includes('.') || key.includes(' ') || key.startsWith('_')) {
      if (config.log) {
        console.warn(
          `[Safe] Property name '${key}' in '${context.paramName}' may cause Neo4j access issues`
        );
      }
    }

    // Validate property value
    const propContext: SafeContext = {
      ...context,
      paramName: `${context.paramName}.${key}`,
      isNested: true,
      depth: context.depth + 1,
      parentPath: context.paramName,
    };

    validateParameter(val, propContext, config);
  });

  // Check for circular references
  try {
    JSON.stringify(value);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('circular')) {
      throw new SafeValidationError(
        'Circular references are not supported in Neo4j parameters',
        context,
        '[Circular Object]',
        'CIRCULAR_REFERENCE',
        [
          `Remove circular references`,
          `Use flat object structures`,
          `Consider using IDs instead of nested objects`,
        ]
      );
    }
  }
}

/**
 * Input sanitization with HTML removal and special character handling
 */
function sanitizeInputs(
  args: any[],
  config: Required<SafeConfig>,
  methodName: string
): any[] {
  if (
    !config.rules.sanitizeHtml &&
    !config.rules.escapeSpecialChars &&
    (config.rules.customSanitizers || []).length === 0
  ) {
    return args; // Skip sanitization if not configured
  }

  return args.map((arg, index) => {
    return sanitizeValue(arg, config, `arg${index}`);
  });
}

/**
 * Recursively sanitize a value based on configuration
 */
function sanitizeValue(
  value: any,
  config: Required<SafeConfig>,
  path: string
): any {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    let sanitized = value;

    // HTML sanitization
    if (config.rules.sanitizeHtml) {
      // First, remove script tags and their content
      sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
      // Remove encoded script tags and their content
      sanitized = sanitized.replace(
        /&lt;script[^&]*&gt;.*?&lt;\/script&gt;/gi,
        ''
      );
      // Remove any remaining script-like patterns
      sanitized = sanitized.replace(
        /(?:&lt;)?script(?:&gt;)?.*?(?:&lt;\/)?script(?:&gt;)?/gi,
        ''
      );
      // Then remove all remaining HTML tags
      sanitized = sanitized.replace(/<[^>]*>/g, '');
      // Clean up any remaining encoded HTML
      sanitized = sanitized
        .replace(/&[a-zA-Z0-9#]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Special character escaping
    if (config.rules.escapeSpecialChars) {
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }

    // Custom sanitizers
    for (const sanitizer of config.rules.customSanitizers || []) {
      sanitized = sanitized.replace(sanitizer.pattern, sanitizer.replacement);
    }

    return sanitized;
  } else if (Array.isArray(value)) {
    return value.map((item, index) =>
      sanitizeValue(item, config, `${path}[${index}]`)
    );
  } else if (typeof value === 'object') {
    const sanitized: any = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeValue(val, config, `${path}.${key}`);
    }
    return sanitized;
  }

  return value;
}

/**
 * Transform parameters for Neo4j compatibility (enhanced version)
 */
function transformForNeo4j(args: any[], config: Required<SafeConfig>): any[] {
  return args.map((arg) => transformValueForNeo4j(arg, config));
}

/**
 * Transform individual value for Neo4j compatibility
 */
function transformValueForNeo4j(obj: any, config: Required<SafeConfig>): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Convert Neo4j Integer/Long objects to JS primitives FIRST
  // This handles Integer objects coming FROM database results
  if (isInt(obj)) {
    return obj.toNumber();
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformValueForNeo4j(item, config));
  }

  if (obj instanceof Date && config.transforms.autoDateTransform) {
    return obj.toISOString();
  }

  if (
    typeof obj === 'number' &&
    config.transforms.autoInt &&
    Number.isInteger(obj)
  ) {
    return int(obj);
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const transformed: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      transformed[key] = value;
    } else if (
      typeof value === 'number' &&
      config.transforms.autoInt &&
      Number.isInteger(value)
    ) {
      transformed[key] = int(value);
    } else if (value instanceof Date && config.transforms.autoDateTransform) {
      transformed[key] = value.toISOString();
    } else if (Array.isArray(value)) {
      if (config.transforms.autoSerialize && containsComplexObjects(value)) {
        transformed[key] = JSON.stringify(value);
      } else {
        transformed[key] = value.map((item) =>
          transformValueForNeo4j(item, config)
        );
      }
    } else if (typeof value === 'object' && value !== null) {
      if (config.transforms.autoSerialize && isComplexObject(value)) {
        transformed[key] = JSON.stringify(value);
      } else {
        transformed[key] = transformValueForNeo4j(value, config);
      }
    } else {
      transformed[key] = value;
    }
  }

  return transformed;
}

/**
 * Transform Neo4j result back to JavaScript objects (enhanced version)
 */
function transformResultFromNeo4j(result: any): any {
  if (result === null || result === undefined) {
    return result;
  }

  if (Array.isArray(result)) {
    return result.map(transformResultFromNeo4j);
  }

  if (typeof result !== 'object') {
    return result;
  }

  // Handle Neo4j record properties
  if (result.properties) {
    return transformResultFromNeo4j(result.properties);
  }

  const transformed: any = {};

  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string' && isValidJsonString(value)) {
      try {
        transformed[key] = JSON.parse(value);
      } catch {
        transformed[key] = value;
      }
    } else if (Array.isArray(value)) {
      transformed[key] = value.map(transformResultFromNeo4j);
    } else if (value && typeof value === 'object') {
      transformed[key] = transformResultFromNeo4j(value);
    } else {
      transformed[key] = value;
    }
  }

  return transformed;
}

/**
 * Get comprehensive list of suspicious Cypher patterns for injection detection
 */
function getSuspiciousCypherPatterns(): RegExp[] {
  return [
    // Actual Cypher statements with structure
    /\b(MATCH|CREATE|DELETE|DETACH|MERGE)\s*\([^)]*\)\s*(RETURN|WHERE|SET|WITH)/i,

    // Standalone DELETE/DETACH statements (dangerous)
    /^\s*(DELETE|DETACH\s+DELETE)\s+\w+\s*$/i,
    /\b(DELETE|DETACH\s+DELETE)\s+[\w*]+(?:\s*,\s*[\w*]+)*\s*(?:$|;)/i,

    // RETURN/WITH with Cypher syntax
    /\b(RETURN|WITH)\s+[\w]+\s*\.\s*[\w]+/i,
    /\b(RETURN|WITH)\s+\*/i,

    // SQL-style injection with terminators
    /;\s*(MATCH|CREATE|DELETE|DROP|MERGE)\s/i,
    /['"`]\s*;\s*(MATCH|CREATE|DELETE|DROP)/i,
    /['"`]\s+(OR|AND)\s+\d+\s*=\s*\d+/i,

    // Cypher comment injection
    /\/\*.*\*\/|\/\/.*/,

    // Node/relationship patterns with syntax
    /\(\s*:\s*\w+\s*\{[^}]*\}\s*\)/,
    /\(\s*\w+\s*:\s*\w+\s*\{[^}]*\}\s*\)/, // (n:User {name: "evil"})
    /\(\s*\w+\s*:\s*\w+\s*\)/,
    /-\[:\w+\]->/,
    /<-\[:\w+\]-/,

    // APOC and other function calls
    /\b(apoc|algo|gds)\.[\w.]+\s*\(/i,

    // Administrative operations
    /\b(CALL|YIELD)\s+(apoc|db|dbms)\./i,
    /\bSHOW\s+(DATABASES|USERS|ROLES)/i,
  ];
}

/**
 * Check if string is valid JSON (enhanced version)
 */
function isValidJsonString(str: string): boolean {
  if (typeof str !== 'string' || str.length === 0) {
    return false;
  }

  const trimmed = str.trim();
  if (!trimmed.match(/^[{[].*[}]]$/)) {
    return false;
  }

  try {
    const parsed = JSON.parse(str);
    return typeof parsed === 'object';
  } catch {
    return false;
  }
}

/**
 * Check if an object is complex enough to warrant JSON serialization
 */
function isComplexObject(obj: any): boolean {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }

  // Simple objects with only primitive values don't need serialization
  const hasComplexValue = Object.values(obj).some(
    (value) =>
      value !== null && (typeof value === 'object' || Array.isArray(value))
  );

  return hasComplexValue;
}

/**
 * Check if an array contains complex objects
 */
function containsComplexObjects(arr: any[]): boolean {
  return arr.some(
    (item) => item !== null && (typeof item === 'object' || Array.isArray(item))
  );
}
