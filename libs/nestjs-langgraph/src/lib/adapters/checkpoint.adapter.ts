import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import type { CheckpointConfig } from '../interfaces/module-options.interface';

/**
 * Adapter that bridges the main NestJS LangGraph library to the enterprise checkpoint module
 * 
 * This adapter follows the Adapter pattern to provide seamless integration between
 * the main library and the specialized checkpoint module without breaking existing APIs.
 * 
 * Benefits:
 * - Maintains backward compatibility with existing checkpoint APIs
 * - Delegates to enterprise-grade checkpoint module when available
 * - Provides fallback to basic functionality when child module not installed
 * - Follows SOLID principles with single responsibility (bridge interface)
 */
@Injectable()
export class CheckpointAdapter {
  private readonly logger = new Logger(CheckpointAdapter.name);

  constructor(
    @Optional() @Inject('CheckpointManagerService')
    private readonly checkpointManager?: any,
    @Optional() @Inject('LangGraphCheckpointProvider') 
    private readonly langGraphProvider?: any
  ) {}

  /**
   * Create a checkpoint saver - delegates to enterprise module if available
   * Falls back to basic SQLite implementation if enterprise module not installed
   */
  async create(config: CheckpointConfig): Promise<BaseCheckpointSaver> {
    if (!config.enabled) {
      throw new Error('Checkpointing is not enabled');
    }

    // Try enterprise checkpoint module first
    if (this.checkpointManager) {
      this.logger.log('Using enterprise checkpoint module via adapter');
      try {
        // Convert config format and delegate to enterprise module
        const enterpriseConfig = this.convertToEnterpriseConfig(config);
        return await this.checkpointManager.createLangGraphSaver(enterpriseConfig);
      } catch (error) {
        this.logger.warn('Enterprise checkpoint module failed, falling back to basic implementation:', error);
      }
    }

    // Try LangGraph provider from checkpoint module
    if (this.langGraphProvider) {
      this.logger.log('Using LangGraph checkpoint provider via adapter');
      try {
        return await this.langGraphProvider.create(config);
      } catch (error) {
        this.logger.warn('LangGraph checkpoint provider failed, falling back to basic implementation:', error);
      }
    }

    // Fallback to basic SQLite implementation
    this.logger.log('Using fallback SQLite checkpoint implementation');
    return this.createFallbackCheckpointer(config);
  }

  /**
   * Convert main library config format to enterprise module format
   */
  private convertToEnterpriseConfig(config: CheckpointConfig): any {
    const storageTypeMap: Record<string, string> = {
      'memory': 'memory',
      'database': 'sqlite', 
      'redis': 'redis',
      'custom': 'custom'
    };

    return {
      type: storageTypeMap[config.storage] || 'memory',
      name: 'main-library-adapter',
      default: true,
      [config.storage]: config.storageConfig || {},
      saver: config.saver
    };
  }

  /**
   * Fallback checkpoint implementation when enterprise module unavailable
   */
  private async createFallbackCheckpointer(config: CheckpointConfig): Promise<BaseCheckpointSaver> {
    // Dynamic import to avoid hard dependency
    let SqliteSaver;
    try {
      const sqliteModule = await import('@langchain/langgraph-checkpoint-sqlite');
      SqliteSaver = sqliteModule.SqliteSaver;
    } catch (error) {
      throw new Error('No checkpoint implementation available. Install @langchain/langgraph-checkpoint-sqlite or @libs/langgraph-modules/checkpoint');
    }

    switch (config.storage) {
      case 'memory':
        return SqliteSaver.fromConnString(':memory:');
      
      case 'database':
        const dbPath = config.storageConfig?.path || './checkpoints.db';
        const saver = SqliteSaver.fromConnString(dbPath);
        await (saver as any).setup?.();
        return saver;
      
      case 'custom':
        if (config.saver) {
          return config.saver as any;
        }
        throw new Error('Custom storage type requires a saver implementation');
      
      default:
        return SqliteSaver.fromConnString(':memory:');
    }
  }

  /**
   * Check if enterprise checkpoint module is available
   */
  isEnterpriseAvailable(): boolean {
    return !!this.checkpointManager;
  }

  /**
   * Check if LangGraph provider is available
   */
  isLangGraphProviderAvailable(): boolean {
    return !!this.langGraphProvider;
  }

  /**
   * Get adapter status for diagnostics
   */
  getAdapterStatus(): {
    enterpriseAvailable: boolean;
    langGraphProviderAvailable: boolean;
    fallbackMode: boolean;
  } {
    const enterpriseAvailable = this.isEnterpriseAvailable();
    const langGraphProviderAvailable = this.isLangGraphProviderAvailable();
    
    return {
      enterpriseAvailable,
      langGraphProviderAvailable,
      fallbackMode: !enterpriseAvailable && !langGraphProviderAvailable
    };
  }
}

/**
 * Factory function for backward compatibility
 */
export function createCheckpointProvider(): CheckpointAdapter {
  return new CheckpointAdapter();
}