import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CompiledStateGraph } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import {
  AgentNetwork,
  AgentState,
  MultiAgentResult,
  NetworkConfigurationError,
  AgentNotFoundError,
  AgentNetworkSchema,
} from '../interfaces/multi-agent.interface';
import { AgentRegistryService } from './agent-registry.service';
import { GraphBuilderService } from './graph-builder.service';

/**
 * High-level service for managing agent networks and workflow execution
 * Orchestrates other services to provide a clean API for users
 */
@Injectable()
export class NetworkManagerService {
  private readonly logger = new Logger(NetworkManagerService.name);
  private readonly networks = new Map<string, CompiledStateGraph<any, any>>();
  private readonly networkConfigs = new Map<string, AgentNetwork>();

  constructor(
    private readonly agentRegistry: AgentRegistryService,
    private readonly graphBuilder: GraphBuilderService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Create and compile a multi-agent network
   */
  async createNetwork(networkConfig: AgentNetwork): Promise<string> {
    // Validate network configuration
    const validation = AgentNetworkSchema.safeParse(networkConfig);
    if (!validation.success) {
      throw new NetworkConfigurationError(
        `Invalid network configuration: ${validation.error.message}`,
        validation.error
      );
    }

    try {
      // Register agents in the registry
      for (const agent of networkConfig.agents) {
        this.agentRegistry.registerAgent(agent);
      }

      // Validate graph configuration
      this.graphBuilder.validateGraphConfiguration(
        networkConfig.agents,
        networkConfig.config,
        networkConfig.type
      );

      // Build the appropriate graph type
      let graph: CompiledStateGraph<any, any>;

      switch (networkConfig.type) {
        case 'supervisor':
          graph = await this.graphBuilder.buildSupervisorGraph(
            networkConfig.agents,
            networkConfig.config as any,
            networkConfig.compilationOptions
          );
          break;
        
        case 'swarm':
          graph = await this.graphBuilder.buildSwarmGraph(
            networkConfig.agents,
            networkConfig.config as any,
            networkConfig.compilationOptions
          );
          break;
        
        case 'hierarchical':
          graph = await this.graphBuilder.buildHierarchicalGraph(
            networkConfig.agents,
            networkConfig.config as any,
            networkConfig.compilationOptions
          );
          break;
        
        default:
          throw new NetworkConfigurationError(
            `Unsupported network type: ${networkConfig.type}`
          );
      }

      // Store compiled graph and configuration
      this.networks.set(networkConfig.id, graph);
      this.networkConfigs.set(networkConfig.id, networkConfig);

      this.logger.log(
        `Created ${networkConfig.type} network: ${networkConfig.id} with ${networkConfig.agents.length} agents`
      );

      this.eventEmitter.emit('network.created', {
        networkId: networkConfig.id,
        type: networkConfig.type,
        agentCount: networkConfig.agents.length,
        timestamp: new Date().toISOString(),
      });

      return networkConfig.id;
    } catch (error) {
      this.logger.error(`Failed to create network ${networkConfig.id}:`, error);
      
      // Cleanup on failure
      this.networks.delete(networkConfig.id);
      this.networkConfigs.delete(networkConfig.id);
      
      throw new NetworkConfigurationError(
        `Failed to create network: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Execute multi-agent workflow
   */
  async executeWorkflow(
    networkId: string,
    input: {
      messages: string[] | HumanMessage[];
      config?: RunnableConfig;
      streamMode?: 'values' | 'updates' | 'messages';
    }
  ): Promise<MultiAgentResult> {
    const startTime = Date.now();
    const graph = this.networks.get(networkId);
    const networkConfig = this.networkConfigs.get(networkId);
    
    if (!graph || !networkConfig) {
      throw new AgentNotFoundError(`Network not found: ${networkId}`);
    }

    try {
      // Prepare initial state
      const messages = input.messages.map(msg => 
        typeof msg === 'string' ? new HumanMessage(msg) : msg
      );

      const initialState: AgentState = {
        messages,
        metadata: { 
          networkId, 
          networkType: networkConfig.type,
          startTime,
          executionId: this.generateExecutionId(),
        },
      };

      this.logger.debug(`Executing workflow on network ${networkId}`, {
        type: networkConfig.type,
        messageCount: messages.length,
        executionId: initialState.metadata?.executionId,
      });

      this.eventEmitter.emit('workflow.started', {
        networkId,
        executionId: initialState.metadata?.executionId,
        messageCount: messages.length,
        timestamp: new Date().toISOString(),
      });

      // Execute the workflow
      const result = await (graph as any).invoke(initialState as any, {
        ...input.config,
        configurable: {
          ...input.config?.configurable,
          networkId,
          networkType: networkConfig.type,
        },
      });

      const executionTime = Date.now() - startTime;
      const executionPath = this.extractExecutionPath(result);

      this.eventEmitter.emit('workflow.completed', {
        networkId,
        executionId: initialState.metadata?.executionId,
        executionTime,
        executionPath,
        success: true,
        messageCount: result.messages?.length || 0,
        timestamp: new Date().toISOString(),
      });

      return {
        finalState: result as any,
        executionPath,
        executionTime,
        success: true,
        tokenUsage: this.extractTokenUsage(result as any),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      this.logger.error(`Workflow execution failed for network ${networkId}:`, error);
      
      this.eventEmitter.emit('workflow.failed', {
        networkId,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
        timestamp: new Date().toISOString(),
      });

      return {
        finalState: { 
          messages: [], 
          metadata: { 
            error: true,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          } 
        },
        executionPath: [],
        executionTime,
        success: false,
        error: error instanceof Error ? error : new Error('Unknown execution error'),
      };
    }
  }

  /**
   * Stream workflow execution
   */
  async *streamWorkflow(
    networkId: string,
    input: {
      messages: string[] | HumanMessage[];
      config?: RunnableConfig;
      streamMode?: 'values' | 'updates' | 'messages';
    }
  ): AsyncGenerator<Partial<AgentState>, MultiAgentResult, unknown> {
    const graph = this.networks.get(networkId);
    const networkConfig = this.networkConfigs.get(networkId);
    
    if (!graph || !networkConfig) {
      throw new AgentNotFoundError(`Network not found: ${networkId}`);
    }

    const startTime = Date.now();
    const messages = input.messages.map(msg => 
      typeof msg === 'string' ? new HumanMessage(msg) : msg
    );

    const initialState: AgentState = {
      messages,
      metadata: { 
        networkId, 
        networkType: networkConfig.type,
        startTime,
        executionId: this.generateExecutionId(),
      },
    };

    try {
      const streamMode = input.streamMode || 'values';
      
      this.eventEmitter.emit('workflow.stream.started', {
        networkId,
        executionId: initialState.metadata?.executionId,
        streamMode,
        timestamp: new Date().toISOString(),
      });

      // Stream the workflow execution
      let finalResult: AgentState | undefined;
      const executionPath: string[] = [];

      for await (const chunk of (graph as any).stream(initialState as any, {
        ...input.config,
        streamMode,
        configurable: {
          ...input.config?.configurable,
          networkId,
          networkType: networkConfig.type,
        },
      })) {
        // Track execution path
        if (chunk.current) {
          executionPath.push(chunk.current);
        }

        finalResult = chunk;
        yield chunk;
      }

      const executionTime = Date.now() - startTime;

      this.eventEmitter.emit('workflow.stream.completed', {
        networkId,
        executionId: initialState.metadata?.executionId,
        executionTime,
        executionPath,
        timestamp: new Date().toISOString(),
      });

      return {
        finalState: (finalResult || initialState) as any,
        executionPath,
        executionTime,
        success: true,
        tokenUsage: this.extractTokenUsage(finalResult as any),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      this.logger.error(`Streaming workflow failed for network ${networkId}:`, error);
      
      this.eventEmitter.emit('workflow.stream.failed', {
        networkId,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
        timestamp: new Date().toISOString(),
      });

      return {
        finalState: { 
          messages: [], 
          metadata: { 
            error: true,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          } 
        },
        executionPath: [],
        executionTime,
        success: false,
        error: error instanceof Error ? error : new Error('Unknown streaming error'),
      };
    }
  }

  /**
   * Get network by ID
   */
  getNetwork(networkId: string): CompiledStateGraph<any, any> | undefined {
    return this.networks.get(networkId);
  }

  /**
   * Get network configuration
   */
  getNetworkConfig(networkId: string): AgentNetwork | undefined {
    return this.networkConfigs.get(networkId);
  }

  /**
   * List all networks
   */
  listNetworks(): Array<{ id: string; type: string; agentCount: number }> {
    return Array.from(this.networkConfigs.values()).map(config => ({
      id: config.id,
      type: config.type,
      agentCount: config.agents.length,
    }));
  }

  /**
   * Remove network
   */
  removeNetwork(networkId: string): boolean {
    const networkConfig = this.networkConfigs.get(networkId);
    
    if (!networkConfig) {
      return false;
    }

    // Remove from both maps
    this.networks.delete(networkId);
    this.networkConfigs.delete(networkId);
    
    this.logger.log(`Removed network: ${networkId}`);
    
    this.eventEmitter.emit('network.removed', { 
      networkId,
      type: networkConfig.type,
      timestamp: new Date().toISOString(),
    });
    
    return true;
  }

  /**
   * Get network statistics
   */
  getNetworkStats(networkId: string): {
    agentCount: number;
    type: string;
    created: boolean;
    agents: string[];
  } | undefined {
    const config = this.networkConfigs.get(networkId);
    if (!config) {
      return undefined;
    }

    return {
      agentCount: config.agents.length,
      type: config.type,
      created: this.networks.has(networkId),
      agents: config.agents.map(a => a.id),
    };
  }

  /**
   * Health check for network
   */
  async healthCheck(networkId: string): Promise<{
    healthy: boolean;
    issues: string[];
    agentHealth: Record<string, boolean>;
  }> {
    const config = this.networkConfigs.get(networkId);
    const graph = this.networks.get(networkId);
    
    if (!config || !graph) {
      return {
        healthy: false,
        issues: ['Network not found'],
        agentHealth: {},
      };
    }

    const issues: string[] = [];
    const agentHealth: Record<string, boolean> = {};

    // Check agent health
    for (const agent of config.agents) {
      const health = this.agentRegistry.getAgentHealth(agent.id);
      agentHealth[agent.id] = health;
      
      if (!health) {
        issues.push(`Agent ${agent.id} is unhealthy`);
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
      agentHealth,
    };
  }

  /**
   * Extract execution path from result
   */
  private extractExecutionPath(result: AgentState): string[] {
    const path: string[] = [];
    
    if (result.metadata?.executionPath) {
      return result.metadata.executionPath as string[];
    }
    
    if (result.metadata?.lastAgent) {
      path.push(result.metadata.lastAgent as string);
    }
    
    return path;
  }

  /**
   * Extract token usage from result
   */
  private extractTokenUsage(result?: AgentState): MultiAgentResult['tokenUsage'] {
    if (!result?.metadata?.tokenUsage) {
      return undefined;
    }

    return result.metadata.tokenUsage as MultiAgentResult['tokenUsage'];
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}