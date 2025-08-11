export interface QueryResult<T = any> {
  records: T[];
  summary?: {
    query: {
      text: string;
      parameters: Record<string, any>;
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
    plan?: any;
    profile?: any;
    notifications: any[];
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
  params?: Record<string, any>;
  database?: string;
}

export interface BulkResult {
  success: boolean;
  results: QueryResult[];
  errors?: Error[];
}