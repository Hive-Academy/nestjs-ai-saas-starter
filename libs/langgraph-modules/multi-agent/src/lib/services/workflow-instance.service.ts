import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  WorkflowInstance,
  WorkflowStatus,
  WorkflowResult,
  WorkflowConfig,
  WorkflowContext,
  AgentDefinition,
} from '../interfaces/multi-agent.interface';
import { WorkflowRegistryService } from './workflow-registry.service';
import { AgentRegistryService } from './agent-registry.service';
import { MultiAgentCoordinatorService } from './multi-agent-coordinator.service';
import { WorkflowCheckpointService } from './workflow-checkpoint.service';

/**
 * Workflow Instance Service
 * Manages workflow instance creation, tracking, and lifecycle
 */
@Injectable()
export class WorkflowInstanceService {
  private readonly logger = new Logger(WorkflowInstanceService.name);
  private readonly activeInstances = new Map<string, WorkflowInstance>();
  private readonly executionHistory = new Map<string, WorkflowInstance[]>();

  constructor(
    private readonly workflowRegistry: WorkflowRegistryService,
    private readonly agentRegistry: AgentRegistryService,
    private readonly coordinator: MultiAgentCoordinatorService,
    private readonly checkpointService: WorkflowCheckpointService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.logger.debug('WorkflowInstanceService initialized');
  }

  /**
   * Create a new workflow instance
   */
  async createInstance(
    workflowId: string,
    instanceId: string,
    input: any,
    configOverride?: Partial<WorkflowConfig>
  ): Promise<WorkflowInstance> {
    const workflow = this.workflowRegistry.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow '${workflowId}' not found`);
    }

    // Auto-enable checkpointing if adapter is available
    const autoCheckpointing = this.checkpointService.isCheckpointingAvailable();

    // Merge configuration with automatic checkpointing
    const config: WorkflowConfig = {
      timeout: 300000, // 5 minutes default
      checkpointing: autoCheckpointing,
      streaming: false,
      retry: {
        enabled: false,
        maxAttempts: 1,
        backoffMs: 1000,
      },
      ...workflow.config,
      ...configOverride,
      // Thread configuration for checkpointing
      ...(autoCheckpointing && {
        thread_id: instanceId,
        checkpoint_ns: `${workflowId}-checkpoints`,
      }),
    };

    // Validate required agents
    if (workflow.requiredAgents) {
      const missingAgents = workflow.requiredAgents.filter(
        (agentId) => !this.agentRegistry.hasAgent(agentId)
      );

      if (missingAgents.length > 0) {
        throw new Error(
          `Required agents not available: ${missingAgents.join(', ')}`
        );
      }
    }

    // Build agents map
    const agents = new Map<string, AgentDefinition>();
    if (workflow.requiredAgents) {
      for (const agentId of workflow.requiredAgents) {
        const agent = this.agentRegistry.getAgent(agentId);
        if (agent) {
          agents.set(agentId, agent);
        }
      }
    }

    // Create execution context
    const context: WorkflowContext = {
      instanceId,
      agents,
      tools: [], // TODO: Get tools from registry when available
      config,
      logger: this.logger,
      coordinator: this.coordinator,
    };

    // Create workflow instance
    const instance: WorkflowInstance = {
      instanceId,
      workflowId,
      status: WorkflowStatus.PENDING,
      input,
      createdAt: new Date(),
      updatedAt: new Date(),
      context,
    };

    // Validate input against schema if provided
    if (workflow.inputSchema) {
      try {
        if (typeof workflow.inputSchema.validate === 'function') {
          workflow.inputSchema.validate(input);
        }
      } catch (error) {
        throw new Error(`Input validation failed: ${error}`);
      }
    }

    // Store instance
    this.activeInstances.set(instanceId, instance);

    this.logger.debug(
      `Created workflow instance ${instanceId} for workflow ${workflowId}`
    );

    return instance;
  }

  /**
   * Update instance status
   */
  updateInstanceStatus(
    instanceId: string,
    status: WorkflowStatus,
    result?: WorkflowResult
  ): void {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) {
      this.logger.warn(`Instance ${instanceId} not found for status update`);
      return;
    }

    instance.status = status;
    instance.updatedAt = new Date();
    if (result) {
      instance.result = result;
    }

    // Emit status change event
    this.eventEmitter.emit('workflow.status.changed', {
      instanceId,
      workflowId: instance.workflowId,
      status,
      result,
    });

    // Move to history if completed/failed/cancelled
    if (
      [
        WorkflowStatus.COMPLETED,
        WorkflowStatus.FAILED,
        WorkflowStatus.CANCELLED,
      ].includes(status)
    ) {
      this.moveToHistory(instance);
    }
  }

  /**
   * Get active workflow instances
   */
  getActiveInstances(): WorkflowInstance[] {
    return Array.from(this.activeInstances.values());
  }

  /**
   * Get workflow instance by ID
   */
  getInstance(instanceId: string): WorkflowInstance | null {
    return this.activeInstances.get(instanceId) || null;
  }

  /**
   * Cancel workflow execution
   */
  async cancelWorkflow(instanceId: string): Promise<boolean> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) {
      return false;
    }

    instance.status = WorkflowStatus.CANCELLED;
    instance.updatedAt = new Date();

    this.eventEmitter.emit('workflow.cancelled', {
      instanceId,
      workflowId: instance.workflowId,
    });

    this.moveToHistory(instance);

    this.logger.log(`Workflow instance ${instanceId} cancelled`);
    return true;
  }

  /**
   * Get execution history for a workflow
   */
  getWorkflowHistory(workflowId: string): WorkflowInstance[] {
    return this.executionHistory.get(workflowId) || [];
  }

  /**
   * Get all execution history
   */
  getAllHistory(): WorkflowInstance[] {
    return Array.from(this.executionHistory.values()).flat();
  }

  /**
   * Move instance to history
   */
  private moveToHistory(instance: WorkflowInstance): void {
    // Remove from active instances
    this.activeInstances.delete(instance.instanceId);

    // Add to history
    const history = this.executionHistory.get(instance.workflowId) || [];
    history.push(instance);

    // Keep only last 100 executions per workflow
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }

    this.executionHistory.set(instance.workflowId, history);
  }

  /**
   * Clear all instances (useful for testing)
   */
  clear(): void {
    this.activeInstances.clear();
    this.executionHistory.clear();
    this.logger.debug('All workflow instances cleared');
  }

  /**
   * Get instance statistics
   */
  getStatistics(): {
    activeCount: number;
    totalExecutions: number;
    byStatus: Record<WorkflowStatus, number>;
    byWorkflow: Record<string, number>;
  } {
    const allHistory = this.getAllHistory();
    const active = this.getActiveInstances();

    const byStatus: Record<WorkflowStatus, number> = {
      [WorkflowStatus.PENDING]: 0,
      [WorkflowStatus.RUNNING]: 0,
      [WorkflowStatus.COMPLETED]: 0,
      [WorkflowStatus.FAILED]: 0,
      [WorkflowStatus.CANCELLED]: 0,
      [WorkflowStatus.PAUSED]: 0,
    };

    const byWorkflow: Record<string, number> = {};

    // Count active instances
    for (const instance of active) {
      byStatus[instance.status]++;
      byWorkflow[instance.workflowId] =
        (byWorkflow[instance.workflowId] || 0) + 1;
    }

    // Count historical instances
    for (const instance of allHistory) {
      byStatus[instance.status]++;
      byWorkflow[instance.workflowId] =
        (byWorkflow[instance.workflowId] || 0) + 1;
    }

    return {
      activeCount: active.length,
      totalExecutions: active.length + allHistory.length,
      byStatus,
      byWorkflow,
    };
  }
}
