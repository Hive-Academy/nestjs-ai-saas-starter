import { SetMetadata } from '@nestjs/common';
import {
  DECORATOR_METADATA_KEYS,
  type QueryMethodConfig,
  type QueryExecutionOptions,
  type ValidationOptions,
  type TypeInfo,
} from './decorator-metadata.interface';

/**
 * Configuration for the @CypherQuery decorator
 */
export interface CypherQueryConfig<
  TReturn = any,
  TParams = Record<string, any>
> {
  /** Return type factory function (used to transform records) */
  returnType?: () => TReturn;
  /** Query execution options (cache / retry / metrics / access mode) */
  options?: QueryExecutionOptions;
  /** Parameter validation options */
  validation?: ValidationOptions;
  /** Static description (can be overridden inline) */
  description?: string;
  /** Static tags (merged with inline tags) */
  tags?: string[];
}

// Inline return shapes supported by the decorator implementation
type InlineCypherShape =
  | string
  | {
      query: string;
      params?: Record<string, any>;
      description?: string;
      tags?: string[];
    }
  | {
      cypher: string;
      parameters?: Record<string, any>;
      description?: string;
      tags?: string[];
    }; // query builder compatibility

/**
 *  @CypherQuery decorator for type-safe Cypher query execution
 *
 * Features:
 * - Type safety with return type inference
 * - Parameter validation and sanitization
 * - Query caching capabilities
 * - Retry mechanisms with exponential backoff
 * - Performance profiling and metrics
 * - Transaction support
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   @CypherQuery<User[], { name: string }>({
 *     query: 'MATCH (u:User {name: $name}) RETURN u',
 *     returnType: () => [User],
 *     options: {
 *       cache: { enabled: true, ttl: 300000 },
 *       retry: { enabled: true, attempts: 3 }
 *     }
 *   })
 *   async findByName(params: { name: string }): Promise<User[]> {
 *     // Implementation is provided by the decorator
 *   }
 * }
 * ```
 */
export function CypherQuery<TReturn = any, TParams = Record<string, any>>(
  config: CypherQueryConfig<TReturn, TParams>
): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    // Initial metadata placeholder; actual query captured at runtime for inline DX
    const metadata: QueryMethodConfig = {
      id: `${target.constructor.name}.${String(propertyKey)}`,
      query: '<INLINE>',
      description: config.description,
      tags: config.tags,
      enabled: true,
      returnType: config.returnType
        ? {
            type: config.returnType,
            isArray: isArrayReturnType(config.returnType),
          }
        : undefined,
      options: config.options,
      validation: config.validation,
    };

    // Set metadata on the method
    SetMetadata(DECORATOR_METADATA_KEYS.CYPHER_QUERY, metadata)(
      target,
      propertyKey,
      descriptor
    );

    // Store original method for potential chaining
    const originalMethod = descriptor.value;

    // Replace method implementation with inline query executor
    descriptor.value = async function (this: any, ...args: any[]) {
      // Get the Neo4j service instance
      const neo4jService = this.getNeo4jService?.() || this.neo4jService;
      if (!neo4jService) {
        throw new Error(
          `Neo4j service not found. Ensure your class has a 'neo4jService' property or 'getNeo4jService()' method.`
        );
      }
      // Execute original method to obtain inline query definition
      let inlineResult: InlineCypherShape;
      try {
        inlineResult = await originalMethod.apply(this, args);
      } catch (e) {
        throw new Error(
          `Failed executing inline query factory for ${metadata.id}: ${
            e instanceof Error ? e.message : String(e)
          }`
        );
      }

      const { finalQuery, finalParams, inlineDescription, inlineTags } =
        normalizeInlineShape(inlineResult, args);

      // Update metadata snapshot (non-mutating for other decorators, but helpful for introspection)
      metadata.query = finalQuery;
      if (inlineDescription) metadata.description = inlineDescription;
      if (inlineTags?.length) {
        metadata.tags = Array.from(
          new Set([...(metadata.tags || []), ...inlineTags])
        );
      }

      validateInlineQuery(finalQuery);

      // Extract parameters; explicit params from inline shape override auto extraction
      const params =
        finalParams ?? extractParameters(args, String(propertyKey));

      // Validate parameters if validation is enabled
      if (metadata.validation?.enabled !== false) {
        validateParameters(params, metadata.validation);
      }

      try {
        const result = await neo4jService.run(
          metadata.query,
          params,
          metadata.options
        );

        // Transform result based on return type configuration
        return transformResult(result, metadata.returnType);
      } catch (error) {
        //  error handling
        const returnedError = new Error(
          `Query execution failed in ${metadata.id}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        returnedError.stack = error instanceof Error ? error.stack : undefined;
        (returnedError as any).originalError = error;
        (returnedError as any).queryId = metadata.id;
        (returnedError as any).query = metadata.query;
        (returnedError as any).parameters = params;

        throw returnedError;
      }
    };

    // Preserve metadata on the new function
    Object.defineProperty(descriptor.value, 'name', {
      value: String(propertyKey),
    });

    return descriptor;
  };
}

/**
 * Simplified @Query decorator for basic queries
 */
// Deprecated shortcut removed – DX now prefers inline explicit query in method body.
export function Query<TReturn = any>(
  _query: string,
  _options?: Omit<CypherQueryConfig<TReturn>, 'returnType'>
): MethodDecorator {
  throw new Error(
    'Query() shortcut removed. Use @CypherQuery() with inline return instead.'
  );
}

/**
 * @FindOne decorator for single entity retrieval
 */
export function FindOne<TEntity>(
  entityType: () => TEntity,
  options?: Omit<CypherQueryConfig<TEntity>, 'query' | 'returnType'>
): MethodDecorator {
  const label = getEntityLabel(entityType);
  const query = `MATCH (n:${label} {id: $id}) RETURN n LIMIT 1`;

  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    CypherQuery({
      returnType: entityType,
      description: `Find single ${label} by ID`,
      tags: ['findOne', 'read', ...(options?.tags || [])],
      options: options?.options,
      validation: options?.validation,
    })(target, propertyKey, descriptor);
    const original = descriptor.value;
    descriptor.value = function (this: any, params: { id: string }) {
      return { query, params };
    };
  };
}

/**
 * @FindMany decorator for multiple entity retrieval
 */
export function FindMany<TEntity>(
  entityType: () => TEntity,
  options?: Omit<CypherQueryConfig<TEntity[]>, 'query' | 'returnType'>
): MethodDecorator {
  const label = getEntityLabel(entityType);
  const query = `MATCH (n:${label}) WHERE n.executionId = $executionId RETURN n`;

  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    CypherQuery({
      returnType: () => [entityType()] as TEntity[],
      description: `Find multiple ${label} entities`,
      tags: ['findMany', 'read', ...(options?.tags || [])],
      options: options?.options,
      validation: options?.validation,
    })(target, propertyKey, descriptor);
    descriptor.value = function (this: any, params: { executionId: string }) {
      return { query, params };
    };
  };
}

/**
 * @Create decorator for entity creation
 */
export function Create<TEntity>(
  entityType: () => TEntity,
  options?: Omit<CypherQueryConfig<TEntity>, 'query' | 'returnType'>
): MethodDecorator {
  const label = getEntityLabel(entityType);
  const query = `CREATE (n:${label} $data) RETURN n`;

  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    CypherQuery({
      returnType: entityType,
      description: `Create new ${label} entity`,
      tags: ['create', 'write', ...(options?.tags || [])],
      options: { ...(options?.options || {}), accessMode: 'WRITE' },
      validation: options?.validation,
    })(target, propertyKey, descriptor);
    descriptor.value = function (this: any, data: any) {
      return { query, params: { data } };
    };
  };
}

/**
 * @Update decorator for entity updates
 */
export function Update<TEntity>(
  entityType: () => TEntity,
  options?: Omit<CypherQueryConfig<TEntity>, 'query' | 'returnType'>
): MethodDecorator {
  const label = getEntityLabel(entityType);
  const query = `MATCH (n:${label} {id: $id}) SET n += $updates RETURN n`;

  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    CypherQuery({
      returnType: entityType,
      description: `Update ${label} entity`,
      tags: ['update', 'write', ...(options?.tags || [])],
      options: { ...(options?.options || {}), accessMode: 'WRITE' },
      validation: options?.validation,
    })(target, propertyKey, descriptor);
    descriptor.value = function (
      this: any,
      params: { id: string; updates: any }
    ) {
      return { query, params };
    };
  };
}

/**
 * @Delete decorator for entity deletion
 */
export function Delete(
  entityType: () => any,
  options?: Omit<CypherQueryConfig<boolean>, 'query' | 'returnType'>
): MethodDecorator {
  const label = getEntityLabel(entityType);
  const query = `MATCH (n:${label} {id: $id}) DELETE n RETURN count(n) > 0 as deleted`;

  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    CypherQuery({
      returnType: () => Boolean,
      description: `Delete ${label} entity`,
      tags: ['delete', 'write', ...(options?.tags || [])],
      options: { ...(options?.options || {}), accessMode: 'WRITE' },
      validation: options?.validation,
    })(target, propertyKey, descriptor);
    descriptor.value = function (this: any, params: { id: string }) {
      return { query, params };
    };
  };
}
// Validation for inline mode after extraction
function validateInlineQuery(query: string): void {
  if (!query || typeof query !== 'string') {
    throw new Error('Inline Cypher query must be a non-empty string');
  }
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    throw new Error('Inline Cypher query cannot be empty');
  }
  const firstToken = trimmed.split(/\s+/)[0].toLowerCase();
  const valid = [
    'match',
    'create',
    'merge',
    'set',
    'delete',
    'remove',
    'return',
    'with',
    'call',
    'show',
  ];
  if (!valid.includes(firstToken)) {
    throw new Error(
      `Invalid Cypher query: must start with a valid keyword (${valid.join(
        ', '
      )})`
    );
  }
}

function normalizeInlineShape(
  inline: InlineCypherShape,
  args: any[]
): {
  finalQuery: string;
  finalParams?: Record<string, any>;
  inlineDescription?: string;
  inlineTags?: string[];
} {
  if (typeof inline === 'string') {
    return { finalQuery: inline };
  }
  if (inline && typeof inline === 'object') {
    if ('query' in inline) {
      return {
        finalQuery: inline.query,
        finalParams: inline.params,
        inlineDescription: inline.description,
        inlineTags: inline.tags,
      };
    }
    if ('cypher' in inline) {
      return {
        finalQuery: inline.cypher,
        finalParams: inline.parameters,
        inlineDescription: inline.description,
        inlineTags: inline.tags,
      };
    }
  }
  throw new Error(
    `Unsupported inline query return shape. Expected string or {query,params} / {cypher,parameters}. Got: ${typeof inline}`
  );
}

/**
 * Extract parameters from method arguments
 */
function extractParameters(
  args: any[],
  methodName: string
): Record<string, any> {
  if (args.length === 0) {
    return {};
  }

  // If first argument is an object, use it as parameters
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
    return args[0];
  }

  // For multiple arguments, create parameter object
  const params: Record<string, any> = {};
  args.forEach((arg, index) => {
    params[`param${index}`] = arg;
  });

  return params;
}

/**
 * Validate query parameters
 */
function validateParameters(
  params: Record<string, any>,
  validation?: ValidationOptions
): void {
  if (!validation?.enabled) {
    return;
  }

  // Check parameter count
  if (
    validation.maxParams &&
    Object.keys(params).length > validation.maxParams
  ) {
    throw new Error(
      `Too many parameters: ${Object.keys(params).length} > ${
        validation.maxParams
      }`
    );
  }

  // Check parameter depth
  if (validation.maxDepth) {
    Object.values(params).forEach((value) => {
      if (getObjectDepth(value) > validation.maxDepth!) {
        throw new Error(
          `Parameter depth exceeds limit: ${validation.maxDepth}`
        );
      }
    });
  }

  // Prevent injection attacks
  if (validation.preventInjection) {
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'string' && containsSuspiciousPatterns(value)) {
        throw new Error(`Suspicious pattern detected in parameter '${key}'`);
      }
    });
  }

  // Run custom validators
  if (validation.validators) {
    validation.validators.forEach((validator) => {
      Object.entries(params).forEach(([key, value]) => {
        try {
          validator(value, key);
        } catch (error) {
          if (validation.throwOnError !== false) {
            throw error;
          }
        }
      });
    });
  }
}

/**
 * Transform query result based on return type configuration
 */
function transformResult(result: any, returnType?: TypeInfo): any {
  if (!returnType || !result.records) {
    return result.records || result;
  }

  const records = result.records;

  // If no records, return appropriate empty value
  if (records.length === 0) {
    return returnType.isArray ? [] : null;
  }

  // Transform records
  let transformedRecords = records;
  if (returnType.transform) {
    transformedRecords = records.map(returnType.transform);
  }

  // Return single item or array based on configuration
  if (returnType.isArray) {
    return transformedRecords;
  } else {
    return transformedRecords[0] || null;
  }
}

/**
 * Check if return type is an array
 */
function isArrayReturnType(returnTypeFactory: () => any): boolean {
  try {
    const type = returnTypeFactory();
    return Array.isArray(type);
  } catch {
    return false;
  }
}

/**
 * Get entity label from entity type
 */
function getEntityLabel(entityType: () => any): string {
  try {
    const type = entityType();
    return type.constructor?.name || type.name || 'Entity';
  } catch {
    return 'Entity';
  }
}

/**
 * Get object depth for validation
 */
function getObjectDepth(obj: any, currentDepth = 1): number {
  if (obj === null || typeof obj !== 'object') {
    return currentDepth;
  }

  let maxDepth = currentDepth;

  Object.values(obj).forEach((value) => {
    if (typeof value === 'object' && value !== null) {
      const depth = getObjectDepth(value, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }
  });

  return maxDepth;
}

/**
 * Check for suspicious patterns that might indicate injection attempts
 */
function containsSuspiciousPatterns(value: string): boolean {
  const suspiciousPatterns = [
    /\b(DROP|DELETE|CREATE|ALTER|TRUNCATE)\s+/i,
    /;\s*(DROP|DELETE|CREATE|ALTER)/i,
    /UNION\s+SELECT/i,
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
    /javascript:/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(value));
}
