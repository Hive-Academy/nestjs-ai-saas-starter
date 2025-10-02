import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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

  // Agent status tracking
  private readonly agentStatus = new Map<
    string,
    {
      status: 'idle' | 'busy' | 'error' | 'offline';
      isActive: boolean;
      lastActiveTime: Date;
      currentWorkflow?: string;
      currentTask?: string;
      executionCount: number;
      errorCount: number;
      totalExecutionTime: number;
      averageExecutionTime: number;
    }
  >();

  // Activity tracking
  private readonly agentActivities = new Map<
    string,
    Array<{
      timestamp: Date;
      activity: 'started' | 'completed' | 'failed' | 'idle';
      workflowId?: string;
      duration?: number;
      error?: string;
    }>
  >();

  constructor(
    private readonly agentRegistry: AgentRegistryService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.logger.debug('WorkflowRegistryService initialized');
    this.setupAgentEventListeners();
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
   * Setup event listeners for agent activity tracking
   */
  private setupAgentEventListeners(): void {
    // Listen to workflow events to track agent activities
    this.eventEmitter.on('workflow.started', (event) => {
      if (event.agentId) {
        this.updateAgentStatus(event.agentId, 'busy', {
          currentWorkflow: event.workflowId,
          currentTask: 'workflow_execution',
        });
        this.addAgentActivity(event.agentId, 'started', event.workflowId);
      }
    });

    this.eventEmitter.on('workflow.completed', (event) => {
      if (event.agentId) {
        this.updateAgentStatus(event.agentId, 'idle', {
          currentWorkflow: undefined,
          currentTask: undefined,
        });
        this.addAgentActivity(
          event.agentId,
          'completed',
          event.workflowId,
          event.duration
        );
        this.updateAgentExecutionStats(
          event.agentId,
          event.duration || 0,
          false
        );
      }
    });

    this.eventEmitter.on('workflow.failed', (event) => {
      if (event.agentId) {
        this.updateAgentStatus(event.agentId, 'error', {
          currentWorkflow: undefined,
          currentTask: undefined,
        });
        this.addAgentActivity(
          event.agentId,
          'failed',
          event.workflowId,
          undefined,
          event.error
        );
        this.updateAgentExecutionStats(
          event.agentId,
          event.duration || 0,
          true
        );
      }
    });

    // Listen to agent registration events
    this.eventEmitter.on('agent.registered', (event) => {
      this.initializeAgentStatus(event.agentId);
    });

    // Listen to general agent activity events
    this.eventEmitter.on('agent.activity', (event) => {
      this.updateAgentActivity(event.agentId, event.activity, event.data);
    });

    this.logger.debug('Agent event listeners setup completed');
  }

  /**
   * Initialize agent status tracking
   */
  private initializeAgentStatus(agentId: string): void {
    if (!this.agentStatus.has(agentId)) {
      this.agentStatus.set(agentId, {
        status: 'idle',
        isActive: false,
        lastActiveTime: new Date(),
        executionCount: 0,
        errorCount: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0,
      });

      this.agentActivities.set(agentId, []);

      this.logger.debug(`Initialized status tracking for agent ${agentId}`);
    }
  }

  /**
   * Update agent status
   */
  updateAgentStatus(
    agentId: string,
    status: 'idle' | 'busy' | 'error' | 'offline',
    updates?: Partial<{
      currentWorkflow: string | undefined;
      currentTask: string | undefined;
    }>
  ): void {
    this.initializeAgentStatus(agentId);

    const agentStatusData = this.agentStatus.get(agentId)!;

    agentStatusData.status = status;
    agentStatusData.isActive = status === 'busy';
    agentStatusData.lastActiveTime = new Date();

    if (updates) {
      if (updates.currentWorkflow !== undefined) {
        agentStatusData.currentWorkflow = updates.currentWorkflow;
      }
      if (updates.currentTask !== undefined) {
        agentStatusData.currentTask = updates.currentTask;
      }
    }

    this.logger.debug(`Agent ${agentId} status updated to ${status}`);

    // Emit status change event
    this.eventEmitter.emit('agent.status.changed', {
      agentId,
      status,
      timestamp: new Date(),
      ...updates,
    });
  }

  /**
   * Add agent activity record
   */
  private addAgentActivity(
    agentId: string,
    activity: 'started' | 'completed' | 'failed' | 'idle',
    workflowId?: string,
    duration?: number,
    error?: string
  ): void {
    this.initializeAgentStatus(agentId);

    const activities = this.agentActivities.get(agentId)!;

    activities.push({
      timestamp: new Date(),
      activity,
      workflowId,
      duration,
      error,
    });

    // Keep only last 100 activities per agent
    if (activities.length > 100) {
      activities.splice(0, activities.length - 100);
    }

    this.logger.debug(
      `Added activity '${activity}' for agent ${agentId}${
        workflowId ? ` (workflow: ${workflowId})` : ''
      }`
    );
  }

  /**
   * Update agent execution statistics
   */
  private updateAgentExecutionStats(
    agentId: string,
    duration: number,
    isError: boolean
  ): void {
    const agentStatusData = this.agentStatus.get(agentId);
    if (!agentStatusData) return;

    agentStatusData.executionCount++;
    agentStatusData.totalExecutionTime += duration;
    agentStatusData.averageExecutionTime =
      agentStatusData.totalExecutionTime / agentStatusData.executionCount;

    if (isError) {
      agentStatusData.errorCount++;
    }

    this.logger.debug(
      `Updated execution stats for agent ${agentId}: ${
        agentStatusData.executionCount
      } executions, ${agentStatusData.averageExecutionTime.toFixed(2)}ms avg`
    );
  }

  /**
   * Update general agent activity
   */
  private updateAgentActivity(
    agentId: string,
    activity: string,
    data?: any
  ): void {
    this.initializeAgentStatus(agentId);

    const agentStatusData = this.agentStatus.get(agentId)!;
    agentStatusData.lastActiveTime = new Date();

    this.logger.debug(`Agent ${agentId} activity: ${activity}`);
  }

  /**
   * Get agent status information
   */
  getAgentStatus(agentId: string): {
    status: 'idle' | 'busy' | 'error' | 'offline';
    isActive: boolean;
    lastActiveTime: Date;
    currentWorkflow?: string;
    currentTask?: string;
    executionCount: number;
    errorCount: number;
    averageExecutionTime: number;
    successRate: number;
  } | null {
    const statusData = this.agentStatus.get(agentId);
    if (!statusData) return null;

    const successRate =
      statusData.executionCount > 0
        ? (statusData.executionCount - statusData.errorCount) /
          statusData.executionCount
        : 0;

    return {
      ...statusData,
      successRate,
    };
  }

  /**
   * Get agent activity history
   */
  getAgentActivities(
    agentId: string,
    limit?: number
  ): Array<{
    timestamp: Date;
    activity: 'started' | 'completed' | 'failed' | 'idle';
    workflowId?: string;
    duration?: number;
    error?: string;
  }> {
    const activities = this.agentActivities.get(agentId) || [];

    const sortedActivities = [...activities].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    return limit ? sortedActivities.slice(0, limit) : sortedActivities;
  }

  /**
   * Mark agent as offline
   */
  markAgentOffline(agentId: string): void {
    this.updateAgentStatus(agentId, 'offline', {
      currentWorkflow: undefined,
      currentTask: undefined,
    });
    this.addAgentActivity(agentId, 'idle');
  }

  /**
   * Mark agent as online/available
   */
  markAgentOnline(agentId: string): void {
    this.updateAgentStatus(agentId, 'idle');
    this.addAgentActivity(agentId, 'idle');
  }

  /**
   * Get system-wide agent statistics
   */
  getAgentSystemStats(): {
    totalAgents: number;
    activeAgents: number;
    byStatus: Record<string, number>;
    totalExecutions: number;
    totalErrors: number;
    systemSuccessRate: number;
    averageSystemExecutionTime: number;
  } {
    const allAgents = this.agentRegistry.getAllAgents();
    const stats = {
      totalAgents: allAgents.length,
      activeAgents: 0,
      byStatus: {
        idle: 0,
        busy: 0,
        error: 0,
        offline: 0,
      },
      totalExecutions: 0,
      totalErrors: 0,
      systemSuccessRate: 0,
      averageSystemExecutionTime: 0,
    };

    let totalExecutionTime = 0;

    for (const agent of allAgents) {
      const statusData = this.agentStatus.get(agent.id);
      if (statusData) {
        stats.byStatus[statusData.status]++;
        if (statusData.isActive) {
          stats.activeAgents++;
        }
        stats.totalExecutions += statusData.executionCount;
        stats.totalErrors += statusData.errorCount;
        totalExecutionTime += statusData.totalExecutionTime;
      } else {
        stats.byStatus.offline++;
      }
    }

    stats.systemSuccessRate =
      stats.totalExecutions > 0
        ? (stats.totalExecutions - stats.totalErrors) / stats.totalExecutions
        : 0;

    stats.averageSystemExecutionTime =
      stats.totalExecutions > 0
        ? totalExecutionTime / stats.totalExecutions
        : 0;

    return stats;
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
    currentWorkflow?: string;
    currentTask?: string;
    executionCount: number;
    errorCount: number;
    successRate: number;
    averageExecutionTime: number;
    recentActivities: Array<{
      timestamp: Date;
      activity: string;
      workflowId?: string;
    }>;
    personality?: {
      color: string;
      description: string;
    };
  }> {
    const agents = this.agentRegistry.getAllAgents();

    return agents.map((agent) => {
      // Initialize agent status if not exists
      this.initializeAgentStatus(agent.id);

      const statusData = this.agentStatus.get(agent.id)!;
      const recentActivities = this.getAgentActivities(agent.id, 5).map(
        (activity) => ({
          timestamp: activity.timestamp,
          activity: activity.activity,
          workflowId: activity.workflowId,
        })
      );

      const successRate =
        statusData.executionCount > 0
          ? (statusData.executionCount - statusData.errorCount) /
            statusData.executionCount
          : 0;

      return {
        id: agent.id,
        name: agent.name,
        type: agent.constructor?.name || 'Unknown',
        status: statusData.status,
        capabilities: agent.capabilities || [],
        isActive: statusData.isActive,
        lastActiveTime: statusData.lastActiveTime,
        currentWorkflow: statusData.currentWorkflow,
        currentTask: statusData.currentTask,
        currentTools: Array.isArray(agent.metadata?.tools)
          ? agent.metadata.tools
          : [],
        executionCount: statusData.executionCount,
        errorCount: statusData.errorCount,
        successRate,
        averageExecutionTime: statusData.averageExecutionTime,
        recentActivities,
        personality: {
          color: this.getAgentColor(agent.id),
          description: agent.description,
        },
      };
    });
  }

  /**
   * Get a color for an agent based on its ID
   */
  private getAgentColor(agentId: string): string {
    const colors = [
      '#16A085',
      '#E74C3C',
      '#9B59B6',
      '#3498DB',
      '#F39C12',
      '#1ABC9C',
      '#E67E22',
      '#34495E',
    ];

    // Simple hash to get consistent color for same agent
    let hash = 0;
    for (let i = 0; i < agentId.length; i++) {
      hash = ((hash << 5) - hash + agentId.charCodeAt(i)) & 0xffffffff;
    }

    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Clear agent status and activity data for an agent
   */
  clearAgentData(agentId: string): void {
    this.agentStatus.delete(agentId);
    this.agentActivities.delete(agentId);
    this.logger.debug(`Cleared status and activity data for agent ${agentId}`);
  }

  /**
   * Clear all workflows (useful for testing)
   */
  clear(): void {
    this.workflows.clear();
    this.workflowProviders.clear();
    this.agentStatus.clear();
    this.agentActivities.clear();
    this.logger.debug('All workflows and agent data cleared from registry');
  }
}
