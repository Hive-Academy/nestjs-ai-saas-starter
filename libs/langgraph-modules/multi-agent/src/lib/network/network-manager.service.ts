import {
  ILangGraphCheckpointSaver,
  isLangGraphCheckpointSaver,
} from '@hive-academy/langgraph-checkpoint';
import {
  generateExecutionId,
  ICheckpointAdapter,
  NodeIdBuilder,
} from '@hive-academy/langgraph-core';
import { HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { CompiledStateGraph } from '@langchain/langgraph';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AgentRegistryService } from '../agent/agent-registry.service';
import { MULTI_AGENT_MODULE_OPTIONS } from '../constants/multi-agent.constants';
import { getAgentConfig } from '../decorators/agent.decorator';
import type { MultiAgentModuleOptions } from '../interfaces/multi-agent.interface';
import {
  AgentNetwork,
  AgentNetworkSchema,
  AgentNotFoundError,
  AgentState,
  MultiAgentResult,
  NetworkConfigurationError,
  SupervisorConfig,
  SwarmConfig,
  HierarchicalConfig,
} from '../interfaces/multi-agent.interface';
import { GraphBuilderService } from './graph-builder.service';
import type { MultiAgentGraph, WorkflowResult } from '../types/internal-types';

/**
 * Type guards for network configurations
 */
function isSupervisorConfig(config: unknown): config is SupervisorConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'workers' in config &&
    Array.isArray((config as SupervisorConfig).workers)
  );
}

function isSwarmConfig(config: unknown): config is SwarmConfig {
  return typeof config === 'object' && config !== null;
}

function isHierarchicalConfig(config: unknown): config is HierarchicalConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'levels' in config &&
    Array.isArray((config as HierarchicalConfig).levels)
  );
}

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
    private readonly eventEmitter: EventEmitter2,
    @Optional()
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter?: ICheckpointAdapter,
    @Inject(MULTI_AGENT_MODULE_OPTIONS)
    private readonly options?: MultiAgentModuleOptions
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

      // Validate graph configuration (skip for network type as it has different structure)
      if (networkConfig.type !== 'network') {
        this.graphBuilder.validateGraphConfiguration(
          networkConfig.agents,
          networkConfig.config,
          networkConfig.type
        );
      }

      // BUGFIX (TASK_2025_032): Re-enabled checkpointer after removing manual checkpoint interference
      // Prepare compilation options with checkpointer if enabled
      const compilationOptions = await this.prepareCompilationOptions(
        networkConfig.compilationOptions,
        networkConfig.id
      );

      // Build the appropriate graph type
      let graph: CompiledStateGraph<any, any>;

      switch (networkConfig.type) {
        case 'supervisor':
          if (!isSupervisorConfig(networkConfig.config)) {
            throw new NetworkConfigurationError(
              'Invalid supervisor configuration'
            );
          }
          graph = await this.graphBuilder.buildSupervisorGraph(
            networkConfig.agents,
            networkConfig.config,
            compilationOptions
          );
          break;

        case 'swarm':
          if (!isSwarmConfig(networkConfig.config)) {
            throw new NetworkConfigurationError('Invalid swarm configuration');
          }
          graph = await this.graphBuilder.buildSwarmGraph(
            networkConfig.agents,
            networkConfig.config,
            compilationOptions
          );
          break;

        case 'hierarchical':
          if (!isHierarchicalConfig(networkConfig.config)) {
            throw new NetworkConfigurationError(
              'Invalid hierarchical configuration'
            );
          }
          graph = await this.graphBuilder.buildHierarchicalGraph(
            networkConfig.agents,
            networkConfig.config,
            compilationOptions
          );
          break;

        default:
          throw new NetworkConfigurationError(
            `Unsupported network type: ${networkConfig.type}`
          );
      }

      // 🔍 DIAGNOSTIC LOGGING: Verify graph was compiled with channels
      const graphAny = graph as any;
      this.logger.debug(
        `[DIAGNOSTIC] Graph compiled successfully for ${networkConfig.id}:`,
        {
          graphType: typeof graph,
          hasChannels: !!graphAny.channels,
          channelKeys: graphAny.channels
            ? Object.keys(graphAny.channels)
            : 'UNDEFINED',
          channelCount: graphAny.channels
            ? Object.keys(graphAny.channels).length
            : 0,
          graphConstructorName: graph?.constructor?.name || 'UNKNOWN',
          // 🔍 NEW: Check for __input__ specifically
          hasInputChannel:
            graphAny.channels && '__input__' in graphAny.channels,
          // 🔍 NEW: Check other internal graph properties
          hasBuilder: !!graphAny.builder,
          hasNodes: !!graphAny.nodes,
          nodeKeys: graphAny.nodes ? Object.keys(graphAny.nodes) : 'UNDEFINED',
          // 🔍 NEW: Check if state schema/spec is present
          hasStateSchema: !!graphAny.stateSchema,
          hasSpec: !!graphAny.spec,
        }
      );

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
        `Failed to create network: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        error
      );
    }
  }

  /**
   * Generate canonical thread ID using NODE_ID_STANDARD pattern
   * Pattern: multi-agent|execution:<networkId>:<timestamp>
   *
   * @param networkId - The network identifier
   * @param timestamp - Execution start timestamp
   * @returns Canonical thread ID following NODE_ID_STANDARD
   */
  private generateThreadId(networkId: string, timestamp: number): string {
    return NodeIdBuilder.create()
      .domain('multi-agent')
      .phase('execution')
      .activity(networkId)
      .detail(timestamp.toString())
      .build();
  }

  /**
   * Determine initial agent for workflow execution
   *
   * @param networkConfig - Network configuration
   * @returns Initial agent ID (supervisor or first worker)
   */
  private getInitialAgent(networkConfig: AgentNetwork): string {
    if (networkConfig.type === 'supervisor' && networkConfig.config) {
      return 'supervisor';
    }
    // For other network types, return first agent or default
    return networkConfig.agents[0]?.id || 'coordinator';
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
      const messages = input.messages.map((msg) =>
        typeof msg === 'string' ? new HumanMessage(msg) : msg
      );

      const executionId = generateExecutionId();
      const threadId = this.generateThreadId(networkId, startTime);
      const currentAgent = this.getInitialAgent(networkConfig);

      const initialState: Partial<AgentState> = {
        messages,
        threadId, // ✅ FIXED: Canonical thread ID for memory operations
        current: currentAgent, // ✅ FIXED: Initial agent for memory context
        metadata: {
          networkId,
          networkType: networkConfig.type,
          startTime,
          executionId,
        },
      };

      this.logger.debug(`Executing workflow on network ${networkId}`, {
        type: networkConfig.type,
        messageCount: messages.length,
        threadId,
        currentAgent,
        executionId,
      });

      this.eventEmitter.emit('workflow.started', {
        networkId,
        executionId: initialState.metadata?.executionId,
        messageCount: messages.length,
        timestamp: new Date().toISOString(),
      });

      // 🔍 DIAGNOSTIC LOGGING: Graph state before execution
      this.logger.debug(`[DIAGNOSTIC] Graph details before invoke:`, {
        networkId,
        graphType: typeof graph,
        hasChannels: !!(graph as any).channels,
        channelKeys: (graph as any).channels
          ? Object.keys((graph as any).channels)
          : 'UNDEFINED',
        graphCompiled: !!(graph as any).compiled,
      });

      // 🔍 DIAGNOSTIC LOGGING: Initial state structure
      this.logger.debug(`[DIAGNOSTIC] Initial state being passed to invoke:`, {
        stateKeys: Object.keys(initialState),
        messagesCount: initialState.messages?.length,
        hasThreadId: !!initialState.threadId,
        hasCurrent: !!initialState.current,
        hasMetadata: !!initialState.metadata,
        metadataKeys: initialState.metadata
          ? Object.keys(initialState.metadata)
          : 'NONE',
      });

      // 🔍 DIAGNOSTIC LOGGING: Config being passed
      const invokeConfig = {
        ...input.config,
        configurable: {
          ...input.config?.configurable,
          networkId,
          networkType: networkConfig.type,
        },
      };
      this.logger.debug(`[DIAGNOSTIC] Invoke config:`, {
        hasConfig: !!input.config,
        configKeys: input.config ? Object.keys(input.config) : 'NONE',
        configurableKeys: invokeConfig.configurable
          ? Object.keys(invokeConfig.configurable)
          : 'NONE',
        hasCheckpointer: !!this.checkpointAdapter,
      });

      // Execute the workflow
      this.logger.debug(`[DIAGNOSTIC] Calling graph.invoke()...`);
      const typedGraph = graph as MultiAgentGraph;
      const result: any = await typedGraph.invoke(
        initialState as any,
        invokeConfig
      );
      this.logger.debug(`[DIAGNOSTIC] graph.invoke() completed successfully`);

      const executionTime = Date.now() - startTime;
      const executionPath = this.extractExecutionPath(result as AgentState);

      this.eventEmitter.emit('workflow.completed', {
        networkId,
        executionId: initialState.metadata?.executionId,
        executionTime,
        executionPath,
        success: true,
        messageCount: result.messages?.length || 0,
        timestamp: new Date().toISOString(),
      });

      const resultState = result as Partial<AgentState>;
      const workflowResult = {
        finalState: resultState,
        executionTime,
        tokenUsage: this.extractTokenUsage(resultState),
      } as WorkflowResult;

      return {
        ...workflowResult,
        executionPath,
        success: true,
      };
    } catch (error) {
      // 🔍 DIAGNOSTIC LOGGING: Capture error details
      this.logger.error(`[DIAGNOSTIC] graph.invoke() FAILED with error:`, {
        errorName:
          error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'NO STACK',
      });
      const executionTime = Date.now() - startTime;

      this.logger.error(
        `Workflow execution failed for network ${networkId}:`,
        error
      );

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
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
          },
        },
        executionPath: [],
        executionTime,
        success: false,
        error:
          error instanceof Error ? error : new Error('Unknown execution error'),
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
    const messages = input.messages.map((msg) =>
      typeof msg === 'string' ? new HumanMessage(msg) : msg
    );

    const executionId = generateExecutionId();
    const threadId = this.generateThreadId(networkId, startTime);
    const currentAgent = this.getInitialAgent(networkConfig);

    const initialState: Partial<AgentState> = {
      messages,
      threadId, // ✅ FIXED: Canonical thread ID for memory operations
      current: currentAgent, // ✅ FIXED: Initial agent for memory context
      metadata: {
        networkId,
        networkType: networkConfig.type,
        startTime,
        executionId,
      },
    };

    this.logger.debug(`Executing workflow on network ${networkId}`, {
      type: networkConfig.type,
      messageCount: messages.length,
      threadId,
      currentAgent,
      executionId,
    });

    try {
      // 🆕 PHASE 2: Read streaming configuration from agent metadata
      const streamOptions: any = {
        ...input.config,
        streamMode: input.streamMode || 'values',
        configurable: {
          ...input.config?.configurable,
          networkId,
          networkType: networkConfig.type,
        },
      };

      // Aggregate streaming config from worker agents
      const agentMetadataList = networkConfig.agents
        .map((agent) => ({
          agent,
          metadata: agent.metadata?.agentClass
            ? getAgentConfig(agent.metadata.agentClass)
            : undefined,
        }))
        .filter((item) => item.metadata !== undefined);

      if (agentMetadataList.length > 0) {
        // Check if any worker has multi-agent streaming enabled
        const streamingConfigs = agentMetadataList
          .map((item) => item.metadata?.workflow?.multiAgentStreaming)
          .filter((cfg) => cfg?.enabled);

        if (streamingConfigs.length > 0) {
          // Get the first enabled streaming config (or aggregate if multiple)
          const primaryStreamingConfig = streamingConfigs[0];

          // Apply subgraphs configuration (default to true if not specified)
          if (primaryStreamingConfig?.captureSubgraphs !== false) {
            streamOptions.subgraphs = true;
            this.logger.debug(
              `Applied subgraphs: true from agent metadata for network ${networkId}`
            );
          }

          // Apply stream mode from metadata if not specified in input
          if (!input.streamMode && primaryStreamingConfig?.streamMode) {
            streamOptions.streamMode = primaryStreamingConfig.streamMode;
            this.logger.debug(
              `Applied streamMode: ${primaryStreamingConfig.streamMode} from agent metadata`
            );
          }
        }
      }

      this.eventEmitter.emit('workflow.stream.started', {
        networkId,
        executionId: initialState.metadata?.executionId,
        streamMode: streamOptions.streamMode,
        subgraphs: streamOptions.subgraphs,
        timestamp: new Date().toISOString(),
      });

      // Stream the workflow execution with enhanced streaming options
      let finalResult: AgentState | undefined;
      const executionPath: string[] = [];

      const typedGraph = graph as any;
      for await (const chunk of typedGraph.stream(
        initialState as any,
        streamOptions
      ) as AsyncIterable<any>) {
        // Track execution path
        const chunkState = chunk as any;
        if (chunkState.current) {
          executionPath.push(chunkState.current);
        }

        finalResult = chunkState as AgentState;

        // 🚀 STREAMING INTEGRATION: Emit events via EventEmitter2
        // This ensures streaming events reach WebSocketBridge → Frontend
        // Note: We use EventEmitter2 directly to avoid circular dependency with workflow-engine
        const executionId = initialState.metadata?.executionId || 'unknown';

        this.eventEmitter.emit(`workflow.stream.${executionId}`, {
          type: 'agent_update',
          executionId,
          data: chunkState,
          timestamp: new Date(),
          metadata: {
            networkId,
            agentId: chunkState.current,
            streamMode: streamOptions.streamMode,
          },
        });

        yield chunkState;
      }

      const executionTime = Date.now() - startTime;

      this.eventEmitter.emit('workflow.stream.completed', {
        networkId,
        executionId: initialState.metadata?.executionId,
        executionTime,
        executionPath,
        timestamp: new Date().toISOString(),
      });

      const resultState = (finalResult || initialState) as AgentState;
      const workflowResult = {
        finalState: resultState,
        executionTime,
        tokenUsage: this.extractTokenUsage(resultState),
      } as WorkflowResult;

      return {
        ...workflowResult,
        executionPath,
        success: true,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error(
        `Streaming workflow failed for network ${networkId}:`,
        error
      );

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
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
          },
        },
        executionPath: [],
        executionTime,
        success: false,
        error:
          error instanceof Error ? error : new Error('Unknown streaming error'),
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
    return Array.from(this.networkConfigs.values()).map((config) => ({
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
  getNetworkStats(networkId: string):
    | {
        agentCount: number;
        type: string;
        created: boolean;
        agents: string[];
      }
    | undefined {
    const config = this.networkConfigs.get(networkId);
    if (!config) {
      return undefined;
    }

    return {
      agentCount: config.agents.length,
      type: config.type,
      created: this.networks.has(networkId),
      agents: config.agents.map((a) => a.id),
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
  private extractTokenUsage(
    result?: Partial<AgentState>
  ): MultiAgentResult['tokenUsage'] {
    if (!result?.metadata?.tokenUsage) {
      return undefined;
    }

    return result.metadata.tokenUsage as MultiAgentResult['tokenUsage'];
  }

  /**
   * Create checkpointer for network if checkpoint configuration is enabled
   *
   * Verification trail:
   * - Pattern source: time-travel/workflow-replay.service.ts:37-38 (token injection)
   * - Interface: checkpoint-adapter.interface.ts:56-105
   * - Token provider: checkpoint.module.ts:94 (global export)
   * - Evidence: 19 services use ICheckpointAdapter token successfully
   */
  private async createCheckpointerForNetwork(
    networkId: string
  ): Promise<ILangGraphCheckpointSaver | null> {
    // Graceful degradation when checkpoint adapter not available
    if (!this.checkpointAdapter) {
      this.logger.debug(
        'CheckpointAdapter not available - checkpointing disabled'
      );
      return null;
    }

    if (!this.isCheckpointingEnabled()) {
      this.logger.debug('Checkpointing disabled in configuration');
      return null;
    }

    try {
      // Check if checkpoint adapter is healthy
      const isHealthy = await this.checkpointAdapter.isHealthy();
      if (!isHealthy) {
        this.logger.warn(
          'Checkpoint adapter not healthy - using in-memory fallback'
        );
        return null;
      }

      // TASK_2025_029: Get the actual LangGraph saver, not the ICheckpointAdapter
      // LangGraph's compile() expects a BaseCheckpointSaver with put/get/list methods
      // Type-safe access to getLangGraphSaver() method
      const adapter = this.checkpointAdapter as ICheckpointAdapter & {
        getLangGraphSaver?: (
          saverName?: string
        ) => ILangGraphCheckpointSaver | null;
      };

      const langGraphSaver = adapter.getLangGraphSaver?.();

      if (!langGraphSaver) {
        this.logger.warn(
          `No LangGraph saver available - checkpointing disabled for network ${networkId}`
        );
        return null;
      }

      // Validate that the saver implements the required interface
      if (!isLangGraphCheckpointSaver(langGraphSaver)) {
        this.logger.error(
          `Invalid checkpoint saver - missing required methods (get, getTuple, list, put, putWrites, deleteThread)`
        );
        return null;
      }

      this.logger.debug(
        `LangGraph checkpointer configured for network ${networkId}`
      );

      return langGraphSaver;
    } catch (error) {
      this.logger.error(
        `Failed to configure checkpointer for network ${networkId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Prepare compilation options with checkpointer integration
   */
  private async prepareCompilationOptions(
    originalOptions: AgentNetwork['compilationOptions'],
    networkId: string
  ): Promise<AgentNetwork['compilationOptions']> {
    const options = { ...originalOptions };

    // Add checkpointer if not already specified and checkpointing is enabled
    if (!options.checkpointer && this.isCheckpointingEnabled()) {
      const checkpointer = await this.createCheckpointerForNetwork(networkId);
      if (checkpointer) {
        options.checkpointer = checkpointer;
        this.logger.debug(
          `Added checkpointer to network ${networkId} compilation options`
        );
      }
    }

    return options;
  }

  /**
   * Check if checkpointing is enabled in configuration
   */
  private isCheckpointingEnabled(): boolean {
    if (!this.options?.checkpointing) {
      return false;
    }

    return this.options.checkpointing.enabled !== false;
  }
}
