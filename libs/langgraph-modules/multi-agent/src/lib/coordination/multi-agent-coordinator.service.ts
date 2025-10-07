import type {
  ICheckpointAdapter,
  IMemoryAdapter,
  // IStreamingService,
} from '@hive-academy/langgraph-core';
import { NodeIdBuilder } from '@hive-academy/langgraph-core';
import { HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { AgentRegistryService } from '../agent/agent-registry.service';
import {
  AgentDefinition,
  AgentState,
  MultiAgentResult,
} from '../interfaces/multi-agent.interface';
import { LlmProviderService } from '../llm/llm-provider.service';
import { NetworkManagerService } from '../network/network-manager.service';
import { MemoryCoordinationService } from './memory-coordination.service';
import { NetworkSetupService } from './network-setup.service';
import { StreamCoordinationService } from './stream-coordination.service';
import { WorkflowExecutionCoordinationService } from './workflow-execution-coordination.service';

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
    private readonly networkSetup: NetworkSetupService,
    private readonly workflowExecution: WorkflowExecutionCoordinationService,
    private readonly streamCoordination: StreamCoordinationService,
    private readonly memoryCoordination: MemoryCoordinationService,
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter: ICheckpointAdapter,
    // @Inject('IStreamingService')
    // private readonly streamingService: IStreamingService,
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {
    // Initialize streaming service for multi-agent operations
    this.streamCoordination.initializeStreamingCapabilities();

    // Log memory adapter availability
    if (this.memoryAdapter) {
      this.logger.log('Memory adapter available - memory superpowers enabled');
    } else {
      this.logger.debug(
        'Memory adapter not available - proceeding without memory features'
      );
    }
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(
      'Multi-agent coordinator service initialized with SOLID architecture'
    );

    // Test LLM connectivity asynchronously
    setImmediate(async () => {
      try {
        const isConnected = await this.llmProvider.testLLM();
        if (isConnected) {
          this.logger.log('LLM connectivity verified');
          await this.streamCoordination.setupAgentStreamingHooks();
        } else {
          this.logger.warn(
            'LLM connectivity test failed - workflows may not function properly'
          );
        }
      } catch (error) {
        this.logger.warn('Unable to test LLM connectivity on startup:', error);
      }
    });
  }

  // ============================================================================
  // AGENT MANAGEMENT (Delegates to NetworkSetupService & AgentRegistryService)
  // ============================================================================

  /**
   * Register an agent
   * Memory-enhanced with agent performance tracking
   */
  async registerAgent(definition: AgentDefinition): Promise<void> {
    return this.networkSetup.registerAgent(definition);
  }

  /**
   * Get agents by capability
   * Memory-enhanced with agent compatibility learning
   */
  async getAgentsByCapability(capability: string): Promise<AgentDefinition[]> {
    const agents = this.agentRegistry.getAgentsByCapability(capability);
    return this.memoryCoordination.getAgentsByCapability(capability, agents);
  }

  // ============================================================================
  // NETWORK MANAGEMENT (Delegates to NetworkSetupService & NetworkManagerService)
  // ============================================================================

  /**
   * Quick setup: Register agents and create network in one call
   * Memory-enhanced with network topology optimization
   */
  async setupNetwork(
    networkId: string,
    agents: AgentDefinition[],
    networkType: 'supervisor' | 'swarm' | 'hierarchical' = 'supervisor',
    config?: any
  ): Promise<string> {
    return this.networkSetup.setupNetwork(
      networkId,
      agents,
      networkType,
      config
    );
  }

  // ============================================================================
  // WORKFLOW EXECUTION (Delegates to WorkflowExecutionCoordinationService)
  // ============================================================================

  /**
   * Execute multi-agent workflow
   * Memory-enhanced with intelligent coordination
   */
  async executeWorkflow(
    networkId: string,
    input: {
      messages: string[] | HumanMessage[];
      config?: RunnableConfig;
      streamMode?: 'values' | 'updates' | 'messages';
    }
  ): Promise<MultiAgentResult> {
    return this.workflowExecution.executeWorkflow(networkId, input);
  }

  /**
   * Quick execute: Simple text-based workflow execution
   * Automagical: Memory context and storage handled automatically
   */
  async executeSimpleWorkflow(
    networkId: string,
    message: string,
    options?: {
      streamMode?: 'values' | 'updates' | 'messages';
      config?: RunnableConfig;
    }
  ): Promise<MultiAgentResult> {
    return this.workflowExecution.executeSimpleWorkflow(
      networkId,
      message,
      options
    );
  }

  // ============================================================================
  // STREAMING (Delegates to StreamCoordinationService)
  // ============================================================================

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
    return this.streamCoordination.streamWorkflow(networkId, input);
  }

  // ============================================================================
  // CHECKPOINT MANAGEMENT (Direct delegation to CheckpointAdapter)
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
    try {
      const threadId = this.generateThreadId(networkId);
      const checkpoints = await this.checkpointAdapter.listCheckpoints(
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

      return [...checkpoints];
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
    try {
      const threadId = this.generateThreadId(networkId);
      const checkpoint = await this.checkpointAdapter.loadCheckpoint(
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

      return {
        finalState: checkpoint.channel_values as AgentState,
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
    try {
      const threadId = this.generateThreadId(networkId);
      const cleaned = await this.checkpointAdapter.cleanupCheckpoints({
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
    try {
      const threadId = this.generateThreadId(networkId);
      const checkpoints = await this.checkpointAdapter.listCheckpoints(
        threadId
      );

      if (checkpoints.length === 0) {
        return { totalCheckpoints: 0 };
      }

      const timestamps = checkpoints
        .map((tuple) => tuple[2]?.timestamp)
        .filter(Boolean)
        .map((ts: any) => new Date(ts as string))
        .sort((a: Date, b: Date) => a.getTime() - b.getTime());

      return {
        totalCheckpoints: checkpoints.length,
        oldestCheckpoint: timestamps[0],
        newestCheckpoint: timestamps[timestamps.length - 1],
        totalSize: checkpoints.reduce(
          (sum: number, tuple) =>
            sum + (typeof tuple[2]?.size === 'number' ? tuple[2].size : 0),
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

  // ============================================================================
  // CONVENIENCE METHODS (High-level operations)
  // ============================================================================

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
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    this.logger.log('Cleaning up multi-agent coordinator resources');

    this.agentRegistry.clearAll();

    const networks = this.networkManager.listNetworks();
    for (const network of networks) {
      this.networkManager.removeNetwork(network.id);
    }

    this.llmProvider.clearCache();

    this.logger.log('Cleanup completed');
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Generate thread ID for a network (consistent naming)
   */
  private generateThreadId(networkId: string): string {
    try {
      return NodeIdBuilder.create()
        .domain('multi-agent')
        .phase('network')
        .activity(networkId)
        .build();
    } catch (error) {
      this.logger.warn(
        `Failed to generate canonical thread ID, using fallback: ${error}`
      );
      return `multi-agent.network.${networkId}`;
    }
  }
}
