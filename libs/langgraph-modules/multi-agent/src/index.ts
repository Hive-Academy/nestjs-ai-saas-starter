// Module
export { MultiAgentModule } from './lib/multi-agent.module';

// ============================================================================
// PUBLIC API - These are the ONLY services consumers should use directly
// ============================================================================

/**
 * MultiAgentCoordinatorService - Main facade for multi-agent coordination
 *
 * ⚠️ NOTE: Most users should use @MultiAgent decorator instead of this service.
 * This service is for advanced use cases requiring manual coordination control.
 *
 * @see MultiAgentWorkflowBase for the recommended decorator-based approach
 */
export { MultiAgentCoordinatorService } from './lib/coordination/multi-agent-coordinator.service';

/**
 * Tool Registration Services - For registering custom tools
 *
 * These services provide public APIs for tool management.
 */
export { ToolRegistrationService } from './lib/tools/tool-registration.service';
export { ToolRegistryService } from './lib/tools/tool-registry.service';

/**
 * Memory Access Tools - Agent-driven memory tools (TASK 3)
 *
 * Provides tools for agents to autonomously access memory when needed:
 * - search-memory: Search conversation history
 * - get-user-patterns: Retrieve behavioral patterns
 * - store-memory: Store important information
 *
 * These replace the hardcoded memory injection pattern with LLM-driven decisions.
 */
export { MemoryAccessTools } from './lib/tools/memory-access.tools';
export type {
  MemorySearchResponse,
  UserPatternsResponse,
  StoreMemoryResponse,
} from './lib/tools/memory-access.tools';

/**
 * LLM Provider Service - For advanced LLM access in agents
 *
 * ⚠️ NOTE: This service is exported for use within workflow agents that need
 * direct LLM access (e.g., for AI synthesis, content generation).
 *
 * For multi-agent coordination, the service is used internally by the coordinator.
 *
 * @example
 * ```typescript
 * @Agent({ id: 'my-agent' })
 * export class MyAgent extends DeclarativeWorkflowBase {
 *   constructor(private readonly llmProvider: LlmProviderService) {}
 *
 *   async synthesizeWithAI(context: TaskExecutionContext) {
 *     const llm = await this.llmProvider.getLLM({ temperature: 0.7 });
 *     const response = await llm.invoke([{ role: 'user', content: 'prompt' }]);
 *     return response.content.toString();
 *   }
 * }
 * ```
 */
export { LlmProviderService } from './lib/llm/llm-provider.service';

/**
 * Command Processing Service - For workflow command handling and routing
 *
 * Implements the LangGraph Command pattern for multi-agent workflow control.
 * Provides retry/skip/error recovery patterns for Command objects.
 */
export {
  CommandProcessorService,
  CommandBuilder,
  type Command,
  type CommandProcessingState,
} from './lib/routing/command-processor.service';

// ============================================================================
// INTERNAL SERVICES - DO NOT USE DIRECTLY
// ============================================================================
// The following services are internal implementation details:
// - AgentRegistryService (used internally by MultiAgentWorkflowBase)
// - GraphBuilderService (used internally by coordinator)
// - NodeFactoryService (used internally by graph builder)
// - NetworkManagerService (used internally by coordinator)
// - WorkflowManagerService (used internally by coordinator)
// - ToolBuilderService (used internally by tool registration)
// - ToolNodeService (used internally by tool builder)
//
// These are NOT exported to enforce proper encapsulation.
// Use @MultiAgent decorator and MultiAgentWorkflowBase instead.
// ============================================================================

// Interfaces and Types
export * from './lib/interfaces/multi-agent.interface';
export type * from './lib/interfaces/tool.interface';
export * from './lib/types/agent-config.interface';

// Provider types for workflow-engine integration
export type {
  AgentProvider,
  ToolProvider,
  WorkflowProvider,
} from './lib/interfaces/multi-agent.interface';

// Constants
export * from './lib/constants/multi-agent.constants';

// Decorators - Tool and Agent decorators
export * from './lib/decorators/tool.decorator';
export * from './lib/decorators/agent.decorator';
export {
  MultiAgent,
  MultiAgentTopology,
  getMultiAgentConfig,
  isMultiAgentWorkflow,
  isSupervisorConfig,
  isSwarmConfig,
  isHierarchicalConfig,
  isSequentialConfig,
} from './lib/decorators/multi-agent.decorator';

// Base Classes
export { MultiAgentWorkflowBase } from './lib/base/multi-agent-workflow.base';

// Enhanced Agent Architecture Types (Workflow Agent Support)
export type {
  AgentType,
  WorkflowAgentConfig,
  AgentWorkflowConfig,
  MultiAgentStreamingConfig,
  MultiAgentInterruptionConfig,
} from './lib/decorators/agent.decorator';

// Multi-Agent Workflow Types
export type {
  MultiAgentConfig,
  SupervisorConfig,
  SwarmConfig,
  HierarchicalConfig,
  SequentialConfig,
} from './lib/decorators/multi-agent.decorator';

// Configuration utilities
export * from './lib/utils/multi-agent-config.accessor';

// ✅ State Validation Utilities - Prevent undefined state access errors (CRITICAL FIX)
export {
  validateAgentState,
  isValidAgentState,
  ensureAgentState,
  getStateMetadata,
  getStateMessages,
  createDefaultAgentState,
  InvalidAgentStateError,
} from './lib/utils/state-validator';

// Legacy validation utilities (deprecated - use state-validator instead)
export {
  assertValidAgentState,
  validateAndWarnAgentState,
  AgentStateValidationError,
  type StateValidationResult,
} from './lib/utils/agent-state-validator';
