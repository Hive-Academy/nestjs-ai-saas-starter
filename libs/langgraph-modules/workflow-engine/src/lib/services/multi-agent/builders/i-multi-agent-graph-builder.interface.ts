/**
 * IMultiAgentGraphBuilder Interface
 *
 * Strategy Pattern contract for topology-specific graph builders.
 *
 * This interface defines the contract that all multi-agent graph builder
 * implementations must follow. Each topology (supervisor, sequential, swarm,
 * hierarchical, network) implements this interface to provide LangGraph 1.0
 * compliant graph construction.
 *
 * PATTERN: Strategy Interface
 * - Context: MultiAgentGraphBuilderService (selects and delegates to builders)
 * - Strategies: SupervisorGraphBuilder, SequentialGraphBuilder, etc.
 * - Benefit: Isolated topology implementations, easy extensibility
 *
 * @see SupervisorGraphBuilder - Implements supervisor pattern (workers as tools)
 * @see SequentialGraphBuilder - Implements linear execution pattern (agent chain)
 * @see MultiAgentGraphBuilderService - Strategy context that uses this interface
 */

import type { StateGraph } from '@langchain/langgraph';
import type { WorkflowState } from '@hive-academy/langgraph-core';
import type { MultiAgentConfig } from '../../../decorators/multi-agent/multi-agent.decorator';

/**
 * Strategy interface for topology-specific multi-agent graph builders
 *
 * Each builder is responsible for:
 * 1. Validating topology-specific configuration
 * 2. Extracting agents from MultiAgentConfig
 * 3. Constructing LangGraph StateGraph following LangGraph 1.0 patterns
 * 4. Returning graph ready for compilation
 *
 * Implementations must follow LangGraph 1.0 specifications for their topology:
 * - Supervisor: Workers as LangChain tools (NOT subgraph nodes)
 * - Sequential: Linear edge chain with agents as subgraph nodes
 * - Swarm: Peer-to-peer communication with capability-based routing
 * - Hierarchical: Multi-level supervision with layer-based routing
 * - Network: All-to-all communication with custom routing logic
 *
 * @template TState - Workflow state type extending WorkflowState
 */
export interface IMultiAgentGraphBuilder {
  /**
   * Topology identifier this builder handles
   *
   * Must match MultiAgentTopology enum value (e.g., 'supervisor', 'sequential')
   * Used by MultiAgentGraphBuilderService for builder selection
   *
   * @readonly
   */
  readonly topology: string;

  /**
   * Build LangGraph StateGraph from multi-agent configuration
   *
   * This method is the core strategy implementation - each builder constructs
   * the graph structure appropriate for its topology pattern.
   *
   * IMPLEMENTATION REQUIREMENTS:
   * 1. Call validateConfig() to ensure configuration is valid for this topology
   * 2. Extract agent classes from config.agents array
   * 3. Construct StateGraph with topology-specific nodes, edges, and routing
   * 4. Follow LangGraph 1.0 patterns (e.g., supervisor uses tools, not subgraphs)
   * 5. Return StateGraph ready for compilation (do NOT compile here)
   *
   * EXAMPLE PATTERNS:
   * - Supervisor: Create worker tools → bind to LLM → create supervisor node + ToolNode → conditional routing
   * - Sequential: Build agent subgraphs → create linear edge chain → set entry point
   *
   * ERROR HANDLING:
   * - Throw topology-specific error (e.g., SupervisorGraphBuilderError)
   * - Include context: topology name, supervisor class name, failure reason
   * - Wrap original errors with additional context
   *
   * @template TState - Workflow state type extending WorkflowState
   * @param config - MultiAgentConfig from @MultiAgent decorator
   * @param supervisorClass - Supervisor workflow class (for logging and error context)
   * @returns LangGraph StateGraph ready for compilation
   * @throws {Error} If configuration invalid or graph construction fails
   *
   * @example
   * ```typescript
   * // Usage by MultiAgentGraphBuilderService
   * const builder = this.builders.get(config.topology);
   * const graph = await builder.buildGraph<TState>(config, supervisorClass);
   * const compiled = graph.compile({ checkpointer, store });
   * ```
   */
  buildGraph<TState extends WorkflowState = WorkflowState>(
    config: MultiAgentConfig,
    supervisorClass: any
  ): Promise<StateGraph<TState>>;

  /**
   * Validate topology-specific configuration
   *
   * Each builder implements validation logic specific to its topology:
   * - Supervisor: Check systemPrompt, workers array, LLM config
   * - Sequential: Check sequence array matches agent classes
   * - Swarm: Check initialAgent, maxRounds, communication protocol
   * - Hierarchical: Check layers structure, supervisor hierarchy
   * - Network: Check nodes array, edges configuration
   *
   * VALIDATION STEPS:
   * 1. Use type guard (e.g., isSupervisorConfig) to check config shape
   * 2. Validate required fields are present
   * 3. Validate field values are within acceptable ranges
   * 4. Cross-validate configuration against agent classes
   * 5. Throw topology-specific error if validation fails
   *
   * @param config - MultiAgentConfig to validate
   * @throws {Error} If configuration invalid for this topology
   *
   * @example
   * ```typescript
   * // SupervisorGraphBuilder validation
   * validateConfig(config: MultiAgentConfig): void {
   *   if (!isSupervisorConfig(config.config)) {
   *     throw new SupervisorGraphBuilderError('Invalid supervisor configuration');
   *   }
   *
   *   const supervisorConfig = config.config as SupervisorConfig;
   *   if (!supervisorConfig.systemPrompt) {
   *     throw new SupervisorGraphBuilderError('Supervisor systemPrompt is required');
   *   }
   *   if (!supervisorConfig.workers || supervisorConfig.workers.length === 0) {
   *     throw new SupervisorGraphBuilderError('Supervisor must have at least one worker');
   *   }
   * }
   * ```
   */
  validateConfig(config: MultiAgentConfig): void;
}
