import 'reflect-metadata';
import { SetMetadata } from '@nestjs/common';
import type { WorkflowExecutionConfig } from '@hive-academy/langgraph-core';
import {
  type WorkflowStateAnnotation,
  WORKFLOW_METADATA_KEY,
  WORKFLOW_NODES_KEY,
  WORKFLOW_EDGES_KEY,
  WORKFLOW_TOOLS_KEY,
} from '@hive-academy/langgraph-core';

/**
 * Options for @Workflow decorator
 */
export interface WorkflowOptions extends Partial<WorkflowExecutionConfig> {
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
export function Workflow(options: WorkflowOptions): ClassDecorator {
  return (target: any) => {
    // Store workflow metadata
    Reflect.defineMetadata(WORKFLOW_METADATA_KEY, options, target);

    // Apply NestJS metadata for DI
    SetMetadata(WORKFLOW_METADATA_KEY, options)(target);

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
          name: options.name || target.name,
          description: options.description,
          confidenceThreshold: options.confidenceThreshold,
          requiresHumanApproval: options.requiresHumanApproval,
          autoApproveThreshold: options.autoApproveThreshold,
          streaming: options.streaming,
          cache: options.cache,
          metrics: options.metrics,
          hitl: options.hitl,
        };
      }

      // Apply channels if provided
      if (options.channels && !instance.channels) {
        instance.channels = options.channels;
      }

      // Apply pattern if provided
      if (options.pattern && !instance.pattern) {
        instance.pattern = options.pattern;
      }

      return instance;
    };

    // Copy prototype
    newConstructor.prototype = originalConstructor.prototype;

    // Copy static properties and methods
    Object.setPrototypeOf(newConstructor, originalConstructor);

    // Copy metadata from constructor
    Reflect.getMetadataKeys(originalConstructor).forEach((key) => {
      const value = Reflect.getMetadata(key, originalConstructor);
      Reflect.defineMetadata(key, value, newConstructor);
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
    Reflect.defineMetadata(WORKFLOW_METADATA_KEY, options, newConstructor);

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
