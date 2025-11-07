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

// Multi-Agent Services
export * from './lib/services/llm/llm-provider.service';
export * from './lib/services/command-processor.service';
export * from './lib/services/background-memory.service';

// Multi-Agent Tools
export * from './lib/tools/tool-registration.service';
export * from './lib/tools/memory-access.tools';

// Multi-Agent Coordination
export * from './lib/coordination/multi-agent-coordinator.service';

// Multi-Agent Base Classes
export * from './lib/base/multi-agent-workflow.base';

// Multi-Agent Interfaces
export type * from './lib/interfaces/multi-agent/multi-agent.interface';
export type * from './lib/interfaces/multi-agent/tool.interface';
export type * from './lib/interfaces/multi-agent/agent.types';
export type * from './lib/interfaces/multi-agent/handoff.types';
export type * from './lib/interfaces/multi-agent/network.types';
export type * from './lib/interfaces/multi-agent/routing.types';

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

// Base Classes (DI containers)
export * from './lib/base/unified-workflow.base';
export * from './lib/base/declarative-workflow.base';
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

// Constants
export * from './lib/constants';

// Configuration utilities
export * from './lib/utils/workflow-engine-config.accessor';
export * from './lib/utils/type-guards';
