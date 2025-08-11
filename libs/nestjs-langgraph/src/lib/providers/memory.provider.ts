import { Injectable } from '@nestjs/common';
import { BaseMemory } from '@langchain/core/memory';
import { BufferMemory } from 'langchain/memory';
import { ConversationSummaryMemory } from 'langchain/memory';
import { ChatOpenAI } from '@langchain/openai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export interface MemoryConfig {
  type: 'buffer' | 'summary' | 'buffer_window' | 'custom';
  llm?: BaseChatModel;
  maxTokens?: number;
  returnMessages?: boolean;
  inputKey?: string;
  outputKey?: string;
  memoryKey?: string;
  windowSize?: number;
}

/**
 * Provider for creating memory instances
 */
@Injectable()
export class MemoryProvider {
  /**
   * Create a memory instance based on configuration
   */
  create(config: MemoryConfig): BaseMemory {
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
          // Note: BufferWindowMemory would need custom implementation
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
}