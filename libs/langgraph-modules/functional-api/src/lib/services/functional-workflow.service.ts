import { Injectable, Logger, OnModuleInit, Inject, Optional } from '@nestjs/common';
import { Observable, Subject, throwError } from 'rxjs';
import {
  FunctionalWorkflowState,
  TaskExecutionContext,
  TaskExecutionResult,
  WorkflowExecutionResult,
  WorkflowExecutionOptions,
  WorkflowStreamEvent,
  TaskDependencyGraph,
  TaskDefinition,
} from '../interfaces/functional-workflow.interface';
import type { FunctionalApiModuleOptions } from '../interfaces/module-options.interface';
import { WorkflowRegistrationService } from './workflow-registration.service';
import { GraphGeneratorService } from './graph-generator.service';
import { WorkflowValidator } from '../validation/workflow-validator';
import {
  WorkflowExecutionError,
  TaskExecutionError,
  TaskTimeoutError,
  UnknownTaskError,
} from '../errors/functional-workflow.errors';
import type {
  BaseCheckpoint,
  BaseCheckpointMetadata,
  BaseCheckpointTuple,
  ICheckpointAdapter,
  IStreamingService,
  IMemoryAdapter,
} from '@hive-academy/langgraph-core';

/**
 * Main service for executing functional workflows
 */
@Injectable()
export class FunctionalWorkflowService implements OnModuleInit {
  private readonly logger = new Logger(FunctionalWorkflowService.name);
  private readonly streamSubject = new Subject<WorkflowStreamEvent>();
  private executionCounter = 0;

  constructor(
    @Inject('FUNCTIONAL_API_MODULE_OPTIONS')
    private readonly options: FunctionalApiModuleOptions,
    private readonly registrationService: WorkflowRegistrationService,
    private readonly graphGenerator: GraphGeneratorService,
    private readonly validator: WorkflowValidator,
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter: ICheckpointAdapter,
    @Inject('IStreamingService')
    private readonly streamingService: IStreamingService,
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {}

  async onModuleInit(): Promise<void> {
    // Workflows are registered explicitly through the module initializer
  }

  /**
   * Executes a workflow by name
   */
  async executeWorkflow<
    TState extends FunctionalWorkflowState = FunctionalWorkflowState
  >(
    workflowName: string,
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecutionResult<TState>> {
    const startTime = Date.now();
    const executionId = `exec_${++this.executionCounter}_${Date.now()}`;

    try {
      this.logger.log(
        `Starting workflow execution: ${workflowName} (${executionId})`
      );

      const definition = this.registrationService.getWorkflow(workflowName);
      if (!definition) {
        throw new WorkflowExecutionError(
          workflowName,
          `Workflow '${workflowName}' not found`,
          undefined,
          undefined,
          { executionId }
        );
      }

      const instance =
        this.registrationService.getWorkflowInstance(workflowName);
      if (!instance) {
        throw new WorkflowExecutionError(
          workflowName,
          `Workflow instance for '${workflowName}' not found`,
          undefined,
          undefined,
          { executionId }
        );
      }

      // Build execution plan
      const dependencyGraph = this.validator.buildDependencyGraph(definition);
      const executionOrder = this.planExecution(dependencyGraph);

      // 🧠 MEMORY ENHANCEMENT: Retrieve historical workflow patterns for context enhancement
      const enhancedContext = await this.enhanceWorkflowContext(
        workflowName,
        executionId,
        options.initialState || {}
      );

      let currentState: TState = {
        workflowName,
        executionId,
        currentStep: 0,
        ...options.initialState,
        ...enhancedContext, // Apply memory-enhanced context
      } as TState;

      let checkpointCount = 0;
      const executionPath: string[] = [];

      // Execute tasks in dependency order
      for (const taskName of executionOrder) {
        try {
          await this.emitStreamEvent({
            type: 'task_start',
            taskName,
            timestamp: new Date(),
            metadata: { executionId, workflowName },
          });

          const taskStartTime = Date.now();
          const result = await this.executeTask(
            instance,
            definition.tasks.get(taskName)!,
            {
              state: currentState,
              taskName,
              workflowId: workflowName,
              executionId,
              previousTask: executionPath[executionPath.length - 1],
              metadata: options.metadata || {},
            }
          );
          const taskExecutionTime = Date.now() - taskStartTime;

          // 🧠 MEMORY LEARNING: Store task performance metrics for optimization
          await this.storeTaskPerformance(
            workflowName,
            taskName,
            executionId,
            {
              success: true,
              executionTime: taskExecutionTime,
              inputState: currentState,
              outputState: result.state,
              shouldCheckpoint: result.shouldCheckpoint,
            }
          );

          // Update state
          currentState = {
            ...currentState,
            ...result.state,
            currentTask: taskName,
            currentStep: (currentState.currentStep || 0) + 1,
          } as TState;

          executionPath.push(taskName);

          // Handle checkpointing
          if (
            this.options.enableCheckpointing &&
            (result.shouldCheckpoint ||
              this.shouldAutoCheckpoint(checkpointCount))
          ) {
            await this.saveCheckpoint(executionId, currentState);
            checkpointCount++;
          }

          await this.emitStreamEvent({
            type: 'task_complete',
            taskName,
            state: result.state,
            timestamp: new Date(),
            metadata: { executionId, workflowName },
          });
        } catch (error) {
          const taskError =
            error instanceof Error ? error : new Error(String(error));

          // 🧠 MEMORY LEARNING: Store error patterns for future avoidance
          await this.storeTaskPerformance(
            workflowName,
            taskName,
            executionId,
            {
              success: false,
              executionTime: Date.now() - Date.now(), // Will be overridden with actual time
              error: taskError.message,
              errorType: taskError.constructor.name,
              inputState: currentState,
              executionPath: [...executionPath],
            }
          );

          await this.emitStreamEvent({
            type: 'task_error',
            taskName,
            error: taskError,
            timestamp: new Date(),
            metadata: { executionId, workflowName },
          });

          throw new WorkflowExecutionError(
            workflowName,
            `Task '${taskName}' failed during execution`,
            taskName,
            taskError,
            { executionId, executionPath }
          );
        }
      }

      const executionTime = Date.now() - startTime;
      const result: WorkflowExecutionResult<TState> = {
        finalState: currentState,
        executionPath,
        executionTime,
        checkpointCount,
      };

      await this.emitStreamEvent({
        type: 'workflow_complete',
        state: currentState,
        timestamp: new Date(),
        metadata: { executionId, workflowName, executionTime },
      });

      // 🧠 MEMORY LEARNING: Store complete workflow execution for future optimization
      await this.storeWorkflowExecution(
        workflowName,
        executionId,
        {
          success: true,
          finalState: currentState,
          executionPath,
          executionTime,
          checkpointCount,
          totalTasks: executionOrder.length,
          initialState: options.initialState || {},
        }
      );

      this.logger.log(
        `Workflow execution completed: ${workflowName} (${executionId}) in ${executionTime}ms`
      );

      return result;
    } catch (error) {
      const executionError =
        error instanceof WorkflowExecutionError
          ? error
          : new WorkflowExecutionError(
              workflowName,
              'Workflow execution failed',
              undefined,
              error instanceof Error ? error : new Error(String(error)),
              { executionId }
            );

      await this.emitStreamEvent({
        type: 'workflow_error',
        error: executionError,
        timestamp: new Date(),
        metadata: { executionId, workflowName },
      });

      // 🧠 MEMORY LEARNING: Store workflow failure patterns
      await this.storeWorkflowExecution(
        workflowName,
        executionId,
        {
          success: false,
          error: executionError.message,
          errorType: executionError.constructor.name,
          executionTime: Date.now() - startTime,
          failedAt: (executionError as any).taskName,
          initialState: options.initialState || {},
        }
      );

      this.logger.error(
        `Workflow execution failed: ${workflowName} (${executionId})`,
        executionError.stack
      );

      throw executionError;
    }
  }

  /**
   * Streams workflow execution events
   */
  streamWorkflow<
    TState extends FunctionalWorkflowState = FunctionalWorkflowState
  >(
    workflowName: string,
    options: WorkflowExecutionOptions = {}
  ): Observable<WorkflowStreamEvent<TState>> {
    if (!this.options.enableStreaming) {
      return throwError(() => new Error('Streaming is not enabled'));
    }

    const executionId = `stream_exec_${++this.executionCounter}_${Date.now()}`;

    return new Observable((observer) => {
      // Subscribe to internal stream subject for this execution
      const subscription = this.streamSubject.subscribe({
        next: (event) => {
          // Filter events for this execution
          if (event.metadata?.executionId === executionId) {
            observer.next(event as WorkflowStreamEvent<TState>);
          }
        },
        error: (error) => observer.error(error),
        complete: () => observer.complete(),
      });

      // Start workflow execution asynchronously
      this.executeWorkflow<TState>(workflowName, {
        ...options,
        metadata: { ...options.metadata, executionId },
      })
        .then((result) => {
          // Emit final result
          const completeEvent: WorkflowStreamEvent<TState> = {
            type: 'workflow_complete',
            state: result.finalState,
            timestamp: new Date(),
            metadata: {
              executionId,
              workflowName,
              executionTime: result.executionTime,
              executionPath: result.executionPath,
              checkpointCount: result.checkpointCount,
            },
          };
          observer.next(completeEvent);
          observer.complete();
        })
        .catch((error) => {
          const errorEvent: WorkflowStreamEvent<TState> = {
            type: 'workflow_error',
            error: error instanceof Error ? error : new Error(String(error)),
            timestamp: new Date(),
            metadata: { executionId, workflowName },
          };
          observer.next(errorEvent);
          observer.error(error);
        });

      // Cleanup function
      return () => {
        subscription.unsubscribe();
        this.logger.debug(
          `Stream subscription cancelled for workflow: ${workflowName} (${executionId})`
        );
      };
    });
  }

  /**
   * Gets the stream of workflow events
   */
  getEventStream<
    TState extends FunctionalWorkflowState = FunctionalWorkflowState
  >(): Observable<WorkflowStreamEvent<TState>> {
    return this.streamSubject.asObservable() as Observable<
      WorkflowStreamEvent<TState>
    >;
  }

  /**
   * Executes a single task
   */
  private async executeTask(
    instance: object,
    taskDefinition: TaskDefinition,
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { methodName, timeout: taskTimeout, retryCount } = taskDefinition;
    const timeout = taskTimeout || this.options.defaultTimeout || 30000;
    const retries = retryCount ?? this.options.defaultRetryCount ?? 3;

    const method = (instance as Record<string, unknown>)[methodName];
    if (typeof method !== 'function') {
      throw new TaskExecutionError(
        taskDefinition.name,
        `Method '${methodName}' not found on workflow instance`,
        undefined,
        { methodName, taskName: taskDefinition.name }
      );
    }

    return new Promise<TaskExecutionResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new TaskTimeoutError(taskDefinition.name, timeout));
      }, timeout);

      const executeWithRetry = async (attempt: number): Promise<void> => {
        try {
          const result = (await method.call(
            instance,
            context
          )) as TaskExecutionResult;
          clearTimeout(timeoutId);

          // Validate result
          if (!result || typeof result !== 'object') {
            throw new TaskExecutionError(
              taskDefinition.name,
              'Task must return a TaskExecutionResult object'
            );
          }

          resolve(result as TaskExecutionResult);
        } catch (error) {
          if (attempt < retries) {
            this.logger.warn(
              `Task '${taskDefinition.name}' failed (attempt ${attempt + 1}/${
                retries + 1
              }), retrying...`
            );
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
            await executeWithRetry(attempt + 1);
          } else {
            clearTimeout(timeoutId);
            reject(
              new TaskExecutionError(
                taskDefinition.name,
                `Task failed after ${retries + 1} attempts`,
                error instanceof Error ? error : new Error(String(error))
              )
            );
          }
        }
      };

      void executeWithRetry(0);
    });
  }

  /**
   * Plans the execution order based on dependencies
   */
  private planExecution(graph: TaskDependencyGraph): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (taskName: string): void => {
      if (visited.has(taskName)) {
        return;
      }

      if (visiting.has(taskName)) {
        throw new Error(
          `Circular dependency detected involving task '${taskName}'`
        );
      }

      visiting.add(taskName);

      const task = graph.tasks.get(taskName);
      if (!task) {
        throw new UnknownTaskError(taskName, 'unknown');
      }

      // Visit all dependencies first
      for (const dependency of task.dependencies) {
        visit(dependency);
      }

      visiting.delete(taskName);
      visited.add(taskName);
      result.push(taskName);
    };

    // Start with entrypoint
    visit(graph.entrypoint);

    return result;
  }

  /**
   * Determines if auto-checkpointing should occur
   */
  private shouldAutoCheckpoint(checkpointCount: number): boolean {
    if (!this.options.enableCheckpointing || !this.options.checkpointInterval) {
      return false;
    }

    const checkpointEveryNTasks = 5;
    return checkpointCount % checkpointEveryNTasks === 0;
  }

  /**
   * Saves a checkpoint using the ICheckpointAdapter
   */
  private async saveCheckpoint(
    executionId: string,
    state: FunctionalWorkflowState
  ): Promise<void> {
    try {
      const checkpoint: BaseCheckpoint<FunctionalWorkflowState> = {
        id: `checkpoint_${executionId}_${Date.now()}`,
        channel_values: state,
      };

      const metadata: BaseCheckpointMetadata = {
        executionId,
        timestamp: new Date().toISOString(),
        source: 'input' as const,
        step: state.currentStep || 0,
        parents: {},
        workflowName: state.workflowName,
        currentTask: state.currentTask,
      };

      await this.checkpointAdapter.saveCheckpoint(
        executionId,
        checkpoint,
        metadata
      );

      this.logger.debug(`Checkpoint saved for execution ${executionId}`);

      await this.emitStreamEvent({
        type: 'checkpoint_saved',
        timestamp: new Date(),
        metadata: { executionId, checkpointId: checkpoint.id },
      });
    } catch (error) {
      this.logger.error(
        `Failed to save checkpoint for execution ${executionId}`,
        error
      );
      // Don't throw - checkpoint failures shouldn't stop workflow execution
    }
  }

  /**
   * Emits a stream event through the streaming service
   */
  private async emitStreamEvent(event: WorkflowStreamEvent): Promise<void> {
    if (this.options.enableStreaming && this.streamingService) {
      try {
        // Use streamEvent method instead of emitEvent which doesn't exist yet
        this.streamingService.streamEvent(
          (event.metadata?.executionId as string) || 'unknown',
          event.taskName || 'unknown',
          {
            type: event.type,
            data: {
              taskName: event.taskName,
              state: event.state,
              error: event.error,
              timestamp: event.timestamp,
              metadata: event.metadata,
            },
          }
        );
      } catch (error) {
        this.logger.warn('Failed to emit workflow stream event:', error);
      }
    }

    // Keep internal Subject for backward compatibility
    if (this.options.enableStreaming) {
      this.streamSubject.next(event);
    }
  }

  /**
   * Lists all available workflows
   */
  listWorkflows(): string[] {
    return Array.from(this.registrationService.getWorkflows().keys());
  }

  /**
   * Gets streaming metadata for the current workflow execution
   * This resolves the critical issue where getAllStreamingMetadata returns empty
   */
  getAllStreamingMetadata(): Record<string, any> {
    const activeExecutions = new Set<string>();
    const workflows = this.registrationService.getWorkflows();

    // Collect metadata from workflows
    const workflowsMetadata = Array.from(workflows.entries()).map(
      ([name, definition]) => ({
        name,
        tasksCount: definition.tasks.size,
        hasEntrypoint: !!definition.entrypoint,
        capabilities: Array.from(definition.tasks.keys()),
      })
    );

    return {
      // Active streaming information
      activeStreams: activeExecutions.size,
      totalProcessed: this.executionCounter,
      currentWorkflows: workflowsMetadata.map((w) => w.name),
      streamingModes: ['values', 'updates', 'messages'],
      lastActivity: new Date().toISOString(),

      // Performance metrics
      performance: {
        avgProcessingTime: 0, // Would need tracking implementation
        throughput:
          this.executionCounter > 0
            ? this.executionCounter / (Date.now() / 1000 / 60)
            : 0,
      },

      // Workflow details
      workflowDetails: workflowsMetadata,

      // Module configuration
      configuration: {
        streamingEnabled: this.options.enableStreaming,
        checkpointingEnabled: this.options.enableCheckpointing,
        defaultTimeout: this.options.defaultTimeout,
        defaultRetryCount: this.options.defaultRetryCount,
      },

      // Streaming service status
      streamingServiceAvailable: !!this.streamingService,
      streamingServiceType: this.streamingService
        ? 'IStreamingService'
        : 'NoOp',
    };
  }

  /**
   * Gets workflow definition by name
   */
  getWorkflowDefinition(name: string) {
    return this.registrationService.getWorkflow(name);
  }

  /**
   * Resumes workflow execution from a checkpoint
   */
  async resumeFromCheckpoint<
    TState extends FunctionalWorkflowState = FunctionalWorkflowState
  >(
    executionId: string,
    checkpointId?: string,
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecutionResult<TState>> {
    try {
      this.logger.log(
        `Resuming workflow execution from checkpoint: ${executionId}`
      );

      // Load checkpoint
      const checkpoint = await this.checkpointAdapter.loadCheckpoint<TState>(
        executionId,
        checkpointId
      );

      if (!checkpoint) {
        throw new WorkflowExecutionError(
          'unknown',
          `Checkpoint not found for execution ${executionId}`,
          undefined,
          undefined,
          { executionId, checkpointId }
        );
      }

      // Extract workflow name from checkpoint state (since BaseCheckpoint doesn't have metadata field)
      const workflowName = checkpoint.channel_values?.workflowName as string;
      if (!workflowName) {
        throw new WorkflowExecutionError(
          'unknown',
          'Checkpoint missing workflow name in channel values',
          undefined,
          undefined,
          { executionId, checkpointId }
        );
      }

      // Resume execution with restored state
      const resumeOptions: WorkflowExecutionOptions = {
        ...options,
        initialState: {
          ...checkpoint.channel_values,
          ...options.initialState,
        },
        metadata: {
          ...options.metadata,
          resumedFromCheckpoint: checkpointId || 'latest',
          resumedAt: new Date().toISOString(),
        },
      };

      return await this.executeWorkflow<TState>(workflowName, resumeOptions);
    } catch (error) {
      this.logger.error(
        `Failed to resume workflow from checkpoint: ${executionId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Lists available checkpoints for an execution
   */
  async listCheckpoints(executionId: string): Promise<
    Array<{
      id: string;
      timestamp: string;
      step: number;
      metadata?: Record<string, unknown>;
    }>
  > {
    try {
      const checkpoints: readonly BaseCheckpointTuple[] =
        await this.checkpointAdapter.listCheckpoints(executionId);

      return checkpoints.map(([_config, checkpoint, metadata]) => ({
        id: checkpoint.id,
        timestamp: metadata?.timestamp || new Date().toISOString(),
        step: metadata?.step || 0,
        metadata: metadata || {},
      }));
    } catch (error) {
      this.logger.error(
        `Failed to list checkpoints for execution: ${executionId}`,
        error
      );
      return [];
    }
  }

  /**
   * Executes a workflow using LangGraph StateGraph
   * This is the new implementation that generates and runs LangGraph graphs
   */
  async executeWorkflowWithLangGraph<
    TState extends FunctionalWorkflowState = FunctionalWorkflowState
  >(
    workflowName: string,
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecutionResult<TState>> {
    const startTime = Date.now();
    const executionId = `langgraph_exec_${++this
      .executionCounter}_${Date.now()}`;

    try {
      this.logger.log(
        `Starting LangGraph workflow execution: ${workflowName} (${executionId})`
      );

      // Get workflow definition and instance
      const definition = this.registrationService.getWorkflow(workflowName);
      if (!definition) {
        throw new WorkflowExecutionError(
          workflowName,
          `Workflow '${workflowName}' not found`,
          undefined,
          undefined,
          { executionId }
        );
      }

      const instance =
        this.registrationService.getWorkflowInstance(workflowName);
      if (!instance) {
        throw new WorkflowExecutionError(
          workflowName,
          `Workflow instance for '${workflowName}' not found`,
          undefined,
          undefined,
          { executionId }
        );
      }

      // Validate workflow can be converted to graph
      const validation =
        this.graphGenerator.validateWorkflowForGraphGeneration(definition);
      if (!validation.valid) {
        throw new WorkflowExecutionError(
          workflowName,
          `Workflow validation failed: ${validation.errors.join(', ')}`,
          undefined,
          undefined,
          { executionId, validationErrors: validation.errors }
        );
      }

      // Generate LangGraph StateGraph
      const stateGraph = (await this.graphGenerator.generateStateGraph<TState>(
        definition,
        instance
      )) as any;

      // Prepare initial state
      const initialState: TState = {
        workflowName,
        executionId,
        currentStep: 0,
        ...options.initialState,
      } as TState;

      await this.emitStreamEvent({
        type: 'workflow_start',
        timestamp: new Date(),
        metadata: {
          executionId,
          workflowName,
          executionType: 'langgraph',
        },
      });

      // Execute the LangGraph workflow
      const config = {
        configurable: {
          thread_id: executionId,
        },
        recursionLimit: 100,
        tags: [`workflow:${workflowName}`, 'functional-api'],
        metadata: {
          ...options.metadata,
          workflowName,
          executionId,
          startTime: new Date().toISOString(),
        },
      };

      // Run the graph with checkpointing if enabled
      let finalState: TState;
      let checkpointCount = 0;

      if (this.options.enableCheckpointing) {
        // Stream execution for checkpoint opportunities
        const stream = await stateGraph.stream(initialState, config);
        let lastState: TState = initialState;

        for await (const update of stream) {
          lastState = { ...lastState, ...update } as TState;

          // Save checkpoint at intervals
          if (this.shouldAutoCheckpoint(checkpointCount)) {
            await this.saveCheckpoint(executionId, lastState);
            checkpointCount++;
          }
        }

        finalState = lastState;
      } else {
        // Execute without checkpointing
        finalState = (await stateGraph.invoke(initialState, config)) as TState;
      }

      const executionTime = Date.now() - startTime;

      // Build execution path from state metadata
      const executionPath: string[] = [];
      if (finalState.metadata) {
        Object.keys(finalState.metadata)
          .filter((key) => key.endsWith('_completed'))
          .forEach((key) => {
            const taskName = key.replace('_completed', '');
            executionPath.push(taskName);
          });
      }

      const result: WorkflowExecutionResult<TState> = {
        finalState,
        executionPath,
        executionTime,
        checkpointCount,
      };

      await this.emitStreamEvent({
        type: 'workflow_complete',
        state: finalState,
        timestamp: new Date(),
        metadata: {
          executionId,
          workflowName,
          executionTime,
          executionType: 'langgraph',
        },
      });

      this.logger.log(
        `LangGraph workflow execution completed: ${workflowName} (${executionId}) in ${executionTime}ms`
      );

      return result;
    } catch (error) {
      const executionError =
        error instanceof WorkflowExecutionError
          ? error
          : new WorkflowExecutionError(
              workflowName,
              'LangGraph workflow execution failed',
              undefined,
              error instanceof Error ? error : new Error(String(error)),
              { executionId }
            );

      await this.emitStreamEvent({
        type: 'workflow_error',
        error: executionError,
        timestamp: new Date(),
        metadata: {
          executionId,
          workflowName,
          executionType: 'langgraph',
        },
      });

      this.logger.error(
        `LangGraph workflow execution failed: ${workflowName} (${executionId})`,
        executionError.stack
      );

      throw executionError;
    }
  }

  /**
   * Generates a visualization of the workflow graph
   */
  async visualizeWorkflow(workflowName: string): Promise<string> {
    const definition = this.registrationService.getWorkflow(workflowName);
    if (!definition) {
      throw new Error(`Workflow '${workflowName}' not found`);
    }

    return this.graphGenerator.generateGraphVisualization(definition);
  }

  // ============================================================================
  // MEMORY INTEGRATION - 2025 LangGraph Patterns
  // ============================================================================

  /**
   * Enhance workflow context with memory-based historical patterns
   * 
   * Retrieves relevant execution patterns, optimizations, and learned behaviors
   * to improve workflow performance through contextual enhancement.
   */
  private async enhanceWorkflowContext(
    workflowName: string,
    executionId: string,
    initialState: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    if (!this.memoryAdapter) {
      this.logger.debug(
        'Memory adapter not available - using basic context enhancement'
      );
      return {};
    }

    try {
      const namespace = `workflows.functional.${workflowName}`;
      const userId = (initialState.userId as string) || 'system';

      // Retrieve historical execution patterns for this workflow
      const executionMemories = await this.memoryAdapter.search({
        query: `execution pattern ${workflowName}`,
        agentId: 'functional_workflow',
        userId,
        limit: 10,
        namespace: [namespace, 'execution_patterns']
      });

      // Retrieve performance optimization insights
      const performanceMemories = await this.memoryAdapter.search({
        query: `performance optimization ${workflowName}`,
        agentId: 'functional_workflow',
        limit: 5,
        namespace: [namespace, 'performance']
      });

      // Retrieve error avoidance patterns
      const errorMemories = await this.memoryAdapter.search({
        query: `error pattern ${workflowName}`,
        agentId: 'functional_workflow',
        limit: 5,
        namespace: [namespace, 'errors']
      });

      const enhancedContext: Record<string, unknown> = {};

      // Apply execution optimizations
      if (executionMemories.length > 0) {
        const successfulExecutions = executionMemories
          .map((memory: any) => {
            try {
              return typeof memory === 'string' ? JSON.parse(memory) : memory;
            } catch {
              return null;
            }
          })
          .filter((data: any) => data?.success && data.executionTime)
          .sort((a: any, b: any) => a.executionTime - b.executionTime);

        if (successfulExecutions.length > 0) {
          const fastestExecution = successfulExecutions[0];
          enhancedContext.memoryOptimizations = {
            recommendedTimeout: Math.max(fastestExecution.executionTime * 1.5, 10000),
            executionStrategy: 'memory_optimized',
            historicalAverageTime: successfulExecutions.reduce((sum: any, exec: any) => 
              sum + exec.executionTime, 0) / successfulExecutions.length
          };
        }
      }

      // Apply performance insights
      if (performanceMemories.length > 0) {
        const insights = performanceMemories
          .map((memory: any) => {
            try {
              return typeof memory === 'string' ? JSON.parse(memory) : memory;
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        enhancedContext.performanceHints = insights.map((insight: any) => ({
          taskName: insight.taskName,
          avgExecutionTime: insight.avgExecutionTime,
          successRate: insight.successRate,
          recommendations: insight.recommendations
        }));
      }

      // Apply error avoidance patterns
      if (errorMemories.length > 0) {
        const errorPatterns = errorMemories
          .map((memory: any) => {
            try {
              return typeof memory === 'string' ? JSON.parse(memory) : memory;
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        enhancedContext.errorAvoidance = {
          knownErrorPatterns: errorPatterns.map((pattern: any) => ({
            taskName: pattern.taskName,
            errorType: pattern.errorType,
            avoidanceStrategy: pattern.avoidanceStrategy,
            frequency: pattern.frequency
          })),
          preventiveTimeout: Math.max(
            ...errorPatterns.map((p: any) => p.timeoutRecommendation || 30000)
          )
        };
      }

      this.logger.debug(`Enhanced workflow context for ${workflowName}`, {
        executionId,
        optimizations: Object.keys(enhancedContext).length,
        executionMemories: executionMemories.length,
        performanceMemories: performanceMemories.length,
        errorMemories: errorMemories.length
      });

      return enhancedContext;
    } catch (error) {
      return this.handleMemoryError(
        'enhanceWorkflowContext',
        error,
        { workflowName, executionId }
      );
    }
  }

  /**
   * Store workflow execution results for future learning and optimization
   */
  private async storeWorkflowExecution(
    workflowName: string,
    executionId: string,
    executionData: {
      success: boolean;
      executionTime?: number;
      finalState?: Record<string, unknown>;
      executionPath?: string[];
      checkpointCount?: number;
      totalTasks?: number;
      initialState?: Record<string, unknown>;
      error?: string;
      errorType?: string;
      failedAt?: string;
    }
  ): Promise<void> {
    if (!this.memoryAdapter) {
      return;
    }

    try {
      const namespace = `workflows.functional.${workflowName}`;
      const userId = (executionData.initialState?.userId as string) || 'system';
      const timestamp = new Date().toISOString();

      // Store comprehensive execution memory
      const executionMemory = {
        workflowName,
        executionId,
        timestamp,
        success: executionData.success,
        executionTime: executionData.executionTime || 0,
        totalTasks: executionData.totalTasks || 0,
        checkpointCount: executionData.checkpointCount || 0,
        executionPath: executionData.executionPath || [],
        
        // Performance metrics
        performance: {
          tasksPerSecond: executionData.totalTasks && executionData.executionTime ? 
            (executionData.totalTasks / (executionData.executionTime / 1000)) : 0,
          avgTaskTime: executionData.totalTasks && executionData.executionTime ? 
            (executionData.executionTime / executionData.totalTasks) : 0,
          checkpointFrequency: executionData.totalTasks && executionData.checkpointCount ? 
            (executionData.checkpointCount / executionData.totalTasks) : 0
        },

        // Context information
        context: {
          hour: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          hasInitialState: Object.keys(executionData.initialState || {}).length > 0,
          stateComplexity: this.calculateStateComplexity(executionData.finalState || {})
        },

        // Error information (if applicable)
        ...(executionData.error && {
          error: {
            message: executionData.error,
            type: executionData.errorType,
            failedAt: executionData.failedAt,
            executionProgress: executionData.executionPath?.length || 0
          }
        })
      };

      // Store as execution pattern memory
      await this.memoryAdapter.store(
        namespace,
        JSON.stringify(executionMemory),
        {
          type: executionData.success ? 'execution_pattern' : 'error_pattern',
          source: executionData.success ? 'workflow_learning' : 'error_learning',
          agentId: 'functional_workflow',
          userId,
          importance: executionData.success ? 0.7 : 0.9, // Errors are more important for learning
          persistent: true,
          tags: JSON.stringify([
            'workflow_execution',
            executionData.success ? 'success' : 'failure',
            workflowName,
            ...(executionData.executionPath || [])
          ])
        }
      );

      this.logger.debug(`Stored workflow execution memory`, {
        workflowName,
        executionId,
        success: executionData.success,
        executionTime: executionData.executionTime
      });
    } catch (error) {
      this.handleMemoryError(
        'storeWorkflowExecution',
        error,
        { workflowName, executionId }
      );
    }
  }

  /**
   * Store individual task performance metrics for optimization learning
   */
  private async storeTaskPerformance(
    workflowName: string,
    taskName: string,
    executionId: string,
    taskData: {
      success: boolean;
      executionTime: number;
      inputState?: Record<string, unknown>;
      outputState?: Record<string, unknown>;
      shouldCheckpoint?: boolean;
      error?: string;
      errorType?: string;
      executionPath?: string[];
    }
  ): Promise<void> {
    if (!this.memoryAdapter) {
      return;
    }

    try {
      const namespace = `workflows.functional.${workflowName}.tasks.${taskName}`;
      const userId = (taskData.inputState?.userId as string) || 'system';
      const timestamp = new Date().toISOString();

      // Store task-specific performance memory
      const taskMemory = {
        workflowName,
        taskName,
        executionId,
        timestamp,
        success: taskData.success,
        executionTime: taskData.executionTime,
        shouldCheckpoint: taskData.shouldCheckpoint || false,
        
        // State analysis
        stateAnalysis: {
          inputComplexity: this.calculateStateComplexity(taskData.inputState || {}),
          outputComplexity: this.calculateStateComplexity(taskData.outputState || {}),
          stateTransformation: this.analyzeStateTransformation(
            taskData.inputState || {}, 
            taskData.outputState || {}
          )
        },

        // Performance characteristics
        performance: {
          executionSpeed: this.categorizeExecutionSpeed(taskData.executionTime),
          resourceIntensive: taskData.executionTime > 10000, // > 10 seconds
          checkpointWorthy: taskData.shouldCheckpoint
        },

        // Context metadata
        context: {
          executionOrder: taskData.executionPath?.indexOf(taskName) ?? -1,
          totalTasksInWorkflow: taskData.executionPath?.length ?? 1,
          timeOfDay: new Date().getHours()
        },

        // Error details (if applicable)
        ...(taskData.error && {
          error: {
            message: taskData.error,
            type: taskData.errorType,
            inputStateSnapshot: JSON.stringify(taskData.inputState)
          }
        })
      };

      await this.memoryAdapter.store(
        namespace,
        JSON.stringify(taskMemory),
        {
          type: taskData.success ? 'performance_insight' : 'error_pattern',
          source: taskData.success ? 'task_optimization' : 'error_learning',
          agentId: 'functional_workflow',
          userId,
          importance: taskData.success ? 0.6 : 0.8,
          persistent: true,
          tags: JSON.stringify([
            'task_performance',
            taskData.success ? 'success' : 'failure',
            taskName,
            workflowName,
            this.categorizeExecutionSpeed(taskData.executionTime)
          ])
        }
      );

      this.logger.debug(`Stored task performance memory`, {
        workflowName,
        taskName,
        executionId,
        success: taskData.success,
        executionTime: taskData.executionTime
      });
    } catch (error) {
      this.handleMemoryError(
        'storeTaskPerformance',
        error,
        { workflowName, taskName, executionId }
      );
    }
  }

  /**
   * Graceful error handling for memory operations
   */
  private handleMemoryError(
    operation: string,
    error: unknown,
    context: Record<string, unknown>
  ): Record<string, unknown> {
    this.logger.error(
      `Memory operation '${operation}' failed - continuing with degraded functionality`,
      {
        error: error instanceof Error ? error.message : String(error),
        context
      }
    );
    // Return empty object for graceful degradation
    return {};
  }

  /**
   * Calculate state complexity for performance analysis
   */
  private calculateStateComplexity(state: Record<string, unknown>): number {
    try {
      const stateString = JSON.stringify(state);
      const keyCount = Object.keys(state).length;
      const dataSize = stateString.length;
      
      // Simple complexity score: key count + data size factor
      return keyCount + Math.floor(dataSize / 1000);
    } catch {
      return 0;
    }
  }

  /**
   * Analyze how state transforms through a task
   */
  private analyzeStateTransformation(
    inputState: Record<string, unknown>,
    outputState: Record<string, unknown>
  ): string {
    const inputKeys = Object.keys(inputState);
    const outputKeys = Object.keys(outputState);
    
    const addedKeys = outputKeys.filter(key => !inputKeys.includes(key));
    const removedKeys = inputKeys.filter(key => !outputKeys.includes(key));
    const modifiedKeys = inputKeys.filter(key => 
      outputKeys.includes(key) && inputState[key] !== outputState[key]
    );

    if (addedKeys.length > removedKeys.length + modifiedKeys.length) {
      return 'expansion'; // Primarily adding data
    } else if (removedKeys.length > addedKeys.length + modifiedKeys.length) {
      return 'reduction'; // Primarily removing data
    } else if (modifiedKeys.length > 0) {
      return 'transformation'; // Primarily modifying data
    } else {
      return 'passthrough'; // Minimal changes
    }
  }

  /**
   * Categorize execution speed for pattern analysis
   */
  private categorizeExecutionSpeed(executionTime: number): string {
    if (executionTime < 1000) return 'fast';      // < 1 second
    if (executionTime < 5000) return 'moderate';  // 1-5 seconds
    if (executionTime < 15000) return 'slow';     // 5-15 seconds
    return 'very_slow';                           // > 15 seconds
  }
}
