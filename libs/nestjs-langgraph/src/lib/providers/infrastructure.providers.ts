import type { Provider } from '@nestjs/common';
import type { LangGraphModuleOptions } from '../interfaces/module-options.interface';
import { CheckpointProvider } from './checkpoint.provider';
import { MemoryProvider } from './memory.provider';
import { TraceProvider } from './trace.provider';
import { MetricsProvider } from './metrics.provider';
import { WorkflowTestBuilder } from '../testing/workflow-test.builder';
import { MockAgentFactory } from '../testing/mock-agent.factory';
import { CHECKPOINT_SAVER, LANGGRAPH_MODULE_OPTIONS } from '../constants';

/**
 * Infrastructure service providers for the LangGraph module (sync)
 */
export function createInfrastructureProviders(
  options: LangGraphModuleOptions
): Provider[] {
  const providers: Provider[] = [
    CheckpointProvider,
    MemoryProvider,
    TraceProvider,
    MetricsProvider,
    WorkflowTestBuilder,
    MockAgentFactory,
  ];

  // Create checkpoint saver if configured
  if (options.checkpoint?.enabled) {
    providers.push({
      provide: CHECKPOINT_SAVER,
      useFactory: async () => {
        const provider = new CheckpointProvider();
        return await provider.create(options.checkpoint!);
      },
    });
  }

  // Create workflow registry
  // TODO: Re-enable when WorkflowRegistryService is implemented
  // providers.push({
  //   provide: WORKFLOW_REGISTRY,
  //   useClass: WorkflowRegistryService,
  // });

  return providers;
}

/**
 * Infrastructure service providers for the LangGraph module (async)
 */
export function createInfrastructureProvidersAsync(): Provider[] {
  return [
    CheckpointProvider,
    MemoryProvider,
    TraceProvider,
    MetricsProvider,
    WorkflowTestBuilder,
    MockAgentFactory,
    {
      provide: CHECKPOINT_SAVER,
      useFactory: async (
        provider: CheckpointProvider,
        options: LangGraphModuleOptions
      ) => {
        if (options.checkpoint?.enabled) {
          return provider.create(options.checkpoint);
        }
        return null;
      },
      inject: [CheckpointProvider, LANGGRAPH_MODULE_OPTIONS],
    },
    // TODO: Re-enable when WorkflowRegistryService is implemented
    // {
    //   provide: WORKFLOW_REGISTRY,
    //   useClass: WorkflowRegistryService,
    // },
  ];
}

/**
 * Infrastructure service exports for the LangGraph module
 */
export const INFRASTRUCTURE_EXPORTS = [WorkflowTestBuilder, MockAgentFactory];
