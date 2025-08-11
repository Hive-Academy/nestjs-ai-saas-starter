import { Injectable, Logger } from '@nestjs/common';
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { CheckpointConfig } from '../interfaces/module-options.interface';

/**
 * Factory for creating checkpoint savers based on configuration
 */
@Injectable()
export class CheckpointProvider {
  private readonly logger = new Logger(CheckpointProvider.name);
  private checkpointer?: BaseCheckpointSaver;

  /**
   * Create a checkpoint saver based on configuration
   */
  async create(config: CheckpointConfig): Promise<BaseCheckpointSaver> {
    if (!config.enabled) {
      throw new Error('Checkpointing is not enabled');
    }

    // Return cached checkpointer if available
    if (this.checkpointer) {
      return this.checkpointer;
    }

    switch (config.storage) {
      case 'memory':
        this.checkpointer = await this.createMemoryCheckpointer();
        break;

      case 'database':
        this.checkpointer = await this.createSqliteCheckpointer(config.storageConfig);
        break;

      case 'redis':
        this.checkpointer = await this.createRedisCheckpointer(config.storageConfig);
        break;

      case 'custom':
        if (config.saver) {
          this.checkpointer = config.saver as any; // Type compatibility
        } else {
          throw new Error('Custom storage type requires a saver implementation');
        }
        break;

      default:
        // Default to in-memory SQLite
        this.checkpointer = await this.createMemoryCheckpointer();
    }

    this.logger.log(`Created ${config.storage} checkpoint saver`);
    return this.checkpointer!; // We know it exists after creation
  }

  /**
   * Create an in-memory checkpoint saver
   */
  private async createMemoryCheckpointer(): Promise<BaseCheckpointSaver> {
    // Use SQLite in-memory mode for better performance than MemorySaver
    return SqliteSaver.fromConnString(':memory:');
  }

  /**
   * Create a SQLite-based checkpoint saver
   */
  private async createSqliteCheckpointer(config?: Record<string, any>): Promise<BaseCheckpointSaver> {
    const dbPath = config?.['path'] || './checkpoints.db';
    
    try {
      const saver = SqliteSaver.fromConnString(dbPath);
      
      // Initialize the database schema
      // Note: setup() is protected, so we cast to any to access it
      await (saver as any).setup();
      
      this.logger.log(`SQLite checkpoint saver initialized at: ${dbPath}`);
      return saver;
    } catch (error) {
      this.logger.error('Failed to create SQLite checkpoint saver:', error);
      // Fallback to memory if file-based fails
      return this.createMemoryCheckpointer();
    }
  }

  /**
   * Create a Redis-based checkpoint saver
   */
  private async createRedisCheckpointer(config?: Record<string, any>): Promise<BaseCheckpointSaver> {
    // Check if Redis checkpoint package is available
    try {
      // Dynamic import to avoid hard dependency
      let RedisSaver;
      try {
        // Use eval to prevent static analysis from failing at build time
        const redisModule = await eval(`import('@langchain/langgraph-checkpoint-redis')`);
        RedisSaver = redisModule.RedisSaver;
      } catch (importError) {
        throw new Error('Redis checkpoint package not installed. Install @langchain/langgraph-checkpoint-redis to use Redis checkpointing.');
      }
      
      const redisConfig = {
        url: config?.['url'] || 'redis://localhost:6379',
        ...config,
      };

      return new RedisSaver(redisConfig);
    } catch (error) {
      this.logger.warn('Redis checkpoint package not available, falling back to SQLite');
      return this.createMemoryCheckpointer();
    }
  }

  /**
   * Create a PostgreSQL-based checkpoint saver
   */
  async createPostgresCheckpointer(config: Record<string, any>): Promise<BaseCheckpointSaver> {
    try {
      // Dynamic import to avoid hard dependency
      let PostgresSaver;
      try {
        // Use eval to prevent static analysis from failing at build time
        const pgModule = await eval(`import('@langchain/langgraph-checkpoint-postgres')`);
        PostgresSaver = pgModule.PostgresSaver;
      } catch (importError) {
        throw new Error('Postgres checkpoint package not installed. Install @langchain/langgraph-checkpoint-postgres to use Postgres checkpointing.');
      }
      
      const pool = config['pool'] || {
        connectionString: config['connectionString'],
      };

      const saver = new PostgresSaver(pool);
      await saver.setup();
      
      return saver;
    } catch (error) {
      this.logger.warn('PostgreSQL checkpoint package not available, falling back to SQLite');
      return this.createMemoryCheckpointer();
    }
  }

  /**
   * Get the current checkpointer instance
   */
  getCheckpointer(): BaseCheckpointSaver | undefined {
    return this.checkpointer;
  }

  /**
   * Clear the cached checkpointer
   */
  clearCheckpointer(): void {
    this.checkpointer = undefined;
  }
}

/**
 * Factory function to create a checkpoint provider
 */
export function createCheckpointProvider(): CheckpointProvider {
  return new CheckpointProvider();
}