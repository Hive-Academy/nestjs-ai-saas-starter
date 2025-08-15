/**
 * Adapter provider exports for clean module organization
 * Following SOLID principles with focused provider responsibilities
 */

export {
  createCheckpointAdapterProviders,
  createCheckpointAdapterProvidersAsync,
  CHECKPOINT_ADAPTER_EXPORTS,
} from './checkpoint-adapter.provider';

export {
  createMemoryAdapterProviders,
  createMemoryAdapterProvidersAsync,
  MEMORY_ADAPTER_EXPORTS,
} from './memory-adapter.provider';

export {
  createMultiAgentAdapterProviders,
  createMultiAgentAdapterProvidersAsync,
  MULTI_AGENT_ADAPTER_EXPORTS,
} from './multi-agent-adapter.provider';

// Combined provider factory
import type { LangGraphModuleOptions } from '../../interfaces/module-options.interface';
import { createCheckpointAdapterProviders, createCheckpointAdapterProvidersAsync } from './checkpoint-adapter.provider';
import { createMemoryAdapterProviders, createMemoryAdapterProvidersAsync } from './memory-adapter.provider';
import { createMultiAgentAdapterProviders, createMultiAgentAdapterProvidersAsync } from './multi-agent-adapter.provider';

/**
 * Create all adapter providers (sync)
 */
export function createAdapterProviders(options?: LangGraphModuleOptions) {
  return [
    ...createCheckpointAdapterProviders(options),
    ...createMemoryAdapterProviders(),
    ...createMultiAgentAdapterProviders(),
  ];
}

/**
 * Create all adapter providers (async)
 */
export function createAdapterProvidersAsync() {
  return [
    ...createCheckpointAdapterProvidersAsync(),
    ...createMemoryAdapterProvidersAsync(),
    ...createMultiAgentAdapterProvidersAsync(),
  ];
}

// Re-export actual adapter classes
import { CheckpointAdapter } from '../../adapters/checkpoint.adapter';
import { MemoryAdapter } from '../../adapters/memory.adapter';
import { MultiAgentAdapter } from '../../adapters/multi-agent.adapter';

/**
 * All adapter exports
 */
export const ADAPTER_EXPORTS = [
  CheckpointAdapter,
  MemoryAdapter,
  MultiAgentAdapter,
];