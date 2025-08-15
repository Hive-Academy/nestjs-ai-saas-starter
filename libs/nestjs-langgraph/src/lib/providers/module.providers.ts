import type { Provider } from '@nestjs/common';
import type { LangGraphModuleOptions } from '../interfaces/module-options.interface';
import {
  LANGGRAPH_MODULE_OPTIONS,
  LANGGRAPH_MODULE_ID,
} from '../constants';

import {
  createCoreProviders,
  createStreamingProviders,
  createToolProviders,
  createRoutingProviders,
  createHITLProviders,
  createLLMProviders,
  createInfrastructureProviders,
  createInfrastructureProvidersAsync,
} from './index';

/**
 * Create all module providers in one organized function
 * Following SOLID principles with single responsibility for module setup
 */
export function createModuleProviders(
  options: LangGraphModuleOptions,
  moduleId: string
): Provider[] {
  const optionsProvider: Provider = {
    provide: LANGGRAPH_MODULE_OPTIONS,
    useValue: options,
  };

  const moduleIdProvider: Provider = {
    provide: LANGGRAPH_MODULE_ID,
    useValue: moduleId,
  };

  return [
    optionsProvider,
    moduleIdProvider,
    ...createCoreProviders(),
    ...createStreamingProviders(),
    ...createToolProviders(),
    ...createRoutingProviders(),
    ...createHITLProviders(),
    ...createLLMProviders(options),
    ...createInfrastructureProviders(options),
  ];
}

/**
 * Create all module providers for async configuration
 */
export function createModuleProvidersAsync(
  asyncProviders: Provider[],
  moduleId: string,
  options: { defaultLLM?: any } = {}
): Provider[] {
  const moduleIdProvider: Provider = {
    provide: LANGGRAPH_MODULE_ID,
    useValue: moduleId,
  };

  return [
    moduleIdProvider,
    ...asyncProviders,
    ...createCoreProviders(),
    ...createStreamingProviders(),
    ...createToolProviders(),
    ...createRoutingProviders(),
    ...createHITLProviders(),
    ...createLLMProviders(options),
    ...createInfrastructureProvidersAsync(),
  ];
}