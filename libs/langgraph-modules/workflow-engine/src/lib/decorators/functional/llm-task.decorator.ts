import { SetMetadata } from '@nestjs/common';
import { validateDecoratorPattern } from '../../utils/functional/decorator-validator';
import { Task, type TaskOptions } from './task.decorator';

/**
 * Metadata key for LLM task decorator
 */
export const LLM_TASK_METADATA_KEY = Symbol('functional_workflow_llm_task');

/**
 * Options for the @LLMTask decorator
 *
 * @LLMTask enables LLM-driven tool calling in functional-task workflows.
 * The task will loop internally until the LLM stops making tool_calls.
 *
 * **Key Features**:
 * - Task-specific tool routing: tools_${taskId} → taskId loop
 * - Automatic tool binding to LLM at graph compilation time
 * - Max iteration limits to prevent infinite loops
 * - Tool validation against ToolRegistry
 *
 * **Pattern**:
 * ```
 * LLMTask → (has tool_calls?) → tools_LLMTask → back to LLMTask
 *   ↓ (no tool_calls)
 * NextTask
 * ```
 */
export interface LLMTaskOptions extends Omit<TaskOptions, 'metadata'> {
  /**
   * Tool names to bind to this task's LLM
   *
   * Tools are resolved from ToolRegistryService at graph compilation time.
   * Tool names must exist in the registry or validation will fail.
   *
   * @example ['web-search', 'extract-content', 'summarize-text']
   */
  readonly tools: readonly string[];

  /**
   * Maximum number of tool execution loops before forcing continuation
   *
   * Prevents infinite loops if LLM continuously generates tool_calls.
   * After maxToolIterations, the task will proceed to the next task
   * regardless of tool_calls presence.
   *
   * @default 10
   */
  readonly maxToolIterations?: number;

  /**
   * Timeout for each tool execution in milliseconds
   *
   * Individual tool call timeout. If a tool execution exceeds this duration,
   * it will be terminated and an error returned to the LLM.
   *
   * @default 30000 (30 seconds)
   */
  readonly toolTimeout?: number;

  /**
   * Description of the LLM task (shown in logs and debugging)
   */
  readonly description?: string;

  /**
   * Additional metadata for the task
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * LLM task metadata stored on decorated methods
 */
export interface LLMTaskMetadata {
  /**
   * Tool names bound to this task
   */
  readonly tools: readonly string[];

  /**
   * Maximum tool execution loops
   */
  readonly maxToolIterations: number;

  /**
   * Timeout per tool execution
   */
  readonly toolTimeout: number;

  /**
   * Task description
   */
  readonly description?: string;

  /**
   * Additional metadata
   */
  readonly metadata: Record<string, unknown>;

  /**
   * Method name
   */
  readonly methodName: string;

  /**
   * Marker flag for runtime detection
   */
  readonly isLLMTask: true;
}

/**
 * @LLMTask - Marks a task that performs LLM tool calling
 *
 * Enables automatic tool routing loop for this specific task.
 * The task will loop internally until LLM stops making tool_calls.
 *
 * **Usage Pattern**:
 * ```typescript
 * @Agent({
 *   description: 'Research assistant with tool-calling capabilities',
 *   workflow: {
 *     type: 'functional-task',
 *     streaming: true,
 *   },
 * })
 * export class ResearchWorkflowAgent {
 *   @Entrypoint()
 *   async startResearch(context: TaskExecutionContext) {
 *     return { state: { ...context.state, initialized: true } };
 *   }
 *
 *   @LLMTask({
 *     description: 'Search the web for information',
 *     tools: ['web-search', 'extract-content'],
 *     maxToolIterations: 5,
 *   })
 *   async gatherInformation(context: TaskExecutionContext) {
 *     // LLM autonomously calls web-search and extract-content tools
 *     // Loops back to this task until no more tool_calls
 *     return { state: context.state };
 *   }
 *
 *   @Task()
 *   async generateReport(context: TaskExecutionContext) {
 *     // Standard task - no tool calling
 *     return { state: context.state };
 *   }
 * }
 * ```
 *
 * **Graph Structure Generated**:
 * ```
 * startResearch → gatherInformation → (has tool_calls?) → tools_gatherInformation
 *                                    ↓ (no tool_calls)    ↑
 *                               generateReport ← ← ← ← ← ┘
 * ```
 *
 * **Important Notes**:
 * - Only works with functional-task workflow pattern
 * - Tools must be registered in WorkflowEngineModule.forRoot({ tools: [...] })
 * - Tool routing loops back to the SAME TASK, not the entrypoint
 * - Max iteration limit prevents infinite loops
 * - @Task decorator is applied automatically (DRY principle)
 *
 * @param options - LLM task configuration options
 * @returns MethodDecorator
 *
 * @example
 * @LLMTask({
 *   description: 'Conduct web research',
 *   tools: ['web-search', 'research-search'],
 *   maxToolIterations: 5,
 *   toolTimeout: 30000,
 *   dependsOn: ['initialize'],
 * })
 * async conductResearch(context: TaskExecutionContext) {
 *   // LLM will autonomously call tools
 *   // Framework handles: task → tools → task loop
 *   return { state: updatedState };
 * }
 */
export function LLMTask(options: LLMTaskOptions): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    const methodName = String(propertyKey);

    // 🔒 VALIDATION: Enforce task-based pattern
    // @LLMTask is mutually exclusive with @Node and @Edge
    validateDecoratorPattern(
      target.constructor,
      'task-based',
      'LLMTask',
      target.constructor.name
    );

    // Validate tools array
    if (!options.tools || options.tools.length === 0) {
      throw new Error(
        `@LLMTask decorator on ${target.constructor.name}.${methodName} requires at least one tool in 'tools' array`
      );
    }

    // 1. Apply base @Task decorator internally (DRY principle)
    // Extract TaskOptions from LLMTaskOptions
    const taskOptions: TaskOptions = {
      name: options.name,
      dependsOn: options.dependsOn,
      timeout: options.timeout,
      retryCount: options.retryCount,
      errorHandler: options.errorHandler,
      metadata: {
        ...options.metadata,
        // Mark as LLM task for downstream processing
        isLLMTask: true,
      },
    };

    // Apply @Task decorator
    Task(taskOptions)(target, propertyKey, descriptor);

    // 2. Store LLM-specific metadata
    const llmTaskMetadata: LLMTaskMetadata = {
      tools: options.tools,
      maxToolIterations: options.maxToolIterations ?? 10,
      toolTimeout: options.toolTimeout ?? 30000,
      description: options.description,
      metadata: options.metadata ?? {},
      methodName,
      isLLMTask: true,
    };

    // Use direct Reflect.defineMetadata for better compatibility
    Reflect.defineMetadata(
      LLM_TASK_METADATA_KEY,
      llmTaskMetadata,
      target,
      propertyKey
    );

    // Also use SetMetadata for NestJS compatibility
    SetMetadata(LLM_TASK_METADATA_KEY, llmTaskMetadata)(
      target,
      propertyKey,
      descriptor
    );

    return descriptor;
  };
}

/**
 * Helper function to extract LLM task metadata from a method
 *
 * @param target - Target object (workflow class instance)
 * @param methodName - Method name
 * @returns LLMTaskMetadata if method is decorated with @LLMTask, undefined otherwise
 */
export function getLLMTaskMetadata(
  target: object,
  methodName: string
): LLMTaskMetadata | undefined {
  return Reflect.getMetadata(LLM_TASK_METADATA_KEY, target, methodName) as
    | LLMTaskMetadata
    | undefined;
}

/**
 * Helper function to check if a method is decorated with @LLMTask
 *
 * @param target - Target object (workflow class instance)
 * @param methodName - Method name
 * @returns True if method has @LLMTask decorator
 */
export function isLLMTask(target: object, methodName: string): boolean {
  return getLLMTaskMetadata(target, methodName) !== undefined;
}
