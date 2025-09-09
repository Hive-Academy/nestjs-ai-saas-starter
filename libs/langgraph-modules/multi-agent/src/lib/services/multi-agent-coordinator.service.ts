import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { CheckpointManagerService } from '@hive-academy/langgraph-checkpoint';
import {
  AgentDefinition,
  AgentNetwork,
  MultiAgentResult,
  AgentState,
} from '../interfaces/multi-agent.interface';
import { AgentRegistryService } from './agent-registry.service';
import { NetworkManagerService } from './network-manager.service';
import { LlmProviderService } from './llm-provider.service';

/**
 * Main facade service for multi-agent coordination
 * Provides a simplified API by delegating to specialized services
 *
 * This service acts as a facade pattern implementation, providing:
 * - Simple API for common operations
 * - Backward compatibility
 * - Convenience methods for users
 */
@Injectable()
export class MultiAgentCoordinatorService implements OnModuleInit {
  private readonly logger = new Logger(MultiAgentCoordinatorService.name);

  constructor(
    private readonly agentRegistry: AgentRegistryService,
    private readonly networkManager: NetworkManagerService,
    private readonly llmProvider: LlmProviderService,
    @Optional() private readonly checkpointManager?: CheckpointManagerService
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log(
      'Multi-agent coordinator service initialized with SOLID architecture'
    );

    // Test LLM connectivity on startup
    try {
      const isConnected = await this.llmProvider.testLLM();
      if (isConnected) {
        this.logger.log('LLM connectivity verified');
      } else {
        this.logger.warn(
          'LLM connectivity test failed - workflows may not function properly'
        );
      }
    } catch (error) {
      this.logger.warn('Unable to test LLM connectivity on startup:', error);
    }
  }

  // ============================================================================
  // AGENT MANAGEMENT (Delegates to AgentRegistryService)
  // ============================================================================

  /**
   * Register an agent
   */
  registerAgent(definition: AgentDefinition): void {
    this.agentRegistry.registerAgent(definition);
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentDefinition {
    return this.agentRegistry.getAgent(agentId);
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): AgentDefinition[] {
    return this.agentRegistry.getAllAgents();
  }

  /**
   * Get agents by capability
   */
  getAgentsByCapability(capability: string): AgentDefinition[] {
    return this.agentRegistry.getAgentsByCapability(capability);
  }

  /**
   * Check if agent exists
   */
  hasAgent(agentId: string): boolean {
    return this.agentRegistry.hasAgent(agentId);
  }

  /**
   * Get agent health status
   */
  getAgentHealth(agentId: string): boolean {
    return this.agentRegistry.getAgentHealth(agentId);
  }

  /**
   * List all agent IDs
   */
  listAgentIds(): string[] {
    return this.agentRegistry.listAgentIds();
  }

  // ============================================================================
  // NETWORK MANAGEMENT (Delegates to NetworkManagerService)
  // ============================================================================

  /**
   * Create and compile a multi-agent network
   */
  async createNetwork(networkConfig: AgentNetwork): Promise<string> {
    return this.networkManager.createNetwork(networkConfig);
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
    return this.networkManager.executeWorkflow(networkId, input);
  }

  /**
   * Stream workflow execution
   */
  streamWorkflow(
    networkId: string,
    input: {
      messages: string[] | HumanMessage[];
      config?: RunnableConfig;
      streamMode?: 'values' | 'updates' | 'messages';
    }
  ): AsyncGenerator<Partial<AgentState>, MultiAgentResult, unknown> {
    return this.networkManager.streamWorkflow(networkId, input);
  }

  /**
   * Get network configuration
   */
  getNetworkConfig(networkId: string): AgentNetwork | undefined {
    return this.networkManager.getNetworkConfig(networkId);
  }

  /**
   * List all networks
   */
  listNetworks(): Array<{ id: string; type: string; agentCount: number }> {
    return this.networkManager.listNetworks();
  }

  /**
   * Remove network
   */
  removeNetwork(networkId: string): boolean {
    return this.networkManager.removeNetwork(networkId);
  }

  /**
   * Get network statistics
   */
  getNetworkStats(networkId: string) {
    return this.networkManager.getNetworkStats(networkId);
  }

  /**
   * Health check for network
   */
  async healthCheck(networkId: string) {
    return this.networkManager.healthCheck(networkId);
  }

  // ============================================================================
  // CONVENIENCE METHODS (High-level operations)
  // ============================================================================

  /**
   * Quick setup: Register agents and create network in one call
   */
  async setupNetwork(
    networkId: string,
    agents: AgentDefinition[],
    networkType: 'supervisor' | 'swarm' | 'hierarchical' = 'supervisor',
    config?: any
  ): Promise<string> {
    // Register all agents
    for (const agent of agents) {
      this.registerAgent(agent);
    }

    // Create default configuration based on type
    let networkConfig: AgentNetwork;

    switch (networkType) {
      case 'supervisor':
        networkConfig = {
          id: networkId,
          type: 'supervisor',
          agents,
          config: {
            systemPrompt: `You are a supervisor coordinating ${
              agents.length
            } agents: ${agents.map((a) => a.name).join(', ')}.`,
            workers: agents.map((a) => a.id),
            ...config,
          },
        };
        break;

      case 'swarm':
        networkConfig = {
          id: networkId,
          type: 'swarm',
          agents,
          config: {
            enableDynamicHandoffs: true,
            messageHistory: {
              removeHandoffMessages: true,
              addAgentAttribution: true,
            },
            contextIsolation: {
              enabled: false,
            },
            ...config,
          },
        };
        break;

      case 'hierarchical':
        networkConfig = {
          id: networkId,
          type: 'hierarchical',
          agents,
          config: {
            levels: [agents.map((a) => a.id)],
            ...config,
          },
        };
        break;
    }

    return this.createNetwork(networkConfig);
  }

  /**
   * Quick execute: Simple text-based workflow execution
   */
  async executeSimpleWorkflow(
    networkId: string,
    message: string,
    options?: {
      streamMode?: 'values' | 'updates' | 'messages';
      config?: RunnableConfig;
    }
  ): Promise<MultiAgentResult> {
    return this.executeWorkflow(networkId, {
      messages: [message],
      streamMode: options?.streamMode,
      config: options?.config,
    });
  }

  /**
   * Get comprehensive system status
   */
  getSystemStatus(): {
    agents: {
      total: number;
      healthy: number;
      unhealthy: number;
    };
    networks: {
      total: number;
      types: Record<string, number>;
    };
    llm: {
      providers: string[];
      cacheSize: number;
    };
  } {
    const allAgents = this.agentRegistry.getAllAgents();
    const healthyAgents = this.agentRegistry.getHealthyAgents();
    const networks = this.networkManager.listNetworks();
    const llmStats = this.llmProvider.getCacheStats();

    // Count networks by type
    const networkTypes: Record<string, number> = {};
    for (const network of networks) {
      networkTypes[network.type] = (networkTypes[network.type] || 0) + 1;
    }

    return {
      agents: {
        total: allAgents.length,
        healthy: healthyAgents.length,
        unhealthy: allAgents.length - healthyAgents.length,
      },
      networks: {
        total: networks.length,
        types: networkTypes,
      },
      llm: {
        providers: this.llmProvider.getSupportedProviders(),
        cacheSize: llmStats.size,
      },
    };
  }

  /**
   * Cleanup all resources (useful for testing and shutdown)
   */
  async cleanup(): Promise<void> {
    this.logger.log('Cleaning up multi-agent coordinator resources');

    // Clear agent registry
    this.agentRegistry.clearAll();

    // Remove all networks
    const networks = this.networkManager.listNetworks();
    for (const network of networks) {
      this.networkManager.removeNetwork(network.id);
    }

    // Clear LLM cache
    this.llmProvider.clearCache();

    this.logger.log('Cleanup completed');
  }

  // ============================================================================
  // CHECKPOINT MANAGEMENT (Delegates to CheckpointManagerService)
  // ============================================================================

  /**
   * Get checkpoints for a specific network
   */
  async getNetworkCheckpoints(
    networkId: string,
    options: {
      limit?: number;
      before?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<any[]> {
    if (!this.checkpointManager) {
      this.logger.warn(
        'CheckpointManager not available - returning empty checkpoints'
      );
      return [];
    }

    try {
      const threadId = this.generateThreadId(networkId);
      const checkpoints = await this.checkpointManager.listCheckpoints(
        threadId,
        {
          limit: options.limit || 10,
          before: options.before,
          metadata: options.metadata,
        }
      );

      this.logger.debug(
        `Retrieved ${checkpoints.length} checkpoints for network ${networkId}`
      );

      return checkpoints;
    } catch (error) {
      this.logger.error(
        `Failed to get checkpoints for network ${networkId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Resume a network from a specific checkpoint
   */
  async resumeFromCheckpoint(
    networkId: string,
    checkpointId: string,
    input?: {
      messages?: string[] | HumanMessage[];
      config?: RunnableConfig;
    }
  ): Promise<MultiAgentResult> {
    if (!this.checkpointManager) {
      throw new Error(
        'CheckpointManager not available - cannot resume from checkpoint'
      );
    }

    try {
      const threadId = this.generateThreadId(networkId);
      const checkpoint = await this.checkpointManager.loadCheckpoint(
        threadId,
        checkpointId
      );

      if (!checkpoint) {
        throw new Error(
          `Checkpoint ${checkpointId} not found for network ${networkId}`
        );
      }

      this.logger.debug(
        `Resuming network ${networkId} from checkpoint ${checkpointId}`
      );

      // If input is provided, execute workflow with restored state
      if (input?.messages) {
        const config = {
          ...input.config,
          configurable: {
            ...input.config?.configurable,
            thread_id: threadId,
            checkpoint_id: checkpointId,
          },
        };

        return this.executeWorkflow(networkId, {
          messages: input.messages,
          config,
        });
      }

      // Return the checkpoint state as a result
      return {
        finalState: checkpoint.checkpoint as AgentState,
        executionPath: [],
        executionTime: 0,
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `Failed to resume from checkpoint ${checkpointId} for network ${networkId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Clear all checkpoints for a network
   */
  async clearNetworkCheckpoints(networkId: string): Promise<number> {
    if (!this.checkpointManager) {
      this.logger.warn(
        'CheckpointManager not available - no checkpoints to clear'
      );
      return 0;
    }

    try {
      const threadId = this.generateThreadId(networkId);

      // Get all checkpoints for the network
      const checkpoints = await this.checkpointManager.listCheckpoints(
        threadId
      );

      if (checkpoints.length === 0) {
        this.logger.debug(`No checkpoints found for network ${networkId}`);
        return 0;
      }

      // Use cleanup service to remove checkpoints for this specific thread
      const cleaned = await this.checkpointManager.cleanupCheckpoints({
        threadIds: [threadId],
      });

      this.logger.log(
        `Cleared ${cleaned} checkpoints for network ${networkId}`
      );

      return cleaned;
    } catch (error) {
      this.logger.error(
        `Failed to clear checkpoints for network ${networkId}:`,
        error
      );
      return 0;
    }
  }

  /**
   * Get checkpoint statistics for a network
   */
  async getNetworkCheckpointStats(networkId: string): Promise<{
    totalCheckpoints: number;
    oldestCheckpoint?: Date;
    newestCheckpoint?: Date;
    totalSize?: number;
  }> {
    if (!this.checkpointManager) {
      return { totalCheckpoints: 0 };
    }

    try {
      const threadId = this.generateThreadId(networkId);
      const checkpoints = await this.checkpointManager.listCheckpoints(
        threadId
      );

      if (checkpoints.length === 0) {
        return { totalCheckpoints: 0 };
      }

      const timestamps = checkpoints
        .map((cp) => cp.metadata?.timestamp)
        .filter(Boolean)
        .map((ts) => new Date(ts as string))
        .sort((a, b) => a.getTime() - b.getTime());

      return {
        totalCheckpoints: checkpoints.length,
        oldestCheckpoint: timestamps[0],
        newestCheckpoint: timestamps[timestamps.length - 1],
        totalSize: checkpoints.reduce(
          (sum, cp) => sum + (cp.metadata?.size || 0),
          0
        ),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get checkpoint stats for network ${networkId}:`,
        error
      );
      return { totalCheckpoints: 0 };
    }
  }

  /**
   * Generate thread ID for a network (consistent naming)
   */
  private generateThreadId(networkId: string): string {
    return `multi-agent_${networkId}`;
  }

  // ============================================================================
  // LEGACY COMPATIBILITY (Deprecated methods for backward compatibility)
  // ============================================================================

  /**
   * @deprecated Use setupNetwork() instead
   */
  async createSupervisorWorkflow(
    supervisorAgent: string,
    workerAgents: readonly string[],
    options: any = {}
  ): Promise<string> {
    this.logger.warn(
      'createSupervisorWorkflow is deprecated, use setupNetwork instead'
    );

    const agents = [supervisorAgent, ...workerAgents]
      .map((id) => this.agentRegistry.findAgent(id))
      .filter(Boolean) as AgentDefinition[];

    return this.setupNetwork(`supervisor_${Date.now()}`, agents, 'supervisor', {
      workers: [...workerAgents],
      ...options,
    });
  }

  /**
   * @deprecated Use createNetwork() directly instead
   */
  async createAgentNetwork(
    name: string,
    agents: readonly AgentDefinition[],
    topology: any
  ): Promise<string> {
    this.logger.warn(
      'createAgentNetwork is deprecated, use createNetwork instead'
    );

    return this.createNetwork({
      id: `network_${name}_${Date.now()}`,
      type: 'supervisor',
      agents,
      config: {
        systemPrompt: `Network ${name} coordinator`,
        workers: agents.map((a) => a.id),
      },
    });
  }
}
