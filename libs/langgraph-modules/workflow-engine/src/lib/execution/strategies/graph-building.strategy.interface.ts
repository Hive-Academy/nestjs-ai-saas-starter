import type { StateGraph } from '@langchain/langgraph';
import type { WorkflowDefinition } from '../../interfaces/workflow-engine.interface';

/**
 * Type alias for StateGraph with untyped channels.
 * LangGraph's StateGraph generic params are complex conditional types
 * that cannot be expressed with plain TypeScript interfaces.
 * Using `any` for the first 3 params and `string` for node names
 * is the correct approach when the annotation is dynamic.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyStateGraph = StateGraph<any, any, any, string>;

/**
 * GraphBuildingStrategy Interface
 *
 * Strategy pattern for building LangGraph StateGraph from WorkflowDefinition metadata.
 * Different workflow patterns (functional-task, functional-node) require different
 * graph building logic, especially for edges and tool routing.
 *
 * **Why Strategy Pattern?**
 * - Separation of Concerns: Each pattern has isolated graph building logic
 * - Maintainability: Change one pattern without affecting others
 * - Testability: Test each strategy independently
 * - Extensibility: Easy to add new patterns (functional-loop, functional-parallel)
 *
 * **Pattern Responsibilities**:
 * - Functional-Task: Linear edges from taskDependencies, task-specific tool routing
 * - Functional-Node: Explicit edges from @Edge decorators, node-based tool routing
 *
 * @see FunctionalTaskGraphStrategy - Implements functional-task pattern
 * @see FunctionalNodeGraphStrategy - Implements functional-node pattern
 */
export interface GraphBuildingStrategy {
  /**
   * Build LangGraph StateGraph from WorkflowDefinition metadata
   *
   * @param definition - WorkflowDefinition with nodes, edges, config
   * @returns Compiled StateGraph ready for execution
   */
  buildStateGraph(definition: WorkflowDefinition): AnyStateGraph;
}
