import {
  LANGGRAPH_MODULE_OPTIONS,
  DEFAULT_LLM,
  TOOL_REGISTRY,
  STREAM_MANAGER,
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

import { ADAPTER_EXPORTS } from './adapters';

/**
 * Create all module exports in one organized function
 * Following SOLID principles with single responsibility for export management
 */
export function createModuleExports(): any[] {
  return [
    // Core module tokens
    LANGGRAPH_MODULE_OPTIONS,
    DEFAULT_LLM,
    TOOL_REGISTRY,
    STREAM_MANAGER,
    
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