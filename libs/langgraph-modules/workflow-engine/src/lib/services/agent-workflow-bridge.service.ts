import {
  Injectable,
  Logger,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import type { AgentProvider } from '@hive-academy/langgraph-multi-agent';
import { AgentRegistrationService } from './agent-registration.service';
import { AgentResolutionService } from './agent-resolution.service';
import { AgentCoordinationService, type CoordinationStrategy } from './agent-coordination.service';
import { isAgentConfigWithType } from '../utils/type-guards';
import type { InternalWorkflowDefinition, AgentRegistration } from './agent-registration.service';
import type { AgentInstance } from './agent-resolution.service';

// Re-export types from sub-services for backward compatibility
export type { InternalWorkflowDefinition, AgentRegistration } from './agent-registration.service';
export type { AgentInstance } from './agent-resolution.service';
export type { CoordinationStrategy, AgentCoordinationResult } from './agent-coordination.service';

/**
 * Bridge service that coordinates agent registration, resolution, and coordination.
 * This service acts as the main entry point for agent-related operations in workflows.
 *
 * Responsibilities:
 * - Initialize and coordinate sub-services
 * - Bridge between multi-agent registry and workflow engine
 * - Provide unified API for agent operations
 * - Handle module initialization and integration
 */
@Injectable()
export class AgentWorkflowBridgeService implements OnModuleInit {
  private readonly logger = new Logger(AgentWorkflowBridgeService.name);

  constructor(
    private readonly agentRegistration: AgentRegistrationService,
    private readonly agentResolution: AgentResolutionService,
    private readonly agentCoordination: AgentCoordinationService,
    @Optional() private readonly injectedAgentProviders?: AgentProvider[],
    @Optional() private readonly multiAgentRegistry?: any
  ) {}

  /**
   * Initialize the bridge service and all sub-services
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing AgentWorkflowBridgeService...');

    try {
      // Set injected providers if available
      if (this.injectedAgentProviders) {
        this.agentRegistration.setAgentProviders(this.injectedAgentProviders);
        this.logger.debug(`Set ${this.injectedAgentProviders.length} injected agent providers`);
      }

      // Register all agents
      await this.agentRegistration.registerProvidedAgents();

      // Integrate with multi-agent registry if available
      if (this.multiAgentRegistry) {
        await this.integrateWithMultiAgentRegistry();
      }

      const agentCount = this.agentRegistration.getRegisteredAgents().length;
      if (agentCount > 0) {
        this.logger.log(`AgentWorkflowBridgeService initialized with ${agentCount} agents`);
      } else {
        this.logger.warn('No agents registered in AgentWorkflowBridgeService');
      }
    } catch (error) {
      this.logger.error('Failed to initialize AgentWorkflowBridgeService:', error);
      throw error;
    }
  }

  /**
   * Set agent providers for registration
   */
  setAgentProviders(providers: AgentProvider[]): void {
    this.agentRegistration.setAgentProviders(providers);
  }

  /**
   * Resolve an agent instance by ID
   */
  async resolveAgent(agentId: string): Promise<AgentInstance> {
    return this.agentResolution.resolveAgent(agentId);
  }

  /**
   * Coordinate multiple agents with specified strategy
   */
  async coordinateAgents(
    agentIds: string[],
    state: any,
    strategy: CoordinationStrategy = 'sequential'
  ) {
    return this.agentCoordination.coordinateAgents(agentIds, state, strategy);
  }

  /**
   * Get all registered agents
   */
  getRegisteredAgents(): AgentRegistration[] {
    return this.agentRegistration.getRegisteredAgents();
  }

  /**
   * Get agent registration by ID
   */
  getAgentRegistration(agentId: string): AgentRegistration | undefined {
    return this.agentRegistration.getAgentRegistration(agentId);
  }

  /**
   * Check if agent exists
   */
  hasAgent(agentId: string): boolean {
    return this.agentRegistration.hasAgent(agentId);
  }

  /**
   * Get agents by capability
   */
  getAgentsByCapability(capability: string): string[] {
    return this.agentRegistration.getAgentsByCapability(capability);
  }

  /**
   * Get agents by tool
   */
  getAgentsByTool(tool: string): string[] {
    return this.agentRegistration.getAgentsByTool(tool);
  }

  /**
   * Clear instance cache
   */
  clearInstanceCache(): void {
    this.agentResolution.clearInstanceCache();
  }

  /**
   * Get comprehensive registry statistics
   */
  getRegistryStats(): {
    registration: ReturnType<AgentRegistrationService['getRegistryStats']>;
    resolution: ReturnType<AgentResolutionService['getCacheStats']>;
    coordination: ReturnType<AgentCoordinationService['getCoordinationStats']>;
  } {
    return {
      registration: this.agentRegistration.getRegistryStats(),
      resolution: this.agentResolution.getCacheStats(),
      coordination: this.agentCoordination.getCoordinationStats(),
    };
  }

  /**
   * Get internal workflow definition for workflow agents
   */
  getInternalWorkflow(agentId: string): InternalWorkflowDefinition | undefined {
    const registration = this.agentRegistration.getAgentRegistration(agentId);
    return registration?.internalWorkflow;
  }

  /**
   * Check if agent is a workflow agent
   */
  isWorkflowAgent(agentId: string): boolean {
    const registration = this.agentRegistration.getAgentRegistration(agentId);
    return !!registration && isAgentConfigWithType(registration.config, 'workflow-agent') && !!registration.internalWorkflow;
  }

  /**
   * Get workflow agent statistics
   */
  getWorkflowAgentStats(agentId: string): {
    isWorkflowAgent: boolean;
    workflowSteps?: number;
    hasInternalWorkflow?: boolean;
    entryPoint?: string;
  } {
    const registration = this.agentRegistration.getAgentRegistration(agentId);
    const isWorkflowAgent = !!registration && isAgentConfigWithType(registration.config, 'workflow-agent');
    const workflow = registration?.internalWorkflow;

    return {
      isWorkflowAgent,
      workflowSteps: workflow?.steps.length,
      hasInternalWorkflow: !!workflow,
      entryPoint: workflow?.entryPoint,
    };
  }

  /**
   * Health check for the bridge service
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    registeredAgents: number;
    cachedInstances: number;
    lastInitialized: Date | undefined;
    errors: string[];
  } {
    const errors: string[] = [];
    const registeredAgents = this.agentRegistration.getRegisteredAgents().length;
    const cachedInstances = this.agentResolution.getCacheStats().cachedInstances;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (registeredAgents === 0) {
      errors.push('No agents registered');
      status = 'degraded';
    }

    // Check for high error rates
    const totalErrors = this.agentRegistration.getRegisteredAgents()
      .reduce((sum, agent) => sum + agent.metadata.errorCount, 0);

    if (totalErrors > registeredAgents * 5) { // More than 5 errors per agent on average
      errors.push('High error rate detected');
      status = status === 'healthy' ? 'degraded' : 'unhealthy';
    }

    return {
      status,
      registeredAgents,
      cachedInstances,
      lastInitialized: undefined, // Could track this if needed
      errors,
    };
  }

  /**
   * Integrate with multi-agent registry if available
   */
  private async integrateWithMultiAgentRegistry(): Promise<void> {
    if (!this.multiAgentRegistry) {
      return;
    }

    try {
      this.logger.debug('Integrating with multi-agent registry...');

      for (const [, registration] of this.agentRegistration.getRegisteredAgents().entries()) {
        if (this.multiAgentRegistry.registerAgent) {
          await this.multiAgentRegistry.registerAgent({
            id: registration.id,
            type: isAgentConfigWithType(registration.config, 'workflow-agent') ? 'workflow-agent' : 
                  isAgentConfigWithType(registration.config, 'simple-agent') ? 'simple-agent' : 'unknown',
            capabilities: registration.capabilities.capabilities,
            tools: registration.capabilities.tools,
            metadata: {
              source: 'workflow-engine',
              workflowAgent: isAgentConfigWithType(registration.config, 'workflow-agent'),
              hasInternalWorkflow: !!registration.internalWorkflow,
              registeredAt: registration.metadata.registeredAt,
            },
          });
        }
      }

      this.logger.debug('Successfully integrated with multi-agent registry');
    } catch (error) {
      this.logger.error('Failed to integrate with multi-agent registry:', error);
      // Non-fatal error, continue without integration
    }
  }
}
