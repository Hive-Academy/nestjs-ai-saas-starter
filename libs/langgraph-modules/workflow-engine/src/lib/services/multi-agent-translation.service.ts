import { Injectable, Logger } from '@nestjs/common';
import type {
  MultiAgentWorkflowDefinition,
  MultiAgentDefinition,
  MultiAgentTranslationResult,
  MultiAgentBridgeConfig,
  MultiAgentExecutionContext,
  NetworkState,
  CoordinationMetadata,
} from '../interfaces/multi-agent-bridge.interface';
import {
  isMultiAgentDefinition,
} from '../interfaces/multi-agent-bridge.interface';
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowState,
  WorkflowDefinition,
} from '../interfaces';
// Removed unused import: WorkflowCommandType

/**
 * Service for translating multi-agent decorator definitions to workflow-engine format
 * This enables workflow-engine to act as the execution authority for multi-agent workflows
 */
@Injectable()
export class MultiAgentTranslationService {
  private readonly logger = new Logger(MultiAgentTranslationService.name);
  
  private readonly defaultConfig: MultiAgentBridgeConfig = {
    enableMultiAgentConversion: true,
    defaultCoordinationTimeout: 60000,
    defaultAgentRetry: {
      maxAttempts: 3,
      delay: 2000,
      backoff: 'exponential',
    },
    enableCoordinationStreaming: true,
    enableConsensusTracking: true,
  };

  /**
   * Translate a multi-agent definition to workflow-engine format
   * This is the main entry point for multi-agent integration
   */
  async translateMultiAgentDefinition<TState extends WorkflowState = WorkflowState>(
    definition: MultiAgentWorkflowDefinition,
    instance: object,
    config?: MultiAgentBridgeConfig
  ): Promise<MultiAgentTranslationResult<TState>> {
    const startTime = performance.now();
    const mergedConfig = { ...this.defaultConfig, ...config };
    
    this.logger.debug(`Translating multi-agent definition: ${definition.name}`);
    
    if (!isMultiAgentDefinition(definition)) {
      throw new Error('Invalid multi-agent definition provided');
    }
    
    const result = await this.translateMultiAgentWorkflow(
      definition,
      instance,
      mergedConfig
    ) as MultiAgentTranslationResult<TState>;
    
    const translationTime = performance.now() - startTime;
    result.metadata.translationTime = translationTime;
    
    this.logger.debug(
      `Multi-agent translation completed in ${translationTime.toFixed(2)}ms: ` +
      `${result.nodes.length} nodes, ${result.edges.length} edges, ${result.metadata.agentCount} agents`
    );
    
    return result;
  }

  /**
   * Translate multi-agent workflow definition
   */
  private async translateMultiAgentWorkflow<TState extends WorkflowState = WorkflowState>(
    definition: MultiAgentWorkflowDefinition,
    instance: object,
    config: MultiAgentBridgeConfig
  ): Promise<MultiAgentTranslationResult<TState>> {
    const nodes: WorkflowNode<TState>[] = [];
    const edges: WorkflowEdge<TState>[] = [];
    const warnings: string[] = [];
    
    // 1. Create coordinator node (orchestrates agent execution)
    const coordinatorNode = this.createCoordinatorNode<TState>(
      definition,
      instance,
      config
    );
    nodes.push(coordinatorNode);
    
    // 2. Convert agents to workflow nodes
    for (const [agentId, agentDef] of definition.agents) {
      const agentNode = this.convertAgentToNode<TState>(
        agentId,
        agentDef,
        instance,
        config,
        definition
      );
      nodes.push(agentNode);
      
      // Create edge from coordinator to agent
      edges.push({
        from: 'coordinator',
        to: agentId,
      });
      
      // Create edge from agent back to coordinator for coordination
      edges.push({
        from: agentId,
        to: 'coordinator',
      });
    }
    
    // 3. Create network communication edges based on topology
    const networkEdges = this.createNetworkEdges(definition);
    edges.push(...networkEdges);
    
    // 4. Create consensus node if needed
    if (definition.coordination.decisionMaking === 'consensus') {
      const consensusNode = this.createConsensusNode<TState>(
        definition,
        instance,
        config
      );
      nodes.push(consensusNode);
      
      // All agents report to consensus node
      for (const [agentId] of definition.agents) {
        edges.push({
          from: agentId,
          to: 'consensus',
        });
      }
    }
    
    // 5. Determine entry point based on coordination strategy
    const entryPoint = this.determineEntryPoint(definition);
    
    // 6. Analyze network complexity
    const networkComplexity = this.analyzeNetworkComplexity(definition);
    
    return {
      nodes,
      edges,
      entryPoint,
      metadata: {
        source: 'multi-agent',
        originalDefinition: definition,
        translationTime: 0, // Will be set by caller
        agentCount: definition.agents.size,
        networkComplexity,
        coordinationStrategy: definition.coordination.strategy,
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    };
  }

  /**
   * Create coordinator node that orchestrates agent execution
   */
  private createCoordinatorNode<TState extends WorkflowState = WorkflowState>(
    definition: MultiAgentWorkflowDefinition,
    instance: object,
    config: MultiAgentBridgeConfig
  ): WorkflowNode<TState> {
    const handler = async (state: TState): Promise<Partial<TState>> => {
      try {
        // Initialize network state
        const networkState: NetworkState = {
          activeAgents: Array.from(definition.agents.keys()),
          completedAgents: [],
          failedAgents: [],
          currentCoordinator: 'coordinator',
          consensusState: 'pending',
        };
        
        // Initialize coordination metadata
        const coordinationMetadata: CoordinationMetadata = {
          coordinationId: `coord-${Date.now()}`,
          strategy: definition.coordination.strategy,
          phase: 'initialization',
          decisions: [],
          conflicts: [],
        };
        
        // Determine next agent(s) based on coordination strategy
        const nextAgents = this.selectNextAgents(
          definition,
          networkState,
          coordinationMetadata
        );
        
        return {
          currentNode: 'coordinator',
          completedNodes: [...(state.completedNodes || []), 'coordinator'],
          networkState,
          coordinationMetadata,
          nextAgents,
          phase: 'execution',
        } as unknown as Partial<TState>;
      } catch (error: any) {
        this.logger.error('Coordinator failed:', error);
        return {
          error: {
            id: `coord-error-${Date.now()}`,
            nodeId: 'coordinator',
            type: 'coordination',
            message: error.message,
            isRecoverable: true,
            timestamp: new Date(),
          },
        } as unknown as Partial<TState>;
      }
    };
    
    return {
      id: 'coordinator',
      name: 'Multi-Agent Coordinator',
      description: `Coordinates ${definition.agents.size} agents using ${definition.coordination.strategy} strategy`,
      handler,
      config: {
        timeout: config.defaultCoordinationTimeout,
        retry: config.defaultAgentRetry,
        metadata: {
          type: 'coordinator',
          strategy: definition.coordination.strategy,
          agentCount: definition.agents.size,
        },
      },
    };
  }

  /**
   * Convert a multi-agent agent definition to a workflow node
   */
  private convertAgentToNode<TState extends WorkflowState = WorkflowState>(
    agentId: string,
    agentDef: MultiAgentDefinition,
    instance: object,
    config: MultiAgentBridgeConfig,
    workflowDef: MultiAgentWorkflowDefinition
  ): WorkflowNode<TState> {
    // Get the actual agent method from the instance
    const method = (instance as any)[agentDef.agentId] || (instance as any)[`execute${agentId}`];
    if (!method || typeof method !== 'function') {
      throw new Error(
        `Agent method '${agentDef.agentId}' or 'execute${agentId}' not found on instance`
      );
    }
    
    // Create handler that adapts multi-agent context to workflow-engine state
    const handler = async (state: TState): Promise<Partial<TState>> => {
      try {
        // Create multi-agent compatible execution context
        const context: MultiAgentExecutionContext<TState> = {
          state,
          agentId,
          networkState: (state as any).networkState || {
            activeAgents: [agentId],
            completedAgents: [],
            failedAgents: [],
          },
          coordinationMetadata: (state as any).coordinationMetadata || {
            coordinationId: `coord-${Date.now()}`,
            strategy: workflowDef.coordination.strategy,
            phase: 'execution',
            decisions: [],
            conflicts: [],
          },
          communicationChannels: this.createCommunicationChannels(agentId, workflowDef),
        };
        
        // Call the agent method
        const result = await method.call(instance, context);
        
        // Handle multi-agent result format
        if (result && typeof result === 'object') {
          const stateUpdate: Partial<TState> = {
            ...result,
            currentNode: agentId,
            completedNodes: [...(state.completedNodes || []), agentId],
          } as Partial<TState>;
          
          // Update network state
          if ((state as any).networkState) {
            const networkState = { ...(state as any).networkState };
            networkState.completedAgents = [...networkState.completedAgents, agentId];
            networkState.activeAgents = networkState.activeAgents.filter(
              (id: string) => id !== agentId
            );
            (stateUpdate as any).networkState = networkState;
          }
          
          // Handle agent errors
          if (result.error) {
            return {
              ...stateUpdate,
              error: {
                id: `agent-error-${Date.now()}`,
                nodeId: agentId,
                type: 'agent_execution',
                message: result.error.message,
                isRecoverable: true,
                timestamp: new Date(),
              },
            } as Partial<TState>;
          }
          
          return stateUpdate;
        }
        
        // Fallback for simple return values
        return {
          ...result,
          currentNode: agentId,
          completedNodes: [...(state.completedNodes || []), agentId],
        } as Partial<TState>;
      } catch (error: any) {
        this.logger.error(`Agent '${agentId}' failed:`, error);
        
        // Update network state with failed agent
        const networkState = { ...(state as any).networkState };
        if (networkState) {
          networkState.failedAgents = [...(networkState.failedAgents || []), agentId];
          networkState.activeAgents = networkState.activeAgents.filter(
            (id: string) => id !== agentId
          );
        }
        
        throw error; // Let workflow error handling take over
      }
    };
    
    return {
      id: agentId,
      name: agentDef.role || agentId,
      description: `Multi-agent: ${agentDef.role} with capabilities: ${agentDef.capabilities.join(', ')}`,
      handler,
      config: {
        timeout: agentDef.timeout || config.defaultCoordinationTimeout,
        retry: agentDef.retryCount
          ? {
              maxAttempts: agentDef.retryCount,
              delay: config.defaultAgentRetry?.delay || 2000,
            }
          : config.defaultAgentRetry,
        metadata: {
          type: 'agent',
          role: agentDef.role,
          capabilities: agentDef.capabilities,
          dependencies: agentDef.dependencies,
        },
      },
    };
  }

  /**
   * Create consensus node for consensus-based decision making
   */
  private createConsensusNode<TState extends WorkflowState = WorkflowState>(
    definition: MultiAgentWorkflowDefinition,
    instance: object,
    config: MultiAgentBridgeConfig
  ): WorkflowNode<TState> {
    const handler = async (state: TState): Promise<Partial<TState>> => {
      try {
        const networkState = (state as any).networkState;
        // const coordinationMetadata = (state as any).coordinationMetadata; // Currently unused
        
        // Check if all agents have completed
        const allAgentsCompleted = Array.from(definition.agents.keys()).every(
          agentId => networkState.completedAgents.includes(agentId)
        );
        
        if (allAgentsCompleted) {
          // Achieve consensus
          const consensusResult = await this.processConsensus(
            definition,
            state,
            instance
          );
          
          return {
            ...consensusResult,
            currentNode: 'consensus',
            completedNodes: [...(state.completedNodes || []), 'consensus'],
            consensusState: 'achieved',
          } as Partial<TState>;
        } else {
          // Wait for more agents
          return {
            currentNode: 'consensus',
            consensusState: 'pending',
            waitingFor: networkState.activeAgents,
          } as unknown as Partial<TState>;
        }
      } catch (error: any) {
        this.logger.error('Consensus processing failed:', error);
        return {
          consensusState: 'failed',
          error: {
            id: `consensus-error-${Date.now()}`,
            nodeId: 'consensus',
            type: 'consensus',
            message: error.message,
            isRecoverable: false,
            timestamp: new Date(),
          },
        } as unknown as Partial<TState>;
      }
    };
    
    return {
      id: 'consensus',
      name: 'Consensus Processor',
      description: `Processes consensus for ${definition.coordination.decisionMaking} decision making`,
      handler,
      config: {
        timeout: config.defaultCoordinationTimeout,
        metadata: {
          type: 'consensus',
          decisionMaking: definition.coordination.decisionMaking,
        },
      },
    };
  }

  /**
   * Create network communication edges based on topology
   */
  private createNetworkEdges<TState extends WorkflowState = WorkflowState>(
    definition: MultiAgentWorkflowDefinition
  ): WorkflowEdge<TState>[] {
    const edges: WorkflowEdge<TState>[] = [];
    
    // Create edges based on network topology
    for (const [fromAgent, toAgents] of definition.network.connections) {
      for (const toAgent of toAgents) {
        // Create conditional edge for direct agent communication
        edges.push({
          from: fromAgent,
          to: {
            condition: (state: TState) => {
              // Only allow communication if both agents are active
              const networkState = (state as any).networkState;
              return networkState &&
                     networkState.activeAgents.includes(fromAgent) &&
                     networkState.activeAgents.includes(toAgent) ? toAgent : null;
            },
            routes: {
              [toAgent]: toAgent,
            },
          },
        });
      }
    }
    
    return edges;
  }

  /**
   * Determine entry point based on coordination strategy
   */
  private determineEntryPoint(definition: MultiAgentWorkflowDefinition): string {
    switch (definition.coordination.strategy) {
      case 'supervisor':
      case 'democratic':
        return 'coordinator';
      case 'sequential': {
        // Find the first agent in the sequence
        const firstAgent = Array.from(definition.agents.keys())[0];
        return firstAgent || 'coordinator';
      }
      case 'parallel':
        return 'coordinator'; // Coordinator distributes work in parallel
      case 'pipeline':
        return 'coordinator'; // Coordinator manages pipeline flow
      default:
        return 'coordinator';
    }
  }

  /**
   * Analyze network complexity
   */
  private analyzeNetworkComplexity(
    definition: MultiAgentWorkflowDefinition
  ): 'simple' | 'moderate' | 'complex' {
    const agentCount = definition.agents.size;
    const connectionCount = Array.from(definition.network.connections.values())
      .reduce((total, connections) => total + connections.length, 0);
    
    // Simple heuristic for complexity
    if (agentCount <= 3 && connectionCount <= 5) return 'simple';
    if (agentCount <= 8 && connectionCount <= 20) return 'moderate';
    return 'complex';
  }

  /**
   * Select next agents based on coordination strategy
   */
  private selectNextAgents(
    definition: MultiAgentWorkflowDefinition,
    networkState: NetworkState,
    coordinationMetadata: CoordinationMetadata
  ): string[] {
    const availableAgents = networkState.activeAgents.filter(
      agentId => !networkState.completedAgents.includes(agentId) &&
                 !networkState.failedAgents.includes(agentId)
    );
    
    switch (definition.coordination.strategy) {
      case 'sequential':
        return availableAgents.slice(0, 1); // One at a time
      case 'parallel':
        return availableAgents; // All at once
      case 'pipeline':
        return this.selectPipelineAgent(availableAgents, definition);
      default:
        return availableAgents.slice(0, 1);
    }
  }

  /**
   * Select agent for pipeline execution
   */
  private selectPipelineAgent(
    availableAgents: string[],
    definition: MultiAgentWorkflowDefinition
  ): string[] {
    // Simple pipeline logic - could be enhanced with dependency analysis
    return availableAgents.slice(0, 1);
  }

  /**
   * Process consensus among agents
   */
  private async processConsensus(
    definition: MultiAgentWorkflowDefinition,
    state: any,
    instance: object
  ): Promise<any> {
    // Consensus processing logic - could be enhanced with voting mechanisms
    return {
      consensusAchieved: true,
      finalDecision: 'proceed',
      participatingAgents: Array.from(definition.agents.keys()),
    };
  }

  /**
   * Create communication channels for agent interaction
   */
  private createCommunicationChannels(
    agentId: string,
    definition: MultiAgentWorkflowDefinition
  ): any {
    return {
      broadcast: async (message: any) => {
        this.logger.debug(`Agent ${agentId} broadcasting:`, message);
      },
      direct: async (targetAgent: string, message: any) => {
        this.logger.debug(`Agent ${agentId} sending to ${targetAgent}:`, message);
      },
      subscribe: (topic: string, handler: (message: any) => void) => {
        this.logger.debug(`Agent ${agentId} subscribing to ${topic}`);
      },
      publish: async (topic: string, message: any) => {
        this.logger.debug(`Agent ${agentId} publishing to ${topic}:`, message);
      },
    };
  }

  /**
   * Create a workflow definition from translated multi-agent definition
   */
  createWorkflowDefinition<TState extends WorkflowState = WorkflowState>(
    translationResult: MultiAgentTranslationResult<TState>,
    name: string,
    description?: string
  ): WorkflowDefinition<TState> {
    return {
      name,
      description: description || `Multi-agent workflow with ${translationResult.metadata.agentCount} agents using ${translationResult.metadata.coordinationStrategy} strategy`,
      nodes: translationResult.nodes,
      edges: translationResult.edges,
      entryPoint: translationResult.entryPoint,
      channels: undefined, // Will be set by graph builder if needed
    };
  }

  /**
   * Validate a translated multi-agent definition
   */
  validateTranslation<TState extends WorkflowState = WorkflowState>(
    result: MultiAgentTranslationResult<TState>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for entry point
    if (!result.entryPoint) {
      errors.push('No entry point defined');
    } else if (!result.nodes.find(n => n.id === result.entryPoint)) {
      errors.push(`Entry point '${result.entryPoint}' not found in nodes`);
    }
    
    // Check for coordinator
    const hasCoordinator = result.nodes.some(n => n.id === 'coordinator');
    if (!hasCoordinator && result.metadata.coordinationStrategy !== 'sequential') {
      errors.push('Coordinator node missing for non-sequential strategy');
    }
    
    // Check agent count consistency
    const agentNodes = result.nodes.filter(n => 
      n.config?.metadata?.type === 'agent'
    );
    if (agentNodes.length !== result.metadata.agentCount) {
      errors.push(
        `Agent count mismatch: expected ${result.metadata.agentCount}, found ${agentNodes.length}`
      );
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
   * Optimize a translated multi-agent definition
   */
  optimizeTranslation<TState extends WorkflowState = WorkflowState>(
    result: MultiAgentTranslationResult<TState>
  ): MultiAgentTranslationResult<TState> {
    // Remove redundant edges
    const uniqueEdges = new Map<string, WorkflowEdge<TState>>();
    
    for (const edge of result.edges) {
      const key = `${edge.from}->${typeof edge.to === 'string' ? edge.to : 'conditional'}`;
      if (!uniqueEdges.has(key)) {
        uniqueEdges.set(key, edge);
      }
    }
    
    // Optimize node order for better execution
    const optimizedNodes = this.optimizeNodeOrder(result.nodes, Array.from(uniqueEdges.values()));
    
    return {
      ...result,
      nodes: optimizedNodes,
      edges: Array.from(uniqueEdges.values()),
      metadata: {
        ...result.metadata,
        optimized: true,
      } as any,
    };
  }

  /**
   * Optimize node order for better execution performance
   */
  private optimizeNodeOrder<TState extends WorkflowState = WorkflowState>(
    nodes: WorkflowNode<TState>[],
    edges: WorkflowEdge<TState>[]
  ): WorkflowNode<TState>[] {
    // Sort nodes: coordinator first, then agents, then consensus
    return nodes.sort((a, b) => {
      const getPriority = (node: WorkflowNode<TState>) => {
        if (node.id === 'coordinator') return 0;
        if (node.config?.metadata?.type === 'agent') return 1;
        if (node.id === 'consensus') return 2;
        return 3;
      };
      
      return getPriority(a) - getPriority(b);
    });
  }
}