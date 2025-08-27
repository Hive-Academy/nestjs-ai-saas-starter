import 'reflect-metadata';
import { WORKFLOW_NODES_KEY } from '@hive-academy/langgraph-core';

/**
 * Options for @Node decorator
 */
export interface NodeOptions {
  /** Node ID (defaults to method name) */
  id?: string;
  /** Human-readable name */
  name?: string;
  /** Node description */
  description?: string;
  /** Whether this node requires human approval */
  requiresApproval?: boolean;
  /** Confidence threshold for this node */
  confidenceThreshold?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Node type */
  type?:
    | 'standard'
    | 'tool'
    | 'llm'
    | 'human'
    | 'subgraph'
    | 'stream'
    | 'condition'
    | 'aggregator';
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Metadata stored for each node
 */
export interface NodeMetadata extends NodeOptions {
  id: string;
  methodName: string;
  handler: () => Promise<any>;
}

/**
 * Decorator to mark a method as a workflow node
 *
 * @example
 * ```typescript
 * @Workflow({ name: 'my-workflow' })
 * export class MyWorkflow extends DeclarativeWorkflowBase {
 *
 *   @Node({
 *     requiresApproval: true,
 *     confidenceThreshold: 0.8,
 *     type: 'llm'
 *   })
 *   async analyzeInput(state: WorkflowState) {
 *     // Node logic with automatic approval routing
 *     return { analysis: 'result', confidence: 0.9 };
 *   }
 *
 *   @Node('process_data')
 *   async processData(state: WorkflowState) {
 *     // Node logic
 *     return { processed: true };
 *   }
 *
 *   @StartNode({ description: 'Entry point for workflow' })
 *   async start(state: WorkflowState) {
 *     return { status: 'started' };
 *   }
 * }
 * ```
 */
export function Node(optionsOrId?: NodeOptions | string): MethodDecorator {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    // Normalize options
    const options: NodeOptions =
      typeof optionsOrId === 'string' ? { id: optionsOrId } : optionsOrId || {};

    // Create node metadata
    const nodeMetadata: NodeMetadata = {
      ...options,
      id: options.id || String(propertyKey),
      methodName: String(propertyKey),
      handler: descriptor.value,
    };

    // Get existing nodes or initialize
    const existingNodes =
      Reflect.getMetadata(WORKFLOW_NODES_KEY, target.constructor) || [];

    // Add this node
    existingNodes.push(nodeMetadata);

    // Store updated nodes
    Reflect.defineMetadata(
      WORKFLOW_NODES_KEY,
      existingNodes,
      target.constructor
    );

    // Also store on the method itself for direct access
    Reflect.defineMetadata('node:metadata', nodeMetadata, target, propertyKey);

    // Wrap the original method to add node context
    const originalMethod = descriptor.value;
    descriptor.value = async function (this: any, ...args: any[]) {
      // Log node execution
      if (this.logger) {
        this.logger.debug(`Executing node: ${nodeMetadata.id}`);
      }

      // Add node context to state if available
      if (args[0] && typeof args[0] === 'object') {
        args[0].currentNode = nodeMetadata.id;
      }

      // Check for approval requirement
      if (nodeMetadata.requiresApproval && this.requiresApproval) {
        const requiresApproval = await this.requiresApproval.call(
          this,
          args[0]
        );
        if (requiresApproval) {
          // Route to approval
          if (this.logger) {
            this.logger.log(`Node ${nodeMetadata.id} requires approval`);
          }
          return this.routeToApproval
            ? await this.routeToApproval.call(this, args[0], nodeMetadata.id)
            : { requiresApproval: true, pausedAt: nodeMetadata.id };
        }
      }

      // Apply timeout if configured
      if (nodeMetadata.timeout) {
        return Promise.race([
          originalMethod.apply(this, args),
          new Promise((_, reject) =>
            setTimeout(() => {
              reject(
                new Error(
                  `Node ${nodeMetadata.id} timeout after ${nodeMetadata.timeout}ms`
                )
              );
            }, nodeMetadata.timeout)
          ),
        ]);
      }

      // Execute the original method
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Get all nodes from a workflow class
 */
export function getWorkflowNodes(target: any): NodeMetadata[] {
  return Reflect.getMetadata(WORKFLOW_NODES_KEY, target) || [];
}

/**
 * Get node metadata from a method
 */
export function getNodeMetadata(
  target: any,
  propertyKey: string | symbol
): NodeMetadata | undefined {
  return Reflect.getMetadata('node:metadata', target, propertyKey);
}

/**
 * Special decorator for the start node
 */
export function StartNode(options?: Omit<NodeOptions, 'id'>): MethodDecorator {
  return Node({ ...options, id: 'start' });
}

/**
 * Special decorator for the end node
 */
export function EndNode(options?: Omit<NodeOptions, 'id'>): MethodDecorator {
  return Node({ ...options, id: 'end' });
}

/**
 * Decorator for human approval nodes
 */
export function ApprovalNode(
  options?: Omit<NodeOptions, 'type' | 'requiresApproval'>
): MethodDecorator {
  return Node({
    ...options,
    type: 'human',
    requiresApproval: true,
    id: options?.id || 'human_approval',
  });
}

/**
 * Decorator for streaming nodes that yield results progressively
 */
export function StreamNode(
  options?: Omit<NodeOptions, 'type'>
): MethodDecorator {
  return Node({
    ...options,
    type: 'stream',
  });
}

/**
 * Decorator for conditional routing nodes
 */
export function ConditionNode(
  options?: Omit<NodeOptions, 'type'>
): MethodDecorator {
  return Node({
    ...options,
    type: 'condition',
  });
}

/**
 * Decorator for tool execution nodes
 */
export function ToolNode(options?: Omit<NodeOptions, 'type'>): MethodDecorator {
  return Node({
    ...options,
    type: 'tool',
  });
}

/**
 * Decorator for LLM-powered nodes
 */
export function LLMNode(options?: Omit<NodeOptions, 'type'>): MethodDecorator {
  return Node({
    ...options,
    type: 'llm',
  });
}

/**
 * Decorator for aggregator nodes that combine results
 */
export function AggregatorNode(
  options?: Omit<NodeOptions, 'type'>
): MethodDecorator {
  return Node({
    ...options,
    type: 'aggregator',
  });
}

/**
 * Decorator for subgraph execution nodes
 */
export function SubgraphNode(
  options?: Omit<NodeOptions, 'type'>
): MethodDecorator {
  return Node({
    ...options,
    type: 'subgraph',
  });
}

/**
 * Get all streaming metadata from a target object and method
 * Placeholder function for compatibility with workflow-engine
 */
export function getAllStreamingMetadata(
  target: any,
  methodName?: string
): Record<string, any> {
  // Return empty object for now - this would need proper implementation
  // when streaming decorators are fully implemented
  return {};
}
