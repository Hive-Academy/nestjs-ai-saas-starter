import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for entrypoint decorator
 */
export const ENTRYPOINT_METADATA_KEY = Symbol('functional_workflow_entrypoint');

/**
 * Options for the @Entrypoint decorator
 */
export interface EntrypointOptions {
  /**
   * Name of the entrypoint task (defaults to method name)
   */
  readonly name?: string;

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
   * Additional metadata for the entrypoint
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Entrypoint metadata stored on decorated methods
 */
export interface EntrypointMetadata extends Required<Omit<EntrypointOptions, 'name'>> {
  readonly name: string;
  readonly methodName: string;
  readonly isEntrypoint: true;
}

/**
 * Decorator to mark a method as the workflow entrypoint
 * 
 * @example
 * ```typescript
 * @Injectable()
 * export class MyWorkflow {
 *   @Entrypoint({ timeout: 5000, retryCount: 2 })
 *   async startWorkflow(context: TaskExecutionContext): Promise<TaskExecutionResult> {
 *     return { state: { started: true } };
 *   }
 * }
 * ```
 */
export function Entrypoint(options: EntrypointOptions = {}): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const methodName = String(propertyKey);
    
    const metadata: EntrypointMetadata = {
      name: options.name ?? methodName,
      methodName,
      isEntrypoint: true,
      timeout: options.timeout ?? 30000,
      retryCount: options.retryCount ?? 3,
      errorHandler: options.errorHandler ?? '',
      metadata: options.metadata ?? {},
    };

    SetMetadata(ENTRYPOINT_METADATA_KEY, metadata)(target, propertyKey, descriptor);
    
    return descriptor;
  };
}

/**
 * Helper function to extract entrypoint metadata from a method
 */
export function getEntrypointMetadata(target: object, methodName: string): EntrypointMetadata | undefined {
  return Reflect.getMetadata(ENTRYPOINT_METADATA_KEY, target, methodName) as EntrypointMetadata | undefined;
}

/**
 * Helper function to check if a method is decorated with @Entrypoint
 */
export function isEntrypoint(target: object, methodName: string): boolean {
  return getEntrypointMetadata(target, methodName) !== undefined;
}