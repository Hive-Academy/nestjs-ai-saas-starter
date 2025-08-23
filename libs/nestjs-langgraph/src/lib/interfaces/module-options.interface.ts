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
  memory?: MemoryConfig;

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
}

export interface LLMProviderConfig {
  provider: 'openai' | 'anthropic' | 'custom';
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  baseURL?: string;
}

export interface CheckpointConfig {
  enabled?: boolean;
  provider?: 'memory' | 'redis' | 'postgresql';
  config?: Record<string, any>;
  // Additional properties used by checkpoint adapter
  storage?: 'memory' | 'sqlite' | 'redis' | 'postgresql';
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

export interface MemoryConfig {
  enabled?: boolean;
  chromadb?: {
    collection?: string;
    embeddingFunction?: string;
  };
  neo4j?: {
    database?: string;
  };
}

export interface LangGraphModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: any[]) => Promise<LangGraphModuleOptions> | LangGraphModuleOptions;
  inject?: any[];
  useClass?: Type<LangGraphModuleOptionsFactory>;
  useExisting?: Type<LangGraphModuleOptionsFactory>;
}

export interface LangGraphModuleOptionsFactory {
  createLangGraphOptions(): Promise<LangGraphModuleOptions> | LangGraphModuleOptions;
}