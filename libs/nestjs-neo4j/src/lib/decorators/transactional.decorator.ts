import 'reflect-metadata';
import type { Session } from 'neo4j-driver';
import { getNeo4jConfig } from '../utils/neo4j-config.accessor';

export interface TransactionalOptions {
  database?: string;
  timeout?: number;
  metadata?: Record<string, unknown>;
}

interface Neo4jServiceLike {
  runInTransaction: <T>(
    work: (session: Session) => Promise<T>,
    database?: string
  ) => Promise<T>;
}

interface TransactionalContext {
  neo4j?: Neo4jServiceLike;
  neo4jService?: Neo4jServiceLike;
  _currentTransaction?: Session;
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
    const neo4jService = this.neo4j ?? this.neo4jService;

    if (!neo4jService) {
      throw new Error(
        '@Transactional decorator requires Neo4jService to be injected as "neo4j" or "neo4jService"'
      );
    }

    // Get database from options or fall back to stored config
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
  };

  return descriptor;
}
