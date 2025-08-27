import { Injectable } from '@nestjs/common';

/**
 * Graph database service interface for memory relationship operations
 *
 * This abstract class serves as both a contract definition and NestJS injection token
 * for graph database operations, enabling adapter pattern implementation while
 * maintaining type safety and dependency injection compatibility.
 */
@Injectable()
export abstract class IGraphService {
  /**
   * Create a node in the graph database
   */
  abstract createNode(data: GraphNodeData): Promise<string>;

  /**
   * Create a relationship between two nodes
   */
  abstract createRelationship(
    fromNodeId: string,
    toNodeId: string,
    data: GraphRelationshipData
  ): Promise<string>;

  /**
   * Traverse the graph starting from a node
   */
  abstract traverse(
    startNodeId: string,
    spec: TraversalSpec
  ): Promise<GraphTraversalResult>;

  /**
   * Execute a custom Cypher query (Neo4j specific but abstracted for other graph DBs)
   */
  abstract executeCypher(
    query: string,
    params?: Record<string, unknown>
  ): Promise<GraphQueryResult>;

  /**
   * Get graph statistics
   */
  abstract getStats(): Promise<GraphStats>;

  /**
   * Execute multiple graph operations in batch
   */
  abstract batchExecute(
    operations: readonly GraphOperation[]
  ): Promise<GraphBatchResult>;

  /**
   * Find nodes by criteria
   */
  abstract findNodes(
    criteria: GraphFindCriteria
  ): Promise<readonly GraphNode[]>;

  /**
   * Delete nodes by IDs
   */
  abstract deleteNodes(nodeIds: readonly string[]): Promise<number>;

  /**
   * Delete relationships by IDs
   */
  abstract deleteRelationships(
    relationshipIds: readonly string[]
  ): Promise<number>;

  /**
   * Run a transaction with multiple operations
   */
  abstract runTransaction<T>(
    operations: (service: IGraphService) => Promise<T>
  ): Promise<T>;

  /**
   * Common validation method for node IDs
   * Available to all implementations as template method
   */
  protected validateNodeId(nodeId: string, paramName = 'nodeId'): void {
    if (!nodeId?.trim()) {
      throw new InvalidNodeError(
        `${paramName} is required and cannot be empty`
      );
    }

    if (nodeId.length > 100) {
      throw new InvalidNodeError(`${paramName} cannot exceed 100 characters`);
    }
  }

  /**
   * Common validation for node data
   */
  protected validateNodeData(data: GraphNodeData): void {
    if (
      !data.labels ||
      !Array.isArray(data.labels) ||
      data.labels.length === 0
    ) {
      throw new InvalidInputError('Node must have at least one label');
    }

    const invalidLabels = data.labels.filter((label) => !label?.trim());
    if (invalidLabels.length > 0) {
      throw new InvalidInputError('All node labels must be non-empty strings');
    }

    if (data.properties && typeof data.properties !== 'object') {
      throw new InvalidInputError('Node properties must be a valid object');
    }
  }

  /**
   * Common validation for relationship data
   */
  protected validateRelationshipData(data: GraphRelationshipData): void {
    if (!data.type?.trim()) {
      throw new InvalidInputError(
        'Relationship type is required and cannot be empty'
      );
    }

    if (data.type.length > 50) {
      throw new InvalidInputError(
        'Relationship type cannot exceed 50 characters'
      );
    }

    if (!/^[A-Z_][A-Z0-9_]*$/.test(data.type)) {
      throw new InvalidInputError(
        'Relationship type must be in SCREAMING_SNAKE_CASE format'
      );
    }

    if (data.properties && typeof data.properties !== 'object') {
      throw new InvalidInputError(
        'Relationship properties must be a valid object'
      );
    }
  }

  /**
   * Common validation for Cypher queries
   */
  protected validateCypherQuery(query: string): void {
    if (!query?.trim()) {
      throw new InvalidInputError(
        'Cypher query is required and cannot be empty'
      );
    }

    // Basic security checks
    const dangerousKeywords = ['DROP', 'DELETE ALL', 'REMOVE ALL'];
    const upperQuery = query.toUpperCase();

    for (const keyword of dangerousKeywords) {
      if (upperQuery.includes(keyword)) {
        throw new SecurityError(
          `Query contains potentially dangerous keyword: ${keyword}`
        );
      }
    }
  }
}

/**
 * Data structure for creating nodes in graph database
 */
export interface GraphNodeData {
  /** Optional node ID - if not provided, will be auto-generated */
  readonly id?: string;

  /** Node labels (at least one required) */
  readonly labels: readonly string[];

  /** Node properties */
  readonly properties: Record<string, unknown>;
}

/**
 * Data structure for creating relationships in graph database
 */
export interface GraphRelationshipData {
  /** Relationship type (SCREAMING_SNAKE_CASE) */
  readonly type: string;

  /** Optional relationship properties */
  readonly properties?: Record<string, unknown>;
}

/**
 * Specification for graph traversal operations
 */
export interface TraversalSpec {
  /** Maximum depth to traverse */
  readonly depth?: number;

  /** Traversal direction */
  readonly direction?: 'IN' | 'OUT' | 'BOTH';

  /** Filter by relationship types */
  readonly relationshipTypes?: readonly string[];

  /** Filter by node labels */
  readonly nodeLabels?: readonly string[];

  /** Property filter criteria */
  readonly filter?: Record<string, unknown>;

  /** Maximum number of results */
  readonly limit?: number;
}

/**
 * Result from graph traversal operations
 */
export interface GraphTraversalResult {
  /** Found nodes */
  readonly nodes: readonly GraphNode[];

  /** Found relationships */
  readonly relationships: readonly GraphRelationship[];

  /** Complete paths from start node */
  readonly paths: readonly GraphPath[];
}

/**
 * Graph node representation
 */
export interface GraphNode {
  /** Node ID */
  readonly id: string;

  /** Node labels */
  readonly labels: readonly string[];

  /** Node properties */
  readonly properties: Record<string, unknown>;
}

/**
 * Graph relationship representation
 */
export interface GraphRelationship {
  /** Relationship ID */
  readonly id: string;

  /** Relationship type */
  readonly type: string;

  /** Source node ID */
  readonly startNodeId: string;

  /** Target node ID */
  readonly endNodeId: string;

  /** Relationship properties */
  readonly properties?: Record<string, unknown>;
}

/**
 * Graph path representation (sequence of nodes and relationships)
 */
export interface GraphPath {
  /** Nodes in the path */
  readonly nodes: readonly GraphNode[];

  /** Relationships connecting the nodes */
  readonly relationships: readonly GraphRelationship[];

  /** Path length (number of relationships) */
  readonly length: number;
}

/**
 * Result from executing Cypher queries
 */
export interface GraphQueryResult {
  /** Query result records */
  readonly records: readonly Record<string, unknown>[];

  /** Query execution summary */
  readonly summary?: {
    readonly counters?: {
      readonly nodesCreated?: number;
      readonly nodesDeleted?: number;
      readonly relationshipsCreated?: number;
      readonly relationshipsDeleted?: number;
      readonly propertiesSet?: number;
    };
    readonly resultAvailableAfter?: number;
    readonly resultConsumedAfter?: number;
  };
}

/**
 * Graph database statistics
 */
export interface GraphStats {
  /** Total number of nodes */
  readonly nodeCount: number;

  /** Total number of relationships */
  readonly relationshipCount: number;

  /** Number of indexes */
  readonly indexCount: number;

  /** Database size in bytes */
  readonly databaseSize?: number;

  /** When statistics were last updated */
  readonly lastUpdated: Date;

  /** Node counts by label */
  readonly nodeCountsByLabel?: Record<string, number>;

  /** Relationship counts by type */
  readonly relationshipCountsByType?: Record<string, number>;
}

/**
 * Graph operation for batch execution
 */
export interface GraphOperation {
  /** Operation type */
  readonly type:
    | 'CREATE_NODE'
    | 'CREATE_RELATIONSHIP'
    | 'UPDATE_NODE'
    | 'DELETE_NODE'
    | 'CYPHER';

  /** Operation data */
  readonly data: unknown;

  /** Optional operation ID for result correlation */
  readonly operationId?: string;
}

/**
 * Result from batch operations
 */
export interface GraphBatchResult {
  /** Number of successful operations */
  readonly successCount: number;

  /** Number of failed operations */
  readonly errorCount: number;

  /** Results keyed by operation ID */
  readonly results: Record<string, unknown>;

  /** Errors keyed by operation ID */
  readonly errors: Record<string, Error>;
}

/**
 * Criteria for finding nodes
 */
export interface GraphFindCriteria {
  /** Filter by node labels */
  readonly labels?: readonly string[];

  /** Property filter criteria */
  readonly properties?: Record<string, unknown>;

  /** Maximum number of results */
  readonly limit?: number;

  /** Number of results to skip */
  readonly skip?: number;

  /** Sort order */
  readonly orderBy?: readonly {
    readonly property: string;
    readonly direction: 'ASC' | 'DESC';
  }[];
}

/**
 * Error thrown when node operations fail
 */
export class InvalidNodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidNodeError';
  }
}

/**
 * Error thrown when input parameters are invalid
 */
export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}

/**
 * Error thrown for security violations
 */
export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Error thrown when graph operations fail
 */
export class GraphOperationError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GraphOperationError';
  }
}

/**
 * Error thrown when transactions fail
 */
export class TransactionError extends Error {
  constructor(message: string, public override readonly cause?: Error) {
    super(message);
    this.name = 'TransactionError';
  }
}
