/**
 * Query plan step information
 */
export interface QueryPlanStep {
  operatorType: string;
  identifiers: string[];
  arguments?: Record<string, unknown>;
  children?: QueryPlanStep[];
  estimatedRows?: number;
}

/**
 * Query profile information
 */
export interface QueryProfile extends QueryPlanStep {
  dbHits: number;
  rows: number;
  pageCacheMisses?: number;
  pageCacheHits?: number;
  pageCacheHitRatio?: number;
  time?: number;
}

/**
 * Query notification
 */
export interface QueryNotification {
  code: string;
  title: string;
  description: string;
  severity: 'WARNING' | 'INFORMATION' | 'UNKNOWN';
  position?: {
    offset: number;
    line: number;
    column: number;
  };
}

export interface QueryResult<T = Record<string, unknown>> {
  records: T[];
  summary?: {
    query: {
      text: string;
      parameters: Record<string, unknown>;
    };
    counters: {
      nodesCreated: number;
      nodesDeleted: number;
      relationshipsCreated: number;
      relationshipsDeleted: number;
      propertiesSet: number;
      labelsAdded: number;
      labelsRemoved: number;
      indexesAdded: number;
      indexesRemoved: number;
      constraintsAdded: number;
      constraintsRemoved: number;
    };
    updateStatistics: {
      containsUpdates: boolean;
      containsSystemUpdates: boolean;
    };
    plan?: QueryPlanStep;
    profile?: QueryProfile;
    notifications: QueryNotification[];
    server: {
      address: string;
      version: string;
    };
    resultConsumedAfter: number;
    resultAvailableAfter: number;
    database?: {
      name: string;
    };
  };
}

export interface BulkOperation {
  cypher: string;
  params?: Record<string, unknown>;
  database?: string;
}

export interface BulkResult {
  successCount: number;
  errorCount: number;
  errors: Array<{ operation: BulkOperation; error: string }>;
  totalOperations: number;
}

// ==================== ENHANCED INTERFACES ====================

/**
 * Enhanced query options for improved functionality
 */
export interface EnhancedQueryOptions {
  /** Database to execute query against */
  database?: string;
  /** Default access mode for the session */
  defaultAccessMode?: 'READ' | 'WRITE';
  /** Bookmarks for transaction ordering */
  bookmarks?: string[];
  /** Number of records to fetch at a time */
  fetchSize?: number;
  /** Enable query profiling */
  profile?: boolean;
  /** Include query plan in result */
  explain?: boolean;
  /** Query timeout in milliseconds */
  timeout?: number;
  /** Cache configuration */
  cache?: {
    enabled: boolean;
    ttl?: number;
    key?: string;
  };
  /** Retry configuration */
  retry?: {
    enabled: boolean;
    attempts?: number;
    delay?: number;
  };
  /** Metrics collection */
  metrics?: {
    enabled: boolean;
    tags?: Record<string, string>;
  };
}

/**
 * Enhanced query result with additional metadata
 */
export interface EnhancedQueryResult<T = Record<string, unknown>>
  extends QueryResult<T> {
  /** Performance metrics */
  performance?: {
    executionTime: number;
    planningTime: number;
    totalTime: number;
    cacheHit?: boolean;
    retryCount?: number;
  };
  /** Connection pool information */
  connectionInfo?: {
    poolSize: number;
    activeConnections: number;
    idleConnections: number;
  };
  /** Query metadata */
  metadata?: {
    queryId: string;
    timestamp: Date;
    sessionId: string;
    tags?: Record<string, string>;
  };
}

/**
 * Metrics for query performance tracking
 */
export interface QueryMetrics {
  queryType: 'READ' | 'WRITE' | 'MIXED';
  executionTime: number;
  planningTime: number;
  totalTime: number;
  rowsReturned: number;
  rowsAffected: number;
  cacheHit: boolean;
  retryCount: number;
  errors?: string[];
  timestamp: Date;
  tags?: Record<string, string>;
}

/**
 * Connection pool statistics
 */
export interface ConnectionPoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  maxPoolSize: number;
  connectionRequests: number;
  connectionFailures: number;
  averageConnectionTime: number;
  lastResetTime: Date;
}

/**
 * Enhanced health check result
 */
export interface EnhancedHealthIndicator {
  name: string;
  status: 'up' | 'down' | 'degraded';
  message?: string;
  details?: {
    database?: string;
    version?: string;
    edition?: string;
    cluster?: {
      role: 'LEADER' | 'FOLLOWER' | 'SINGLE';
      servers: string[];
      writableMembers: number;
      readOnlyMembers: number;
    };
    connectionPool?: ConnectionPoolMetrics;
    responseTime?: number;
    lastCheck?: Date;
    errors?: string[];
  };
}

/**
 * Comprehensive database metrics
 */
export interface ComprehensiveMetrics {
  database: {
    nodeCount: number;
    relationshipCount: number;
    labelStats: Record<string, number>;
    propertyKeyStats: Record<string, number>;
    indexStats: Record<
      string,
      {
        state: string;
        populationPercent: number;
        size: number;
      }
    >;
    constraintStats: Record<
      string,
      {
        type: string;
        entityType: string;
        properties: string[];
      }
    >;
  };
  performance: {
    queriesPerSecond: number;
    averageQueryTime: number;
    slowQueries: Array<{
      query: string;
      executionTime: number;
      timestamp: Date;
    }>;
    connectionPoolUtilization: number;
    cacheHitRatio: number;
  };
  errors: {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: Array<{
      message: string;
      timestamp: Date;
      queryText?: string;
    }>;
  };
}
