import { Injectable, Logger } from '@nestjs/common';
import {
  StateGraph,
  CompiledStateGraph,
  Annotation,
  START,
  END,
} from '@langchain/langgraph';
import {
  AgentDefinition,
  AgentState,
  SupervisorConfig,
  SwarmConfig,
  HierarchicalConfig,
  AgentNetwork,
  NetworkConfigurationError,
  MULTI_AGENT_CONSTANTS,
  NetworkConfig,
} from '../interfaces/multi-agent.interface';
import { AgentStateAnnotation } from '@hive-academy/langgraph-core';
// AgentRegistryService import removed as it's no longer used
import { NodeFactoryService } from './node-factory.service';
import { getAgentConfig } from '../decorators/agent.decorator';

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

    // Create state annotation using LangGraph 2025 Annotation.Root pattern
    // Verification trail:
    // - Pattern source: libs/langgraph-modules/core/src/lib/annotations/agent-state.annotation.ts
    // - LangGraph 2025 requires Annotation.Root() pattern, not { channels: {...} }
    // - AgentStateAnnotation provides all standard multi-agent fields with proper reducers
    // - Verified against: workflow-state.annotation.ts, LangChain docs
    const graph = new StateGraph(AgentStateAnnotation);

    // Create and add supervisor node
    const supervisorNode = await this.nodeFactory.createSupervisorNode(
      agents,
      config
    );
    graph.addNode('supervisor', supervisorNode);

    // Add worker nodes
    for (const agent of agents) {
      if (config.workers.includes(agent.id)) {
        const workerNode = await this.nodeFactory.createWorkerNode(
          agent,
          config
        );
        graph.addNode(agent.id, workerNode);
      }
    }

    // Add edges
    this.addSupervisorEdges(graph, config.workers);

    // 🆕 PHASE 2: Read interruption configuration from agent metadata
    let interruptBefore: string[] | undefined;
    let interruptAfter: string[] | undefined;

    // Aggregate interruption config from worker agents
    const agentMetadataList = agents
      .map((agent) => ({
        agent,
        metadata: agent.metadata?.agentClass
          ? getAgentConfig(agent.metadata.agentClass)
          : undefined,
      }))
      .filter((item) => item.metadata !== undefined);

    if (agentMetadataList.length > 0) {
      // Check if any worker has multi-agent interruption enabled
      const interruptionConfigs = agentMetadataList
        .map((item) => item.metadata?.workflow?.multiAgentInterruption)
        .filter((cfg) => cfg?.enabled);

      if (interruptionConfigs.length > 0) {
        // Aggregate interrupt before from all workers
        const allInterruptBefore = interruptionConfigs
          .filter((cfg) => cfg?.interruptBefore)
          .flatMap((cfg) => cfg!.interruptBefore!);

        const allInterruptAfter = interruptionConfigs
          .filter((cfg) => cfg?.interruptAfter)
          .flatMap((cfg) => cfg!.interruptAfter!);

        if (allInterruptBefore.length > 0) {
          interruptBefore = [...new Set(allInterruptBefore)]; // Remove duplicates
          this.logger.debug(
            `Applied interruptBefore from agent metadata: ${interruptBefore.join(
              ', '
            )}`
          );
        }

        if (allInterruptAfter.length > 0) {
          interruptAfter = [...new Set(allInterruptAfter)]; // Remove duplicates
          this.logger.debug(
            `Applied interruptAfter from agent metadata: ${interruptAfter.join(
              ', '
            )}`
          );
        }
      }
    } else if (compilationOptions?.enableInterrupts) {
      // 🔧 BACKWARD COMPATIBILITY: Use old boolean flag if no metadata present
      interruptBefore = [...config.workers];
      this.logger.debug(
        'Using legacy enableInterrupts flag for interruption configuration'
      );
    }

    // Compile and return
    // LangGraph API Note: 'debug' property removed from compile options
    // Type casting required: LangGraph's strict generic type N[] doesn't match runtime string[]
    // - checkpointer: unknown type from compilationOptions
    // - interruptBefore/interruptAfter: string[] from agent metadata, not in graph's type union N
    // TYPE CAST RATIONALE (supervisor pattern - 3 casts):
    // 1. checkpointer: BaseCheckpointSaver | undefined → LangGraph expects exact type signature
    //    Mitigation: Our ICheckpointAdapter provides runtime validation
    // 2. interruptBefore/After: string[] → LangGraph expects N[] where N is literal union of node names
    //    Problem: Node names are dynamic (worker IDs), cannot be statically typed as literals
    //    Mitigation: Runtime validation ensures all worker names exist in graph
    return graph.compile({
      checkpointer: compilationOptions?.checkpointer as any,
      ...(interruptBefore && { interruptBefore: interruptBefore as any }),
      ...(interruptAfter && { interruptAfter: interruptAfter as any }),
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

    // Create state annotation for swarm pattern (LangGraph 2025 API)
    // Swarm uses base AgentStateAnnotation (no additional channels needed)
    // Message history management is handled via reducer in createSwarmNode
    const graph = new StateGraph(AgentStateAnnotation);

    // Add all agent nodes with handoff capabilities
    for (const agent of agents) {
      const swarmNode = await this.nodeFactory.createSwarmNode(
        agent,
        agents,
        config
      );
      graph.addNode(agent.id, swarmNode);
    }

    // Add edges for swarm pattern
    this.addSwarmEdges(graph, agents);

    // TYPE CAST RATIONALE (sequential pattern - 1 cast):
    // checkpointer: Same type mismatch as supervisor pattern (see buildSupervisorGraph above)
    // LangGraph API Note: 'debug' property removed from compile options
    return graph.compile({
      checkpointer: compilationOptions?.checkpointer as any,
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
    // Create state annotation for hierarchical pattern (LangGraph 2025 API)
    // Extends AgentStateAnnotation with hierarchical-specific fields
    const HierarchicalStateAnnotation = Annotation.Root({
      ...AgentStateAnnotation.spec,
      currentLevel: Annotation<number>({
        reducer: (current: number, update: number) => update,
        default: () => 0,
      }),
      escalationReason: Annotation<string>({
        reducer: (current: string, update: string) => update,
        default: () => '',
      }),
    });

    const graph = new StateGraph(HierarchicalStateAnnotation);

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
    // Type assertion: Dynamic node names not in StateGraph's type union N
    // TYPE CAST RATIONALE (hierarchical pattern - 5 casts total):
    // Problem: LangGraph's addEdge<N>(from: N, to: N) expects N to be literal union of node names
    // Dynamic nodes: level_0_supervisor, level_1_supervisor, etc. (created at runtime)
    // TypeScript limitation: Template literal types `level_${number}_supervisor` not compatible with literal unions
    // Mitigation: All nodes registered dynamically above via graph.addNode() before edges created
    // Safety: Runtime error if node doesn't exist when edge is added
    graph.addEdge(START as any, 'level_0_supervisor' as any);

    // Add conditional escalation edges
    // Type assertions: Dynamic template literal node names require any casting
    // StateGraph's generic type N doesn't include runtime-generated node names
    for (
      let levelIndex = 0;
      levelIndex < config.levels.length - 1;
      levelIndex++
    ) {
      // TYPE CAST RATIONALE: Same as above (dynamic hierarchical node names)
      graph.addConditionalEdges(
        `level_${levelIndex}_supervisor` as any,
        this.createEscalationCondition(config, levelIndex),
        {
          escalate: `level_${levelIndex + 1}_supervisor` as any,
          continue: 'escalation_router' as any,
          finish: END,
        }
      );
    }

    // Final level goes to completion
    // TYPE CAST RATIONALE: Same as above (dynamic hierarchical node names)
    const finalLevel = config.levels.length - 1;
    graph.addEdge(`level_${finalLevel}_supervisor` as any, END);

    this.logger.log(`Built ${config.levels.length}-level hierarchical graph`);

    // TYPE CAST RATIONALE (hierarchical pattern - 1 cast):
    // checkpointer: Same type mismatch as supervisor pattern (see buildSupervisorGraph above)
    // LangGraph API Note: 'debug' property removed from compile options
    return graph.compile({
      checkpointer: compilationOptions?.checkpointer as any,
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
   * @deprecated Use AgentStateAnnotation from @hive-academy/langgraph-core instead
   *
   * This method is no longer needed with LangGraph 2025 Annotation.Root pattern.
   * State is now defined using Annotation.Root() which provides better type safety
   * and aligns with LangChain best practices.
   *
   * Migration:
   * ```typescript
   * // Old pattern (deprecated)
   * const graph = new StateGraph({ channels: this.createDefaultStateChannels() });
   *
   * // New pattern (LangGraph 2025)
   * import { AgentStateAnnotation } from '@hive-academy/langgraph-core';
   * const graph = new StateGraph(AgentStateAnnotation);
   * ```
   */
  // @ts-expect-error Deprecated - kept for migration documentation
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
   * @deprecated Use AgentStateAnnotation from @hive-academy/langgraph-core instead
   *
   * This method is no longer needed with LangGraph 2025 Annotation.Root pattern.
   * Message history management is now handled via custom reducers in the annotation.
   *
   * Migration:
   * ```typescript
   * // Old pattern (deprecated)
   * const graph = new StateGraph({ channels: this.createSwarmStateChannels(config) });
   *
   * // New pattern (LangGraph 2025)
   * import { AgentStateAnnotation } from '@hive-academy/langgraph-core';
   * const graph = new StateGraph(AgentStateAnnotation);
   * // Message history management moved to node logic
   * ```
   */
  // @ts-expect-error Deprecated - kept for migration documentation
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
   * @param graph - StateGraph instance (typed as any due to complex generic signature)
   * @param workers - Array of worker agent IDs
   */
  private addSupervisorEdges(
    graph: StateGraph<any, any, any, any>,
    workers: readonly string[]
  ): void {
    // Entry point to supervisor
    graph.addEdge(START, 'supervisor');

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
   * @param graph - StateGraph instance (typed as any due to complex generic signature)
   * @param agents - Array of agent definitions
   */
  private addSwarmEdges(
    graph: StateGraph<any, any, any, any>,
    agents: readonly AgentDefinition[]
  ): void {
    // Entry point to first agent
    graph.addEdge(START, agents[0].id);

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
    config: SupervisorConfig | SwarmConfig | HierarchicalConfig | NetworkConfig,
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
