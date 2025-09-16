import { Injectable, Logger } from '@nestjs/common';
import { WorkflowManagerService } from '@hive-academy/langgraph-multi-agent';
import { HumanApprovalService } from '@hive-academy/langgraph-hitl';
import type { WorkflowResult } from '@hive-academy/langgraph-multi-agent';
import type { ApprovalRequestSummary, WorkflowExecutionStats, NormalizedTicketInput } from '../types';

/**
 * Customer Support Workflow Service
 * Handles business logic for customer support workflow operations
 */
@Injectable()
export class CustomerSupportWorkflowService {
  private readonly logger = new Logger(CustomerSupportWorkflowService.name);

  constructor(
    private readonly workflowManager: WorkflowManagerService,
    private readonly humanApprovalService: HumanApprovalService
  ) {}

  /**
   * Execute customer support workflow
   */
  async executeCustomerSupportWorkflow(request: { ticket: NormalizedTicketInput }): Promise<WorkflowResult> {
    try {
      this.logger.log(`Starting customer support workflow for ticket: ${request.ticket.issue}`);

      // Prepare initial workflow state
      const initialState = this.buildInitialState(request.ticket);

      // Execute customer support workflow
      const result = await this.workflowManager.executeWorkflow(
        'customer-support-workflow',
        initialState,
        {
          streaming: true,
          timeout: 600000, // 10 minutes
        }
      );

      this.logger.log(
        `Customer support workflow completed: ${result.success ? 'success' : 'failed'}`
      );

      return result;
    } catch (error) {
      this.logger.error('Error executing customer support workflow:', error);
      throw error;
    }
  }

  /**
   * Execute workflow with streaming updates
   */
  async executeWorkflowWithStreaming(
    request: { ticket: NormalizedTicketInput },
    onUpdate: (event: any) => void
  ): Promise<WorkflowResult> {
    const initialState = this.buildInitialState(request.ticket);

    return this.workflowManager.executeWorkflowWithStreaming(
      'customer-support-workflow',
      initialState,
      onUpdate,
      {
        streaming: true,
        timeout: 600000,
      }
    );
  }

  /**
   * Get workflow execution status
   */
  async getWorkflowStatus(instanceId: string): Promise<{
    status: string;
    currentStep?: string;
    progress?: number;
    estimatedCompletion?: Date;
  }> {
    try {
      const instance = this.workflowManager.getInstance(instanceId);

      if (!instance) {
        return { status: 'not_found' };
      }

      // context shape is not strictly typed here; use optional chaining
      const contextMeta: any = (instance as any).context?.metadata;
      return {
        status: instance.status,
        currentStep: contextMeta?.currentStep,
        progress: this.calculateProgress(instance),
        estimatedCompletion: this.estimateCompletion(instance),
      };
    } catch (error) {
      this.logger.error(`Error getting workflow status for ${instanceId}:`, error);
      return { status: 'error' };
    }
  }

  /**
   * Process manual approval for workflow
   */
  async processApproval(request: {
    executionId: string;
    nodeId: string;
    approved: boolean;
    approvedBy: string;
    feedback?: string;
  }): Promise<{
    success: boolean;
    shouldContinue?: boolean;
    error?: string;
  }> {
    try {
      this.logger.log(
        `Processing approval for execution ${request.executionId}, node ${request.nodeId}: ${
          request.approved ? 'approved' : 'rejected'
        }`
      );

      const result = await this.humanApprovalService.processApproval({
        executionId: request.executionId,
        nodeId: request.nodeId,
        approved: request.approved,
        approvedBy: request.approvedBy,
        feedback: request.feedback,
        timestamp: new Date(),
      });

      this.logger.log(
        `Approval processed: ${result.success ? 'success' : 'failed'}`
      );

      return result;
    } catch (error) {
      this.logger.error('Error processing approval:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get pending approvals for a user
   */
  async getPendingApprovals(userId: string): Promise<ApprovalRequestSummary[]> {
    try {
      const svc: unknown = this.humanApprovalService as unknown as { getPendingApprovals?: () => Promise<unknown[]> };
  if (!svc || typeof svc !== 'object' || !('getPendingApprovals' in (svc as any)) || typeof (svc as any).getPendingApprovals !== 'function') return [];
      const approvals: unknown[] = await (svc as any).getPendingApprovals();
      return approvals
        .map((a: unknown) => this.mapApproval(a))
        .filter((a): a is ApprovalRequestSummary => !!a);
    } catch (error) {
      this.logger.error(`Error getting pending approvals for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get workflow statistics
   */
  getWorkflowStatistics(): WorkflowExecutionStats {
    try {
      const mgr: unknown = this.workflowManager as unknown as { getExecutionStats?: () => unknown };
      const raw: unknown = mgr && typeof mgr === 'object' && 'getExecutionStats' in (mgr as any) && typeof (mgr as any).getExecutionStats === 'function'
        ? (mgr as any).getExecutionStats()
        : {};
      const stats: WorkflowExecutionStats = {
        totalExecutions: Number((raw as any).totalExecutions) || 0,
        activeInstances: Number((raw as any).activeInstances) || 0,
        successRate: Number((raw as any).successRate) || 0,
        averageExecutionTime: Number((raw as any).averageExecutionTime) || 0,
      };
      return stats;
    } catch (error) {
      this.logger.error('Error getting workflow statistics:', error);
      return {
        totalExecutions: 0,
        activeInstances: 0,
        successRate: 0,
        averageExecutionTime: 0,
      };
    }
  }

  /**
   * Cancel workflow execution
   */
  async cancelWorkflow(instanceId: string, reason?: string): Promise<boolean> {
    try {
      this.logger.log(`Cancelling workflow instance ${instanceId}${reason ? `: ${reason}` : ''}`);

      const cancelled = await this.workflowManager.cancelWorkflow(instanceId);

      if (cancelled) {
        this.logger.log(`Workflow instance ${instanceId} cancelled successfully`);
      } else {
        this.logger.warn(`Failed to cancel workflow instance ${instanceId}`);
      }

      return cancelled;
    } catch (error) {
      this.logger.error(`Error cancelling workflow ${instanceId}:`, error);
      return false;
    }
  }

  /**
   * Subscribe to workflow events
   */
  subscribeToWorkflowEvents(
    instanceId: string,
    callback: (event: {
      type: 'workflow_started' | 'workflow_progress' | 'workflow_completed' | 'workflow_failed' | 'node_executed';
      data: any;
      timestamp: number;
    }) => void
  ): { unsubscribe: () => void } {
    return this.workflowManager.subscribeToWorkflowEvents(instanceId, callback);
  }

  /**
   * Calculate workflow progress
   */
  private calculateProgress(instance: any): number {
    // Simple progress calculation based on workflow state
    if (!instance.result) return 0;

    const metadata = instance.result.metadata;
    if (!metadata) return 0;

    // Calculate based on duration vs expected duration
    const duration = metadata.duration || 0;
    const expectedDuration = 300000; // 5 minutes expected

    return Math.min(duration / expectedDuration, 1.0) * 100;
  }

  /**
   * Estimate completion time
   */
  private estimateCompletion(instance: any): Date | undefined {
    if (!instance.createdAt) return undefined;

    const startTime = instance.createdAt.getTime();
    const now = Date.now();
    const elapsed = now - startTime;

    // Estimate based on average execution time
    const averageTime = 300000; // 5 minutes average
    const estimatedTotal = Math.max(averageTime, elapsed * 1.5);

    return new Date(startTime + estimatedTotal);
  }

  // --- Internal helpers ---
  private buildInitialState(ticket: NormalizedTicketInput) {
    return {
      ticket,
      status: 'processing', // normalized value (was 'analyzing')
      confidence: 0.0,
      supportResponse: null as string | null,
      approvalRequired: false,
      escalationLevel: 'tier1',
      metadata: {
        startTime: new Date(),
        priority: ticket.priority,
        category: ticket.category || 'general',
      },
    };
  }

  private mapApproval(input: unknown): ApprovalRequestSummary | undefined {
    if (!input || typeof input !== 'object') return undefined;
    const i: any = input;
    if (!i.id) return undefined;
    return {
      id: String(i.id),
      executionId: String(i.executionId || ''),
      nodeId: String(i.nodeId || ''),
      message: String(i.message || ''),
      priority: String(i.options?.riskThreshold || 'medium'),
      requestedAt: i.timestamps?.requested instanceof Date ? i.timestamps.requested : new Date(),
      expiresAt: i.timestamps?.expires instanceof Date ? i.timestamps.expires : undefined,
    };
  }
}
