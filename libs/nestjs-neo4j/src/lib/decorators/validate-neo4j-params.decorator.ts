import 'reflect-metadata';
import {
  getNeo4jConfig,
  getNeo4jConfigWithDefaults,
} from '../utils/neo4j-config.accessor';

export interface Neo4jParamValidationOptions {
  /**
   * Validate that string parameters don't contain cypher injection patterns
   * @default true
   */
  preventInjection?: boolean;

  /**
   * Check for common Neo4j parameter issues (null values in arrays, etc.)
   * @default true
   */
  validateStructure?: boolean;

  /**
   * Maximum depth for nested object validation
   * @default 10
   */
  maxDepth?: number;

  /**
   * Throw error on validation failure vs. log warning
   * @default true
   */
  throwOnValidationError?: boolean;
}

export class Neo4jValidationError extends Error {
  constructor(
    message: string,
    public readonly paramName: string,
    public readonly paramValue: any,
    public readonly validationType: string
  ) {
    super(`[Neo4j Validation] ${message}`);
    this.name = 'Neo4jValidationError';
  }
}

/**
 * ValidateNeo4jParams decorator that validates parameters before they're sent to Neo4j
 * to prevent common issues and potential injection attacks.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserRepository {
 *   @ValidateNeo4jParams()
 *   @Neo4jSafe()
 *   async findUser(params: { userId: string; filters?: any }) {
 *     // params will be validated before execution
 *     return this.neo4j.read(async (session) => {
 *       return session.run('MATCH (u:User {id: $userId}) RETURN u', params);
 *     });
 *   }
 * }
 * ```
 */
export function ValidateNeo4jParams(
  options?: Neo4jParamValidationOptions
): MethodDecorator {
  const opts: Required<Neo4jParamValidationOptions> = {
    preventInjection: true,
    validateStructure: true,
    maxDepth: 10,
    throwOnValidationError: true,
    ...options,
  };

  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      try {
        // Validate all arguments
        args.forEach((arg, index) => {
          validateParameter(arg, `arg${index}`, opts, 0);
        });

        return await originalMethod.apply(this, args);
      } catch (error) {
        if (error instanceof Neo4jValidationError) {
          if (opts.throwOnValidationError) {
            throw error;
          } else {
            console.warn(
              `[Neo4j Validation Warning] ${error.message} in method ${String(
                propertyKey
              )}`
            );
            return await originalMethod.apply(this, args);
          }
        }
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Validate a single parameter recursively
 */
function validateParameter(
  value: any,
  paramName: string,
  options: Required<Neo4jParamValidationOptions>,
  depth: number
): void {
  if (depth > options.maxDepth) {
    throw new Neo4jValidationError(
      `Parameter nesting too deep (max: ${options.maxDepth})`,
      paramName,
      '[Deep Object]',
      'MAX_DEPTH'
    );
  }

  if (value === null || value === undefined) {
    return; // Null/undefined are valid in Neo4j
  }

  if (typeof value === 'string') {
    validateStringParameter(value, paramName, options);
  } else if (Array.isArray(value)) {
    validateArrayParameter(value, paramName, options, depth);
  } else if (typeof value === 'object') {
    validateObjectParameter(value, paramName, options, depth);
  } else if (typeof value === 'function') {
    throw new Neo4jValidationError(
      'Functions are not valid Neo4j parameters',
      paramName,
      typeof value,
      'INVALID_TYPE'
    );
  }
}

/**
 * Validate string parameters for potential injection
 */
function validateStringParameter(
  value: string,
  paramName: string,
  options: Required<Neo4jParamValidationOptions>
): void {
  if (!options.preventInjection) return;

  // First check if this is a valid JSON string - if so, it's safe
  if (isValidJsonString(value)) {
    // JSON strings are safe - they're meant to be stored as strings in Neo4j
    // Just check the size
    if (value.length > 1000000) {
      // 1MB limit
      throw new Neo4jValidationError(
        `JSON string parameter too large (${value.length} chars, max: 1,000,000)`,
        paramName,
        '[Large JSON String]',
        'SIZE_LIMIT'
      );
    }
    return; // JSON strings are safe, skip injection checks
  }

  // For non-JSON strings, check for ACTUAL Cypher injection patterns
  // These patterns are VERY specific to avoid false positives
  const suspiciousPatterns = [
    // Actual Cypher statements that are clearly injection attempts
    // Must have statement followed by parentheses/brackets AND additional structure
    /\b(MATCH|CREATE|DELETE|DETACH|MERGE)\s*\([^)]*\)\s*(RETURN|WHERE|SET|WITH)/i,

    // RETURN/WITH must be followed by actual Cypher patterns, not just words
    /\b(RETURN|WITH)\s+[\w]+\s*\.\s*[\w]+/i, // e.g., RETURN n.property
    /\b(RETURN|WITH)\s+\*/i, // e.g., RETURN *

    // SQL-style injection with actual statement terminators
    /;\s*(MATCH|CREATE|DELETE|DROP|MERGE)\s/i,
    /['"`]\s*;\s*(MATCH|CREATE|DELETE|DROP)/i,
    /['"`]\s+(OR|AND)\s+\d+\s*=\s*\d+/i,

    // Cypher comment injection (keep this as-is)
    /\/\*.*\*\/|\/\/.*/,

    // Node/relationship patterns with actual Cypher syntax
    /\(\s*:\s*\w+\s*\{[^}]*\}\s*\)/, // (n:Label {prop: value})
    /\(\s*\w+\s*:\s*\w+\s*\)/, // (var:Label)
    /-\[:\w+\]->/, // -[:RELATIONSHIP]->
    /<-\[:\w+\]-/, // <-[:RELATIONSHIP]-
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(value)) {
      throw new Neo4jValidationError(
        `Potential Cypher injection detected in string parameter: ${value.substring(
          0,
          100
        )}...`,
        paramName,
        value,
        'INJECTION_RISK'
      );
    }
  }

  // Check for excessive length that might cause memory issues
  if (value.length > 1000000) {
    // 1MB limit
    throw new Neo4jValidationError(
      `String parameter too large (${value.length} chars, max: 1,000,000)`,
      paramName,
      '[Large String]',
      'SIZE_LIMIT'
    );
  }
}

/**
 * Check if a string is valid JSON
 */
function isValidJsonString(str: string): boolean {
  if (typeof str !== 'string') return false;

  // Quick heuristic: JSON strings typically start with { or [
  const trimmed = str.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return false;
  }

  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate array parameters
 */
function validateArrayParameter(
  value: any[],
  paramName: string,
  options: Required<Neo4jParamValidationOptions>,
  depth: number
): void {
  if (!options.validateStructure) return;

  // Check array size
  if (value.length > 10000) {
    throw new Neo4jValidationError(
      `Array parameter too large (${value.length} items, max: 10,000)`,
      paramName,
      '[Large Array]',
      'SIZE_LIMIT'
    );
  }

  // Validate each array element
  value.forEach((item, index) => {
    validateParameter(item, `${paramName}[${index}]`, options, depth + 1);
  });

  // Check for mixed types that might cause Neo4j issues
  const types = new Set(value.map((item) => typeof item));
  if (types.size > 1 && types.has('object') && types.has('string')) {
    console.warn(
      `[Neo4j Validation] Mixed types in array parameter '${paramName}' may cause Neo4j serialization issues`
    );
  }
}

/**
 * Validate object parameters
 */
function validateObjectParameter(
  value: object,
  paramName: string,
  options: Required<Neo4jParamValidationOptions>,
  depth: number
): void {
  if (!options.validateStructure) return;

  // Skip validation for special objects
  if (value instanceof Date || value instanceof RegExp) {
    return;
  }

  const entries = Object.entries(value);

  // Check object size
  if (entries.length > 1000) {
    throw new Neo4jValidationError(
      `Object parameter too large (${entries.length} properties, max: 1,000)`,
      paramName,
      '[Large Object]',
      'SIZE_LIMIT'
    );
  }

  // Validate each property
  entries.forEach(([key, val]) => {
    // Validate property name
    if (typeof key !== 'string' || key.length === 0) {
      throw new Neo4jValidationError(
        'Object property names must be non-empty strings',
        `${paramName}.${key}`,
        key,
        'INVALID_KEY'
      );
    }

    // Check for potentially problematic property names
    if (key.includes('.') || key.includes(' ') || key.startsWith('_')) {
      console.warn(
        `[Neo4j Validation] Property name '${key}' in parameter '${paramName}' may cause Neo4j access issues`
      );
    }

    // Validate property value
    validateParameter(val, `${paramName}.${key}`, options, depth + 1);
  });

  // Check for circular references (basic check)
  try {
    JSON.stringify(value);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('circular')) {
      throw new Neo4jValidationError(
        'Circular references are not supported in Neo4j parameters',
        paramName,
        '[Circular Object]',
        'CIRCULAR_REFERENCE'
      );
    }
  }
}
