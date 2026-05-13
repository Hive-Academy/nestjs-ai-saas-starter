import { Injectable, Logger, Inject } from '@nestjs/common';
import { initChatModel } from 'langchain/chat_models/universal';
import { ChatOpenAI } from '@langchain/openai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type {
  LlmConfig,
  LlmModuleOptions,
} from '../../interfaces/llm-config.interface';

/**
 * Service for managing LLM instances with two-branch dispatch:
 *
 * Branch A — Native LangChain provider via initChatModel (no baseUrl).
 *   Model string format: "provider:model-name"
 *   e.g. "anthropic:claude-sonnet-4-6", "openai:gpt-4o-mini"
 *
 * Branch B — OpenAI-compatible custom endpoint (baseUrl present).
 *   ChatOpenAI is instantiated pointing at baseUrl with the supplied apiKey.
 *   e.g. baseUrl="https://api.z.ai/v1", model="z-ai/glm-4.5-air"
 */
@Injectable()
export class LlmProviderService {
  private readonly logger = new Logger(LlmProviderService.name);
  private readonly llmCache = new Map<string, BaseChatModel>();

  constructor(
    @Inject('LLM_MODULE_OPTIONS')
    private readonly options: LlmModuleOptions
  ) {}

  /**
   * Get or create a cached LLM instance.
   */
  async getLLM(config?: LlmConfig): Promise<BaseChatModel> {
    const cacheKey = this.createCacheKey(config);

    if (this.llmCache.has(cacheKey)) {
      const model = config?.model ?? this.options.defaultLlm?.model ?? 'unknown';
      this.logger.debug(`Using cached LLM: ${model}`);
      return this.llmCache.get(cacheKey)!;
    }

    const llm = await this.createLLM(config);
    this.llmCache.set(cacheKey, llm);
    return llm;
  }

  /**
   * Two-branch LLM factory.
   *
   * Branch B (custom endpoint) is chosen when defaultLlm.baseUrl is set.
   * Branch A (native LangChain) is used otherwise.
   */
  private async createLLM(config?: LlmConfig): Promise<BaseChatModel> {
    const model = config?.model ?? this.options.defaultLlm?.model;
    const temperature =
      config?.temperature ?? this.options.defaultLlm?.temperature ?? 0;
    const maxTokens =
      config?.maxTokens ?? this.options.defaultLlm?.maxTokens;
    const apiKey = this.options.defaultLlm?.apiKey;
    const baseUrl = this.options.defaultLlm?.baseUrl;

    if (!model) {
      throw new Error(
        'LLM model must be specified — set defaultLlm.model in module options or LLM_MODEL env var'
      );
    }

    // Branch B: OpenAI-compatible custom endpoint
    if (baseUrl) {
      if (!apiKey) {
        throw new Error(
          'apiKey is required when baseUrl is set (Branch B: custom OpenAI-compatible endpoint)'
        );
      }
      const modelName = this.extractModelName(model);
      this.logger.debug(
        `Creating LLM via Branch B (custom endpoint): model=${modelName}, baseUrl=${baseUrl}`
      );
      return new ChatOpenAI({
        model: modelName,
        apiKey,
        temperature,
        maxTokens,
        configuration: { baseURL: baseUrl },
      }) as unknown as BaseChatModel;
    }

    // Branch A: native LangChain provider via initChatModel
    this.logger.debug(
      `Creating LLM via Branch A (native LangChain): model=${model}`
    );
    return initChatModel(model, {
      temperature,
      maxTokens,
      ...(apiKey ? { apiKey } : {}),
    }) as Promise<BaseChatModel>;
  }

  /**
   * Strip the "provider:" prefix from a model string, if present.
   * "anthropic:claude-sonnet-4-6" → "claude-sonnet-4-6"
   * "llama3" → "llama3"
   *
   * OpenRouter-style IDs (e.g. "openai/gpt-oss-20b:free") contain a slash
   * before the colon — these are passed through unchanged because the colon
   * is a variant suffix, not a provider prefix.
   */
  private extractModelName(model: string): string {
    const colonIndex = model.indexOf(':');
    if (colonIndex === -1) return model;

    const prefix = model.substring(0, colonIndex);
    // If the prefix contains a slash it is an org/model ID (e.g. OpenRouter),
    // not a "provider:model" pair — pass the whole string through.
    if (prefix.includes('/')) return model;

    return model.substring(colonIndex + 1);
  }

  /**
   * Build a stable cache key that captures all factors affecting LLM identity.
   */
  private createCacheKey(config?: LlmConfig): string {
    const model =
      config?.model ?? this.options.defaultLlm?.model ?? 'unknown';
    const temperature =
      config?.temperature ?? this.options.defaultLlm?.temperature ?? 0;
    const maxTokens =
      config?.maxTokens ?? this.options.defaultLlm?.maxTokens ?? 0;
    const baseUrl = this.options.defaultLlm?.baseUrl ?? '';
    return `${model}_${temperature}_${maxTokens}_${baseUrl}`;
  }

  /**
   * Validate that the current configuration is sufficient to create an LLM.
   */
  validateModelConfig(config?: LlmConfig): boolean {
    const model = config?.model ?? this.options.defaultLlm?.model;
    const baseUrl = this.options.defaultLlm?.baseUrl;
    const apiKey = this.options.defaultLlm?.apiKey;

    if (!model) {
      this.logger.warn('No model specified');
      return false;
    }

    if (baseUrl && !apiKey) {
      this.logger.warn(
        'baseUrl set but apiKey missing — Branch B requires apiKey'
      );
      return false;
    }

    return true;
  }

  /**
   * Native LangChain provider prefixes supported by Branch A.
   * Any OpenAI-compatible provider is also supported via baseUrl (Branch B).
   */
  getSupportedProviders(): string[] {
    return [
      'openai',
      'anthropic',
      'google-genai',
      'openrouter',
      'groq',
      'mistralai',
      'together',
      'fireworks',
      'cohere',
    ];
  }

  /**
   * Return token limits and capability flags for a given model string.
   * Provider is derived from the "provider:" prefix of the model string.
   */
  getModelCapabilities(model?: string): {
    maxTokens: number;
    supportsTools: boolean;
    supportsStreaming: boolean;
    provider: string;
  } {
    const modelStr = model ?? this.options.defaultLlm?.model ?? '';
    const colonIdx = modelStr.indexOf(':');
    const provider =
      colonIdx === -1 ? 'openai' : modelStr.substring(0, colonIdx);

    switch (provider) {
      case 'anthropic':
        return {
          maxTokens: 200000,
          supportsTools: true,
          supportsStreaming: true,
          provider,
        };

      case 'google-genai':
        return {
          maxTokens: 32768,
          supportsTools: true,
          supportsStreaming: true,
          provider,
        };

      case 'openrouter':
        return {
          maxTokens: 32768,
          supportsTools: true,
          supportsStreaming: true,
          provider,
        };

      case 'groq':
        return {
          maxTokens: 32768,
          supportsTools: true,
          supportsStreaming: true,
          provider,
        };

      case 'openai':
      default:
        if (modelStr.includes('gpt-4')) {
          return {
            maxTokens: 128000,
            supportsTools: true,
            supportsStreaming: true,
            provider,
          };
        }
        return {
          maxTokens: 16385,
          supportsTools: true,
          supportsStreaming: true,
          provider,
        };
    }
  }

  /**
   * Clear all cached LLM instances.
   */
  clearCache(): void {
    const cacheSize = this.llmCache.size;
    this.llmCache.clear();
    this.logger.log(`Cleared LLM cache (${cacheSize} instances)`);
  }

  /**
   * Return current cache statistics.
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.llmCache.size,
      keys: Array.from(this.llmCache.keys()),
    };
  }

  /**
   * Warm up the cache by pre-creating LLM instances for a list of model strings.
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
   * Verify LLM connectivity with a minimal test invocation.
   * Returns false (rather than throwing) when the provider is not configured.
   */
  async testLLM(config?: LlmConfig): Promise<boolean> {
    try {
      const model =
        config?.model ?? this.options.defaultLlm?.model ?? 'unknown';

      if (!this.validateModelConfig(config)) {
        this.logger.warn(
          `Skipping connectivity test — model=${model} not properly configured`
        );
        return false;
      }

      this.logger.debug(`Testing LLM connectivity: model=${model}`);
      const llm = await this.getLLM(config);

      const response = await llm.invoke([
        { role: 'user', content: 'Hello, respond with just "OK"' },
      ]);

      const success = response.content.toString().toLowerCase().includes('ok');
      this.logger.log(
        `LLM connectivity test ${success ? 'PASSED' : 'FAILED'} for model=${model}`
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
}
