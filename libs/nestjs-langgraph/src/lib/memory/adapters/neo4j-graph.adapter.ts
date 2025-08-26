import { Injectable, Optional, Inject } from '@nestjs/common';
import {
  IGraphDatabase,
  IGraphTransaction,
  DefaultCypherQueryBuilder
} from '../interfaces/graph-database.interface';

/**
 * Neo4j Adapter for Graph Database Interface
 * 
 * This adapter bridges the Neo4jService to our IGraphDatabase interface,
 * allowing the memory module to work with Neo4j without direct coupling.
 */
@Injectable()
export class Neo4jGraphAdapter implements IGraphDatabase {
  private readonly queryBuilder = new DefaultCypherQueryBuilder();

  constructor(
    @Optional()
    @Inject('Neo4jService')
    private readonly neo4j?: any
  ) {}

  async run<T = any>(
    query: string,
    parameters?: Record<string, any>
  ): Promise<{
    records: Array<{
      get(key: string): any;
      keys: string[];
      toObject(): Record<string, any>;
    }>;
    summary?: {
      counters: {
        nodesCreated(): number;
        nodesDeleted(): number;
        relationshipsCreated(): number;
        relationshipsDeleted(): number;
        propertiesSet(): number;
        labelsAdded(): number;
        labelsRemoved(): number;
      };
    };
  }> {
    if (!this.neo4j) {
      throw new Error('Neo4j service not available');
    }

    const result = await this.neo4j.run(query, parameters);

    // Adapt Neo4j result to our interface
    return {
      records: result.records.map((record: any) => ({
        get: (key: string) => record.get(key),
        keys: record.keys,
        toObject: () => record.toObject()
      })),
      summary: result.summary ? {
        counters: {
          nodesCreated: () => result.summary.counters.nodesCreated(),
          nodesDeleted: () => result.summary.counters.nodesDeleted(),
          relationshipsCreated: () => result.summary.counters.relationshipsCreated(),
          relationshipsDeleted: () => result.summary.counters.relationshipsDeleted(),
          propertiesSet: () => result.summary.counters.propertiesSet(),
          labelsAdded: () => result.summary.counters.labelsAdded(),
          labelsRemoved: () => result.summary.counters.labelsRemoved()
        }
      } : undefined
    };
  }

  async writeTransaction<T = any>(
    work: (tx: IGraphTransaction) => Promise<T>
  ): Promise<T> {
    if (!this.neo4j) {
      throw new Error('Neo4j service not available');
    }

    return await this.neo4j.writeTransaction(async (tx: any) => {
      const transaction = this.createTransactionAdapter(tx);
      return await work(transaction);
    });
  }

  async readTransaction<T = any>(
    work: (tx: IGraphTransaction) => Promise<T>
  ): Promise<T> {
    if (!this.neo4j) {
      throw new Error('Neo4j service not available');
    }

    return await this.neo4j.readTransaction(async (tx: any) => {
      const transaction = this.createTransactionAdapter(tx);
      return await work(transaction);
    });
  }

  async verifyConnectivity(): Promise<boolean> {
    if (!this.neo4j) {
      return false;
    }

    return await this.neo4j.verifyConnectivity();
  }

  async close(): Promise<void> {
    if (!this.neo4j) {
      return;
    }

    await this.neo4j.close();
  }

  async getDatabaseInfo(): Promise<{
    version: string;
    edition?: string;
  }> {
    if (!this.neo4j) {
      throw new Error('Neo4j service not available');
    }

    const result = await this.neo4j.run('CALL dbms.components()');
    const record = result.records[0];
    
    return {
      version: record.get('versions')[0],
      edition: record.get('edition')
    };
  }

  async healthCheck(): Promise<boolean> {
    if (!this.neo4j) {
      return false;
    }

    try {
      await this.neo4j.verifyConnectivity();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if Neo4j service is available
   */
  isAvailable(): boolean {
    return !!this.neo4j;
  }

  /**
   * Get the Cypher query builder for constructing queries
   */
  getQueryBuilder() {
    return this.queryBuilder;
  }

  /**
   * Create a transaction adapter that implements IGraphTransaction
   */
  private createTransactionAdapter(tx: any): IGraphTransaction {
    return {
      async run<T = any>(
        query: string,
        parameters?: Record<string, any>
      ): Promise<{
        records: Array<{
          get(key: string): any;
          keys: string[];
          toObject(): Record<string, any>;
        }>;
      }> {
        const result = await tx.run(query, parameters);
        
        return {
          records: result.records.map((record: any) => ({
            get: (key: string) => record.get(key),
            keys: record.keys,
            toObject: () => record.toObject()
          }))
        };
      },

      async commit(): Promise<void> {
        if (tx.commit) {
          await tx.commit();
        }
      },

      async rollback(): Promise<void> {
        if (tx.rollback) {
          await tx.rollback();
        }
      }
    };
  }
}