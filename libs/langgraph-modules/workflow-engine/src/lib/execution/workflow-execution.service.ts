import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { RunnableConfig } from '@langchain/core/runnables';
import { StateGraph, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type {
  BaseCheckpointSaver,
  BaseStore,
} from '@langchain/langgraph-checkpoint';
import { BASE_STORE_TOKEN } from '@hive-academy/langgraph-memory';
import { MetadataProcessorService } from '../core/metadata-processor.service';
import type {
  WorkflowDefinition,
  WorkflowState,
  ConditionalRouting,
  WorkflowNode,
} from '../interfaces/workflow-engine.interface';
import { AGENT_METADATA_KEY } from '../decorators/multi-agent/agent.decorator';
import { ToolRegistryService } from '../services/tool-registry.service';
import { LlmProviderService } from '../services/llm/llm-provider.service';
import type { LLMWithTools } from '../types/internal-types';
import type { WorkflowEngineModuleOptions } from '../workflow-engine.module';

/**
 * WorkflowExecutionService
 *
 * Builds LangGraph StateGraph from WorkflowDefinition metadata and executes workflows.
 *
 * ARCHITECTURE CHANGE (2025-01-11):
 * - Migrated from ICheckpointAdapter to LangGraph native BaseCheckpointSaver
 * - Checkpointer passed via module options (not DI injection)
 * - Supports RedisSaver (production), SqliteSaver (dev), MemorySaver (test)
 * - Zero abstraction layer - direct LangGraph API usage
 *
 * ARCHITECTURE PATTERN:
 * - MetadataProcessorService: Extracts decorator metadata → WorkflowDefinition
 * - WorkflowExecutionService: Builds StateGraph from metadata → Executes workflows
 *
 * DELEGATION TO LANGGRAPH:
 * - Use StateGraph.addNode(), addEdge(), addConditionalEdges()
 * - Use graph.compile({ checkpointer, store })
 * - Use graph.invoke() and graph.stream()
 * - NO custom execution engines, NO custom graph builders
 */
@Injectable()
export class WorkflowExecutionService {
  private readonly logger = new Logger(WorkflowExecutionService.name);
  private readonly checkpointer?: BaseCheckpointSaver;

  constructor(
    private readonly metadataProcessor: MetadataProcessorService,
    private readonly moduleRef: ModuleRef,
    private readonly toolRegistry: ToolRegistryService,
    @Inject('WORKFLOW_ENGINE_MODULE_OPTIONS')
    options: WorkflowEngineModuleOptions,

    // Inject BaseStore from MemoryModule (optional enhancement) - using typed token
    @Optional()
    @Inject(BASE_STORE_TOKEN)
    private readonly store?: BaseStore
  ) {
    // Get checkpointer from module options (LangGraph native)
    this.checkpointer = options.checkpointer;

    this.logger.log('WorkflowExecutionService initialized');

    if (this.checkpointer) {
      const saverType = this.checkpointer.constructor.name;
      this.logger.log(`✅ Checkpointer: ${saverType} (LangGraph native)`);
    } else {
      this.logger.warn(
        '⚠️  No checkpointer configured - workflows will not persist state'
      );
    }

    if (this.store) {
      this.logger.log(
        '✅ BaseStore available - nodes can access via RunnableConfig.store'
      );
    }
  }

  /**
   * Execute a workflow using LangGraph's native invoke()
   *
   * Store Access Pattern (if MemoryModule imported):
   * Nodes can access the store via RunnableConfig using type-safe helpers:
   *
   * @example
   * import { RunnableConfigStoreHelpers } from '@hive-academy/langgraph-memory';
   *
   * async function myNode(state: State, config: RunnableConfig): Promise<Partial<State>> {
   *   const store = RunnableConfigStoreHelpers.getStore(config);
   *   if (store) {
   *     // Use LangGraph BaseStore methods
   *     await store.put(['memories', userId], 'key', { data: 'value' });
   *     const items = await store.search(['memories', userId], { query: 'search term' });
   *   }
   *   return { processed: true };
   * }
   *
   * @param workflowClass - Decorated workflow class
   * @param input - Initial workflow state
   * @param config - Optional LangGraph config (checkpointing, store access)
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

    // 4. Compile with BOTH checkpointer and store
    const compiled = graph.compile({
      checkpointer: this.checkpointer,
      store: this.store, // NEW: Pass store to graph (optional)
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
   * @param config - Optional RunnableConfig with streamMode ('updates' by default for tool visibility)
   * @yields Workflow state updates
   *
   * Implementation: Task 3.3
   * Enhancement: Task 6 - Default to 'updates' mode for tool call visibility
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

    // 4. Compile with BOTH checkpointer and store
    const compiled = graph.compile({
      checkpointer: this.checkpointer,
      store: this.store, // NEW: Pass store to graph (optional)
    });

    // 5. Stream using LangGraph's native stream()
    // Default to 'updates' mode for tool call visibility (Task 6 enhancement)
    const streamMode = config?.streamMode || 'updates';
    this.logger.debug(`Streaming mode: ${streamMode}`);

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

    // 6. Compile supervisor graph with BOTH checkpointer and store
    const compiled = supervisorGraph.compile({
      checkpointer: this.checkpointer,
      store: this.store, // NEW: Pass store to supervisor graph (optional)
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

    // 2. Extract agent configuration from @Agent decorator
    const agentConfig = Reflect.getMetadata(AGENT_METADATA_KEY, AgentClass);

    // 3. Get tools for this agent
    const toolNames = agentConfig?.tools || [];
    const tools = this.toolRegistry.getTools(toolNames);

    // 4. Bind tools to LLM (if agent has tools)
    if (tools.length > 0) {
      this.logger.debug(
        `Binding ${tools.length} tools to agent ${
          agentConfig?.id || agentDefinition.name
        }: ${toolNames.join(', ')}`
      );

      // Inject LlmProviderService to get LLM instance
      const llmProvider = this.moduleRef.get(LlmProviderService, {
        strict: false,
      });
      const llm = (await llmProvider.getLLM()) as unknown as LLMWithTools;

      // Bind tools to LLM
      const llmWithTools = llm.bindTools(tools);

      // Store bound LLM and tools in agent definition config metadata
      agentDefinition.config = {
        ...agentDefinition.config,
        metadata: {
          ...(agentDefinition.config?.metadata || {}),
          llmWithTools: llmWithTools,
          tools: tools,
          toolNames: toolNames,
        },
      };

      this.logger.debug(
        `Tools bound to agent ${agentConfig?.id || agentDefinition.name}`
      );
    }

    // 5. Validate agent metadata
    this.metadataProcessor.validateWorkflowDefinition(agentDefinition);

    // 6. Build StateGraph (reuse buildStateGraph pattern from Task 3.2)
    const graph = this.buildStateGraph(agentDefinition);

    // 7. Compile the agent graph with BOTH checkpointer and store
    const compiled = graph.compile({
      checkpointer: this.checkpointer,
      store: this.store, // NEW: Pass store to agent graph (optional)
    });

    // 8. Return with agent id for subgraph coordination
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

    // Check if agent has tools
    const hasTools =
      definition.config?.metadata?.tools &&
      (definition.config.metadata.tools as unknown[]).length > 0;

    // Add all nodes
    definition.nodes.forEach((node) => {
      this.logger.debug(`Adding node: ${node.id}`);
      // @ts-expect-error - LangGraph's complex conditional types cause issues with strict mode
      // Handler signature is correct: (state: TState) => Promise<Partial<TState> | Command>
      graph.addNode(node.id, node.handler);
    });

    // Add ToolNode if tools present
    if (hasTools) {
      const tools = definition.config!.metadata!.tools as any[];
      const toolNode = new ToolNode(tools);
      // @ts-expect-error - LangGraph's complex conditional types cause issues with strict mode
      graph.addNode('tools', toolNode as any);

      this.logger.debug(
        `Added ToolNode with ${tools.length} tools to graph ${definition.name}`
      );
    }

    // Add edges from metadata (with tool routing if tools exist)
    this.addEdgesFromMetadata(graph, definition, hasTools);

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
   * @param hasTools - Whether the agent has tools (enables conditional tool routing)
   */
  private addEdgesFromMetadata<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    definition: WorkflowDefinition<TState>,
    hasTools: boolean
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

    // 3. Add conditional tool routing if tools present
    if (hasTools) {
      definition.nodes.forEach((node) => {
        // Add conditional edge: node → tools (if tool_calls) OR next node
        const nextNode = this.getNextNode(node, definition);

        this.logger.debug(
          `Adding tool routing for node ${node.id}: tools or ${
            nextNode || 'END'
          }`
        );

        graph.addConditionalEdges(
          node.id as any,
          this.shouldExecuteTools.bind(this),
          {
            tools: 'tools' as any,
            continue: (nextNode || END) as any,
          }
        );
      });

      // Tools always return to the entry point (agent node)
      // This creates the execution loop: agent → tools → agent
      graph.addEdge('tools' as any, definition.entryPoint as any);
    }
  }

  /**
   * Determines whether to execute tools based on the last message in state
   * Routes to 'tools' if tool_calls present, otherwise continues to next node
   *
   * @param state - Current workflow state
   * @returns 'tools' if tool calls detected, 'continue' otherwise
   */
  private shouldExecuteTools(state: WorkflowState): 'tools' | 'continue' {
    if (!state.messages || state.messages.length === 0) {
      return 'continue';
    }

    const lastMessage = state.messages[state.messages.length - 1];

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
   * Get the next node for a given node from the workflow definition
   *
   * @param node - Current workflow node
   * @param definition - WorkflowDefinition with edge metadata
   * @returns Next node ID or null if no explicit next node
   */
  private getNextNode<TState extends WorkflowState = WorkflowState>(
    node: WorkflowNode<TState>,
    definition: WorkflowDefinition<TState>
  ): string | null {
    // Find explicit edge from this node
    const edge = definition.edges.find((e) => e.from === node.id);
    if (edge && typeof edge.to === 'string') {
      return edge.to;
    }

    // No explicit next node
    return null;
  }
}
