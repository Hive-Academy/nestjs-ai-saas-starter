/**
 * Graph Building Strategies
 *
 * Strategy pattern implementation for building LangGraph StateGraph
 * from WorkflowDefinition metadata. Different workflow patterns require
 * different graph building logic.
 *
 * **Available Strategies**:
 * - FunctionalTaskGraphStrategy: Linear task-based workflows
 * - FunctionalNodeGraphStrategy: Graph-based workflows with conditional routing
 *
 * **Usage**:
 * ```typescript
 * // Automatically selected by WorkflowExecutionService based on workflow.type
 * const strategy = workflowType === 'functional-task'
 *   ? this.taskStrategy
 *   : this.nodeStrategy;
 *
 * const graph = strategy.buildStateGraph(definition);
 * ```
 */

export type {
  GraphBuildingStrategy,
  AnyStateGraph,
} from './graph-building.strategy.interface';
export { BaseGraphBuildingStrategy } from './base-graph-building.strategy';
export { FunctionalTaskGraphStrategy } from './functional-task-graph.strategy';
export { FunctionalNodeGraphStrategy } from './functional-node-graph.strategy';
