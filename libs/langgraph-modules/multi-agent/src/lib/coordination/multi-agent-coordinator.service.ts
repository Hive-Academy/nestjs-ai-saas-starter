import {
  Injectable,
  Logger,
  OnModuleInit,
  Inject,
  Optional,
} from '@nestjs/common';
import { HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type {
  ICheckpointAdapter,
  IStreamingService,
  IMemoryAdapter,
} from '@hive-academy/langgraph-core';
import { NodeIdBuilder } from '@hive-academy/langgraph-core';
import {
  AgentDefinition,
  AgentNetwork,
  MultiAgentResult,
  AgentState,
} from '../interfaces/multi-agent.interface';
import { AgentRegistryService } from '../agent/agent-registry.service';
import { NetworkManagerService } from '../network/network-manager.service';
import { LlmProviderService } from '../llm/llm-provider.service';

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
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter: ICheckpointAdapter,
    @Inject('IStreamingService')
    private readonly streamingService: IStreamingService,
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {
    // Initialize streaming service for multi-agent operations
    this.initializeStreamingCapabilities();

    // Log memory adapter availability for automagical memory superpowers
    if (this.memoryAdapter) {
      this.logger.log(
        '🧠 Memory adapter available - automagical memory superpowers enabled'
      );
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

    // Test LLM connectivity asynchronously to avoid blocking startup
    setImmediate(async () => {
      try {
        const isConnected = await this.llmProvider.testLLM();
        if (isConnected) {
          this.logger.log('LLM connectivity verified');
          // Initialize streaming for agent events
          await this.setupAgentStreamingHooks();
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
  // AGENT MANAGEMENT (Delegates to AgentRegistryService)
  // ============================================================================

  /**
   * Register an agent
   * 🧠 AUTOMAGICAL: Enhanced with memory-based agent performance tracking
   */
  async registerAgent(definition: AgentDefinition): Promise<void> {
    this.agentRegistry.registerAgent(definition);

    // 🧠 MEMORY SUPERPOWERS: Store agent registration for performance tracking
    if (this.memoryAdapter) {
      try {
        await this.storeAgentRegistration(definition);
        this.logger.debug(
          `🧠 Agent ${definition.id} registered with memory tracking`
        );
      } catch (error) {
        this.logger.warn(
          `Failed to store agent registration in memory: ${error}`
        );
      }
    }
  }

  /**
   * Get agent by ID
   */
  // ❌ REMOVED: Pure delegation to AgentRegistryService
  // Use AgentRegistryService.getAgent() directly
  // Use AgentRegistryService.getAllAgents() directly

  /**
   * Get agents by capability
   * 🧠 AUTOMAGICAL: Enhanced with memory-based agent compatibility learning
   */
  async getAgentsByCapability(capability: string): Promise<AgentDefinition[]> {
    const agents = this.agentRegistry.getAgentsByCapability(capability);

    // 🧠 MEMORY SUPERPOWERS: Enhance with agent compatibility patterns
    if (this.memoryAdapter && agents.length > 0) {
      try {
        const enhancedAgents = await this.enhanceAgentsWithCompatibility(
          agents,
          capability
        );
        this.logger.debug(
          `🧠 Enhanced ${agents.length} agents with compatibility patterns for capability: ${capability}`
        );
        return enhancedAgents;
      } catch (error) {
        this.logger.warn(
          `Failed to enhance agents with compatibility: ${error}`
        );
      }
    }

    return agents;
  }

  // ❌ REMOVED: Pure delegations to AgentRegistryService
  // Use AgentRegistryService.hasAgent() directly
  // Use AgentRegistryService.getAgentHealth() directly
  // Use AgentRegistryService.listAgentIds() directly

  // ============================================================================
  // NETWORK MANAGEMENT (Delegates to NetworkManagerService)
  // ============================================================================

  /**
   * Create and compile a multi-agent network
   */
  // ❌ REMOVED: Pure delegation to NetworkManagerService
  // Use NetworkManagerService.createNetwork() directly

  /**
   * Execute multi-agent workflow
   * 🧠 AUTOMAGICAL: Enhanced with intelligent coordination through memory-based learning
   */
  async executeWorkflow(
    networkId: string,
    input: {
      messages: string[] | HumanMessage[];
      config?: RunnableConfig;
      streamMode?: 'values' | 'updates' | 'messages';
    }
  ): Promise<MultiAgentResult> {
    const executionId = this.generateExecutionId(networkId);
    const threadId = this.generateThreadId(networkId);

    // 🧠 MEMORY SUPERPOWERS: Get optimal agent coordination based on learned patterns
    let coordinationContext: any = {};
    if (this.memoryAdapter) {
      try {
        coordinationContext = await this.getOptimalCoordinationContext(
          networkId,
          input
        );
        this.logger.debug(
          `🧠 Retrieved coordination context for network ${networkId}`,
          {
            agentCompatibility:
              coordinationContext.agentCompatibility?.length || 0,
            networkOptimizations:
              coordinationContext.networkOptimizations?.length || 0,
            performancePatterns:
              coordinationContext.performancePatterns?.length || 0,
          }
        );
      } catch (error) {
        this.logger.warn(`Failed to get coordination context: ${error}`);
      }
    }

    // 🧠 AUTOMAGICAL: Enhance initial state with memory context if available
    let enhancedInput = input;
    if (this.memoryAdapter) {
      try {
        enhancedInput = await this.enhanceInputWithMemoryContext(
          input,
          threadId,
          networkId
        );
        this.logger.debug(
          `Enhanced input with memory context for execution ${executionId}`
        );
      } catch (error) {
        this.logger.warn(
          `Failed to enhance input with memory context: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        // Continue with original input if memory enhancement fails
      }
    }

    // Prepare checkpoint-enabled config
    const checkpointConfig: RunnableConfig = {
      ...enhancedInput.config,
      configurable: {
        ...enhancedInput.config?.configurable,
        thread_id: threadId,
      },
      tags: [
        ...(enhancedInput.config?.tags || []),
        'multi-agent',
        'auto-checkpoint',
      ],
      metadata: {
        ...enhancedInput.config?.metadata,
        networkId,
        executionId,
        threadId,
        checkpointEnabled: !!this.checkpointAdapter,
        memoryEnabled: !!this.memoryAdapter,
        // 🧠 MEMORY SUPERPOWERS: Inject coordination intelligence
        coordinationContext,
        agentCompatibility: coordinationContext.agentCompatibility || [],
        networkOptimizations: coordinationContext.networkOptimizations || [],
        performancePatterns: coordinationContext.performancePatterns || [],
      },
    };

    // Save initial checkpoint if adapter is available
    if (this.checkpointAdapter) {
      try {
        await this.saveWorkflowCheckpoint(threadId, {
          networkId,
          executionId,
          phase: 'start',
          messages: input.messages,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        this.logger.warn(`Failed to save initial checkpoint: ${error}`);
        // Continue execution even if checkpoint fails
      }
    }

    // Stream workflow start event
    if (this.streamingService) {
      await this.streamingService.emitEvent('workflow_start', {
        executionId,
        networkId,
        threadId,
        input: { messageCount: input.messages.length },
        timestamp: new Date(),
        metadata: {
          agentCount: this.getNetworkConfig(networkId)?.agents?.length || 0,
          checkpointEnabled: !!this.checkpointAdapter,
        },
      });
    }

    // 🧠 MEMORY SUPERPOWERS: Track execution start time for performance learning
    const executionStartTime = Date.now();

    const result = await this.networkManager.executeWorkflow(networkId, {
      ...enhancedInput,
      config: checkpointConfig,
    });

    // 🧠 MEMORY SUPERPOWERS: Store agent coordination patterns and performance
    if (this.memoryAdapter && result) {
      try {
        await this.storeAgentCoordinationEvent({
          networkId,
          executionId,
          threadId,
          input: enhancedInput,
          result,
          coordinationContext,
          executionTime: Date.now() - executionStartTime,
          timestamp: new Date().toISOString(),
        });
        this.logger.debug(
          `🧠 Stored coordination event for learning: ${executionId}`
        );
      } catch (error) {
        this.logger.warn(`Failed to store coordination event: ${error}`);
      }
    }

    // Save completion checkpoint if adapter is available
    if (this.checkpointAdapter && result) {
      try {
        await this.saveWorkflowCheckpoint(threadId, {
          networkId,
          executionId,
          phase: 'complete',
          result: {
            success: result.success,
            executionTime: result.executionTime,
            executionPath: result.executionPath,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        this.logger.warn(`Failed to save completion checkpoint: ${error}`);
        // Don't fail the workflow if checkpoint fails
      }
    }

    // 🧠 AUTOMAGICAL: Store conversation turn in memory if available
    if (this.memoryAdapter && result) {
      try {
        await this.storeConversationInMemory(
          enhancedInput,
          result,
          threadId,
          executionId,
          networkId
        );
        this.logger.debug(
          `Stored conversation turn in memory for execution ${executionId}`
        );
      } catch (error) {
        this.logger.warn(
          `Failed to store conversation in memory: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        // Don't fail the workflow if memory storage fails
      }
    }

    // Stream workflow completion event
    if (this.streamingService && result) {
      await this.streamingService.emitEvent('workflow_complete', {
        executionId,
        networkId,
        threadId,
        result: {
          success: result.success,
          executionTime: result.executionTime,
          executionPath: result.executionPath,
        },
        timestamp: new Date(),
        metadata: {
          checkpointSaved: !!this.checkpointAdapter,
        },
      });
    }

    return result;
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
    const threadId = this.generateThreadId(networkId);

    // Prepare checkpoint-enabled config for streaming
    const checkpointConfig: RunnableConfig = {
      ...input.config,
      configurable: {
        ...input.config?.configurable,
        thread_id: threadId,
      },
      tags: [
        ...(input.config?.tags || []),
        'multi-agent',
        'auto-checkpoint',
        'streaming',
      ],
      metadata: {
        ...input.config?.metadata,
        networkId,
        threadId,
        streamMode: input.streamMode || 'values',
        checkpointEnabled: !!this.checkpointAdapter,
      },
    };

    // Set up streaming bridge with checkpoint-enabled config
    return this.bridgeNetworkStreaming(networkId, {
      ...input,
      config: checkpointConfig,
    });
  }

  /**
   * Get network configuration
   */
  // ❌ REMOVED: Pure delegations to NetworkManagerService
  // Use NetworkManagerService.getNetworkConfig() directly
  // Use NetworkManagerService.listNetworks() directly
  // Use NetworkManagerService.removeNetwork() directly
  // Use NetworkManagerService.getNetworkStats() directly
  // Use NetworkManagerService.healthCheck() directly

  // ============================================================================
  // CONVENIENCE METHODS (High-level operations)
  // ============================================================================

  /**
   * Quick setup: Register agents and create network in one call
   * 🧠 AUTOMAGICAL: Enhanced with memory-based network topology optimization
   */
  async setupNetwork(
    networkId: string,
    agents: AgentDefinition[],
    networkType: 'supervisor' | 'swarm' | 'hierarchical' = 'supervisor',
    config?: any
  ): Promise<string> {
    // Register all agents with memory tracking
    for (const agent of agents) {
      await this.registerAgent(agent);
    }

    // 🧠 MEMORY SUPERPOWERS: Get optimal network configuration based on learned patterns
    let networkOptimizations: any = {};
    if (this.memoryAdapter) {
      try {
        networkOptimizations = await this.getOptimalNetworkConfiguration(
          networkId,
          agents,
          networkType
        );
        this.logger.debug(
          `🧠 Retrieved network optimizations for ${networkId}`,
          {
            agentOrderOptimized: networkOptimizations.agentOrder?.length > 0,
            topologyOptimized: !!networkOptimizations.topology,
            performanceTuned: !!networkOptimizations.performance,
          }
        );
      } catch (error) {
        this.logger.warn(`Failed to get network optimizations: ${error}`);
      }
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
            workers: networkOptimizations.agentOrder || agents.map((a) => a.id),
            // 🧠 MEMORY SUPERPOWERS: Apply learned network optimizations
            ...networkOptimizations.configuration,
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
            enableDynamicHandoffs:
              networkOptimizations.dynamicHandoffs !== false,
            messageHistory: {
              removeHandoffMessages:
                networkOptimizations.cleanMessages !== false,
              addAgentAttribution: networkOptimizations.attribution !== false,
            },
            contextIsolation: {
              enabled: networkOptimizations.isolation === true,
            },
            // 🧠 MEMORY SUPERPOWERS: Apply learned swarm optimizations
            ...networkOptimizations.configuration,
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
            levels: networkOptimizations.levels || [agents.map((a) => a.id)],
            // 🧠 MEMORY SUPERPOWERS: Apply learned hierarchical optimizations
            ...networkOptimizations.configuration,
            ...config,
          },
        };
        break;
    }

    const createdNetworkId = await this.networkManager.createNetwork(networkConfig);

    // 🧠 MEMORY SUPERPOWERS: Store network creation event for learning
    if (this.memoryAdapter) {
      try {
        await this.storeNetworkCreationEvent({
          networkId: createdNetworkId,
          type: networkType,
          agents,
          optimizations: networkOptimizations,
          timestamp: new Date().toISOString(),
        });
        this.logger.debug(
          `🧠 Stored network creation event: ${createdNetworkId}`
        );
      } catch (error) {
        this.logger.warn(`Failed to store network creation event: ${error}`);
      }
    }

    return createdNetworkId;
  }

  /**
   * Quick execute: Simple text-based workflow execution
   * 🧠 AUTOMAGICAL: Memory context and storage handled automatically
   */
  async executeSimpleWorkflow(
    networkId: string,
    message: string,
    options?: {
      streamMode?: 'values' | 'updates' | 'messages';
      config?: RunnableConfig;
    }
  ): Promise<MultiAgentResult> {
    // Use the full executeWorkflow method which includes automagical memory handling
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

      return [...checkpoints]; // Convert readonly array to mutable array
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

      // Use cleanup service to remove checkpoints for this specific thread
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

  /**
   * Generate thread ID for a network (consistent naming)
   * Uses NodeIdBuilder to create canonical thread ID following pattern: multi-agent.network.{networkId}
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
      // Fallback to simple pattern if NodeIdBuilder fails
      return `multi-agent.network.${networkId}`;
    }
  }

  /**
   * Save workflow checkpoint with state and metadata
   */
  private async saveWorkflowCheckpoint(
    threadId: string,
    state: Record<string, unknown>
  ): Promise<void> {
    if (!this.checkpointAdapter) {
      return;
    }

    try {
      const checkpoint = {
        id: `checkpoint_${threadId}_${Date.now()}`,
        channel_values: state,
      };

      const metadata = {
        threadId,
        timestamp: new Date().toISOString(),
        source: 'input' as const,
        step: 0,
        parents: {},
        networkId: state.networkId as string,
        executionId: state.executionId as string,
        phase: state.phase as string,
      };

      await this.checkpointAdapter.saveCheckpoint(
        threadId,
        checkpoint,
        metadata
      );

      this.logger.debug(`Checkpoint saved for thread ${threadId}`);
    } catch (error) {
      this.logger.error(
        `Failed to save checkpoint for thread ${threadId}:`,
        error
      );
      // Don't throw - checkpoint failures shouldn't stop workflow execution
    }
  }

  /**
   * Generate execution ID for streaming events
   */
  private generateExecutionId(networkId: string): string {
    return `exec_${networkId}_${Date.now()}`;
  }

  /**
   * Initialize streaming capabilities for multi-agent operations
   */
  private initializeStreamingCapabilities(): void {
    this.logger.debug('Streaming service available:', !!this.streamingService);
  }

  /**
   * Set up streaming hooks for agent events
   */
  private async setupAgentStreamingHooks(): Promise<void> {
    if (!this.streamingService) {
      this.logger.debug(
        'Streaming service not available - skipping agent streaming hooks'
      );
      return;
    }

    this.logger.debug('Setting up agent streaming hooks');
    // Additional streaming hook setup can be added here
  }

  /**
   * Bridge streaming between networkManager and streaming service
   */
  private async *bridgeNetworkStreaming(
    networkId: string,
    input: {
      messages: string[] | HumanMessage[];
      config?: RunnableConfig;
      streamMode?: 'values' | 'updates' | 'messages';
    }
  ): AsyncGenerator<Partial<AgentState>, MultiAgentResult, unknown> {
    const executionId = this.generateExecutionId(networkId);
    const threadId =
      (input.config?.metadata?.threadId as string) ||
      this.generateThreadId(networkId);
    const startTime = Date.now();

    // Save initial checkpoint for streaming if adapter is available
    if (this.checkpointAdapter) {
      try {
        await this.saveWorkflowCheckpoint(threadId, {
          networkId,
          executionId,
          phase: 'stream_start',
          messages: input.messages,
          streamMode: input.streamMode || 'values',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        this.logger.warn(
          `Failed to save initial streaming checkpoint: ${error}`
        );
      }
    }

    // Stream start event
    if (this.streamingService) {
      await this.streamingService.emitEvent('stream_start', {
        executionId,
        networkId,
        threadId,
        timestamp: new Date(),
        metadata: {
          checkpointEnabled: !!this.checkpointAdapter,
          streamMode: input.streamMode || 'values',
        },
      });
    }

    // Get the original stream from network manager
    const originalStream = this.networkManager.streamWorkflow(networkId, input);

    try {
      let stepCount = 0;
      for await (const update of originalStream) {
        stepCount++;

        // Save periodic checkpoints during streaming
        if (this.checkpointAdapter && stepCount % 5 === 0) {
          try {
            await this.saveWorkflowCheckpoint(threadId, {
              networkId,
              executionId,
              phase: 'stream_update',
              step: stepCount,
              current: update.current,
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            this.logger.warn(
              `Failed to save streaming checkpoint at step ${stepCount}: ${error}`
            );
          }
        }

        // Stream progress events for each update
        if (this.streamingService && update) {
          await this.streamingService.emitEvent('agent_update', {
            executionId,
            networkId,
            threadId,
            current: update.current,
            timestamp: new Date(),
            metadata: {
              messageCount: update.messages?.length || 0,
              step: stepCount,
              checkpointSaved: this.checkpointAdapter && stepCount % 5 === 0,
            },
          });
        }

        yield update;
      }

      const executionTime = Date.now() - startTime;

      // Save final checkpoint
      if (this.checkpointAdapter) {
        try {
          await this.saveWorkflowCheckpoint(threadId, {
            networkId,
            executionId,
            phase: 'stream_complete',
            totalSteps: stepCount,
            executionTime,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          this.logger.warn(
            `Failed to save final streaming checkpoint: ${error}`
          );
        }
      }

      // Stream completion
      if (this.streamingService) {
        await this.streamingService.emitEvent('stream_complete', {
          executionId,
          networkId,
          threadId,
          timestamp: new Date(),
          metadata: {
            totalSteps: stepCount,
            executionTime,
            checkpointSaved: !!this.checkpointAdapter,
          },
        });
      }
    } catch (error) {
      // Stream error
      if (this.streamingService) {
        await this.streamingService.emitEvent('stream_error', {
          executionId,
          networkId,
          threadId,
          error: (error as Error).message,
          timestamp: new Date(),
          metadata: {
            checkpointEnabled: !!this.checkpointAdapter,
          },
        });
      }
      throw error;
    }

    // Return from the generator (this won't be reached in normal iteration)
    return {
      finalState: {} as AgentState,
      executionPath: [],
      executionTime: Date.now() - startTime,
      success: true,
    };
  }

  // ============================================================================
  // AUTOMAGICAL MEMORY SUPERPOWERS (Private Helper Methods)
  // ============================================================================

  // ============================================================================
  // AGENT COORDINATION INTELLIGENCE (Memory-Enhanced Methods)
  // ============================================================================

  /**
   * 🧠 AUTOMAGICAL: Store agent registration for performance tracking
   */
  private async storeAgentRegistration(agent: AgentDefinition): Promise<void> {
    if (!this.memoryAdapter) return;

    try {
      const registrationData = {
        agentId: agent.id,
        name: agent.name,
        capabilities: agent.capabilities || [],
        role: (agent.metadata?.role as string) || 'agent',
        metadata: agent.metadata,
        registeredAt: new Date().toISOString(),
        type: 'agent_registration',
      };

      await this.memoryAdapter.store(
        `agents.coordination.registry.${agent.id}`,
        JSON.stringify(registrationData),
        {
          type: 'agent_registration',
          source: 'multi_agent_coordinator',
          agentId: agent.id,
          importance: 0.7,
          persistent: true,
          tags: JSON.stringify([
            'agent',
            'registration',
            agent.id,
            'coordination',
          ]),
        }
      );
    } catch (error) {
      this.logger.warn(`Failed to store agent registration: ${error}`);
    }
  }

  /**
   * 🧠 AUTOMAGICAL: Enhance agents with compatibility patterns from memory
   */
  private async enhanceAgentsWithCompatibility(
    agents: AgentDefinition[],
    capability: string
  ): Promise<AgentDefinition[]> {
    if (!this.memoryAdapter) return agents;

    try {
      // Get agent compatibility patterns from memory
      const compatibilityMemories = await this.memoryAdapter.search({
        query: `capability ${capability} agent compatibility performance`,
        limit: 20,
        minRelevance: 0.6,
      });

      // Extract performance scores for each agent
      const agentPerformance = new Map<string, number>();
      const agentCompatibility = new Map<string, string[]>();

      for (const memory of compatibilityMemories) {
        try {
          const data = JSON.parse(memory.content);
          if (data.agentId && data.performanceScore) {
            agentPerformance.set(data.agentId, data.performanceScore);
          }
          if (data.agentId && data.compatibleAgents) {
            agentCompatibility.set(data.agentId, data.compatibleAgents);
          }
        } catch {
          // Skip invalid JSON
        }
      }

      // Sort agents by learned performance patterns
      const enhancedAgents = [...agents].sort((a, b) => {
        const scoreA = agentPerformance.get(a.id) || 0.5;
        const scoreB = agentPerformance.get(b.id) || 0.5;
        return scoreB - scoreA; // Higher performance first
      });

      // Add compatibility metadata
      enhancedAgents.forEach((agent) => {
        const compatibleAgents = agentCompatibility.get(agent.id) || [];
        agent.metadata = {
          ...agent.metadata,
          learnedPerformance: agentPerformance.get(agent.id) || 0.5,
          compatibleAgents,
          memoryEnhanced: true,
        };
      });

      return enhancedAgents;
    } catch (error) {
      this.logger.warn(`Failed to enhance agents with compatibility: ${error}`);
      return agents;
    }
  }

  /**
   * 🧠 AUTOMAGICAL: Get optimal coordination context from learned patterns
   */
  private async getOptimalCoordinationContext(
    networkId: string,
    input: any
  ): Promise<any> {
    if (!this.memoryAdapter) return {};

    try {
      const query = input.messages?.[0]?.content || input.messages?.[0] || '';

      // Phase 1: Get agent compatibility patterns
      const compatibilityMemories = await this.memoryAdapter.search({
        query: `network ${networkId} agent compatibility success`,
        limit: 10,
        minRelevance: 0.7,
      });

      // Phase 2: Get network optimization patterns
      const optimizationMemories = await this.memoryAdapter.search({
        query: `network optimization topology performance ${query}`,
        limit: 5,
        minRelevance: 0.6,
      });

      // Phase 3: Get performance patterns for similar tasks
      const performanceMemories = await this.memoryAdapter.search({
        query: `agent performance execution success ${query}`,
        limit: 15,
        minRelevance: 0.5,
      });

      return {
        agentCompatibility: this.extractCompatibilityPatterns(
          compatibilityMemories
        ),
        networkOptimizations:
          this.extractOptimizationPatterns(optimizationMemories),
        performancePatterns:
          this.extractPerformancePatterns(performanceMemories),
        contextGenerated: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.warn(`Failed to get coordination context: ${error}`);
      return {};
    }
  }

  /**
   * 🧠 AUTOMAGICAL: Store agent coordination event for learning
   */
  private async storeAgentCoordinationEvent(eventData: {
    networkId: string;
    executionId: string;
    threadId: string;
    input: any;
    result: any;
    coordinationContext: any;
    executionTime: number;
    timestamp: string;
  }): Promise<void> {
    if (!this.memoryAdapter) return;

    try {
      const {
        networkId,
        executionId,
        result,
        executionTime,
        coordinationContext,
      } = eventData;

      // Store overall coordination event
      const coordinationEvent = {
        networkId,
        executionId,
        success: result.success,
        executionTime,
        agentPath: result.executionPath || [],
        coordinationContext,
        inputType: typeof eventData.input.messages?.[0],
        outputQuality: result.success ? 0.8 : 0.3,
        timestamp: eventData.timestamp,
      };

      await this.memoryAdapter.store(
        `agents.coordination.events.${networkId}`,
        JSON.stringify(coordinationEvent),
        {
          type: 'coordination_event',
          source: 'multi_agent_coordinator',
          networkId,
          executionId,
          importance: result.success ? 0.8 : 0.9, // Failures are more important for learning
          persistent: false,
          tags: JSON.stringify([
            'coordination',
            'execution',
            networkId,
            result.success ? 'success' : 'failure',
          ]),
        }
      );

      // Store individual agent performance data
      if (result.executionPath && Array.isArray(result.executionPath)) {
        await this.storeAgentPerformanceData(result.executionPath, eventData);
      }
    } catch (error) {
      this.logger.warn(`Failed to store coordination event: ${error}`);
    }
  }

  /**
   * 🧠 AUTOMAGICAL: Store individual agent performance data
   */
  private async storeAgentPerformanceData(
    executionPath: string[],
    eventData: any
  ): Promise<void> {
    if (!this.memoryAdapter) return;

    try {
      for (let i = 0; i < executionPath.length; i++) {
        const agentId = executionPath[i];
        const isLastAgent = i === executionPath.length - 1;
        const wasSuccessful = eventData.result.success;

        const performanceData = {
          agentId,
          networkId: eventData.networkId,
          executionPosition: i,
          totalAgents: executionPath.length,
          wasLastAgent: isLastAgent,
          overallSuccess: wasSuccessful,
          executionTime: eventData.executionTime / executionPath.length, // Approximate per agent
          performanceScore: wasSuccessful ? (isLastAgent ? 0.9 : 0.7) : 0.3,
          timestamp: eventData.timestamp,
          context: {
            previousAgents: executionPath.slice(0, i),
            nextAgents: executionPath.slice(i + 1),
            coordinationContext: eventData.coordinationContext,
          },
        };

        await this.memoryAdapter.store(
          `agents.coordination.performance.${agentId}`,
          JSON.stringify(performanceData),
          {
            type: 'agent_performance',
            source: 'multi_agent_coordinator',
            agentId,
            networkId: eventData.networkId,
            importance: wasSuccessful ? 0.6 : 0.8,
            persistent: false,
            tags: JSON.stringify([
              'performance',
              'agent',
              agentId,
              eventData.networkId,
              wasSuccessful ? 'success' : 'failure',
            ]),
          }
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to store agent performance data: ${error}`);
    }
  }

  /**
   * 🧠 AUTOMAGICAL: Get optimal network configuration from learned patterns
   */
  private async getOptimalNetworkConfiguration(
    networkId: string,
    agents: AgentDefinition[],
    networkType: string
  ): Promise<any> {
    if (!this.memoryAdapter) return {};

    try {
      // Get network topology optimization patterns
      const topologyMemories = await this.memoryAdapter.search({
        query: `network ${networkType} topology optimization agent order`,
        limit: 10,
        minRelevance: 0.6,
      });

      // Get configuration optimization patterns
      const configMemories = await this.memoryAdapter.search({
        query: `network ${networkType} configuration performance success`,
        limit: 5,
        minRelevance: 0.7,
      });

      const optimizations: any = {};

      // Extract agent order optimization
      const agentOrderPatterns = this.extractAgentOrderPatterns(
        topologyMemories,
        agents
      );
      if (agentOrderPatterns.length > 0) {
        optimizations.agentOrder = agentOrderPatterns;
      }

      // Extract configuration optimizations
      const configOptimizations = this.extractConfigurationOptimizations(
        configMemories,
        networkType
      );
      if (Object.keys(configOptimizations).length > 0) {
        optimizations.configuration = configOptimizations;
      }

      // Network type specific optimizations
      switch (networkType) {
        case 'swarm':
          optimizations.dynamicHandoffs =
            this.shouldEnableDynamicHandoffs(topologyMemories);
          optimizations.cleanMessages =
            this.shouldCleanMessages(configMemories);
          optimizations.attribution = this.shouldAddAttribution(configMemories);
          optimizations.isolation = this.shouldEnableIsolation(configMemories);
          break;

        case 'hierarchical':
          optimizations.levels = this.getOptimalHierarchy(
            topologyMemories,
            agents
          );
          break;
      }

      return optimizations;
    } catch (error) {
      this.logger.warn(`Failed to get network optimizations: ${error}`);
      return {};
    }
  }

  /**
   * 🧠 AUTOMAGICAL: Store network creation event for learning
   */
  private async storeNetworkCreationEvent(eventData: {
    networkId: string;
    type: string;
    agents: AgentDefinition[];
    optimizations: any;
    timestamp: string;
  }): Promise<void> {
    if (!this.memoryAdapter) return;

    try {
      const networkEvent = {
        networkId: eventData.networkId,
        type: eventData.type,
        agentCount: eventData.agents.length,
        agentIds: eventData.agents.map((a) => a.id),
        agentCapabilities: eventData.agents.flatMap(
          (a) => a.capabilities || []
        ),
        optimizations: eventData.optimizations,
        timestamp: eventData.timestamp,
      };

      await this.memoryAdapter.store(
        `agents.coordination.network.${eventData.networkId}`,
        JSON.stringify(networkEvent),
        {
          type: 'network_creation',
          source: 'multi_agent_coordinator',
          networkId: eventData.networkId,
          networkType: eventData.type,
          importance: 0.7,
          persistent: true,
          tags: JSON.stringify([
            'network',
            'creation',
            eventData.type,
            eventData.networkId,
          ]),
        }
      );
    } catch (error) {
      this.logger.warn(`Failed to store network creation event: ${error}`);
    }
  }

  // ============================================================================
  // MEMORY PATTERN EXTRACTION HELPERS
  // ============================================================================

  /**
   * Extract compatibility patterns from memory
   */
  private extractCompatibilityPatterns(memories: any[]): any[] {
    const patterns: any[] = [];

    for (const memory of memories) {
      try {
        const data = JSON.parse(memory.content);
        if (data.agentCompatibility) {
          patterns.push(data.agentCompatibility);
        }
      } catch {
        // Skip invalid JSON
      }
    }

    return patterns;
  }

  /**
   * Extract optimization patterns from memory
   */
  private extractOptimizationPatterns(memories: any[]): any[] {
    const patterns: any[] = [];

    for (const memory of memories) {
      try {
        const data = JSON.parse(memory.content);
        if (data.optimization) {
          patterns.push(data.optimization);
        }
      } catch {
        // Skip invalid JSON
      }
    }

    return patterns;
  }

  /**
   * Extract performance patterns from memory
   */
  private extractPerformancePatterns(memories: any[]): any[] {
    const patterns: any[] = [];

    for (const memory of memories) {
      try {
        const data = JSON.parse(memory.content);
        if (data.performanceScore !== undefined) {
          patterns.push({
            agentId: data.agentId,
            score: data.performanceScore,
            context: data.context,
          });
        }
      } catch {
        // Skip invalid JSON
      }
    }

    return patterns;
  }

  /**
   * Extract agent order patterns from topology memories
   */
  private extractAgentOrderPatterns(
    memories: any[],
    agents: AgentDefinition[]
  ): string[] {
    const agentIds = agents.map((a) => a.id);
    const orderPatterns: { [key: string]: number } = {};

    for (const memory of memories) {
      try {
        const data = JSON.parse(memory.content);
        if (data.agentOrder && Array.isArray(data.agentOrder)) {
          const relevantOrder = data.agentOrder.filter((id: string) =>
            agentIds.includes(id)
          );
          const orderKey = relevantOrder.join(',');
          orderPatterns[orderKey] = (orderPatterns[orderKey] || 0) + 1;
        }
      } catch {
        // Skip invalid JSON
      }
    }

    // Return the most common order pattern, or original order if no patterns found
    const bestPattern = Object.keys(orderPatterns).reduce(
      (a, b) => (orderPatterns[a] > orderPatterns[b] ? a : b),
      ''
    );

    return bestPattern ? bestPattern.split(',') : agentIds;
  }

  /**
   * Extract configuration optimizations from memories
   */
  private extractConfigurationOptimizations(
    memories: any[],
    networkType: string
  ): any {
    const optimizations: any = {};

    for (const memory of memories) {
      try {
        const data = JSON.parse(memory.content);
        if (data.networkType === networkType && data.configuration) {
          Object.assign(optimizations, data.configuration);
        }
      } catch {
        // Skip invalid JSON
      }
    }

    return optimizations;
  }

  /**
   * Determine if dynamic handoffs should be enabled based on learned patterns
   */
  private shouldEnableDynamicHandoffs(memories: any[]): boolean {
    let successCount = 0;
    let totalCount = 0;

    for (const memory of memories) {
      try {
        const data = JSON.parse(memory.content);
        if (data.dynamicHandoffs !== undefined) {
          totalCount++;
          if (data.success && data.dynamicHandoffs) {
            successCount++;
          }
        }
      } catch {
        // Skip invalid JSON
      }
    }

    return totalCount > 0 ? successCount / totalCount > 0.6 : true; // Default to true
  }

  /**
   * Determine if message cleaning should be enabled
   */
  private shouldCleanMessages(memories: any[]): boolean {
    let successCount = 0;
    let totalCount = 0;

    for (const memory of memories) {
      try {
        const data = JSON.parse(memory.content);
        if (data.cleanMessages !== undefined) {
          totalCount++;
          if (data.success && data.cleanMessages) {
            successCount++;
          }
        }
      } catch {
        // Skip invalid JSON
      }
    }

    return totalCount > 0 ? successCount / totalCount > 0.5 : true; // Default to true
  }

  /**
   * Determine if agent attribution should be added
   */
  private shouldAddAttribution(memories: any[]): boolean {
    let successCount = 0;
    let totalCount = 0;

    for (const memory of memories) {
      try {
        const data = JSON.parse(memory.content);
        if (data.attribution !== undefined) {
          totalCount++;
          if (data.success && data.attribution) {
            successCount++;
          }
        }
      } catch {
        // Skip invalid JSON
      }
    }

    return totalCount > 0 ? successCount / totalCount > 0.7 : true; // Default to true
  }

  /**
   * Determine if context isolation should be enabled
   */
  private shouldEnableIsolation(memories: any[]): boolean {
    let successCount = 0;
    let totalCount = 0;

    for (const memory of memories) {
      try {
        const data = JSON.parse(memory.content);
        if (data.isolation !== undefined) {
          totalCount++;
          if (data.success && data.isolation) {
            successCount++;
          }
        }
      } catch {
        // Skip invalid JSON
      }
    }

    return totalCount > 0 ? successCount / totalCount > 0.6 : false; // Default to false
  }

  /**
   * Get optimal hierarchy levels based on learned patterns
   */
  private getOptimalHierarchy(
    memories: any[],
    agents: AgentDefinition[]
  ): string[][] {
    const agentIds = agents.map((a) => a.id);

    for (const memory of memories) {
      try {
        const data = JSON.parse(memory.content);
        if (data.levels && Array.isArray(data.levels) && data.success) {
          // Filter levels to only include agents we have
          const relevantLevels = data.levels
            .map((level: string[]) =>
              level.filter((id) => agentIds.includes(id))
            )
            .filter((level: string[]) => level.length > 0);

          if (relevantLevels.length > 0) {
            return relevantLevels;
          }
        }
      } catch {
        // Skip invalid JSON
      }
    }

    // Default: single level with all agents
    return [agentIds];
  }

  /**
   * 🧠 AUTOMAGICAL: Enhance input with memory context
   * Retrieves relevant memories and injects them into the agent state
   */
  private async enhanceInputWithMemoryContext(
    input: {
      messages: string[] | HumanMessage[];
      config?: RunnableConfig;
      streamMode?: 'values' | 'updates' | 'messages';
    },
    threadId: string,
    networkId: string
  ): Promise<typeof input> {
    if (!this.memoryAdapter) {
      return input;
    }

    try {
      // Create a mock agent state for memory context retrieval
      const mockState: AgentState = {
        messages: input.messages.map((msg) =>
          typeof msg === 'string' ? new HumanMessage(msg) : msg
        ),
        threadId,
        userId: (input.config?.metadata?.userId as string) || 'unknown',
        current: networkId,
        metadata: {
          ...input.config?.metadata,
          networkId,
        },
      };

      // Get memory context using the memory adapter
      const memoryContext = await this.memoryAdapter.getAgentContext(mockState);

      // Enhance the config metadata with memory context
      const enhancedConfig: RunnableConfig = {
        ...input.config,
        metadata: {
          ...input.config?.metadata,
          // 🧠 MEMORY SUPERPOWERS: Auto-injected memory context
          memoryContext: {
            threadMemories: memoryContext.threadMemories,
            userMemories: memoryContext.userMemories,
            agentMemories: memoryContext.agentMemories,
            userPatterns: memoryContext.userPatterns,
            relevanceScore: memoryContext.relevanceScore,
            contextWindow: memoryContext.contextWindow,
          },
          memoryEnabled: true,
          memoryContextSize:
            memoryContext.threadMemories.length +
            memoryContext.userMemories.length +
            memoryContext.agentMemories.length,
        },
      };

      return {
        ...input,
        config: enhancedConfig,
      };
    } catch (error) {
      this.logger.warn(
        `Memory context enhancement failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return input; // Return original input if enhancement fails
    }
  }

  /**
   * 🧠 AUTOMAGICAL: Store conversation turn in memory
   * Automatically captures and stores conversation for future context
   */
  private async storeConversationInMemory(
    input: {
      messages: string[] | HumanMessage[];
      config?: RunnableConfig;
    },
    result: MultiAgentResult,
    threadId: string,
    executionId: string,
    networkId: string
  ): Promise<void> {
    if (!this.memoryAdapter || !result.finalState?.messages) {
      return;
    }

    try {
      // Extract human message (input)
      const humanMessage = input.messages[input.messages.length - 1];
      const humanContent =
        typeof humanMessage === 'string' ? humanMessage : humanMessage.content;

      // Extract AI response (output)
      const aiMessages = result.finalState.messages.filter(
        (msg) => msg._getType() === 'ai'
      );
      const aiContent =
        aiMessages.length > 0
          ? aiMessages[aiMessages.length - 1].content
          : 'No response generated';

      // Store conversation turn using the memory adapter
      await this.memoryAdapter.storeConversationTurn(
        threadId,
        String(humanContent),
        String(aiContent),
        {
          // Rich metadata for memory superpowers
          executionId,
          networkId,
          agentPath: result.executionPath,
          executionTime: result.executionTime,
          success: result.success,
          timestamp: new Date().toISOString(),
          type: 'multi_agent_conversation',
          importance: result.success ? 0.8 : 0.5, // Higher importance for successful executions
          userId: (input.config?.metadata?.userId as string) || 'unknown',

          // Agent execution context
          agentCount: this.getNetworkConfig(networkId)?.agents?.length || 0,
          checkpointEnabled: !!this.checkpointAdapter,
          streamingEnabled: !!this.streamingService,
        }
      );

      this.logger.debug(
        `🧠 Stored conversation turn in memory: ${executionId} (${String(
          humanContent
        ).slice(0, 50)}...)`
      );
    } catch (error) {
      this.logger.warn(
        `Failed to store conversation in memory: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      // Don't throw - memory failures shouldn't break workflow execution
    }
  }
}
