import type { Provider } from '@nestjs/common';
import { MemoryAdapter } from './memory.adapter';

/**
 * Memory adapter provider configuration
 * Following SOLID principles with single responsibility for memory adapter setup
 */
export function createMemoryAdapterProviders(): Provider[] {
  return [
    MemoryAdapter,
  ];
}

/**
 * Async memory adapter provider configuration
 */
export function createMemoryAdapterProvidersAsync(): Provider[] {
  return [
    MemoryAdapter,
  ];
}

/**
 * Memory adapter exports
 */
export const MEMORY_ADAPTER_EXPORTS = [MemoryAdapter];
