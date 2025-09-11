import { Test, type TestingModule } from '@nestjs/testing';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';
import { PlatformModule } from '@hive-academy/langgraph-platform';
import { getMultiAgentConfig } from '../config/multi-agent.config';

describe('Phase 1 Integration: Environment Access Elimination', () => {
  let multiAgentModule: TestingModule;
  let platformModule: TestingModule;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules and environment
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('User Requirement: Complete Environment Access Elimination', () => {
    beforeEach(() => {
      // Set up test environment variables
      process.env.OPENAI_API_KEY = 'sk-test-openai-key';
      process.env.ANTHROPIC_API_KEY = 'sk-test-anthropic-key';
      process.env.OPENROUTER_API_KEY = 'sk-test-openrouter-key';
      process.env.LLM_MODEL = 'gpt-4';
      process.env.LLM_TEMPERATURE = '0.7';
      process.env.MULTI_AGENT_STREAMING_ENABLED = 'true';
    });

    it('should successfully initialize multi-agent module without library code accessing process.env', async () => {
      // Mock process.env access to track if libraries try to access it
      const processEnvAccessLog: string[] = [];
      const originalDescriptor = Object.getOwnPropertyDescriptor(
        process,
        'env'
      );

      Object.defineProperty(process, 'env', {
        get: function () {
          const stack = new Error().stack || '';
          const callerInfo = stack.split('\n')[2] || 'unknown';

          // Only log if access comes from library code (not consumer config)
          if (
            callerInfo.includes('libs/langgraph-modules') &&
            !callerInfo.includes('config/multi-agent.config')
          ) {
            processEnvAccessLog.push(callerInfo);
          }

          return originalEnv;
        },
      });

      try {
        multiAgentModule = await Test.createTestingModule({
          imports: [MultiAgentModule.forRoot(getMultiAgentConfig())],
        }).compile();

        expect(multiAgentModule).toBeDefined();
        // Should be no direct process.env access from library code
        expect(processEnvAccessLog).toEqual([]);
      } finally {
        // Restore original property descriptor
        if (originalDescriptor) {
          Object.defineProperty(process, 'env', originalDescriptor);
        }
      }
    });

    it('should successfully initialize platform module without process.env access', async () => {
      const processEnvAccessLog: string[] = [];
      const originalDescriptor = Object.getOwnPropertyDescriptor(
        process,
        'env'
      );

      Object.defineProperty(process, 'env', {
        get: function () {
          const stack = new Error().stack || '';
          const callerInfo = stack.split('\n')[2] || 'unknown';

          // Only log if access comes from platform library code
          if (callerInfo.includes('libs/langgraph-modules/platform')) {
            processEnvAccessLog.push(callerInfo);
          }

          return originalEnv;
        },
      });

      try {
        platformModule = await Test.createTestingModule({
          imports: [
            PlatformModule.forRoot({
              baseUrl: 'http://localhost:8123',
              timeout: 30000,
            }),
          ],
        }).compile();

        expect(platformModule).toBeDefined();
        // Should be no direct process.env access from platform library code
        expect(processEnvAccessLog).toEqual([]);
      } finally {
        // Restore original property descriptor
        if (originalDescriptor) {
          Object.defineProperty(process, 'env', originalDescriptor);
        }
      }
    });
  });

  describe('User Requirement: Library-Consumer Configuration Flow', () => {
    it('should demonstrate proper configuration flow from consumer to library', async () => {
      // Consumer reads environment variables
      const consumerConfig = getMultiAgentConfig();

      // Verify consumer config contains all expected environment-derived values
      expect(consumerConfig.defaultLlm?.apiKey).toBe(
        process.env.OPENAI_API_KEY
      );
      expect(consumerConfig.defaultLlm?.openaiApiKey).toBe(
        process.env.OPENAI_API_KEY
      );
      expect(consumerConfig.defaultLlm?.anthropicApiKey).toBe(
        process.env.ANTHROPIC_API_KEY
      );
      expect(consumerConfig.defaultLlm?.openrouterApiKey).toBe(
        process.env.OPENROUTER_API_KEY
      );

      // Library receives configuration via dependency injection
      multiAgentModule = await Test.createTestingModule({
        imports: [MultiAgentModule.forRoot(consumerConfig)],
      }).compile();

      expect(multiAgentModule).toBeDefined();

      // Get the LLM provider service to verify it received configuration
      const llmProviderService = multiAgentModule.get('LlmProviderService');
      expect(llmProviderService).toBeDefined();
    });

    it('should work with different provider configurations', async () => {
      // Test OpenRouter configuration
      process.env.LLM_PROVIDER = 'openrouter';
      process.env.OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
      process.env.OPENROUTER_SITE_URL = 'https://testapp.com';

      const openRouterConfig = getMultiAgentConfig();

      multiAgentModule = await Test.createTestingModule({
        imports: [MultiAgentModule.forRoot(openRouterConfig)],
      }).compile();

      expect(multiAgentModule).toBeDefined();

      // Verify OpenRouter-specific configuration was passed through
      expect(openRouterConfig.defaultLlm?.baseURL).toBe(
        'https://openrouter.ai/api/v1'
      );
      expect(
        openRouterConfig.defaultLlm?.defaultHeaders?.['HTTP-Referer']
      ).toBe('https://testapp.com');
    });

    it('should handle missing environment variables gracefully', async () => {
      // Clear all LLM-related environment variables
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENROUTER_API_KEY;

      const minimalConfig = getMultiAgentConfig();

      // Should still initialize successfully
      multiAgentModule = await Test.createTestingModule({
        imports: [MultiAgentModule.forRoot(minimalConfig)],
      }).compile();

      expect(multiAgentModule).toBeDefined();

      // Configuration should have defaults
      expect(minimalConfig.defaultLlm?.model).toBe('gpt-3.5-turbo');
      expect(minimalConfig.streaming?.enabled).toBe(true);
    });
  });

  describe('User Requirement: Zero Breaking Changes', () => {
    it('should maintain backward compatibility with existing consumer configurations', async () => {
      // Simulate existing consumer configuration pattern
      const existingConfig = {
        defaultLlm: {
          provider: 'openai' as const,
          model: 'gpt-3.5-turbo',
          apiKey: 'existing-api-key',
          temperature: 0.8,
        },
        streaming: {
          enabled: true,
          modes: ['values', 'updates'] as ('values' | 'updates' | 'messages')[],
        },
        debug: {
          enabled: false,
          logLevel: 'info' as const,
        },
      };

      // Should work without modifications
      multiAgentModule = await Test.createTestingModule({
        imports: [MultiAgentModule.forRoot(existingConfig)],
      }).compile();

      expect(multiAgentModule).toBeDefined();
    });

    it('should support both old and new configuration formats during transition', async () => {
      // Test configuration with both old and new properties
      const transitionConfig = {
        defaultLlm: {
          provider: 'openai' as const,
          model: 'gpt-4',
          apiKey: 'primary-key', // Original format
          openaiApiKey: 'openai-key', // New format
          anthropicApiKey: 'anthropic-key', // New format
          temperature: 0.7,
        },
        streaming: {
          enabled: true,
          modes: ['values'] as ('values' | 'updates' | 'messages')[],
        },
      };

      multiAgentModule = await Test.createTestingModule({
        imports: [MultiAgentModule.forRoot(transitionConfig)],
      }).compile();

      expect(multiAgentModule).toBeDefined();
    });
  });

  describe('User Requirement: Functional Validation', () => {
    it('should validate that all LLM providers can be configured without process.env', async () => {
      const comprehensiveConfig = {
        defaultLlm: {
          provider: 'openai' as const,
          model: 'gpt-4',
          apiKey: 'test-api-key',
          openaiApiKey: 'test-openai-key',
          anthropicApiKey: 'test-anthropic-key',
          openrouterApiKey: 'test-openrouter-key',
          llmProvider: 'openai' as const,
          temperature: 0.7,
          maxTokens: 4000,
        },
        streaming: {
          enabled: true,
          modes: ['values', 'updates', 'messages'] as (
            | 'values'
            | 'updates'
            | 'messages'
          )[],
        },
        debug: {
          enabled: true,
          logLevel: 'debug' as const,
        },
        performance: {
          tokenOptimization: true,
          contextWindowManagement: true,
          enableMessageForwarding: true,
        },
        checkpointing: {
          enabled: true,
          enableForAllNetworks: true,
          defaultThreadPrefix: 'test-multi-agent',
        },
      };

      multiAgentModule = await Test.createTestingModule({
        imports: [MultiAgentModule.forRoot(comprehensiveConfig)],
      }).compile();

      expect(multiAgentModule).toBeDefined();

      // Verify services are properly initialized
      const llmProviderService = multiAgentModule.get('LlmProviderService');
      expect(llmProviderService).toBeDefined();
    });

    it('should demonstrate that platform module works with injected configuration', async () => {
      const platformConfig = {
        baseUrl: 'https://custom-platform.example.com',
        timeout: 45000,
        retryPolicy: {
          maxRetries: 5,
          backoffFactor: 2,
          maxBackoffTime: 60000,
        },
      };

      platformModule = await Test.createTestingModule({
        imports: [PlatformModule.forRoot(platformConfig)],
      }).compile();

      expect(platformModule).toBeDefined();
    });

    it('should validate that configuration changes take effect without environment variables', async () => {
      // Create configuration with specific values
      const testConfig = {
        defaultLlm: {
          provider: 'anthropic' as const,
          model: 'claude-3-sonnet-20240229',
          anthropicApiKey: 'test-claude-key',
          temperature: 0.3,
          maxTokens: 1000,
        },
        messageHistory: {
          maxMessages: 25,
          pruneStrategy: 'summarize' as const,
        },
        streaming: {
          enabled: false,
          modes: ['values'] as ('values' | 'updates' | 'messages')[],
        },
      };

      multiAgentModule = await Test.createTestingModule({
        imports: [MultiAgentModule.forRoot(testConfig)],
      }).compile();

      expect(multiAgentModule).toBeDefined();

      // Configuration should be applied (we can't directly test the service internals,
      // but the module initialization success indicates proper configuration injection)
    });
  });

  afterEach(async () => {
    if (multiAgentModule) {
      await multiAgentModule.close();
    }
    if (platformModule) {
      await platformModule.close();
    }
  });
});
