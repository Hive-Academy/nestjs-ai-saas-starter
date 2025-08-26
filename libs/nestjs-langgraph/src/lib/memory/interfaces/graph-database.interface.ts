/**
 * Graph Database Interface
 *
 * This interface abstracts graph database operations to avoid direct coupling
 * with Neo4jService. Any graph database implementation (Neo4j, ArangoDB,
 * TigerGraph, etc.) can implement this interface.
 */
export interface IGraphDatabase {
  /**
   * Execute a Cypher-like query
   */
  run<T = any>(
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
  }>;

  /**
   * Execute a write transaction
   */
  writeTransaction<T = any>(
    work: (tx: IGraphTransaction) => Promise<T>
  ): Promise<T>;

  /**
   * Execute a read transaction
   */
  readTransaction<T = any>(
    work: (tx: IGraphTransaction) => Promise<T>
  ): Promise<T>;

  /**
   * Check if the database is connected
   */
  verifyConnectivity(): Promise<boolean>;

  /**
   * Close the database connection
   */
  close(): Promise<void>;

  /**
   * Get database info
   */
  getDatabaseInfo(): Promise<{
    version: string;
    edition?: string;
  }>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Graph transaction interface for transaction operations
 */
export interface IGraphTransaction {
  /**
   * Run a query within the transaction
   */
  run<T = any>(
    query: string,
    parameters?: Record<string, any>
  ): Promise<{
    records: Array<{
      get(key: string): any;
      keys: string[];
      toObject(): Record<string, any>;
    }>;
  }>;

  /**
   * Commit the transaction
   */
  commit(): Promise<void>;

  /**
   * Rollback the transaction
   */
  rollback(): Promise<void>;
}

/**
 * Graph database provider token for dependency injection
 */
export const GRAPH_DATABASE_PROVIDER = 'GRAPH_DATABASE_PROVIDER';

/**
 * Cypher query builder helper (adapter pattern for different graph databases)
 */
export interface ICypherQueryBuilder {
  /**
   * Build a node creation query
   */
  createNode(
    label: string,
    properties: Record<string, any>
  ): { query: string; params: Record<string, any> };

  /**
   * Build a relationship creation query
   */
  createRelationship(
    fromLabel: string,
    fromId: string,
    toLabel: string,
    toId: string,
    relationshipType: string,
    properties?: Record<string, any>
  ): { query: string; params: Record<string, any> };

  /**
   * Build a match query
   */
  matchNode(
    label: string,
    conditions?: Record<string, any>
  ): { query: string; params: Record<string, any> };

  /**
   * Build a path query
   */
  findPath(
    fromLabel: string,
    fromId: string,
    toLabel: string,
    toId: string,
    maxHops?: number
  ): { query: string; params: Record<string, any> };
}

/**
 * Default Cypher query builder for Neo4j-compatible databases
 */
export class DefaultCypherQueryBuilder implements ICypherQueryBuilder {
  createNode(label: string, properties: Record<string, any>) {
    const query = `CREATE (n:${label} $props) RETURN n`;
    return { query, params: { props: properties } };
  }

  createRelationship(
    fromLabel: string,
    fromId: string,
    toLabel: string,
    toId: string,
    relationshipType: string,
    properties?: Record<string, any>
  ) {
    const query = properties
      ? `
        MATCH (from:${fromLabel} {id: $fromId})
        MATCH (to:${toLabel} {id: $toId})
        CREATE (from)-[r:${relationshipType} $props]->(to)
        RETURN r
      `
      : `
        MATCH (from:${fromLabel} {id: $fromId})
        MATCH (to:${toLabel} {id: $toId})
        CREATE (from)-[r:${relationshipType}]->(to)
        RETURN r
      `;

    return {
      query,
      params: {
        fromId,
        toId,
        ...(properties && { props: properties })
      }
    };
  }

  matchNode(label: string, conditions?: Record<string, any>) {
    if (!conditions || Object.keys(conditions).length === 0) {
      return {
        query: `MATCH (n:${label}) RETURN n`,
        params: {}
      };
    }

    const whereClause = Object.keys(conditions)
      .map(key => `n.${key} = $${key}`)
      .join(' AND ');

    return {
      query: `MATCH (n:${label}) WHERE ${whereClause} RETURN n`,
      params: conditions
    };
  }

  findPath(
    fromLabel: string,
    fromId: string,
    toLabel: string,
    toId: string,
    maxHops = 5
  ) {
    const query = `
      MATCH path = shortestPath(
        (from:${fromLabel} {id: $fromId})-[*..${maxHops}]-(to:${toLabel} {id: $toId})
      )
      RETURN path
    `;

    return {
      query,
      params: { fromId, toId }
    };
  }
}
