import type { MultiAgentModuleOptions } from '../interfaces/multi-agent.interface';
import { DEFAULT_MULTI_AGENT_OPTIONS } from '../constants/multi-agent.constants';

/**
 * Global storage for multi-agent module configuration
 * Set when MultiAgentModule.forRoot() is called
 */
let storedMultiAgentConfig: MultiAgentModuleOptions = {};

/**
 * Store multi-agent configuration for decorator access
 * Called by MultiAgentModule.forRoot()
 */
export function setMultiAgentConfig(config: MultiAgentModuleOptions): void {
  storedMultiAgentConfig = { ...config };
}

/**
 * Get stored multi-agent configuration for decorators
 * Returns the config passed to MultiAgentModule.forRoot()
 */
export function getMultiAgentConfig(): MultiAgentModuleOptions {
  return storedMultiAgentConfig;
}

/**
 * Get multi-agent config with safe defaults
 * Used by decorators to inherit module configuration
 */
export function getMultiAgentConfigWithDefaults(): Required<MultiAgentModuleOptions> {
  const config = getMultiAgentConfig();

  return {
    defaultLlm: {
      ...DEFAULT_MULTI_AGENT_OPTIONS.defaultLlm,
      ...config.defaultLlm,
    },
    messageHistory: {
      ...DEFAULT_MULTI_AGENT_OPTIONS.messageHistory,
      ...config.messageHistory,
    },
    streaming: {
      ...DEFAULT_MULTI_AGENT_OPTIONS.streaming,
      ...config.streaming,
    },
    debug: {
      ...DEFAULT_MULTI_AGENT_OPTIONS.debug,
      ...config.debug,
    },
    performance: {
      ...DEFAULT_MULTI_AGENT_OPTIONS.performance,
      ...config.performance,
    },
    checkpointing: {
      ...DEFAULT_MULTI_AGENT_OPTIONS.checkpointing,
      ...config.checkpointing,
    },
    tools: config.tools || [],
    agents: config.agents || [],
    workflows: config.workflows || [],
    checkpointAdapter: config.checkpointAdapter || undefined,
  };
}
