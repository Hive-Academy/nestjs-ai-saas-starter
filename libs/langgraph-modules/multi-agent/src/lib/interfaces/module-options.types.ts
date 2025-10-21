import type {
  ICheckpointAdapter,
  IStreamingService,
  IMemoryAdapter,
} from '@hive-academy/langgraph-core';
import type { CheckpointingConfig } from './network.types';
import type {
  ToolProvider,
  WorkflowProvider,
  AgentProvider,
} from './workflow.types';

/**
 * Multi-agent module configuration (2025 pattern - PURE CONFIGURATION ONLY)
 * NOTE: Registration is now handled by WorkflowEngineModule centrally
 */
export interface MultiAgentModuleOptions {
  /**
   * CENTRALIZED REGISTRATION: Agent providers registered by WorkflowEngineModule
   * This array is populated by the workflow engine's agent registration system
   */
  agents?: AgentProvider[];

  /**
   * CENTRALIZED REGISTRATION: Tool providers registered by WorkflowEngineModule
   * This array is populated by the workflow engine's tool registration system
   */
  tools?: ToolProvider[];

  /**
   * CENTRALIZED REGISTRATION: Workflow providers registered by WorkflowEngineModule
   * This array is populated by the workflow engine's workflow registration system
   */
  workflows?: WorkflowProvider[];

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
   * Optional checkpoint adapter for dependency injection
   * If provided, enables checkpointing features
   */
  checkpointAdapter?: ICheckpointAdapter;

  /**
   * Optional streaming adapter for dependency injection
   * If provided, enables real-time streaming features
   */
  streamingAdapter?: IStreamingService;

  /**
   * Optional memory adapter for dependency injection
   * If provided, enables memory superpowers for agents
   */
  memoryAdapter?: IMemoryAdapter;
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
