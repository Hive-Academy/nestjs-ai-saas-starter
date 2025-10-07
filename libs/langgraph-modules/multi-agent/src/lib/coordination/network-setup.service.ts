import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import type { IMemoryAdapter } from '@hive-academy/langgraph-core';
import {
  AgentDefinition,
  AgentNetwork,
} from '../interfaces/multi-agent.interface';
import { AgentRegistryService } from '../agent/agent-registry.service';
import { NetworkManagerService } from '../network/network-manager.service';

/**
 * Network Setup Service
 *
 * Handles network creation and configuration with memory-based optimization.
 * Responsible for:
 * - Agent registration with memory tracking
 * - Network topology configuration
 * - Memory-based network optimization
 */
@Injectable()
export class NetworkSetupService {
  private readonly logger = new Logger(NetworkSetupService.name);

  constructor(
    private readonly agentRegistry: AgentRegistryService,
    private readonly networkManager: NetworkManagerService,
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {}

  /**
   * Register an agent
   * Memory-enhanced with agent performance tracking
   */
  async registerAgent(definition: AgentDefinition): Promise<void> {
    this.agentRegistry.registerAgent(definition);

    // Memory superpowers: Store agent registration for performance tracking
    if (this.memoryAdapter) {
      try {
        await this.storeAgentRegistration(definition);
        this.logger.debug(
          `Agent ${definition.id} registered with memory tracking`
        );
      } catch (error) {
        this.logger.warn(
          `Failed to store agent registration in memory: ${error}`
        );
      }
    }
  }

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
    // Register all agents with memory tracking
    for (const agent of agents) {
      await this.registerAgent(agent);
    }

    // Memory superpowers: Get optimal network configuration based on learned patterns
    let networkOptimizations: any = {};
    if (this.memoryAdapter) {
      try {
        networkOptimizations = await this.getOptimalNetworkConfiguration(
          networkId,
          agents,
          networkType
        );
        this.logger.debug(`Retrieved network optimizations for ${networkId}`, {
          agentOrderOptimized: networkOptimizations.agentOrder?.length > 0,
          topologyOptimized: !!networkOptimizations.topology,
          performanceTuned: !!networkOptimizations.performance,
        });
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
            // Memory superpowers: Apply learned network optimizations
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
            // Memory superpowers: Apply learned swarm optimizations
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
            // Memory superpowers: Apply learned hierarchical optimizations
            ...networkOptimizations.configuration,
            ...config,
          },
        };
        break;
    }

    const createdNetworkId = await this.networkManager.createNetwork(
      networkConfig
    );

    // Memory superpowers: Store network creation event for learning
    if (this.memoryAdapter) {
      try {
        await this.storeNetworkCreationEvent({
          networkId: createdNetworkId,
          type: networkType,
          agents,
          optimizations: networkOptimizations,
          timestamp: new Date().toISOString(),
        });
        this.logger.debug(`Stored network creation event: ${createdNetworkId}`);
      } catch (error) {
        this.logger.warn(`Failed to store network creation event: ${error}`);
      }
    }

    return createdNetworkId;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS - Memory Integration
  // ============================================================================

  /**
   * Store agent registration for performance tracking
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
          source: 'network_setup',
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
   * Get optimal network configuration from learned patterns
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
   * Store network creation event for learning
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
          source: 'network_setup',
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

    const bestPattern = Object.keys(orderPatterns).reduce(
      (a, b) => (orderPatterns[a] > orderPatterns[b] ? a : b),
      ''
    );

    return bestPattern ? bestPattern.split(',') : agentIds;
  }

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

    return totalCount > 0 ? successCount / totalCount > 0.6 : true;
  }

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

    return totalCount > 0 ? successCount / totalCount > 0.5 : true;
  }

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

    return totalCount > 0 ? successCount / totalCount > 0.7 : true;
  }

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

    return totalCount > 0 ? successCount / totalCount > 0.6 : false;
  }

  private getOptimalHierarchy(
    memories: any[],
    agents: AgentDefinition[]
  ): string[][] {
    const agentIds = agents.map((a) => a.id);

    for (const memory of memories) {
      try {
        const data = JSON.parse(memory.content);
        if (data.levels && Array.isArray(data.levels) && data.success) {
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

    return [agentIds];
  }
}
