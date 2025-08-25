/**
 * Core constants shared across all langgraph modules
 */

// Module tokens
export const LANGGRAPH_MODULE_OPTIONS = 'LANGGRAPH_MODULE_OPTIONS';
export const LANGGRAPH_MODULE_ID = 'LANGGRAPH_MODULE_ID';

// Default configuration values
export const DEFAULT_CONFIG = {
  MAX_CACHE_SIZE: 100,
  CACHE_TTL: 3600000, // 1 hour
  DEFAULT_TIMEOUT: 30000,
} as const;
