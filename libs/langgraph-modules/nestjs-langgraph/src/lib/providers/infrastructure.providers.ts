import type { Provider } from '@nestjs/common';
import type { LangGraphModuleOptions } from '../interfaces/module-options.interface';
// Adapter providers removed - child modules work directly through module loading

/**
 * Infrastructure service providers for the LangGraph module (sync)
 */
export function createInfrastructureProviders(
  options: LangGraphModuleOptions
): Provider[] {
  return [
    // Infrastructure providers simplified - adapters removed
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
    // Infrastructure providers simplified - adapters removed
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
