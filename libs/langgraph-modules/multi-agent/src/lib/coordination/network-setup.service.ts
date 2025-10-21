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
   *
   * ARCHITECTURE DECISION (TASK_2025_009):
   * - Agent registration metadata is NOT stored in memory/store
   * - Rationale: Static data that never changes, no need for persistence
   * - Already tracked in AgentRegistryService (in-memory during app lifecycle)
   * - Memory should focus on: agent performance, work results, learned patterns
   * - Storing registration on every server restart just pollutes the database
   *
   * What SHOULD be stored (future):
   * - Agent execution metrics (success rate, response time)
   * - Task completion statistics
   * - Learned optimization patterns
   * - Collaboration effectiveness scores
   */
  async registerAgent(definition: AgentDefinition): Promise<void> {
    this.agentRegistry.registerAgent(definition);
    // No memory storage - AgentRegistryService handles in-memory tracking
  }

  /**
   * Quick setup: Register agents and create network in one call
   *
   * ARCHITECTURE DECISION (TASK_2025_009):
   * - Network optimization queries are NOT performed during setup
   * - Rationale: Optimization searches require embeddings via HuggingFace API
   * - Causes 9+ second delays during application startup
   * - Empty collections return no useful patterns anyway
   * - Optimization queries should be lazy-loaded when needed, not on every startup
   *
   * What SHOULD be queried (future):
   * - Only when network has substantial execution history (>100 runs)
   * - On-demand optimization when performance issues detected
   * - Background optimization jobs, not blocking startup
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

    // Skip network optimization queries during startup (TASK_2025_009)
    // These searches require embedding generation which is slow and unnecessary
    // for fresh networks with no execution history
    const networkOptimizations: any = {};

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

    // Skip network creation event storage (TASK_2025_009)
    // Rationale: Static network configuration doesn't need persistence
    // Events should only be stored when they represent runtime performance data
    // Not static configuration that's already in code

    return createdNetworkId;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS - Memory Integration
  // ============================================================================

  /**
   * REMOVED METHODS (TASK_2025_009):
   *
   * 1. storeAgentRegistration()
   *    - Stored agent registration metadata in memory on every server restart
   *    - Caused 29s startup time with HuggingFace API embedding generation
   *    - Agent registration is static, already in AgentRegistryService
   *
   * 2. getOptimalNetworkConfiguration()
   *    - Queried memory for network optimization patterns during setup
   *    - Required embedding generation for search queries
   *    - Caused 9+ second delays with HuggingFace API timeouts
   *    - Empty collections return no useful patterns anyway
   *
   * 3. storeNetworkCreationEvent()
   *    - Stored network creation events with embedding generation
   *    - Static network configuration doesn't need persistence
   *    - Already defined in code
   *
   * ARCHITECTURE PRINCIPLE:
   * Memory storage should focus on RUNTIME PERFORMANCE DATA, not static configuration.
   *
   * What SHOULD be stored (Future):
   * - Agent collaboration effectiveness metrics (trackAgentCollaboration)
   * - Runtime performance patterns from actual workflow executions
   * - Dynamic learned optimizations based on >100 workflow runs
   * - Background optimization jobs, NOT blocking startup operations
   */

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
    // Namespace: ['networks', networkId, 'collaborations', agent1Id]
    // Key: agent2Id
    await store.put(
      ['networks', networkId, 'collaborations', agent1Id],
      agent2Id,
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
