import { SetMetadata } from '@nestjs/common';
import type {
  WorkflowConfig,
  WorkflowDefinition,
  WorkflowExecuteFunction,
} from '../interfaces/multi-agent.interface';

/**
 * Workflow decorator metadata key
 */
export const WORKFLOW_METADATA_KEY = 'workflow:definition';

/**
 * Workflow decorator options
 */
export interface WorkflowDecoratorOptions {
  /**
   * Unique workflow identifier
   */
  id: string;

  /**
   * Human-readable workflow name
   */
  name: string;

  /**
   * Workflow description
   */
  description: string;

  /**
   * Workflow version
   */
  version?: string;

  /**
   * Required agents for this workflow
   */
  requiredAgents?: string[];

  /**
   * Input schema validation
   */
  inputSchema?: any;

  /**
   * Output schema definition
   */
  outputSchema?: any;

  /**
   * Workflow configuration
   */
  config?: WorkflowConfig;

  /**
   * Workflow metadata
   */
  metadata?: Record<string, unknown>;

  /**
   * Enable automatic Time-Travel registration
   * When true, workflow automatically registers with Time-Travel service for debugging
   */
  timeTravel?:
    | boolean
    | {
        enabled: boolean;
        domain?: string;
        entrypoint?: string;
        metadata?: Record<string, unknown>;
      };
}

/**
 * Workflow class decorator
 *
 * Marks a class as a workflow provider and defines workflow metadata.
 * The class must implement a method named 'execute' or 'executeWorkflow'
 * that serves as the workflow execution function.
 *
 * @example
 * ```typescript
 * @Workflow({
 *   id: 'customer-support-workflow',
 *   name: 'Customer Support Automation',
 *   description: 'Automated customer support ticket processing',
 *   requiredAgents: ['support-agent', 'escalation-agent'],
 *   timeTravel: true, // 🎯 Auto-registers with Time-Travel
 *   config: {
 *     timeout: 300000,
 *     checkpointing: true,
 *     streaming: true,
 *   }
 * })
 * @Injectable()
 * export class CustomerSupportWorkflow {
 *   async execute(input: any, context: WorkflowContext): Promise<WorkflowResult> {
 *     // Workflow implementation
 *   }
 * }
 * ```
 */
export function AgenticWorkflow(options: WorkflowDecoratorOptions): ClassDecorator {
  return function (target: any) {
    // Validate that the class has an execute method
    const prototype = target.prototype;
    const hasExecuteMethod =
      typeof prototype.execute === 'function' ||
      typeof prototype.executeWorkflow === 'function';

    if (!hasExecuteMethod) {
      throw new Error(
        `Workflow class ${target.name} must implement an 'execute' or 'executeWorkflow' method`
      );
    }

    // Create workflow definition
    const workflowDefinition: Omit<WorkflowDefinition, 'execute'> = {
      id: options.id,
      name: options.name,
      description: options.description,
      version: options.version,
      requiredAgents: options.requiredAgents,
      inputSchema: options.inputSchema,
      outputSchema: options.outputSchema,
      config: {
        timeout: 300000, // 5 minutes default
        checkpointing: false,
        streaming: false,
        retry: {
          enabled: false,
          maxAttempts: 1,
          backoffMs: 1000,
        },
        ...options.config,
      },
      metadata: options.metadata,
    };

    // Store workflow metadata
    SetMetadata(WORKFLOW_METADATA_KEY, workflowDefinition)(target);

    // 🎯 BREAKTHROUGH: Auto-registration enhancement
    const originalConstructor = target;

    // Create enhanced constructor with auto-registration
    const newConstructor: any = function (...args: any[]) {
      const instance = new originalConstructor(...args);

      // 🚀 AUTO-REGISTRATION: Register with Time-Travel if enabled
      if (options.timeTravel) {
        queueMicrotask(async () => {
          await tryAutoRegisterWithTimeTravel(instance, options);
        });
      }

      return instance;
    };

    // Copy prototype and preserve constructor identity
    newConstructor.prototype = originalConstructor.prototype;
    Object.setPrototypeOf(newConstructor, originalConstructor);

    // Preserve constructor name and metadata for NestJS
    Object.defineProperty(newConstructor, 'name', {
      value: originalConstructor.name,
      configurable: true,
    });

    Object.defineProperty(newConstructor, 'length', {
      value: originalConstructor.length,
      configurable: true,
    });

    // Copy all metadata from original constructor (essential for NestJS DI)
    Reflect.getMetadataKeys(originalConstructor).forEach((key) => {
      const value = Reflect.getMetadata(key, originalConstructor);
      Reflect.defineMetadata(key, value, newConstructor);
    });

    // Add helper methods to the class prototype
    if (!prototype.getWorkflowDefinition) {
      prototype.getWorkflowDefinition = function (): WorkflowDefinition {
        const executeFunction: WorkflowExecuteFunction =
          this.execute?.bind(this) || this.executeWorkflow?.bind(this);

        if (!executeFunction) {
          throw new Error(
            `Workflow ${target.name} does not have an execute or executeWorkflow method`
          );
        }

        return {
          ...workflowDefinition,
          execute: executeFunction,
        };
      };
    }

    // Add workflow ID getter
    if (!prototype.getWorkflowId) {
      prototype.getWorkflowId = function (): string {
        return workflowDefinition.id;
      };
    }

    // Add workflow name getter
    if (!prototype.getWorkflowName) {
      prototype.getWorkflowName = function (): string {
        return workflowDefinition.name;
      };
    }

    return newConstructor;
  };
}

/**
 * WorkflowStep decorator for individual workflow steps
 * Can be used to mark methods within a workflow class as individual steps
 */
export interface WorkflowStepOptions {
  /**
   * Step name/identifier
   */
  name: string;

  /**
   * Step description
   */
  description?: string;

  /**
   * Order in which this step should execute
   */
  order?: number;

  /**
   * Whether this step is required for workflow completion
   */
  required?: boolean;

  /**
   * Step timeout in milliseconds
   */
  timeout?: number;

  /**
   * Step-specific metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * WorkflowStep method decorator
 *
 * @example
 * ```typescript
 * @WorkflowStep({
 *   name: 'analyze-ticket',
 *   description: 'Analyze incoming support ticket',
 *   order: 1,
 *   required: true,
 *   timeout: 30000
 * })
 * async analyzeTicket(input: any, context: WorkflowContext) {
 *   // Step implementation
 * }
 * ```
 */
export function WorkflowStep(options: WorkflowStepOptions): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    // Store step metadata
    const stepMetadata = {
      name: options.name,
      description: options.description,
      order: options.order || 0,
      required: options.required !== false, // Default to required
      timeout: options.timeout,
      metadata: options.metadata,
      methodName: propertyKey,
    };

    // Store in class metadata
    const existingSteps =
      Reflect.getMetadata('workflow:steps', target.constructor) || [];
    existingSteps.push(stepMetadata);
    Reflect.defineMetadata('workflow:steps', existingSteps, target.constructor);

    return descriptor;
  };
}

/**
 * Get workflow definition from decorated class
 */
export function getWorkflowDefinition(
  WorkflowClass: any
): WorkflowDefinition | null {
  const metadata = Reflect.getMetadata(WORKFLOW_METADATA_KEY, WorkflowClass);
  if (!metadata) {
    return null;
  }

  // Create instance to get execute function
  try {
    const instance = new WorkflowClass();
    const executeFunction =
      instance.execute?.bind(instance) ||
      instance.executeWorkflow?.bind(instance);

    if (!executeFunction) {
      throw new Error(
        `Workflow ${WorkflowClass.name} does not have an execute method`
      );
    }

    return {
      ...metadata,
      execute: executeFunction,
    };
  } catch (error) {
    throw new Error(
      `Failed to create workflow definition for ${WorkflowClass.name}: ${error}`
    );
  }
}

/**
 * Get workflow steps from decorated class
 */
export function getWorkflowSteps(WorkflowClass: any): any[] {
  return Reflect.getMetadata('workflow:steps', WorkflowClass) || [];
}

/**
 * Check if class is decorated with @Workflow
 */
export function isWorkflowClass(target: any): boolean {
  return Reflect.hasMetadata(WORKFLOW_METADATA_KEY, target);
}

/**
 * Global event emitter instance for workflow auto-registration
 */
let globalEventEmitter: any = null;

/**
 * 🎯 BREAKTHROUGH: Auto-registration function
 * Automatically registers workflows with Time-Travel service using events
 */
async function tryAutoRegisterWithTimeTravel(
  instance: any,
  options: WorkflowDecoratorOptions
): Promise<void> {
  try {
    // Use dynamic import for loose coupling
    const { EventEmitter2 } = await import('@nestjs/event-emitter');

    // Get or create global event emitter
    if (!globalEventEmitter) {
      globalEventEmitter = new EventEmitter2({
        wildcard: true,
        delimiter: '.',
        newListener: false,
        maxListeners: 20,
      });
    }

    const timeTravelOptions =
      typeof options.timeTravel === 'object'
        ? options.timeTravel
        : { enabled: true };

    // Emit workflow auto-registration event
    globalEventEmitter.emit('workflow.auto-register', {
      name: options.name || options.id,
      instance: instance,
      metadata: {
        autoRegistered: true,
        package: '@hive-academy/langgraph-multi-agent',
        domain: timeTravelOptions.domain || 'multi-agent',
        entrypoint: timeTravelOptions.entrypoint || 'execute',
        originalOptions: options,
        workflowId: options.id,
        ...timeTravelOptions.metadata,
      },
    });

    console.log(
      `🚀 Auto-registration event emitted for workflow: ${options.name} (multi-agent)`
    );
  } catch (error) {
    // Graceful degradation - Time-Travel might not be available
    console.log(
      `Time-Travel auto-registration skipped for ${options.name}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
