import { getMultiAgentConfig } from './multi-agent.config';
import type { MultiAgentModuleOptions } from '@hive-academy/langgraph-multi-agent';

describe('Multi-Agent Configuration - Phase 1 Consumer Integration Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('User Requirement: Consumer App Handles All Environment Variable Reading', () => {
    it('should read OpenAI configuration from environment variables', () => {
      process.env.OPENAI_API_KEY = 'sk-test-openai-key';
      process.env.LLM_MODEL = 'gpt-4';
      process.env.LLM_TEMPERATURE = '0.5';
      process.env.LLM_MAX_TOKENS = '4000';

      const config = getMultiAgentConfig();

      expect(config.defaultLlm).toEqual(
        expect.objectContaining({
          model: 'gpt-4',
          apiKey: 'sk-test-openai-key',
          temperature: 0.5,
          maxTokens: 4000,
          openaiApiKey: 'sk-test-openai-key',
        })
      );
    });

    it('should read OpenRouter configuration from environment variables', () => {
      process.env.LLM_PROVIDER = 'openrouter';
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key';
      process.env.OPENROUTER_MODEL = 'meta-llama/llama-2-70b-chat';
      process.env.OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
      process.env.OPENROUTER_SITE_URL = 'https://myapp.com';
      process.env.OPENROUTER_APP_NAME = 'My Test App';
      process.env.OPENROUTER_TEMPERATURE = '0.8';
      process.env.OPENROUTER_MAX_TOKENS = '2048';

      const config = getMultiAgentConfig();

      expect(config.defaultLlm).toEqual(
        expect.objectContaining({
          model: 'meta-llama/llama-2-70b-chat',
          apiKey: 'sk-or-test-key',
          temperature: 0.8,
          maxTokens: 2048,
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': 'https://myapp.com',
            'X-Title': 'My Test App',
          },
          llmProvider: 'openrouter',
          openrouterApiKey: 'sk-or-test-key',
          openrouterBaseUrl: 'https://openrouter.ai/api/v1',
          openrouterSiteUrl: 'https://myapp.com',
          openrouterAppName: 'My Test App',
        })
      );
    });

    it('should read Anthropic configuration from environment variables', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
      process.env.LLM_PROVIDER = 'anthropic';

      const config = getMultiAgentConfig();

      expect(config.defaultLlm?.anthropicApiKey).toBe('sk-ant-test-key');
      expect(config.defaultLlm?.llmProvider).toBe('anthropic');
    });

    it('should provide all provider-specific configurations to library', () => {
      process.env.OPENAI_API_KEY = 'sk-openai-key';
      process.env.OPENROUTER_API_KEY = 'sk-or-key';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-key';
      process.env.LLM_PROVIDER = 'openai';

      const config = getMultiAgentConfig();

      // Consumer should provide ALL provider keys to library so library can choose
      expect(config.defaultLlm).toEqual(
        expect.objectContaining({
          openaiApiKey: 'sk-openai-key',
          openrouterApiKey: 'sk-or-key',
          anthropicApiKey: 'sk-ant-key',
          llmProvider: 'openai',
        })
      );
    });
  });

  describe('User Requirement: Comprehensive Module Configuration', () => {
    it('should configure message history from environment variables', () => {
      process.env.MULTI_AGENT_MAX_MESSAGES = '100';
      process.env.MULTI_AGENT_PRUNE_STRATEGY = 'summarize';

      const config = getMultiAgentConfig();

      expect(config.messageHistory).toEqual({
        maxMessages: 100,
        pruneStrategy: 'summarize',
      });
    });

    it('should configure streaming from environment variables', () => {
      process.env.MULTI_AGENT_STREAMING_ENABLED = 'true';

      const config = getMultiAgentConfig();

      expect(config.streaming).toEqual({
        enabled: true,
        modes: ['values', 'updates', 'messages'],
      });
    });

    it('should configure debug settings from environment variables', () => {
      process.env.NODE_ENV = 'development';
      process.env.MULTI_AGENT_LOG_LEVEL = 'debug';

      const config = getMultiAgentConfig();

      expect(config.debug).toEqual({
        enabled: true,
        logLevel: 'debug',
      });
    });

    it('should configure performance settings from environment variables', () => {
      process.env.MULTI_AGENT_OPTIMIZE_TOKENS = 'true';
      process.env.MULTI_AGENT_MANAGE_CONTEXT = 'true';
      process.env.MULTI_AGENT_ENABLE_FORWARDING = 'true';

      const config = getMultiAgentConfig();

      expect(config.performance).toEqual({
        tokenOptimization: true,
        contextWindowManagement: true,
        enableMessageForwarding: true,
      });
    });

    it('should configure checkpointing from environment variables', () => {
      process.env.MULTI_AGENT_CHECKPOINTING_ENABLED = 'true';
      process.env.MULTI_AGENT_CHECKPOINT_ALL_NETWORKS = 'true';
      process.env.MULTI_AGENT_CHECKPOINT_THREAD_PREFIX = 'test-prefix';

      const config = getMultiAgentConfig();

      expect(config.checkpointing).toEqual({
        enabled: true,
        enableForAllNetworks: true,
        defaultThreadPrefix: 'test-prefix',
      });
    });
  });

  describe('User Requirement: Provider Detection Logic', () => {
    it('should detect OpenRouter when LLM_PROVIDER is set to openrouter', () => {
      process.env.LLM_PROVIDER = 'openrouter';
      process.env.OPENROUTER_API_KEY = 'sk-or-key';

      const config = getMultiAgentConfig();

      expect(config.defaultLlm?.baseURL).toBe('https://openrouter.ai/api/v1');
      expect(config.defaultLlm?.defaultHeaders).toBeDefined();
      expect(config.defaultLlm?.defaultHeaders?.['HTTP-Referer']).toBe(
        'http://localhost:3000'
      );
      expect(config.defaultLlm?.defaultHeaders?.['X-Title']).toBe(
        'NestJS AI SaaS Starter'
      );
    });

    it('should detect OpenRouter when OPENROUTER_API_KEY is present without OPENAI_API_KEY', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-key';
      // No OPENAI_API_KEY set

      const config = getMultiAgentConfig();

      expect(config.defaultLlm?.baseURL).toBe('https://openrouter.ai/api/v1');
      expect(config.defaultLlm?.defaultHeaders).toBeDefined();
    });

    it('should not configure OpenRouter when OPENAI_API_KEY is present without explicit provider', () => {
      process.env.OPENAI_API_KEY = 'sk-openai-key';
      process.env.OPENROUTER_API_KEY = 'sk-or-key';
      // No explicit LLM_PROVIDER set

      const config = getMultiAgentConfig();

      expect(config.defaultLlm?.baseURL).toBeUndefined();
      expect(config.defaultLlm?.defaultHeaders).toBeUndefined();
    });
  });

  describe('User Requirement: Default Values and Fallbacks', () => {
    it('should provide sensible defaults when no environment variables are set', () => {
      // Clear all multi-agent related environment variables
      Object.keys(process.env).forEach((key) => {
        if (
          key.startsWith('MULTI_AGENT_') ||
          key.startsWith('LLM_') ||
          key.startsWith('OPENAI_') ||
          key.startsWith('OPENROUTER_') ||
          key.startsWith('ANTHROPIC_')
        ) {
          delete process.env[key];
        }
      });

      const config = getMultiAgentConfig();

      expect(config.defaultLlm?.model).toBe('gpt-3.5-turbo');
      expect(config.defaultLlm?.temperature).toBe(0.7);
      expect(config.defaultLlm?.maxTokens).toBe(2048);
      expect(config.messageHistory?.maxMessages).toBe(50);
      expect(config.messageHistory?.pruneStrategy).toBe('fifo');
      expect(config.streaming?.enabled).toBe(true);
      expect(config.streaming?.modes).toEqual([
        'values',
        'updates',
        'messages',
      ]);
      expect(config.debug?.enabled).toBe(false); // NODE_ENV not development
      expect(config.debug?.logLevel).toBe('info');
    });

    it('should handle missing API keys gracefully', () => {
      // Only set model, no API keys
      process.env.LLM_MODEL = 'gpt-4';

      const config = getMultiAgentConfig();

      expect(config.defaultLlm?.model).toBe('gpt-4');
      expect(config.defaultLlm?.apiKey).toBeUndefined();
      expect(config.defaultLlm?.openaiApiKey).toBeUndefined();
      expect(config.defaultLlm?.openrouterApiKey).toBeUndefined();
      expect(config.defaultLlm?.anthropicApiKey).toBeUndefined();
    });

    it('should handle numeric environment variables with proper parsing', () => {
      process.env.LLM_TEMPERATURE = '0.95';
      process.env.LLM_MAX_TOKENS = '8192';
      process.env.MULTI_AGENT_MAX_MESSAGES = '200';
      process.env.MULTI_AGENT_MAX_CONCURRENT = '5';
      process.env.MULTI_AGENT_EXECUTION_TIMEOUT = '600000';
      process.env.MULTI_AGENT_RETRY_ATTEMPTS = '5';

      const config = getMultiAgentConfig();

      expect(config.defaultLlm?.temperature).toBe(0.95);
      expect(config.defaultLlm?.maxTokens).toBe(8192);
      expect(config.messageHistory?.maxMessages).toBe(200);
    });

    it('should handle boolean environment variables with proper parsing', () => {
      process.env.MULTI_AGENT_STREAMING_ENABLED = 'false';
      process.env.MULTI_AGENT_DEBUG_ENABLED = 'true';
      process.env.MULTI_AGENT_OPTIMIZE_TOKENS = 'false';
      process.env.MULTI_AGENT_CHECKPOINTING_ENABLED = 'false';

      const config = getMultiAgentConfig();

      expect(config.streaming?.enabled).toBe(false);
      expect(config.debug?.enabled).toBe(true);
      expect(config.performance?.tokenOptimization).toBe(false);
      expect(config.checkpointing?.enabled).toBe(false);
    });
  });

  describe('User Requirement: Configuration Type Safety', () => {
    it('should return properly typed MultiAgentModuleOptions', () => {
      const config = getMultiAgentConfig();

      // Type assertions to ensure proper typing
      expect(config).toEqual(expect.any(Object));
      expect(config.defaultLlm).toEqual(expect.any(Object));
      expect(config.messageHistory).toEqual(expect.any(Object));
      expect(config.streaming).toEqual(expect.any(Object));
      expect(config.debug).toEqual(expect.any(Object));
      expect(config.performance).toEqual(expect.any(Object));
      expect(config.checkpointing).toEqual(expect.any(Object));
    });

    it('should satisfy MultiAgentModuleOptions interface constraints', () => {
      const config: MultiAgentModuleOptions = getMultiAgentConfig();

      // Should compile without type errors and have required structure
      expect(config).toBeDefined();
      if (config.defaultLlm) {
        expect(typeof config.defaultLlm.model).toBe('string');
      }
      if (config.streaming) {
        expect(typeof config.streaming.enabled).toBe('boolean');
      }
    });
  });
});
