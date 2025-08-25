import 'reflect-metadata';
import type { Session } from 'neo4j-driver';

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

export function Transactional(options?: TransactionalOptions): MethodDecorator {
  return function (
    target: unknown,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;

    descriptor.value = async function (this: TransactionalContext, ...args: unknown[]): Promise<unknown> {
      const neo4jService = this.neo4j ?? this.neo4jService;
      
      if (!neo4jService) {
        throw new Error(
          '@Transactional decorator requires Neo4jService to be injected as "neo4j" or "neo4jService"'
        );
      }

      return neo4jService.runInTransaction(async (session: Session): Promise<unknown> => {
        // Store transaction in context for nested calls
        const originalTx = this._currentTransaction;
        this._currentTransaction = session;
        
        try {
          const result = await originalMethod.apply(this, args);
          return result;
        } finally {
          this._currentTransaction = originalTx;
        }
      }, options?.database);
    };

    return descriptor;
  };
}