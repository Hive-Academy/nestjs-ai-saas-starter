import { Logger } from '@nestjs/common';
import { END } from '@langchain/langgraph';
import type {
  WorkflowDefinition,
  WorkflowNode,
} from '../../interfaces/workflow-engine.interface';
import type {
  GraphBuildingStrategy,
  AnyStateGraph,
} from './graph-building.strategy.interface';

/**
 * BaseGraphBuildingStrategy
 *
 * Abstract base class providing shared logic for all graph building strategies.
 * Contains helper methods used by both functional-task and functional-node patterns.
 *
 * **Shared Responsibilities** (~40% of logic):
 * - Adding nodes to graph
 * - Detecting tool_calls in messages
 * - Finding next node from edges
 * - Common logging and validation
 *
 * **Pattern-Specific Logic** (~60% of logic - delegated to subclasses):
 * - How edges are built (taskDependencies vs @Edge decorators)
 * - How tool routing works (task-specific vs node-based)
 * - How interruption points are determined
 */
export abstract class BaseGraphBuildingStrategy
  implements GraphBuildingStrategy
{
  protected readonly logger: Logger;

  constructor(loggerContext: string) {
    this.logger = new Logger(loggerContext);
  }

  /**
   * Build StateGraph from WorkflowDefinition
   * Template method - subclasses implement specific logic
   */
  abstract buildStateGraph(definition: WorkflowDefinition): AnyStateGraph;

  /**
   * Add all nodes from definition to graph
   * Shared logic used by all strategies
   *
   * @param graph - StateGraph to add nodes to
   * @param definition - WorkflowDefinition with nodes metadata
   */
  protected addNodesToGraph(
    graph: AnyStateGraph,
    definition: WorkflowDefinition
  ): void {
    definition.nodes.forEach((node) => {
      this.logger.debug(`Adding node: ${node.id}`);
      graph.addNode(node.id, node.handler);
    });
  }

  /**
   * Set entry point for graph
   * Shared logic used by all strategies
   *
   * @param graph - StateGraph to set entry point on
   * @param entryPoint - Node ID to use as entry point
   */
  protected setGraphEntryPoint(graph: AnyStateGraph, entryPoint: string): void {
    this.logger.debug(`Setting entry point: ${entryPoint}`);
    graph.setEntryPoint(entryPoint);
  }

  /**
   * Determine whether to execute tools based on last message in state
   * Routes to 'tools' if tool_calls present, otherwise continues to next node
   *
   * Shared logic used by all strategies
   *
   * @param state - Current workflow state
   * @returns 'tools' if tool calls detected, 'continue' otherwise
   */
  protected shouldExecuteTools(
    state: Record<string, unknown>
  ): 'tools' | 'continue' {
    const messages = state.messages as any[] | undefined;
    if (!messages || messages.length === 0) {
      return 'continue';
    }

    const lastMessage = messages[messages.length - 1];

    // Check if last message has tool_calls (LangChain message structure)
    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
      this.logger.debug(
        `Tool calls detected: ${lastMessage.tool_calls
          .map((tc: any) => tc.name)
          .join(', ')}`
      );
      return 'tools';
    }

    return 'continue';
  }

  /**
   * Get the next node for a given node from explicit edges
   *
   * Shared logic used by all strategies
   *
   * @param node - Current workflow node
   * @param definition - WorkflowDefinition with edge metadata
   * @returns Next node ID or null if no explicit next node
   */
  protected getNextNode(
    node: WorkflowNode,
    definition: WorkflowDefinition
  ): string | null {
    // Find explicit edge from this node
    const edge = definition.edges.find((e) => e.from === node.id);
    if (edge && typeof edge.to === 'string') {
      return edge.to;
    }

    // No explicit next node
    return null;
  }

  /**
   * Check if workflow has tools configured
   *
   * @param definition - WorkflowDefinition to check
   * @returns True if tools are configured
   */
  protected hasTools(definition: WorkflowDefinition): boolean {
    const tools = definition.config?.metadata?.tools;
    return Array.isArray(tools) && tools.length > 0;
  }

  /**
   * Get END constant for terminal edges
   */
  protected get END() {
    return END;
  }
}
