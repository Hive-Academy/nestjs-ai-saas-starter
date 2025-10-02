import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Agent Status Tracking Service
 * Handles agent status and activity tracking
 * Extracted from WorkflowRegistryService to follow SRP
 */
@Injectable()
export class AgentStatusTrackingService {
  private readonly logger = new Logger(AgentStatusTrackingService.name);

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

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.logger.debug('AgentStatusTrackingService initialized');
    this.setupAgentEventListeners();
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
  initializeAgentStatus(agentId: string): void {
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
    const allAgentIds = Array.from(this.agentStatus.keys());
    const stats = {
      totalAgents: allAgentIds.length,
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

    for (const agentId of allAgentIds) {
      const statusData = this.agentStatus.get(agentId);
      if (statusData) {
        stats.byStatus[statusData.status]++;
        if (statusData.isActive) {
          stats.activeAgents++;
        }
        stats.totalExecutions += statusData.executionCount;
        stats.totalErrors += statusData.errorCount;
        totalExecutionTime += statusData.totalExecutionTime;
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
   * Get all agent statuses
   */
  getAllAgentStatuses(): Record<
    string,
    {
      status: 'idle' | 'busy' | 'error' | 'offline';
      isActive: boolean;
      lastActiveTime: Date;
      currentWorkflow?: string;
      currentTask?: string;
      executionCount: number;
      errorCount: number;
      averageExecutionTime: number;
      successRate: number;
    }
  > {
    const result: Record<string, any> = {};

    for (const [agentId] of this.agentStatus) {
      const status = this.getAgentStatus(agentId);
      if (status) {
        result[agentId] = status;
      }
    }

    return result;
  }

  /**
   * Get agents by status
   */
  getAgentsByStatus(status: 'idle' | 'busy' | 'error' | 'offline'): string[] {
    const result: string[] = [];

    for (const [agentId, statusData] of this.agentStatus) {
      if (statusData.status === status) {
        result.push(agentId);
      }
    }

    return result;
  }

  /**
   * Get active agents with their current tasks
   */
  getActiveAgentsWithTasks(): Array<{
    agentId: string;
    currentWorkflow?: string;
    currentTask?: string;
    lastActiveTime: Date;
  }> {
    const result: Array<{
      agentId: string;
      currentWorkflow?: string;
      currentTask?: string;
      lastActiveTime: Date;
    }> = [];

    for (const [agentId, statusData] of this.agentStatus) {
      if (statusData.isActive) {
        result.push({
          agentId,
          currentWorkflow: statusData.currentWorkflow,
          currentTask: statusData.currentTask,
          lastActiveTime: statusData.lastActiveTime,
        });
      }
    }

    return result;
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
   * Clear all agent data
   */
  clearAllAgentData(): void {
    this.agentStatus.clear();
    this.agentActivities.clear();
    this.logger.debug('All agent status and activity data cleared');
  }
}
