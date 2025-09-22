# Neo4j Library Technical Specification

_Detailed technical implementation guide for the enhanced Neo4j library_

## 🔧 Technical Architecture Deep Dive

### Core Service Implementation

```typescript
// libs/nestjs-neo4j/src/lib/core/neo4j-enhanced.service.ts

import { Injectable, Inject, Logger } from '@nestjs/common';
import { Driver, Session, Transaction, Result } from 'neo4j-driver';
import { Observable } from 'rxjs';

export interface EnhancedQueryOptions {
  database?: string;
  timeout?: number;
  metadata?: Record<string, unknown>;
  caching?: CacheOptions;
  profiling?: ProfilingOptions;
  retries?: RetryOptions;
}

export interface EnhancedQueryResult<T = Record<string, unknown>> extends QueryResult<T> {
  performance?: {
    executionTime: number;
    compilationTime: number;
    planningTime: number;
  };
  caching?: {
    hit: boolean;
    key: string;
    ttl: number;
  };
  metadata?: {
    queryId: string;
    timestamp: Date;
    userId?: string;
  };
}

@Injectable()
export class Neo4jEnhancedService {
  private readonly logger = new Logger(Neo4jEnhancedService.name);

  constructor(@Inject(NEO4J_DRIVER) private readonly driver: Driver, @Inject(NEO4J_OPTIONS) private readonly options: Neo4jModuleOptions, private readonly metricsService: Neo4jMetricsService, private readonly healthService: Neo4jHealthEnhancedService, private readonly cacheService: Neo4jCacheService, private readonly constraintsService: Neo4jConstraintsService) {}

  /**
   * Enhanced query execution with full feature support
   */
  async runEnhanced<T = Record<string, unknown>>(cypher: string, params?: Record<string, unknown>, options?: EnhancedQueryOptions): Promise<EnhancedQueryResult<T>> {
    const queryId = this.generateQueryId();
    const startTime = performance.now();

    try {
      // Performance monitoring
      const profiling = options?.profiling?.enabled ?? false;

      // Cache check
      const cacheKey = this.generateCacheKey(cypher, params, options);
      if (options?.caching?.enabled) {
        const cached = await this.cacheService.get<T>(cacheKey);
        if (cached) {
          return {
            ...cached,
            caching: { hit: true, key: cacheKey, ttl: options.caching.ttl },
          };
        }
      }

      // Execute query
      const session = this.getEnhancedSession(options);
      const result = await session.run(cypher, params);

      const executionTime = performance.now() - startTime;

      // Build enhanced result
      const enhancedResult: EnhancedQueryResult<T> = {
        records: result.records.map((record) => record.toObject() as T),
        summary: this.buildEnhancedSummary(result.summary),
        performance: {
          executionTime,
          compilationTime: result.summary.resultAvailableAfter.toNumber(),
          planningTime: profiling ? this.extractPlanningTime(result.summary) : 0,
        },
        metadata: {
          queryId,
          timestamp: new Date(),
          userId: options?.metadata?.userId as string,
        },
      };

      // Cache result if enabled
      if (options?.caching?.enabled) {
        await this.cacheService.set(cacheKey, enhancedResult, options.caching.ttl);
        enhancedResult.caching = { hit: false, key: cacheKey, ttl: options.caching.ttl };
      }

      // Record metrics
      await this.metricsService.recordQuery({
        queryId,
        cypher,
        executionTime,
        recordCount: enhancedResult.records.length,
        success: true,
      });

      return enhancedResult;
    } catch (error) {
      const executionTime = performance.now() - startTime;

      // Record error metrics
      await this.metricsService.recordQuery({
        queryId,
        cypher,
        executionTime,
        recordCount: 0,
        success: false,
        error: error.message,
      });

      throw this.enhanceError(error, { queryId, cypher, params, executionTime });
    }
  }

  /**
   * Reactive query execution
   */
  rxRun<T = Record<string, unknown>>(cypher: string, params?: Record<string, unknown>, options?: EnhancedQueryOptions): Observable<T> {
    return new Observable((subscriber) => {
      const session = this.getEnhancedSession(options);

      session.run(cypher, params).subscribe({
        onNext: (record) => subscriber.next(record.toObject() as T),
        onCompleted: (summary) => {
          this.metricsService.recordQuery({
            queryId: this.generateQueryId(),
            cypher,
            executionTime: summary.resultConsumedAfter.toNumber(),
            recordCount: summary.counters.updates().nodesCreated + summary.counters.updates().nodesDeleted,
            success: true,
          });
          subscriber.complete();
        },
        onError: (error) => {
          this.metricsService.recordQuery({
            queryId: this.generateQueryId(),
            cypher,
            executionTime: 0,
            recordCount: 0,
            success: false,
            error: error.message,
          });
          subscriber.error(this.enhanceError(error, { cypher, params }));
        },
      });
    });
  }

  /**
   * Transaction execution with enhanced features
   */
  async runInEnhancedTransaction<T>(work: (session: Session) => Promise<T>, options?: EnhancedTransactionOptions): Promise<T> {
    const session = this.getEnhancedSession(options);
    const startTime = performance.now();

    try {
      const result = await session.writeTransaction(async (tx) => {
        // Add transaction context for nested operations
        session['_enhancedContext'] = {
          transactionId: this.generateTransactionId(),
          startTime,
          options,
        };

        return await work(session);
      });

      const executionTime = performance.now() - startTime;

      await this.metricsService.recordTransaction({
        transactionId: session['_enhancedContext']?.transactionId,
        executionTime,
        success: true,
      });

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;

      await this.metricsService.recordTransaction({
        transactionId: session['_enhancedContext']?.transactionId,
        executionTime,
        success: false,
        error: error.message,
      });

      throw this.enhanceError(error, { transactionId: session['_enhancedContext']?.transactionId });
    } finally {
      await session.close();
    }
  }

  private getEnhancedSession(options?: EnhancedQueryOptions): Session {
    return this.driver.session({
      database: options?.database ?? this.options.database,
      defaultAccessMode: options?.defaultAccessMode || session.WRITE,
      bookmarks: options?.bookmarks,
      fetchSize: options?.fetchSize || 1000,
    });
  }

  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCacheKey(cypher: string, params?: Record<string, unknown>, options?: EnhancedQueryOptions): string {
    const keyData = {
      cypher: cypher.replace(/\s+/g, ' ').trim(),
      params: params || {},
      database: options?.database || this.options.database,
    };
    return `neo4j:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  private enhanceError(error: any, context: Record<string, any>): Neo4jEnhancedError {
    return new Neo4jEnhancedError(error.message, error.code || 'UNKNOWN_ERROR', context, error);
  }
}
```

### Decorator Implementation Framework

```typescript
// libs/nestjs-neo4j/src/lib/decorators/core/decorator-factory.ts

export interface DecoratorMetadata {
  target: any;
  propertyKey: string | symbol;
  descriptor: PropertyDescriptor;
  decoratorType: string;
  options: any;
}

export class DecoratorRegistry {
  private static metadata = new Map<string, DecoratorMetadata[]>();

  static register(metadata: DecoratorMetadata): void {
    const key = `${metadata.target.constructor.name}:${String(metadata.propertyKey)}`;
    if (!this.metadata.has(key)) {
      this.metadata.set(key, []);
    }
    this.metadata.get(key)!.push(metadata);
  }

  static get(target: any, propertyKey: string | symbol): DecoratorMetadata[] {
    const key = `${target.constructor.name}:${String(propertyKey)}`;
    return this.metadata.get(key) || [];
  }

  static getByType(target: any, decoratorType: string): DecoratorMetadata[] {
    const allMetadata = Array.from(this.metadata.values()).flat();
    return allMetadata.filter((m) => m.target === target && m.decoratorType === decoratorType);
  }
}

export function createEnhancedDecorator<TOptions = any>(decoratorType: string, defaultOptions: TOptions, implementationFactory: (metadata: DecoratorMetadata) => MethodDecorator) {
  return function (options?: Partial<TOptions>): MethodDecorator {
    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
      const finalOptions = { ...defaultOptions, ...options };
      const metadata: DecoratorMetadata = {
        target,
        propertyKey,
        descriptor,
        decoratorType,
        options: finalOptions,
      };

      DecoratorRegistry.register(metadata);
      return implementationFactory(metadata)(target, propertyKey, descriptor);
    };
  };
}
```

### @CypherQuery Decorator Implementation

```typescript
// libs/nestjs-neo4j/src/lib/decorators/query/cypher-query.decorator.ts

export interface CypherQueryOptions<TReturn = any, TParams = any> {
  query: string;
  returnType: () => TReturn;
  caching?: {
    enabled: boolean;
    ttl: number;
    key?: (params: TParams) => string;
    invalidateOn?: string[];
  };
  profiling?: {
    enabled: boolean;
    logSlowQueries: boolean;
    threshold: number;
  };
  validation?: {
    params?: (params: TParams) => boolean | string;
    result?: (result: TReturn) => boolean | string;
  };
}

export function CypherQuery<TReturn = any, TParams = any>(options: CypherQueryOptions<TReturn, TParams>): MethodDecorator {
  return createEnhancedDecorator(
    'CypherQuery',
    {
      caching: { enabled: false, ttl: 300000 },
      profiling: { enabled: true, logSlowQueries: true, threshold: 1000 },
      validation: {},
    },
    (metadata) => {
      return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (this: any, ...args: any[]) {
          try {
            // Get Neo4j service from this context
            const neo4jService = this.neo4jService || this.neo4j;
            if (!neo4jService) {
              throw new Error(`@CypherQuery requires Neo4jEnhancedService to be injected as 'neo4jService' or 'neo4j'`);
            }

            // Extract parameters
            const params = args[0] as TParams;

            // Validate parameters if validator provided
            if (options.validation?.params) {
              const validation = options.validation.params(params);
              if (validation !== true) {
                throw new Error(`Parameter validation failed: ${validation}`);
              }
            }

            // Generate cache key
            let cacheKey: string | undefined;
            if (options.caching?.enabled) {
              cacheKey = options.caching.key ? options.caching.key(params) : this.generateDefaultCacheKey(options.query, params);
            }

            // Execute query with enhanced options
            const result = await neo4jService.runEnhanced<TReturn>(options.query, params, {
              caching: options.caching?.enabled
                ? {
                    enabled: true,
                    ttl: options.caching.ttl,
                    key: cacheKey,
                  }
                : undefined,
              profiling: options.profiling,
              metadata: {
                method: String(propertyKey),
                className: target.constructor.name,
                userId: this.getCurrentUserId?.(),
              },
            });

            // Transform result based on return type
            const transformedResult = this.transformQueryResult(result.records, options.returnType, metadata.options);

            // Validate result if validator provided
            if (options.validation?.result) {
              const validation = options.validation.result(transformedResult);
              if (validation !== true) {
                throw new Error(`Result validation failed: ${validation}`);
              }
            }

            return transformedResult;
          } catch (error) {
            // Enhanced error context
            const enhancedError = new DecoratorExecutionError(`@CypherQuery execution failed in ${target.constructor.name}.${String(propertyKey)}`, error, {
              query: options.query,
              params: args[0],
              decoratorType: 'CypherQuery',
              className: target.constructor.name,
              methodName: String(propertyKey),
            });

            throw enhancedError;
          }
        };

        // Preserve method metadata
        Reflect.defineMetadata('design:type', Function, target, propertyKey);
        Reflect.defineMetadata('design:paramtypes', Reflect.getMetadata('design:paramtypes', target, propertyKey), target, propertyKey);
        Reflect.defineMetadata('design:returntype', options.returnType, target, propertyKey);

        return descriptor;
      };
    }
  );
}
```

### Entity Mapping System

```typescript
// libs/nestjs-neo4j/src/lib/decorators/entity/neo4j-entity.decorator.ts

export interface Neo4jEntityOptions {
  label: string;
  constraints?: {
    nodeKey?: string[];
    unique?: string[];
    notNull?: string[];
  };
  timestamps?: {
    createdAt?: string;
    updatedAt?: string;
  };
  softDelete?: {
    field: string;
    value: any;
  };
}

export function Neo4jEntity(options: Neo4jEntityOptions): ClassDecorator {
  return function <T extends Function>(target: T): T {
    // Store entity metadata
    Reflect.defineMetadata('neo4j:entity', options, target);

    // Register with entity registry
    EntityRegistry.register(target as any, options);

    // Generate constraint creation methods
    generateConstraintMethods(target as any, options);

    return target;
  };
}

export interface Neo4jPropertyOptions {
  name?: string;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'object';
  serialized?: boolean;
  transform?: {
    to?: (value: any) => any;
    from?: (value: any) => any;
  };
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean | string;
  };
}

export function Neo4jProperty(options: Neo4jPropertyOptions = {}): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    // Get existing property metadata
    const existingMetadata = Reflect.getMetadata('neo4j:properties', target) || {};

    // Add new property metadata
    existingMetadata[propertyKey] = {
      name: options.name || String(propertyKey),
      type: options.type || inferTypeFromReflection(target, propertyKey),
      ...options,
    };

    // Store updated metadata
    Reflect.defineMetadata('neo4j:properties', existingMetadata, target);

    // Generate getter/setter with transformation
    if (options.transform) {
      generateTransformProperty(target, propertyKey, options.transform);
    }
  };
}

export interface Neo4jRelationshipOptions {
  type: string;
  target: () => Function;
  direction?: 'IN' | 'OUT' | 'BOTH';
  optional?: boolean;
  cascade?: boolean;
  properties?: Record<string, any>;
}

export function Neo4jRelationship(options: Neo4jRelationshipOptions): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    // Store relationship metadata
    const existingMetadata = Reflect.getMetadata('neo4j:relationships', target) || {};
    existingMetadata[propertyKey] = {
      direction: 'OUT',
      optional: false,
      cascade: false,
      ...options,
    };

    Reflect.defineMetadata('neo4j:relationships', existingMetadata, target);

    // Generate lazy loading methods
    generateLazyLoader(target, propertyKey, options);
  };
}
```

### Repository Pattern Implementation

```typescript
// libs/nestjs-neo4j/src/lib/decorators/repository/neo4j-repository.decorator.ts

export interface Neo4jRepositoryOptions<T = any> {
  entity: () => Function;
  connection?: string;
  customMethods?: {
    [methodName: string]: {
      query: string;
      returnType: () => any;
    };
  };
}

export function Neo4jRepository<T = any>(entity: () => Function): ClassDecorator {
  return function <TTarget extends Function>(target: TTarget): TTarget {
    // Store repository metadata
    Reflect.defineMetadata('neo4j:repository', { entity }, target);

    // Generate base CRUD methods
    generateRepositoryMethods(target as any, entity);

    // Register with repository registry
    RepositoryRegistry.register(target as any, entity);

    return target;
  };
}

function generateRepositoryMethods(target: any, entityFactory: () => Function): void {
  const entity = entityFactory();
  const entityMetadata = Reflect.getMetadata('neo4j:entity', entity);

  if (!entityMetadata) {
    throw new Error(`Entity ${entity.name} must be decorated with @Neo4jEntity`);
  }

  const label = entityMetadata.label;

  // Generate findById method
  target.prototype.findById = async function (id: string | number): Promise<any | null> {
    const result = await this.neo4jService.runEnhanced(`MATCH (n:${label} {id: $id}) RETURN n`, { id }, { caching: { enabled: true, ttl: 300000 } });

    return result.records.length > 0 ? this.mapToEntity(result.records[0].n, entity) : null;
  };

  // Generate findAll method
  target.prototype.findAll = async function (options?: FindAllOptions): Promise<any[]> {
    const { skip = 0, limit = 100, orderBy = 'id', direction = 'ASC' } = options || {};

    const result = await this.neo4jService.runEnhanced(`MATCH (n:${label}) RETURN n ORDER BY n.${orderBy} ${direction} SKIP $skip LIMIT $limit`, { skip, limit }, { caching: { enabled: true, ttl: 60000 } });

    return result.records.map((record) => this.mapToEntity(record.n, entity));
  };

  // Generate create method
  target.prototype.create = async function (data: Partial<any>): Promise<any> {
    const processedData = this.processEntityForNeo4j(data, entity);

    const result = await this.neo4jService.runEnhanced(`CREATE (n:${label} $data) RETURN n`, { data: processedData }, { profiling: { enabled: true, threshold: 500 } });

    return this.mapToEntity(result.records[0].n, entity);
  };

  // Generate update method
  target.prototype.update = async function (id: string | number, updates: Partial<any>): Promise<any> {
    const processedUpdates = this.processEntityForNeo4j(updates, entity);

    const result = await this.neo4jService.runEnhanced(`MATCH (n:${label} {id: $id}) SET n += $updates RETURN n`, { id, updates: processedUpdates }, { profiling: { enabled: true, threshold: 500 } });

    if (result.records.length === 0) {
      throw new EntityNotFoundError(`${entity.name} with id ${id} not found`);
    }

    return this.mapToEntity(result.records[0].n, entity);
  };

  // Generate delete method
  target.prototype.delete = async function (id: string | number): Promise<boolean> {
    const result = await this.neo4jService.runEnhanced(`MATCH (n:${label} {id: $id}) DETACH DELETE n RETURN count(n) as deletedCount`, { id });

    return result.records[0].deletedCount > 0;
  };

  // Add entity mapping helpers
  target.prototype.mapToEntity = function (node: any, entityClass: Function): any {
    const instance = new (entityClass as any)();
    const properties = Reflect.getMetadata('neo4j:properties', entityClass.prototype) || {};

    // Map properties with transformations
    Object.entries(properties).forEach(([key, config]: [string, any]) => {
      const value = node.properties[config.name || key];
      instance[key] = config.transform?.from ? config.transform.from(value) : value;
    });

    return instance;
  };

  target.prototype.processEntityForNeo4j = function (entity: any, entityClass: Function): Record<string, any> {
    const properties = Reflect.getMetadata('neo4j:properties', entityClass.prototype) || {};
    const result: Record<string, any> = {};

    Object.entries(properties).forEach(([key, config]: [string, any]) => {
      if (entity.hasOwnProperty(key)) {
        const value = entity[key];
        result[config.name || key] = config.transform?.to ? config.transform.to(value) : this.processValueForNeo4j(value, config);
      }
    });

    return result;
  };

  target.prototype.processValueForNeo4j = function (value: any, config: any): any {
    if (value === null || value === undefined) return value;

    switch (config.type) {
      case 'date':
        return value instanceof Date ? value.toISOString() : value;
      case 'object':
        return config.serialized ? JSON.stringify(value) : value;
      case 'number':
        return Number.isInteger(value) ? int(value) : value;
      default:
        return value;
    }
  };
}
```

### Performance Monitoring Implementation

```typescript
// libs/nestjs-neo4j/src/lib/decorators/performance/profiled.decorator.ts

export interface ProfiledOptions {
  logSlowQueries?: boolean;
  threshold?: number;
  includeQueryPlan?: boolean;
  includeProfile?: boolean;
  includeStats?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export function Profiled(options: ProfiledOptions = {}): MethodDecorator {
  const defaultOptions: Required<ProfiledOptions> = {
    logSlowQueries: true,
    threshold: 1000,
    includeQueryPlan: false,
    includeProfile: false,
    includeStats: true,
    logLevel: 'warn',
  };

  const finalOptions = { ...defaultOptions, ...options };

  return createEnhancedDecorator('Profiled', finalOptions, (metadata) => {
    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (this: any, ...args: any[]) {
        const startTime = performance.now();
        const methodName = `${target.constructor.name}.${String(propertyKey)}`;

        try {
          const result = await originalMethod.apply(this, args);
          const executionTime = performance.now() - startTime;

          // Log slow queries
          if (finalOptions.logSlowQueries && executionTime > finalOptions.threshold) {
            const logger = this.logger || new Logger(target.constructor.name);

            const logData: any = {
              method: methodName,
              executionTime: Math.round(executionTime),
              args: this.sanitizeArgsForLogging(args),
              threshold: finalOptions.threshold,
            };

            if (finalOptions.includeStats && result?.performance) {
              logData.performance = result.performance;
            }

            if (finalOptions.includeQueryPlan && result?.summary?.plan) {
              logData.queryPlan = result.summary.plan;
            }

            if (finalOptions.includeProfile && result?.summary?.profile) {
              logData.profile = result.summary.profile;
            }

            logger[finalOptions.logLevel](`Slow query detected: ${methodName} took ${Math.round(executionTime)}ms`, logData);
          }

          // Record metrics
          if (this.metricsService) {
            await this.metricsService.recordMethodExecution({
              className: target.constructor.name,
              methodName: String(propertyKey),
              executionTime,
              success: true,
              args: this.sanitizeArgsForMetrics(args),
            });
          }

          return result;
        } catch (error) {
          const executionTime = performance.now() - startTime;

          // Record error metrics
          if (this.metricsService) {
            await this.metricsService.recordMethodExecution({
              className: target.constructor.name,
              methodName: String(propertyKey),
              executionTime,
              success: false,
              error: error.message,
              args: this.sanitizeArgsForMetrics(args),
            });
          }

          throw error;
        }
      };

      return descriptor;
    };
  });
}

// Caching decorator implementation
export interface CachedOptions {
  ttl?: number;
  key?: (...args: any[]) => string;
  invalidateOn?: string[];
  storage?: 'memory' | 'redis';
  compress?: boolean;
  condition?: (...args: any[]) => boolean;
}

export function Cached(options: CachedOptions = {}): MethodDecorator {
  const defaultOptions: Required<CachedOptions> = {
    ttl: 300000, // 5 minutes
    key: (...args) => JSON.stringify(args),
    invalidateOn: [],
    storage: 'memory',
    compress: false,
    condition: () => true,
  };

  const finalOptions = { ...defaultOptions, ...options };

  return createEnhancedDecorator('Cached', finalOptions, (metadata) => {
    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (this: any, ...args: any[]) {
        // Check if caching condition is met
        if (!finalOptions.condition(...args)) {
          return originalMethod.apply(this, args);
        }

        const cacheKey = this.generateCacheKey(target.constructor.name, String(propertyKey), finalOptions.key(...args));

        // Get cache service
        const cacheService = this.cacheService || this.getCacheService(finalOptions.storage);

        // Try to get from cache
        const cached = await cacheService.get(cacheKey);
        if (cached !== null && cached !== undefined) {
          // Record cache hit
          if (this.metricsService) {
            await this.metricsService.recordCacheHit({
              key: cacheKey,
              method: `${target.constructor.name}.${String(propertyKey)}`,
            });
          }

          return cached;
        }

        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Store in cache
        await cacheService.set(cacheKey, result, finalOptions.ttl);

        // Record cache miss
        if (this.metricsService) {
          await this.metricsService.recordCacheMiss({
            key: cacheKey,
            method: `${target.constructor.name}.${String(propertyKey)}`,
          });
        }

        // Set up cache invalidation
        if (finalOptions.invalidateOn.length > 0) {
          this.setupCacheInvalidation(cacheKey, finalOptions.invalidateOn);
        }

        return result;
      };

      return descriptor;
    };
  });
}
```

### Error Handling and Recovery

```typescript
// libs/nestjs-neo4j/src/lib/utils/error-recovery/enhanced-error-handler.ts

export class Neo4jEnhancedError extends Error {
  constructor(message: string, public readonly code: string, public readonly context: Record<string, any>, public readonly originalError?: Error) {
    super(message);
    this.name = 'Neo4jEnhancedError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
      timestamp: new Date().toISOString(),
    };
  }
}

export class CircuitBreakerService {
  private breakers = new Map<string, CircuitBreaker>();

  async execute<T>(key: string, operation: () => Promise<T>, options?: CircuitBreakerOptions): Promise<T> {
    const breaker = this.getOrCreateBreaker(key, options);
    return breaker.execute(operation);
  }

  private getOrCreateBreaker(key: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(key)) {
      this.breakers.set(key, new CircuitBreaker(options));
    }
    return this.breakers.get(key)!;
  }
}

export class RetryService {
  async executeWithRetry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= options.attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        if (!this.isRetryableError(error, options.retryOn)) {
          throw error;
        }

        // Don't wait after the last attempt
        if (attempt === options.attempts) {
          break;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, options);
        await this.sleep(delay);
      }
    }

    throw new RetryExhaustedError(`Operation failed after ${options.attempts} attempts`, lastError, options.attempts);
  }

  private isRetryableError(error: Error, retryOn?: (Error | string)[]): boolean {
    if (!retryOn) return true;

    return retryOn.some((condition) => {
      if (typeof condition === 'string') {
        return error.message.includes(condition) || error.name === condition;
      }
      return error instanceof condition;
    });
  }

  private calculateDelay(attempt: number, options: RetryOptions): number {
    switch (options.backoff) {
      case 'exponential':
        return options.delay * Math.pow(2, attempt - 1);
      case 'linear':
        return options.delay * attempt;
      case 'fixed':
      default:
        return options.delay;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

This technical specification provides the detailed implementation framework for building the enhanced Neo4j library. Each component is designed to work together cohesively while maintaining modularity and testability.
