import type { MultiAgentModuleOptions } from '../../interfaces/multi-agent/multi-agent.interface';
import { DEFAULT_MULTI_AGENT_OPTIONS } from '../../constants/multi-agent/multi-agent.constants';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';

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
 * Get stored multi-agent module configuration
 * Returns the config passed to MultiAgentModule.forRoot()
 */
export function getMultiAgentModuleConfig(): MultiAgentModuleOptions {
  return storedMultiAgentConfig;
}

/**
 * Get multi-agent config with safe defaults
 * Used by decorators to inherit module configuration
 */
export function getMultiAgentConfigWithDefaults(): Omit<
  Required<MultiAgentModuleOptions>,
  'checkpointer'
> & {
  checkpointer?: BaseCheckpointSaver;
} {
  const config = getMultiAgentModuleConfig();

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
    checkpointer: config.checkpointer,
  };
}
