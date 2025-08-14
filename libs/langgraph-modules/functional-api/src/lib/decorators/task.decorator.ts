import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for task decorator
 */
export const TASK_METADATA_KEY = Symbol('functional_workflow_task');

/**
 * Options for the @Task decorator
 */
export interface TaskOptions {
  /**
   * Name of the task (defaults to method name)
   */
  readonly name?: string;

  /**
   * Names of tasks this task depends on
   */
  readonly dependsOn?: readonly string[];

  /**
   * Task timeout in milliseconds
   */
  readonly timeout?: number;

  /**
   * Number of retry attempts on failure
   */
  readonly retryCount?: number;

  /**
   * Name of error handler method
   */
  readonly errorHandler?: string;

  /**
   * Additional metadata for the task
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Task metadata stored on decorated methods
 */
export interface TaskMetadata extends Required<Omit<TaskOptions, 'name' | 'dependsOn'>> {
  readonly name: string;
  readonly methodName: string;
  readonly dependsOn: readonly string[];
  readonly isEntrypoint: false;
}

/**
 * Decorator to mark a method as a workflow task
 * 
 * @example
 * ```typescript
 * @Injectable()
 * export class MyWorkflow {
 *   @Task({ 
 *     dependsOn: ['startWorkflow'], 
 *     timeout: 10000 
 *   })
 *   async processData(context: TaskExecutionContext): Promise<TaskExecutionResult> {
 *     const data = context.state.data;
 *     return { state: { processedData: processData(data) } };
 *   }
 * }
 * ```
 */
export function Task(options: TaskOptions = {}): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const methodName = String(propertyKey);
    
    const metadata: TaskMetadata = {
      name: options.name ?? methodName,
      methodName,
      dependsOn: options.dependsOn ?? [],
      isEntrypoint: false,
      timeout: options.timeout ?? 30000,
      retryCount: options.retryCount ?? 3,
      errorHandler: options.errorHandler ?? '',
      metadata: options.metadata ?? {},
    };

    SetMetadata(TASK_METADATA_KEY, metadata)(target, propertyKey, descriptor);
    
    return descriptor;
  };
}

/**
 * Helper function to extract task metadata from a method
 */
export function getTaskMetadata(target: object, methodName: string): TaskMetadata | undefined {
  return Reflect.getMetadata(TASK_METADATA_KEY, target, methodName) as TaskMetadata | undefined;
}

/**
 * Helper function to check if a method is decorated with @Task
 */
export function isTask(target: object, methodName: string): boolean {
  return getTaskMetadata(target, methodName) !== undefined;
}