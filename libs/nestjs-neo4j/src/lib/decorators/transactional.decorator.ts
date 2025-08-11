import 'reflect-metadata';

export interface TransactionalOptions {
  database?: string;
  timeout?: number;
  metadata?: Record<string, any>;
}

export function Transactional(options?: TransactionalOptions): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      const neo4jService = this['neo4j'] || this['neo4jService'];
      
      if (!neo4jService) {
        throw new Error(
          '@Transactional decorator requires Neo4jService to be injected as "neo4j" or "neo4jService"'
        );
      }

      return neo4jService.runInTransaction(async (tx: any) => {
        // Store transaction in context for nested calls
        const originalTx = this['_currentTransaction'];
        this['_currentTransaction'] = tx;
        
        try {
          const result = await originalMethod.apply(this, args);
          return result;
        } finally {
          this['_currentTransaction'] = originalTx;
        }
      }, options?.database);
    };

    return descriptor;
  };
}