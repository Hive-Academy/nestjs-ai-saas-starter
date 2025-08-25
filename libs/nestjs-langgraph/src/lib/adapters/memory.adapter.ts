import { Injectable, Inject, Optional } from '@nestjs/common';
import { BaseMemory } from '@langchain/core/memory';
import { BufferMemory } from 'langchain/memory';
import { ConversationSummaryMemory } from 'langchain/memory';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseModuleAdapter } from './base/base.adapter';
import { MemoryFacadeService } from '../memory/services/memory-facade.service';
import { DatabaseProviderFactory } from '../memory/providers/database-provider.factory';
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
 * Enhanced Memory Adapter with direct service integration
 *
 * This adapter provides seamless integration with the memory system using:
 * - Direct injection of MemoryFacadeService for enterprise memory operations
 * - DatabaseProviderFactory for automatic database service detection
 * - Backward compatibility with existing memory APIs
 * - Graceful fallback to basic LangChain memory when services unavailable
 */
@Injectable()
export class MemoryAdapter
  extends BaseModuleAdapter<MemoryConfig, BaseMemory | any>
  implements ICreatableAdapter<MemoryConfig, BaseMemory | any>
{
  protected readonly serviceName = 'memory';

  constructor(
    @Optional()
    private readonly memoryFacade?: MemoryFacadeService,
    @Optional()
    private readonly providerFactory?: DatabaseProviderFactory
  ) {
    super();
  }

  /**
   * Create a memory instance - uses direct services for enterprise capabilities
   * Falls back to basic LangChain memory if services unavailable
   */
  create(config: MemoryConfig): BaseMemory | any {
    // Try enterprise memory with direct service access
    if (
      this.memoryFacade &&
      this.providerFactory &&
      (config.type === 'enterprise' || config.chromadb || config.neo4j)
    ) {
      this.logEnterpriseUsage('memory creation');
      try {
        return this.createEnterpriseMemory(config);
      } catch (error) {
        this.logger.warn(
          'Enterprise memory creation failed, falling back to basic implementation:',
          error
        );
      }
    }

    // Fallback to basic LangChain memory
    this.logFallbackUsage('memory creation', 'enterprise services not available');
    return this.createBasicMemory(config);
  }

  /**
   * Create enterprise memory wrapper using direct services
   */
  private createEnterpriseMemory(config: MemoryConfig): any {
    if (!this.memoryFacade || !this.providerFactory) {
      throw new Error('Enterprise memory services not available');
    }

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

    // Create wrapper with direct service access
    return new EnterpriseMemoryWrapper(
      this.memoryFacade, 
      this.providerFactory,
      enterpriseConfig, 
      {
        returnMessages: config.returnMessages ?? true,
        inputKey: config.inputKey,
        outputKey: config.outputKey,
        memoryKey: config.memoryKey || 'history',
      }
    );
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
   * Check if enterprise memory services are available
   */
  isEnterpriseAvailable(): boolean {
    return !!(this.memoryFacade && this.providerFactory);
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
 * Enhanced wrapper that bridges enterprise memory services to LangChain BaseMemory interface
 * Uses direct service access for improved performance and reliability
 */
class EnterpriseMemoryWrapper extends BaseMemory {
  memoryKey = 'history';
  inputKey?: string;
  outputKey?: string;
  returnMessages = true;

  constructor(
    private memoryFacade: MemoryFacadeService,
    private providerFactory: DatabaseProviderFactory,
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
      // Use direct service access for memory retrieval
      const memories = await this.memoryFacade.retrieve(
        this.config.threadId,
        50
      );

      if (this.returnMessages) {
        return {
          [this.memoryKey]: memories.map((memory) => ({
            content: memory.content,
            additional_kwargs: memory.metadata || {},
          })),
        };
      }

      return {
        [this.memoryKey]: memories
          .map((memory) => memory.content)
          .join('\n'),
      };
    } catch (error) {
      // Fallback to empty history if memory service fails
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
        await this.memoryFacade.store(
          this.config.threadId,
          input,
          {
            type: 'conversation',
            source: 'human',
            importance: 0.5,
          },
          this.config.userId
        );
      }

      if (output) {
        await this.memoryFacade.store(
          this.config.threadId,
          output,
          {
            type: 'conversation',
            source: 'ai',
            importance: 0.5,
          },
          this.config.userId
        );
      }
    } catch (error) {
      // Log error but don't fail the operation
      console.warn('Failed to save context to enterprise memory:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      // Use direct service access for clearing thread-specific memories
      await this.memoryFacade.clear(this.config.threadId);
    } catch (error) {
      // Log error but resolve successfully
      console.warn('Failed to clear enterprise memory:', error);
    }
  }
}
