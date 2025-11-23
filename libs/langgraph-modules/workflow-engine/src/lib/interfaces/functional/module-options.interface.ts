import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import type { LlmModuleOptions } from '../llm-config.interface';

/**
 * Async module factory type (moved from langgraph-core)
 */
export type AsyncModuleFactory<T> = (...args: any[]) => Promise<T> | T;

/**
 * Configuration options for the WorkflowEngineModule
 */
export interface WorkflowEngineModuleOptions {
  compilation?: {
    cacheEnabled?: boolean;
    cacheTTL?: number;
    optimizeGraphs?: boolean;
  };
  execution?: {
    defaultTimeout?: number;
    streamingEnabled?: boolean;
    parallelExecution?: boolean;
    maxConcurrency?: number;
  };
  debugging?: {
    enabled?: boolean;
    logLevel?: string;
    traceExecution?: boolean;
  };

  /**
   * LangGraph native checkpoint saver (RedisSaver, SqliteSaver, PostgresSaver, etc.)
   * Replaces ICheckpointAdapter - uses LangGraph's BaseCheckpointSaver directly
   *
   * @example
   * // Production with Redis
   * checkpointer: await RedisSaver.fromUrl('redis://localhost:6379')
   *
   * // Development with SQLite
   * checkpointer: SqliteSaver.fromConnString('./data/checkpoints.db')
   *
   * // Testing with in-memory
   * checkpointer: new MemorySaver()
   */
  checkpointer?: BaseCheckpointSaver;

  /**
   * Tool classes to register with the workflow engine.
   * These tools will be automatically discovered and made available to agents.
   * @example
   * tools: [GithubToolsService, SearchToolsService]
   */
  tools?: any[];

  /**
   * LLM configuration for LlmProviderService
   * Required for agents that use LLM functionality
   */
  llm?: LlmModuleOptions;
}
