import type { ModuleMetadata, Type } from '@nestjs/common';

export interface LangGraphModuleOptions {
  // LLM Configuration
  llm?: {
    provider?: 'openai' | 'anthropic' | 'custom';
    apiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };

  // Default LLM Configuration
  defaultLLM?: LLMProviderConfig;

  // LLM Providers Configuration
  providers?: Record<string, LLMProviderConfig>;

  // Checkpointing Configuration
  checkpoint?: CheckpointConfig;

  // Memory Configuration
  memory?: MemoryDatabaseConfig;

  // Multi-Agent Configuration
  multiAgent?: {
    enabled?: boolean;
    defaultCoordinationType?: 'supervisor' | 'swarm' | 'hierarchical';
  };

  // Streaming Configuration
  streaming?: {
    enabled?: boolean;
    websocket?: {
      enabled?: boolean;
      port?: number;
      cors?: boolean;
    };
  };

  // Debug Configuration
  debug?: {
    enabled?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };

  // Child Module Configurations
  // Each child module can be configured independently
  functionalApi?: {
    enabled?: boolean;
    [key: string]: any;
  };

  platform?: {
    enabled?: boolean;
    [key: string]: any;
  };

  timeTravel?: {
    enabled?: boolean;
    [key: string]: any;
  };

  monitoring?: {
    enabled?: boolean;
    [key: string]: any;
  };

  hitl?: {
    enabled?: boolean;
    [key: string]: any;
  };

  workflowEngine?: {
    enabled?: boolean;
    [key: string]: any;
  };
}

export interface LLMProviderConfig {
  // Provider type (openai, anthropic, google, azure, custom)
  type: 'openai' | 'anthropic' | 'google' | 'azure' | 'custom';
  // API key for the provider
  apiKey?: string;
  // Model name
  model?: string;
  // Base URL for custom providers
  baseURL?: string;
  // Additional provider-specific options
  options?: Record<string, any>;
  // Custom provider factory
  factory?: () => any; // Using any to avoid import of BaseChatModel here
  // Legacy compatibility fields
  temperature?: number;
  maxTokens?: number;
  provider?: 'openai' | 'anthropic' | 'custom'; // Keep for backward compatibility
}

export interface CheckpointConfig {
  enabled?: boolean;
  provider?: 'memory' | 'redis' | 'postgresql';
  config?: Record<string, any>;
  // Additional properties used by checkpoint adapter
  storage?:
    | 'memory'
    | 'sqlite'
    | 'redis'
    | 'postgresql'
    | 'custom'
    | 'database';
  storageConfig?: {
    path?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
  };
  saver?: any; // Custom checkpoint saver instance
}

export interface MemoryDatabaseConfig {
  enabled?: boolean;
  chromadb?: {
    collection?: string;
    embeddingFunction?: string;
  };
  neo4j?: {
    database?: string;
  };
}

export interface LangGraphModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (
    ...args: any[]
  ) => Promise<LangGraphModuleOptions> | LangGraphModuleOptions;
  inject?: any[];
  useClass?: Type<LangGraphModuleOptionsFactory>;
  useExisting?: Type<LangGraphModuleOptionsFactory>;
}

export interface LangGraphModuleOptionsFactory {
  createLangGraphOptions():
    | Promise<LangGraphModuleOptions>
    | LangGraphModuleOptions;
}
