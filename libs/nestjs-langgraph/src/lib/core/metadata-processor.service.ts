import { Injectable, Logger } from '@nestjs/common';
import 'reflect-metadata';
import { WorkflowDefinition, WorkflowNode, WorkflowEdge, WorkflowState, Command } from '../interfaces';
import { 
  WORKFLOW_METADATA_KEY, 
  WORKFLOW_NODES_KEY, 
  WORKFLOW_EDGES_KEY,
  WORKFLOW_TOOLS_KEY,
  WorkflowOptions,
  getWorkflowMetadata
} from '../decorators/workflow.decorator';
import { NodeMetadata, getWorkflowNodes } from '../decorators/node.decorator';
import { EdgeMetadata, getWorkflowEdges } from '../decorators/edge.decorator';
import {
  StreamTokenMetadata,
  StreamEventMetadata,
  StreamProgressMetadata,
  getStreamTokenMetadata,
  getStreamEventMetadata,
  getStreamProgressMetadata,
  getAllStreamingMetadata
} from '../decorators/streaming.decorator';

/**
 * Service to process decorator metadata and convert to WorkflowDefinition
 */
@Injectable()
export class MetadataProcessorService {
  private readonly logger = new Logger(MetadataProcessorService.name);

  /**
   * Extract WorkflowDefinition from decorator metadata
   */
  extractWorkflowDefinition<TState extends WorkflowState = WorkflowState>(
    workflowClass: any
  ): WorkflowDefinition<TState> {
    this.logger.debug(`Extracting workflow definition from ${workflowClass.name}`);

    // Get workflow metadata
    const workflowOptions = getWorkflowMetadata(workflowClass);
    if (!workflowOptions) {
      throw new Error(`No @Workflow decorator found on ${workflowClass.name}`);
    }

    // Get node metadata
    const nodeMetadata = getWorkflowNodes(workflowClass);
    this.logger.debug(`Found ${nodeMetadata.length} nodes for workflow ${workflowOptions.name}`);

    // Get edge metadata
    const edgeMetadata = this.getEdgeMetadata(workflowClass);
    this.logger.debug(`Found ${edgeMetadata.length} edges for workflow ${workflowOptions.name}`);

    // Convert to WorkflowDefinition
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
          pattern: workflowOptions.pattern,
          tags: workflowOptions.tags,
          interruptNodes: workflowOptions.interruptNodes,
          ...workflowOptions
        }
      }
    };

    this.logger.log(`Generated workflow definition for ${definition.name}`);
    return definition;
  }

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
  ): WorkflowNode<TState>[] {
    return nodeMetadata.map(node => ({
      id: node.id,
      name: node.name || node.id,
      description: node.description,
      handler: node.handler as (state: TState) => Promise<Partial<TState> | Command<TState>>,
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
          streaming: this.extractStreamingMetadata(nodeMetadata, node.methodName)
        }
      }
    }));
  }

  /**
   * Convert edge metadata to workflow edges
   */
  private convertEdgesToDefinition<TState extends WorkflowState>(
    edgeMetadata: EdgeMetadata[],
    nodeMetadata: NodeMetadata[]
  ): WorkflowEdge<TState>[] {
    const edges: WorkflowEdge<TState>[] = [];

    // Add explicit edges from @Edge decorators
    edgeMetadata.forEach(edge => {
      edges.push({
        from: edge.from,
        to: typeof edge.to === 'function' 
          ? {
              condition: edge.to as (state: TState) => string | null,
              routes: {}, // Will be populated by analyzing the condition function
              default: this.findDefaultRoute(nodeMetadata)
            }
          : edge.to,
        config: {
          priority: edge.priority,
          minConfidence: edge.minConfidence,
          maxConfidence: edge.maxConfidence,
          condition: edge.condition as (state: WorkflowState) => boolean,
          metadata: edge.metadata
        }
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
    edges: WorkflowEdge<TState>[],
    nodeMetadata: NodeMetadata[]
  ): void {
    // If no explicit edges, create sequential edges
    if (edges.length === 0 && nodeMetadata.length > 1) {
      this.logger.debug('No explicit edges found, creating sequential edges');
      
      for (let i = 0; i < nodeMetadata.length - 1; i++) {
        const currentNode = nodeMetadata[i];
        const nextNode = nodeMetadata[i + 1];
        
        // Skip if edge already exists
        const existingEdge = edges.find(e => 
          e.from === currentNode.id && 
          (typeof e.to === 'string' ? e.to === nextNode.id : false)
        );
        
        if (!existingEdge) {
          edges.push({
            from: currentNode.id,
            to: nextNode.id,
            config: {
              metadata: { type: 'implicit', generated: true }
            }
          });
        }
      }
    }

    // Add approval routing edges for nodes that require approval
    nodeMetadata.forEach(node => {
      if (node.requiresApproval) {
        const approvalEdge = edges.find(e => 
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
                return state.confidence < threshold || state.requiresApproval ? 'human_approval' : null;
              },
              routes: {
                'human_approval': 'human_approval'
              },
              default: this.findDefaultRoute(nodeMetadata) || 'end'
            },
            config: {
              metadata: { 
                type: 'approval', 
                generated: true,
                confidenceThreshold: node.confidenceThreshold 
              }
            }
          });
        }
      }
    });
  }

  /**
   * Determine entry point node
   */
  private determineEntryPoint(nodeMetadata: NodeMetadata[], edgeMetadata: EdgeMetadata[]): string {
    // Look for explicit start node
    const startNode = nodeMetadata.find(node => 
      node.id === 'start' || node.id.toLowerCase().includes('start')
    );
    
    if (startNode) {
      return startNode.id;
    }

    // Look for node with no incoming edges
    const targetNodes = new Set(edgeMetadata.map(edge => 
      typeof edge.to === 'string' ? edge.to : null
    ).filter(Boolean));
    
    const entryNode = nodeMetadata.find(node => !targetNodes.has(node.id));
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
    const endNode = nodeMetadata.find(node => 
      node.id === 'end' || node.id.toLowerCase().includes('end')
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
    const entryNode = definition.nodes.find(node => node.id === definition.entryPoint);
    if (!entryNode) {
      throw new Error(`Entry point node '${definition.entryPoint}' not found in workflow nodes`);
    }

    // Validate all edge references exist
    definition.edges.forEach((edge, index) => {
      const fromNode = definition.nodes.find(node => node.id === edge.from);
      if (!fromNode) {
        throw new Error(`Edge ${index}: Source node '${edge.from}' not found`);
      }

      if (typeof edge.to === 'string') {
        const toNode = definition.nodes.find(node => node.id === edge.to);
        if (!toNode && edge.to !== 'end' && edge.to !== '__end__') {
          throw new Error(`Edge ${index}: Target node '${edge.to}' not found`);
        }
      }
    });

    // Check for unreachable nodes (nodes with no incoming edges except entry point)
    const reachableNodes = new Set([definition.entryPoint]);
    definition.edges.forEach(edge => {
      if (typeof edge.to === 'string') {
        reachableNodes.add(edge.to);
      } else if (edge.to.routes) {
        Object.values(edge.to.routes).forEach(target => reachableNodes.add(target));
      }
      if (typeof edge.to !== 'string' && edge.to.default) {
        reachableNodes.add(edge.to.default);
      }
    });

    const unreachableNodes = definition.nodes.filter(node => 
      !reachableNodes.has(node.id) && node.id !== definition.entryPoint
    );

    if (unreachableNodes.length > 0) {
      this.logger.warn(`Unreachable nodes found: ${unreachableNodes.map(n => n.id).join(', ')}`);
    }

    this.logger.log(`Workflow definition validation completed for ${definition.name}`);
  }

  /**
   * Get workflow summary for debugging
   */
  getWorkflowSummary<TState extends WorkflowState>(
    definition: WorkflowDefinition<TState>
  ): string {
    const nodeCount = definition.nodes.length;
    const edgeCount = definition.edges.length;
    const approvalNodes = definition.nodes.filter(n => n.requiresApproval).length;
    const streamingNodes = definition.nodes.filter(n => n.config?.streaming).length;

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
    const node = nodeMetadata.find(n => n.methodName === methodName);
    if (!node || !node.handler) {
      return {};
    }

    // Get streaming metadata from the handler function itself
    // Since node.handler is the method, we can try to access its metadata
    try {
      // The handler function should have the metadata attached
      const target = node.handler as object;
      return getAllStreamingMetadata(target, methodName);
    } catch (error) {
      this.logger.warn(`Failed to extract streaming metadata for ${methodName}:`, error);
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

    definition.nodes.forEach(node => {
      const streamingMetadata = node.config?.metadata?.['streaming'];
      if (streamingMetadata) {
        if (streamingMetadata.token?.enabled) tokenNodes++;
        if (streamingMetadata.event?.enabled) eventNodes++;
        if (streamingMetadata.progress?.enabled) progressNodes++;
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
    return definition.nodes.some(node => {
      const streamingMetadata = node.config?.metadata?.['streaming'];
      return streamingMetadata && (
        streamingMetadata.token?.enabled ||
        streamingMetadata.event?.enabled ||
        streamingMetadata.progress?.enabled
      );
    });
  }
}