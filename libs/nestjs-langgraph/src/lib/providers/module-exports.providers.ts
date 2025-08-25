import {
  LANGGRAPH_MODULE_OPTIONS,
  DEFAULT_LLM,
  TOOL_REGISTRY,
  // STREAM_MANAGER, // Removed - provided by streaming module when available
} from '../constants';

import {
  CORE_EXPORTS,
  STREAMING_EXPORTS,
  TOOL_EXPORTS,
  ROUTING_EXPORTS,
  HITL_EXPORTS,
  LLM_EXPORTS,
  INFRASTRUCTURE_EXPORTS,
} from './index';

import { ADAPTER_EXPORTS } from '../adapters';

/**
 * Create all module exports in one organized function
 * Following SOLID principles with single responsibility for export management
 */
export function createModuleExports(): any[] {
  return [
    // Core module tokens (only export tokens that have actual providers)
    LANGGRAPH_MODULE_OPTIONS,
    DEFAULT_LLM,
    // TOOL_REGISTRY, // Removed - no corresponding provider exists
    // STREAM_MANAGER, // Removed - no corresponding provider exists

    // Adapters for backward compatibility
    ...ADAPTER_EXPORTS,

    // All service exports
    ...CORE_EXPORTS,
    ...STREAMING_EXPORTS,
    ...TOOL_EXPORTS,
    ...ROUTING_EXPORTS,
    ...HITL_EXPORTS,
    ...LLM_EXPORTS,
    ...INFRASTRUCTURE_EXPORTS,
  ];
}
