import type { WorkflowExecutionConfig } from '@hive-academy/langgraph-core';
import {
  type WorkflowStateAnnotation,
  WORKFLOW_EDGES_KEY,
  WORKFLOW_METADATA_KEY,
  WORKFLOW_NODES_KEY,
  WORKFLOW_TOOLS_KEY,
} from '@hive-academy/langgraph-core';
import { SetMetadata } from '@nestjs/common';
import 'reflect-metadata';

/**
 * Workflow type enumeration
 * Determines which decorators are allowed in a workflow
 */
export enum WorkflowType {
  /** Functional workflow using @Entrypoint + @Task decorators (linear/sequential) */
  FUNCTIONAL_TASK = 'functional-task',

  /** Functional workflow using @Node + @Edge decorators (complex routing/branching) */
  FUNCTIONAL_NODE = 'functional-node',
}

/**
 * Options for @FunctionalWorkflow decorator
 */
export interface WorkflowOptions extends Partial<WorkflowExecutionConfig> {
  /**
   * 🆕 EXPLICIT WORKFLOW TYPE DECLARATION
   * Determines which decorators are allowed:
   * - FUNCTIONAL_TASK: @Entrypoint + @Task only (linear/sequential workflows)
   * - FUNCTIONAL_NODE: @Node + @Edge only (complex routing/branching workflows)
   */
  type?: WorkflowType;
  /** Unique name for the workflow */
  name?: string;
  /** Human-readable description */
  description?: string;
  /** Confidence threshold for automatic approval */
  confidenceThreshold?: number;
  /** Whether to require human approval for certain operations */
  requiresHumanApproval?: boolean;
  /** Threshold for automatic approval without human intervention */
  autoApproveThreshold?: number;
  /** Enable streaming for this workflow */
  streaming?: boolean;
  /** Enable caching for compiled graphs */
  cache?: boolean;
  /** Enable metrics collection */
  metrics?: boolean;
  /** Human-in-the-loop configuration */
  hitl?: {
    enabled: boolean;
    timeout?: number;
    fallbackStrategy?: 'auto-approve' | 'reject' | 'retry';
  };
  /** State annotation or channels definition */
  channels?: typeof WorkflowStateAnnotation | any;
  /** Pattern to use (supervisor, pipeline, parallel, etc.) */
  pattern?: 'supervisor' | 'pipeline' | 'parallel' | 'map-reduce' | 'saga';
  /** Interrupt nodes for checkpointing */
  interruptNodes?: string[];
  /** Tags for workflow categorization */
  tags?: string[];

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
 * Decorator to mark a class as a LangGraph workflow
 *
 * @example
 * ```typescript
 * @Workflow({
 *   name: 'customer-support',
 *   description: 'Customer support automation workflow',
 *   streaming: true,
 *   hitl: { enabled: true },
 *   pattern: 'supervisor'
 * })
 * export class CustomerSupportWorkflow extends UnifiedWorkflowBase {
 *   // Workflow implementation
 * }
 * ```
 */
export function FunctionalWorkflow(
  options: WorkflowOptions = {}
): ClassDecorator {
  return (target: any) => {
    // Merge options with module config defaults
    const mergedOptions: WorkflowOptions = {
      ...options,
      streaming: options.streaming ?? false,
      cache: options.cache ?? true, // Enable caching by default for performance
    };

    // Store workflow metadata with merged options
    Reflect.defineMetadata(WORKFLOW_METADATA_KEY, mergedOptions, target);

    // Apply NestJS metadata for DI
    SetMetadata(WORKFLOW_METADATA_KEY, mergedOptions)(target);

    // Initialize node and edge collectors if not present
    if (!Reflect.hasMetadata(WORKFLOW_NODES_KEY, target)) {
      Reflect.defineMetadata(WORKFLOW_NODES_KEY, [], target);
    }
    if (!Reflect.hasMetadata(WORKFLOW_EDGES_KEY, target)) {
      Reflect.defineMetadata(WORKFLOW_EDGES_KEY, [], target);
    }
    if (!Reflect.hasMetadata(WORKFLOW_TOOLS_KEY, target)) {
      Reflect.defineMetadata(WORKFLOW_TOOLS_KEY, [], target);
    }

    // Enhance the class with workflow capabilities
    const originalConstructor = target;

    // Create new constructor that applies workflow configuration
    const newConstructor: any = function (...args: any[]) {
      const instance = new originalConstructor(...args);

      // Apply workflow configuration
      if (!instance.workflowConfig) {
        instance.workflowConfig = {
          name: mergedOptions.name || target.name,
          description: mergedOptions.description,
          confidenceThreshold: mergedOptions.confidenceThreshold,
          requiresHumanApproval: mergedOptions.requiresHumanApproval,
          autoApproveThreshold: mergedOptions.autoApproveThreshold,
          streaming: mergedOptions.streaming,
          cache: mergedOptions.cache,
          metrics: mergedOptions.metrics,
          hitl: mergedOptions.hitl,
        };
      }

      // Apply channels if provided
      if (mergedOptions.channels && !instance.channels) {
        instance.channels = mergedOptions.channels;
      }

      // Apply pattern if provided
      if (mergedOptions.pattern && !instance.pattern) {
        instance.pattern = mergedOptions.pattern;
      }

      // 🚀 AUTO-REGISTRATION: Register with Time-Travel if enabled
      if (mergedOptions.timeTravel) {
        queueMicrotask(async () => {
          await tryAutoRegisterWithTimeTravel(
            instance,
            mergedOptions,
            '@hive-academy/langgraph-functional-api'
          );
        });
      }

      return instance;
    };

    // Copy prototype and preserve constructor identity
    newConstructor.prototype = originalConstructor.prototype;

    // Copy static properties and methods
    Object.setPrototypeOf(newConstructor, originalConstructor);

    // 🔧 2025 FIX: Preserve constructor name and identity for NestJS
    Object.defineProperty(newConstructor, 'name', {
      value: originalConstructor.name,
      configurable: true,
    });

    // Preserve constructor length (arity) for proper DI
    Object.defineProperty(newConstructor, 'length', {
      value: originalConstructor.length,
      configurable: true,
    });

    // Copy ALL metadata from constructor (essential for NestJS DI)
    Reflect.getMetadataKeys(originalConstructor).forEach((key) => {
      const value = Reflect.getMetadata(key, originalConstructor);
      Reflect.defineMetadata(key, value, newConstructor);
    });

    // 🔧 2025 NestJS DI FIX: Explicitly preserve critical DI metadata keys
    // These are essential for NestJS dependency injection to work properly
    const criticalDIMetadata = [
      'design:paramtypes', // Constructor parameter types (MOST CRITICAL)
      'design:type', // Class type information
      'design:returntype', // Return type information
      'custom:paramtypes', // Custom parameter types
      'self:paramtypes', // Self parameter types
      'inject', // @Inject() tokens
      'optional', // @Optional() markers
      'self', // @Self() markers
      'skip-self', // @SkipSelf() markers
      'host', // @Host() markers
    ];

    criticalDIMetadata.forEach((metadataKey) => {
      if (Reflect.hasMetadata(metadataKey, originalConstructor)) {
        const value = Reflect.getMetadata(metadataKey, originalConstructor);
        Reflect.defineMetadata(metadataKey, value, newConstructor);
      }
    });

    // Copy NestJS-specific metadata (like from @Injectable)
    const nestjsMetadataKeys =
      Reflect.getMetadataKeys(originalConstructor) || [];
    nestjsMetadataKeys.forEach((key) => {
      // Ensure we handle all possible metadata keys that NestJS might need
      if (typeof key === 'string' || typeof key === 'symbol') {
        const value = Reflect.getMetadata(key, originalConstructor);
        if (value !== undefined) {
          Reflect.defineMetadata(key, value, newConstructor);
        }
      }
    });

    // Copy metadata from prototype methods (this is critical for @Entrypoint and @Task decorators)
    const originalPrototype = originalConstructor.prototype;
    const newPrototype = newConstructor.prototype;

    Object.getOwnPropertyNames(originalPrototype).forEach((propertyName) => {
      if (propertyName === 'constructor') return;

      // Copy all metadata from each method
      const metadataKeys =
        Reflect.getMetadataKeys(originalPrototype, propertyName) || [];
      metadataKeys.forEach((key) => {
        const value = Reflect.getMetadata(key, originalPrototype, propertyName);
        Reflect.defineMetadata(key, value, newPrototype, propertyName);
      });
    });

    // Store workflow metadata on the new constructor
    Reflect.defineMetadata(
      WORKFLOW_METADATA_KEY,
      mergedOptions,
      newConstructor
    );

    return newConstructor;
  };
}

/**
 * Get workflow metadata from a class
 */
export function getWorkflowMetadata(target: any): WorkflowOptions | undefined {
  return Reflect.getMetadata(WORKFLOW_METADATA_KEY, target);
}

/**
 * Check if a class is decorated with @Workflow
 */
// isWorkflow function is now exported from @hive-academy/langgraph-core

/**
 * Global event emitter instance for workflow auto-registration
 */
let globalEventEmitter: any = null;

/**
 * 🎯 BREAKTHROUGH: Auto-registration function for functional-api workflows
 * Automatically registers workflows with Time-Travel service using events
 */
async function tryAutoRegisterWithTimeTravel(
  instance: any,
  options: WorkflowOptions,
  packageName: string
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
      name: options.name || instance.constructor.name,
      instance: instance,
      metadata: {
        autoRegistered: true,
        package: packageName,
        domain: timeTravelOptions.domain || 'functional-api',
        entrypoint: timeTravelOptions.entrypoint || 'execute',
        originalOptions: options,
        workflowName: options.name || instance.constructor.name,
        ...timeTravelOptions.metadata,
      },
    });

    console.log(
      `🚀 Auto-registration event emitted for workflow: ${
        options.name || instance.constructor.name
      } (functional-api)`
    );
  } catch (error) {
    // Graceful degradation - Time-Travel might not be available
    console.log(
      `Time-Travel auto-registration skipped for ${
        options.name || instance.constructor.name
      }: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
