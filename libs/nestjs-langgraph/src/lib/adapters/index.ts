/**
 * Adapter exports for clean integration with enterprise modules
 *
 * These adapters follow the Adapter pattern to bridge the main NestJS LangGraph
 * library with specialized enterprise modules while maintaining backward compatibility.
 */

// Adapter foundation interfaces and base classes
export {
  type IModuleAdapter,
  type ICreatableAdapter,
  type IExecutableAdapter,
  type IStreamableAdapter,
  type ICleanableAdapter,
  type IFullAdapter,
  type AdapterStatus,
  type BaseAdapterStatus,
  type ExtendedAdapterStatus,
} from './interfaces/adapter.interface';

export { BaseModuleAdapter } from './base/base.adapter';

// Concrete adapter implementations
export {
  CheckpointAdapter,
  createCheckpointProvider,
} from './checkpoint.adapter';
export { MemoryAdapter, type MemoryConfig } from './memory.adapter';
export {
  MultiAgentAdapter,
  type MultiAgentConfig,
  type MultiAgentResult,
} from './multi-agent.adapter';
export {
  HitlAdapter,
  createHitlProvider,
  type HitlConfig,
  type HitlResult,
} from './hitl.adapter';
export {
  StreamingAdapter,
  createStreamingProvider,
  type StreamingConfig,
  type StreamingResult,
} from './streaming.adapter';
export {
  FunctionalApiAdapter,
  createFunctionalApiProvider,
  type FunctionalApiConfig,
  type FunctionalApiResult,
} from './functional-api.adapter';
export {
  PlatformAdapter,
  createPlatformProvider,
  type PlatformConfig,
  type PlatformResult,
} from './platform.adapter';
export {
  TimeTravelAdapter,
  createTimeTravelProvider,
  type TimeTravelConfig,
  type TimeTravelResult,
} from './time-travel.adapter';
export {
  MonitoringAdapter,
  createMonitoringProvider,
  type MonitoringConfig,
  type MonitoringResult,
} from './monitoring.adapter';
export {
  WorkflowEngineAdapter,
  createWorkflowEngineProvider,
  type WorkflowEngineConfig,
  type WorkflowEngineResult,
} from './workflow-engine.adapter';

// Re-export for backward compatibility
export { CheckpointAdapter as CheckpointProvider } from './checkpoint.adapter';
export { MemoryAdapter as MemoryProvider } from './memory.adapter';
export { MultiAgentAdapter as MultiAgentCoordinator } from './multi-agent.adapter';
export { HitlAdapter as HitlProvider } from './hitl.adapter';
export { StreamingAdapter as StreamingProvider } from './streaming.adapter';
export { FunctionalApiAdapter as FunctionalApiProvider } from './functional-api.adapter';
export { PlatformAdapter as PlatformProvider } from './platform.adapter';
export { TimeTravelAdapter as TimeTravelProvider } from './time-travel.adapter';
export { MonitoringAdapter as MonitoringProvider } from './monitoring.adapter';
export { WorkflowEngineAdapter as WorkflowEngineProvider } from './workflow-engine.adapter';

/**
 * Adapter provider exports for clean module organization
 * Following SOLID principles with focused provider responsibilities
 */

export {
  CHECKPOINT_ADAPTER_EXPORTS,
  createCheckpointAdapterProviders,
  createCheckpointAdapterProvidersAsync,
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
import {
  createCheckpointAdapterProviders,
  createCheckpointAdapterProvidersAsync,
} from './checkpoint-adapter.provider';
import {
  createMemoryAdapterProviders,
  createMemoryAdapterProvidersAsync,
} from './memory-adapter.provider';
import {
  createMultiAgentAdapterProviders,
  createMultiAgentAdapterProvidersAsync,
} from './multi-agent-adapter.provider';
import type { LangGraphModuleOptions } from '../interfaces/module-options.interface';

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
import { CheckpointAdapter } from './checkpoint.adapter';
import { MemoryAdapter } from './memory.adapter';
import { MultiAgentAdapter } from './multi-agent.adapter';
import { HitlAdapter } from './hitl.adapter';
import { StreamingAdapter } from './streaming.adapter';
import { FunctionalApiAdapter } from './functional-api.adapter';
import { PlatformAdapter } from './platform.adapter';
import { TimeTravelAdapter } from './time-travel.adapter';
import { MonitoringAdapter } from './monitoring.adapter';
import { WorkflowEngineAdapter } from './workflow-engine.adapter';

/**
 * All adapter exports
 */
export const ADAPTER_EXPORTS = [
  CheckpointAdapter,
  MemoryAdapter,
  MultiAgentAdapter,
  HitlAdapter,
  StreamingAdapter,
  FunctionalApiAdapter,
  PlatformAdapter,
  TimeTravelAdapter,
  MonitoringAdapter,
  WorkflowEngineAdapter,
];
