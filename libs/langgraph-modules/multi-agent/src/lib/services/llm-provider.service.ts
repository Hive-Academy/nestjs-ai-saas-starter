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
  async getLLM(config?: multiAgentInterface.SupervisorConfig['llm']): Promise<BaseLanguageModelInterface> {
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
  private async createLLM(config?: multiAgentInterface.SupervisorConfig['llm']): Promise<BaseLanguageModelInterface> {
    const model = config?.model || this.options.defaultLlm?.model || 'gpt-4';
    const temperature = config?.temperature ?? this.options.defaultLlm?.temperature ?? 0;
    const maxTokens = config?.maxTokens || this.options.defaultLlm?.maxTokens;

    // Determine provider from model name
    if (model.startsWith('gpt-') || model.startsWith('o1-')) {
      return this.createOpenAILLM(model, temperature, maxTokens);
    } else if (model.startsWith('claude-')) {
      return this.createAnthropicLLM(model, temperature, maxTokens);
    }
      // Default to OpenAI for unknown models
      this.logger.warn(`Unknown model provider for ${model}, defaulting to OpenAI`);
      return this.createOpenAILLM(model, temperature, maxTokens);

  }

  /**
   * Create OpenAI LLM instance
   */
  private createOpenAILLM(
    model: string,
    temperature: number,
    maxTokens?: number
  ): ChatOpenAI {
    return new ChatOpenAI({
      model,
      temperature,
      maxTokens,
      apiKey: this.options.defaultLlm?.apiKey || process.env.OPENAI_API_KEY,
      streaming: this.options.streaming?.enabled || false,
    });
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
  private createCacheKey(config?: multiAgentInterface.SupervisorConfig['llm']): string {
    const model = config?.model || this.options.defaultLlm?.model || 'gpt-4';
    const temperature = config?.temperature ?? this.options.defaultLlm?.temperature ?? 0;
    const maxTokens = config?.maxTokens || this.options.defaultLlm?.maxTokens || 4000;

    return `${model}_${temperature}_${maxTokens}`;
  }

  /**
   * Get supported providers
   */
  getSupportedProviders(): string[] {
    return ['openai', 'anthropic'];
  }

  /**
   * Validate model configuration
   */
  validateModelConfig(config?: multiAgentInterface.SupervisorConfig['llm']): boolean {
    const model = config?.model || this.options.defaultLlm?.model;

    if (!model) {
      this.logger.error('No model specified in configuration');
      return false;
    }

    if (model.startsWith('gpt-') || model.startsWith('o1-')) {
      const apiKey = this.options.defaultLlm?.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        this.logger.error('OpenAI API key not configured');
        return false;
      }
    } else if (model.startsWith('claude-')) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        this.logger.error('Anthropic API key not configured');
        return false;
      }
    }

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
   * Test LLM connectivity
   */
  async testLLM(config?: multiAgentInterface.SupervisorConfig['llm']): Promise<boolean> {
    try {
      const llm = await this.getLLM(config);
      const response = await llm.invoke([
        { role: 'user', content: 'Hello, this is a connectivity test. Please respond with "OK".' }
      ]);

      const success = response.content.toString().toLowerCase().includes('ok');
      this.logger.debug(`LLM test result: ${success ? 'PASS' : 'FAIL'}`);

      return success;
    } catch (error) {
      this.logger.error('LLM connectivity test failed:', error);
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
