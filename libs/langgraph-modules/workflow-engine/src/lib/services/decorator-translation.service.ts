import { Injectable, Logger } from '@nestjs/common';
import type {
  FunctionalWorkflowDefinition,
  FunctionalTaskDefinition,
  DeclarativeWorkflowDefinition,
  DecoratorDefinition,
  DecoratorTranslationResult,
  DecoratorBridgeConfig,
} from '../interfaces/decorator-bridge.interface';
import {
  isFunctionalDefinition,
  isDeclarativeDefinition,
} from '../interfaces/decorator-bridge.interface';
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowState,
  WorkflowDefinition,
} from '../interfaces';
// Removed unused import: WorkflowCommandType

/**
 * Service for translating decorator definitions from functional-api to workflow-engine format
 * This enables workflow-engine to act as the execution authority for functional-api workflows
 */
@Injectable()
export class DecoratorTranslationService {
  private readonly logger = new Logger(DecoratorTranslationService.name);
  
  private readonly defaultConfig: DecoratorBridgeConfig = {
    enableFunctionalConversion: true,
    enableDeclarativeConversion: true,
    defaultTimeout: 30000,
    defaultRetry: {
      maxAttempts: 3,
      delay: 1000,
    },
    enableStreaming: true,
  };

  /**
   * Translate a decorator definition to workflow-engine format
   * This is the main entry point for functional-api integration
   */
  async translateDecoratorDefinition<TState extends WorkflowState = WorkflowState>(
    definition: DecoratorDefinition<TState>,
    instance: object,
    config?: DecoratorBridgeConfig
  ): Promise<DecoratorTranslationResult<TState>> {
    const startTime = performance.now();
    const mergedConfig = { ...this.defaultConfig, ...config };
    
    this.logger.debug(`Translating decorator definition: ${this.getDefinitionName(definition)}`);
    
    let result: DecoratorTranslationResult<TState>;
    
    if (isFunctionalDefinition(definition as any)) {
      result = await this.translateFunctionalDefinition(
        definition as any,
        instance,
        mergedConfig
      );
    } else if (isDeclarativeDefinition(definition as any)) {
      result = await this.translateDeclarativeDefinition(
        definition as any,
        instance,
        mergedConfig
      );
    } else {
      throw new Error('Unknown decorator definition type');
    }
    
    const translationTime = performance.now() - startTime;
    result.metadata.translationTime = translationTime;
    
    this.logger.debug(
      `Translation completed in ${translationTime.toFixed(2)}ms for ${result.nodes.length} nodes and ${result.edges.length} edges`
    );
    
    return result;
  }

  /**
   * Translate functional workflow definition (@Entrypoint/@Task decorators)
   */
  private async translateFunctionalDefinition<TState extends WorkflowState = WorkflowState>(
    definition: FunctionalWorkflowDefinition,
    instance: object,
    config: DecoratorBridgeConfig
  ): Promise<DecoratorTranslationResult<TState>> {
    const nodes: WorkflowNode<TState>[] = [];
    const edges: WorkflowEdge<TState>[] = [];
    const warnings: string[] = [];
    
    // Convert tasks to nodes
    for (const [taskName, taskDef] of definition.tasks) {
      const node = this.convertTaskToNode<TState>(taskName, taskDef, instance, config);
      nodes.push(node);
      
      // Create edges based on dependencies
      if (taskDef.dependencies && taskDef.dependencies.length > 0) {
        for (const dependency of taskDef.dependencies) {
          edges.push({
            from: dependency,
            to: taskName,
          });
        }
      }
    }
    
    // Handle entry point
    const entryPoint = definition.entrypoint;
    if (!nodes.find(n => n.id === entryPoint)) {
      warnings.push(`Entry point '${entryPoint}' not found in nodes`);
    }
    
    // Add edges from dependencies map if not already handled
    for (const [taskName, dependencies] of definition.dependencies) {
      if (!edges.some(e => e.to === taskName)) {
        for (const dependency of dependencies) {
          edges.push({
            from: dependency,
            to: taskName,
          });
        }
      }
    }
    
    return {
      nodes,
      edges,
      entryPoint,
      metadata: {
        source: 'functional',
        originalDefinition: definition,
        translationTime: 0,
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    };
  }

  /**
   * Translate declarative workflow definition (@Node/@Edge decorators)
   */
  private async translateDeclarativeDefinition<TState extends WorkflowState = WorkflowState>(
    definition: DeclarativeWorkflowDefinition<TState>,
    instance: object,
    config: DecoratorBridgeConfig
  ): Promise<DecoratorTranslationResult<TState>> {
    const warnings: string[] = [];
    
    // Declarative definitions are already in workflow-engine format
    // We just need to bind the handlers to the instance
    const nodes = definition.nodes.map(node => ({
      ...node,
      handler: this.bindHandlerToInstance(node.handler as any, instance),
    }));
    
    // Validate edges reference existing nodes
    const nodeIds = new Set(nodes.map(n => n.id));
    for (const edge of definition.edges) {
      const fromNode = typeof edge.from === 'string' ? edge.from : 'conditional';
      const toNode = typeof edge.to === 'string' ? edge.to : 'conditional';
      
      if (fromNode !== 'conditional' && !nodeIds.has(fromNode)) {
        warnings.push(`Edge references unknown source node: ${fromNode}`);
      }
      if (toNode !== 'conditional' && !nodeIds.has(toNode)) {
        warnings.push(`Edge references unknown target node: ${toNode}`);
      }
    }
    
    return {
      nodes,
      edges: definition.edges,
      entryPoint: definition.entryPoint,
      metadata: {
        source: 'declarative',
        originalDefinition: definition,
        translationTime: 0,
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    };
  }

  /**
   * Convert a functional task definition to a workflow node
   */
  private convertTaskToNode<TState extends WorkflowState = WorkflowState>(
    taskName: string,
    taskDef: FunctionalTaskDefinition,
    instance: object,
    config: DecoratorBridgeConfig
  ): WorkflowNode<TState> {
    // Get the actual method from the instance
    const method = (instance as any)[taskDef.methodName];
    if (!method || typeof method !== 'function') {
      throw new Error(
        `Method '${taskDef.methodName}' not found on instance for task '${taskName}'`
      );
    }
    
    // Create handler that adapts functional-api context to workflow-engine state
    const handler = async (state: TState): Promise<Partial<TState>> => {
      // Create functional-api compatible context (declare outside try block)
      const context = {
        state,
        taskName,
        workflowId: state.executionId || 'unknown',
        executionId: state.executionId || 'unknown',
        previousTask: state.currentNode,
        metadata: state.metadata || {},
      };
      
      try {
        
        // Call the decorated method
        const result = await method.call(instance, context);
        
        // Handle functional-api TaskExecutionResult
        if (result && typeof result === 'object' && 'state' in result) {
          const stateUpdate: Partial<TState> = {
            ...result.state,
            currentNode: taskName,
            completedNodes: [...(state.completedNodes || []), taskName],
          } as Partial<TState>;
          
          // Handle error in result
          if (result.error) {
            return {
              ...stateUpdate,
              error: {
                id: `error-${Date.now()}`,
                nodeId: taskName,
                type: 'execution',
                message: result.error.message,
                stackTrace: result.error.stack,
                isRecoverable: true,
                timestamp: new Date(),
              },
            } as Partial<TState>;
          }
          
          return stateUpdate;
        }
        
        // If method returns something else, treat it as state update
        return {
          ...result,
          currentNode: taskName,
          completedNodes: [...(state.completedNodes || []), taskName],
        } as Partial<TState>;
      } catch (error: any) {
        // Handle execution errors
        this.logger.error(`Task '${taskName}' failed:`, error);
        
        // Check if there's an error handler
        if (taskDef.errorHandler) {
          const errorHandler = (instance as any)[taskDef.errorHandler];
          if (errorHandler && typeof errorHandler === 'function') {
            try {
              const recoveryResult = await errorHandler.call(instance, context, error);
              return {
                ...recoveryResult.state,
                currentNode: taskName,
                completedNodes: [...(state.completedNodes || []), taskName],
                metadata: {
                  ...state.metadata,
                  errorRecovered: true,
                  originalError: error.message,
                },
              } as Partial<TState>;
            } catch (handlerError) {
              this.logger.error(`Error handler '${taskDef.errorHandler}' failed:`, handlerError);
            }
          }
        }
        
        // Re-throw if no recovery
        throw error;
      }
    };
    
    return {
      id: taskName,
      name: taskDef.name || taskName,
      description: `Functional task: ${taskName}`,
      handler,
      config: {
        timeout: taskDef.timeout || config.defaultTimeout,
        retry: taskDef.retryCount
          ? {
              maxAttempts: taskDef.retryCount,
              delay: config.defaultRetry?.delay || 1000,
            }
          : config.defaultRetry,
        metadata: taskDef.metadata,
      },
    };
  }

  /**
   * Bind a handler function to an instance
   */
  private bindHandlerToInstance<TState extends WorkflowState = WorkflowState>(
    handler: (state: TState) => Promise<Partial<TState>>,
    instance: object
  ): (state: TState) => Promise<Partial<TState>> {
    // If handler is already bound or doesn't need binding, return as is
    if (typeof handler === 'function') {
      // Check if it's a method name string that needs to be resolved
      const handlerName = handler.name;
      if (handlerName && (instance as any)[handlerName]) {
        return (instance as any)[handlerName].bind(instance);
      }
      return handler;
    }
    
    throw new Error('Invalid handler type - must be a function');
  }

  /**
   * Create a workflow definition from translated decorator definition
   */
  createWorkflowDefinition<TState extends WorkflowState = WorkflowState>(
    translationResult: DecoratorTranslationResult<TState>,
    name: string,
    description?: string
  ): WorkflowDefinition<TState> {
    return {
      name,
      description: description || `Translated from ${translationResult.metadata.source} decorators`,
      nodes: translationResult.nodes,
      edges: translationResult.edges,
      entryPoint: translationResult.entryPoint,
      channels: undefined, // Will be set by graph builder if needed
    };
  }

  /**
   * Get the name of a decorator definition
   */
  private getDefinitionName<TState extends WorkflowState = WorkflowState>(definition: DecoratorDefinition<TState>): string {
    if ('name' in definition) {
      return definition.name;
    }
    if ('className' in definition) {
      return (definition as DeclarativeWorkflowDefinition).className;
    }
    return 'unknown';
  }

  /**
   * Validate a translated definition for common issues
   */
  validateTranslation<TState extends WorkflowState = WorkflowState>(
    result: DecoratorTranslationResult<TState>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for entry point
    if (!result.entryPoint) {
      errors.push('No entry point defined');
    } else if (!result.nodes.find(n => n.id === result.entryPoint)) {
      errors.push(`Entry point '${result.entryPoint}' not found in nodes`);
    }
    
    // Check for orphaned nodes
    const nodeIds = new Set(result.nodes.map(n => n.id));
    const referencedNodes = new Set<string>();
    
    for (const edge of result.edges) {
      if (typeof edge.from === 'string') {
        referencedNodes.add(edge.from);
      }
      if (typeof edge.to === 'string') {
        referencedNodes.add(edge.to);
      }
    }
    
    // Entry point is always referenced
    referencedNodes.add(result.entryPoint);
    
    for (const nodeId of nodeIds) {
      if (!referencedNodes.has(nodeId) && nodeId !== result.entryPoint) {
        errors.push(`Node '${nodeId}' is orphaned (not connected to any edge)`);
      }
    }
    
    // Check for invalid edge references
    for (const edge of result.edges) {
      const fromNode = typeof edge.from === 'string' ? edge.from : null;
      const toNode = typeof edge.to === 'string' ? edge.to : null;
      
      if (fromNode && !nodeIds.has(fromNode)) {
        errors.push(`Edge references unknown source node: ${fromNode}`);
      }
      if (toNode && !nodeIds.has(toNode)) {
        errors.push(`Edge references unknown target node: ${toNode}`);
      }
    }
    
    // Add any warnings from translation
    if (result.metadata.warnings) {
      errors.push(...result.metadata.warnings);
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Optimize a translated definition
   */
  optimizeTranslation<TState extends WorkflowState = WorkflowState>(
    result: DecoratorTranslationResult<TState>
  ): DecoratorTranslationResult<TState> {
    // Remove redundant edges
    const uniqueEdges = new Map<string, WorkflowEdge<TState>>();
    
    for (const edge of result.edges) {
      const key = `${edge.from}->${typeof edge.to === 'string' ? edge.to : 'conditional'}`;
      if (!uniqueEdges.has(key)) {
        uniqueEdges.set(key, edge);
      }
    }
    
    // Sort nodes topologically for better execution order
    const sortedNodes = this.topologicalSort(result.nodes, Array.from(uniqueEdges.values()));
    
    return {
      ...result,
      nodes: sortedNodes,
      edges: Array.from(uniqueEdges.values()),
      metadata: {
        ...result.metadata,
        optimized: true,
      } as any,
    };
  }

  /**
   * Perform topological sort on nodes
   */
  private topologicalSort<TState extends WorkflowState = WorkflowState>(
    nodes: WorkflowNode<TState>[],
    edges: WorkflowEdge<TState>[]
  ): WorkflowNode<TState>[] {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const inDegree = new Map<string, number>();
    const adjacencyList = new Map<string, string[]>();
    
    // Initialize
    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjacencyList.set(node.id, []);
    }
    
    // Build graph
    for (const edge of edges) {
      if (typeof edge.from === 'string' && typeof edge.to === 'string') {
        const fromList = adjacencyList.get(edge.from) || [];
        fromList.push(edge.to);
        adjacencyList.set(edge.from, fromList);
        inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
      }
    }
    
    // Topological sort using Kahn's algorithm
    const queue: string[] = [];
    const sorted: WorkflowNode<TState>[] = [];
    
    // Find nodes with no incoming edges
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = nodeMap.get(nodeId);
      if (node) {
        sorted.push(node);
      }
      
      // Reduce in-degree of adjacent nodes
      const adjacent = adjacencyList.get(nodeId) || [];
      for (const adjNodeId of adjacent) {
        const newDegree = (inDegree.get(adjNodeId) || 0) - 1;
        inDegree.set(adjNodeId, newDegree);
        if (newDegree === 0) {
          queue.push(adjNodeId);
        }
      }
    }
    
    // If not all nodes were sorted, there's a cycle
    if (sorted.length !== nodes.length) {
      this.logger.warn('Cycle detected in workflow graph, returning original order');
      return nodes;
    }
    
    return sorted;
  }
}