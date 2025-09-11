/**
 * Multi-agent module constants
 */
export const MULTI_AGENT_MODULE_OPTIONS = Symbol('MULTI_AGENT_MODULE_OPTIONS');

/**
 * Tool registry service token for dependency injection
 */
export const TOOL_REGISTRY = 'TOOL_REGISTRY';

/**
 * Default configuration values
 */
export const DEFAULT_MULTI_AGENT_OPTIONS = {
  defaultLlm: {
    provider: 'openai' as const,
    model: 'gpt-4',
    temperature: 0,
    maxTokens: 4000,
  },
  messageHistory: {
    maxMessages: 50,
    pruneStrategy: 'fifo' as const,
  },
  streaming: {
    enabled: false,
    modes: ['values'] as Array<'values' | 'updates' | 'messages'>,
  },
  debug: {
    enabled: false,
    logLevel: 'info' as const,
  },
  performance: {
    tokenOptimization: true,
    contextWindowManagement: true,
    enableMessageForwarding: true,
  },
  checkpointing: {
    enabled: true,
    enableForAllNetworks: true,
    defaultThreadPrefix: 'multi-agent',
  },
};
