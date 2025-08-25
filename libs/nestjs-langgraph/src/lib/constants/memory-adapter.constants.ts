/**
 * Constants for memory adapter integration
 * Using Symbol tokens for type-safe dependency injection
 */

// Memory adapter facade token for Symbol-based injection
export const MEMORY_ADAPTER_FACADE_TOKEN = Symbol('MEMORY_ADAPTER_FACADE');

// Memory core service token for Symbol-based injection
export const MEMORY_CORE_SERVICE_TOKEN = Symbol('MEMORY_CORE_SERVICE');

// String-based tokens for backward compatibility
export const MEMORY_ADAPTER_FACADE_STRING_TOKEN =
  'MEMORY_ADAPTER_FACADE_SERVICE';
export const MEMORY_CORE_SERVICE_STRING_TOKEN = 'MemoryCoreService';
