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
   * Coordinates multiple agents as subgraphs within a supervisor workflow.
   * Each agent is compiled as an independent StateGraph and added as a node
   * to the supervisor graph for orchestrated execution.
   *
   * @param supervisorClass - Decorated supervisor workflow class
   * @param agentClasses - Array of decorated agent classes
   * @param input - Initial workflow state
   * @param config - Optional RunnableConfig (thread_id, etc.)
   * @returns Final workflow state
   *
   * Implementation: Task 3.4
   *
   * Pattern:
   * 1. Extract supervisor metadata
   * 2. Build agent subgraphs using buildAgentGraph() helper
   * 3. Add agent subgraphs as nodes to supervisor graph
   * 4. Compile supervisor with checkpoint adapter
   * 5. Execute via LangGraph's native invoke()
   */
  async executeMultiAgentWorkflow<TState extends WorkflowState = WorkflowState>(
    supervisorClass: any,
    agentClasses: any[],
    input: TState,
    config?: RunnableConfig
  ): Promise<TState> {
    this.logger.debug(
      `Executing multi-agent workflow with supervisor ${supervisorClass.name} and ${agentClasses.length} agents`
    );

    // 1. Extract supervisor metadata using MetadataProcessorService
    const supervisorDef =
      this.metadataProcessor.extractWorkflowDefinition<TState>(supervisorClass);

    // 2. Validate supervisor metadata
    this.metadataProcessor.validateWorkflowDefinition(supervisorDef);

    // 3. Build agent subgraphs using buildAgentGraph() helper (Task 3.5)
    this.logger.debug(`Building ${agentClasses.length} agent subgraphs`);
    const agentGraphs = await Promise.all(
      agentClasses.map((AgentClass) => this.buildAgentGraph(AgentClass))
    );

    // 4. Build supervisor StateGraph from metadata (reuse helper from Task 3.2)
    const supervisorGraph = this.buildStateGraph(supervisorDef);

    // 5. Add agent subgraphs as nodes to supervisor graph
    agentGraphs.forEach(({ id, graph }) => {
      this.logger.debug(`Adding agent subgraph as node: ${id}`);
      // @ts-expect-error - LangGraph's complex conditional types cause issues with strict mode
      // The compiled graph is a valid node handler: (state: TState) => Promise<TState>
      supervisorGraph.addNode(id, graph);
    });

    // 6. Compile supervisor graph with checkpoint adapter
    const compiled = supervisorGraph.compile({
      checkpointer: this.checkpointAdapter as unknown as BaseCheckpointSaver,
    });

    // 7. Execute using LangGraph's native invoke()
    const result = await compiled.invoke(input, config);

    this.logger.log(
      `Multi-agent workflow ${supervisorDef.name} completed successfully with ${agentGraphs.length} agents`
    );
    return result as TState;
  }

  /**
   * Build agent graph for subgraph usage in multi-agent workflows
   *
   * @param AgentClass - Decorated agent class with @Agent decorator
   * @returns Compiled graph with agent id for subgraph coordination
   *
   * Implementation: Task 3.5
   *
   * Pattern: Agents use same decorators as workflows (@Workflow, @Node, @Edge, @Task).
   * This method extracts agent metadata, builds StateGraph using buildStateGraph(),
   * compiles the graph, and returns { id, graph } for use as subgraph node.
   */
  private async buildAgentGraph(AgentClass: any): Promise<{
    id: string;
    graph: any; // CompiledGraph type from LangGraph
  }> {
    this.logger.debug(
      `Building agent graph for subgraph usage from class ${AgentClass.name}`
    );

    // 1. Extract agent metadata (agents use same decorators as workflows)
    const agentDefinition =
      this.metadataProcessor.extractWorkflowDefinition(AgentClass);

    // 2. Validate agent metadata
    this.metadataProcessor.validateWorkflowDefinition(agentDefinition);

    // 3. Build StateGraph (reuse buildStateGraph pattern from Task 3.2)
    const graph = this.buildStateGraph(agentDefinition);

    // 4. Compile the agent graph with checkpoint adapter
    const compiled = graph.compile({
      checkpointer: this.checkpointAdapter as unknown as BaseCheckpointSaver,
    });

    // 5. Return with agent id for subgraph coordination
    const result = {
      id: agentDefinition.name,
      graph: compiled,
    };

    this.logger.log(
      `Agent graph built successfully for ${result.id} - ready for subgraph coordination`
    );
    return result;
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
