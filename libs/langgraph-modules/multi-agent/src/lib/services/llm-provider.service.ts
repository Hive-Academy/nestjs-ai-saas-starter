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
   * Create LLM instance based on provider
   */
  private async createLLM(
    config?: multiAgentInterface.SupervisorConfig['llm']
  ): Promise<BaseLanguageModelInterface> {
    const model = config?.model || this.options.defaultLlm?.model || 'gpt-4';
    const temperature =
      config?.temperature ?? this.options.defaultLlm?.temperature ?? 0;
    const maxTokens = config?.maxTokens || this.options.defaultLlm?.maxTokens;

    // Determine provider from model name
    if (model.startsWith('claude-')) {
      return this.createAnthropicLLM(model, temperature, maxTokens);
    } else {
      // Use OpenAI/OpenRouter for all non-Claude models
      // This includes GPT models, OpenRouter models, and any custom models
      if (!model.startsWith('gpt-') && !model.startsWith('o1-')) {
        this.logger.debug(`Using OpenAI provider for model: ${model}`);
      }
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
    // Determine API key priority
    const apiKey =
      this.options.defaultLlm?.apiKey ||
      process.env.OPENAI_API_KEY ||
      process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error(
        'No API key found - set OPENAI_API_KEY or OPENROUTER_API_KEY environment variable'
      );
    }

    // Base configuration
    const configuration: any = {
      model,
      temperature,
      maxTokens,
      apiKey,
      streaming: this.options.streaming?.enabled || false,
    };

    // Use configuration from options first, then fallback to environment variables
    const baseURL =
      this.options.defaultLlm?.baseURL ||
      (process.env.LLM_PROVIDER === 'openrouter'
        ? process.env.OPENROUTER_BASE_URL
        : undefined);

    const defaultHeaders =
      this.options.defaultLlm?.defaultHeaders ||
      (process.env.LLM_PROVIDER === 'openrouter'
        ? {
            'HTTP-Referer':
              process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
            'X-Title':
              process.env.OPENROUTER_APP_NAME || 'NestJS AI SaaS Starter',
          }
        : undefined);

    // Configure for OpenRouter or custom provider if needed
    if (baseURL || defaultHeaders) {
      const providerName = baseURL?.includes('openrouter')
        ? 'OpenRouter'
        : 'Custom Provider';
      this.logger.debug(`Configuring ChatOpenAI for ${providerName}`);
      configuration.configuration = {};

      if (baseURL) {
        configuration.configuration.baseURL = baseURL;
      }

      if (defaultHeaders) {
        configuration.configuration.defaultHeaders = defaultHeaders;
      }
    } else {
      this.logger.debug('Configuring ChatOpenAI for OpenAI');
    }

    const providerType = baseURL?.includes('openrouter')
      ? 'OpenRouter'
      : baseURL
      ? 'Custom'
      : 'OpenAI';
    this.logger.debug(
      `Creating ChatOpenAI with model: ${model}, provider: ${providerType}`
    );

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
    return new ChatAnthropic({
      model,
      temperature,
      maxTokens,
      apiKey: process.env.ANTHROPIC_API_KEY,
      streaming: this.options.streaming?.enabled || false,
    });
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
    return ['openai', 'anthropic'];
  }

  /**
   * Validate model configuration gracefully
   */
  validateModelConfig(
    config?: multiAgentInterface.SupervisorConfig['llm']
  ): boolean {
    const model = config?.model || this.options.defaultLlm?.model;

    if (!model) {
      this.logger.warn(
        'No model specified in configuration, using default: gpt-4'
      );
      return true; // Allow default fallback
    }

    if (model.startsWith('claude-')) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        this.logger.warn(
          `Model ${model} requires Anthropic API key - set ANTHROPIC_API_KEY`
        );
        return false;
      }
    } else {
      // For all non-Claude models (OpenAI, OpenRouter, etc.)
      const apiKey =
        this.options.defaultLlm?.apiKey ||
        process.env.OPENAI_API_KEY ||
        process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        this.logger.warn(
          `Model ${model} requires API key - set OPENAI_API_KEY or OPENROUTER_API_KEY`
        );
        return false;
      }
    }

    this.logger.debug(`Model configuration validated: ${model}`);
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
      // Check if we have ANY API key configured (prioritize module config)
      const configuredApiKey =
        this.options.defaultLlm?.apiKey ||
        process.env.OPENAI_API_KEY ||
        process.env.OPENROUTER_API_KEY;
      const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

      if (!configuredApiKey && !hasAnthropic) {
        this.logger.warn(
          'No LLM API keys configured - skipping connectivity test'
        );
        return false;
      }

      const model = config?.model || this.options.defaultLlm?.model || 'gpt-4';

      // Skip test for models that require unavailable providers
      if (model.startsWith('claude-') && !hasAnthropic) {
        this.logger.warn(
          `Skipping ${model} test - ANTHROPIC_API_KEY not configured`
        );
        return false;
      }

      // For OpenRouter or any non-Claude models, check if we have a configured API key
      if (!model.startsWith('claude-') && !configuredApiKey) {
        this.logger.warn(
          `Skipping ${model} test - no API key configured for OpenAI/OpenRouter`
        );
        return false;
      }

      this.logger.debug(`Testing LLM connectivity with model: ${model}`);
      const llm = await this.getLLM(config);

      // Quick test with simple prompt
      const response = await llm.invoke([
        { role: 'user', content: 'Hello, respond with just "OK"' },
      ]);

      const success = response.content.toString().toLowerCase().includes('ok');
      this.logger.log(
        `LLM connectivity test ${
          success ? 'PASSED' : 'FAILED'
        } for model: ${model}`
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
   * Get model capabilities and limits
   */
  getModelCapabilities(model: string): {
    maxTokens: number;
    supportsTools: boolean;
    supportsStreaming: boolean;
    provider: string;
  } {
    if (model.startsWith('gpt-4')) {
      return {
        maxTokens: 128000,
        supportsTools: true,
        supportsStreaming: true,
        provider: 'openai',
      };
    } else if (model.startsWith('gpt-3.5')) {
      return {
        maxTokens: 16385,
        supportsTools: true,
        supportsStreaming: true,
        provider: 'openai',
      };
    } else if (model.startsWith('claude-3')) {
      return {
        maxTokens: 200000,
        supportsTools: true,
        supportsStreaming: true,
        provider: 'anthropic',
      };
    }
    // Default capabilities
    return {
      maxTokens: 4000,
      supportsTools: false,
      supportsStreaming: false,
      provider: 'unknown',
    };
  }
}
