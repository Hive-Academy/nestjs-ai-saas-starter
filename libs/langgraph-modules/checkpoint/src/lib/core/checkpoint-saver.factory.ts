import { Injectable } from '@nestjs/common';
import {
  CheckpointConfig,
  EnhancedBaseCheckpointSaver,
  MemoryCheckpointConfig,
  RedisCheckpointConfig,
  PostgresCheckpointConfig,
  SqliteCheckpointConfig,
} from '../interfaces/checkpoint.interface';
import {
  ICheckpointSaverFactory,
  BaseCheckpointService,
} from '../interfaces/checkpoint-services.interface';

/**
 * Factory service for creating different types of checkpoint savers
 * Implements the Factory pattern for checkpoint saver creation
 */
@Injectable()
export class CheckpointSaverFactory
  extends BaseCheckpointService
  implements ICheckpointSaverFactory
{
  constructor() {
    super(CheckpointSaverFactory.name);
  }

  /**
   * Create checkpoint saver based on configuration
   * Uses dynamic imports to avoid loading unnecessary dependencies
   */
  async createCheckpointSaver(
    config: CheckpointConfig
  ): Promise<EnhancedBaseCheckpointSaver> {
    this.logger.debug(`Creating checkpoint saver of type: ${config.type}`);

    try {
      switch (config.type) {
        case 'memory':
          return this.createMemoryCheckpointSaver(config.memory);

        case 'redis':
          if (!config.redis) {
            throw this.createError(
              'Redis configuration is required for redis checkpoint type',
              'MISSING_REDIS_CONFIG'
            );
          }
          return this.createRedisCheckpointSaver(config.redis);

        case 'postgres':
          if (!config.postgres) {
            throw this.createError(
              'PostgreSQL configuration is required for postgres checkpoint type',
              'MISSING_POSTGRES_CONFIG'
            );
          }
          return this.createPostgresCheckpointSaver(config.postgres);

        case 'sqlite':
          if (!config.sqlite) {
            throw this.createError(
              'SQLite configuration is required for sqlite checkpoint type',
              'MISSING_SQLITE_CONFIG'
            );
          }
          return this.createSqliteCheckpointSaver(config.sqlite);

        default:
          throw this.createError(
            `Unsupported checkpoint type: ${(config as any).type}`,
            'UNSUPPORTED_CHECKPOINT_TYPE'
          );
      }
    } catch (error) {
      this.logger.error(
        `Failed to create checkpoint saver of type ${config.type}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Create memory checkpoint saver
   */
  private async createMemoryCheckpointSaver(
    config?: MemoryCheckpointConfig
  ): Promise<EnhancedBaseCheckpointSaver> {
    try {
      // Use official LangGraph SQLite in-memory saver for memory checkpointing
      const { SqliteSaver } = await import('@langchain/langgraph-checkpoint-sqlite');

      const saver = SqliteSaver.fromConnString(':memory:') as EnhancedBaseCheckpointSaver;
      this.logger.debug('Memory checkpoint saver created successfully');
      return saver;
    } catch (error) {
      throw this.createError(
        'Failed to create memory checkpoint saver',
        'MEMORY_SAVER_CREATION_FAILED',
        error as Error
      );
    }
  }

  /**
   * Create Redis checkpoint saver
   */
  private async createRedisCheckpointSaver(
    config: RedisCheckpointConfig
  ): Promise<EnhancedBaseCheckpointSaver> {
    try {
      // Try to use official LangGraph Redis saver
      let RedisSaver;
      try {
        // @ts-expect-error - Dynamic import of optional dependency
        const redisModule = await import('@langchain/langgraph-checkpoint-redis');
        RedisSaver = redisModule.RedisSaver;
      } catch (importError) {
        this.logger.warn('Official LangGraph Redis package not available, falling back to SQLite');
        return this.createMemoryCheckpointSaver();
      }

      const redisConfig = {
        url: config.url || `redis://${config.host || 'localhost'}:${config.port || 6379}`,
        ...config,
      };

      const saver = new RedisSaver(redisConfig) as EnhancedBaseCheckpointSaver;
      this.logger.debug('Redis checkpoint saver created successfully');
      return saver;
    } catch (error) {
      this.logger.warn('Failed to create Redis checkpoint saver, falling back to SQLite');
      return this.createMemoryCheckpointSaver();
    }
  }

  /**
   * Create PostgreSQL checkpoint saver
   */
  private async createPostgresCheckpointSaver(
    config: PostgresCheckpointConfig
  ): Promise<EnhancedBaseCheckpointSaver> {
    try {
      // Try to use official LangGraph Postgres saver
      let PostgresSaver;
      try {
        // @ts-expect-error - Dynamic import of optional dependency
        const pgModule = await import('@langchain/langgraph-checkpoint-postgres');
        PostgresSaver = pgModule.PostgresSaver;
      } catch (importError) {
        this.logger.warn('Official LangGraph Postgres package not available, falling back to SQLite');
        return this.createMemoryCheckpointSaver();
      }

      const pgConfig = {
        connectionString: config.connectionString,
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        ...config,
      };

      const saver = new PostgresSaver(pgConfig) as EnhancedBaseCheckpointSaver;
      this.logger.debug('PostgreSQL checkpoint saver created successfully');
      return saver;
    } catch (error) {
      this.logger.warn('Failed to create PostgreSQL checkpoint saver, falling back to SQLite');
      return this.createMemoryCheckpointSaver();
    }
  }

  /**
   * Create SQLite checkpoint saver
   */
  private async createSqliteCheckpointSaver(
    config: SqliteCheckpointConfig
  ): Promise<EnhancedBaseCheckpointSaver> {
    try {
      // Use official LangGraph SQLite saver
      const { SqliteSaver } = await import('@langchain/langgraph-checkpoint-sqlite');

      const dbPath = config.databasePath || './checkpoints.db';
      const saver = SqliteSaver.fromConnString(dbPath) as EnhancedBaseCheckpointSaver;

      this.logger.debug('SQLite checkpoint saver created successfully');
      return saver;
    } catch (error) {
      throw this.createError(
        'Failed to create SQLite checkpoint saver',
        'SQLITE_SAVER_CREATION_FAILED',
        error as Error,
        { config: this.sanitizeConfig(config) }
      );
    }
  }

  /**
   * Sanitize configuration for logging (remove sensitive information)
   */
  private sanitizeConfig(config: any): any {
    const sanitized = { ...config };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'connectionString', 'apiKey', 'secret'];
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    }

    return sanitized;
  }

  /**
   * Validate checkpoint saver configuration
   */
  validateConfig(config: CheckpointConfig): void {
    if (!config.type) {
      throw this.createError(
        'Checkpoint saver type is required',
        'MISSING_SAVER_TYPE'
      );
    }

    const supportedTypes = ['memory', 'redis', 'postgres', 'sqlite'];
    if (!supportedTypes.includes(config.type)) {
      throw this.createError(
        `Unsupported checkpoint saver type: ${config.type}. Supported types: ${supportedTypes.join(', ')}`,
        'INVALID_SAVER_TYPE'
      );
    }

    // Type-specific validation
    switch (config.type) {
      case 'redis':
        this.validateRedisConfig(config.redis);
        break;
      case 'postgres':
        this.validatePostgresConfig(config.postgres);
        break;
      case 'sqlite':
        this.validateSqliteConfig(config.sqlite);
        break;
      case 'memory':
        this.validateMemoryConfig(config.memory);
        break;
    }
  }

  /**
   * Validate Redis configuration
   */
  private validateRedisConfig(config?: RedisCheckpointConfig): void {
    if (!config) {
      throw this.createError(
        'Redis configuration is required',
        'MISSING_REDIS_CONFIG'
      );
    }

    if (!config.url && !config.host) {
      throw this.createError(
        'Redis URL or host is required',
        'MISSING_REDIS_CONNECTION'
      );
    }

    if (config.port && (config.port < 1 || config.port > 65535)) {
      throw this.createError(
        'Redis port must be between 1 and 65535',
        'INVALID_REDIS_PORT'
      );
    }
  }

  /**
   * Validate PostgreSQL configuration
   */
  private validatePostgresConfig(config?: PostgresCheckpointConfig): void {
    if (!config) {
      throw this.createError(
        'PostgreSQL configuration is required',
        'MISSING_POSTGRES_CONFIG'
      );
    }

    if (!config.connectionString && !config.host) {
      throw this.createError(
        'PostgreSQL connection string or host is required',
        'MISSING_POSTGRES_CONNECTION'
      );
    }

    if (config.port && (config.port < 1 || config.port > 65535)) {
      throw this.createError(
        'PostgreSQL port must be between 1 and 65535',
        'INVALID_POSTGRES_PORT'
      );
    }
  }

  /**
   * Validate SQLite configuration
   */
  private validateSqliteConfig(config?: SqliteCheckpointConfig): void {
    if (!config) {
      return; // SQLite config is optional, will use defaults
    }

    if (config.databasePath && typeof config.databasePath !== 'string') {
      throw this.createError(
        'SQLite database path must be a string',
        'INVALID_SQLITE_PATH'
      );
    }

    if (config.busyTimeout && config.busyTimeout < 0) {
      throw this.createError(
        'SQLite busy timeout must be non-negative',
        'INVALID_SQLITE_TIMEOUT'
      );
    }
  }

  /**
   * Validate memory configuration
   */
  private validateMemoryConfig(config?: MemoryCheckpointConfig): void {
    if (!config) {
      return; // Memory config is optional, will use defaults
    }

    if (config.maxCheckpoints && config.maxCheckpoints < 1) {
      throw this.createError(
        'Memory max checkpoints must be positive',
        'INVALID_MEMORY_MAX_CHECKPOINTS'
      );
    }

    if (config.ttl && config.ttl < 0) {
      throw this.createError(
        'Memory TTL must be non-negative',
        'INVALID_MEMORY_TTL'
      );
    }

    if (config.cleanupInterval && config.cleanupInterval < 1000) {
      throw this.createError(
        'Memory cleanup interval must be at least 1000ms',
        'INVALID_MEMORY_CLEANUP_INTERVAL'
      );
    }
  }
}
