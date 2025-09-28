import { SetMetadata } from '@nestjs/common';
import {
  DECORATOR_METADATA_KEYS,
  type QueryMethodConfig,
  type QueryExecutionOptions,
  type QueryValidationOptions,
  type CacheOptions,
  type RetryOptions,
} from '../interfaces/decorator-metadata.interface';
import type { QueryBuilder } from 'neogma';
import { validateQuerySecurity } from '../security/cypher-security-validation';

/**
 * Simplified and clean configuration for @CypherQuery decorator
 *
 * Focus on declarative configuration without complex inline execution.
 * Methods return normal query objects that the decorator processes.
 */
export interface CypherQueryConfig {
  /** Cache duration as string ('5m', '1h', '30s') or boolean */
  cache?: string | boolean;
  /** Retry attempts for failed operations */
  retry?: number;
  /** Query access mode (auto-detected from method name if not provided) */
  mode?: 'READ' | 'WRITE';
  /** Enable parameter validation and injection prevention */
  safe?: boolean;
  /** Optional description for documentation */
  description?: string;
  /** Optional tags for categorization */
  tags?: string[];
}

/**
 * Standard query result that methods should return
 * Now supports both string queries and Neogma QueryBuilder instances
 */
export interface QueryResult {
  query: string;
  params?: Record<string, any>;
  description?: string;
  tags?: string[];
}

/**
 * Union type for what @CypherQuery decorated methods can return
 */
export type CypherQueryReturnType =
  | QueryResult
  | QueryBuilder // Neogma QueryBuilder
  | string // Raw Cypher string
  | { query: string; params?: Record<string, any> };

// Method name patterns for auto-detection
const METHOD_PATTERNS = {
  READ: /^(find|get|list|search|fetch|query|read|count|exists|check|has|is)/i,
  WRITE:
    /^(create|save|update|delete|remove|insert|upsert|merge|set|add|modify|change)/i,
};

/**
 * Parse cache duration from various input formats
 */
function parseCacheDuration(value: string | boolean): number {
  if (typeof value === 'boolean') return value ? 300000 : 0; // 5 minutes or disabled

  const units: Record<string, number> = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
  };

  const match = value.match(/^(\d+)([smhd])$/);
  if (match) {
    return parseInt(match[1]) * units[match[2]];
  }

  return 300000; // Default 5 minutes
}

/**
 * Infer query mode from method name
 */
function inferQueryMode(methodName: string): 'READ' | 'WRITE' {
  if (METHOD_PATTERNS.READ.test(methodName)) return 'READ';
  if (METHOD_PATTERNS.WRITE.test(methodName)) return 'WRITE';
  return 'READ'; // Safe default
}

/**
 * @CypherQuery decorator for type-safe query execution
 *
 * Clean, simple decorator that applies configuration without complex inline execution.
 * Methods return QueryResult objects that are processed by the Neo4j service.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectNeo4j() private neo4j: Neo4jService
 *   ) {}
 *
 *   // Simple string query with auto-detection
 *   @CypherQuery()
 *   async findActiveUsers(): Promise<User[]> {
 *     return {
 *       query: 'MATCH (u:User {active: true}) RETURN u',
 *       params: {}
 *     };
 *   }
 *
 *   // Neogma QueryBuilder - Type-safe and fluent
 *   @CypherQuery({ cache: '10m' })
 *   async findUsersByRole(role: string): Promise<User[]> {
 *     return new QueryBuilder()
 *       .match({
 *         identifier: 'u',
 *         label: 'User',
 *         where: { role }
 *       })
 *       .return('u');
 *   }
 *
 *   // Complex query with relationships
 *   @CypherQuery({ cache: '5m' })
 *   async findUsersWithPosts(): Promise<any[]> {
 *     return new QueryBuilder()
 *       .match({
 *         identifier: 'u',
 *         label: 'User'
 *       })
 *       .match({
 *         related: [{
 *           identifier: 'u',
 *           direction: 'out',
 *           name: 'POSTED',
 *           identifier2: 'p',
 *           label2: 'Post'
 *         }]
 *       })
 *       .return(['u', 'collect(p) as posts']);
 *   }
 *
 *   // Write operation
 *   @CypherQuery({ mode: 'WRITE', cache: false })
 *   async createUser(userData: CreateUserDto): Promise<User> {
 *     return new QueryBuilder()
 *       .create({
 *         identifier: 'u',
 *         label: 'User',
 *         properties: userData
 *       })
 *       .return('u');
 *   }
 * }
 * ```
 */
export function CypherQuery(config: CypherQueryConfig = {}): any {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): any {
    const methodName = String(propertyKey);
    const inferredMode = inferQueryMode(methodName);
    const isWriteOperation = inferredMode === 'WRITE';

    // Configure caching
    let cacheConfig: CacheOptions | undefined;
    if (config.cache !== undefined) {
      if (config.cache === false) {
        cacheConfig = undefined;
      } else {
        cacheConfig = {
          enabled: true,
          ttl: parseCacheDuration(config.cache),
        };
      }
    } else {
      // Smart defaults: cache reads, don't cache writes
      cacheConfig = !isWriteOperation
        ? {
            enabled: true,
            ttl: 300000, // 5 minutes
          }
        : undefined;
    }

    // Configure retries
    const retryAttempts =
      config.retry !== undefined ? config.retry : isWriteOperation ? 3 : 1; // More retries for writes

    const retryConfig: RetryOptions = {
      enabled: retryAttempts > 0,
      attempts: retryAttempts,
      delay: 1000,
      backoff: 'exponential',
    };

    // Configure validation
    const validationConfig: QueryValidationOptions = {
      enabled: config.safe !== false,
      maxParams: 20,
      maxDepth: 3,
      preventInjection: config.safe !== false,
      throwOnError: true,
    };

    // Build execution options
    const executionOptions: QueryExecutionOptions = {
      accessMode: config.mode || inferredMode,
      cache: cacheConfig,
      retry: retryConfig,
    };

    // Create method metadata
    const metadata: QueryMethodConfig = {
      id: `${target.constructor.name}.${methodName}`,
      query: '<DYNAMIC>', // Set at runtime
      description:
        config.description || `${inferredMode} operation: ${methodName}`,
      tags: config.tags || [inferredMode.toLowerCase(), methodName],
      enabled: true,
      options: executionOptions,
      validation: validationConfig,
    };

    // Set metadata
    SetMetadata(DECORATOR_METADATA_KEYS.CYPHER_QUERY, metadata)(
      target,
      propertyKey,
      descriptor
    );

    // Store original method
    const originalMethod = descriptor.value;

    // Enhance method with query execution
    descriptor.value = async function (this: any, ...args: any[]) {
      // Get NeogmaService (modern) or fallback to legacy Neo4jService
      const neogmaService = this.getNeogmaService?.() || this.neogmaService;
      const neo4jService = this.getNeo4jService?.() || this.neo4jService;

      if (!neogmaService && !neo4jService) {
        throw new Error(
          `NeogmaService or Neo4j service not found in ${target.constructor.name}. ` +
            'Ensure you have NeogmaService injected.'
        );
      }

      try {
        // Execute original method to get query result
        const queryResult: QueryResult = await originalMethod.apply(this, args);

        // Validate query result
        if (!queryResult || typeof queryResult.query !== 'string') {
          throw new Error(
            `Method ${methodName} must return a QueryResult with a 'query' property`
          );
        }

        // SECURITY: Post-execution query validation for CWE-89 prevention
        if (metadata.validation?.enabled !== false) {
          validateQuerySecurity(
            queryResult.query,
            queryResult.params || {},
            methodName
          );
        }

        // Update metadata with actual query
        metadata.query = queryResult.query;
        if (queryResult.description)
          metadata.description = queryResult.description;
        if (queryResult.tags)
          metadata.tags = [...(metadata.tags || []), ...queryResult.tags];

        // Validate parameters
        if (metadata.validation?.enabled && queryResult.params) {
          validateParameters(queryResult.params, metadata.validation);
        }

        // Execute query through NeogmaService (preferred) or legacy service
        let result;
        if (neogmaService && typeof neogmaService.query === 'function') {
          result = await neogmaService.query(
            queryResult.query,
            queryResult.params || {}
          );
        } else if (neo4jService && typeof neo4jService.run === 'function') {
          result = await neo4jService.run(
            queryResult.query,
            queryResult.params || {},
            metadata.options
          );
        } else {
          throw new Error(
            'No compatible query method available on injected service'
          );
        }

        // CWE-89 FIX: Post-execution validation (REQUIREMENT 2)
        if (metadata.validation?.enabled) {
          validateQuerySecurity(
            queryResult.query,
            queryResult.params || {},
            String(propertyKey)
          );
        }

        // Return raw result (let service handle transformation)
        return result;
      } catch (error) {
        // Enhanced error with context
        const enhancedError = new Error(
          `Query execution failed in ${metadata.id}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        (enhancedError as any).originalError = error;
        (enhancedError as any).methodName = methodName;
        (enhancedError as any).className = target.constructor.name;

        throw enhancedError;
      }
    };

    // Preserve method name for debugging
    Object.defineProperty(descriptor.value, 'name', { value: methodName });

    return descriptor;
  };
}

/**
 * Validate query parameters
 */
function validateParameters(
  params: Record<string, any>,
  validation: QueryValidationOptions
): void {
  if (!validation.enabled) return;

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

  // Check for injection attempts
  if (validation.preventInjection) {
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'string' && containsSuspiciousPatterns(value)) {
        throw new Error(`Suspicious pattern detected in parameter '${key}'`);
      }
    });
  }
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
