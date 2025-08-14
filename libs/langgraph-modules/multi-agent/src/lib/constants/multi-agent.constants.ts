/**
 * Multi-agent module constants
 */
export const MULTI_AGENT_MODULE_OPTIONS = Symbol('MULTI_AGENT_MODULE_OPTIONS');

/**
 * Default configuration values
 */
export const DEFAULT_MULTI_AGENT_OPTIONS = {
  defaultLlm: {
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
    modes: ['values'] as const,
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
};