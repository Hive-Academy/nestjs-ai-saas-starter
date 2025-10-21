/**
 * Base error class for functional workflow errors
 */
export class FunctionalWorkflowError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FunctionalWorkflowError';
    this.code = code;
    this.context = context;
  }
}

/**
 * Error thrown when workflow definition is invalid
 */
export class InvalidWorkflowDefinitionError extends FunctionalWorkflowError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'INVALID_WORKFLOW_DEFINITION', context);
    this.name = 'InvalidWorkflowDefinitionError';
  }
}

/**
 * Error thrown when circular dependencies are detected
 */
export class CircularDependencyError extends FunctionalWorkflowError {
  public readonly cycle: readonly string[];

  constructor(cycle: readonly string[], context?: Record<string, unknown>) {
    super(
      `Circular dependency detected: ${cycle.join(' -> ')}`,
      'CIRCULAR_DEPENDENCY',
      context
    );
    this.name = 'CircularDependencyError';
    this.cycle = cycle;
  }
}

/**
 * Error thrown when a task fails execution
 */
export class TaskExecutionError extends FunctionalWorkflowError {
  public readonly taskName: string;
  public readonly originalError?: Error;

  constructor(
    taskName: string,
    message: string,
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(message, 'TASK_EXECUTION_ERROR', context);
    this.name = 'TaskExecutionError';
    this.taskName = taskName;
    this.originalError = originalError;
  }
}

/**
 * Error thrown when a task times out
 */
export class TaskTimeoutError extends FunctionalWorkflowError {
  public readonly taskName: string;
  public readonly timeout: number;

  constructor(
    taskName: string,
    timeout: number,
    context?: Record<string, unknown>
  ) {
    super(
      `Task '${taskName}' timed out after ${timeout}ms`,
      'TASK_TIMEOUT',
      context
    );
    this.name = 'TaskTimeoutError';
    this.taskName = taskName;
    this.timeout = timeout;
  }
}

/**
 * Error thrown when workflow execution fails
 */
export class WorkflowExecutionError extends FunctionalWorkflowError {
  public readonly workflowName: string;
  public readonly failedTask?: string;
  public readonly originalError?: Error;

  constructor(
    workflowName: string,
    message: string,
    failedTask?: string,
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(message, 'WORKFLOW_EXECUTION_ERROR', context);
    this.name = 'WorkflowExecutionError';
    this.workflowName = workflowName;
    this.failedTask = failedTask;
    this.originalError = originalError;
  }
}

/**
 * Error thrown when attempting to register duplicate workflow
 */
export class DuplicateWorkflowError extends FunctionalWorkflowError {
  public readonly workflowName: string;

  constructor(workflowName: string, context?: Record<string, unknown>) {
    super(
      `Workflow '${workflowName}' is already registered`,
      'DUPLICATE_WORKFLOW',
      context
    );
    this.name = 'DuplicateWorkflowError';
    this.workflowName = workflowName;
  }
}

/**
 * Error thrown when trying to access unknown task
 */
export class UnknownTaskError extends FunctionalWorkflowError {
  public readonly taskName: string;
  public readonly workflowName: string;

  constructor(
    taskName: string,
    workflowName: string,
    context?: Record<string, unknown>
  ) {
    super(
      `Task '${taskName}' not found in workflow '${workflowName}'`,
      'UNKNOWN_TASK',
      context
    );
    this.name = 'UnknownTaskError';
    this.taskName = taskName;
    this.workflowName = workflowName;
  }
}
