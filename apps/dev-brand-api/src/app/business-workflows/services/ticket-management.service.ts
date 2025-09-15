import { Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { WorkflowManagerService } from '@hive-academy/langgraph-multi-agent';
import { CustomerSupportWorkflowService } from './customer-support-workflow.service';
import type {
  TicketRequest,
  StreamingResponse,
  PaginatedResponse,
} from '../types';

/**
 * Ticket Management Service
 * Handles all ticket-related operations and business logic
 */
@Injectable()
export class TicketManagementService {
  private readonly logger = new Logger(TicketManagementService.name);

  constructor(
    private readonly workflowManager: WorkflowManagerService,
    private readonly customerSupportWorkflowService: CustomerSupportWorkflowService
  ) {}

  /**
   * Submit a new support ticket for processing
   */
  async submitTicket(
    request: TicketRequest
  ): Promise<StreamingResponse<{ ticketId: string; executionId: string }>> {
    try {
      const ticketId = this.generateTicketId();
      
      const workflowRequest = {
        ticket: {
          issue: request.description,
          priority: (request.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
          category: request.category,
          customerId: request.customerId,
        },
      };

      const result = await this.customerSupportWorkflowService.executeCustomerSupportWorkflow(workflowRequest);

      return {
        success: result.success,
        data: {
          ticketId,
          executionId: result.metadata?.instanceId || 'unknown',
        },
        executionId: result.metadata?.instanceId || 'unknown',
        streaming: true,
        streamUrl: `/customer-support/tickets/${ticketId}/stream`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionId: '',
        streaming: false,
      };
    }
  }

  /**
   * Submit ticket with streaming support
   */
  async submitTicketWithStreaming(
    request: TicketRequest
  ): Promise<StreamingResponse<any>> {
    try {
      const progressUpdates: any[] = [];

      const workflowRequest = {
        ticket: {
          issue: request.description,
          priority: (request.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
          category: request.category,
          customerId: request.customerId,
        },
      };

      const result = await this.customerSupportWorkflowService.executeWorkflowWithStreaming(
        workflowRequest,
        (event) => {
          progressUpdates.push({
            timestamp: Date.now(),
            type: event.type,
            data: event.data,
          });
        }
      );

      return {
        success: result.success,
        data: {
          workflowResult: result.data,
          streamingUpdates: progressUpdates,
          capabilities: {
            workflowOrchestration:
              'Complete @Workflow system with lifecycle management',
            streamingSupport: 'Real-time progress updates',
            errorHandling: 'Built-in retry and error recovery',
          },
        },
        executionId: result.metadata?.instanceId || 'unknown',
        streaming: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionId: '',
        streaming: false,
      };
    }
  }

  /**
   * Get ticket status and details
   */
  async getTicket(ticketId: string) {
    try {
      // Find active workflow instance for this ticket
      const instances = this.workflowManager.getActiveInstances();
      const instance = instances.find(
        (i) => i.input?.ticketId === ticketId
      );

      if (!instance) {
        return {
          success: false,
          error: 'Ticket not found or workflow not active',
        };
      }

      const status = await this.customerSupportWorkflowService.getWorkflowStatus(instance.instanceId);

      return {
        success: true,
        data: {
          ticketId,
          status: status.status,
          progress: status.progress || this.calculateProgress(instance),
          currentStep: status.currentStep || 'unknown',
          executionId: instance.instanceId,
          startedAt: instance.createdAt,
          estimatedCompletion: status.estimatedCompletion || this.estimateCompletion(instance),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get workflow status for a ticket
   */
  async getWorkflowStatus(ticketId: string) {
    try {
      const instances = this.workflowManager.getActiveInstances();
      const instance = instances.find(
        (i) => i.input?.id === ticketId || i.input?.ticketId === ticketId
      );

      if (!instance) {
        return {
          success: true,
          data: {
            ticketId,
            status: 'not_found',
            progress: 0,
            instanceId: undefined,
            startedAt: undefined,
            metadata: undefined,
          },
        };
      }

      const status = await this.customerSupportWorkflowService.getWorkflowStatus(instance.instanceId);

      return {
        success: true,
        data: {
          ticketId,
          status: status.status,
          progress: status.progress || this.calculateProgress(instance),
          instanceId: instance.instanceId,
          startedAt: instance.createdAt,
          metadata: instance.metadata,
          estimatedCompletion: status.estimatedCompletion,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Server-Sent Events stream for real-time ticket updates
   */
  streamTicketUpdates(ticketId: string): Observable<MessageEvent> {
    return new Observable((observer) => {
      // Find the workflow instance for this ticket
      const instances = this.workflowManager.getActiveInstances();
      const instance = instances.find(
        (i) => i.input?.ticketId === ticketId
      );

      if (!instance) {
        observer.error(new Error('Ticket workflow not found'));
        return;
      }

      // Subscribe to workflow events
      const subscription = this.customerSupportWorkflowService.subscribeToWorkflowEvents(
        instance.instanceId,
        (event: {
          type: 'workflow_started' | 'workflow_progress' | 'workflow_completed' | 'workflow_failed' | 'node_executed';
          data: any;
          timestamp: number;
        }) => {
          observer.next({
            type: event.type,
            data: {
              ticketId,
              ...event.data,
              timestamp: Date.now(),
            },
          } as MessageEvent);

          // Complete stream when workflow completes
          if (event.type === 'workflow_completed' || event.type === 'workflow_failed') {
            observer.complete();
          }
        }
      );

      // Cleanup on unsubscribe
      return () => {
        if (subscription?.unsubscribe) {
          subscription.unsubscribe();
        }
      };
    });
  }

  /**
   * Handle human approval for high-risk tickets
   */
  async approveTicket(
    ticketId: string,
    approval: { approved: boolean; approvedBy: string; feedback?: string }
  ) {
    try {
      // Find the workflow instance for this ticket
      const instances = this.workflowManager.getActiveInstances();
      const instance = instances.find(
        (i) => i.input?.ticketId === ticketId
      );

      if (!instance) {
        return {
          success: false,
          error: 'Ticket workflow not found',
        };
      }

      // Process approval through workflow service
      const result = await this.customerSupportWorkflowService.processApproval({
        executionId: instance.instanceId,
        nodeId: 'approval-required',
        approved: approval.approved,
        approvedBy: approval.approvedBy,
        feedback: approval.feedback,
      });

      if (result.success && approval.approved) {
        // Resume workflow execution with approval
        await this.workflowManager.resumeWorkflow(
          instance.instanceId,
          `Approved by ${approval.approvedBy}`
        );
      }

      return {
        success: result.success,
        data: {
          ticketId,
          approved: approval.approved,
          approvedBy: approval.approvedBy,
          processedAt: new Date().toISOString(),
          workflowResumed: result.success && approval.approved,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get active tickets (admin endpoint)
   */
  async getActiveTickets(
    page = 1,
    limit = 20,
    status?: string,
    priority?: string
  ): Promise<PaginatedResponse<any>> {
    try {
      const ticketData = await this.getActiveTicketsFromWorkflows(
        page,
        limit,
        status,
        priority
      );

      return {
        data: ticketData.tickets,
        total: ticketData.total,
        page,
        limit,
        hasNext: page * limit < ticketData.total,
        hasPrev: page > 1,
      };
    } catch (error) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        hasNext: false,
        hasPrev: false,
      };
    }
  }

  // Private helper methods

  private generateTicketId(): string {
    return `TICKET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateProgress(instance: any): number {
    // Calculate progress based on workflow status and execution metadata
    switch (instance.status) {
      case 'running':
        const elapsedTime = Date.now() - instance.createdAt.getTime();
        const estimatedDuration = 300000; // 5 minutes estimated
        return Math.min(90, (elapsedTime / estimatedDuration) * 100);
      case 'completed':
        return 100;
      case 'failed':
        return instance.metadata?.progress || 0;
      case 'paused':
        return instance.metadata?.progress || 50;
      default:
        return 0;
    }
  }

  private estimateCompletion(instance: any): number {
    const elapsedTime = Date.now() - instance.createdAt.getTime();
    const progress = this.calculateProgress(instance);
    
    if (progress === 0) return Date.now() + 300000; // 5 minutes default
    
    const estimatedTotal = (elapsedTime / progress) * 100;
    return instance.createdAt.getTime() + estimatedTotal;
  }

  private async getActiveTicketsFromWorkflows(
    page: number,
    limit: number,
    status?: string,
    priority?: string
  ) {
    try {
      // Get active workflow instances
      const instances = this.workflowManager.getActiveInstances();
      
      // Filter customer support workflows
      let supportTickets = instances
        .filter(instance => instance.input?.ticketId)
        .map(instance => ({
          id: instance.input.ticketId,
          customerId: instance.input.ticket?.customerId,
          title: instance.input.ticket?.title,
          description: instance.input.ticket?.description,
          category: instance.input.ticket?.category,
          priority: instance.input.ticket?.priority,
          status: this.mapWorkflowStatusToTicketStatus(instance.status),
          customerTier: instance.input.ticket?.customerTier,
          createdAt: instance.createdAt.toISOString(),
          updatedAt: instance.updatedAt?.toISOString() || instance.createdAt.toISOString(),
          executionId: instance.instanceId,
          progress: this.calculateProgress(instance),
        }));

      // Apply filters
      if (status) {
        supportTickets = supportTickets.filter(ticket => ticket.status === status);
      }
      if (priority) {
        supportTickets = supportTickets.filter(ticket => ticket.priority === priority);
      }

      // Pagination
      const total = supportTickets.length;
      const startIndex = (page - 1) * limit;
      const paginatedTickets = supportTickets.slice(startIndex, startIndex + limit);

      return { tickets: paginatedTickets, total };
    } catch (error) {
      console.error('Error getting tickets from workflows:', error);
      return { tickets: [], total: 0 };
    }
  }

  private mapWorkflowStatusToTicketStatus(workflowStatus: string): string {
    switch (workflowStatus) {
      case 'running':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'paused':
        return 'pending_approval';
      default:
        return 'open';
    }
  }
}