import { Injectable, Logger, Inject } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseLanguageModelInterface } from '@langchain/core/language_models/base';
import * as multiAgentInterface from '../interfaces/multi-agent.interface';
import { MULTI_AGENT_MODULE_OPTIONS } from '../constants/multi-agent.constants';

/**
 * Service for managing LLM instances and provider abstraction
 * Handles multiple LLM providers and caching
 */
@Injectable()
export class LlmProviderService {
  private readonly logger = new Logger(LlmProviderService.name);
  private readonly llmCache = new Map<string, BaseLanguageModelInterface>();

  constructor(
    @Inject(MULTI_AGENT_MODULE_OPTIONS)
    private readonly options: multiAgentInterface.MultiAgentModuleOptions
  ) {}

  /**
   * Get or create LLM instance with caching
   */
  async getLLM(
    config?: multiAgentInterface.SupervisorConfig['llm']
  ): Promise<BaseLanguageModelInterface> {
    const model = config?.model || this.options.defaultLlm?.model || 'gpt-4';
    const cacheKey = this.createCacheKey(config);

    if (this.llmCache.has(cacheKey)) {
      this.logger.debug(`Using cached LLM: ${model}`);
      return this.llmCache.get(cacheKey)!;
    }

    this.logger.debug(`Creating new LLM instance: ${model}`);
    const llm = await this.createLLM(config);
    this.llmCache.set(cacheKey, llm);

    return llm;
  }

  /**
   * Create LLM instance based on configured provider - simple and explicit
   */
  private async createLLM(
    config?: multiAgentInterface.SupervisorConfig['llm']
  ): Promise<BaseLanguageModelInterface> {
    const model = config?.model || this.options.defaultLlm?.model || 'gpt-4';
    const temperature =
      config?.temperature ?? this.options.defaultLlm?.temperature ?? 0;
    const maxTokens = config?.maxTokens || this.options.defaultLlm?.maxTokens;

    // Simple provider selection - explicit from configuration
    const provider =
      this.options.defaultLlm?.provider ||
      this.options.defaultLlm?.llmProvider || // backward compatibility
      'openai'; // default

    this.logger.debug(
      `Creating LLM instance: provider=${provider}, model=${model}`
    );

    switch (provider) {
      case 'anthropic':
        return this.createAnthropicLLM(model, temperature, maxTokens);

      case 'openrouter':
        return this.createOpenRouterLLM(model, temperature, maxTokens);

      case 'google':
        return this.createGoogleLLM(model, temperature, maxTokens);

      case 'local':
        return this.createLocalLLM(model, temperature, maxTokens);

      case 'azure-openai':
        return this.createAzureOpenAILLM(model, temperature, maxTokens);

      case 'cohere':
        return this.createCohereLLM(model, temperature, maxTokens);

      case 'openai':
      default:
        return this.createOpenAILLM(model, temperature, maxTokens);
    }
  }

  /**
   * Create OpenAI LLM instance
   */
  private createOpenAILLM(
    model: string,
    temperature: number,
    maxTokens?: number
  ): ChatOpenAI {
    const apiKey =
      this.options.defaultLlm?.openaiApiKey || this.options.defaultLlm?.apiKey; // backward compatibility

    if (!apiKey) {
      throw new Error(
        'No OpenAI API key found - configure openaiApiKey in module options'
      );
    }

    const configuration: any = {
      model,
      temperature,
      maxTokens,
      apiKey,
      streaming: this.options.streaming?.enabled || false,
    };

    // Provider-specific configuration
    if (this.options.defaultLlm?.openai?.organization) {
      configuration.configuration = {
        organization: this.options.defaultLlm.openai.organization,
      };

      if (this.options.defaultLlm.openai.project) {
        configuration.configuration.project =
          this.options.defaultLlm.openai.project;
      }
    }

    this.logger.debug(`Creating OpenAI LLM with model: ${model}`);
    return new ChatOpenAI(configuration);
  }

  /**
   * Create Anthropic LLM instance
   */
  private createAnthropicLLM(
    model: string,
    temperature: number,
    maxTokens?: number
  ): ChatAnthropic {
    const apiKey = this.options.defaultLlm?.anthropicApiKey;

    if (!apiKey) {
      throw new Error(
        'No Anthropic API key found - configure anthropicApiKey in module options'
      );
    }

    const configuration: any = {
      model,
      temperature,
      maxTokens,
      apiKey,
      streaming: this.options.streaming?.enabled || false,
    };

    // Provider-specific configuration
    if (this.options.defaultLlm?.anthropic?.version) {
      configuration.anthropicApiVersion =
        this.options.defaultLlm.anthropic.version;
    }

    this.logger.debug(`Creating Anthropic LLM with model: ${model}`);
    return new ChatAnthropic(configuration);
  }

  /**
   * Create OpenRouter LLM instance (uses ChatOpenAI with custom baseURL)
   */
  private createOpenRouterLLM(
    model: string,
    temperature: number,
    maxTokens?: number
  ): ChatOpenAI {
    const apiKey =
      this.options.defaultLlm?.openrouterApiKey ||
      this.options.defaultLlm?.openrouterApiKey; // backward compatibility

    if (!apiKey) {
      throw new Error(
        'No OpenRouter API key found - configure openrouterApiKey in module options'
      );
    }

    const baseUrl =
      this.options.defaultLlm?.openrouter?.baseUrl ||
      'https://openrouter.ai/api/v1';
    const siteName =
      this.options.defaultLlm?.openrouter?.siteName || 'NestJS AI SaaS Starter';
    const siteUrl =
      this.options.defaultLlm?.openrouter?.siteUrl || 'http://localhost:3000';

    const configuration: any = {
      model,
      temperature,
      maxTokens,
      apiKey,
      streaming: this.options.streaming?.enabled || false,
      configuration: {
        baseURL: baseUrl,
        defaultHeaders: {
          'HTTP-Referer': siteUrl,
          'X-Title': siteName,
        },
      },
    };

    this.logger.debug(`Creating OpenRouter LLM with model: ${model}`);
    return new ChatOpenAI(configuration);
  }

  /**
   * Create Google AI LLM instance
   */
  private createGoogleLLM(
    model: string,
    temperature: number,
    maxTokens?: number
  ): BaseLanguageModelInterface {
    // Note: This would require @langchain/google-genai package
    throw new Error(
      'Google AI provider not yet implemented - requires @langchain/google-genai package'
    );
  }

  /**
   * Create Local LLM instance (Ollama, LM Studio, etc.)
   */
  private createLocalLLM(
    model: string,
    temperature: number,
    maxTokens?: number
  ): ChatOpenAI {
    const baseUrl =
      this.options.defaultLlm?.local?.baseUrl || 'http://localhost:11434/v1';

    const configuration: any = {
      model,
      temperature,
      maxTokens,
      apiKey: 'not-required', // Local LLMs typically don't require API keys
      streaming: this.options.streaming?.enabled || false,
      configuration: {
        baseURL: baseUrl,
      },
    };

    this.logger.debug(
      `Creating Local LLM with model: ${model}, baseUrl: ${baseUrl}`
    );
    return new ChatOpenAI(configuration);
  }

  /**
   * Create Azure OpenAI LLM instance
   */
  private createAzureOpenAILLM(
    model: string,
    temperature: number,
    maxTokens?: number
  ): BaseLanguageModelInterface {
    // Note: This would require @langchain/azure-openai package or specific configuration
    throw new Error(
      'Azure OpenAI provider not yet implemented - requires @langchain/azure-openai package'
    );
  }

  /**
   * Create Cohere LLM instance
   */
  private createCohereLLM(
    model: string,
    temperature: number,
    maxTokens?: number
  ): BaseLanguageModelInterface {
    // Note: This would require @langchain/cohere package
    throw new Error(
      'Cohere provider not yet implemented - requires @langchain/cohere package'
    );
  }

  /**
   * Create cache key for LLM configuration
   */
  private createCacheKey(
    config?: multiAgentInterface.SupervisorConfig['llm']
  ): string {
    const model = config?.model || this.options.defaultLlm?.model || 'gpt-4';
    const temperature =
      config?.temperature ?? this.options.defaultLlm?.temperature ?? 0;
    const maxTokens =
      config?.maxTokens || this.options.defaultLlm?.maxTokens || 4000;

    return `${model}_${temperature}_${maxTokens}`;
  }

  /**
   * Get supported providers
   */
  getSupportedProviders(): string[] {
    return [
      'openai',
      'anthropic',
      'openrouter',
      'google',
      'local',
      'azure-openai',
      'cohere',
    ];
  }

  /**
   * Validate model configuration gracefully
   */
  validateModelConfig(
    config?: multiAgentInterface.SupervisorConfig['llm']
  ): boolean {
    const model = config?.model || this.options.defaultLlm?.model;
    const provider =
      this.options.defaultLlm?.provider ||
      this.options.defaultLlm?.llmProvider ||
      'openai';

    if (!model) {
      this.logger.warn(
        'No model specified in configuration, using default: gpt-4'
      );
      return true; // Allow default fallback
    }

    // Simple provider validation - check for required API key
    let hasApiKey = false;
    let keyName = '';

    switch (provider) {
      case 'anthropic':
        hasApiKey = !!this.options.defaultLlm?.anthropicApiKey;
        keyName = 'anthropicApiKey';
        break;
      case 'openrouter':
        hasApiKey = !!this.options.defaultLlm?.openrouterApiKey;
        keyName = 'openrouterApiKey';
        break;
      case 'google':
        hasApiKey = !!this.options.defaultLlm?.googleApiKey;
        keyName = 'googleApiKey';
        break;
      case 'azure-openai':
        hasApiKey = !!this.options.defaultLlm?.azureOpenaiApiKey;
        keyName = 'azureOpenaiApiKey';
        break;
      case 'cohere':
        hasApiKey = !!this.options.defaultLlm?.cohereApiKey;
        keyName = 'cohereApiKey';
        break;
      case 'local':
        hasApiKey = true; // Local LLMs don't require API keys
        break;
      case 'openai':
      default:
        hasApiKey = !!(
          this.options.defaultLlm?.openaiApiKey ||
          this.options.defaultLlm?.apiKey
        );
        keyName = 'openaiApiKey';
        break;
    }

    if (!hasApiKey) {
      this.logger.warn(
        `Provider ${provider} requires ${keyName} to be configured in module options`
      );
      return false;
    }

    this.logger.debug(
      `Model configuration validated: provider=${provider}, model=${model}`
    );
    return true;
  }

  /**
   * Clear LLM cache
   */
  clearCache(): void {
    const cacheSize = this.llmCache.size;
    this.llmCache.clear();
    this.logger.log(`Cleared LLM cache (${cacheSize} instances)`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.llmCache.size,
      keys: Array.from(this.llmCache.keys()),
    };
  }

  /**
   * Preload commonly used models
   */
  async preloadModels(models: string[]): Promise<void> {
    this.logger.log(`Preloading ${models.length} models`);

    const preloadPromises = models.map(async (model) => {
      try {
        await this.getLLM({ model });
        this.logger.debug(`Preloaded model: ${model}`);
      } catch (error) {
        this.logger.error(`Failed to preload model ${model}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
    this.logger.log('Model preloading completed');
  }

  /**
   * Test LLM connectivity gracefully
   */
  async testLLM(
    config?: multiAgentInterface.SupervisorConfig['llm']
  ): Promise<boolean> {
    try {
      const provider =
        this.options.defaultLlm?.provider ||
        this.options.defaultLlm?.llmProvider ||
        'openai';
      const model = config?.model || this.options.defaultLlm?.model || 'gpt-4';

      // Check if we have the required API key for the configured provider
      if (!this.validateModelConfig(config)) {
        this.logger.warn(
          `Skipping connectivity test - ${provider} provider not properly configured`
        );
        return false;
      }

      this.logger.debug(
        `Testing LLM connectivity: provider=${provider}, model=${model}`
      );
      const llm = await this.getLLM(config);

      // Quick test with simple prompt
      const response = await llm.invoke([
        { role: 'user', content: 'Hello, respond with just "OK"' },
      ]);

      const success = response.content.toString().toLowerCase().includes('ok');
      this.logger.log(
        `LLM connectivity test ${
          success ? 'PASSED' : 'FAILED'
        } for provider=${provider}, model=${model}`
      );

      return success;
    } catch (error) {
      this.logger.warn(
        `LLM connectivity test failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  }

  /**
   * Get model capabilities and limits based on configured provider
   */
  getModelCapabilities(model?: string): {
    maxTokens: number;
    supportsTools: boolean;
    supportsStreaming: boolean;
    provider: string;
  } {
    const provider =
      this.options.defaultLlm?.provider ||
      this.options.defaultLlm?.llmProvider ||
      'openai';
    const modelName = model || this.options.defaultLlm?.model || 'gpt-4';

    // Provider-based capabilities instead of model name detection
    switch (provider) {
      case 'openai':
        if (modelName.startsWith('gpt-4')) {
          return {
            maxTokens: 128000,
            supportsTools: true,
            supportsStreaming: true,
            provider: 'openai',
          };
        } else if (modelName.startsWith('gpt-3.5')) {
          return {
            maxTokens: 16385,
            supportsTools: true,
            supportsStreaming: true,
            provider: 'openai',
          };
        }
        return {
          maxTokens: 8192,
          supportsTools: true,
          supportsStreaming: true,
          provider: 'openai',
        };

      case 'anthropic':
        if (modelName.startsWith('claude-3')) {
          return {
            maxTokens: 200000,
            supportsTools: true,
            supportsStreaming: true,
            provider: 'anthropic',
          };
        }
        return {
          maxTokens: 100000,
          supportsTools: true,
          supportsStreaming: true,
          provider: 'anthropic',
        };

      case 'openrouter':
        return {
          maxTokens: 32768, // Varies by model on OpenRouter
          supportsTools: true,
          supportsStreaming: true,
          provider: 'openrouter',
        };

      case 'google':
        return {
          maxTokens: 32768,
          supportsTools: true,
          supportsStreaming: true,
          provider: 'google',
        };

      case 'local':
        return {
          maxTokens: 4096, // Varies significantly for local models
          supportsTools: false, // Most local setups don't support tools
          supportsStreaming: true,
          provider: 'local',
        };

      case 'azure-openai':
        return {
          maxTokens: 128000,
          supportsTools: true,
          supportsStreaming: true,
          provider: 'azure-openai',
        };

      case 'cohere':
        return {
          maxTokens: 128000,
          supportsTools: true,
          supportsStreaming: true,
          provider: 'cohere',
        };

      default:
        return {
          maxTokens: 4000,
          supportsTools: false,
          supportsStreaming: false,
          provider: 'unknown',
        };
    }
  }
}
