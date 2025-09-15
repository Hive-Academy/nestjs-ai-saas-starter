import { Injectable, Logger } from '@nestjs/common';
import { WorkflowManagerService } from '@hive-academy/langgraph-multi-agent';
import { HumanApprovalService } from '@hive-academy/langgraph-hitl';
import type { WorkflowResult } from '@hive-academy/langgraph-multi-agent';

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
  async executeCustomerSupportWorkflow(request: {
    ticket: {
      issue: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      category?: string;
      customerId?: string;
    };
  }): Promise<WorkflowResult> {
    try {
      this.logger.log(`Starting customer support workflow for ticket: ${request.ticket.issue}`);

      // Prepare initial workflow state
      const initialState = {
        ticket: request.ticket,
        status: 'analyzing',
        confidence: 0.0,
        supportResponse: null,
        approvalRequired: false,
        escalationLevel: 'tier1',
        metadata: {
          startTime: new Date(),
          priority: request.ticket.priority,
          category: request.ticket.category || 'general',
        },
      };

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
    request: {
      ticket: {
        issue: string;
        priority: 'low' | 'medium' | 'high' | 'urgent';
        category?: string;
        customerId?: string;
      };
    },
    onUpdate: (event: any) => void
  ): Promise<WorkflowResult> {
    const initialState = {
      ticket: request.ticket,
      status: 'analyzing',
      confidence: 0.0,
      supportResponse: null,
      approvalRequired: false,
      escalationLevel: 'tier1',
      metadata: {
        startTime: new Date(),
        priority: request.ticket.priority,
        category: request.ticket.category || 'general',
      },
    };

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

      return {
        status: instance.status,
        currentStep: instance.context?.metadata?.currentStep,
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
  async getPendingApprovals(userId: string): Promise<Array<{
    id: string;
    executionId: string;
    nodeId: string;
    message: string;
    priority: string;
    requestedAt: Date;
    expiresAt?: Date;
  }>> {
    try {
      const approvals = await this.humanApprovalService.getPendingApprovals(userId);
      
      return approvals.map(approval => ({
        id: approval.id,
        executionId: approval.executionId,
        nodeId: approval.nodeId,
        message: approval.message,
        priority: approval.options.riskThreshold || 'medium',
        requestedAt: approval.timestamps.requested,
        expiresAt: approval.timestamps.expires,
      }));
    } catch (error) {
      this.logger.error(`Error getting pending approvals for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get workflow statistics
   */
  getWorkflowStatistics(): {
    totalExecutions: number;
    activeInstances: number;
    successRate: number;
    averageExecutionTime: number;
  } {
    try {
      const stats = this.workflowManager.getExecutionStats();
      return {
        totalExecutions: stats.totalExecutions,
        activeInstances: stats.activeInstances,
        successRate: stats.successRate,
        averageExecutionTime: stats.averageExecutionTime,
      };
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
}