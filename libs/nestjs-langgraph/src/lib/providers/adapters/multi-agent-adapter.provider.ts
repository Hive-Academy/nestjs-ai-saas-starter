import type { Provider } from '@nestjs/common';
import { MultiAgentAdapter } from '../../adapters/multi-agent.adapter';

/**
 * Multi-agent adapter provider configuration
 * Following SOLID principles with single responsibility for multi-agent adapter setup
 */
export function createMultiAgentAdapterProviders(): Provider[] {
  return [
    MultiAgentAdapter,
  ];
}

/**
 * Async multi-agent adapter provider configuration
 */
export function createMultiAgentAdapterProvidersAsync(): Provider[] {
  return [
    MultiAgentAdapter,
  ];
}

/**
 * Multi-agent adapter exports
 */
export const MULTI_AGENT_ADAPTER_EXPORTS = [MultiAgentAdapter];