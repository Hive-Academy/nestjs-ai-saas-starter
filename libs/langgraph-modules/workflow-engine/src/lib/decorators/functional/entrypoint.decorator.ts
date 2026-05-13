import { SetMetadata, UnauthorizedException } from '@nestjs/common';
import { validateDecoratorPattern } from '../../utils/functional/decorator-validator';
import { WorkflowAuthContextService } from '../../services/auth-context.service';

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

  /**
   * Authentication requirements
   */
  readonly auth?: {
    /** Whether authentication is required for this entrypoint */
    required?: boolean;
    /** Roles required to execute this entrypoint */
    roles?: string[];
    /** Permissions required to execute this entrypoint */
    permissions?: string[];
  };
}

/**
 * Entrypoint metadata stored on decorated methods
 */
export interface EntrypointMetadata
  extends Required<Omit<EntrypointOptions, 'name'>> {
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
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    const methodName = String(propertyKey);

    // 🔒 VALIDATION: Enforce task-based pattern
    // @Entrypoint is mutually exclusive with @Node and @Edge
    validateDecoratorPattern(
      target.constructor,
      'task-based',
      'Entrypoint',
      target.constructor.name
    );

    const metadata: EntrypointMetadata = {
      name: options.name ?? methodName,
      methodName,
      isEntrypoint: true,
      timeout: options.timeout ?? 30000,
      retryCount: options.retryCount ?? 3,
      errorHandler: options.errorHandler ?? '',
      metadata: options.metadata ?? {},
      auth: options.auth ?? {},
    };

    // Use direct Reflect.defineMetadata instead of SetMetadata for better compatibility
    // This ensures metadata survives when @Workflow decorator creates newConstructor
    Reflect.defineMetadata(
      ENTRYPOINT_METADATA_KEY,
      metadata,
      target,
      propertyKey
    );

    // Also use SetMetadata for NestJS compatibility (belt and suspenders approach)
    SetMetadata(ENTRYPOINT_METADATA_KEY, metadata)(
      target,
      propertyKey,
      descriptor
    );

    // Wrap the original method to add auth checks
    const originalMethod = descriptor.value;
    descriptor.value = async function (this: any, ...args: any[]) {
      // 🔒 AUTHENTICATION CHECK
      if (metadata.auth?.required) {
        // Task execution context usually passed as args[0]
        const context = args[0];
        const config = context?.config || args[1]; // Fallback if passed as 2nd arg

        const user = WorkflowAuthContextService.extractUserContext(config);

        if (!user) {
          throw new UnauthorizedException(
            `Entrypoint ${metadata.name} requires authentication but no user context found`
          );
        }

        // Check roles if specified
        if (metadata.auth.roles && metadata.auth.roles.length > 0) {
          const hasRole = metadata.auth.roles.some((role) =>
            user.roles.includes(role)
          );
          if (!hasRole) {
            throw new UnauthorizedException(
              `User missing required roles for entrypoint ${metadata.name}`
            );
          }
        }

        // Check permissions if specified
        if (metadata.auth.permissions && metadata.auth.permissions.length > 0) {
          const hasPermission = metadata.auth.permissions.every((permission) =>
            user.permissions?.includes(permission)
          );
          if (!hasPermission) {
            throw new UnauthorizedException(
              `User missing required permissions for entrypoint ${metadata.name}`
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
 * Helper function to extract entrypoint metadata from a method
 */
export function getEntrypointMetadata(
  target: object,
  methodName: string
): EntrypointMetadata | undefined {
  return Reflect.getMetadata(ENTRYPOINT_METADATA_KEY, target, methodName) as
    | EntrypointMetadata
    | undefined;
}

/**
 * Helper function to check if a method is decorated with @Entrypoint
 */
export function isEntrypoint(target: object, methodName: string): boolean {
  return getEntrypointMetadata(target, methodName) !== undefined;
}
