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
  success: boolean;
  results: QueryResult[];
  errors?: Error[];
}