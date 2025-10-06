import { Injectable, Logger } from '@nestjs/common';
import { StateGraph, CompiledStateGraph } from '@langchain/langgraph';
import {
  AgentDefinition,
  AgentState,
  SupervisorConfig,
  SwarmConfig,
  HierarchicalConfig,
  AgentNetwork,
  NetworkConfigurationError,
  MULTI_AGENT_CONSTANTS,
} from '../interfaces/multi-agent.interface';
// AgentRegistryService import removed as it's no longer used
import { NodeFactoryService } from './node-factory.service';

/**
 * Service for building and compiling LangGraph StateGraph instances
 * Focuses solely on graph construction and compilation
 */
@Injectable()
export class GraphBuilderService {
  private readonly logger = new Logger(GraphBuilderService.name);

  constructor(private readonly nodeFactory: NodeFactoryService) {}

  /**
   * Build supervisor pattern graph
   */
  async buildSupervisorGraph(
    agents: readonly AgentDefinition[],
    config: SupervisorConfig,
    compilationOptions?: AgentNetwork['compilationOptions']
  ): Promise<CompiledStateGraph<any, any>> {
    this.logger.debug(
      'Building supervisor graph with agents:',
      agents.map((a) => a.id)
    );

    // Validate workers exist in agent list
    const agentIds = agents.map((a) => a.id);
    const missingWorkers = config.workers.filter(
      (id) => !agentIds.includes(id)
    );
    if (missingWorkers.length > 0) {
      throw new NetworkConfigurationError(
        `Worker agents not found in agent list: ${missingWorkers.join(', ')}`
      );
    }

    const graph = new (StateGraph as any)({
      channels: this.createDefaultStateChannels(),
    });

    // Create and add supervisor node
    const supervisorNode = await this.nodeFactory.createSupervisorNode(
      agents,
      config
    );
    (graph as any).addNode('supervisor', supervisorNode);

    // Add worker nodes
    for (const agent of agents) {
      if (config.workers.includes(agent.id)) {
        const workerNode = await this.nodeFactory.createWorkerNode(
          agent,
          config
        );
        (graph as any).addNode(agent.id, workerNode);
      }
    }

    // Add edges
    this.addSupervisorEdges(graph as any, config.workers);

    // Compile and return
    return (graph as any).compile({
      checkpointer: compilationOptions?.checkpointer as any,
      debug: compilationOptions?.debug,
      interruptBefore: compilationOptions?.enableInterrupts
        ? [...config.workers]
        : undefined,
    });
  }

  /**
   * Build swarm pattern graph
   */
  async buildSwarmGraph(
    agents: readonly AgentDefinition[],
    config: SwarmConfig,
    compilationOptions?: AgentNetwork['compilationOptions']
  ): Promise<CompiledStateGraph<any, any>> {
    this.logger.debug(
      'Building swarm graph with agents:',
      agents.map((a) => a.id)
    );

    const graph = new (StateGraph as any)({
      channels: this.createSwarmStateChannels(config),
    });

    // Add all agent nodes with handoff capabilities
    for (const agent of agents) {
      const swarmNode = await this.nodeFactory.createSwarmNode(
        agent,
        agents,
        config
      );
      (graph as any).addNode(agent.id, swarmNode);
    }

    // Add edges for swarm pattern
    this.addSwarmEdges(graph as any, agents);

    return (graph as any).compile({
      checkpointer: compilationOptions?.checkpointer as any,
      debug: compilationOptions?.debug,
    });
  }

  /**
   * Build hierarchical pattern graph (simplified implementation)
   */
  async buildHierarchicalGraph(
    agents: readonly AgentDefinition[],
    config: HierarchicalConfig,
    compilationOptions?: AgentNetwork['compilationOptions']
  ): Promise<CompiledStateGraph<any, any>> {
    this.logger.debug(
      'Building hierarchical graph with levels:',
      config.levels
    );

    // Implement true multi-level hierarchical coordination
    if (config.levels.length === 1) {
      // Single level - use supervisor pattern
      const supervisorConfig: SupervisorConfig = {
        systemPrompt: `You are a hierarchical coordinator managing agents: ${config.levels[0].join(
          ', '
        )}.
Route tasks based on complexity and specialization.`,
        workers: config.levels[0],
      };
      return this.buildSupervisorGraph(
        agents,
        supervisorConfig,
        compilationOptions
      );
    }

    // Multi-level hierarchical implementation
    return this.buildMultiLevelHierarchy(agents, config, compilationOptions);
  }

  /**
   * Build true multi-level hierarchical graph with escalation
   */
  private async buildMultiLevelHierarchy(
    agents: readonly AgentDefinition[],
    config: HierarchicalConfig,
    compilationOptions?: AgentNetwork['compilationOptions']
  ): Promise<CompiledStateGraph<any, any>> {
    const graph = new (StateGraph as any)({
      channels: {
        ...this.createDefaultStateChannels(),
        currentLevel: {
          reducer: (current: number, update: number) => update,
          default: () => 0,
        },
        escalationReason: {
          reducer: (current: string, update: string) => update,
          default: () => '',
        },
      },
    });

    // Create supervisor nodes for each level
    for (let levelIndex = 0; levelIndex < config.levels.length; levelIndex++) {
      const levelAgents = config.levels[levelIndex];
      const supervisorConfig: SupervisorConfig = {
        systemPrompt: this.createHierarchicalPrompt(levelIndex, config.levels),
        workers: levelAgents,
      };

      const supervisorNode = await this.nodeFactory.createSupervisorNode(
        agents.filter((a) => levelAgents.includes(a.id)),
        supervisorConfig
      );

      graph.addNode(`level_${levelIndex}_supervisor`, supervisorNode);
    }

    // Add worker nodes
    for (const agent of agents) {
      graph.addNode(agent.id, agent.nodeFunction);
    }

    // Add escalation logic
    graph.addNode('escalation_router', this.createEscalationRouter(config));

    // Set entry point to top level
    graph.addEntrypoint(`level_0_supervisor`);

    // Add conditional escalation edges
    for (
      let levelIndex = 0;
      levelIndex < config.levels.length - 1;
      levelIndex++
    ) {
      graph.addConditionalEdges(
        `level_${levelIndex}_supervisor`,
        this.createEscalationCondition(config, levelIndex),
        {
          escalate: `level_${levelIndex + 1}_supervisor`,
          continue: 'escalation_router',
          finish: '__end__',
        }
      );
    }

    // Final level goes to completion
    const finalLevel = config.levels.length - 1;
    graph.addEdge(`level_${finalLevel}_supervisor`, '__end__');

    this.logger.log(`Built ${config.levels.length}-level hierarchical graph`);

    return (graph as any).compile({
      checkpointer: compilationOptions?.checkpointer as any,
      debug: compilationOptions?.debug,
    });
  }

  private createHierarchicalPrompt(
    levelIndex: number,
    levels: ReadonlyArray<readonly string[]>
  ): string {
    const levelName =
      levelIndex === 0
        ? 'executive'
        : levelIndex === levels.length - 1
        ? 'operational'
        : 'management';
    return `You are a ${levelName} level coordinator (Level ${levelIndex}).

Available agents at this level: ${levels[levelIndex].join(', ')}

Responsibilities:
${
  levelIndex === 0
    ? '- Strategic decisions and high-level coordination'
    : levelIndex === levels.length - 1
    ? '- Direct task execution and operational delivery'
    : '- Tactical coordination and resource management'
}

Escalation rules:
- Escalate up if task requires higher authority or broader scope
- Delegate down if task can be handled at operational level
- Handle directly if within your level's capabilities

Choose the appropriate agent or escalate based on task complexity and scope.`;
  }

  private createEscalationRouter(config: HierarchicalConfig) {
    return async (state: any) => {
      // Apply escalation rules if configured
      if (config.escalationRules) {
        for (const rule of config.escalationRules) {
          if (rule.condition(state)) {
            return {
              ...state,
              currentLevel: rule.targetLevel,
              escalationReason: rule.message || 'Escalated by rule',
            };
          }
        }
      }

      return state;
    };
  }

  private createEscalationCondition(
    config: HierarchicalConfig,
    currentLevel: number
  ) {
    return (state: any) => {
      // Check if escalation is needed
      if (state.escalationReason) {
        return 'escalate';
      }

      // Check for task completion
      if (state.next === '__end__' || !state.next) {
        return 'finish';
      }

      return 'continue';
    };
  }

  /**
   * Create default state channels for basic multi-agent workflows
   */
  private createDefaultStateChannels() {
    return {
      messages: {
        reducer: (current: any[], update: any[]) => [...current, ...update],
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
        default: () => ({}),
      },
    };
  }

  /**
   * Create state channels for swarm pattern with message history management
   */
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
        default: () => ({}),
      },
    };
  }

  /**
   * Add edges for supervisor pattern
   */
  private addSupervisorEdges(graph: any, workers: readonly string[]): void {
    // Entry point to supervisor
    graph.addEdge('__start__', 'supervisor');

    // Workers return to supervisor
    for (const workerId of workers) {
      graph.addEdge(workerId, 'supervisor');
    }

    // Supervisor conditional routing
    graph.addConditionalEdges(
      'supervisor',
      (state: AgentState) => state.next || MULTI_AGENT_CONSTANTS.END,
      [...workers, MULTI_AGENT_CONSTANTS.END]
    );
  }

  /**
   * Add edges for swarm pattern
   */
  private addSwarmEdges(graph: any, agents: readonly AgentDefinition[]): void {
    // Entry point to first agent
    graph.addEdge('__start__', agents[0].id);

    // Each agent can route to any other agent or end
    for (const agent of agents) {
      const possibleNext = agents
        .filter((a) => a.id !== agent.id)
        .map((a) => a.id)
        .concat([MULTI_AGENT_CONSTANTS.END]);

      graph.addConditionalEdges(
        agent.id,
        (state: AgentState) => state.next || MULTI_AGENT_CONSTANTS.END,
        possibleNext
      );
    }
  }

  /**
   * Manage message history for swarm patterns
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
   * Validate graph configuration before building
   */
  validateGraphConfiguration(
    agents: readonly AgentDefinition[],
    config: SupervisorConfig | SwarmConfig | HierarchicalConfig,
    type: 'supervisor' | 'swarm' | 'hierarchical'
  ): void {
    if (agents.length === 0) {
      throw new NetworkConfigurationError('At least one agent is required');
    }

    // Validate unique agent IDs
    const agentIds = agents.map((a) => a.id);
    const uniqueIds = new Set(agentIds);
    if (uniqueIds.size !== agentIds.length) {
      throw new NetworkConfigurationError('Agent IDs must be unique');
    }

    // Type-specific validation
    switch (type) {
      case 'supervisor':
        this.validateSupervisorConfig(agents, config as SupervisorConfig);
        break;
      case 'swarm':
        this.validateSwarmConfig(agents, config as SwarmConfig);
        break;
      case 'hierarchical':
        this.validateHierarchicalConfig(agents, config as HierarchicalConfig);
        break;
    }
  }

  /**
   * Validate supervisor configuration
   */
  private validateSupervisorConfig(
    agents: readonly AgentDefinition[],
    config: SupervisorConfig
  ): void {
    if (config.workers.length === 0) {
      throw new NetworkConfigurationError(
        'Supervisor must have at least one worker'
      );
    }

    const agentIds = agents.map((a) => a.id);
    const invalidWorkers = config.workers.filter(
      (id) => !agentIds.includes(id)
    );
    if (invalidWorkers.length > 0) {
      throw new NetworkConfigurationError(
        `Invalid worker agent IDs: ${invalidWorkers.join(', ')}`
      );
    }
  }

  /**
   * Validate swarm configuration
   */
  private validateSwarmConfig(
    agents: readonly AgentDefinition[],
    config: SwarmConfig
  ): void {
    if (agents.length < 2) {
      throw new NetworkConfigurationError('Swarm requires at least 2 agents');
    }

    // Validate handoff tools if dynamic handoffs enabled
    if (config.enableDynamicHandoffs) {
      for (const agent of agents) {
        if (agent.handoffTools) {
          const agentIds = agents.map((a) => a.id);
          const invalidTargets = agent.handoffTools
            .map((tool) => tool.targetAgent)
            .filter((target) => !agentIds.includes(target));

          if (invalidTargets.length > 0) {
            throw new NetworkConfigurationError(
              `Agent ${
                agent.id
              } has invalid handoff targets: ${invalidTargets.join(', ')}`
            );
          }
        }
      }
    }
  }

  /**
   * Validate hierarchical configuration
   */
  private validateHierarchicalConfig(
    agents: readonly AgentDefinition[],
    config: HierarchicalConfig
  ): void {
    if (config.levels.length === 0) {
      throw new NetworkConfigurationError(
        'Hierarchical configuration must have at least one level'
      );
    }

    const agentIds = agents.map((a) => a.id);
    const allLevelAgents = config.levels.flat();
    const invalidAgents = allLevelAgents.filter((id) => !agentIds.includes(id));

    if (invalidAgents.length > 0) {
      throw new NetworkConfigurationError(
        `Invalid agent IDs in hierarchy levels: ${invalidAgents.join(', ')}`
      );
    }
  }
}
