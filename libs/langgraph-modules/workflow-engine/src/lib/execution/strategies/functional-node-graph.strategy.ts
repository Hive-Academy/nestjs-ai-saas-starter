import { Injectable } from '@nestjs/common';
import { StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type {
  WorkflowDefinition,
  WorkflowState,
  ConditionalRouting,
} from '../../interfaces/workflow-engine.interface';
import { BaseGraphBuildingStrategy } from './base-graph-building.strategy';

/**
 * FunctionalNodeGraphStrategy
 *
 * Graph building strategy for functional-node workflow pattern.
 *
 * **Pattern Characteristics**:
 * - Graph-based execution: @Node decorators with @Edge routing
 * - Conditional routing: Dynamic path selection based on state
 * - LLM tool calling: Automatic tool binding and execution loops
 * - Complex workflows: Parallel branches, conditional gates, loops
 *
 * **Responsibilities**:
 * 1. Build explicit edges from @Edge decorators
 * 2. Handle node-based tool routing (node → tools → entrypoint loop)
 * 3. Support conditional routing with @ConditionalEdge
 * 4. Support HITL interruption via @RequiresApproval decorator
 *
 * **Graph Structure**:
 * ```
 * StartNode → AnalyzeNode → (condition) → ProcessHighNode
 *                          └─────────────→ ProcessLowNode
 * ```
 *
 * **With LLM Tools**:
 * ```
 * LLMNode → (has tool_calls?) → ToolNode → back to LLMNode (entrypoint)
 *   ↓ (no tool_calls)
 * NextNode
 * ```
 *
 * @see BaseGraphBuildingStrategy - Shared helper methods
 * @see FunctionalTaskGraphStrategy - Alternative pattern for linear workflows
 */
@Injectable()
export class FunctionalNodeGraphStrategy extends BaseGraphBuildingStrategy {
  constructor() {
    super(FunctionalNodeGraphStrategy.name);
  }

  /**
   * Build StateGraph for functional-node pattern
   *
   * @param definition - WorkflowDefinition with explicit edges
   * @returns StateGraph with conditional routing and tool support
   */
  buildStateGraph<TState extends WorkflowState = WorkflowState>(
    definition: WorkflowDefinition<TState>
  ): StateGraph<TState> {
    this.logger.debug(
      `Building functional-node graph for ${definition.name} with ${definition.nodes.length} nodes`
    );

    // Create StateGraph with channels from definition
    const graph = new StateGraph<TState>(definition.channels);

    // 1. Add all nodes
    this.addNodesToGraph(graph, definition);

    // 2. Add ToolNode if tools are configured
    const hasTools = this.hasTools(definition);
    if (hasTools) {
      this.addToolNode(graph, definition);
    }

    // 3. Add explicit edges from @Edge decorators
    this.addNodeEdges(graph, definition);

    // 4. Add node-based tool routing if tools present
    if (hasTools) {
      this.addNodeToolRouting(graph, definition);
    }

    // 5. Set entry point
    this.setGraphEntryPoint(graph, definition.entryPoint);

    this.logger.debug(
      `Functional-node graph built successfully for ${definition.name}`
    );

    return graph;
  }

  /**
   * Add shared ToolNode for all tools
   *
   * Functional-node pattern uses a single ToolNode for all tool execution.
   * Tools are shared across all @Node({ type: 'llm' }) nodes.
   *
   * @param graph - StateGraph to add ToolNode to
   * @param definition - WorkflowDefinition with tools metadata
   */
  private addToolNode<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    definition: WorkflowDefinition<TState>
  ): void {
    const tools = definition.config!.metadata!.tools as any[];
    const toolNode = new ToolNode(tools);

    // @ts-expect-error - LangGraph's complex conditional types cause issues with strict mode
    graph.addNode('tools', toolNode as any);

    this.logger.debug(
      `Added ToolNode with ${tools.length} tools to functional-node graph ${definition.name}`
    );
  }

  /**
   * Add explicit edges from @Edge decorators
   *
   * Functional-node pattern uses @Edge decorators to define graph structure:
   * - Simple edges: @Edge('nodeA', 'nodeB') → nodeA → nodeB
   * - Conditional edges: @Edge('nodeA', (state) => ...) → dynamic routing
   *
   * **Example**:
   * ```typescript
   * @Edge('analyze', 'process')
   * simpleTransition() { return true; }
   *
   * @Edge('analyze', (state) => state.confidence > 0.8 ? 'approve' : 'review')
   * routeByConfidence() {}
   * ```
   *
   * @param graph - StateGraph to add edges to
   * @param definition - WorkflowDefinition with edges metadata
   */
  private addNodeEdges<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    definition: WorkflowDefinition<TState>
  ): void {
    definition.edges.forEach((edge) => {
      if (typeof edge.to === 'string') {
        // Simple edge: from → to
        this.logger.debug(`Adding edge: ${edge.from} → ${edge.to}`);
        graph.addEdge(edge.from as any, edge.to as any);
      } else {
        // Conditional edge with routing
        const conditionalTo = edge.to as ConditionalRouting<TState>;
        this.logger.debug(
          `Adding conditional edge from ${edge.from} with routes: ${Object.keys(
            conditionalTo.routes
          ).join(', ')}`
        );
        graph.addConditionalEdges(
          edge.from as any,
          conditionalTo.condition as any,
          conditionalTo.routes as any
        );
      }
    });
  }

  /**
   * Add node-based tool routing
   *
   * Functional-node pattern routes tools back to the entrypoint:
   * - Each node: conditional edge → tools OR next node
   * - Tools: always return to entrypoint (creates tool execution loop)
   *
   * **Pattern**:
   * ```
   * LLMNode → (has tool_calls?) → ToolNode
   *   ↓ (no tool_calls)           ↓
   * NextNode           ← ← ← ← ← LLMNode (entrypoint)
   * ```
   *
   * This works because functional-node typically has a single @Node({ type: 'llm' })
   * that orchestrates all tool calls. The loop continues until no more tool_calls.
   *
   * @param graph - StateGraph to add tool routing to
   * @param definition - WorkflowDefinition with tool metadata
   */
  private addNodeToolRouting<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    definition: WorkflowDefinition<TState>
  ): void {
    // Add conditional tool routing for each node
    definition.nodes.forEach((node) => {
      const nextNode = this.getNextNode(node, definition);

      this.logger.debug(
        `Adding tool routing for node ${node.id}: tools or ${nextNode || 'END'}`
      );

      graph.addConditionalEdges(
        node.id as any,
        this.shouldExecuteTools.bind(this),
        {
          tools: 'tools' as any,
          continue: (nextNode || this.END) as any,
        }
      );
    });

    // Tools always return to entrypoint (agent node)
    // This creates the execution loop: agent → tools → agent
    graph.addEdge('tools' as any, definition.entryPoint as any);

    this.logger.debug(
      `Added tool routing: tools → ${definition.entryPoint} (entrypoint loop)`
    );
  }
}
