import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Command } from '@langchain/langgraph';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { StateSnapshot } from '@langchain/langgraph';
import type {
  BaseCheckpointSaver,
  BaseStore,
} from '@langchain/langgraph-checkpoint';

import { MetadataProcessorService } from '../core/metadata-processor.service';
import { LangGraphCommandService } from './langgraph-command.service';
import type { WorkflowDefinition } from '../interfaces/workflow-engine.interface';
// WorkflowState import removed - using Record<string, unknown> constraint instead
import { BASE_STORE_TOKEN } from '@hive-academy/langgraph-memory';
import {
  FunctionalTaskGraphStrategy,
  FunctionalNodeGraphStrategy,
} from '../execution/strategies';
import type { WorkflowEngineModuleOptions } from '../interfaces/functional/module-options.interface';

/**
 * SanitizedStateSnapshot
 *
 * StateSnapshot with PII-sensitive fields redacted
 *
 * SECURITY: Filters password, apiKey, token, ssn, creditCard, secret, privateKey,
 * accessToken, refreshToken, sessionId fields (case-insensitive)
 */
export interface SanitizedStateSnapshot<TState = any> {
  values: TState;
  next: string[];
  tasks: Array<{ id: string; name: string; interrupts: any[] }>;
  config: RunnableConfig;
  metadata: Record<string, any>;
}

/**
 * WorkflowResumptionService
 *
 * High-level orchestration for workflow resumption, state retrieval, and state updates.
 * Delegates to LangGraphCommandService for Command operations and handles graph compilation,
 * PII sanitization, and business logic.
 *
 * ARCHITECTURE DECISION (TASK_2025_049):
 * - Separated from LangGraphCommandService for SRP compliance
 * - LangGraphCommandService = pure LangGraph API wrapper (low-level)
 * - WorkflowResumptionService = business logic orchestration (high-level)
 *
 * RESPONSIBILITIES:
 * 1. Graph Compilation: Reuses pattern from WorkflowExecutionService
 * 2. Command Delegation: All Command operations delegated to LangGraphCommandService
 * 3. PII Sanitization: Filters sensitive fields from StateSnapshot responses
 * 4. Business Logic: Orchestrates resumption, state retrieval, state updates
 *
 * PATTERN: Service Facade + Strategy Delegation
 *
 * @see LangGraphCommandService for low-level Command operations
 * @see WorkflowExecutionService for graph compilation pattern
 */
@Injectable()
export class WorkflowResumptionService {
  private readonly logger = new Logger(WorkflowResumptionService.name);
  private readonly checkpointer: BaseCheckpointSaver;
  private readonly store?: BaseStore;

  constructor(
    private readonly metadataProcessor: MetadataProcessorService,
    private readonly moduleRef: ModuleRef,
    private readonly commandService: LangGraphCommandService,
    private readonly functionalTaskStrategy: FunctionalTaskGraphStrategy,
    private readonly functionalNodeStrategy: FunctionalNodeGraphStrategy,
    @Inject('WORKFLOW_ENGINE_MODULE_OPTIONS')
    options: WorkflowEngineModuleOptions,
    @Optional() @Inject(BASE_STORE_TOKEN) store?: BaseStore
  ) {
    this.checkpointer = options.checkpointer!;
    this.store = store;

    this.logger.log('WorkflowResumptionService initialized');
    if (this.checkpointer) {
      this.logger.log(
        `✅ Checkpointer available: ${this.checkpointer.constructor.name}`
      );
    } else {
      this.logger.warn(
        '⚠️  No checkpointer configured - resumption requires checkpointer'
      );
    }
    if (this.store) {
      this.logger.log('✅ BaseStore available for graph compilation');
    }
  }

  /**
   * Resume a workflow from an interruption point using LangGraph Command pattern
   *
   * HIGH-LEVEL OPERATION: Orchestrates graph compilation + Command invocation
   *
   * @param workflowClass - Workflow class name (string for NestJS DI lookup)
   * @param threadId - Thread identifier for checkpoint retrieval
   * @param resumeValue - Value to resume with (passed to Command)
   * @param checkpointId - Optional checkpoint ID to resume from specific checkpoint
   * @returns Final workflow state after resumption
   *
   * @throws Error if workflow not found, graph compilation fails, or Command invocation fails
   *
   * Evidence: task-description.md:680-696 (Command pattern for resumption)
   *
   * @example
   * ```typescript
   * const result = await resumptionService.resumeWorkflow(
   *   'ResearchWorkflowAgent',
   *   'thread-123',
   *   { approved: true },
   *   'ckpt-456'
   * );
   * ```
   */
  async resumeWorkflow<
    TState extends Record<string, unknown> = Record<string, unknown>
  >(
    workflowClass: string,
    threadId: string,
    resumeValue: any,
    checkpointId?: string,
    userConfig?: RunnableConfig
  ): Promise<TState> {
    this.logger.log(
      `Resuming workflow: ${workflowClass}, threadId: ${threadId}`
    );

    const graph = await this.compileWorkflowGraph<TState>(workflowClass);
    const command = new Command({ resume: resumeValue });
    const config: RunnableConfig = {
      configurable: {
        thread_id: threadId,
        checkpoint_id: checkpointId,
        ...userConfig?.configurable,
      },
    };

    const result = await this.commandService.invokeWithCommand<TState>(
      graph,
      command,
      config
    );
    this.logger.log(`Workflow resumed successfully: ${workflowClass}`);

    return result;
  }

  /**
   * Get current workflow state with PII sanitization
   *
   * HIGH-LEVEL OPERATION: Orchestrates graph compilation + state retrieval + sanitization
   *
   * @param workflowClass - Workflow class name (string for NestJS DI lookup)
   * @param threadId - Thread identifier for checkpoint retrieval
   * @returns SanitizedStateSnapshot with PII fields redacted
   *
   * @throws Error if workflow not found, graph compilation fails, or state retrieval fails
   *
   * Evidence: task-description.md:199-241 (StateSnapshot API Contract)
   *
   * @example
   * ```typescript
   * const snapshot = await resumptionService.getWorkflowState(
   *   'ResearchWorkflowAgent',
   *   'thread-123'
   * );
   * console.log('Next nodes:', snapshot.next);
   * console.log('Tasks:', snapshot.tasks);
   * ```
   */
  async getWorkflowState<
    TState extends Record<string, unknown> = Record<string, unknown>
  >(
    workflowClass: string,
    threadId: string
  ): Promise<SanitizedStateSnapshot<TState>> {
    this.logger.debug(
      `Retrieving state for workflow: ${workflowClass}, threadId: ${threadId}`
    );

    const graph = await this.compileWorkflowGraph<TState>(workflowClass);
    const config: RunnableConfig = {
      configurable: { thread_id: threadId },
    };

    const snapshot = await this.commandService.getState(graph, config);
    const sanitized = this.sanitizeStateSnapshot<TState>(snapshot);

    this.logger.debug(
      `State retrieved and sanitized for workflow: ${workflowClass}`
    );
    return sanitized;
  }

  /**
   * Update workflow state using LangGraph updateState API
   *
   * HIGH-LEVEL OPERATION: Orchestrates graph compilation + state update
   *
   * @param workflowClass - Workflow class name (string for NestJS DI lookup)
   * @param threadId - Thread identifier for checkpoint retrieval
   * @param updates - Partial state updates to apply
   * @param asNode - Optional node name to attribute update to
   *
   * @throws Error if workflow not found, graph compilation fails, or state update fails
   *
   * Evidence: task-description.md:651-668 (HITL with State Update - Advanced)
   *
   * @example
   * ```typescript
   * await resumptionService.updateWorkflowState(
   *   'ResearchWorkflowAgent',
   *   'thread-123',
   *   { metadata: { customField: 'value' } },
   *   'myNode'
   * );
   * ```
   */
  async updateWorkflowState<TState extends Record<string, unknown>>(
    workflowClass: string,
    threadId: string,
    updates: Record<string, any>,
    asNode?: string
  ): Promise<void> {
    this.logger.log(
      `Updating state for workflow: ${workflowClass}, threadId: ${threadId}`
    );

    const graph = await this.compileWorkflowGraph<TState>(workflowClass);
    const config: RunnableConfig = {
      configurable: { thread_id: threadId },
    };

    await this.commandService.updateState(graph, updates, asNode, config);
    this.logger.log(
      `State updated successfully for workflow: ${workflowClass}`
    );
  }

  /**
   * Compile workflow graph using pattern from WorkflowExecutionService.executeWorkflow()
   *
   * PRIVATE HELPER: Reuses exact graph compilation pattern from WorkflowExecutionService
   *
   * Reference: workflow-execution.service.ts:111-152
   *
   * PATTERN:
   * 1. Get workflow instance from NestJS module container via ModuleRef
   * 2. Extract WorkflowDefinition using MetadataProcessorService
   * 3. Bind handlers to instance (fixes 'this' context)
   * 4. Validate workflow definition
   * 5. Build StateGraph from definition using MetadataProcessorService
   * 6. Compile graph with checkpointer + store
   *
   * @param workflowClass - Workflow class name (string for NestJS DI lookup)
   * @returns Compiled StateGraph ready for execution
   *
   * @throws Error if workflow not found or compilation fails
   */
  private async compileWorkflowGraph<TState extends Record<string, unknown>>(
    workflowClass: string
  ): Promise<any> {
    this.logger.debug(`Compiling workflow graph: ${workflowClass}`);

    // 1. Get workflow instance from NestJS module container
    const instance = this.moduleRef.get(workflowClass, { strict: false });

    // 2. Extract workflow definition using metadata processor
    const definition =
      this.metadataProcessor.extractWorkflowDefinition(instance);

    // 3. Bind all handlers to instance (fixes 'this' context)
    definition.nodes.forEach((node) => {
      if (node.handler && instance) {
        node.handler = node.handler.bind(instance);
      }
    });

    // 4. Validate workflow definition
    this.metadataProcessor.validateWorkflowDefinition(definition);

    // 5. Build StateGraph from definition using Strategy pattern
    const graph = this.buildStateGraph(definition);

    // 6. Compile with checkpointer and store
    const compiledGraph = graph.compile({
      checkpointer: this.checkpointer,
      store: this.store,
    });

    this.logger.debug(`Workflow graph compiled successfully: ${workflowClass}`);
    return compiledGraph;
  }

  /**
   * Build StateGraph using Strategy pattern (same as WorkflowExecutionService)
   *
   * PRIVATE HELPER: Delegates to FunctionalTaskGraphStrategy or FunctionalNodeGraphStrategy
   *
   * Reference: workflow-execution.service.ts:239-254
   *
   * @param definition - WorkflowDefinition from metadata extraction
   * @returns StateGraph ready for compilation
   */
  private buildStateGraph(definition: WorkflowDefinition): any {
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
   * Sanitize StateSnapshot by filtering PII fields
   *
   * PRIVATE HELPER: Recursive object sanitization for security compliance
   *
   * SECURITY POLICY:
   * - Filters fields case-insensitively: password, apiKey, token, ssn, creditCard,
   *   secret, privateKey, accessToken, refreshToken, sessionId
   * - Replaces sensitive values with '[REDACTED]'
   * - Recursively sanitizes nested objects and arrays
   * - Preserves all non-sensitive data
   *
   * @param snapshot - Raw StateSnapshot from LangGraph
   * @returns SanitizedStateSnapshot with PII fields redacted
   */
  private sanitizeStateSnapshot<TState>(
    snapshot: StateSnapshot
  ): SanitizedStateSnapshot<TState> {
    const sensitiveFields = [
      'password',
      'apiKey',
      'token',
      'ssn',
      'creditCard',
      'secret',
      'privateKey',
      'accessToken',
      'refreshToken',
      'sessionId',
    ];

    const sanitizeObject = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;

      if (Array.isArray(obj)) {
        return obj.map((item) => sanitizeObject(item));
      }

      if (typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          // Check if key matches sensitive field patterns (case-insensitive)
          const isSensitive = sensitiveFields.some((field) =>
            key.toLowerCase().includes(field.toLowerCase())
          );

          if (isSensitive) {
            sanitized[key] = '[REDACTED]';
          } else {
            sanitized[key] = sanitizeObject(value);
          }
        }
        return sanitized;
      }

      return obj;
    };

    const sanitizedValues = sanitizeObject(snapshot.values);
    const sanitizedMetadata = sanitizeObject(snapshot.metadata);

    return {
      values: sanitizedValues as TState,
      next: snapshot.next,
      tasks: snapshot.tasks.map((task) => ({
        id: task.id,
        name: task.name,
        interrupts: task.interrupts,
      })),
      config: snapshot.config,
      metadata: sanitizedMetadata,
    };
  }
}
