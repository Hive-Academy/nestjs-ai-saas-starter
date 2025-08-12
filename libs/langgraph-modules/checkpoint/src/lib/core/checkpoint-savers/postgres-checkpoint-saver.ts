import {
  BaseCheckpointSaver,
  Checkpoint,
  CheckpointMetadata,
} from '@langchain/langgraph';
import {
  PostgresCheckpointConfig,
  EnhancedCheckpoint,
  EnhancedCheckpointMetadata,
  CheckpointStats,
  CheckpointCleanupOptions,
  EnhancedBaseCheckpointSaver,
  EnhancedCheckpointTuple,
  ListCheckpointsOptions,
} from '../../interfaces/checkpoint.interface';

/**
 * PostgreSQL-based checkpoint saver with database schema management
 */
export class PostgresCheckpointSaver
  extends BaseCheckpointSaver
  implements EnhancedBaseCheckpointSaver
{
  private pool: any; // pg.Pool
  private readonly tableName: string;
  private readonly schemaName: string;
  private initialized = false;

  constructor(private readonly config: PostgresCheckpointConfig) {
    super();
    this.tableName = config.tableName || 'checkpoints';
    this.schemaName = config.schemaName || 'public';
    this.initializePool();
  }

  /**
   * Initialize PostgreSQL connection pool
   */
  private async initializePool(): Promise<void> {
    try {
      // Dynamic import of pg
      const { Pool } = await import('pg');

      if (this.config.connectionString) {
        this.pool = new Pool({
          connectionString: this.config.connectionString,
          ssl: this.config.ssl,
          ...this.config.pool,
        });
      } else {
        this.pool = new Pool({
          host: this.config.host,
          port: this.config.port,
          database: this.config.database,
          user: this.config.user,
          password: this.config.password,
          ssl: this.config.ssl,
          ...this.config.pool,
        });
      }

      // Test connection and initialize schema
      await this.initializeSchema();
      this.initialized = true;
    } catch (error) {
      throw new Error(
        `Failed to initialize PostgreSQL connection: ${error.message}`
      );
    }
  }

  /**
   * Initialize database schema
   */
  private async initializeSchema(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Create schema if it doesn't exist
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${this.schemaName}`);

      // Create checkpoints table
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${this.schemaName}.${this.tableName} (
          thread_id VARCHAR(255) NOT NULL,
          checkpoint_id VARCHAR(255) NOT NULL,
          checkpoint_data JSONB NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          size_bytes INTEGER,
          checksum VARCHAR(64),
          PRIMARY KEY (thread_id, checkpoint_id)
        )
      `;

      await client.query(createTableQuery);

      // Create indexes for better performance
      const indexes = [
        `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_thread_id ON ${this.schemaName}.${this.tableName} (thread_id)`,
        `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_at ON ${this.schemaName}.${this.tableName} (created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_metadata ON ${this.schemaName}.${this.tableName} USING GIN (metadata)`,
      ];

      for (const indexQuery of indexes) {
        await client.query(indexQuery);
      }
    } finally {
      client.release();
    }
  }

  /**
   * Ensure initialization is complete
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializePool();
    }
  }

  /**
   * Save checkpoint to PostgreSQL
   */
  async put(
    config: any,
    checkpoint: Checkpoint,
    metadata?: CheckpointMetadata
  ): Promise<void> {
    await this.ensureInitialized();

    const threadId = config.configurable?.thread_id;
    const checkpointId = checkpoint.id;

    if (!threadId || !checkpointId) {
      throw new Error('Thread ID and Checkpoint ID are required');
    }

    // Create enhanced checkpoint
    const enhancedCheckpoint: EnhancedCheckpoint = {
      ...checkpoint,
      metadata: {
        ...metadata,
        threadId,
        timestamp: new Date().toISOString(),
      } as EnhancedCheckpointMetadata,
      size: JSON.stringify(checkpoint).length,
    };

    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO ${this.schemaName}.${this.tableName}
        (thread_id, checkpoint_id, checkpoint_data, metadata, size_bytes, checksum)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (thread_id, checkpoint_id)
        DO UPDATE SET
          checkpoint_data = EXCLUDED.checkpoint_data,
          metadata = EXCLUDED.metadata,
          updated_at = NOW(),
          size_bytes = EXCLUDED.size_bytes,
          checksum = EXCLUDED.checksum
      `;

      const values = [
        threadId,
        checkpointId,
        JSON.stringify(enhancedCheckpoint),
        JSON.stringify(enhancedCheckpoint.metadata),
        enhancedCheckpoint.size,
        enhancedCheckpoint.checksum,
      ];

      await client.query(query, values);
    } finally {
      client.release();
    }
  }

  /**
   * Get checkpoint from PostgreSQL
   */
  async get(config: any): Promise<Checkpoint | null> {
    await this.ensureInitialized();

    const threadId = config.configurable?.thread_id;
    const checkpointId = config.configurable?.checkpoint_id;

    if (!threadId) {
      throw new Error('Thread ID is required');
    }

    const client = await this.pool.connect();

    try {
      let query: string;
      let values: any[];

      if (checkpointId) {
        // Get specific checkpoint
        query = `
          SELECT checkpoint_data
          FROM ${this.schemaName}.${this.tableName}
          WHERE thread_id = $1 AND checkpoint_id = $2
        `;
        values = [threadId, checkpointId];
      } else {
        // Get latest checkpoint
        query = `
          SELECT checkpoint_data
          FROM ${this.schemaName}.${this.tableName}
          WHERE thread_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `;
        values = [threadId];
      }

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].checkpoint_data;
    } finally {
      client.release();
    }
  }

  /**
   * List checkpoints for a thread
   */
  async list(
    config: any,
    options?: ListCheckpointsOptions
  ): Promise<EnhancedCheckpointTuple[]> {
    await this.ensureInitialized();

    const threadId = config.configurable?.thread_id;

    if (!threadId) {
      throw new Error('Thread ID is required');
    }

    const client = await this.pool.connect();

    try {
      let query = `
        SELECT checkpoint_id, checkpoint_data, metadata
        FROM ${this.schemaName}.${this.tableName}
        WHERE thread_id = $1
      `;

      const values: any[] = [threadId];
      let paramIndex = 2;

      // Add filtering conditions
      if (options?.workflowName) {
        query += ` AND metadata->>'workflowName' = $${paramIndex}`;
        values.push(options.workflowName);
        paramIndex++;
      }

      if (options?.branchName) {
        query += ` AND metadata->>'branchName' = $${paramIndex}`;
        values.push(options.branchName);
        paramIndex++;
      }

      if (options?.dateRange) {
        if (options.dateRange.from) {
          query += ` AND created_at >= $${paramIndex}`;
          values.push(options.dateRange.from);
          paramIndex++;
        }
        if (options.dateRange.to) {
          query += ` AND created_at <= $${paramIndex}`;
          values.push(options.dateRange.to);
          paramIndex++;
        }
      }

      // Add sorting
      const sortBy = options?.sortBy || 'timestamp';
      const sortOrder = options?.sortOrder || 'desc';

      if (sortBy === 'timestamp') {
        query += ` ORDER BY created_at ${sortOrder.toUpperCase()}`;
      } else if (sortBy === 'stepName') {
        query += ` ORDER BY metadata->>'stepName' ${sortOrder.toUpperCase()}`;
      } else if (sortBy === 'executionDuration') {
        query += ` ORDER BY (metadata->>'executionDuration')::integer ${sortOrder.toUpperCase()}`;
      }

      // Add pagination
      if (options?.limit) {
        query += ` LIMIT $${paramIndex}`;
        values.push(options.limit);
        paramIndex++;
      }

      if (options?.offset) {
        query += ` OFFSET $${paramIndex}`;
        values.push(options.offset);
      }

      const result = await client.query(query, values);

      return result.rows.map((row) => [
        {
          configurable: {
            thread_id: threadId,
            checkpoint_id: row.checkpoint_id,
          },
        },
        row.checkpoint_data,
        row.metadata,
      ]);
    } finally {
      client.release();
    }
  }

  /**
   * Get checkpoint statistics
   */
  async getStats(): Promise<CheckpointStats> {
    await this.ensureInitialized();

    const client = await this.pool.connect();

    try {
      const statsQuery = `
        SELECT
          COUNT(*) as total_checkpoints,
          COUNT(DISTINCT thread_id) as active_threads,
          AVG(size_bytes) as average_size,
          SUM(size_bytes) as total_storage_used,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as recent_checkpoints
        FROM ${this.schemaName}.${this.tableName}
      `;

      const result = await client.query(statsQuery);
      const stats = result.rows[0];

      return {
        totalCheckpoints: parseInt(stats.total_checkpoints),
        activeThreads: parseInt(stats.active_threads),
        averageSize: parseFloat(stats.average_size) || 0,
        totalStorageUsed: parseInt(stats.total_storage_used) || 0,
        recentCheckpoints: parseInt(stats.recent_checkpoints),
        averageSaveTime: 10, // PostgreSQL operations are typically slower than memory/Redis
        averageLoadTime: 8,
        errorRate: 0, // Would need to track this separately
        storageType: 'postgres',
        lastCleanup: new Date(),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Cleanup old checkpoints
   */
  async cleanup(options: CheckpointCleanupOptions = {}): Promise<number> {
    await this.ensureInitialized();

    const client = await this.pool.connect();
    let cleanedCount = 0;

    try {
      await client.query('BEGIN');

      // Clean up by age
      if (options.maxAge) {
        const cutoffDate = new Date(Date.now() - options.maxAge);

        let deleteQuery = `
          DELETE FROM ${this.schemaName}.${this.tableName}
          WHERE created_at < $1
        `;

        const values: any[] = [cutoffDate];

        if (options.excludeThreads && options.excludeThreads.length > 0) {
          deleteQuery += ` AND thread_id NOT IN (${options.excludeThreads
            .map((_, i) => `$${i + 2}`)
            .join(', ')})`;
          values.push(...options.excludeThreads);
        }

        const result = await client.query(deleteQuery, values);
        cleanedCount += result.rowCount || 0;
      }

      // Clean up by max per thread
      if (options.maxPerThread) {
        // Get threads that exceed the limit
        let threadsQuery = `
          SELECT thread_id, COUNT(*) as checkpoint_count
          FROM ${this.schemaName}.${this.tableName}
          GROUP BY thread_id
          HAVING COUNT(*) > $1
        `;

        const threadsValues: any[] = [options.maxPerThread];

        if (options.excludeThreads && options.excludeThreads.length > 0) {
          threadsQuery += ` AND thread_id NOT IN (${options.excludeThreads
            .map((_, i) => `$${i + 2}`)
            .join(', ')})`;
          threadsValues.push(...options.excludeThreads);
        }

        const threadsResult = await client.query(threadsQuery, threadsValues);

        for (const row of threadsResult.rows) {
          const threadId = row.thread_id;
          const excessCount = row.checkpoint_count - options.maxPerThread;

          // Delete oldest checkpoints for this thread
          const deleteOldQuery = `
            DELETE FROM ${this.schemaName}.${this.tableName}
            WHERE thread_id = $1
            AND checkpoint_id IN (
              SELECT checkpoint_id
              FROM ${this.schemaName}.${this.tableName}
              WHERE thread_id = $1
              ORDER BY created_at ASC
              LIMIT $2
            )
          `;

          const deleteResult = await client.query(deleteOldQuery, [
            threadId,
            excessCount,
          ]);
          cleanedCount += deleteResult.rowCount || 0;
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return cleanedCount;
  }

  /**
   * Health check for PostgreSQL storage
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      const client = await this.pool.connect();

      try {
        await client.query('SELECT 1');
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get storage information
   */
  async getStorageInfo(): Promise<{
    type: string;
    version?: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    details?: Record<string, any>;
  }> {
    try {
      await this.ensureInitialized();
      const client = await this.pool.connect();

      try {
        const versionResult = await client.query('SELECT version()');
        const version = versionResult.rows[0]?.version;
        const isHealthy = await this.healthCheck();

        return {
          type: 'postgres',
          version: version?.split(' ')[1], // Extract version number
          status: isHealthy ? 'healthy' : 'unhealthy',
          details: {
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            schema: this.schemaName,
            table: this.tableName,
          },
        };
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        type: 'postgres',
        status: 'unhealthy',
        details: {
          error: error.message,
        },
      };
    }
  }

  /**
   * Close PostgreSQL connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }
}
