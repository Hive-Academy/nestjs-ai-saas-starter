import { SetMetadata, UnauthorizedException } from '@nestjs/common';
import { WorkflowAuthContextService } from '../../services/auth-context.service';
import { validateDecoratorPattern } from '../../utils/functional/decorator-validator';

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
   * Name of error handler method
   */
  readonly errorHandler?: string;

  /**
   * Additional metadata for the task
   */
  readonly metadata?: Record<string, unknown>;

  /**
   * Authentication requirements
   */
  readonly auth?: {
    /** Whether authentication is required for this task */
    required?: boolean;
    /** Roles required to execute this task */
    roles?: string[];
    /** Permissions required to execute this task */
    permissions?: string[];
  };
}

/**
 * Task metadata stored on decorated methods
 */
export interface TaskMetadata
  extends Required<Omit<TaskOptions, 'name' | 'dependsOn'>> {
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
 *     timeout: 10000,
 *     auth: { required: true, roles: ['admin'] }
 *   })
 *   async processData(context: TaskExecutionContext): Promise<TaskExecutionResult> {
 *     const data = context.state.data;
 *     return { state: { processedData: processData(data) } };
 *   }
 * }
 * ```
 */
export function Task(options: TaskOptions = {}): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    const methodName = String(propertyKey);

    // 🔒 VALIDATION: Enforce task-based pattern
    // @Task is mutually exclusive with @Node and @Edge
    validateDecoratorPattern(
      target.constructor,
      'task-based',
      'Task',
      target.constructor.name
    );

    const metadata: TaskMetadata = {
      name: options.name ?? methodName,
      methodName,
      dependsOn: options.dependsOn ?? [],
      isEntrypoint: false,
      errorHandler: options.errorHandler ?? '',
      metadata: options.metadata ?? {},
      auth: options.auth ?? {},
    };

    // Use direct Reflect.defineMetadata instead of SetMetadata for better compatibility
    // This ensures metadata survives when @Workflow decorator creates newConstructor
    Reflect.defineMetadata(TASK_METADATA_KEY, metadata, target, propertyKey);

    // Also use SetMetadata for NestJS compatibility (belt and suspenders approach)
    SetMetadata(TASK_METADATA_KEY, metadata)(target, propertyKey, descriptor);

    // Wrap the original method to add auth checks
    const originalMethod = descriptor.value;
    descriptor.value = async function (this: any, ...args: any[]) {
      // 🔒 AUTHENTICATION CHECK
      if (metadata.auth?.required) {
        // Task execution context usually passed as args[0]
        // We need to check where config is passed in TaskExecutionContext
        // Assuming TaskExecutionContext has a config property or we can access it

        const context = args[0];
        const config = context?.config || args[1]; // Fallback if passed as 2nd arg

        const user = WorkflowAuthContextService.extractUserContext(config);

        if (!user) {
          throw new UnauthorizedException(
            `Task ${metadata.name} requires authentication but no user context found`
          );
        }

        // Check roles if specified
        if (metadata.auth.roles && metadata.auth.roles.length > 0) {
          const hasRole = metadata.auth.roles.some((role) =>
            user.roles.includes(role)
          );
          if (!hasRole) {
            throw new UnauthorizedException(
              `User missing required roles for task ${metadata.name}`
            );
          }
        }
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Helper function to extract task metadata from a method
 */
export function getTaskMetadata(
  target: object,
  methodName: string
): TaskMetadata | undefined {
  return Reflect.getMetadata(TASK_METADATA_KEY, target, methodName) as
    | TaskMetadata
    | undefined;
}

/**
 * Helper function to check if a method is decorated with @Task
 */
export function isTask(target: object, methodName: string): boolean {
  return getTaskMetadata(target, methodName) !== undefined;
}
