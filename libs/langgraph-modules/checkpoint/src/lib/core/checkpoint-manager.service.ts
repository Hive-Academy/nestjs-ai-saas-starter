import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Checkpoint } from '@langchain/langgraph';
import {
  CheckpointConfig,
  EnhancedCheckpointMetadata,
  EnhancedCheckpoint,
  EnhancedCheckpointTuple,
  ListCheckpointsOptions,
  CheckpointSaveError,
  CheckpointLoadError,
  CheckpointStats,
  CheckpointCleanupOptions,
  EnhancedBaseCheckpointSaver,
  MemoryCheckpointConfig,
  RedisCheckpointConfig,
  PostgresCheckpointConfig,
  SqliteCheckpointConfig,
} from '../interfaces/checkpoint.interface';

/**
 * Service for managing checkpoint persistence across multiple storage backends
 */
@Injectable()
export class CheckpointManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CheckpointManagerService.name);
  private readonly checkpointSavers = new Map<
    string,
    EnhancedBaseCheckpointSaver
  >();
  private defaultSaver: EnhancedBaseCheckpointSaver | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly saveMetrics = new Map<
    string,
    { totalTime: number; count: number }
  >();
  private readonly loadMetrics = new Map<
    string,
    { totalTime: number; count: number }
  >();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initializeCheckpointSavers();
    this.startCleanupScheduler();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all checkpoint savers
    for (const [name, saver] of this.checkpointSavers) {
      try {
        if ('close' in saver && typeof saver.close === 'function') {
          await (saver as { close(): Promise<void> }).close();
        }
      } catch (error) {
        this.logger.warn(`Failed to close checkpoint saver ${name}:`, error);
      }
    }
  }

  /**
   * Initialize checkpoint savers from configuration
   */
  private async initializeCheckpointSavers(): Promise<void> {
    const configs = this.configService.get<CheckpointConfig[]>(
      'checkpoint.savers',
      []
    );

    if (configs.length === 0) {
      // Create default memory saver if no configuration provided
      const defaultConfig: CheckpointConfig = {
        type: 'memory',
        name: 'default',
        default: true,
      };
      configs.push(defaultConfig);
    }

    for (const config of configs) {
      try {
        const saver = await this.createCheckpointSaver(config);
        const name = config.name || config.type;

        this.checkpointSavers.set(name, saver);

        if (config.default || !this.defaultSaver) {
          this.defaultSaver = saver;
        }

        this.logger.log(`Initialized ${config.type} checkpoint saver: ${name}`);
      } catch (error) {
        this.logger.error(
          `Failed to initialize checkpoint saver ${
            config.name || config.type
          }:`,
          error
        );
      }
    }

    if (!this.defaultSaver) {
      throw new Error('No default checkpoint saver could be initialized');
    }
  }

  /**
   * Create checkpoint saver based on configuration
   */
  async createCheckpointSaver(
    config: CheckpointConfig
  ): Promise<EnhancedBaseCheckpointSaver> {
    switch (config.type) {
      case 'memory':
        return this.createMemoryCheckpointSaver(config.memory);
      case 'redis':
        if (!config.redis) {
          throw new Error(
            'Redis configuration is required for redis checkpoint type'
          );
        }
        return this.createRedisCheckpointSaver(config.redis);
      case 'postgres':
        if (!config.postgres) {
          throw new Error(
            'PostgreSQL configuration is required for postgres checkpoint type'
          );
        }
        return this.createPostgresCheckpointSaver(config.postgres);
      case 'sqlite':
        if (!config.sqlite) {
          throw new Error(
            'SQLite configuration is required for sqlite checkpoint type'
          );
        }
        return this.createSqliteCheckpointSaver(config.sqlite);
      default:
        throw new Error(`Unsupported checkpoint type: ${config.type}`);
    }
  }

  /**
   * Create memory checkpoint saver
   */
  private async createMemoryCheckpointSaver(
    config?: MemoryCheckpointConfig
  ): Promise<EnhancedBaseCheckpointSaver> {
    const { MemoryCheckpointSaver } = await import(
      './checkpoint-savers/memory-checkpoint-saver'
    );
    return new MemoryCheckpointSaver(config);
  }

  /**
   * Create Redis checkpoint saver
   */
  private async createRedisCheckpointSaver(
    config: RedisCheckpointConfig
  ): Promise<EnhancedBaseCheckpointSaver> {
    const { RedisCheckpointSaver } = await import(
      './checkpoint-savers/redis-checkpoint-saver'
    );
    return new RedisCheckpointSaver(config);
  }

  /**
   * Create PostgreSQL checkpoint saver
   */
  private async createPostgresCheckpointSaver(
    config: PostgresCheckpointConfig
  ): Promise<EnhancedBaseCheckpointSaver> {
    const { PostgresCheckpointSaver } = await import(
      './checkpoint-savers/postgres-checkpoint-saver'
    );
    return new PostgresCheckpointSaver(config);
  }

  /**
   * Create SQLite checkpoint saver
   */
  private async createSqliteCheckpointSaver(
    config: SqliteCheckpointConfig
  ): Promise<EnhancedBaseCheckpointSaver> {
    const { SqliteCheckpointSaver } = await import(
      './checkpoint-savers/sqlite-checkpoint-saver'
    );
    return new SqliteCheckpointSaver(config);
  }

  /**
   * Save checkpoint with metadata and thread management
   */
  async saveCheckpoint<T>(
    threadId: string,
    checkpoint: Checkpoint<T>,
    metadata?: EnhancedCheckpointMetadata,
    saverName?: string
  ): Promise<void> {
    const startTime = Date.now();
    const saver = this.getCheckpointSaver(saverName);

    try {
      // Enrich metadata with additional information
      const enrichedMetadata: EnhancedCheckpointMetadata = {
        source: metadata?.source || 'input',
        step: metadata?.step || 0,
        parents: metadata?.parents || {},
        ...metadata,
        threadId,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };

      // Create enhanced checkpoint
      const enhancedCheckpoint: EnhancedCheckpoint<T> = {
        ...checkpoint,
        metadata: enrichedMetadata,
        size: this.calculateCheckpointSize(checkpoint),
        checksum: this.calculateChecksum(checkpoint),
      };

      await saver.put(
        { configurable: { thread_id: threadId } },
        enhancedCheckpoint,
        enrichedMetadata
      );

      // Record metrics
      const duration = Date.now() - startTime;
      this.recordSaveMetrics(saverName || 'default', duration);

      this.logger.debug(
        `Checkpoint saved for thread ${threadId}: ${checkpoint.id} (${duration}ms)`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to save checkpoint for thread ${threadId} (${duration}ms):`,
        error
      );

      const saveError: CheckpointSaveError = new Error(
        `Failed to save checkpoint: ${(error as Error).message}`
      ) as CheckpointSaveError;
      saveError.code = 'CHECKPOINT_SAVE_FAILED';
      saveError.threadId = threadId;
      saveError.checkpointId = checkpoint.id;
      saveError.cause = error as Error;
      saveError.retryable = this.isRetryableError(error as Error);

      throw saveError;
    }
  }

  /**
   * Load checkpoint with version support
   */
  async loadCheckpoint<T>(
    threadId: string,
    checkpointId?: string,
    saverName?: string
  ): Promise<EnhancedCheckpoint<T> | null> {
    const startTime = Date.now();
    const saver = this.getCheckpointSaver(saverName);

    try {
      const config = {
        configurable: {
          thread_id: threadId,
          ...(checkpointId && { checkpoint_id: checkpointId }),
        },
      };

      const checkpoint = (await saver.get(
        config
      )) as EnhancedCheckpoint<T> | null;

      // Record metrics
      const duration = Date.now() - startTime;
      this.recordLoadMetrics(saverName || 'default', duration);

      if (checkpoint) {
        this.logger.debug(
          `Checkpoint loaded for thread ${threadId}: ${checkpoint.id} (${duration}ms)`
        );

        // Verify checksum if available
        if (checkpoint.checksum) {
          const calculatedChecksum = this.calculateChecksum(checkpoint);
          if (calculatedChecksum !== checkpoint.checksum) {
            this.logger.warn(
              `Checksum mismatch for checkpoint ${checkpoint.id}`
            );
          }
        }
      } else {
        this.logger.debug(
          `No checkpoint found for thread ${threadId} (${duration}ms)`
        );
      }

      return checkpoint;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to load checkpoint for thread ${threadId} (${duration}ms):`,
        error
      );

      const loadError: CheckpointLoadError = new Error(
        `Failed to load checkpoint: ${(error as Error).message}`
      ) as CheckpointLoadError;
      loadError.code = 'CHECKPOINT_LOAD_FAILED';
      loadError.threadId = threadId;
      loadError.checkpointId = checkpointId;
      loadError.cause = error as Error;

      throw loadError;
    }
  }

  /**
   * List checkpoints for time travel with enhanced filtering
   */
  async listCheckpoints(
    threadId: string,
    options: ListCheckpointsOptions = {},
    saverName?: string
  ): Promise<EnhancedCheckpointTuple[]> {
    const saver = this.getCheckpointSaver(saverName);

    try {
      const config = { configurable: { thread_id: threadId } };
      const checkpointGenerator = saver.list(config, options);
      const checkpoints: EnhancedCheckpointTuple[] = [];

      // Convert async generator to array
      for await (const checkpoint of checkpointGenerator) {
        checkpoints.push(checkpoint as EnhancedCheckpointTuple);
      }

      // Apply additional filtering if specified
      let filteredCheckpoints = checkpoints;

      if (options.workflowName) {
        filteredCheckpoints = filteredCheckpoints.filter(
          ([, , metadata]) => metadata.workflowName === options.workflowName
        );
      }

      if (options.branchName) {
        filteredCheckpoints = filteredCheckpoints.filter(
          ([, , metadata]) => metadata.branchName === options.branchName
        );
      }

      if (options.dateRange) {
        filteredCheckpoints = filteredCheckpoints.filter(([, , metadata]) => {
          if (!metadata.timestamp) return true;
          const checkpointDate = new Date(metadata.timestamp);
          const { from, to } = options.dateRange as {
            from?: Date;
            to?: Date;
          };
          return (
            (!from || checkpointDate >= from) && (!to || checkpointDate <= to)
          );
        });
      }

      // Apply sorting
      if (options.sortBy) {
        filteredCheckpoints.sort((a, b) => {
          const [, , metadataA] = a;
          const [, , metadataB] = b;

          let valueA: string | number | Date, valueB: string | number | Date;

          switch (options.sortBy) {
            case 'timestamp':
              valueA = new Date(metadataA.timestamp || 0).getTime();
              valueB = new Date(metadataB.timestamp || 0).getTime();
              break;
            case 'executionDuration':
              valueA = metadataA.executionDuration || 0;
              valueB = metadataB.executionDuration || 0;
              break;
            case 'stepName':
              valueA = metadataA.stepName || '';
              valueB = metadataB.stepName || '';
              break;
            default:
              return 0;
          }

          const comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
          return options.sortOrder === 'desc' ? -comparison : comparison;
        });
      }

      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit || filteredCheckpoints.length;

      return filteredCheckpoints.slice(offset, offset + limit);
    } catch (error) {
      this.logger.error(
        `Failed to list checkpoints for thread ${threadId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get checkpoint statistics for monitoring
   */
  async getCheckpointStats(saverName?: string): Promise<CheckpointStats> {
    const saver = this.getCheckpointSaver(saverName);

    if (saver.getStats) {
      return saver.getStats();
    }

    // Fallback basic stats
    const saveMetrics = this.saveMetrics.get(saverName || 'default');
    const loadMetrics = this.loadMetrics.get(saverName || 'default');

    return {
      totalCheckpoints: 0,
      activeThreads: 0,
      averageSize: 0,
      totalStorageUsed: 0,
      recentCheckpoints: 0,
      averageSaveTime: saveMetrics
        ? saveMetrics.totalTime / saveMetrics.count
        : 0,
      averageLoadTime: loadMetrics
        ? loadMetrics.totalTime / loadMetrics.count
        : 0,
      errorRate: 0,
      storageType: saverName || 'default',
    };
  }

  /**
   * Cleanup old checkpoints
   */
  async cleanupCheckpoints(
    options: CheckpointCleanupOptions = {},
    saverName?: string
  ): Promise<number> {
    const saver = this.getCheckpointSaver(saverName);

    if (saver.cleanup) {
      return saver.cleanup(options);
    }

    this.logger.warn(
      `Cleanup not supported for saver: ${saverName || 'default'}`
    );
    return 0;
  }

  /**
   * Health check for checkpoint storage
   */
  async healthCheck(saverName?: string): Promise<boolean> {
    const saver = this.getCheckpointSaver(saverName);

    if (saver.healthCheck) {
      return saver.healthCheck();
    }

    // Basic health check - try to perform a simple operation
    try {
      const testConfig = { configurable: { thread_id: 'health-check' } };
      const generator = saver.list(testConfig, { limit: 1 });
      // Just check if we can get the generator without error
      await generator.next();
      return true;
    } catch (error) {
      this.logger.error(
        `Health check failed for saver ${saverName || 'default'}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get available checkpoint savers
   */
  getAvailableSavers(): string[] {
    return Array.from(this.checkpointSavers.keys());
  }

  /**
   * Get checkpoint saver by name
   */
  private getCheckpointSaver(saverName?: string): EnhancedBaseCheckpointSaver {
    if (saverName) {
      const saver = this.checkpointSavers.get(saverName);
      if (!saver) {
        throw new Error(`Checkpoint saver not found: ${saverName}`);
      }
      return saver;
    }

    if (!this.defaultSaver) {
      throw new Error('No default checkpoint saver available');
    }

    return this.defaultSaver;
  }

  /**
   * Calculate checkpoint size for monitoring
   */
  private calculateCheckpointSize(checkpoint: Checkpoint): number {
    try {
      return JSON.stringify(checkpoint).length;
    } catch (error) {
      this.logger.warn('Failed to calculate checkpoint size:', error);
      return 0;
    }
  }

  /**
   * Calculate checksum for integrity verification
   */
  private calculateChecksum(checkpoint: Checkpoint): string {
    try {
      const crypto = require('crypto');
      const data = JSON.stringify(checkpoint);
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      this.logger.warn('Failed to calculate checkpoint checksum:', error);
      return '';
    }
  }

  /**
   * Record save metrics
   */
  private recordSaveMetrics(saverName: string, duration: number): void {
    const existing = this.saveMetrics.get(saverName) || {
      totalTime: 0,
      count: 0,
    };
    existing.totalTime += duration;
    existing.count += 1;
    this.saveMetrics.set(saverName, existing);
  }

  /**
   * Record load metrics
   */
  private recordLoadMetrics(saverName: string, duration: number): void {
    const existing = this.loadMetrics.get(saverName) || {
      totalTime: 0,
      count: 0,
    };
    existing.totalTime += duration;
    existing.count += 1;
    this.loadMetrics.set(saverName, existing);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    // Common retryable error patterns
    const retryablePatterns = [
      /timeout/i,
      /connection/i,
      /network/i,
      /temporary/i,
      /busy/i,
    ];

    const errorMessage = error.message || error.toString();
    return retryablePatterns.some((pattern) => pattern.test(errorMessage));
  }

  /**
   * Start cleanup scheduler
   */
  private startCleanupScheduler(): void {
    const cleanupInterval = this.configService.get<number>(
      'checkpoint.cleanupInterval',
      3600000
    ); // 1 hour

    if (cleanupInterval > 0) {
      this.cleanupInterval = setInterval(async () => {
        try {
          await this.performScheduledCleanup();
        } catch (error) {
          this.logger.error('Scheduled cleanup failed:', error);
        }
      }, cleanupInterval);

      this.logger.log(
        `Checkpoint cleanup scheduler started (interval: ${cleanupInterval}ms)`
      );
    }
  }

  /**
   * Perform scheduled cleanup
   */
  private async performScheduledCleanup(): Promise<void> {
    const maxAge = this.configService.get<number>(
      'checkpoint.maxAge',
      7 * 24 * 60 * 60 * 1000
    ); // 7 days
    const maxPerThread = this.configService.get<number>(
      'checkpoint.maxPerThread',
      100
    );

    const options: CheckpointCleanupOptions = {
      maxAge,
      maxPerThread,
    };

    let totalCleaned = 0;

    for (const [name] of this.checkpointSavers) {
      try {
        const cleaned = await this.cleanupCheckpoints(options, name);
        totalCleaned += cleaned;
      } catch (error) {
        this.logger.error(`Cleanup failed for saver ${name}:`, error);
      }
    }

    if (totalCleaned > 0) {
      this.logger.log(
        `Scheduled cleanup completed: ${totalCleaned} checkpoints removed`
      );
    }
  }
}
