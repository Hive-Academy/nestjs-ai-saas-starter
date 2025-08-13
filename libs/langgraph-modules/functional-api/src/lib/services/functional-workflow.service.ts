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
import { WorkflowValidator } from '../validation/workflow-validator';
import {
  WorkflowExecutionError,
  TaskExecutionError,
  TaskTimeoutError,
  UnknownTaskError,
} from '../errors/functional-workflow.errors';

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
    private readonly validator: WorkflowValidator,
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
          const result = await method.call(instance, context);
          clearTimeout(timeoutId);
          
          // Validate result
          if (!result || typeof result !== 'object') {
            throw new TaskExecutionError(
              taskDefinition.name,
              'Task must return a TaskExecutionResult object'
            );
          }

          resolve(result);
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

      executeWithRetry(0);
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
   * Saves a checkpoint (stub - would integrate with checkpoint module)
   */
  private async saveCheckpoint(executionId: string, state: FunctionalWorkflowState): Promise<void> {
    this.logger.debug(`Would save checkpoint for execution ${executionId}`, state);
    
    this.emitStreamEvent({
      type: 'checkpoint_saved',
      timestamp: new Date(),
      metadata: { executionId },
    });
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
}