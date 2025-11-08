/**
 * LLM Provider Configuration
 */
export interface LlmConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * LLM Module Options
 */
export interface LlmModuleOptions {
  defaultLlm?: {
    provider?:
      | 'openai'
      | 'anthropic'
      | 'openrouter'
      | 'google'
      | 'local'
      | 'azure-openai'
      | 'cohere';
    model?: string;
    temperature?: number;
    maxTokens?: number;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    openrouterApiKey?: string;
    googleApiKey?: string;
    azureOpenaiApiKey?: string;
    cohereApiKey?: string;
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
    };
    local?: {
      baseUrl?: string;
    };
  };
  streaming?: {
    enabled?: boolean;
  };
}
