import type { Provider } from '@nestjs/common';
import type { LangGraphModuleOptions } from '../interfaces/module-options.interface';
import { createAdapterProviders, createAdapterProvidersAsync } from './adapters';
import { TraceProvider } from './trace.provider';
import { MetricsProvider } from './metrics.provider';
import { WorkflowTestBuilder } from '../testing/workflow-test.builder';
import { MockAgentFactory } from '../testing/mock-agent.factory';

/**
 * Infrastructure service providers for the LangGraph module (sync)
 */
export function createInfrastructureProviders(
  options: LangGraphModuleOptions
): Provider[] {
  return [
    // Use modular adapter providers
    ...createAdapterProviders(options),
    // Keep unique providers
    TraceProvider,
    MetricsProvider,
    WorkflowTestBuilder,
    MockAgentFactory,
    // TODO: Re-enable when WorkflowRegistryService is implemented
    // {
    //   provide: WORKFLOW_REGISTRY,
    //   useClass: WorkflowRegistryService,
    // }
  ];
}

/**
 * Infrastructure service providers for the LangGraph module (async)
 */
export function createInfrastructureProvidersAsync(): Provider[] {
  return [
    // Use modular adapter providers
    ...createAdapterProvidersAsync(),
    // Keep unique providers
    TraceProvider,
    MetricsProvider,
    WorkflowTestBuilder,
    MockAgentFactory,
    // TODO: Re-enable when WorkflowRegistryService is implemented
    // {
    //   provide: WORKFLOW_REGISTRY,
    //   useClass: WorkflowRegistryService,
    // }
  ];
}

/**
 * Infrastructure service exports for the LangGraph module
 */
export const INFRASTRUCTURE_EXPORTS = [
  // Export unique services
  WorkflowTestBuilder,
  MockAgentFactory
];
