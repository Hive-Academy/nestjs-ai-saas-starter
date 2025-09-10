import {
  LANGGRAPH_MODULE_OPTIONS,
  DEFAULT_LLM,
  // STREAM_MANAGER, // Removed - provided by streaming module when available
} from '../constants';

// Import export arrays directly (these are just empty arrays for now)
const CORE_EXPORTS: any[] = [];
const STREAMING_EXPORTS: any[] = [];
const TOOL_EXPORTS: any[] = [];
const ROUTING_EXPORTS: any[] = [];
const HITL_EXPORTS: any[] = [];
const LLM_EXPORTS: any[] = [];
const INFRASTRUCTURE_EXPORTS: any[] = [];

// Adapter exports removed - child modules work directly
// Memory exports removed - using @hive-academy/langgraph-memory instead

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

    // Memory services removed - using @hive-academy/langgraph-memory instead

    // Adapters removed - child modules work directly through module loading

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
