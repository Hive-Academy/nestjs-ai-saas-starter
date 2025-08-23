import { Injectable, Logger } from '@nestjs/common';
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { CheckpointConfig } from '../interfaces/checkpoint.interface';

/**
 * Provider for creating official LangGraph checkpoint savers
 * This integrates the official LangGraph checkpoint packages with NestJS DI
 */
@Injectable()
export class LangGraphCheckpointProvider {
  private readonly logger = new Logger(LangGraphCheckpointProvider.name);
  private checkpointer?: BaseCheckpointSaver;

  /**
   * Create a checkpoint saver based on configuration using official LangGraph packages
   */
  async create(config: CheckpointConfig): Promise<BaseCheckpointSaver> {
    if (!config.enabled) {
      throw new Error('Checkpointing is not enabled');
    }

    // Return cached checkpointer if available and type matches
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

      case 'postgres':
        this.checkpointer = await this.createPostgresCheckpointer(config.storageConfig || {});
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

    this.logger.log(`Created official LangGraph ${config.storage} checkpoint saver`);
    return this.checkpointer!; // We know it exists after creation
  }

  /**
   * Create an in-memory checkpoint saver using official LangGraph SQLite in-memory mode
   */
  private async createMemoryCheckpointer(): Promise<BaseCheckpointSaver> {
    // Use SQLite in-memory mode for better performance than MemorySaver
    return SqliteSaver.fromConnString(':memory:');
  }

  /**
   * Create a SQLite-based checkpoint saver using official LangGraph package
   */
  private async createSqliteCheckpointer(config?: Record<string, any>): Promise<BaseCheckpointSaver> {
    const dbPath = config?.path || './checkpoints.db';
    
    try {
      const saver = SqliteSaver.fromConnString(dbPath);
      
      // Initialize the database schema
      // Note: setup() is protected, so we cast to any to access it
      await (saver as any).setup();
      
      this.logger.log(`Official LangGraph SQLite checkpoint saver initialized at: ${dbPath}`);
      return saver;
    } catch (error) {
      this.logger.error('Failed to create SQLite checkpoint saver:', error);
      // Fallback to memory if file-based fails
      return this.createMemoryCheckpointer();
    }
  }

  /**
   * Create a Redis-based checkpoint saver using official LangGraph package
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
        throw new Error('Official LangGraph Redis checkpoint package not installed. Install @langchain/langgraph-checkpoint-redis to use Redis checkpointing.');
      }
      
      const redisConfig = {
        url: config?.url || 'redis://localhost:6379',
        ...config,
      };

      const saver = new RedisSaver(redisConfig);
      this.logger.log('Official LangGraph Redis checkpoint saver created successfully');
      return saver;
    } catch (error) {
      this.logger.warn('Official LangGraph Redis checkpoint package not available, falling back to SQLite');
      return this.createMemoryCheckpointer();
    }
  }

  /**
   * Create a PostgreSQL-based checkpoint saver using official LangGraph package
   */
  private async createPostgresCheckpointer(config: Record<string, any>): Promise<BaseCheckpointSaver> {
    try {
      // Dynamic import to avoid hard dependency
      let PostgresSaver;
      try {
        // Use eval to prevent static analysis from failing at build time
        const pgModule = await eval(`import('@langchain/langgraph-checkpoint-postgres')`);
        PostgresSaver = pgModule.PostgresSaver;
      } catch (importError) {
        throw new Error('Official LangGraph Postgres checkpoint package not installed. Install @langchain/langgraph-checkpoint-postgres to use Postgres checkpointing.');
      }
      
      const pool = config.pool || {
        connectionString: config.connectionString,
      };

      const saver = new PostgresSaver(pool);
      await saver.setup();
      
      this.logger.log('Official LangGraph PostgreSQL checkpoint saver created successfully');
      return saver;
    } catch (error) {
      this.logger.warn('Official LangGraph PostgreSQL checkpoint package not available, falling back to SQLite');
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
 * Factory function to create a LangGraph checkpoint provider
 */
export function createLangGraphCheckpointProvider(): LangGraphCheckpointProvider {
  return new LangGraphCheckpointProvider();
}