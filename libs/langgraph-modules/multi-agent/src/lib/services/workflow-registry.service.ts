import { Injectable, Logger } from '@nestjs/common';
import {
  WorkflowDefinition,
  WorkflowProvider,
  WorkflowConfig,
} from '../interfaces/multi-agent.interface';
import { AgentRegistryService } from './agent-registry.service';

/**
 * Workflow Registry Service
 * Manages workflow definitions, registration, and discovery
 */
@Injectable()
export class WorkflowRegistryService {
  private readonly logger = new Logger(WorkflowRegistryService.name);
  private readonly workflows = new Map<string, WorkflowDefinition>();
  private readonly workflowProviders = new Map<string, WorkflowProvider>();

  constructor(private readonly agentRegistry: AgentRegistryService) {
    this.logger.debug('WorkflowRegistryService initialized');
  }

  /**
   * Register a workflow definition
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    try {
      // Validate workflow definition
      this.validateWorkflowDefinition(workflow);

      // Check for conflicts
      if (this.workflows.has(workflow.id)) {
        this.logger.warn(
          `Workflow '${workflow.id}' is already registered, replacing existing definition`
        );
      }

      // Register the workflow
      this.workflows.set(workflow.id, workflow);

      this.logger.debug(
        `Workflow '${workflow.id}' (${workflow.name}) registered successfully`
      );
    } catch (error) {
      this.logger.error(`Failed to register workflow '${workflow.id}':`, error);
      throw error;
    }
  }

  /**
   * Register a workflow provider class
   */
  registerWorkflowProvider(provider: WorkflowProvider): void {
    try {
      // Create instance to extract workflow definitions
      const instance = new provider();

      // Check if instance has workflow definitions
      if (typeof instance.getWorkflowDefinition === 'function') {
        const workflow = instance.getWorkflowDefinition();
        this.registerWorkflow(workflow);
        this.workflowProviders.set(workflow.id, provider);

        this.logger.debug(
          `Workflow provider for '${workflow.id}' registered successfully`
        );
      } else if (typeof instance.getWorkflowDefinitions === 'function') {
        // Multiple workflows from single provider
        const workflows = instance.getWorkflowDefinitions();
        for (const workflow of workflows) {
          this.registerWorkflow(workflow);
          this.workflowProviders.set(workflow.id, provider);
        }

        this.logger.debug(
          `Workflow provider with ${workflows.length} workflows registered`
        );
      } else {
        throw new Error(
          'Workflow provider must implement getWorkflowDefinition() or getWorkflowDefinitions()'
        );
      }
    } catch (error) {
      this.logger.error('Failed to register workflow provider:', error);
      throw error;
    }
  }

  /**
   * Get workflow definition by ID
   */
  getWorkflow(workflowId: string): WorkflowDefinition | null {
    return this.workflows.get(workflowId) || null;
  }

  /**
   * Get all registered workflows
   */
  getAllWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Check if workflow exists
   */
  hasWorkflow(workflowId: string): boolean {
    return this.workflows.has(workflowId);
  }

  /**
   * Get workflows by capability or metadata filter
   */
  getWorkflowsByFilter(filter: {
    requiredAgents?: string[];
    metadata?: Record<string, unknown>;
  }): WorkflowDefinition[] {
    const workflows = this.getAllWorkflows();

    return workflows.filter((workflow) => {
      // Filter by required agents
      if (filter.requiredAgents) {
        const hasRequiredAgents = filter.requiredAgents.every((agentId) =>
          workflow.requiredAgents?.includes(agentId)
        );
        if (!hasRequiredAgents) return false;
      }

      // Filter by metadata
      if (filter.metadata) {
        for (const [key, value] of Object.entries(filter.metadata)) {
          if (workflow.metadata?.[key] !== value) {
            return false;
          }
        }
      }

      return true;
    });
  }

  /**
   * Unregister a workflow
   */
  unregisterWorkflow(workflowId: string): boolean {
    const removed = this.workflows.delete(workflowId);
    this.workflowProviders.delete(workflowId);

    if (removed) {
      this.logger.debug(`Workflow '${workflowId}' unregistered`);
    }

    return removed;
  }

  /**
   * Get workflow statistics
   */
  getWorkflowStats(): {
    totalWorkflows: number;
    workflowsByStatus: Record<string, number>;
    providerTypes: string[];
  } {
    const workflows = this.getAllWorkflows();

    return {
      totalWorkflows: workflows.length,
      workflowsByStatus: {
        registered: workflows.length,
      },
      providerTypes: Array.from(
        new Set(Array.from(this.workflowProviders.values()).map((p) => p.name))
      ),
    };
  }

  /**
   * Validate workflow definition structure
   */
  private validateWorkflowDefinition(workflow: WorkflowDefinition): void {
    // Required fields validation
    if (!workflow.id || typeof workflow.id !== 'string') {
      throw new Error('Workflow must have a valid string ID');
    }

    if (!workflow.name || typeof workflow.name !== 'string') {
      throw new Error('Workflow must have a valid string name');
    }

    if (!workflow.description || typeof workflow.description !== 'string') {
      throw new Error('Workflow must have a valid string description');
    }

    if (!workflow.execute || typeof workflow.execute !== 'function') {
      throw new Error('Workflow must have a valid execute function');
    }

    // Optional fields validation
    if (workflow.version && typeof workflow.version !== 'string') {
      throw new Error('Workflow version must be a string');
    }

    if (workflow.requiredAgents && !Array.isArray(workflow.requiredAgents)) {
      throw new Error('Workflow requiredAgents must be an array');
    }

    // Config validation
    if (workflow.config) {
      this.validateWorkflowConfig(workflow.config);
    }

    this.logger.debug(
      `Workflow definition '${workflow.id}' validated successfully`
    );
  }

  /**
   * Validate workflow configuration
   */
  private validateWorkflowConfig(config: WorkflowConfig): void {
    if (
      config.timeout &&
      (typeof config.timeout !== 'number' || config.timeout <= 0)
    ) {
      throw new Error('Workflow timeout must be a positive number');
    }

    if (config.checkpointing && typeof config.checkpointing !== 'boolean') {
      throw new Error('Workflow checkpointing must be a boolean');
    }

    if (config.streaming && typeof config.streaming !== 'boolean') {
      throw new Error('Workflow streaming must be a boolean');
    }

    if (config.retry) {
      if (typeof config.retry.enabled !== 'boolean') {
        throw new Error('Workflow retry.enabled must be a boolean');
      }
      if (
        typeof config.retry.maxAttempts !== 'number' ||
        config.retry.maxAttempts < 1
      ) {
        throw new Error('Workflow retry.maxAttempts must be a positive number');
      }
      if (
        typeof config.retry.backoffMs !== 'number' ||
        config.retry.backoffMs < 0
      ) {
        throw new Error(
          'Workflow retry.backoffMs must be a non-negative number'
        );
      }
    }
  }

  /**
   * Get registered agents from agent registry
   */
  getRegisteredAgents(): Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    capabilities?: string[];
    isActive: boolean;
    lastActiveTime: Date;
    currentTools: string[];
    personality?: {
      color: string;
      description: string;
    };
  }> {
    const agents = this.agentRegistry.getAllAgents();
    
    return agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      type: agent.constructor?.name || 'Unknown',
      status: 'idle', // TODO: Track actual agent status
      capabilities: agent.capabilities || [],
      isActive: false, // TODO: Track actual agent activity
      lastActiveTime: new Date(),
      currentTools: Array.isArray(agent.metadata?.tools) ? agent.metadata.tools : [],
      personality: {
        color: this.getAgentColor(agent.id),
        description: agent.description,
      },
    }));
  }

  /**
   * Get a color for an agent based on its ID
   */
  private getAgentColor(agentId: string): string {
    const colors = [
      '#16A085', '#E74C3C', '#9B59B6', '#3498DB', 
      '#F39C12', '#1ABC9C', '#E67E22', '#34495E'
    ];
    
    // Simple hash to get consistent color for same agent
    let hash = 0;
    for (let i = 0; i < agentId.length; i++) {
      hash = ((hash << 5) - hash + agentId.charCodeAt(i)) & 0xffffffff;
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Clear all workflows (useful for testing)
   */
  clear(): void {
    this.workflows.clear();
    this.workflowProviders.clear();
    this.logger.debug('All workflows cleared from registry');
  }
}
