import { Injectable, Inject, Optional } from '@nestjs/common';
import { BaseMemory } from '@langchain/core/memory';
import { BufferMemory } from 'langchain/memory';
import { ConversationSummaryMemory } from 'langchain/memory';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseModuleAdapter } from './base/base.adapter';
import type {
  ICreatableAdapter,
  ExtendedAdapterStatus,
} from './interfaces/adapter.interface';

/**
 * Memory configuration interface for adapter
 */
export interface MemoryConfig {
  type: 'buffer' | 'summary' | 'buffer_window' | 'custom' | 'enterprise';
  llm?: BaseChatModel;
  maxTokens?: number;
  returnMessages?: boolean;
  inputKey?: string;
  outputKey?: string;
  memoryKey?: string;
  windowSize?: number;
  // Enterprise memory options
  chromadb?: {
    collection?: string;
    host?: string;
    port?: number;
  };
  neo4j?: {
    uri?: string;
    user?: string;
    password?: string;
  };
  userId?: string;
  threadId?: string;
}

/**
 * Adapter that bridges the main NestJS LangGraph library to the enterprise memory module
 *
 * This adapter follows the Adapter pattern to provide seamless integration between
 * the main library's simple memory interface and the enterprise memory system.
 *
 * Benefits:
 * - Maintains backward compatibility with existing memory APIs
 * - Delegates to enterprise memory module when available (845 lines of sophisticated logic)
 * - Provides fallback to basic LangChain memory when child module not installed
 * - Follows SOLID principles with single responsibility (bridge interface)
 */
@Injectable()
export class MemoryAdapter
  extends BaseModuleAdapter<MemoryConfig, BaseMemory | any>
  implements ICreatableAdapter<MemoryConfig, BaseMemory | any>
{
  protected readonly serviceName = 'memory';

  constructor(
    @Optional()
    @Inject('MEMORY_ADAPTER_FACADE_SERVICE')
    private readonly memoryFacade?: any
  ) {
    super();
  }

  /**
   * Create a memory instance - delegates to enterprise module if available
   * Falls back to basic LangChain memory if enterprise module not installed
   */
  create(config: MemoryConfig): BaseMemory | any {
    // Try enterprise memory module first for advanced capabilities
    if (
      this.memoryFacade &&
      (config.type === 'enterprise' || config.chromadb || config.neo4j)
    ) {
      this.logEnterpriseUsage('memory creation');
      try {
        return this.createEnterpriseMemory(config);
      } catch (error) {
        this.logger.warn(
          'Enterprise memory module failed, falling back to basic implementation:',
          error
        );
      }
    }

    // Fallback to basic LangChain memory
    this.logFallbackUsage('memory creation', 'enterprise module not available');
    return this.createBasicMemory(config);
  }

  /**
   * Create enterprise memory wrapper that provides LangChain-compatible interface
   */
  private createEnterpriseMemory(config: MemoryConfig): any {
    const enterpriseConfig = {
      userId: config.userId || 'default-user',
      threadId: config.threadId || 'default-thread',
      chromadb: config.chromadb,
      neo4j: config.neo4j,
      retention: {
        maxEntries: config.maxTokens || 1000,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    };

    // Create wrapper that bridges enterprise memory to LangChain interface
    return new EnterpriseMemoryWrapper(this.memoryFacade, enterpriseConfig, {
      returnMessages: config.returnMessages ?? true,
      inputKey: config.inputKey,
      outputKey: config.outputKey,
      memoryKey: config.memoryKey || 'history',
    });
  }

  /**
   * Create basic LangChain memory for fallback
   */
  private createBasicMemory(config: MemoryConfig): BaseMemory {
    switch (config.type) {
      case 'buffer':
        return new BufferMemory({
          returnMessages: config.returnMessages ?? true,
          inputKey: config.inputKey,
          outputKey: config.outputKey,
          memoryKey: config.memoryKey || 'history',
        });

      case 'summary':
        if (!config.llm) {
          throw new Error('Summary memory requires an LLM');
        }
        return new ConversationSummaryMemory({
          llm: config.llm,
          returnMessages: config.returnMessages ?? true,
          inputKey: config.inputKey,
          outputKey: config.outputKey,
          memoryKey: config.memoryKey || 'history',
        });

      case 'buffer_window':
        return new BufferMemory({
          returnMessages: config.returnMessages ?? true,
          inputKey: config.inputKey,
          outputKey: config.outputKey,
          memoryKey: config.memoryKey || 'history',
        });

      case 'custom':
        throw new Error('Custom memory type requires a custom implementation');

      default:
        return new BufferMemory({
          returnMessages: true,
          memoryKey: 'history',
        });
    }
  }

  /**
   * Check if enterprise memory module is available
   */
  isEnterpriseAvailable(): boolean {
    return !!this.memoryFacade;
  }

  /**
   * Get adapter status for diagnostics
   */
  getAdapterStatus(): ExtendedAdapterStatus {
    const enterpriseAvailable = this.isEnterpriseAvailable();
    const fallbackMode = !enterpriseAvailable;

    const capabilities = this.getBaseCapabilities();
    capabilities.push('buffer', 'summary', 'buffer_window');

    if (enterpriseAvailable) {
      capabilities.push(
        'enterprise',
        'semantic_search',
        'cross_thread_persistence',
        'conversation_summarization',
        'chromadb_storage',
        'neo4j_storage'
      );
    }

    return {
      enterpriseAvailable,
      fallbackMode,
      capabilities,
    };
  }
}

/**
 * Wrapper that bridges enterprise memory facade to LangChain BaseMemory interface
 * This allows enterprise memory to be used wherever LangChain memory is expected
 */
class EnterpriseMemoryWrapper extends BaseMemory {
  memoryKey = 'history';
  inputKey?: string;
  outputKey?: string;
  returnMessages = true;

  constructor(
    private memoryFacade: any,
    private config: any,
    private options: any
  ) {
    super();
    this.memoryKey = options.memoryKey || 'history';
    this.inputKey = options.inputKey;
    this.outputKey = options.outputKey;
    this.returnMessages = options.returnMessages ?? true;
  }

  get memoryKeys(): string[] {
    return [this.memoryKey];
  }

  async loadMemoryVariables(
    values: Record<string, any>
  ): Promise<Record<string, any>> {
    try {
      // Use enterprise memory to retrieve conversation history
      const memories = await this.memoryFacade.retrieveContext(
        this.config.userId,
        this.config.threadId,
        { limit: 50, includeMetadata: true }
      );

      if (this.returnMessages) {
        return {
          [this.memoryKey]: memories.map((memory: any) => ({
            content: memory.content,
            additional_kwargs: memory.metadata || {},
          })),
        };
      }

      return {
        [this.memoryKey]: memories
          .map((memory: any) => memory.content)
          .join('\n'),
      };
    } catch (error) {
      // Fallback to empty history if enterprise memory fails
      return { [this.memoryKey]: this.returnMessages ? [] : '' };
    }
  }

  async saveContext(
    inputValues: Record<string, any>,
    outputValues: Record<string, any>
  ): Promise<void> {
    try {
      const input = inputValues[this.inputKey || 'input'] || '';
      const output = outputValues[this.outputKey || 'output'] || '';

      if (input) {
        await this.memoryFacade.storeEntry(
          {
            content: input,
            metadata: {
              type: 'human',
              threadId: this.config.threadId,
              timestamp: new Date().toISOString(),
            },
          },
          this.config.userId,
          this.config.threadId
        );
      }

      if (output) {
        await this.memoryFacade.storeEntry(
          {
            content: output,
            metadata: {
              type: 'ai',
              threadId: this.config.threadId,
              timestamp: new Date().toISOString(),
            },
          },
          this.config.userId,
          this.config.threadId
        );
      }
    } catch (error) {
      // Log error but don't fail the operation
      console.warn('Failed to save context to enterprise memory:', error);
    }
  }

  clear(): Promise<void> {
    // Enterprise memory doesn't support full clear for safety
    // Could implement thread-specific clear if needed
    return Promise.resolve();
  }
}
