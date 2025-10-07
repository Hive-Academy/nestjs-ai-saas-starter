import { OnModuleInit, Inject, Optional, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  MultiAgentConfig,
  getMultiAgentConfig,
  MultiAgentTopology,
  isSupervisorConfig,
  isSwarmConfig,
  isHierarchicalConfig,
  isSequentialConfig,
} from '../decorators/multi-agent.decorator';
import { getAgentConfig } from '../decorators/agent.decorator';
import { MultiAgentCoordinatorService } from '../coordination/multi-agent-coordinator.service';
import {
  AgentDefinition,
  AgentState,
} from '../interfaces/multi-agent.interface';
import type { ICheckpointAdapter } from '@hive-academy/langgraph-core';

/**
 * Base class for multi-agent workflows
 *
 * Provides automatic setup and lifecycle management for workflows decorated with @MultiAgent.
 * Consumers extend this class to get automatic multi-agent coordination without
 * manually managing internal services.
 *
 * @example
 * ```typescript
 * @MultiAgent({
 *   networkId: 'my-supervisor',
 *   topology: MultiAgentTopology.SUPERVISOR,
 *   agents: [Agent1, Agent2, Agent3],
 *   config: {
 *     systemPrompt: '...',
 *     workers: ['agent1', 'agent2', 'agent3']
 *   }
 * })
 * export class MySupervisorWorkflow extends MultiAgentWorkflowBase {
 *   // Automatic setup - no manual configuration needed!
 *
 *   async execute(input: any) {
 *     // Call the multi-agent network
 *     return this.executeCoordination(input);
 *   }
 * }
 * ```
 */
export abstract class MultiAgentWorkflowBase implements OnModuleInit {
  protected readonly logger = new Logger(this.constructor.name);

  /**
   * Network ID for this multi-agent workflow
   * Set automatically during initialization
   */
  protected networkId: string | null = null;

  /**
   * Multi-agent configuration
   * Read from @MultiAgent decorator
   */
  protected multiAgentConfig: MultiAgentConfig | null = null;

  /**
   * Internal coordination service (not exposed to consumers)
   */
  @Inject(MultiAgentCoordinatorService)
  private readonly coordinator!: MultiAgentCoordinatorService;

  /**
   * Module reference for agent instance retrieval
   */
  @Inject(ModuleRef)
  private readonly moduleRef!: ModuleRef;

  /**
   * Optional checkpoint adapter for stateful workflows
   */
  @Optional()
  @Inject('ICheckpointAdapter')
  private readonly checkpointAdapter?: ICheckpointAdapter;

  /**
   * Automatic initialization on module startup
   * Reads @MultiAgent metadata and sets up the network
   */
  async onModuleInit(): Promise<void> {
    try {
      // Read @MultiAgent metadata from decorator
      const config = getMultiAgentConfig(this.constructor);
      this.multiAgentConfig = config || null;

      if (!this.multiAgentConfig) {
        throw new Error(
          `${this.constructor.name} is not decorated with @MultiAgent. ` +
            `Extend MultiAgentWorkflowBase only for @MultiAgent workflows.`
        );
      }

      this.logger.log(
        `Initializing multi-agent workflow: ${this.multiAgentConfig.networkId} ` +
          `(${this.multiAgentConfig.topology})`
      );

      // Get agent instances from DI container
      const agentInstances = await this.getAgentInstances(
        this.multiAgentConfig.agents
      );

      // Convert workflow agents to AgentDefinition objects
      const agentDefinitions = this.createAgentDefinitions(
        agentInstances,
        this.multiAgentConfig.agents
      );

      this.logger.debug(
        `Created ${
          agentDefinitions.length
        } agent definitions: ${agentDefinitions.map((a) => a.id).join(', ')}`
      );

      // Setup network based on topology
      this.networkId = await this.setupNetwork(
        this.multiAgentConfig,
        agentDefinitions
      );

      this.logger.log(
        `✅ Multi-agent network initialized: ${this.networkId} with ${agentDefinitions.length} agents`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to initialize multi-agent workflow: ${errorMessage}`
      );
      throw error;
    }
  }

  /**
   * Execute multi-agent coordination
   *
   * Protected method for subclasses to trigger coordination.
   * Handles streaming, checkpointing, and result extraction automatically.
   */
  protected async executeCoordination(
    input: {
      messages: string[];
      config?: {
        metadata?: Record<string, any>;
        [key: string]: any;
      };
    },
    options?: {
      streamMode?: 'values' | 'updates' | 'messages';
      stream?: boolean;
    }
  ): Promise<any> {
    if (!this.networkId) {
      throw new Error('Network not initialized. onModuleInit may have failed.');
    }

    const config = {
      ...input.config,
      checkpointer: this.multiAgentConfig?.checkpointing
        ? this.checkpointAdapter
        : undefined,
    };

    if (options?.stream || this.multiAgentConfig?.streaming) {
      // Return streaming iterator
      return this.coordinator.executeWorkflow(this.networkId, {
        messages: input.messages,
        streamMode: options?.streamMode || 'values',
        config,
      });
    } else {
      // Return final result
      return this.coordinator.executeWorkflow(this.networkId, {
        messages: input.messages,
        config,
      });
    }
  }

  /**
   * Execute simple coordination with a single message
   */
  protected async executeSimple(
    message: string,
    metadata?: Record<string, any>
  ): Promise<any> {
    if (!this.networkId) {
      throw new Error('Network not initialized. onModuleInit may have failed.');
    }

    return this.coordinator.executeSimpleWorkflow(this.networkId, message, {
      config: { metadata },
    });
  }

  /**
   * Get agent instances from DI container
   */
  private async getAgentInstances(agentClasses: any[]): Promise<any[]> {
    const instances: any[] = [];

    for (const AgentClass of agentClasses) {
      try {
        const instance = await this.moduleRef.get(AgentClass, {
          strict: false,
        });
        instances.push(instance);
      } catch (error) {
        throw new Error(
          `Failed to retrieve agent instance: ${AgentClass.name}. ` +
            `Ensure the agent is registered in the module providers.`
        );
      }
    }

    return instances;
  }

  /**
   * Convert workflow agents to AgentDefinition objects
   */
  private createAgentDefinitions(
    agentInstances: any[],
    agentClasses: any[]
  ): AgentDefinition[] {
    return agentInstances.map((instance, index) => {
      const AgentClass = agentClasses[index];
      const agentConfig = getAgentConfig(AgentClass);

      if (!agentConfig) {
        throw new Error(
          `Agent ${AgentClass.name} is not decorated with @Agent. ` +
            `All agents in @MultiAgent must have @Agent decorator.`
        );
      }

      return {
        id: agentConfig.id,
        name: agentConfig.name,
        description: agentConfig.description,
        nodeFunction: async (state: AgentState) => {
          this.logger.debug(`[${agentConfig.id}] Executing worker agent...`);

          // Execute the agent's internal workflow
          const result = await instance.execute(state);

          this.logger.debug(`[${agentConfig.id}] Worker agent completed`);

          return {
            messages: result.messages || state.messages,
            metadata: {
              ...state.metadata,
              ...result.metadata,
              lastAgent: agentConfig.id,
              lastAgentResult: result,
            },
          };
        },
        metadata: {
          type: 'workflow-agent',
          agentClass: AgentClass.name,
          capabilities: agentConfig.capabilities,
          priority: agentConfig.priority,
          // Include streaming/interruption config from agent decorator
          streamingConfig: agentConfig.workflow?.multiAgentStreaming,
          interruptionConfig: agentConfig.workflow?.multiAgentInterruption,
        },
      };
    });
  }

  /**
   * Setup network based on topology
   */
  private async setupNetwork(
    config: MultiAgentConfig,
    agents: AgentDefinition[]
  ): Promise<string> {
    switch (config.topology) {
      case MultiAgentTopology.SUPERVISOR:
        return this.setupSupervisorNetwork(config, agents);

      case MultiAgentTopology.SWARM:
        return this.setupSwarmNetwork(config, agents);

      case MultiAgentTopology.HIERARCHICAL:
        return this.setupHierarchicalNetwork(config, agents);

      case MultiAgentTopology.SEQUENTIAL:
        return this.setupSequentialNetwork(config, agents);

      default:
        throw new Error(`Unsupported topology: ${config.topology}`);
    }
  }

  /**
   * Setup supervisor network
   */
  private async setupSupervisorNetwork(
    config: MultiAgentConfig,
    agents: AgentDefinition[]
  ): Promise<string> {
    if (!isSupervisorConfig(config.config)) {
      throw new Error('Invalid supervisor configuration');
    }

    return this.coordinator.setupNetwork(
      config.networkId,
      agents,
      'supervisor',
      {
        systemPrompt: config.config.systemPrompt,
        workers: config.config.workers,
        enableForwardMessage: config.config.enableForwardMessage,
        removeHandoffMessages: config.config.removeHandoffMessages,
        llm: config.config.llm,
      }
    );
  }

  /**
   * Setup swarm network
   */
  private async setupSwarmNetwork(
    config: MultiAgentConfig,
    agents: AgentDefinition[]
  ): Promise<string> {
    if (!isSwarmConfig(config.config)) {
      throw new Error('Invalid swarm configuration');
    }

    // Swarm uses 'swarm' type in coordinator
    return this.coordinator.setupNetwork(config.networkId, agents, 'swarm', {
      initialAgent: config.config.initialAgent,
      maxRounds: config.config.maxRounds,
      enablePeerCommunication: config.config.enablePeerCommunication,
    });
  }

  /**
   * Setup hierarchical network
   */
  private async setupHierarchicalNetwork(
    config: MultiAgentConfig,
    agents: AgentDefinition[]
  ): Promise<string> {
    if (!isHierarchicalConfig(config.config)) {
      throw new Error('Invalid hierarchical configuration');
    }

    return this.coordinator.setupNetwork(
      config.networkId,
      agents,
      'hierarchical',
      {
        hierarchy: config.config.hierarchy,
        enableEscalation: config.config.enableEscalation,
      }
    );
  }

  /**
   * Setup sequential network
   */
  private async setupSequentialNetwork(
    config: MultiAgentConfig,
    agents: AgentDefinition[]
  ): Promise<string> {
    if (!isSequentialConfig(config.config)) {
      throw new Error('Invalid sequential configuration');
    }

    // Sequential uses supervisor under the hood with strict ordering
    return this.coordinator.setupNetwork(
      config.networkId,
      agents,
      'supervisor',
      {
        systemPrompt: `Execute agents in strict sequence: ${config.config.sequence.join(
          ' → '
        )}`,
        workers: config.config.sequence,
        enableForwardMessage: true,
        strictSequence: true,
        stopOnFailure: config.config.stopOnFailure,
      }
    );
  }

  /**
   * Get network ID (useful for debugging)
   */
  protected getNetworkId(): string | null {
    return this.networkId;
  }

  /**
   * Get multi-agent configuration (useful for debugging)
   */
  protected getConfig(): MultiAgentConfig | null {
    return this.multiAgentConfig;
  }
}
