import type { Provider } from '@nestjs/common';
import type { LangGraphModuleOptions } from '../interfaces/module-options.interface';
import { createAdapterProviders, createAdapterProvidersAsync } from './adapters';

/**
 * Infrastructure service providers for the LangGraph module (sync)
 */
export function createInfrastructureProviders(
  options: LangGraphModuleOptions
): Provider[] {
  return [
    // Use modular adapter providers
    ...createAdapterProviders(options),
    // TODO: Add testing utilities when implemented
    // WorkflowTestBuilder,
    // MockAgentFactory,
  ];
}

/**
 * Infrastructure service providers for the LangGraph module (async)
 */
export function createInfrastructureProvidersAsync(): Provider[] {
  return [
    // Use modular adapter providers
    ...createAdapterProvidersAsync(),
    // TODO: Add testing utilities when implemented
    // WorkflowTestBuilder,
    // MockAgentFactory,
  ];
}

/**
 * Infrastructure service exports for the LangGraph module
 */
export const INFRASTRUCTURE_EXPORTS = [
  // TODO: Export testing utilities when implemented
  // WorkflowTestBuilder,
  // MockAgentFactory
];
