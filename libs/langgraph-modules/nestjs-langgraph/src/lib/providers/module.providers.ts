import type { Provider } from '@nestjs/common';
import type { LangGraphModuleOptions } from '../interfaces/module-options.interface';
import { LANGGRAPH_MODULE_OPTIONS, LANGGRAPH_MODULE_ID } from '../constants';

import { createLLMProviders } from './llm.providers';
import {
  createInfrastructureProviders,
  createInfrastructureProvidersAsync,
} from './infrastructure.providers';

// Adapter providers removed - child modules work directly through module loading

// Memory providers removed - using @hive-academy/langgraph-memory instead

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
    ...createLLMProviders(options),
    ...createInfrastructureProviders(options),
    // Memory providers removed - using @hive-academy/langgraph-memory instead
    // Adapter providers removed - child modules work directly through module loading
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
    ...createLLMProviders(options),
    ...createInfrastructureProvidersAsync(),
    // Memory providers removed - using @hive-academy/langgraph-memory instead
    // Adapter providers removed - child modules work directly through module loading
  ];
}
