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
    const executionId = this.generateExecutionId(networkId);
    const threadId = this.generateThreadId(networkId);

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

    const result = await this.networkManager.executeWorkflow(networkId, {
      ...enhancedInput,
      config: checkpointConfig,
    });

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
