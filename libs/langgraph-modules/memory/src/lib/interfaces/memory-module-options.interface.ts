import type { ModuleMetadata, Type } from '@nestjs/common';
import type { MemoryConfig } from './memory.interface';
import type { IVectorService } from './vector-service.interface';
import type { IGraphService } from './graph-service.interface';

/**
 * Enhanced memory module options with adapter injection and agentic superpowers
 * Maintains 100% backward compatibility with existing MemoryConfig
 * Adds comprehensive agent memory integration capabilities
 */
export interface MemoryModuleOptions extends MemoryConfig {
  /**
   * Optional adapter injection configuration
   * When not provided, default ChromaDB and Neo4j adapters are used
   */
  readonly adapters?: {
    /** Custom vector database adapter */
    readonly vector?: Type<IVectorService> | IVectorService;
    /** Custom graph database adapter */
    readonly graph?: Type<IGraphService> | IGraphService;
  };

  /**
   * Agentic superpowers configuration
   * Enables automatic memory context for agents
   */
  readonly agentic?: {
    /** Enable agent memory integration */
    readonly enabled?: boolean;
    /** RAG mode: 'basic' | 'enhanced' | 'advanced' */
    readonly ragMode?: 'basic' | 'enhanced' | 'advanced';
    /** Number of memories per agent call */
    readonly contextWindow?: number;
    /** Auto-learn from chat interactions */
    readonly learnFromConversations?: boolean;
    /** Adapt to user preferences */
    readonly personalizeResponses?: boolean;
    /** Remember across conversations */
    readonly crossThreadMemory?: boolean;
  };

  /**
   * RAG (Retrieval-Augmented Generation) configuration
   * Controls semantic search and graph traversal behavior
   */
  readonly rag?: {
    /** Semantic search configuration */
    readonly semanticSearch?: {
      readonly enabled?: boolean;
      readonly similarity?: number; // Relevance threshold (0-1)
      readonly maxResults?: number;
    };
    /** Graph traversal configuration */
    readonly graphTraversal?: {
      readonly enabled?: boolean;
      readonly depth?: number; // Relationship exploration depth
      readonly strength?: number; // Minimum relationship strength
    };
    /** Hybrid search configuration */
    readonly hybridSearch?: {
      readonly vectorWeight?: number; // Balance semantic vs graph search
      readonly graphWeight?: number;
    };
  };

  /**
   * Agent memory patterns configuration
   * Controls what agent behaviors are remembered
   */
  readonly agentMemory?: {
    /** Remember agent decision patterns */
    readonly storeExecutions?: boolean;
    /** Learn from errors */
    readonly storeFailures?: boolean;
    /** Adapt based on user feedback */
    readonly contextualLearning?: boolean;
    /** Types of memories to store */
    readonly memoryTypes?: readonly string[];
  };

  /**
   * LangGraph Store compliance configuration
   * Enables cross-thread memory sharing
   */
  readonly store?: {
    /** Enable LangGraph Store interface */
    readonly enabled?: boolean;
    /** Namespace strategy: 'user' | 'thread' | 'agent' | 'hybrid' */
    readonly namespaceStrategy?: 'user' | 'thread' | 'agent' | 'hybrid';
    /** Share memories across threads */
    readonly crossThreadSharing?: boolean;
  };
}

// Async module options following NestJS patterns
export interface MemoryModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<MemoryOptionsFactory>;
  useClass?: Type<MemoryOptionsFactory>;
  useFactory?: (
    ...args: unknown[]
  ) => Promise<MemoryModuleOptions> | MemoryModuleOptions;
  inject?: unknown[];

  /**
   * Optional adapter injection for async configuration
   */
  readonly adapters?: {
    readonly vector?: Type<IVectorService> | IVectorService;
    readonly graph?: Type<IGraphService> | IGraphService;
  };
}

// Factory interface for creating options
export interface MemoryOptionsFactory {
  createMemoryOptions(): Promise<MemoryModuleOptions> | MemoryModuleOptions;
}

/**
 * Default agentic configuration
 * Used as fallback when specific options are not provided
 */
export const DEFAULT_AGENTIC_CONFIG = {
  enabled: true,
  ragMode: 'enhanced' as const,
  contextWindow: 10,
  learnFromConversations: true,
  personalizeResponses: true,
  crossThreadMemory: true,
};

/**
 * Default RAG configuration
 * Optimized for balanced performance and accuracy
 */
export const DEFAULT_RAG_CONFIG = {
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
};

/**
 * Default agent memory configuration
 * Enables comprehensive learning patterns
 */
export const DEFAULT_AGENT_MEMORY_CONFIG = {
  storeExecutions: true,
  storeFailures: true,
  contextualLearning: true,
  memoryTypes: ['conversation', 'preference', 'fact', 'pattern'],
};

/**
 * Default LangGraph Store configuration
 * Enables cross-thread memory sharing
 */
export const DEFAULT_STORE_CONFIG = {
  enabled: true,
  namespaceStrategy: 'user' as const,
  crossThreadSharing: true,
};
