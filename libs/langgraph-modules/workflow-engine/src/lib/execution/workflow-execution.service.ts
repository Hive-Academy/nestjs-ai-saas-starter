import { Injectable, Logger } from '@nestjs/common';
import type { RunnableConfig } from '@langchain/core/runnables';
import { StateGraph } from '@langchain/langgraph';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { MetadataProcessorService } from '../core/metadata-processor.service';
import type { ICheckpointAdapter } from '@hive-academy/langgraph-core';
import type {
  WorkflowDefinition,
  WorkflowState,
  ConditionalRouting,
} from '../interfaces/workflow-engine.interface';

/**
 * WorkflowExecutionService
 *
 * Builds LangGraph StateGraph from WorkflowDefinition metadata and executes workflows.
 *
 * ARCHITECTURE PATTERN:
 * - MetadataProcessorService: Extracts decorator metadata → WorkflowDefinition
 * - WorkflowExecutionService: Builds StateGraph from metadata → Executes workflows
 *
 * DELEGATION TO LANGGRAPH:
 * - Use StateGraph.addNode(), addEdge(), addConditionalEdges()
 * - Use graph.compile({ checkpointer })
 * - Use graph.invoke() and graph.stream()
 * - NO custom execution engines, NO custom graph builders
 */
@Injectable()
export class WorkflowExecutionService {
  private readonly logger = new Logger(WorkflowExecutionService.name);

  constructor(
    private readonly metadataProcessor: MetadataProcessorService,
    private readonly checkpointAdapter: ICheckpointAdapter
  ) {
    this.logger.log('WorkflowExecutionService initialized');
  }

  /**
   * Execute a workflow using LangGraph's native invoke()
   *
   * @param workflowClass - Decorated workflow class
   * @param input - Initial workflow state
   * @param config - Optional RunnableConfig (thread_id, etc.)
   * @returns Final workflow state
   *
   * Implementation: Task 3.2
   */
  async executeWorkflow<TState extends WorkflowState = WorkflowState>(
    workflowClass: any,
    input: TState,
    config?: RunnableConfig
  ): Promise<TState> {
    this.logger.debug(`Executing workflow from class ${workflowClass.name}`);

    // 1. Extract metadata using MetadataProcessorService
    const definition =
      this.metadataProcessor.extractWorkflowDefinition<TState>(workflowClass);

    // 2. Validate metadata
    this.metadataProcessor.validateWorkflowDefinition(definition);

    // 3. Build StateGraph from metadata
    const graph = this.buildStateGraph(definition);

    // 4. Compile with checkpointer
    const compiled = graph.compile({
      checkpointer: this.checkpointAdapter as unknown as BaseCheckpointSaver,
    });

    // 5. Execute with LangGraph's native invoke()
    const result = await compiled.invoke(input, config);

    this.logger.log(`Workflow ${definition.name} executed successfully`);
    return result as TState;
  }

  /**
   * Stream a workflow using LangGraph's native stream()
   *
   * @param workflowClass - Decorated workflow class
   * @param input - Initial workflow state
   * @param config - Optional RunnableConfig with streamMode
   * @yields Workflow state updates
   *
   * Implementation: Task 3.3
   */
  async *streamWorkflow<TState extends WorkflowState = WorkflowState>(
    workflowClass: any,
    input: TState,
    config?: RunnableConfig & { streamMode?: 'values' | 'updates' | 'messages' }
  ): AsyncIterable<TState> {
    this.logger.debug(`Streaming workflow from class ${workflowClass.name}`);

    // 1. Extract metadata using MetadataProcessorService
    const definition =
      this.metadataProcessor.extractWorkflowDefinition<TState>(workflowClass);

    // 2. Validate metadata
    this.metadataProcessor.validateWorkflowDefinition(definition);

    // 3. Build StateGraph from metadata (reuse helper from Task 3.2)
    const graph = this.buildStateGraph(definition);

    // 4. Compile with checkpointer
    const compiled = graph.compile({
      checkpointer: this.checkpointAdapter as unknown as BaseCheckpointSaver,
    });

    // 5. Stream using LangGraph's native stream()
    const streamMode = config?.streamMode || 'values';

    const stream = await compiled.stream(input, {
      ...config,
      streamMode,
    });

    for await (const chunk of stream) {
      yield chunk as TState;
    }

    this.logger.log(`Workflow ${definition.name} streaming completed`);
  }

  /**
   * Execute multi-agent workflow using LangGraph subgraphs
   *
   * @param workflowClass - Decorated multi-agent workflow class
   * @param input - Initial workflow state
   * @param config - Optional RunnableConfig
   * @returns Final workflow state
   *
   * Implementation: Task 3.4
   */
  async executeMultiAgentWorkflow<TState>(
    workflowClass: any,
    input: TState,
    config?: RunnableConfig
  ): Promise<TState> {
    this.logger.debug(
      `executeMultiAgentWorkflow() - To be implemented in Task 3.4`
    );
    throw new Error('Not yet implemented - Task 3.4');
  }

  /**
   * Build agent graph for subgraph usage
   *
   * @param _AgentClass - Decorated agent class
   * @returns Compiled graph with id
   *
   * Implementation: Task 3.5
   */
  // @ts-expect-error - Will be used in Task 3.4
  private async _buildAgentGraph(_AgentClass: any): Promise<{
    id: string;
    graph: any; // CompiledGraph type from LangGraph
  }> {
    this.logger.debug(`buildAgentGraph() - To be implemented in Task 3.5`);
    throw new Error('Not yet implemented - Task 3.5');
  }

  /**
   * Build LangGraph StateGraph from WorkflowDefinition metadata
   * This is where we convert metadata to actual graph structure
   *
   * @param definition - WorkflowDefinition extracted from decorators
   * @returns StateGraph instance ready for compilation
   */
  private buildStateGraph<TState extends WorkflowState = WorkflowState>(
    definition: WorkflowDefinition<TState>
  ): StateGraph<TState> {
    this.logger.debug(
      `Building StateGraph for workflow ${definition.name} with ${definition.nodes.length} nodes`
    );

    // Create StateGraph with channels from definition
    const graph = new StateGraph<TState>(definition.channels);

    // Add all nodes
    definition.nodes.forEach((node) => {
      this.logger.debug(`Adding node: ${node.id}`);
      // @ts-expect-error - LangGraph's complex conditional types cause issues with strict mode
      // Handler signature is correct: (state: TState) => Promise<Partial<TState> | Command>
      graph.addNode(node.id, node.handler);
    });

    // Add edges from metadata
    this.addEdgesFromMetadata(graph, definition);

    // Set entry point (cast to any for type compatibility)
    graph.setEntryPoint(definition.entryPoint as any);

    this.logger.debug(
      `StateGraph built successfully for ${definition.name} with entry point ${definition.entryPoint}`
    );
    return graph;
  }

  /**
   * Add edges to StateGraph from WorkflowDefinition metadata
   * Handles both explicit edges and taskDependencies metadata
   *
   * @param graph - StateGraph to add edges to
   * @param definition - WorkflowDefinition with edge and task metadata
   */
  private addEdgesFromMetadata<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    definition: WorkflowDefinition<TState>
  ): void {
    // 1. Add explicit edges from @Edge decorators
    definition.edges.forEach((edge) => {
      if (typeof edge.to === 'string') {
        // Simple edge: from -> to
        this.logger.debug(`Adding edge: ${edge.from} -> ${edge.to}`);
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

    // 2. Add edges from taskDependencies metadata (functional-task pattern)
    const taskDeps = definition.config?.metadata?.taskDependencies as
      | Record<string, readonly string[]>
      | undefined;

    if (taskDeps) {
      this.logger.debug(
        `Building edges from taskDependencies for ${
          Object.keys(taskDeps).length
        } tasks`
      );

      // For each task, add edge from dependency -> task
      for (const [taskId, dependencies] of Object.entries(taskDeps)) {
        if (dependencies.length === 0) {
          // Task with no dependencies - already handled by entryPoint
          continue;
        }

        for (const depId of dependencies) {
          this.logger.debug(`Adding dependency edge: ${depId} -> ${taskId}`);
          graph.addEdge(depId as any, taskId as any);
        }
      }
    }
  }
}
