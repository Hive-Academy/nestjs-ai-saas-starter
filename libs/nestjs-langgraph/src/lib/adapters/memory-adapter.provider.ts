import type { Provider } from '@nestjs/common';
import { MemoryAdapter } from './memory.adapter';
import { MemoryFacadeService } from '../memory/services/memory-facade.service';
import { DatabaseProviderFactory } from '../memory/providers/database-provider.factory';

/**
 * Enhanced memory adapter provider configuration
 * Uses direct service injection instead of bridge pattern
 */
export function createMemoryAdapterProviders(): Provider[] {
  return [
    MemoryAdapter,
    // Direct service providers - no bridge needed
  ];
}

/**
 * Memory adapter providers with memory services
 * Includes the migrated memory services for full functionality
 */
export function createMemoryAdapterProvidersWithServices(): Provider[] {
  return [
    MemoryAdapter,
    MemoryFacadeService,
    DatabaseProviderFactory,
  ];
}

/**
 * Async memory adapter provider configuration
 */
export function createMemoryAdapterProvidersAsync(): Provider[] {
  return [MemoryAdapter];
}

/**
 * Memory adapter exports
 */
export const MEMORY_ADAPTER_EXPORTS = [
  MemoryAdapter,
  MemoryFacadeService,
  DatabaseProviderFactory,
];
