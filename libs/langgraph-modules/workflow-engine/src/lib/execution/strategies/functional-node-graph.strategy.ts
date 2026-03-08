import { Injectable } from '@nestjs/common';
import { StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type {
  WorkflowDefinition,
  ConditionalRouting,
} from '../../interfaces/workflow-engine.interface';
import { BaseGraphBuildingStrategy } from './base-graph-building.strategy';
import type { AnyStateGraph } from './graph-building.strategy.interface';

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
  buildStateGraph(definition: WorkflowDefinition): AnyStateGraph {
    this.logger.debug(
      `Building functional-node graph for ${definition.name} with ${definition.nodes.length} nodes`
    );

    // Create StateGraph with channels from definition
    // Note: channels is always an AnnotationRoot (e.g. AgentStateAnnotation).
    // We let TypeScript infer the graph's state type from the annotation
    // rather than forcing TState (a plain interface) which isn't a valid StateDefinitionInit.
    // Cast required: AnnotationRoot<any> → StateGraph type params are complex conditional types
    // that TypeScript cannot reconcile with AnyStateGraph. This is the single cast point.
    // channels is always set by MetadataProcessorService (defaults to AgentStateAnnotation)
    const graph = new StateGraph(
      definition.channels!
    ) as unknown as AnyStateGraph;

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
  private addToolNode(
    graph: AnyStateGraph,
    definition: WorkflowDefinition
  ): void {
    const tools = definition.config!.metadata!.tools as any[];
    const toolNode = new ToolNode(tools);

    graph.addNode('tools', toolNode);

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
  private addNodeEdges(
    graph: AnyStateGraph,
    definition: WorkflowDefinition
  ): void {
    definition.edges.forEach((edge) => {
      if (typeof edge.to === 'string') {
        // Simple edge: from → to
        this.logger.debug(`Adding edge: ${edge.from} → ${edge.to}`);
        graph.addEdge(edge.from, edge.to);
      } else {
        // Conditional edge with routing
        const conditionalTo = edge.to as ConditionalRouting;
        this.logger.debug(
          `Adding conditional edge from ${edge.from} with routes: ${Object.keys(
            conditionalTo.routes
          ).join(', ')}`
        );
        graph.addConditionalEdges(
          edge.from,
          conditionalTo.condition,
          conditionalTo.routes
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
  private addNodeToolRouting(
    graph: AnyStateGraph,
    definition: WorkflowDefinition
  ): void {
    // Add conditional tool routing only for LLM nodes (nodes that can generate tool_calls)
    // Non-LLM nodes (human review, aggregators, etc.) should not get tool routing
    // as it could conflict with explicit @Edge edges
    const llmNodes = definition.nodes.filter(
      (node) => node.config?.metadata?.type === 'llm'
    );

    if (llmNodes.length === 0) {
      // No LLM nodes found - apply to all nodes as fallback (preserves original behavior)
      this.logger.debug(
        'No nodes with type "llm" found - applying tool routing to all nodes'
      );
      definition.nodes.forEach((node) => {
        const nextNode = this.getNextNode(node, definition);
        graph.addConditionalEdges(node.id, this.shouldExecuteTools.bind(this), {
          tools: 'tools',
          continue: nextNode || this.END,
        });
      });
    } else {
      llmNodes.forEach((node) => {
        const nextNode = this.getNextNode(node, definition);

        this.logger.debug(
          `Adding tool routing for LLM node ${node.id}: tools or ${
            nextNode || 'END'
          }`
        );

        graph.addConditionalEdges(node.id, this.shouldExecuteTools.bind(this), {
          tools: 'tools',
          continue: nextNode || this.END,
        });
      });
    }

    // Tools always return to entrypoint (agent node)
    // This creates the execution loop: agent → tools → agent
    graph.addEdge('tools', definition.entryPoint);

    this.logger.debug(
      `Added tool routing: tools → ${definition.entryPoint} (entrypoint loop)`
    );
  }
}
