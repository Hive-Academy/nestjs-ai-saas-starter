import type { Provider } from '@nestjs/common';
import type { LangGraphModuleOptions } from '../interfaces/module-options.interface';
import { LLMProviderFactory } from './llm-provider.factory';
import { DEFAULT_LLM, LLM_PROVIDER_PREFIX } from '../constants';

/**
 * LLM service providers for the LangGraph module
 */
export function createLLMProviders(
  options: LangGraphModuleOptions
): Provider[] {
  const providers: Provider[] = [LLMProviderFactory];

  // Create default LLM provider
  if (options.defaultLLM) {
    providers.push({
      provide: DEFAULT_LLM,
      useFactory: (factory: LLMProviderFactory) => {
        return factory.create(options.defaultLLM!);
      },
      inject: [LLMProviderFactory],
    });
  }

  // Create named LLM providers
  if (options.providers) {
    Object.entries(options.providers).forEach(([name, config]) => {
      providers.push({
        provide: `${LLM_PROVIDER_PREFIX}${name.toUpperCase()}`,
        useFactory: (factory: LLMProviderFactory) => {
          return factory.create(config);
        },
        inject: [LLMProviderFactory],
      });
    });
  }

  return providers;
}

/**
 * LLM service exports for the LangGraph module
 */
export const LLM_EXPORTS = [LLMProviderFactory];
