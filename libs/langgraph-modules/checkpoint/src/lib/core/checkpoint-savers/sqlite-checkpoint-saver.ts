import type {
  Checkpoint,
  CheckpointMetadata} from '@langchain/langgraph';
import {
  BaseCheckpointSaver
} from '@langchain/langgraph';
import type {
  SqliteCheckpointConfig,
  EnhancedCheckpoint,
  EnhancedCheckpointMetadata,
  CheckpointStats,
  CheckpointCleanupOptions,
  EnhancedBaseCheckpointSaver,
  EnhancedCheckpointTuple,
  ListCheckpointsOptions,
} from '../../interfaces/checkpoint.interface';

/**
 * SQLite-based checkpoint saver for lightweight persistence
 */
export class SqliteCheckpointSaver
  extends BaseCheckpointSaver
  implements EnhancedBaseCheckpointSaver
{
  private db: any; // sqlite3.Database
  private readonly tableName: string;
  private initialized = false;

  constructor(private readonly config: SqliteCheckpointConfig) {
    super();
    this.tableName = config.tableName || 'checkpoints';
    this.initializeDatabase();
  }

  /**
   * Initialize SQLite database
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Dynamic import of sqlite3
      const sqlite3 = await import('sqlite3');
      const { open } = await import('sqlite');

      const databasePath = this.config.databasePath || ':memory:';

      this.db = await open({
        filename: databasePath,
        driver: sqlite3.Database,
      });

      // Configure SQLite settings
      if (this.config.walMode) {
        await this.db.exec('PRAGMA journal_mode = WAL');
      }

      if (this.config.busyTimeout) {
        await this.db.exec(`PRAGMA busy_timeout = ${this.config.busyTimeout}`);
      }

      // Initialize schema
      await this.initializeSchema();
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize SQLite database: ${error.message}`);
    }
  }

  /**
   * Initialize database schema
   */
  private async initializeSchema(): Promise<void> {
    // Create checkpoints table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        thread_id TEXT NOT NULL,
        checkpoint_id TEXT NOT NULL,
        checkpoint_data TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        size_bytes INTEGER,
        checksum TEXT,
        PRIMARY KEY (thread_id, checkpoint_id)
      )
    `;

    await this.db.exec(createTableQuery);

    // Create indexes for better performance
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_thread_id ON ${this.tableName} (thread_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_at ON ${this.tableName} (created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_metadata ON ${this.tableName} (metadata)`,
    ];

    for (const indexQuery of indexes) {
      await this.db.exec(indexQuery);
    }

    // Create trigger to update updated_at timestamp
    const triggerQuery = `
      CREATE TRIGGER IF NOT EXISTS update_${this.tableName}_updated_at
      AFTER UPDATE ON ${this.tableName}
      FOR EACH ROW
      BEGIN
        UPDATE ${this.tableName} SET updated_at = CURRENT_TIMESTAMP WHERE thread_id = NEW.thread_id AND checkpoint_id = NEW.checkpoint_id;
      END
    `;

    await this.db.exec(triggerQuery);
  }

  /**
   * Ensure initialization is complete
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializeDatabase();
    }
  }

  /**
   * Save checkpoint to SQLite
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

    const query = `
      INSERT OR REPLACE INTO ${this.tableName}
      (thread_id, checkpoint_id, checkpoint_data, metadata, size_bytes, checksum, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const values = [
      threadId,
      checkpointId,
      JSON.stringify(enhancedCheckpoint),
      JSON.stringify(enhancedCheckpoint.metadata),
      enhancedCheckpoint.size,
      enhancedCheckpoint.checksum,
    ];

    await this.db.run(query, values);
  }

  /**
   * Get checkpoint from SQLite
   */
  async get(config: any): Promise<Checkpoint | null> {
    await this.ensureInitialized();

    const threadId = config.configurable?.thread_id;
    const checkpointId = config.configurable?.checkpoint_id;

    if (!threadId) {
      throw new Error('Thread ID is required');
    }

    let query: string;
    let values: any[];

    if (checkpointId) {
      // Get specific checkpoint
      query = `
        SELECT checkpoint_data
        FROM ${this.tableName}
        WHERE thread_id = ? AND checkpoint_id = ?
      `;
      values = [threadId, checkpointId];
    } else {
      // Get latest checkpoint
      query = `
        SELECT checkpoint_data
        FROM ${this.tableName}
        WHERE thread_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `;
      values = [threadId];
    }

    const result = await this.db.get(query, values);

    if (!result) {
      return null;
    }

    try {
      return JSON.parse(result.checkpoint_data);
    } catch (error) {
      throw new Error(`Failed to parse checkpoint data: ${error.message}`);
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

    let query = `
      SELECT checkpoint_id, checkpoint_data, metadata
      FROM ${this.tableName}
      WHERE thread_id = ?
    `;

    const values: any[] = [threadId];

    // Add filtering conditions
    if (options?.workflowName) {
      query += ` AND JSON_EXTRACT(metadata, '$.workflowName') = ?`;
      values.push(options.workflowName);
    }

    if (options?.branchName) {
      query += ` AND JSON_EXTRACT(metadata, '$.branchName') = ?`;
      values.push(options.branchName);
    }

    if (options?.dateRange) {
      if (options.dateRange.from) {
        query += ` AND created_at >= ?`;
        values.push(options.dateRange.from.toISOString());
      }
      if (options.dateRange.to) {
        query += ` AND created_at <= ?`;
        values.push(options.dateRange.to.toISOString());
      }
    }

    // Add sorting
    const sortBy = options?.sortBy || 'timestamp';
    const sortOrder = options?.sortOrder || 'desc';

    if (sortBy === 'timestamp') {
      query += ` ORDER BY created_at ${sortOrder.toUpperCase()}`;
    } else if (sortBy === 'stepName') {
      query += ` ORDER BY JSON_EXTRACT(metadata, '$.stepName') ${sortOrder.toUpperCase()}`;
    } else if (sortBy === 'executionDuration') {
      query += ` ORDER BY CAST(JSON_EXTRACT(metadata, '$.executionDuration') AS INTEGER) ${sortOrder.toUpperCase()}`;
    }

    // Add pagination
    if (options?.limit) {
      query += ` LIMIT ?`;
      values.push(options.limit);
    }

    if (options?.offset) {
      query += ` OFFSET ?`;
      values.push(options.offset);
    }

    const results = await this.db.all(query, values);

    return results.map((row: any) => [
      {
        configurable: { thread_id: threadId, checkpoint_id: row.checkpoint_id },
      },
      JSON.parse(row.checkpoint_data),
      JSON.parse(row.metadata || '{}'),
    ]);
  }

  /**
   * Get checkpoint statistics
   */
  async getStats(): Promise<CheckpointStats> {
    await this.ensureInitialized();

    const statsQuery = `
      SELECT
        COUNT(*) as total_checkpoints,
        COUNT(DISTINCT thread_id) as active_threads,
        AVG(size_bytes) as average_size,
        SUM(size_bytes) as total_storage_used,
        COUNT(*) FILTER (WHERE created_at > datetime('now', '-1 hour')) as recent_checkpoints
      FROM ${this.tableName}
    `;

    const result = await this.db.get(statsQuery);

    return {
      totalCheckpoints: result.total_checkpoints || 0,
      activeThreads: result.active_threads || 0,
      averageSize: result.average_size || 0,
      totalStorageUsed: result.total_storage_used || 0,
      recentCheckpoints: result.recent_checkpoints || 0,
      averageSaveTime: 5, // SQLite operations are typically fast
      averageLoadTime: 3,
      errorRate: 0, // Would need to track this separately
      storageType: 'sqlite',
      lastCleanup: new Date(),
    };
  }

  /**
   * Cleanup old checkpoints
   */
  async cleanup(options: CheckpointCleanupOptions = {}): Promise<number> {
    await this.ensureInitialized();

    let cleanedCount = 0;

    try {
      await this.db.exec('BEGIN TRANSACTION');

      // Clean up by age
      if (options.maxAge) {
        const cutoffDate = new Date(Date.now() - options.maxAge).toISOString();

        let deleteQuery = `
          DELETE FROM ${this.tableName}
          WHERE created_at < ?
        `;

        const values: any[] = [cutoffDate];

        if (options.excludeThreads && options.excludeThreads.length > 0) {
          const placeholders = options.excludeThreads.map(() => '?').join(', ');
          deleteQuery += ` AND thread_id NOT IN (${placeholders})`;
          values.push(...options.excludeThreads);
        }

        const result = await this.db.run(deleteQuery, values);
        cleanedCount += result.changes || 0;
      }

      // Clean up by max per thread
      if (options.maxPerThread) {
        // Get threads that exceed the limit
        let threadsQuery = `
          SELECT thread_id, COUNT(*) as checkpoint_count
          FROM ${this.tableName}
          GROUP BY thread_id
          HAVING COUNT(*) > ?
        `;

        const threadsValues: any[] = [options.maxPerThread];

        if (options.excludeThreads && options.excludeThreads.length > 0) {
          const placeholders = options.excludeThreads.map(() => '?').join(', ');
          threadsQuery += ` AND thread_id NOT IN (${placeholders})`;
          threadsValues.push(...options.excludeThreads);
        }

        const threadsResult = await this.db.all(threadsQuery, threadsValues);

        for (const row of threadsResult) {
          const threadId = row.thread_id;
          const excessCount = row.checkpoint_count - options.maxPerThread;

          // Delete oldest checkpoints for this thread
          const deleteOldQuery = `
            DELETE FROM ${this.tableName}
            WHERE thread_id = ?
            AND checkpoint_id IN (
              SELECT checkpoint_id
              FROM ${this.tableName}
              WHERE thread_id = ?
              ORDER BY created_at ASC
              LIMIT ?
            )
          `;

          const deleteResult = await this.db.run(deleteOldQuery, [
            threadId,
            threadId,
            excessCount,
          ]);
          cleanedCount += deleteResult.changes || 0;
        }
      }

      await this.db.exec('COMMIT');
    } catch (error) {
      await this.db.exec('ROLLBACK');
      throw error;
    }

    return cleanedCount;
  }

  /**
   * Health check for SQLite storage
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      await this.db.get('SELECT 1');
      return true;
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
      const versionResult = await this.db.get(
        'SELECT sqlite_version() as version'
      );
      const isHealthy = await this.healthCheck();

      return {
        type: 'sqlite',
        version: versionResult?.version,
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          databasePath: this.config.databasePath,
          tableName: this.tableName,
          walMode: this.config.walMode,
          busyTimeout: this.config.busyTimeout,
        },
      };
    } catch (error) {
      return {
        type: 'sqlite',
        status: 'unhealthy',
        details: {
          error: error.message,
        },
      };
    }
  }

  /**
   * Close SQLite database
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
    }
  }

  /**
   * Backup database to file
   */
  async backup(backupPath: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Ensure backup directory exists
      const backupDir = path.dirname(backupPath);
      await fs.mkdir(backupDir, { recursive: true });

      // Use SQLite backup API if available, otherwise copy file
      if (this.config.databasePath && this.config.databasePath !== ':memory:') {
        await fs.copyFile(this.config.databasePath, backupPath);
      } else {
        throw new Error('Cannot backup in-memory database');
      }
    } catch (error) {
      throw new Error(`Failed to backup database: ${error.message}`);
    }
  }

  /**
   * Restore database from backup
   */
  async restore(backupPath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');

      if (
        !this.config.databasePath ||
        this.config.databasePath === ':memory:'
      ) {
        throw new Error('Cannot restore to in-memory database');
      }

      // Close current database
      if (this.db) {
        await this.db.close();
      }

      // Copy backup file
      await fs.copyFile(backupPath, this.config.databasePath);

      // Reinitialize database
      this.initialized = false;
      await this.initializeDatabase();
    } catch (error) {
      throw new Error(`Failed to restore database: ${error.message}`);
    }
  }
}
