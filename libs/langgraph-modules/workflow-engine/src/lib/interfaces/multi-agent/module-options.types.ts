import type { IStreamingService } from '@hive-academy/langgraph-core';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import type { CheckpointingConfig } from './network.types';
import type {
  ToolProvider,
  MultiAgentWorkflowProvider,
  AgentProvider,
} from './workflow.types';

/**
 * Multi-agent module configuration (2025 pattern)
 * ARCHITECTURE: Multi-agent module owns agent and tool registration
 */
export interface MultiAgentModuleOptions {
  /**
   * Agent providers to register
   * Agents are registered in multi-agent module and used for execution
   */
  agents?: AgentProvider[];

  /**
   * Tool providers to register
   * Tools belong to multi-agent module as they are used BY agents
   */
  tools?: ToolProvider[];

  /**
   * Workflow providers to register
   * Multi-agent workflows (supervisor, swarm, etc.) managed by this module
   */
  workflows?: MultiAgentWorkflowProvider[];

  /**
   * Default LLM configuration with simple provider selection
   */
  defaultLlm?: {
    // Simple provider selection - explicit, not model-name detection
    provider:
      | 'openai'
      | 'anthropic'
      | 'openrouter'
      | 'google'
      | 'local'
      | 'azure-openai'
      | 'cohere';
    model: string;
    temperature?: number;
    maxTokens?: number;

    // Universal API keys - users provide all they want to use
    openaiApiKey?: string;
    anthropicApiKey?: string;
    openrouterApiKey?: string;
    googleApiKey?: string;
    azureOpenaiApiKey?: string;
    cohereApiKey?: string;

    // Provider-specific configuration
    openai?: {
      organization?: string;
      project?: string;
    };

    anthropic?: {
      version?: string;
    };

    openrouter?: {
      baseUrl?: string;
      siteName?: string;
      siteUrl?: string;
      appName?: string;
    };

    google?: {
      location?: string;
      project?: string;
    };

    local?: {
      baseUrl?: string;
    };

    azureOpenai?: {
      endpoint?: string;
      deploymentName?: string;
      apiVersion?: string;
    };

    cohere?: {
      version?: string;
    };
  };

  /**
   * Message history limits
   */
  messageHistory?: {
    maxMessages?: number;
    pruneStrategy?: 'fifo' | 'lifo' | 'summarize';
  };

  /**
   * Streaming configuration
   */
  streaming?: {
    enabled: boolean;
    modes?: Array<'values' | 'updates' | 'messages'>;
  };

  /**
   * Debug configuration
   */
  debug?: {
    enabled: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };

  /**
   * Performance optimizations
   */
  performance?: {
    /**
     * Enable token optimization
     */
    tokenOptimization?: boolean;

    /**
     * Enable context window management
     */
    contextWindowManagement?: boolean;

    /**
     * Enable message forwarding for supervisors
     */
    enableMessageForwarding?: boolean;
  };

  /**
   * Checkpointing configuration
   */
  checkpointing?: CheckpointingConfig;

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
   * Optional streaming adapter for dependency injection
   * If provided, enables real-time streaming features
   */
  streamingAdapter?: IStreamingService;
}

/**
 * Async configuration options for MultiAgentModule
 */
export interface MultiAgentModuleAsyncOptions {
  useFactory?: (
    ...args: any[]
  ) => Promise<MultiAgentModuleOptions> | MultiAgentModuleOptions;
  inject?: any[];
}
