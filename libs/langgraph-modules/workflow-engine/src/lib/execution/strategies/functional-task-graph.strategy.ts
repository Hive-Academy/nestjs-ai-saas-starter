import { Injectable } from '@nestjs/common';
import { StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type {
  WorkflowDefinition,
  WorkflowState,
} from '../../interfaces/workflow-engine.interface';
import { BaseGraphBuildingStrategy } from './base-graph-building.strategy';
import { ToolRegistryService } from '../../services/tool-registry.service';

/**
 * FunctionalTaskGraphStrategy
 *
 * Graph building strategy for functional-task workflow pattern.
 *
 * **Pattern Characteristics**:
 * - Linear execution: @Entrypoint → @Task → @Task → @Task
 * - Sequential flow: Tasks execute in order based on dependsOn
 * - Simple edges: Task dependencies create linear graph structure
 *
 * **Responsibilities**:
 * 1. Build linear edges from taskDependencies metadata
 * 2. Handle @LLMTask tool routing (future: task-specific tool loops)
 * 3. Support HITL interruption via @RequiresApproval decorator
 *
 * **Graph Structure**:
 * ```
 * Entrypoint → Task1 → Task2 → Task3 → END
 * ```
 *
 * **With @LLMTask (Future)**:
 * ```
 * Entrypoint → Task1 → LLMTask2 ↔ tools_LLMTask2 → Task3 → END
 * ```
 *
 * @see BaseGraphBuildingStrategy - Shared helper methods
 * @see FunctionalNodeGraphStrategy - Alternative pattern for complex routing
 */
@Injectable()
export class FunctionalTaskGraphStrategy extends BaseGraphBuildingStrategy {
  constructor(private readonly toolRegistry: ToolRegistryService) {
    super(FunctionalTaskGraphStrategy.name);
  }

  /**
   * Build StateGraph for functional-task pattern
   *
   * @param definition - WorkflowDefinition with taskDependencies metadata
   * @returns StateGraph with linear task edges
   */
  buildStateGraph<TState extends WorkflowState = WorkflowState>(
    definition: WorkflowDefinition<TState>
  ): StateGraph<TState> {
    this.logger.debug(
      `Building functional-task graph for ${definition.name} with ${definition.nodes.length} tasks`
    );

    // Create StateGraph with channels from definition
    const graph = new StateGraph<TState>(definition.channels);

    // 1. Add all nodes (tasks)
    this.addNodesToGraph(graph, definition);

    // 2. Add edges from taskDependencies (linear flow)
    this.addTaskEdges(graph, definition);

    // 3. Add @LLMTask tool routing (task-specific tool loops)
    this.addLLMTaskToolRouting(graph, definition);

    // 4. Set entry point
    this.setGraphEntryPoint(graph, definition.entryPoint);

    this.logger.debug(
      `Functional-task graph built successfully for ${definition.name}`
    );

    return graph;
  }

  /**
   * Add linear edges based on taskDependencies metadata
   *
   * Functional-task pattern uses taskDependencies to create sequential flow:
   * - Task with dependencies: edge from each dependency → task
   * - Task without dependencies: starts from entrypoint
   *
   * **Example**:
   * ```typescript
   * taskDependencies: {
   *   'entrypoint': [],
   *   'task1': ['entrypoint'],  // entrypoint → task1
   *   'task2': ['task1'],        // task1 → task2
   *   'task3': ['task2'],        // task2 → task3
   * }
   * ```
   *
   * @param graph - StateGraph to add edges to
   * @param definition - WorkflowDefinition with taskDependencies metadata
   */
  private addTaskEdges<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    definition: WorkflowDefinition<TState>
  ): void {
    const taskDeps = definition.config?.metadata?.taskDependencies as
      | Record<string, readonly string[]>
      | undefined;

    if (!taskDeps) {
      this.logger.warn(
        `No taskDependencies found for functional-task workflow ${definition.name}`
      );
      return;
    }

    this.logger.debug(
      `Building linear edges from taskDependencies for ${
        Object.keys(taskDeps).length
      } tasks`
    );

    // For each task, add edge from dependency → task
    for (const [taskId, dependencies] of Object.entries(taskDeps)) {
      if (dependencies.length === 0) {
        // Task with no dependencies - handled by entryPoint
        continue;
      }

      for (const depId of dependencies) {
        this.logger.debug(`Adding dependency edge: ${depId} → ${taskId}`);
        graph.addEdge(depId as any, taskId as any);
      }
    }
  }

  /**
   * Add task-specific tool routing loops for @LLMTask decorated nodes
   *
   * Creates a unique ToolNode for each LLM task and adds conditional routing:
   * - Task → (has tool_calls?) → tools_${taskId} → back to Task
   * - Task → (no tool_calls) → next Task
   *
   * **Key Architecture Decision**:
   * Tools route back to the ORIGINATING TASK, not the entrypoint.
   * This prevents infinite loops in sequential task workflows.
   *
   * **Pattern**:
   * ```
   * LLMTask → (has tool_calls?) → tools_LLMTask → back to LLMTask
   *   ↓ (no tool_calls)
   * NextTask
   * ```
   *
   * @param graph - StateGraph to add tool routing to
   * @param definition - WorkflowDefinition with node metadata
   */
  private addLLMTaskToolRouting<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    definition: WorkflowDefinition<TState>
  ): void {
    const llmTaskNodes = definition.nodes.filter((node) => node.isLLMTask);

    if (llmTaskNodes.length === 0) {
      this.logger.debug('No @LLMTask nodes found - skipping tool routing');
      return;
    }

    this.logger.debug(
      `Adding tool routing for ${llmTaskNodes.length} LLM tasks: ${llmTaskNodes
        .map((n) => n.id)
        .join(', ')}`
    );

    // Get task dependencies for determining next task
    const taskDeps = definition.config?.metadata?.taskDependencies as
      | Record<string, readonly string[]>
      | undefined;

    for (const node of llmTaskNodes) {
      if (!node.llmTaskOptions) {
        this.logger.warn(
          `LLM task ${node.id} missing llmTaskOptions - skipping tool routing`
        );
        continue;
      }

      // 1. Resolve tools from registry
      const tools = this.toolRegistry.getTools(
        node.llmTaskOptions.tools as string[]
      );

      if (tools.length === 0) {
        this.logger.warn(
          `No tools found for LLM task ${
            node.id
          } (requested: ${node.llmTaskOptions.tools.join(
            ', '
          )}) - task will execute without tool calling`
        );
        continue;
      }

      this.logger.debug(
        `Binding ${tools.length} tools to LLM task ${node.id}: ${tools
          .map((t) => t.name)
          .join(', ')}`
      );

      // 2. Create task-specific ToolNode
      const toolNodeId = `tools_${node.id}`;
      const toolNode = new ToolNode(tools);
      // @ts-expect-error - LangGraph's complex conditional types cause issues with strict mode
      // ToolNode signature is correct and works at runtime
      graph.addNode(toolNodeId, toolNode as any);

      // 3. Determine next task for 'continue' route
      const nextTaskId = this.getNextTaskId(node.id, taskDeps, definition);

      // 4. Add conditional edge: task → tools_task OR next task
      graph.addConditionalEdges(
        node.id as any,
        this.shouldExecuteTools.bind(this),
        {
          tools: toolNodeId as any,
          continue: (nextTaskId || this.END) as any,
        }
      );

      // 5. Add return edge: tools_task → task (loop until no tool_calls)
      graph.addEdge(toolNodeId as any, node.id as any);

      this.logger.debug(
        `Tool routing added for ${node.id}: ${node.id} ↔ ${toolNodeId} (max ${node.llmTaskOptions.maxToolIterations} iterations)`
      );
    }

    this.logger.log(
      `LLM task tool routing configured for ${llmTaskNodes.length} tasks`
    );
  }

  /**
   * Get the next task ID from task dependencies
   *
   * @param currentTaskId - Current task node ID
   * @param taskDeps - Task dependencies map
   * @param definition - Workflow definition
   * @returns Next task ID or null if no next task
   */
  private getNextTaskId<TState extends WorkflowState = WorkflowState>(
    currentTaskId: string,
    taskDeps: Record<string, readonly string[]> | undefined,
    definition: WorkflowDefinition<TState>
  ): string | null {
    if (!taskDeps) {
      return null;
    }

    // Find task that depends on current task
    for (const [taskId, dependencies] of Object.entries(taskDeps)) {
      if (dependencies.includes(currentTaskId)) {
        return taskId;
      }
    }

    // No dependent task found - check if there's an explicit edge
    const edge = definition.edges.find((e) => e.from === currentTaskId);
    if (edge && typeof edge.to === 'string') {
      return edge.to;
    }

    return null;
  }
}
