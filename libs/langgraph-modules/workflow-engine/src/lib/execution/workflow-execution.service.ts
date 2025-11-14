import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { RunnableConfig } from '@langchain/core/runnables';
import { StateGraph } from '@langchain/langgraph';
import type {
  BaseCheckpointSaver,
  BaseStore,
} from '@langchain/langgraph-checkpoint';
import { BASE_STORE_TOKEN } from '@hive-academy/langgraph-memory';
import { MetadataProcessorService } from '../core/metadata-processor.service';
import type {
  WorkflowDefinition,
  WorkflowState,
} from '../interfaces/workflow-engine.interface';
import type { WorkflowEngineModuleOptions } from '../workflow-engine.module';
import { MultiAgentGraphBuilderService } from '../services/multi-agent/multi-agent-graph-builder.service';
import {
  FunctionalTaskGraphStrategy,
  FunctionalNodeGraphStrategy,
} from './strategies';

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
    private readonly multiAgentGraphBuilder: MultiAgentGraphBuilderService,
    private readonly functionalTaskStrategy: FunctionalTaskGraphStrategy,
    private readonly functionalNodeStrategy: FunctionalNodeGraphStrategy,
    @Inject('WORKFLOW_ENGINE_MODULE_OPTIONS')
    options: WorkflowEngineModuleOptions,

    // Inject BaseStore from MemoryModule (optional enhancement) - using typed token
    @Optional()
    @Inject(BASE_STORE_TOKEN)
    private readonly store?: BaseStore
  ) {
    // Get checkpointer from module options (LangGraph native)
    this.checkpointer = options.checkpointer;

    this.logger.log(
      'WorkflowExecutionService initialized with strategy pattern'
    );

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

    // 1. Get workflow instance from NestJS DI (required for bound handlers)
    const workflowInstance = this.moduleRef.get(workflowClass, {
      strict: false,
    });

    // 2. Extract metadata using MetadataProcessorService
    const definition =
      this.metadataProcessor.extractWorkflowDefinition<TState>(workflowClass);

    // 3. Bind all handlers to instance (fixes 'this' context)
    definition.nodes.forEach((node) => {
      if (node.handler && workflowInstance) {
        // Bind handler to instance so 'this' works inside methods
        node.handler = node.handler.bind(workflowInstance);
      }
    });

    // 4. Validate metadata
    this.metadataProcessor.validateWorkflowDefinition(definition);

    // 5. Build StateGraph from metadata
    const graph = this.buildStateGraph(definition);

    // 6. Compile with BOTH checkpointer and store
    const compiled = graph.compile({
      checkpointer: this.checkpointer,
      store: this.store, // NEW: Pass store to graph (optional)
    });

    // 7. Execute with LangGraph's native invoke()
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

    // 1. Get workflow instance from NestJS DI (required for bound handlers)
    const workflowInstance = this.moduleRef.get(workflowClass, {
      strict: false,
    });

    // 2. Extract metadata using MetadataProcessorService
    const definition =
      this.metadataProcessor.extractWorkflowDefinition<TState>(workflowClass);

    // 3. Bind all handlers to instance (fixes 'this' context)
    definition.nodes.forEach((node) => {
      if (node.handler && workflowInstance) {
        // Bind handler to instance so 'this' works inside methods
        node.handler = node.handler.bind(workflowInstance);
      }
    });

    // 4. Validate metadata
    this.metadataProcessor.validateWorkflowDefinition(definition);

    // 5. Build StateGraph from metadata (reuse helper from Task 3.2)
    const graph = this.buildStateGraph(definition);

    // 6. Compile with BOTH checkpointer and store
    const compiled = graph.compile({
      checkpointer: this.checkpointer,
      store: this.store, // NEW: Pass store to graph (optional)
    });

    // 7. Stream using LangGraph's native stream()
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
   * Execute multi-agent workflow using MultiAgentGraphBuilderService
   *
   * Delegates graph construction to MultiAgentGraphBuilderService which handles
   * topology-specific patterns (supervisor, sequential, etc.) via Strategy Pattern.
   *
   * @param supervisorClass - Decorated supervisor workflow class with @MultiAgent
   * @param agentClasses - Array of decorated agent classes (deprecated - extracted from config)
   * @param input - Initial workflow state
   * @param config - Optional RunnableConfig (thread_id, etc.)
   * @returns Final workflow state
   *
   * REFACTORED: Task 7 - Integration with MultiAgentGraphBuilderService
   * REPLACES: Manual metadata extraction + buildAgentGraph() pattern
   *
   * Pattern:
   * 1. Delegate graph building to MultiAgentGraphBuilderService
   * 2. Compile graph with checkpointer and store
   * 3. Execute via LangGraph's native invoke()
   */
  async executeMultiAgentWorkflow<TState extends WorkflowState = WorkflowState>(
    supervisorClass: any,
    agentClasses: any[],
    input: TState,
    config?: RunnableConfig
  ): Promise<TState> {
    this.logger.log(
      `Executing multi-agent workflow: ${supervisorClass.name} with ${agentClasses.length} agents`
    );

    try {
      // 1. Delegate graph building to MultiAgentGraphBuilderService
      // Type assertion needed due to LangGraph's complex generic constraints
      const graph = await this.multiAgentGraphBuilder.buildGraph(
        supervisorClass
      );

      // 2. Compile graph with checkpointer and store
      const compiled = graph.compile({
        checkpointer: this.checkpointer,
        store: this.store,
      });

      // 3. Execute using LangGraph's native invoke()
      const result = await compiled.invoke(input, config);

      this.logger.log(
        `Multi-agent workflow ${supervisorClass.name} completed successfully`
      );
      return result as TState;
    } catch (error) {
      this.logger.error(
        `Multi-agent workflow ${supervisorClass.name} failed:`,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * Build LangGraph StateGraph from WorkflowDefinition metadata
   * Delegates to pattern-specific strategy based on workflow type
   *
   * **Strategy Pattern**:
   * - functional-task → FunctionalTaskGraphStrategy
   * - functional-node → FunctionalNodeGraphStrategy
   *
   * @param definition - WorkflowDefinition extracted from decorators
   * @returns StateGraph instance ready for compilation
   */
  private buildStateGraph<TState extends WorkflowState = WorkflowState>(
    definition: WorkflowDefinition<TState>
  ): StateGraph<TState> {
    const workflowType = definition.config?.metadata?.pattern as string;

    this.logger.debug(
      `Building StateGraph for ${definition.name} using ${
        workflowType || 'node'
      }-based strategy`
    );

    // Select strategy based on workflow pattern
    const strategy =
      workflowType === 'functional-task'
        ? this.functionalTaskStrategy
        : this.functionalNodeStrategy;

    // Delegate graph building to strategy
    return strategy.buildStateGraph(definition);
  }
}
