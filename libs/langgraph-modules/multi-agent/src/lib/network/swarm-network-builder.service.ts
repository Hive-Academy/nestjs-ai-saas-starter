import { Injectable, Logger } from '@nestjs/common';
import { StateGraph, CompiledStateGraph, END } from '@langchain/langgraph';
import { SwarmState, addActiveAgentRouter } from '@langchain/langgraph-swarm';
import {
  AgentDefinition,
  AgentState,
  SwarmConfig,
  NetworkConfigurationError,
} from '../interfaces/multi-agent.interface';
import { NodeFactoryService } from './node-factory.service';
import { HandoffToolBuilderService } from '../tools/handoff-tool-builder.service';

/**
 * Extended SwarmConfig with initial agent and max rounds
 */
export interface ExtendedSwarmConfig extends SwarmConfig {
  /**
   * Initial agent to start the swarm (defaults to first agent)
   */
  initialAgent?: string;

  /**
   * Maximum handoff rounds to prevent infinite loops
   */
  maxRounds?: number;

  /**
   * Enable peer-to-peer communication (for backward compatibility)
   */
  enablePeerCommunication?: boolean;
}

/**
 * Service for building swarm pattern multi-agent networks
 *
 * Implements LangGraph's swarm pattern where agents collaborate peer-to-peer
 * without a central supervisor, using handoff tools for coordination.
 *
 * @see https://github.com/langchain-ai/langgraph-swarm-py
 *
 * Key Differences from Supervisor Pattern:
 * - No central supervisor node
 * - Agents use handoff tools to transfer control to peers
 * - Active agent tracking via __router__ node
 * - Decentralized decision-making
 */
@Injectable()
export class SwarmNetworkBuilderService {
  private readonly logger = new Logger(SwarmNetworkBuilderService.name);

  constructor(
    private readonly nodeFactory: NodeFactoryService,
    private readonly handoffToolBuilder: HandoffToolBuilderService
  ) {}

  /**
   * Build a swarm network graph with peer-to-peer agent collaboration
   *
   * Following LangGraph's official swarm pattern:
   * 1. Generate handoff tools for each agent
   * 2. Create swarm nodes with handoff detection
   * 3. Add router node to track active agent
   * 4. Connect agents through conditional routing
   *
   * @param networkId - Unique network identifier
   * @param agents - Agent definitions in the swarm
   * @param config - Swarm configuration
   * @param compilationOptions - Graph compilation options
   * @returns Compiled LangGraph StateGraph
   *
   * @example
   * ```typescript
   * const graph = await swarmBuilder.buildSwarmNetwork(
   *   'research-swarm',
   *   [webSearchAgent, analysisAgent, synthesisAgent],
   *   {
   *     enableDynamicHandoffs: true,
   *     initialAgent: 'web-search',
   *     maxRounds: 5,
   *     messageHistory: {
   *       removeHandoffMessages: true,
   *       addAgentAttribution: true,
   *     },
   *     contextIsolation: {
   *       enabled: false,
   *     },
   *   }
   * );
   * ```
   */
  async buildSwarmNetwork(
    networkId: string,
    agents: AgentDefinition[],
    config: ExtendedSwarmConfig,
    compilationOptions?: {
      checkpointer?: unknown;
      debug?: boolean;
      enableInterrupts?: boolean;
    }
  ): Promise<CompiledStateGraph<any, any>> {
    this.logger.log(`Building swarm network: ${networkId}`, {
      agentCount: agents.length,
      initialAgent: config.initialAgent || agents[0]?.id,
      maxRounds: config.maxRounds,
    });

    // Validation
    this.validateSwarmConfiguration(agents, config);

    // Step 1: Generate handoff tools for each agent
    const agentsWithHandoffs = this.generateHandoffToolsForAgents(
      agents,
      config
    );

    this.logger.debug('Generated handoff tools for all agents', {
      agents: agentsWithHandoffs.map((a) => ({
        id: a.id,
        handoffCount: a.handoffTools?.length || 0,
      })),
    });

    // Step 2: Create StateGraph with official SwarmState
    // Uses @langchain/langgraph-swarm's SwarmState which has activeAgent + messages
    const graph = new StateGraph(SwarmState);

    // Step 3: Use official addActiveAgentRouter instead of custom router
    // This adds the __active_agent_router__ node that tracks activeAgent state
    const initialAgent = config.initialAgent || agentsWithHandoffs[0].id;
    const routeToAgents = agentsWithHandoffs.map((a) => a.id);

    // Add official router using LangGraph swarm primitives
    addActiveAgentRouter(graph as any, {
      routeTo: routeToAgents,
      defaultActiveAgent: initialAgent,
    });

    // Step 4: Add agent nodes with handoff capabilities
    for (const agent of agentsWithHandoffs) {
      const swarmNode = await this.nodeFactory.createSwarmNode(
        agent,
        agentsWithHandoffs,
        config
      );
      (graph as any).addNode(agent.id, swarmNode);
    }

    // Step 5: Add edges for swarm routing
    this.addSwarmEdges(graph as any, agentsWithHandoffs, config);

    this.logger.log(`Swarm network built successfully: ${networkId}`);

    // Step 6: Compile and return
    return (graph as any).compile({
      checkpointer: compilationOptions?.checkpointer as any,
      debug: compilationOptions?.debug,
    });
  }

  /**
   * Generate handoff tools for all agents in the swarm
   *
   * Each agent receives tools to transfer control to peer agents
   */
  private generateHandoffToolsForAgents(
    agents: AgentDefinition[],
    config: SwarmConfig
  ): AgentDefinition[] {
    if (!config.enableDynamicHandoffs) {
      this.logger.debug('Dynamic handoffs disabled, skipping tool generation');
      return agents;
    }

    return agents.map((agent) => {
      // Generate handoff tools to all peer agents
      const handoffTools = this.handoffToolBuilder.generateSwarmHandoffTools(
        agent.id,
        agents,
        {
          includeDescriptions: true,
        }
      );

      return {
        ...agent,
        handoffTools,
      };
    });
  }

  /**
   * Create router node to track active agent and route to next agent
   *
   * The router checks state.metadata.active_agent to determine
   * which agent should execute next. This implements LangGraph's
   * swarm pattern where the system tracks the active agent.
   *
   * @param agents - All agents in the swarm
   * @param config - Swarm configuration
   * @returns Router node function
   *
   * NOTE: This method is kept for reference but not currently used.
   * We now use LangGraph's official addActiveAgentRouter() instead.
   */
  // @ts-expect-error - Reserved for potential custom router implementation
  private createActiveAgentRouter(
    agents: AgentDefinition[],
    config: ExtendedSwarmConfig
  ) {
    const initialAgent = config.initialAgent || agents[0].id;
    const maxRounds = config.maxRounds || 10;

    return async (state: AgentState): Promise<Partial<AgentState>> => {
      // Initialize active agent on first run
      if (!state.metadata?.active_agent) {
        this.logger.debug(`Router: Starting swarm with agent ${initialAgent}`);
        return {
          metadata: {
            ...state.metadata,
            active_agent: initialAgent,
            handoff_round: 1,
          },
          next: initialAgent,
        };
      }

      // Check round limit
      const currentRound = (state.metadata.handoff_round as number) || 1;
      if (currentRound > maxRounds) {
        this.logger.warn(
          `Router: Max rounds (${maxRounds}) exceeded, ending swarm`
        );
        return {
          metadata: {
            ...state.metadata,
            active_agent: undefined,
            maxRoundsExceeded: true,
          },
          next: END,
        };
      }

      // Route to active agent or end if none set
      const activeAgent = state.metadata.active_agent as string | undefined;
      if (!activeAgent) {
        this.logger.debug('Router: No active agent, ending swarm');
        return {
          next: END,
        };
      }

      this.logger.debug(`Router: Routing to active agent ${activeAgent}`, {
        round: currentRound,
      });

      return {
        metadata: {
          ...state.metadata,
          handoff_round: currentRound + 1,
        },
        next: activeAgent,
      };
    };
  }

  /**
   * Add edges for swarm pattern routing
   *
   * Official swarm pattern (using addActiveAgentRouter):
   * - Router is already added by addActiveAgentRouter()
   * - Router automatically routes based on activeAgent field in state
   * - Each agent returns to router after execution
   */
  private addSwarmEdges(
    graph: any,
    agents: AgentDefinition[],
    config: ExtendedSwarmConfig
  ): void {
    // NOTE: addActiveAgentRouter() already added:
    // - __start__ -> __active_agent_router__
    // - __active_agent_router__ -> [agents, __end__] (conditional)

    // We only need to add edges from agents back to router
    for (const agent of agents) {
      graph.addEdge(agent.id, '__active_agent_router__');
    }

    this.logger.debug('Swarm edges configured (using official router)', {
      agentCount: agents.length,
      routerNode: '__active_agent_router__',
      official: true,
    });
  }

  /**
   * Create state channels for swarm pattern with enhanced metadata
   *
   * NOTE: This method is kept for reference but not currently used.
   * We now use LangGraph's official SwarmState instead.
   */
  // @ts-expect-error - Reserved for potential custom state channel implementation
  private createSwarmStateChannels(config: SwarmConfig) {
    return {
      messages: {
        reducer: (current: any[], update: any[]) =>
          this.manageSwarmMessageHistory(
            current,
            update,
            config.messageHistory
          ),
        default: () => [],
      },
      next: {
        reducer: (current: string | undefined, update: string | undefined) =>
          update ?? current,
        default: () => undefined,
      },
      current: {
        reducer: (current: string | undefined, update: string | undefined) =>
          update ?? current,
        default: () => undefined,
      },
      scratchpad: {
        reducer: (current: string, update: string) => update ?? current,
        default: () => '',
      },
      task: {
        reducer: (current: string | undefined, update: string | undefined) =>
          update ?? current,
        default: () => undefined,
      },
      metadata: {
        reducer: (
          current: Record<string, unknown>,
          update: Record<string, unknown>
        ) => ({ ...current, ...update }),
        default: () => ({
          active_agent: undefined,
          handoff_round: 0,
        }),
      },
      threadId: {
        reducer: (current: string | undefined, update: string | undefined) =>
          update ?? current,
        default: () => undefined,
      },
      userId: {
        reducer: (current: string | undefined, update: string | undefined) =>
          update ?? current,
        default: () => undefined,
      },
    };
  }

  /**
   * Manage message history for swarm patterns
   *
   * Implements message filtering and attribution following swarm config
   */
  private manageSwarmMessageHistory(
    current: any[],
    update: any[],
    config: SwarmConfig['messageHistory']
  ): any[] {
    let messages = [...current, ...update];

    // Remove handoff messages if configured
    if (config.removeHandoffMessages) {
      messages = messages.filter(
        (msg: any) =>
          !msg.content?.toString().includes('transfer_to') &&
          !msg.content?.toString().includes('handoff')
      );
    }

    // Add agent attribution if configured
    if (config.addAgentAttribution) {
      messages = messages.map((msg: any) => ({
        ...msg,
        name: msg.name || 'agent',
      }));
    }

    // Limit message history if configured
    if (config.maxMessages && messages.length > config.maxMessages) {
      messages = messages.slice(-config.maxMessages);
    }

    return messages;
  }

  /**
   * Validate swarm configuration
   *
   * Ensures configuration is valid for swarm pattern
   */
  private validateSwarmConfiguration(
    agents: AgentDefinition[],
    config: ExtendedSwarmConfig
  ): void {
    if (agents.length < 2) {
      throw new NetworkConfigurationError(
        'Swarm pattern requires at least 2 agents'
      );
    }

    if (config.initialAgent) {
      const agentIds = agents.map((a) => a.id);
      if (!agentIds.includes(config.initialAgent)) {
        throw new NetworkConfigurationError(
          `Initial agent "${config.initialAgent}" not found in agent list`
        );
      }
    }

    if (config.maxRounds !== undefined && config.maxRounds < 1) {
      throw new NetworkConfigurationError(
        'maxRounds must be at least 1 if specified'
      );
    }

    this.logger.debug('Swarm configuration validated successfully');
  }
}
