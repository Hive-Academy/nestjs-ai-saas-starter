import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { RunnableConfig } from '@langchain/core/runnables';
import type {
  BaseCheckpointSaver,
  BaseStore,
} from '@langchain/langgraph-checkpoint';
import { BASE_STORE_TOKEN } from '@hive-academy/langgraph-memory';
import { MetadataProcessorService } from '../core/metadata-processor.service';
import type { WorkflowDefinition } from '../interfaces/workflow-engine.interface';
import { MultiAgentGraphBuilderService } from '../services/multi-agent/multi-agent-graph-builder.service';
import {
  FunctionalTaskGraphStrategy,
  FunctionalNodeGraphStrategy,
} from './strategies';
import type { AnyStateGraph } from './strategies';
import { WorkflowResumptionService } from '../services/workflow-resumption.service';
import type { WorkflowEngineModuleOptions } from '../interfaces/functional/module-options.interface';

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
    private readonly store?: BaseStore,

    // NEW: Inject WorkflowResumptionService for resumption operations
    @Optional()
    private readonly resumptionService?: WorkflowResumptionService
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

    if (!this.resumptionService) {
      this.logger.warn(
        '⚠️  WorkflowResumptionService not available - resumption features disabled'
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
  async executeWorkflow<
    TState extends Record<string, unknown> = Record<string, unknown>
  >(
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
      this.metadataProcessor.extractWorkflowDefinition(workflowClass);

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
   * Supports all LangGraph stream modes:
   * - 'updates': Node-level state deltas (RECOMMENDED - shows tool execution)
   * - 'values': Full state snapshots after super-steps
   * - 'messages': LLM token-level streaming
   * - 'custom': User-defined custom data
   * - 'debug': Detailed execution traces
   * - Array: Multiple modes combined (e.g., ['updates', 'messages'])
   *
   * @param workflowClass - Decorated workflow class
   * @param input - Initial workflow state
   * @param config - Optional RunnableConfig with streamMode and subgraphs flag
   * @yields Workflow state updates (raw chunks from LangGraph)
   *
   * Implementation: Task 3.3
   * Enhancement: Task 6 - Default to 'updates' mode for tool call visibility
   * Enhancement: Comprehensive streaming modes support (messages, custom, debug, multi-mode)
   */
  async *streamWorkflow<
    TState extends Record<string, unknown> = Record<string, unknown>
  >(
    workflowClass: any,
    input: TState,
    config?: RunnableConfig & {
      streamMode?:
        | 'values'
        | 'updates'
        | 'messages'
        | 'custom'
        | 'debug'
        | string[];
      subgraphs?: boolean;
    }
  ): AsyncIterable<unknown> {
    this.logger.debug(`Streaming workflow from class ${workflowClass.name}`);

    // 1. Get workflow instance from NestJS DI (required for bound handlers)
    const workflowInstance = this.moduleRef.get(workflowClass, {
      strict: false,
    });

    // 2. Extract metadata using MetadataProcessorService
    const definition =
      this.metadataProcessor.extractWorkflowDefinition(workflowClass);

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
    this.logger.debug(
      `Streaming mode: ${
        Array.isArray(streamMode) ? streamMode.join(',') : streamMode
      }`
    );

    const stream = await compiled.stream(input, {
      ...config,
      streamMode: streamMode as any, // LangGraph's StreamMode type
    });

    for await (const chunk of stream) {
      yield chunk; // Raw chunks - caller uses StreamEventParser
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
  async executeMultiAgentWorkflow<
    TState extends Record<string, unknown> = Record<string, unknown>
  >(
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
  private buildStateGraph(definition: WorkflowDefinition): AnyStateGraph {
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

  /**
   * Get current state snapshot for a specific thread using LangGraph's native getState() API
   *
   * @deprecated Use WorkflowResumptionService.getWorkflowState() instead
   * This method is kept for backward compatibility and delegates to WorkflowResumptionService
   *
   * @param workflowClass - Workflow class (any type for backward compatibility)
   * @param threadId - Unique thread identifier for checkpoint isolation
   * @returns StateSnapshot containing current state values, next nodes to execute, config, and metadata
   * @throws Error if WorkflowResumptionService not available or state retrieval fails
   *
   * @example
   * ```typescript
   * const snapshot = await workflowExecutionService.getStateSnapshot(MyWorkflow, 'thread-123');
   * console.log('Current state:', snapshot.values);
   * console.log('Next nodes:', snapshot.next);
   * ```
   *
   * Implementation: TASK_2025_048 - BATCH 1, Task 2
   * Refactored: TASK_2025_049 - Task 3 (Delegation Pattern)
   */
  async getStateSnapshot(workflowClass: any, threadId: string): Promise<any> {
    if (!this.resumptionService) {
      throw new Error(
        'WorkflowResumptionService not available - cannot retrieve state snapshot'
      );
    }

    this.logger.warn(
      'DEPRECATED: getStateSnapshot() - Use WorkflowResumptionService.getWorkflowState() instead'
    );

    return await this.resumptionService.getWorkflowState(
      workflowClass.name || workflowClass,
      threadId
    );
  }

  /**
   * List state snapshots for multiple threads in parallel
   *
   * @deprecated This method has incorrect signature (missing workflowClass parameter)
   * Use WorkflowResumptionService.getWorkflowState() for individual threads instead
   *
   * @param workflowClass - Workflow class (required for graph compilation)
   * @param threadIds - Array of thread identifiers to retrieve snapshots for
   * @returns Map of threadId → StateSnapshot for successfully retrieved threads
   *
   * @example
   * ```typescript
   * const snapshots = await workflowExecutionService.listThreadStates(MyWorkflow, ['thread-1', 'thread-2']);
   * for (const [threadId, snapshot] of snapshots) {
   *   console.log(`Thread ${threadId} state:`, snapshot.values);
   * }
   * ```
   *
   * Implementation: TASK_2025_048 - BATCH 1, Task 3
   * Refactored: TASK_2025_049 - Task 3 (Delegation Pattern - signature fix)
   */
  async listThreadStates(
    workflowClass: any,
    threadIds: string[]
  ): Promise<Map<string, any>> {
    this.logger.warn(
      'DEPRECATED: listThreadStates() - Use WorkflowResumptionService.getWorkflowState() for individual threads'
    );

    this.logger.debug(
      `Listing state snapshots for ${threadIds.length} threads`
    );

    if (!this.checkpointer) {
      const error = 'Checkpointer not configured - cannot list thread states';
      this.logger.error(error);
      throw new Error(error);
    }

    try {
      // Fetch all snapshots in parallel using Promise.allSettled for graceful error handling
      const results = await Promise.allSettled(
        threadIds.map((threadId) =>
          this.getStateSnapshot(workflowClass, threadId)
        )
      );

      // Filter successful results and build map
      const stateMap = new Map<string, any>();
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          stateMap.set(threadIds[index], result.value);
        } else {
          this.logger.warn(
            `Failed to retrieve state for thread ${threadIds[index]}: ${result.reason.message}`
          );
        }
      });

      this.logger.log(
        `✅ Retrieved ${stateMap.size}/${threadIds.length} thread state snapshots`
      );
      return stateMap;
    } catch (error: any) {
      this.logger.error(`❌ Failed to list thread states:`, error.message);
      throw error;
    }
  }

  /**
   * Resume workflow execution from interruption (Human-in-the-Loop pattern)
   *
   * @deprecated Use WorkflowResumptionService.resumeWorkflow() instead
   * This method is kept for backward compatibility and delegates to WorkflowResumptionService
   *
   * @param workflowClass - Workflow class (any type for backward compatibility)
   * @param threadId - Thread identifier for the interrupted workflow
   * @param checkpointId - Checkpoint identifier to resume from
   * @param resumeValue - Value to resume with (passed to Command)
   * @returns Final workflow state after resumption
   * @throws Error if WorkflowResumptionService not available or resumption fails
   *
   * @example
   * ```typescript
   * // Resume with approval
   * const result = await workflowExecutionService.resumeFromInterruption(
   *   MyWorkflow,
   *   'thread-123',
   *   'ckpt-456',
   *   { approved: true }
   * );
   * ```
   *
   * Implementation: TASK_2025_048 - BATCH 1, Task 4
   * Refactored: TASK_2025_049 - Task 3 (Delegation Pattern)
   */
  async resumeFromInterruption(
    workflowClass: any,
    threadId: string,
    checkpointId: string,
    resumeValue: any
  ): Promise<any> {
    if (!this.resumptionService) {
      throw new Error(
        'WorkflowResumptionService not available - cannot resume workflow'
      );
    }

    this.logger.warn(
      'DEPRECATED: resumeFromInterruption() - Use WorkflowResumptionService.resumeWorkflow() instead'
    );

    return await this.resumptionService.resumeWorkflow(
      workflowClass.name || workflowClass,
      threadId,
      resumeValue,
      checkpointId
    );
  }
}
