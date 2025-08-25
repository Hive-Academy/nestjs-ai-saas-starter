import 'reflect-metadata';
import { int } from 'neo4j-driver';

export interface Neo4jSafeOptions {
  /**
   * Automatically serialize complex objects to JSON strings
   * @default true
   */
  autoSerialize?: boolean;

  /**
   * Automatically wrap numbers with neo4j int() function
   * @default true
   */
  autoInt?: boolean;

  /**
   * Validate parameters before execution
   * @default true
   */
  validateParams?: boolean;

  /**
   * Log parameter transformations (for debugging)
   * @default false
   */
  logTransformations?: boolean;
}

/**
 * Neo4jSafe decorator that automatically handles Neo4j parameter serialization
 * and deserialization to prevent common Neo4j issues with complex objects.
 *
 * Features:
 * - Automatically serializes objects/arrays to JSON strings for Neo4j storage
 * - Wraps numeric values with neo4j int() function
 * - Deserializes JSON strings back to objects in return values
 * - Validates parameters to prevent Neo4j errors
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserRepository {
 *   @Neo4jSafe()
 *   async createUser(userData: ComplexUserData) {
 *     // userData.metadata will be automatically JSON.stringify'd
 *     // userData.id will be wrapped with int() if it's a number
 *     return this.neo4j.write(async (session) => {
 *       const result = await session.run(
 *         'CREATE (u:User $props) RETURN u',
 *         { props: userData }
 *       );
 *       return result.records[0]?.get('u');
 *     });
 *   }
 * }
 * ```
 */
export function Neo4jSafe(options?: Neo4jSafeOptions): MethodDecorator {
  const opts: Required<Neo4jSafeOptions> = {
    autoSerialize: true,
    autoInt: true,
    validateParams: true,
    logTransformations: false,
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
        // Transform arguments for Neo4j compatibility
        const transformedArgs = args.map((arg) => {
          if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
            return transformObjectForNeo4j(arg, opts);
          }
          return arg;
        });

        if (opts.logTransformations) {
          console.log(
            `[Neo4jSafe] Transformed parameters for ${String(propertyKey)}:`,
            {
              original: args,
              transformed: transformedArgs,
            }
          );
        }

        // Execute original method with transformed args
        const result = await originalMethod.apply(this, transformedArgs);

        // Transform result back if it contains Neo4j data
        return transformResultFromNeo4j(result);
      } catch (error) {
        // Enhanced error context for Neo4j operations
        const errorContext = {
          method: String(propertyKey),
          args: args.map((arg) => (typeof arg === 'object' ? '[Object]' : arg)),
          timestamp: new Date().toISOString(),
        };

        if (error instanceof Error) {
          error.message = `[Neo4jSafe] ${
            error.message
          } | Context: ${JSON.stringify(errorContext)}`;
        }
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Transform an object to be Neo4j-compatible
 */
function transformObjectForNeo4j(
  obj: any,
  options: Required<Neo4jSafeOptions>
): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformObjectForNeo4j(item, options));
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (typeof obj === 'number' && options.autoInt) {
    // Only wrap integers, not floats
    return Number.isInteger(obj) ? int(obj) : obj;
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
      options.autoInt &&
      Number.isInteger(value)
    ) {
      transformed[key] = int(value);
    } else if (value instanceof Date) {
      transformed[key] = value.toISOString();
    } else if (Array.isArray(value)) {
      if (options.autoSerialize && containsComplexObjects(value)) {
        transformed[key] = JSON.stringify(value);
      } else {
        transformed[key] = value.map((item) =>
          transformObjectForNeo4j(item, options)
        );
      }
    } else if (typeof value === 'object') {
      if (options.autoSerialize && isComplexObject(value)) {
        transformed[key] = JSON.stringify(value);
      } else {
        transformed[key] = transformObjectForNeo4j(value, options);
      }
    } else {
      transformed[key] = value;
    }
  }

  return transformed;
}

/**
 * Transform Neo4j result back to JavaScript objects
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
    if (typeof value === 'string' && isJsonString(value)) {
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

/**
 * Check if a string is a valid JSON string
 */
function isJsonString(str: string): boolean {
  if (typeof str !== 'string') return false;

  // Quick heuristic: JSON strings typically start with { or [
  if (!str.trim().match(/^[{[].*[}\]]$/s)) return false;

  try {
    const parsed = JSON.parse(str);
    return typeof parsed === 'object';
  } catch {
    return false;
  }
}
