import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { Observable, Subject, throwError, from, EMPTY } from 'rxjs';
import {
  switchMap,
  catchError,
} from 'rxjs/operators';
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
import { WorkflowDiscoveryService } from './workflow-discovery.service';
import { GraphGeneratorService } from './graph-generator.service';
import { WorkflowValidator } from '../validation/workflow-validator';
import {
  WorkflowExecutionError,
  TaskExecutionError,
  TaskTimeoutError,
  UnknownTaskError,
} from '../errors/functional-workflow.errors';
import { CheckpointManagerService } from '@langgraph-modules/checkpoint';

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
    private readonly discoveryService: WorkflowDiscoveryService,
    private readonly graphGenerator: GraphGeneratorService,
    private readonly validator: WorkflowValidator,
    private readonly checkpointManager: CheckpointManagerService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.discoveryService.discoverWorkflows();
  }

  /**
   * Executes a workflow by name
   */
  async executeWorkflow<TState extends FunctionalWorkflowState = FunctionalWorkflowState>(
    workflowName: string,
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecutionResult<TState>> {
    const startTime = Date.now();
    const executionId = `exec_${++this.executionCounter}_${Date.now()}`;

    try {
      this.logger.log(`Starting workflow execution: ${workflowName} (${executionId})`);

      const definition = this.discoveryService.getWorkflow(workflowName);
      if (!definition) {
        throw new WorkflowExecutionError(
          workflowName,
          `Workflow '${workflowName}' not found`,
          undefined,
          undefined,
          { executionId }
        );
      }

      const instance = this.discoveryService.getWorkflowInstance(workflowName);
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

      let currentState: TState = {
        workflowName,
        executionId,
        currentStep: 0,
        ...options.initialState,
      } as TState;

      let checkpointCount = 0;
      const executionPath: string[] = [];

      // Execute tasks in dependency order
      for (const taskName of executionOrder) {
        try {
          this.emitStreamEvent({
            type: 'task_start',
            taskName,
            timestamp: new Date(),
            metadata: { executionId, workflowName },
          });

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
            (result.shouldCheckpoint || this.shouldAutoCheckpoint(checkpointCount))
          ) {
            await this.saveCheckpoint(executionId, currentState);
            checkpointCount++;
          }

          this.emitStreamEvent({
            type: 'task_complete',
            taskName,
            state: result.state,
            timestamp: new Date(),
            metadata: { executionId, workflowName },
          });

        } catch (error) {
          const taskError = error instanceof Error ? error : new Error(String(error));

          this.emitStreamEvent({
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

      this.emitStreamEvent({
        type: 'workflow_complete',
        state: currentState,
        timestamp: new Date(),
        metadata: { executionId, workflowName, executionTime },
      });

      this.logger.log(
        `Workflow execution completed: ${workflowName} (${executionId}) in ${executionTime}ms`
      );

      return result;

    } catch (error) {
      const executionError = error instanceof WorkflowExecutionError
        ? error
        : new WorkflowExecutionError(
            workflowName,
            'Workflow execution failed',
            undefined,
            error instanceof Error ? error : new Error(String(error)),
            { executionId }
          );

      this.emitStreamEvent({
        type: 'workflow_error',
        error: executionError,
        timestamp: new Date(),
        metadata: { executionId, workflowName },
      });

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
  streamWorkflow<TState extends FunctionalWorkflowState = FunctionalWorkflowState>(
    workflowName: string,
    options: WorkflowExecutionOptions = {}
  ): Observable<WorkflowStreamEvent<TState>> {
    if (!this.options.enableStreaming) {
      return throwError(() => new Error('Streaming is not enabled'));
    }

    return from(this.executeWorkflow<TState>(workflowName, options)).pipe(
      switchMap(() => EMPTY),
      catchError(() => EMPTY)
    );
  }

  /**
   * Gets the stream of workflow events
   */
  getEventStream<TState extends FunctionalWorkflowState = FunctionalWorkflowState>(): Observable<WorkflowStreamEvent<TState>> {
    return this.streamSubject.asObservable() as Observable<WorkflowStreamEvent<TState>>;
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
          const result = await method.call(instance, context) as TaskExecutionResult;
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
              `Task '${taskDefinition.name}' failed (attempt ${attempt + 1}/${retries + 1}), retrying...`
            );
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            await executeWithRetry(attempt + 1);
          } else {
            clearTimeout(timeoutId);
            reject(new TaskExecutionError(
              taskDefinition.name,
              `Task failed after ${retries + 1} attempts`,
              error instanceof Error ? error : new Error(String(error))
            ));
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
        throw new Error(`Circular dependency detected involving task '${taskName}'`);
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
   * Saves a checkpoint using the CheckpointManagerService
   */
  private async saveCheckpoint(executionId: string, state: FunctionalWorkflowState): Promise<void> {
    try {
      const checkpoint = {
        id: `checkpoint_${executionId}_${Date.now()}`,
        channel_values: state,
        channel_versions: {},
        versions_seen: {},
        pending_sends: [],
        version: '1.0.0',
      };

      const metadata = {
        executionId,
        timestamp: new Date().toISOString(),
        source: 'input' as const,
        step: state.currentStep || 0,
        parents: {},
        workflowName: state.workflowName,
        currentTask: state.currentTask,
      };

      await this.checkpointManager.saveCheckpoint(
        executionId,
        checkpoint,
        metadata
      );

      this.logger.debug(`Checkpoint saved for execution ${executionId}`);

      this.emitStreamEvent({
        type: 'checkpoint_saved',
        timestamp: new Date(),
        metadata: { executionId, checkpointId: checkpoint.id },
      });
    } catch (error) {
      this.logger.error(`Failed to save checkpoint for execution ${executionId}`, error);
      // Don't throw - checkpoint failures shouldn't stop workflow execution
    }
  }

  /**
   * Emits a stream event
   */
  private emitStreamEvent(event: WorkflowStreamEvent): void {
    if (this.options.enableStreaming) {
      this.streamSubject.next(event);
    }
  }

  /**
   * Lists all available workflows
   */
  listWorkflows(): string[] {
    return this.discoveryService.getAllWorkflows().map(w => w.name);
  }

  /**
   * Gets workflow definition by name
   */
  getWorkflowDefinition(name: string) {
    return this.discoveryService.getWorkflow(name);
  }

  /**
   * Resumes workflow execution from a checkpoint
   */
  async resumeFromCheckpoint<TState extends FunctionalWorkflowState = FunctionalWorkflowState>(
    executionId: string,
    checkpointId?: string,
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecutionResult<TState>> {
    try {
      this.logger.log(`Resuming workflow execution from checkpoint: ${executionId}`);

      // Load checkpoint
      const checkpoint = await this.checkpointManager.loadCheckpoint<TState>(
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

      // Extract workflow name from checkpoint metadata
      const workflowName = checkpoint.metadata?.workflowName as string;
      if (!workflowName) {
        throw new WorkflowExecutionError(
          'unknown',
          'Checkpoint metadata missing workflow name',
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
          ...checkpoint.metadata,
          ...options.metadata,
          resumedFromCheckpoint: checkpointId || 'latest',
          resumedAt: new Date().toISOString(),
        },
      };

      return await this.executeWorkflow<TState>(workflowName, resumeOptions);
    } catch (error) {
      this.logger.error(`Failed to resume workflow from checkpoint: ${executionId}`, error);
      throw error;
    }
  }

  /**
   * Lists available checkpoints for an execution
   */
  async listCheckpoints(executionId: string): Promise<Array<{
    id: string;
    timestamp: string;
    step: number;
    metadata?: Record<string, unknown>;
  }>> {
    try {
      const checkpoints = await this.checkpointManager.listCheckpoints(executionId);

      return checkpoints.map(([_config, checkpoint, metadata]) => ({
        id: checkpoint.id,
        timestamp: metadata?.timestamp as string || new Date().toISOString(),
        step: metadata?.step as number || 0,
        metadata: metadata || {},
      }));
    } catch (error) {
      this.logger.error(`Failed to list checkpoints for execution: ${executionId}`, error);
      return [];
    }
  }

  /**
   * Executes a workflow using LangGraph StateGraph
   * This is the new implementation that generates and runs LangGraph graphs
   */
  async executeWorkflowWithLangGraph<TState extends FunctionalWorkflowState = FunctionalWorkflowState>(
    workflowName: string,
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecutionResult<TState>> {
    const startTime = Date.now();
    const executionId = `langgraph_exec_${++this.executionCounter}_${Date.now()}`;

    try {
      this.logger.log(`Starting LangGraph workflow execution: ${workflowName} (${executionId})`);

      // Get workflow definition and instance
      const definition = this.discoveryService.getWorkflow(workflowName);
      if (!definition) {
        throw new WorkflowExecutionError(
          workflowName,
          `Workflow '${workflowName}' not found`,
          undefined,
          undefined,
          { executionId }
        );
      }

      const instance = this.discoveryService.getWorkflowInstance(workflowName);
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
      const validation = this.graphGenerator.validateWorkflowForGraphGeneration(definition);
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
      const stateGraph = await this.graphGenerator.generateStateGraph<TState>(
        definition,
        instance
      ) as any;

      // Prepare initial state
      const initialState: TState = {
        workflowName,
        executionId,
        currentStep: 0,
        ...options.initialState,
      } as TState;

      this.emitStreamEvent({
        type: 'workflow_start',
        timestamp: new Date(),
        metadata: { 
          executionId, 
          workflowName,
          executionType: 'langgraph' 
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
        finalState = await stateGraph.invoke(initialState, config) as TState;
      }

      const executionTime = Date.now() - startTime;

      // Build execution path from state metadata
      const executionPath: string[] = [];
      if (finalState.metadata) {
        Object.keys(finalState.metadata)
          .filter(key => key.endsWith('_completed'))
          .forEach(key => {
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

      this.emitStreamEvent({
        type: 'workflow_complete',
        state: finalState,
        timestamp: new Date(),
        metadata: { 
          executionId, 
          workflowName, 
          executionTime,
          executionType: 'langgraph' 
        },
      });

      this.logger.log(
        `LangGraph workflow execution completed: ${workflowName} (${executionId}) in ${executionTime}ms`
      );

      return result;

    } catch (error) {
      const executionError = error instanceof WorkflowExecutionError
        ? error
        : new WorkflowExecutionError(
            workflowName,
            'LangGraph workflow execution failed',
            undefined,
            error instanceof Error ? error : new Error(String(error)),
            { executionId }
          );

      this.emitStreamEvent({
        type: 'workflow_error',
        error: executionError,
        timestamp: new Date(),
        metadata: { 
          executionId, 
          workflowName,
          executionType: 'langgraph' 
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
    const definition = this.discoveryService.getWorkflow(workflowName);
    if (!definition) {
      throw new Error(`Workflow '${workflowName}' not found`);
    }

    return this.graphGenerator.generateGraphVisualization(definition);
  }
}
