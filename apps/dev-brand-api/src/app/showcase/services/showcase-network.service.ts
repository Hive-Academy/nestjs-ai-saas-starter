import { Injectable, Logger } from '@nestjs/common';
import { HumanMessage } from '@langchain/core/messages';
import { MultiAgentCoordinatorService } from '@hive-academy/langgraph-multi-agent';
import { ShowcaseCoordinatorService } from './showcase-coordinator.service';
import type { ShowcaseAgentState } from '../types/showcase.types';

/**
 * 🤖 SHOWCASE NETWORK SERVICE
 * 
 * Responsible for multi-agent network coordination and setup.
 * Handles agent registration, network configuration, and coordination metrics.
 */
@Injectable()
export class ShowcaseNetworkService {
  private readonly logger = new Logger(ShowcaseNetworkService.name);

  constructor(
    private readonly multiAgentCoordinator: MultiAgentCoordinatorService,
    private readonly coordinatorService: ShowcaseCoordinatorService
  ) {}

  /**
   * Setup multi-agent network for showcase
   */
  async setupShowcaseNetwork(
    showcaseId: string,
    demonstrationMode: string
  ): Promise<{
    success: boolean;
    networkId: string;
    selectedAgents: string[];
    coordinationResults?: any;
    error?: Error;
  }> {
    const networkId = `showcase-network-${showcaseId}`;
    
    try {
      this.logger.log('🚀 Setting up REAL multi-agent network...');

      // Get registered agents from our agent registry
      const researchAgent = this.multiAgentCoordinator.getAgent('research-showcase');
      const analysisAgent = this.multiAgentCoordinator.getAgent('analysis-showcase'); 
      const contentAgent = this.multiAgentCoordinator.getAgent('content-showcase');

      // Setup network with real agent definitions
      await this.multiAgentCoordinator.setupNetwork(networkId, [
        researchAgent,
        analysisAgent, 
        contentAgent,
      ], 'supervisor', {
        systemPrompt: `You are coordinating a team of AI agents for a ${demonstrationMode} demonstration. Route tasks to the most appropriate agent based on their capabilities.`,
        workers: ['research-showcase', 'analysis-showcase', 'content-showcase'],
        enableForwardMessage: true,
        removeHandoffMessages: false, // Keep for showcase visibility
      });

      // Use intelligent agent selection
      const selectedAgents = await this.selectOptimalAgents(demonstrationMode);

      // Generate coordination metrics
      const coordinationResults = this.generateCoordinationMetrics(
        networkId,
        selectedAgents,
        demonstrationMode
      );

      this.logger.log('✅ Multi-agent network setup completed successfully');

      return {
        success: true,
        networkId,
        selectedAgents,
        coordinationResults,
      };

    } catch (error) {
      this.logger.error('❌ Network setup failed:', error);
      
      return {
        success: false,
        networkId: '',
        selectedAgents: [],
        error: error as Error,
      };
    }
  }

  /**
   * Select optimal agents based on demonstration mode
   */
  private async selectOptimalAgents(demonstrationMode: string): Promise<string[]> {
    // Use the existing coordinator service for intelligent selection
    const selectedAgents = await this.coordinatorService.selectOptimalAgents({
      input: `Showcase demonstration in ${demonstrationMode} mode`,
      demonstrationMode: demonstrationMode as any,
      activeCapabilities: ['coordination', 'analysis', 'generation'],
      context: {
        similarExecions: [],
        relevantDocs: [],
        agentRelationships: [],
        executionPaths: [],
        recentInteractions: [],
        learningPoints: [],
      },
    });

    return selectedAgents;
  }

  /**
   * Generate coordination metrics
   */
  private generateCoordinationMetrics(
    networkId: string,
    selectedAgents: string[],
    demonstrationMode: string
  ) {
    return {
      networkId,
      selectedAgents,
      coordinationStrategy: 'supervisor',
      agentCapabilities: selectedAgents.map(agentId => ({
        id: agentId,
        capabilities: this.getAgentCapabilities(agentId),
        priority: 'medium',
        estimatedDuration: 30000,
      })),
      networkHealth: true,
      demonstrationMode,
      setupTimestamp: Date.now(),
    };
  }

  /**
   * Get agent capabilities mapping
   */
  private getAgentCapabilities(agentId: string): string[] {
    const capabilityMap: Record<string, string[]> = {
      'research-showcase': ['research', 'analysis', 'information-gathering'],
      'analysis-showcase': ['analysis', 'insight-generation', 'pattern-recognition'],
      'content-showcase': ['content-generation', 'writing', 'creative-synthesis'],
      'demo-showcase': ['basic-analysis', 'content-formatting'],
    };

    return capabilityMap[agentId] || ['general-purpose'];
  }

  /**
   * Update state with network coordination results
   */
  updateStateWithNetwork(
    state: Partial<ShowcaseAgentState>,
    networkResult: {
      success: boolean;
      networkId: string;
      selectedAgents: string[];
      coordinationResults?: any;
      error?: Error;
    }
  ): Partial<ShowcaseAgentState> {
    if (networkResult.success) {
      return {
        ...state,
        networkId: networkResult.networkId,
        selectedAgents: networkResult.selectedAgents,
        metricsCollected: {
          ...state.metricsCollected,
          totalDuration: state.metricsCollected?.totalDuration || 0,
          agentSwitches: (state.metricsCollected?.agentSwitches || 0) + networkResult.selectedAgents.length,
          toolInvocations: state.metricsCollected?.toolInvocations || 0,
          memoryAccesses: state.metricsCollected?.memoryAccesses || 0,
          averageResponseTime: state.metricsCollected?.averageResponseTime || 0,
          peakMemoryUsage: state.metricsCollected?.peakMemoryUsage || 0,
          concurrentAgents: networkResult.selectedAgents.length,
          successRate: state.metricsCollected?.successRate || 0,
          errorRate: state.metricsCollected?.errorRate || 0,
          approvalRate: state.metricsCollected?.approvalRate || 0,
          tokensStreamed: state.metricsCollected?.tokensStreamed || 0,
          streamingLatency: state.metricsCollected?.streamingLatency || 0,
          connectionStability: state.metricsCollected?.connectionStability || 1.0,
        },
        messages: [
          ...(state.messages || []),
          new HumanMessage(
            `🚀 REAL Multi-Agent Coordination: Setup network '${networkResult.networkId}' with ${networkResult.selectedAgents.length} agents`
          ),
          new HumanMessage(
            `Selected agents: ${networkResult.selectedAgents.map(agentId => `${agentId}(${this.getAgentCapabilities(agentId).join(', ')})`).join(', ')}`
          ),
        ],
      };
    } else {
      // Error case
      return {
        ...state,
        errors: [
          ...(state.errors || []),
          {
            id: `coordination-error-${Date.now()}`,
            type: 'agent' as const,
            severity: 'medium' as const,
            message: `Multi-agent coordination error: ${networkResult.error?.message}`,
            context: { phase: 'agent_coordination', networkId: networkResult.networkId },
            occurredAt: Date.now(),
            recoverable: true,
          },
        ],
        messages: [
          ...(state.messages || []),
          new HumanMessage(
            `⚠️ Multi-agent coordination encountered issues, proceeding with single-agent mode`
          ),
        ],
      };
    }
  }

  /**
   * Cleanup network resources
   */
  async cleanupNetwork(networkId: string): Promise<void> {
    try {
      this.logger.log(`🧹 Cleaning up network: ${networkId}`);
      
      // Remove network from coordinator
      const removed = this.multiAgentCoordinator.removeNetwork(networkId);
      
      if (removed) {
        this.logger.log('✅ Network cleanup completed successfully');
      } else {
        this.logger.warn('⚠️ Network not found for cleanup');
      }
    } catch (error) {
      this.logger.error('❌ Network cleanup failed:', error);
    }
  }

  /**
   * Get network health status
   */
  getNetworkHealth(networkId: string): {
    healthy: boolean;
    status: string;
    agentCount: number;
    lastActivity?: number;
  } {
    try {
      const networkConfig = this.multiAgentCoordinator.getNetworkConfig(networkId);
      
      if (!networkConfig) {
        return {
          healthy: false,
          status: 'Network not found',
          agentCount: 0,
        };
      }

      return {
        healthy: true,
        status: 'Active',
        agentCount: networkConfig.agents?.length || 0,
        lastActivity: Date.now(),
      };
    } catch (error) {
      return {
        healthy: false,
        status: `Error: ${error.message}`,
        agentCount: 0,
      };
    }
  }
}