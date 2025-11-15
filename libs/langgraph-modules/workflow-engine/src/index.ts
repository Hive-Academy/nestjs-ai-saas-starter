// ============================================================================
// CONSOLIDATED LANGGRAPH WORKFLOW ENGINE
// ============================================================================
// This package consolidates functional-api, workflow-engine, and multi-agent
// into a single unified package for LangGraph workflow orchestration.
//
// Migration: Imports from @hive-academy/langgraph-functional-api and
// @hive-academy/langgraph-multi-agent should now use this package.
// ============================================================================

// Module
export * from './lib/workflow-engine.module';

// ============================================================================
// FUNCTIONAL API EXPORTS (from functional-api package)
// ============================================================================

// Functional Workflow Decorators
export * from './lib/decorators/functional/workflow.decorator';
export * from './lib/decorators/functional/entrypoint.decorator';
export * from './lib/decorators/functional/task.decorator';
export * from './lib/decorators/functional/llm-task.decorator';
export * from './lib/decorators/functional/node.decorator';
export * from './lib/decorators/functional/edge.decorator';

// Functional API Utilities
export * from './lib/utils/functional/decorator-validator';
export * from './lib/utils/functional/functional-api-config.accessor';

// Functional API Interfaces
export type * from './lib/interfaces/functional/functional-workflow.interface';
export type * from './lib/interfaces/functional/checkpoint-service.interface';
export type * from './lib/interfaces/functional/module-options.interface';

// Functional API Validation
export * from './lib/validation/workflow-validator';

// Functional API Errors
export * from './lib/errors/functional/functional-workflow.errors';

// ============================================================================
// MULTI-AGENT EXPORTS (from multi-agent package)
// ============================================================================

// Multi-Agent Decorators
export * from './lib/decorators/multi-agent/agent.decorator';
export * from './lib/decorators/multi-agent/multi-agent.decorator';
export * from './lib/decorators/multi-agent/tool.decorator';

// Note: SupervisorConfig, SwarmConfig, HierarchicalConfig, and getMultiAgentConfig
// are exported from multi-agent.decorator above, so we skip re-exporting from interfaces

// Multi-Agent Services
export { LlmProviderService } from './lib/services/llm/llm-provider.service';

// Multi-Agent Tools
// export * from './lib/tools/tool-registration.service'; // TODO: Add missing tool-registry.service dependency
// Note: memory-access.tools deleted during IMemoryAdapter purge (TASK_2025_042)

// Multi-Agent Coordination
// export * from './lib/coordination/multi-agent-coordinator.service'; // TODO: Add missing service dependencies

// Multi-Agent Base Classes
// export * from './lib/base/multi-agent-workflow.base'; // TODO: Add missing coordination service dependencies

// Multi-Agent Interfaces
export type * from './lib/interfaces/multi-agent/multi-agent.interface';
export type * from './lib/interfaces/multi-agent/tool.interface';
export type * from './lib/interfaces/multi-agent/agent.types';
export type * from './lib/interfaces/multi-agent/handoff.types';
export type * from './lib/interfaces/multi-agent/network.types';
export type * from './lib/interfaces/multi-agent/routing.types';

// LLM Configuration Interfaces
export type {
  LlmConfig,
  LlmModuleOptions,
} from './lib/interfaces/llm-config.interface';

// Multi-Agent Types
export * from './lib/types/agent-config.interface';

// Multi-Agent Constants
export * from './lib/constants/multi-agent/multi-agent.constants';

// Multi-Agent Utils
export * from './lib/utils/multi-agent/multi-agent-config.accessor';
export * from './lib/utils/multi-agent/state-validator';
export * from './lib/utils/multi-agent/agent-state-validator';

// ============================================================================
// WORKFLOW ENGINE CORE EXPORTS
// ============================================================================

// Core Services (thin metadata layer)
export * from './lib/core/metadata-processor.service';

// Execution Services
export * from './lib/execution/workflow-execution.service';

// Resumption Services (TASK_2025_049)
export * from './lib/services/langgraph-command.service';
export * from './lib/services/workflow-resumption.service';

// Graph Building Strategies (Strategy Pattern)
export * from './lib/execution/strategies';

// Base Classes (DI containers)
// export * from './lib/base/unified-workflow.base'; // TODO: Add missing core service dependencies
// export * from './lib/base/declarative-workflow.base'; // TODO: Add missing core service dependencies
export * from './lib/base/agent-node.base';

// Interfaces
export * from './lib/interfaces/workflow-engine.interface';
export type * from './lib/interfaces/workflow-metadata.interface';
export type * from './lib/interfaces/decorator-bridge.interface';
export type * from './lib/interfaces/multi-agent-bridge.interface';

// Specific type exports for external module imports
export type {
  WorkflowState,
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  Command,
  ConditionalRouting,
  WorkflowError,
  HumanFeedback,
  WorkflowNodeConfig,
  WorkflowEdgeConfig,
  WorkflowExecutionConfig,
} from './lib/interfaces/workflow-engine.interface';

// LangGraph native types for checkpoint state retrieval
export type { StateSnapshot } from '@langchain/langgraph';

// ============================================================================
// DEBUGGING UTILITIES
// ============================================================================

// Debugging helpers (thin helpers using checkpoint adapter)
export * from './lib/debugging/replay-workflow.helper';
export * from './lib/debugging/checkpoint-timeline.helper';

// Constants
export * from './lib/constants';

// Configuration utilities
export * from './lib/utils/workflow-engine-config.accessor';
export * from './lib/utils/type-guards';

// ============================================================================
// STREAMING UTILITIES
// ============================================================================

// LangGraph Streaming - Production-ready stream parsing and transformation
export * from './lib/streaming';
