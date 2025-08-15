import { Injectable, Logger } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { LLMProviderConfig  } from '../interfaces/module-options.interface';

/**
 * Factory for creating LLM providers based on configuration
 */
@Injectable()
export class LLMProviderFactory {
  private readonly logger = new Logger(LLMProviderFactory.name);
  private readonly providers = new Map<string, BaseChatModel>();

  /**
   * Create an LLM provider based on configuration
   */
  create(config: LLMProviderConfig): BaseChatModel {
    // Check if custom factory is provided
    if (config.factory) {
      return config.factory();
    }

    // Create provider based on type
    switch (config.type) {
      case 'openai':
        return this.createOpenAI(config);

      case 'anthropic':
        return this.createAnthropic(config);

      case 'google':
        return this.createGoogle(config);

      case 'azure':
        return this.createAzure(config);

      case 'custom':
        if (!config.factory) {
          throw new Error('Custom provider type requires a factory function');
        }
        return (config.factory as any)();

      default:
        throw new Error(`Unsupported LLM provider type: ${config.type}`);
    }
  }

  /**
   * Create OpenAI chat model
   */
  private createOpenAI(config: LLMProviderConfig): BaseChatModel {
    const model = new ChatOpenAI({
      apiKey: config.apiKey,
      modelName: config.model || 'gpt-4-turbo-preview',
      temperature: config.options?.temperature || 0.7,
      maxTokens: config.options?.maxTokens,
      streaming: config.options?.streaming || true,
      ...config.options,
    });

    this.logger.log(`Created OpenAI provider with model: ${config.model || 'gpt-4-turbo-preview'}`);
    return model;
  }

  /**
   * Create Anthropic chat model
   */
  private createAnthropic(config: LLMProviderConfig): BaseChatModel {
    const model = new ChatAnthropic({
      apiKey: config.apiKey,
      modelName: config.model || 'claude-3-opus-20240229',
      temperature: config.options?.temperature || 0.7,
      maxTokens: config.options?.maxTokens || 4096,
      streaming: config.options?.streaming || true,
      ...config.options,
    });

    this.logger.log(`Created Anthropic provider with model: ${config.model || 'claude-3-opus'}`);
    return model;
  }

  /**
   * Create Google Generative AI chat model
   */
  private createGoogle(config: LLMProviderConfig): BaseChatModel {
    const model = new ChatGoogleGenerativeAI({
      apiKey: config.apiKey,
      model: config.model || 'gemini-1.5-pro',
      temperature: config.options?.temperature || 0.7,
      maxOutputTokens: config.options?.maxTokens,
      streaming: config.options?.streaming || true,
      ...config.options,
    });

    this.logger.log(`Created Google provider with model: ${config.model || 'gemini-1.5-pro'}`);
    return model;
  }

  /**
   * Create Azure OpenAI chat model
   */
  private createAzure(config: LLMProviderConfig): BaseChatModel {
    // For Azure, use the base configuration with Azure-specific options
    const azureConfig: any = {
      openAIApiKey: config.apiKey,
      temperature: config.options?.temperature || 0.7,
      maxTokens: config.options?.maxTokens,
      streaming: config.options?.streaming || true,
      // Azure-specific configuration would go here
      ...config.options,
    };
    
    const model = new ChatOpenAI(azureConfig);

    this.logger.log(`Created Azure OpenAI provider with deployment: ${config.model}`);
    return model;
  }

  /**
   * Get or create a cached provider
   */
  getOrCreate(name: string, config: LLMProviderConfig): BaseChatModel {
    if (this.providers.has(name)) {
      return this.providers.get(name)!;
    }

    const provider = this.create(config);
    this.providers.set(name, provider);
    return provider;
  }

  /**
   * Clear cached providers
   */
  clearCache(): void {
    this.providers.clear();
  }

  /**
   * Create a provider with tools bound
   */
  createWithTools(config: LLMProviderConfig, tools: any[]): BaseChatModel {
    const model = this.create(config);
    
    // Bind tools if the model supports it
    if ('bindTools' in model && typeof model.bindTools === 'function') {
      return (model as any).bindTools(tools);
    }

    this.logger.warn('Model does not support tool binding');
    return model;
  }

  /**
   * Create a provider with retry configuration
   */
  createWithRetry(config: LLMProviderConfig, retryConfig?: {
    maxRetries?: number;
    retryDelayMs?: number;
  }): BaseChatModel {
    const baseConfig = {
      ...config,
      options: {
        ...config.options,
        maxRetries: retryConfig?.maxRetries || 3,
        retryDelayMs: retryConfig?.retryDelayMs || 1000,
      },
    };

    return this.create(baseConfig);
  }
}

/**
 * Factory function to create an LLM provider factory
 */
export function createLLMProvider(): LLMProviderFactory {
  return new LLMProviderFactory();
}