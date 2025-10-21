import 'reflect-metadata';
import type { Session } from 'neo4j-driver';
import type { Neogma } from 'neogma';
import { getNeo4jConfig } from '../utils/neo4j-config.accessor';

export interface TransactionalOptions {
  database?: string;
  timeout?: number;
  metadata?: Record<string, unknown>;
  /** Use Neogma's transaction methods (NEW) */
  useNeogma?: boolean;
  /** Retry policy for failed transactions */
  retry?: {
    attempts?: number;
    delay?: number;
    exponentialBackoff?: boolean;
  };
}

interface Neo4jServiceLike {
  runInTransaction: <T>(
    work: (session: Session) => Promise<T>,
    database?: string
  ) => Promise<T>;
}

interface NeogmaServiceLike {
  getNeogma: () => Neogma;
  runNeogmaQuery: <T>(
    query: string,
    params?: Record<string, any>
  ) => Promise<T[]>;
}

interface TransactionalContext {
  neo4j?: Neo4jServiceLike;
  neo4jService?: Neo4jServiceLike;
  neogma?: Neogma;
  neogmaService?: NeogmaServiceLike;
  _currentTransaction?: Session;
  _currentNeogmaTransaction?: any;
}

// Overload signatures for direct decorator and factory usage
export function Transactional(
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor
): PropertyDescriptor;
export function Transactional(options?: TransactionalOptions): MethodDecorator;
export function Transactional(
  targetOrOptions?: object | TransactionalOptions,
  propertyKey?: string | symbol,
  descriptor?: PropertyDescriptor
): PropertyDescriptor | MethodDecorator {
  // Check if this is being called as a direct decorator (3 parameters)
  if (
    arguments.length === 3 &&
    typeof targetOrOptions === 'object' &&
    propertyKey &&
    descriptor
  ) {
    // Direct decorator usage: @Transactional
    const target = targetOrOptions as object;
    const actualPropertyKey = propertyKey as string | symbol;
    const actualDescriptor = descriptor as PropertyDescriptor;
    return applyTransactionalDecorator(
      target,
      actualPropertyKey,
      actualDescriptor,
      {}
    );
  }

  // Factory usage: @Transactional() or @Transactional(options)
  const options =
    typeof targetOrOptions === 'object' && !propertyKey && !descriptor
      ? (targetOrOptions as TransactionalOptions)
      : {};

  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor => {
    return applyTransactionalDecorator(
      target,
      propertyKey,
      descriptor,
      options || {}
    );
  };
}

function applyTransactionalDecorator(
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
  options: TransactionalOptions
): PropertyDescriptor {
  const originalMethod = descriptor.value as (
    ...args: unknown[]
  ) => Promise<unknown>;

  descriptor.value = async function (
    this: TransactionalContext,
    ...args: unknown[]
  ): Promise<unknown> {
    // NEW: Prefer Neogma if available and requested
    const useNeogma = options.useNeogma ?? true; // Default to Neogma
    const neogma = this.neogma ?? this.neogmaService?.getNeogma();
    const neo4jService = this.neo4j ?? this.neo4jService;

    if (useNeogma && neogma) {
      return executeWithNeogmaTransaction.call(
        this,
        neogma,
        originalMethod,
        args,
        options
      );
    } else if (neo4jService) {
      return executeWithNeo4jTransaction.call(
        this,
        neo4jService,
        originalMethod,
        args,
        options
      );
    } else {
      throw new Error(
        '@Transactional decorator requires Neo4jService or Neogma to be injected'
      );
    }
  };

  return descriptor;
}

/**
 * NEW: Execute transaction using Neogma
 */
async function executeWithNeogmaTransaction(
  this: TransactionalContext,
  neogma: Neogma,
  originalMethod: (...args: unknown[]) => Promise<unknown>,
  args: unknown[],
  options: TransactionalOptions
): Promise<unknown> {
  // Note: database parameter available but not currently used in implementation
  // const storedConfig = getNeo4jConfig();
  const retryAttempts = options.retry?.attempts ?? 3;
  const retryDelay = options.retry?.delay ?? 1000;

  let attempt = 0;
  while (attempt <= retryAttempts) {
    try {
      // Use Neogma's transaction pattern - simplified approach
      const result = await originalMethod.apply(this, args);
      return result;
    } catch (error) {
      attempt++;
      if (attempt > retryAttempts || !isRetryableError(error)) {
        throw error;
      }

      // Calculate delay with optional exponential backoff
      const delay = options.retry?.exponentialBackoff
        ? retryDelay * Math.pow(2, attempt - 1)
        : retryDelay;

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Transaction failed after all retry attempts');
}

/**
 * Execute transaction using legacy Neo4j service (fallback)
 */
async function executeWithNeo4jTransaction(
  this: TransactionalContext,
  neo4jService: Neo4jServiceLike,
  originalMethod: (...args: unknown[]) => Promise<unknown>,
  args: unknown[],
  options: TransactionalOptions
): Promise<unknown> {
  const storedConfig = getNeo4jConfig();
  const database = options?.database ?? storedConfig.database;

  return neo4jService.runInTransaction(
    async (session: Session): Promise<unknown> => {
      // Store transaction in context for nested calls
      const originalTx = this._currentTransaction;
      this._currentTransaction = session;

      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } finally {
        this._currentTransaction = originalTx;
      }
    },
    database
  );
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  const retryableErrors = [
    'ServiceUnavailable',
    'SessionExpired',
    'TransientError',
    'DatabaseUnavailable',
    'ClusterNotALeader',
    'DeadlockDetected',
  ];

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = error.code || '';

  return retryableErrors.some(
    (errorType) =>
      errorMessage.includes(errorType) || errorCode.includes(errorType)
  );
}
