import type { Provider } from '@nestjs/common';
import { CheckpointAdapter } from '../../adapters/checkpoint.adapter';
import { CHECKPOINT_SAVER, LANGGRAPH_MODULE_OPTIONS } from '../../constants';
import type { LangGraphModuleOptions } from '../../interfaces/module-options.interface';

/**
 * Checkpoint adapter provider configuration
 * Following SOLID principles with single responsibility for checkpoint adapter setup
 */
export function createCheckpointAdapterProviders(options?: LangGraphModuleOptions): Provider[] {
  const providers: Provider[] = [
    CheckpointAdapter,
  ];

  // Create checkpoint saver if configured (using adapter)
  if (options?.checkpoint?.enabled) {
    providers.push({
      provide: CHECKPOINT_SAVER,
      useFactory: async (adapter: CheckpointAdapter) => {
        return await adapter.create(options.checkpoint!);
      },
      inject: [CheckpointAdapter],
    });
  }

  return providers;
}

/**
 * Async checkpoint adapter provider configuration
 */
export function createCheckpointAdapterProvidersAsync(): Provider[] {
  return [
    CheckpointAdapter,
    {
      provide: CHECKPOINT_SAVER,
      useFactory: async (
        adapter: CheckpointAdapter,
        options: LangGraphModuleOptions
      ) => {
        if (options.checkpoint?.enabled) {
          return adapter.create(options.checkpoint);
        }
        return null;
      },
      inject: [CheckpointAdapter, LANGGRAPH_MODULE_OPTIONS],
    },
  ];
}

/**
 * Checkpoint adapter exports
 */
export const CHECKPOINT_ADAPTER_EXPORTS = [CheckpointAdapter];