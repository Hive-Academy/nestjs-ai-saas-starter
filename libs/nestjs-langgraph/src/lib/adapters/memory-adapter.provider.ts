import type { Provider } from '@nestjs/common';
import { MemoryAdapter } from './memory.adapter';
import {
  MEMORY_ADAPTER_FACADE_TOKEN,
  MEMORY_CORE_SERVICE_TOKEN,
} from '../constants/memory-adapter.constants';

/**
 * Memory adapter provider configuration
 * Following SOLID principles with single responsibility for memory adapter setup
 */
export function createMemoryAdapterProviders(): Provider[] {
  return [
    MemoryAdapter,
    // These providers will be satisfied by the AgenticMemoryModule when imported
    // The module exports MemoryFacadeService which implements IMemoryAdapterFacade
  ];
}

/**
 * Create providers that bridge to the AgenticMemoryModule
 * This allows the memory adapter to work with the enterprise memory system
 * Async memory adapter provider configuration
 */
export function createMemoryBridgeProviders(): Provider[] {
  return [
    {
      provide: 'MEMORY_ADAPTER_FACADE_SERVICE',
      useFactory: (memoryFacade: any) => {
        // The memoryFacade from AgenticMemoryModule will be injected here
        return memoryFacade;
      },
      inject: ['MemoryFacadeService'], // This comes from AgenticMemoryModule exports
    },
    {
      provide: MEMORY_ADAPTER_FACADE_TOKEN,
      useFactory: (memoryFacade: any) => {
        // The memoryFacade from AgenticMemoryModule will be injected here
        return memoryFacade;
      },
      inject: ['MemoryFacadeService'], // This comes from AgenticMemoryModule exports
    },
    MemoryAdapter,
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
export const MEMORY_ADAPTER_EXPORTS = [MemoryAdapter];
