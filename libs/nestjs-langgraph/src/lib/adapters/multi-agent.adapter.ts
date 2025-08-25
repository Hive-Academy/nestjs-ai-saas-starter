import { Injectable, Inject, Optional } from '@nestjs/common';
import { HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { BaseModuleAdapter } from './base/base.adapter';
import type {
  IExecutableAdapter,
  IStreamableAdapter,
  ICleanableAdapter,
  ExtendedAdapterStatus,
} from './interfaces/adapter.interface';

/**
 * Multi-agent configuration interface for adapter
 */
export interface MultiAgentConfig {
  networkType?: 'supervisor' | 'swarm' | 'hierarchical';
  agents?: any[];
  systemPrompt?: string;
  workers?: string[];
  streaming?: boolean;
  timeout?: number;
}

/**
 * Multi-agent result interface
 */
export interface MultiAgentResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime?: number;
  executionPath?: string[];
  finalState?: any;
}

/**
 * Adapter that bridges the main NestJS LangGraph library to the enterprise multi-agent module
 *
 * This adapter follows the Adapter pattern to provide seamless integration between
 * the main library and the sophisticated multi-agent coordination system.
 *
 * Benefits:
 * - Provides consistent interface for multi-agent operations
 * - Delegates to enterprise multi-agent module when available
 * - Maintains API consistency across all adapter types
 * - Follows SOLID principles with single responsibility (bridge interface)
 */
@Injectable()
export class MultiAgentAdapter
  extends BaseModuleAdapter<MultiAgentConfig, MultiAgentResult>
  implements
    IExecutableAdapter<any, MultiAgentResult>,
    IStreamableAdapter<any, any>,
    ICleanableAdapter
{
  protected readonly serviceName = 'multi-agent';

  constructor(
    @Optional()
    @Inject('MultiAgentCoordinatorService')
    private readonly coordinator?: any,
    @Optional()
    @Inject('NetworkManagerService')
    private readonly networkManager?: any,
    @Optional()
    @Inject('AgentRegistryService')
    private readonly agentRegistry?: any
  ) {
    super();
  }

  /**
   * Execute method required by IExecutableAdapter interface
   * Delegates to executeSimpleWorkflow for compatibility
   */
  async execute(input: any, options?: any): Promise<MultiAgentResult> {
    if (typeof input === 'string') {
      return this.executeSimpleWorkflow(input, input, options);
    }

    if (input.networkId && input.message) {
      return this.executeSimpleWorkflow(
        input.networkId,
        input.message,
        options
      );
    }

    throw new Error(
      'Invalid input for multi-agent execution. Expected string or {networkId, message}'
    );
  }

  /**
   * Stream method required by IStreamableAdapter interface
   * Delegates to streamWorkflow for compatibility
   */
  stream(input: any, options?: any): AsyncGenerator<any, void, unknown> {
    if (!this.coordinator) {
      throw new Error(
        'Multi-agent module not available. Install @libs/langgraph-modules/multi-agent'
      );
    }

    return this.coordinator.streamWorkflow(input.networkId, input);
  }

  /**
   * Setup a multi-agent network - delegates to enterprise module
   */
  async setupNetwork(
    networkId: string,
    agents: any[],
    networkType: 'supervisor' | 'swarm' | 'hierarchical' = 'supervisor',
    config?: any
  ): Promise<string> {
    if (!this.coordinator) {
      throw new Error(
        'Multi-agent module not available. Install @libs/langgraph-modules/multi-agent'
      );
    }

    this.logger.log(`Setting up ${networkType} network: ${networkId}`);

    try {
      return await this.coordinator.setupNetwork(
        networkId,
        agents,
        networkType,
        config
      );
    } catch (error) {
      this.logger.error(`Failed to setup network ${networkId}:`, error);
      throw error;
    }
  }

  /**
   * Execute a simple workflow - delegates to enterprise module
   */
  async executeSimpleWorkflow(
    networkId: string,
    message: string,
    options?: {
      streamMode?: 'values' | 'updates' | 'messages';
      config?: RunnableConfig;
      timeout?: number;
    }
  ): Promise<MultiAgentResult> {
    if (!this.coordinator) {
      throw new Error(
        'Multi-agent module not available. Install @libs/langgraph-modules/multi-agent'
      );
    }

    this.logger.log(`Executing workflow on network: ${networkId}`);

    try {
      const startTime = Date.now();
      const result = await this.coordinator.executeSimpleWorkflow(
        networkId,
        message,
        options
      );
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result,
        executionTime,
        executionPath: result.executionPath || [],
        finalState: result.finalState,
      };
    } catch (error) {
      this.logger.error(
        `Failed to execute workflow on network ${networkId}:`,
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute multi-agent workflow with full configuration
   */
  async executeWorkflow(
    networkId: string,
    input: {
      messages: string[] | HumanMessage[];
      config?: RunnableConfig;
      streamMode?: 'values' | 'updates' | 'messages';
    }
  ): Promise<MultiAgentResult> {
    if (!this.coordinator) {
      throw new Error(
        'Multi-agent module not available. Install @libs/langgraph-modules/multi-agent'
      );
    }

    try {
      const startTime = Date.now();
      const result = await this.coordinator.executeWorkflow(networkId, input);
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result,
        executionTime,
        executionPath: result.executionPath || [],
        finalState: result.finalState,
      };
    } catch (error) {
      this.logger.error(
        `Failed to execute workflow on network ${networkId}:`,
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
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
  ): AsyncGenerator<any, MultiAgentResult, unknown> | never {
    if (!this.coordinator) {
      throw new Error(
        'Multi-agent module not available. Install @libs/langgraph-modules/multi-agent'
      );
    }

    return this.coordinator.streamWorkflow(networkId, input);
  }

  /**
   * Register an agent - delegates to enterprise registry
   */
  registerAgent(agentDefinition: any): void {
    if (!this.coordinator) {
      throw new Error(
        'Multi-agent module not available. Install @libs/langgraph-modules/multi-agent'
      );
    }

    this.coordinator.registerAgent(agentDefinition);
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): any[] {
    if (!this.coordinator) {
      return [];
    }

    return this.coordinator.getAllAgents();
  }

  /**
   * Get network configuration
   */
  getNetworkConfig(networkId: string): any | undefined {
    if (!this.coordinator) {
      return undefined;
    }

    return this.coordinator.getNetworkConfig(networkId);
  }

  /**
   * List all networks
   */
  listNetworks(): Array<{ id: string; type: string; agentCount: number }> {
    if (!this.coordinator) {
      return [];
    }

    return this.coordinator.listNetworks();
  }

  /**
   * Remove a network
   */
  removeNetwork(networkId: string): boolean {
    if (!this.coordinator) {
      return false;
    }

    return this.coordinator.removeNetwork(networkId);
  }

  /**
   * Get network statistics
   */
  getNetworkStats(networkId: string): any {
    if (!this.coordinator) {
      return null;
    }

    return this.coordinator.getNetworkStats(networkId);
  }

  /**
   * Health check for network
   */
  async healthCheck(networkId: string): Promise<boolean> {
    if (!this.coordinator) {
      return false;
    }

    try {
      return await this.coordinator.healthCheck(networkId);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get system status
   */
  getSystemStatus(): any {
    if (!this.coordinator) {
      return {
        agents: { total: 0, healthy: 0, unhealthy: 0 },
        networks: { total: 0, types: {} },
        available: false,
      };
    }

    return {
      ...this.coordinator.getSystemStatus(),
      available: true,
    };
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    if (!this.coordinator) {
      return;
    }

    try {
      await this.coordinator.cleanup();
    } catch (error) {
      this.logger.warn('Error during multi-agent cleanup:', error);
    }
  }

  /**
   * Check if enterprise multi-agent module is available
   */
  isEnterpriseAvailable(): boolean {
    return !!this.coordinator;
  }

  /**
   * Get adapter status for diagnostics
   */
  getAdapterStatus(): ExtendedAdapterStatus {
    const enterpriseAvailable = this.isEnterpriseAvailable();
    const fallbackMode = !enterpriseAvailable;

    const capabilities = this.getBaseCapabilities();
    if (enterpriseAvailable) {
      capabilities.push(
        'supervisor_networks',
        'swarm_networks',
        'hierarchical_networks',
        'agent_registry',
        'network_management',
        'streaming_execution',
        'health_monitoring',
        'performance_metrics'
      );
    }

    return {
      enterpriseAvailable,
      coordinatorAvailable: !!this.coordinator,
      networkManagerAvailable: !!this.networkManager,
      agentRegistryAvailable: !!this.agentRegistry,
      fallbackMode,
      capabilities,
    };
  }
}
