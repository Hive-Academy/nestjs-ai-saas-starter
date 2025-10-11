import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import type { IMemoryAdapter, Store } from '@hive-academy/langgraph-core';
import {
  AgentDefinition,
  AgentNetwork,
} from '../interfaces/multi-agent.interface';
import { AgentRegistryService } from '../agent/agent-registry.service';
import { NetworkManagerService } from '../network/network-manager.service';
import { STORE_COLLECTIONS } from '@hive-academy/langgraph-memory';

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

  // ============================================================================
  // PHASE 2: Store-based Agent Collaboration Graph
  // ============================================================================

  /**
   * Track agent collaboration in network
   * Phase 2: Store-based collaboration graph with hierarchical namespaces
   *
   * Verification:
   * - Store interface: langgraph-core/src/lib/interfaces/memory-adapter.interface.ts:60-100
   * - Constants: langgraph-modules/memory/src/lib/constants/store-namespaces.ts
   * - Pattern: implementation-plan-multi-agent.md:57-101
   */
  async trackAgentCollaboration(
    networkId: string,
    agent1Id: string,
    agent2Id: string,
    collaboration: {
      successRate: number;
      avgResponseTime: number;
      taskTypes: string[];
      count: number;
      errorRate?: number;
      qualityScore?: number;
    }
  ): Promise<void> {
    if (!this.memoryAdapter) return;

    // Non-blocking storage (fire-and-forget pattern)
    this.storeCollaborationAsync(
      networkId,
      agent1Id,
      agent2Id,
      collaboration
    ).catch((error) => {
      this.logger.warn(`Failed to store collaboration: ${error.message}`);
    });
  }

  /**
   * Store collaboration data in Store
   * Uses hierarchical namespace: ['networks', networkId, 'collaborations', agent1Id, agent2Id]
   */
  private async storeCollaborationAsync(
    networkId: string,
    agent1Id: string,
    agent2Id: string,
    collaboration: {
      successRate: number;
      avgResponseTime: number;
      taskTypes: string[];
      count: number;
      errorRate?: number;
      qualityScore?: number;
    }
  ): Promise<void> {
    const store: Store = this.memoryAdapter!.getStore(
      STORE_COLLECTIONS.MULTI_AGENT.COLLABORATIONS
    );

    // Store bidirectional collaboration data
    // Namespace: ['networks', networkId, 'collaborations', agent1Id, agent2Id]
    await store.put(
      ['networks', networkId, 'collaborations', agent1Id, agent2Id],
      {
        successRate: collaboration.successRate,
        avgResponseTime: collaboration.avgResponseTime,
        taskTypes: collaboration.taskTypes,
        totalCollaborations: collaboration.count,
        lastCollaboration: new Date(),
        metrics: {
          errorRate: collaboration.errorRate || 0,
          avgQuality: collaboration.qualityScore || 0.8,
        },
      }
    );

    this.logger.debug(
      `Stored collaboration: ${agent1Id} <-> ${agent2Id} in network ${networkId}`
    );
  }

  /**
   * Query best collaboration partners for an agent
   * Phase 2: Hierarchical namespace queries for optimal partner discovery
   */
  async getAgentCollaborators(
    networkId: string,
    agentId: string
  ): Promise<
    Array<{
      agentId: string;
      successRate: number;
      avgResponseTime: number;
      taskTypes: string[];
      score: number;
    }>
  > {
    if (!this.memoryAdapter) {
      return []; // Graceful degradation
    }

    const store: Store = this.memoryAdapter.getStore(
      STORE_COLLECTIONS.MULTI_AGENT.COLLABORATIONS
    );

    try {
      // List all collaborators for this agent
      const collaborators = await store.list([
        'networks',
        networkId,
        'collaborations',
        agentId,
      ]);

      // Rank by success rate and response time
      return this.rankCollaborators(collaborators);
    } catch (error) {
      this.logger.warn(`Failed to get agent collaborators: ${error}`);
      return [];
    }
  }

  /**
   * Find best collaboration partner for specific task type
   */
  async findBestCollaborator(
    networkId: string,
    agentId: string,
    taskType: string
  ): Promise<string | null> {
    const collaborators = await this.getAgentCollaborators(networkId, agentId);

    if (collaborators.length === 0) return null;

    // Find collaborator with best success rate for this task type
    const bestForTask = collaborators.find((c) =>
      c.taskTypes.includes(taskType)
    );

    return bestForTask?.agentId || collaborators[0].agentId;
  }

  /**
   * Rank collaborators by performance
   * Algorithm: 60% success rate + 30% response time + 10% quality
   */
  private rankCollaborators(
    collaborators: Array<{ key: string; value: any }>
  ): Array<{
    agentId: string;
    successRate: number;
    avgResponseTime: number;
    taskTypes: string[];
    score: number;
  }> {
    return collaborators
      .map((item) => ({
        agentId: item.key,
        successRate: item.value.successRate,
        avgResponseTime: item.value.avgResponseTime,
        taskTypes: item.value.taskTypes,
        score: this.calculateCollaboratorScore(item.value),
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate collaborator score (higher is better)
   * Weights: 60% success, 30% response time, 10% quality
   */
  private calculateCollaboratorScore(collaboration: any): number {
    const successWeight = 0.6;
    const responseTimeWeight = 0.3;
    const qualityWeight = 0.1;

    const successScore = collaboration.successRate * successWeight;
    const responseScore =
      Math.max(0, 1 - collaboration.avgResponseTime / 5000) *
      responseTimeWeight;
    const qualityScore =
      (collaboration.metrics?.avgQuality || 0.8) * qualityWeight;

    return successScore + responseScore + qualityScore;
  }
}
