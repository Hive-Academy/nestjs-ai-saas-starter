import type { MemoryModuleOptions } from '../interfaces/memory-module-options.interface';
import { DEFAULT_MEMORY_CONFIG } from '../constants/memory.constants';

/**
 * Memory Configuration Factory
 *
 * Responsibility: Merge user options with enhanced defaults
 * Extracted from MemoryModule to follow Single Responsibility Principle
 */
export class MemoryConfigFactory {
  /**
   * Merge user options with enhanced defaults including agentic configuration
   */
  static mergeWithDefaults(options: MemoryModuleOptions): MemoryModuleOptions {
    return {
      collection: 'agentic_memory',
      enableAutoSummarization: true,

      // Agentic superpowers config
      agentic: {
        enabled: true,
        ragMode: 'enhanced',
        contextWindow: 10,
        learnFromConversations: true,
        personalizeResponses: true,
        crossThreadMemory: true,
      },

      // RAG configuration
      rag: {
        semanticSearch: {
          enabled: true,
          similarity: 0.7,
          maxResults: 5,
        },
        graphTraversal: {
          enabled: true,
          depth: 2,
          strength: 0.5,
        },
        hybridSearch: {
          vectorWeight: 0.7,
          graphWeight: 0.3,
        },
      },

      // Agent memory patterns
      agentMemory: {
        storeExecutions: true,
        storeFailures: true,
        contextualLearning: true,
        memoryTypes: ['conversation', 'preference', 'fact', 'pattern'],
      },

      // LangGraph Store compliance
      store: {
        enabled: true,
        namespaceStrategy: 'user',
        crossThreadSharing: true,
      },

      ...options,
    };
  }

  /**
   * Create async options provider with merged defaults
   */
  static createAsyncConfigProvider(config: MemoryModuleOptions) {
    return { ...DEFAULT_MEMORY_CONFIG, ...config };
  }
}
