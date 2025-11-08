import { Injectable, Logger } from '@nestjs/common';
import 'reflect-metadata';
import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowState,
  Command,
} from '../interfaces';
// Local decorator imports (functional-api library was deleted, decorators now local)
import { getWorkflowMetadata } from '../decorators/functional/workflow.decorator';
import {
  getWorkflowNodes,
  getAllStreamingMetadata,
  type NodeMetadata,
} from '../decorators/functional/node.decorator';
import {
  getWorkflowEdges,
  type EdgeMetadata,
} from '../decorators/functional/edge.decorator';
import {
  getEntrypointMetadata,
  type EntrypointMetadata,
} from '../decorators/functional/entrypoint.decorator';
import {
  getTaskMetadata,
  type TaskMetadata,
} from '../decorators/functional/task.decorator';

// Placeholder types for streaming metadata
interface StreamTokenMetadata {
  enabled?: boolean;
  bufferSize?: number;
  [key: string]: any;
}

interface StreamEventMetadata {
  enabled?: boolean;
  eventTypes?: string[];
  [key: string]: any;
}

interface StreamProgressMetadata {
  enabled?: boolean;
  updateInterval?: number;
  [key: string]: any;
}

/**
 * Service to process decorator metadata and convert to WorkflowDefinition
 */
@Injectable()
export class MetadataProcessorService {
  private readonly logger = new Logger(MetadataProcessorService.name);

  /**
   * Extract WorkflowDefinition from decorator metadata
   * Supports both functional-task (@Entrypoint/@Task) and functional-node (@Node/@Edge) patterns
   */
  extractWorkflowDefinition<TState extends WorkflowState = WorkflowState>(
    workflowClass: any
  ): WorkflowDefinition<TState> {
    this.logger.debug(
      `Extracting workflow definition from ${workflowClass.name}`
    );

    // Get workflow metadata
    const workflowOptions = getWorkflowMetadata(workflowClass);
    if (!workflowOptions) {
      throw new Error(`No @Workflow decorator found on ${workflowClass.name}`);
    }

    // 🔑 PATTERN DETECTION: Determine which pattern this workflow uses
    const workflowPattern = this.detectWorkflowPattern(
      workflowClass,
      workflowOptions
    );
    this.logger.debug(
      `Detected workflow pattern: ${workflowPattern} for ${workflowClass.name}`
    );

    // 🔑 PATTERN-SPECIFIC COMPILATION
    if (workflowPattern === 'functional-task') {
      return this.compileTaskBasedWorkflow<TState>(
        workflowClass,
        workflowOptions
      );
    } else {
      return this.compileNodeBasedWorkflow<TState>(
        workflowClass,
        workflowOptions
      );
    }
  }

  /**
   * Detect which workflow pattern is being used
   * @returns 'functional-task' for @Entrypoint/@Task pattern, 'functional-node' for @Node/@Edge pattern
   */
  private detectWorkflowPattern(
    workflowClass: any,
    workflowOptions: any
  ): 'functional-task' | 'functional-node' {
    // 1. Check explicit type declaration in workflow config
    if (
      workflowOptions?.type === 'functional-task' ||
      workflowOptions?.type === 'functional-node'
    ) {
      return workflowOptions.type;
    }

    // 2. Auto-detect based on decorators present
    const prototype = workflowClass.prototype || workflowClass;
    const methodNames = Object.getOwnPropertyNames(prototype);

    let hasEntrypoint = false;
    let hasTask = false;
    let hasNode = false;

    for (const methodName of methodNames) {
      if (methodName === 'constructor') continue;

      try {
        // Check for @Entrypoint
        if (getEntrypointMetadata(prototype, methodName)) {
          hasEntrypoint = true;
        }

        // Check for @Task
        if (getTaskMetadata(prototype, methodName)) {
          hasTask = true;
        }

        // If we found task-based decorators, no need to continue
        if (hasEntrypoint || hasTask) {
          break;
        }
      } catch (error) {
        // Continue checking other methods
      }
    }

    // Check for @Node decorators
    const nodeMetadata = getWorkflowNodes(workflowClass);
    hasNode = nodeMetadata.length > 0;

    // Pattern decision logic
    if (hasEntrypoint || hasTask) {
      if (hasNode) {
        throw new Error(
          `Mixed workflow patterns detected in ${workflowClass.name}: ` +
            `Found both task-based (@Entrypoint/@Task) and node-based (@Node/@Edge) decorators. ` +
            `Please use only one pattern per workflow.`
        );
      }
      return 'functional-task';
    }

    if (hasNode) {
      return 'functional-node';
    }

    throw new Error(
      `Unable to detect workflow pattern for ${workflowClass.name}: ` +
        `No @Entrypoint, @Task, or @Node decorators found. ` +
        `Please decorate your workflow methods with the appropriate decorators.`
    );
  }

  /**
   * Compile task-based workflow (@Entrypoint + @Task pattern)
   * Based on LangGraph's Functional API design
   *
   * THIN LAYER: Extracts metadata ONLY, no graph building.
   * WorkflowExecutionService builds StateGraph edges from taskDependencies metadata.
   */
  private compileTaskBasedWorkflow<TState extends WorkflowState>(
    workflowClass: any,
    workflowOptions: any
  ): WorkflowDefinition<TState> {
    const prototype = workflowClass.prototype || workflowClass;
    const methodNames = Object.getOwnPropertyNames(prototype);

    const nodes: NodeMetadata[] = [];
    const taskDependencies = new Map<string, readonly string[]>();
    let entrypointId: string | undefined;

    // Discover all @Entrypoint and @Task decorated methods
    for (const methodName of methodNames) {
      if (methodName === 'constructor') continue;

      try {
        // Check for @Entrypoint
        const entrypointMeta: EntrypointMetadata = getEntrypointMetadata(
          prototype,
          methodName
        ) as EntrypointMetadata;
        if (entrypointMeta) {
          const nodeId = entrypointMeta.name || methodName;
          nodes.push({
            id: nodeId,
            methodName,
            name: entrypointMeta.name || methodName,
            handler: prototype[methodName],
            type: 'standard',
            timeout: entrypointMeta.timeout,
            maxRetries: entrypointMeta.retryCount,
          });
          entrypointId = nodeId;
          taskDependencies.set(nodeId, []); // Entrypoint has no dependencies
          continue;
        }

        // Check for @Task
        const taskMeta: TaskMetadata = getTaskMetadata(
          prototype,
          methodName
        ) as TaskMetadata;
        if (taskMeta) {
          const nodeId = taskMeta.name || methodName;
          nodes.push({
            id: nodeId,
            methodName,
            name: taskMeta.name || methodName,
            handler: prototype[methodName],
            type: 'standard',
            timeout: taskMeta.timeout,
            maxRetries: taskMeta.retryCount,
          });
          taskDependencies.set(nodeId, taskMeta.dependsOn || []);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to process method ${methodName} in ${workflowClass.name}:`,
          error
        );
      }
    }

    this.logger.debug(
      `Found ${nodes.length} task-based nodes for workflow ${workflowOptions.name}`
    );

    // THIN LAYER: Store dependencies as metadata, DON'T generate edges
    // WorkflowExecutionService will build StateGraph edges from this metadata
    const taskDependenciesObject: Record<string, readonly string[]> = {};
    for (const [taskId, deps] of taskDependencies.entries()) {
      taskDependenciesObject[taskId] = deps;
    }

    // Convert to WorkflowDefinition (metadata only, no graph building)
    const definition: WorkflowDefinition<TState> = {
      name: workflowOptions.name || workflowClass.name,
      description: workflowOptions.description,
      channels: workflowOptions.channels,
      nodes: this.convertNodesToDefinition<TState>(nodes),
      edges: [], // Empty - WorkflowExecutionService builds edges from taskDependencies metadata
      entryPoint: entrypointId || nodes[0]?.id || 'start',
      config: {
        requiresApproval: workflowOptions.requiresHumanApproval,
        streaming: workflowOptions.streaming,
        metadata: {
          pattern: 'functional-task',
          tags: workflowOptions.tags,
          interruptNodes: workflowOptions.interruptNodes,
          taskDependencies: taskDependenciesObject, // NEW: Raw dependency metadata for graph building
          ...workflowOptions,
        },
      },
    };

    this.logger.log(
      `Extracted task-based workflow metadata for ${definition.name} (edges will be built by WorkflowExecutionService)`
    );
    return definition;
  }

  /**
   * Compile node-based workflow (@Node + @Edge pattern)
   * Traditional graph-based approach
   */
  private compileNodeBasedWorkflow<TState extends WorkflowState>(
    workflowClass: any,
    workflowOptions: any
  ): WorkflowDefinition<TState> {
    // Get node metadata (existing implementation)
    const nodeMetadata = getWorkflowNodes(workflowClass);
    this.logger.debug(
      `Found ${nodeMetadata.length} nodes for workflow ${workflowOptions.name}`
    );

    // Get edge metadata
    const edgeMetadata = this.getEdgeMetadata(workflowClass);
    this.logger.debug(
      `Found ${edgeMetadata.length} edges for workflow ${workflowOptions.name}`
    );

    // Convert to WorkflowDefinition (existing implementation)
    const definition: WorkflowDefinition<TState> = {
      name: workflowOptions.name || workflowClass.name,
      description: workflowOptions.description,
      channels: workflowOptions.channels,
      nodes: this.convertNodesToDefinition<TState>(nodeMetadata),
      edges: this.convertEdgesToDefinition<TState>(edgeMetadata, nodeMetadata),
      entryPoint: this.determineEntryPoint(nodeMetadata, edgeMetadata),
      config: {
        requiresApproval: workflowOptions.requiresHumanApproval,
        streaming: workflowOptions.streaming,
        metadata: {
          pattern: 'functional-node',
          tags: workflowOptions.tags,
          interruptNodes: workflowOptions.interruptNodes,
          ...workflowOptions,
        },
      },
    };

    this.logger.log(
      `Generated node-based workflow definition for ${definition.name}`
    );
    return definition;
  }

  /**
   * DELETED: generateEdgesFromDependencies() removed as part of thin layer refactoring.
   *
   * Rationale: Edge generation is graph building logic, not metadata extraction.
   * Task dependencies are now stored in WorkflowDefinition.config.metadata.taskDependencies
   * and WorkflowExecutionService builds edges when creating LangGraph StateGraph.
   *
   * Removed: Task 2.2 (Simplify MetadataProcessorService)
   */

  /**
   * Get edge metadata from class
   */
  private getEdgeMetadata(workflowClass: any): EdgeMetadata[] {
    return getWorkflowEdges(workflowClass);
  }

  /**
   * Convert node metadata to workflow nodes
   */
  private convertNodesToDefinition<TState extends WorkflowState>(
    nodeMetadata: NodeMetadata[]
  ): Array<WorkflowNode<TState>> {
    return nodeMetadata.map((node) => ({
      id: node.id,
      name: node.name || node.id,
      description: node.description,
      handler: node.handler as (
        state: TState
      ) => Promise<Partial<TState> | Command<TState>>,
      requiresApproval: node.requiresApproval,
      config: {
        requiresApproval: node.requiresApproval,
        timeout: node.timeout,
        streaming: node.type === 'stream',
        tools: [], // Tools will be populated by tool autodiscovery
        metadata: {
          type: node.type,
          tags: node.tags,
          methodName: node.methodName,
          confidenceThreshold: node.confidenceThreshold,
          maxRetries: node.maxRetries,
          streaming: this.extractStreamingMetadata(
            nodeMetadata,
            node.methodName
          ),
        },
      },
    }));
  }

  /**
   * Convert edge metadata to workflow edges
   */
  private convertEdgesToDefinition<TState extends WorkflowState>(
    edgeMetadata: EdgeMetadata[],
    nodeMetadata: NodeMetadata[]
  ): Array<WorkflowEdge<TState>> {
    const edges: Array<WorkflowEdge<TState>> = [];

    // Add explicit edges from @Edge decorators
    edgeMetadata.forEach((edge) => {
      edges.push({
        from: edge.from,
        to:
          typeof edge.to === 'function'
            ? {
                condition: edge.to as (state: TState) => string | null,
                routes: {}, // Will be populated by analyzing the condition function
                default: this.findDefaultRoute(nodeMetadata),
              }
            : edge.to,
        config: {
          priority: edge.priority,
          minConfidence: edge.minConfidence,
          maxConfidence: edge.maxConfidence,
          condition: edge.condition as (state: WorkflowState) => boolean,
          metadata: edge.metadata,
        },
      });
    });

    // Add implicit edges based on node order and patterns
    this.addImplicitEdges(edges, nodeMetadata);

    return edges;
  }

  /**
   * Add implicit edges based on workflow patterns
   */
  private addImplicitEdges<TState extends WorkflowState>(
    edges: Array<WorkflowEdge<TState>>,
    nodeMetadata: NodeMetadata[]
  ): void {
    // If no explicit edges, create sequential edges
    if (edges.length === 0 && nodeMetadata.length > 1) {
      this.logger.debug('No explicit edges found, creating sequential edges');

      for (let i = 0; i < nodeMetadata.length - 1; i++) {
        const currentNode = nodeMetadata[i];
        const nextNode = nodeMetadata[i + 1];

        // Skip if edge already exists
        const existingEdge = edges.find(
          (e) =>
            e.from === currentNode.id &&
            (typeof e.to === 'string' ? e.to === nextNode.id : false)
        );

        if (!existingEdge) {
          edges.push({
            from: currentNode.id,
            to: nextNode.id,
            config: {
              metadata: { type: 'implicit', generated: true },
            },
          });
        }
      }
    }

    // Add approval routing edges for nodes that require approval
    nodeMetadata.forEach((node) => {
      if (node.requiresApproval) {
        const approvalEdge = edges.find(
          (e) =>
            e.from === node.id &&
            (typeof e.to === 'string' ? e.to === 'human_approval' : false)
        );

        if (!approvalEdge) {
          edges.push({
            from: node.id,
            to: {
              condition: (state: TState) => {
                // Route to approval if confidence is low or explicitly required
                const threshold = node.confidenceThreshold || 0.7;
                return state.confidence < threshold || state.requiresApproval
                  ? 'human_approval'
                  : null;
              },
              routes: {
                human_approval: 'human_approval',
              },
              default: this.findDefaultRoute(nodeMetadata) || 'end',
            },
            config: {
              metadata: {
                type: 'approval',
                generated: true,
                confidenceThreshold: node.confidenceThreshold,
              },
            },
          });
        }
      }
    });
  }

  /**
   * Determine entry point node
   */
  private determineEntryPoint(
    nodeMetadata: NodeMetadata[],
    edgeMetadata: EdgeMetadata[]
  ): string {
    // Look for explicit start node
    const startNode = nodeMetadata.find(
      (node) => node.id === 'start' || node.id.toLowerCase().includes('start')
    );

    if (startNode) {
      return startNode.id;
    }

    // Look for node with no incoming edges
    const targetNodes = new Set(
      edgeMetadata
        .map((edge) => (typeof edge.to === 'string' ? edge.to : null))
        .filter(Boolean)
    );

    const entryNode = nodeMetadata.find((node) => !targetNodes.has(node.id));
    if (entryNode) {
      return entryNode.id;
    }

    // Default to first node
    return nodeMetadata[0]?.id || 'start';
  }

  /**
   * Find default route for conditional routing
   */
  private findDefaultRoute(nodeMetadata: NodeMetadata[]): string | undefined {
    const endNode = nodeMetadata.find(
      (node) => node.id === 'end' || node.id.toLowerCase().includes('end')
    );

    return endNode?.id || 'end';
  }

  /**
   * Validate workflow definition
   */
  validateWorkflowDefinition<TState extends WorkflowState>(
    definition: WorkflowDefinition<TState>
  ): void {
    this.logger.debug(`Validating workflow definition: ${definition.name}`);

    // Check for required fields
    if (!definition.name) {
      throw new Error('Workflow name is required');
    }

    if (definition.nodes.length === 0) {
      throw new Error('Workflow must have at least one node');
    }

    if (!definition.entryPoint) {
      throw new Error('Workflow must have an entry point');
    }

    // Validate entry point exists
    const entryNode = definition.nodes.find(
      (node) => node.id === definition.entryPoint
    );
    if (!entryNode) {
      throw new Error(
        `Entry point node '${definition.entryPoint}' not found in workflow nodes`
      );
    }

    // Validate all edge references exist
    definition.edges.forEach((edge, index) => {
      const fromNode = definition.nodes.find((node) => node.id === edge.from);
      if (!fromNode) {
        throw new Error(`Edge ${index}: Source node '${edge.from}' not found`);
      }

      if (typeof edge.to === 'string') {
        const toNode = definition.nodes.find((node) => node.id === edge.to);
        if (!toNode && edge.to !== 'end' && edge.to !== '__end__') {
          throw new Error(`Edge ${index}: Target node '${edge.to}' not found`);
        }
      }
    });

    // Check for unreachable nodes (nodes with no incoming edges except entry point)
    const reachableNodes = new Set([definition.entryPoint]);
    definition.edges.forEach((edge) => {
      if (typeof edge.to === 'string') {
        reachableNodes.add(edge.to);
      } else if (edge.to.routes) {
        Object.values(edge.to.routes).forEach((target) =>
          reachableNodes.add(target)
        );
      }
      if (typeof edge.to !== 'string' && edge.to.default) {
        reachableNodes.add(edge.to.default);
      }
    });

    const unreachableNodes = definition.nodes.filter(
      (node) =>
        !reachableNodes.has(node.id) && node.id !== definition.entryPoint
    );

    if (unreachableNodes.length > 0) {
      this.logger.warn(
        `Unreachable nodes found: ${unreachableNodes
          .map((n) => n.id)
          .join(', ')}`
      );
    }

    this.logger.log(
      `Workflow definition validation completed for ${definition.name}`
    );
  }

  /**
   * Get workflow summary for debugging
   */
  getWorkflowSummary<TState extends WorkflowState>(
    definition: WorkflowDefinition<TState>
  ): string {
    const nodeCount = definition.nodes.length;
    const edgeCount = definition.edges.length;
    const approvalNodes = definition.nodes.filter(
      (n) => n.requiresApproval
    ).length;
    const streamingNodes = definition.nodes.filter(
      (n) => n.config?.streaming
    ).length;

    return `Workflow '${definition.name}': ${nodeCount} nodes, ${edgeCount} edges, ${approvalNodes} approval nodes, ${streamingNodes} streaming nodes`;
  }

  /**
   * Extract streaming metadata from workflow class for a specific node method
   */
  private extractStreamingMetadata(
    nodeMetadata: NodeMetadata[],
    methodName: string
  ): {
    token?: StreamTokenMetadata;
    event?: StreamEventMetadata;
    progress?: StreamProgressMetadata;
  } {
    // Find the node metadata for this method
    const node = nodeMetadata.find((n) => n.methodName === methodName);
    if (!node?.handler) {
      return {};
    }

    // Get streaming metadata from the handler function itself
    // Since node.handler is the method, we can try to access its metadata
    try {
      // The handler function should have the metadata attached
      const target = node.handler as object;
      return getAllStreamingMetadata(target, methodName);
    } catch (error) {
      this.logger.warn(
        `Failed to extract streaming metadata for ${methodName}:`,
        error
      );
      return {};
    }
  }

  /**
   * Get streaming configuration summary for debugging
   */
  getStreamingSummary<TState extends WorkflowState>(
    definition: WorkflowDefinition<TState>
  ): string {
    let tokenNodes = 0;
    let eventNodes = 0;
    let progressNodes = 0;

    definition.nodes.forEach((node) => {
      const streamingMetadata = node.config?.metadata?.streaming;
      if (streamingMetadata) {
        if (streamingMetadata.token?.enabled) {
          tokenNodes++;
        }
        if (streamingMetadata.event?.enabled) {
          eventNodes++;
        }
        if (streamingMetadata.progress?.enabled) {
          progressNodes++;
        }
      }
    });

    return `Streaming configuration for '${definition.name}': ${tokenNodes} token streaming nodes, ${eventNodes} event streaming nodes, ${progressNodes} progress streaming nodes`;
  }

  /**
   * Check if workflow has streaming capabilities
   */
  hasStreamingCapabilities<TState extends WorkflowState>(
    definition: WorkflowDefinition<TState>
  ): boolean {
    return definition.nodes.some((node) => {
      const streamingMetadata = node.config?.metadata?.streaming;
      return (
        streamingMetadata &&
        (streamingMetadata.token?.enabled ||
          streamingMetadata.event?.enabled ||
          streamingMetadata.progress?.enabled)
      );
    });
  }
}
