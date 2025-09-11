import { Test, type TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { LlmProviderService } from './llm-provider.service';
import { MULTI_AGENT_MODULE_OPTIONS } from '../constants/multi-agent.constants';
import type { MultiAgentModuleOptions } from '../interfaces/multi-agent.interface';

describe('LlmProviderService - Phase 1 Configuration Injection Tests', () => {
  let service: LlmProviderService;

  const createTestModule = async (options: MultiAgentModuleOptions) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmProviderService,
        {
          provide: MULTI_AGENT_MODULE_OPTIONS,
          useValue: options,
        },
      ],
    }).compile();

    return module.get<LlmProviderService>(LlmProviderService);
  };

  describe('User Requirement: Zero Direct Process.env Access', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Clear environment variables to ensure service doesn't depend on them
      process.env = {};
    });

    afterEach(() => {
      // Restore original environment
      process.env = originalEnv;
    });

    it('should create LLM service without accessing process.env directly', async () => {
      const mockOptions: MultiAgentModuleOptions = {
        defaultLlm: {
          model: 'gpt-3.5-turbo',
          apiKey: 'test-api-key',
          temperature: 0.7,
        },
      };

      // Create service and verify it works without process.env access
      service = await createTestModule(mockOptions);
      expect(service).toBeDefined();
    });

    it('should validate model config using only injected configuration', async () => {
      const mockOptions: MultiAgentModuleOptions = {
        defaultLlm: {
          model: 'gpt-4',
          apiKey: 'test-openai-key',
          temperature: 0.5,
        },
      };

      service = await createTestModule(mockOptions);
      const isValid = service.validateModelConfig();
      expect(isValid).toBe(true);
    });

    it('should handle OpenAI configuration through injected options only', async () => {
      const mockOptions: MultiAgentModuleOptions = {
        defaultLlm: {
          model: 'gpt-4',
          openaiApiKey: 'test-openai-key',
          temperature: 0.7,
          maxTokens: 2000,
        },
      };

      service = await createTestModule(mockOptions);

      // Should validate successfully using only injected config
      const isValid = service.validateModelConfig({ model: 'gpt-4' });
      expect(isValid).toBe(true);
    });

    it('should handle Anthropic configuration through injected options only', async () => {
      const mockOptions: MultiAgentModuleOptions = {
        defaultLlm: {
          model: 'claude-3-sonnet-20240229',
          anthropicApiKey: 'test-anthropic-key',
          temperature: 0.5,
        },
      };

      service = await createTestModule(mockOptions);

      const isValid = service.validateModelConfig({
        model: 'claude-3-sonnet-20240229',
      });
      expect(isValid).toBe(true);
    });

    it('should handle OpenRouter configuration through injected options only', async () => {
      const mockOptions: MultiAgentModuleOptions = {
        defaultLlm: {
          model: 'meta-llama/llama-2-70b-chat',
          openrouterApiKey: 'test-openrouter-key',
          llmProvider: 'openrouter',
          openrouterBaseUrl: 'https://openrouter.ai/api/v1',
          openrouterSiteUrl: 'http://localhost:3000',
          openrouterAppName: 'Test App',
          temperature: 0.8,
        },
      };

      service = await createTestModule(mockOptions);

      const isValid = service.validateModelConfig({
        model: 'meta-llama/llama-2-70b-chat',
      });
      expect(isValid).toBe(true);
    });
  });

  describe('User Requirement: Preserve All LLM Functionality', () => {
    it('should support multiple API key configurations', async () => {
      const mockOptions: MultiAgentModuleOptions = {
        defaultLlm: {
          model: 'gpt-4',
          apiKey: 'primary-key',
          openaiApiKey: 'openai-specific-key',
          openrouterApiKey: 'openrouter-key',
          anthropicApiKey: 'anthropic-key',
        },
      };

      service = await createTestModule(mockOptions);

      // Should use API key priority from configuration
      const capabilities = service.getModelCapabilities('gpt-4');
      expect(capabilities.provider).toBe('openai');
      expect(capabilities.supportsTools).toBe(true);
      expect(capabilities.supportsStreaming).toBe(true);
    });

    it('should provide correct model capabilities for different providers', async () => {
      const mockOptions: MultiAgentModuleOptions = {
        defaultLlm: {
          model: 'gpt-4',
          apiKey: 'test-key',
        },
      };

      service = await createTestModule(mockOptions);

      // Test OpenAI capabilities
      const gpt4Capabilities = service.getModelCapabilities('gpt-4');
      expect(gpt4Capabilities).toEqual({
        maxTokens: 128000,
        supportsTools: true,
        supportsStreaming: true,
        provider: 'openai',
      });

      // Test Anthropic capabilities
      const claudeCapabilities = service.getModelCapabilities(
        'claude-3-sonnet-20240229'
      );
      expect(claudeCapabilities).toEqual({
        maxTokens: 200000,
        supportsTools: true,
        supportsStreaming: true,
        provider: 'anthropic',
      });
    });

    it('should correctly identify supported providers', async () => {
      const mockOptions: MultiAgentModuleOptions = {
        defaultLlm: {
          model: 'gpt-4',
          apiKey: 'test-key',
        },
      };

      service = await createTestModule(mockOptions);

      const supportedProviders = service.getSupportedProviders();
      expect(supportedProviders).toEqual(['openai', 'anthropic']);
    });

    it('should handle streaming configuration from module options', async () => {
      const mockOptions: MultiAgentModuleOptions = {
        defaultLlm: {
          model: 'gpt-4',
          apiKey: 'test-key',
        },
        streaming: {
          enabled: true,
          modes: ['values', 'updates'],
        },
      };

      service = await createTestModule(mockOptions);
      expect(service).toBeDefined();
    });
  });

  describe('User Requirement: Configuration Validation', () => {
    it('should reject configuration missing required API keys', async () => {
      const mockOptions: MultiAgentModuleOptions = {
        defaultLlm: {
          model: 'gpt-4',
          // No API key provided
        },
      };

      service = await createTestModule(mockOptions);

      const isValid = service.validateModelConfig({ model: 'gpt-4' });
      expect(isValid).toBe(false);
    });

    it('should reject Anthropic models without Anthropic API key', async () => {
      const mockOptions: MultiAgentModuleOptions = {
        defaultLlm: {
          model: 'claude-3-sonnet-20240229',
          openaiApiKey: 'openai-key-but-no-anthropic',
        },
      };

      service = await createTestModule(mockOptions);

      const isValid = service.validateModelConfig({
        model: 'claude-3-sonnet-20240229',
      });
      expect(isValid).toBe(false);
    });

    it('should handle graceful fallbacks to default model', async () => {
      const mockOptions: MultiAgentModuleOptions = {
        defaultLlm: {
          model: 'gpt-4',
          apiKey: 'test-key',
        },
      };

      service = await createTestModule(mockOptions);

      // Should allow default fallback when no model specified
      const isValid = service.validateModelConfig();
      expect(isValid).toBe(true);
    });
  });

  describe('User Requirement: Cache and Performance Features', () => {
    beforeEach(async () => {
      const mockOptions: MultiAgentModuleOptions = {
        defaultLlm: {
          model: 'gpt-3.5-turbo',
          apiKey: 'test-key',
          temperature: 0.7,
        },
      };

      service = await createTestModule(mockOptions);
    });

    it('should provide cache management functionality', () => {
      const initialStats = service.getCacheStats();
      expect(initialStats.size).toBe(0);
      expect(initialStats.keys).toEqual([]);

      service.clearCache();

      const clearedStats = service.getCacheStats();
      expect(clearedStats.size).toBe(0);
    });

    it('should support preloading models with configuration', async () => {
      const preloadPromise = service.preloadModels(['gpt-3.5-turbo', 'gpt-4']);
      await expect(preloadPromise).resolves.toBeUndefined();
    });
  });

  describe('User Requirement: Error Handling Without Environment Dependencies', () => {
    it('should handle missing configuration gracefully', async () => {
      const mockOptions: MultiAgentModuleOptions = {
        // Minimal configuration
      };

      service = await createTestModule(mockOptions);
      expect(service).toBeDefined();

      // Should handle validation of missing config
      const isValid = service.validateModelConfig({ model: 'gpt-4' });
      expect(isValid).toBe(false);
    });

    it('should provide clear error messages for missing API keys', async () => {
      const mockOptions: MultiAgentModuleOptions = {
        defaultLlm: {
          model: 'claude-3-sonnet-20240229',
          // No Anthropic API key
        },
      };

      service = await createTestModule(mockOptions);

      // Mock logger to capture warning messages
      const loggerWarnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();

      const isValid = service.validateModelConfig({
        model: 'claude-3-sonnet-20240229',
      });
      expect(isValid).toBe(false);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'requires Anthropic API key - configure anthropicApiKey in module options'
        )
      );

      loggerWarnSpy.mockRestore();
    });

    it('should handle test connectivity without environment variables', async () => {
      const mockOptions: MultiAgentModuleOptions = {
        defaultLlm: {
          model: 'gpt-4',
          // No API keys configured
        },
      };

      service = await createTestModule(mockOptions);

      // Mock logger to avoid actual API calls
      const loggerWarnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();

      const testResult = await service.testLLM();
      expect(testResult).toBe(false);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No LLM API keys configured in module options')
      );

      loggerWarnSpy.mockRestore();
    });
  });
});
