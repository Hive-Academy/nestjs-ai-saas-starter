import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { WorkflowManagerService } from '@hive-academy/langgraph-multi-agent';
import { HumanApprovalService } from '@hive-academy/langgraph-hitl';
import { BusinessMetricsService } from '../services/business-metrics.service';
import { KnowledgeBaseService } from '../services/knowledge-base.service';
import type {
  TicketRequest,
  CustomerSupportMetrics,
  BusinessImpact,
  KnowledgeSearchQuery,
  StreamingResponse,
  PaginatedResponse,
} from '../types';

/**
 * Customer Support Controller
 * RESTful API endpoints for the Customer Support Automation System
 * Includes streaming endpoints for real-time updates
 */
@Controller('customer-support')
export class CustomerSupportController {
  constructor(
    private readonly workflowManager: WorkflowManagerService,
    private readonly hitlService: HumanApprovalService,
    private readonly metricsService: BusinessMetricsService,
    private readonly knowledgeBaseService: KnowledgeBaseService
  ) {}

  /**
   * Submit a new support ticket for processing
   */
  @Post('tickets')
  async submitTicket(
    @Body() request: TicketRequest
  ): Promise<StreamingResponse<{ ticketId: string; executionId: string }>> {
    try {
      // Execute workflow using WorkflowManagerService
      const result = await this.workflowManager.executeWorkflow(
        'customer-support-automation',
        request,
        {
          streaming: true,
          timeout: 600000,
        }
      );

      // Generate unique identifiers
      const ticketId = this.generateTicketId();
      const executionId = result.metadata?.instanceId || ticketId;

      return {
        success: result.success,
        data: {
          ticketId: result.data?.ticketId || ticketId,
          executionId,
          workflowResult: result.data,
        },
        executionId,
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
   * NEW: Submit ticket with streaming support
   */
  @Post('tickets/streaming')
  async submitTicketWithStreaming(
    @Body() request: TicketRequest
  ): Promise<StreamingResponse<any>> {
    try {
      const progressUpdates: any[] = [];

      const result = await this.workflowManager.executeWorkflowWithStreaming(
        'customer-support-automation',
        request,
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
  @Get('tickets/:ticketId')
  async getTicket(@Param('ticketId') ticketId: string) {
    try {
      // In a real implementation, this would fetch from a database/state store
      return {
        success: true,
        data: {
          ticketId,
          status: 'processing',
          progress: 45,
          currentStep: 'analysis',
          estimatedCompletion: Date.now() + 300000, // 5 minutes from now
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
   * NEW: Get workflow status for a ticket
   */
  @Get('workflows/status/:ticketId')
  async getWorkflowStatus(@Param('ticketId') ticketId: string) {
    try {
      const instances = this.workflowManager.getActiveInstances();
      const instance = instances.find(
        (i) => i.input?.id === ticketId || i.input?.ticketId === ticketId
      );

      return {
        success: true,
        data: {
          ticketId,
          status: instance?.status || 'not_found',
          progress: instance ? this.calculateProgress(instance) : 0,
          instanceId: instance?.instanceId,
          startedAt: instance?.startedAt,
          metadata: instance?.metadata,
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
  @Sse('tickets/:ticketId/stream')
  streamTicketUpdates(
    @Param('ticketId') ticketId: string
  ): Observable<MessageEvent> {
    // In a real implementation, this would connect to the streaming service
    return new Observable((observer) => {
      // Simulate streaming updates
      let progress = 10;
      const interval = setInterval(() => {
        if (progress >= 100) {
          observer.next({
            type: 'completion',
            data: { ticketId, progress: 100, status: 'completed' },
          } as MessageEvent);
          observer.complete();
          clearInterval(interval);
          return;
        }

        // Send progress updates
        observer.next({
          type: 'progress',
          data: {
            ticketId,
            progress,
            message: this.getProgressMessage(progress),
            timestamp: Date.now(),
          },
        } as MessageEvent);

        progress += Math.random() * 20;
      }, 1000);

      // Cleanup on unsubscribe
      return () => clearInterval(interval);
    });
  }

  /**
   * Handle human approval for high-risk tickets
   */
  @Put('tickets/:ticketId/approve')
  async approveTicket(
    @Param('ticketId') ticketId: string,
    @Body()
    approval: { approved: boolean; approvedBy: string; feedback?: string }
  ) {
    try {
      // In a real implementation, this would update the workflow state
      // and continue the workflow execution
      const result = {
        ticketId,
        approved: approval.approved,
        approvedBy: approval.approvedBy,
        processedAt: new Date().toISOString(),
      };

      if (approval.approved) {
        // Continue workflow execution
        console.log(`Ticket ${ticketId} approved by ${approval.approvedBy}`);
      } else {
        // Send back for revision
        console.log(
          `Ticket ${ticketId} rejected by ${approval.approvedBy}: ${approval.feedback}`
        );
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get available agents in the customer support system
   */
  @Get('agents')
  async getAvailableAgents() {
    try {
      const agents = [
        {
          id: 'customer-support-agent',
          name: 'Customer Support Agent',
          type: 'specialist',
          status: 'idle',
          position: { x: -5, y: 3, z: 2 },
          capabilities: [
            'ticket-analysis',
            'sentiment-analysis',
            'solution-generation',
            'knowledge-base-search',
            'escalation-detection',
          ],
          isActive: false,
          lastActiveTime: new Date(),
          currentTools: [],
          personality: {
            color: '#16A085',
            description:
              'Customer Support Agent - AI-powered ticket processing and customer assistance',
          },
        },
        {
          id: 'escalation-coordinator',
          name: 'Escalation Coordinator',
          type: 'coordinator',
          status: 'idle',
          position: { x: 3, y: 5, z: -1 },
          capabilities: [
            'risk-assessment',
            'approval-coordination',
            'human-handoff',
            'priority-management',
          ],
          isActive: false,
          lastActiveTime: new Date(),
          currentTools: [],
          personality: {
            color: '#E74C3C',
            description:
              'Escalation Coordinator - Manages high-risk and complex support cases',
          },
        },
        {
          id: 'quality-assurance',
          name: 'Quality Assurance Agent',
          type: 'analyst',
          status: 'idle',
          position: { x: 0, y: -4, z: 3 },
          capabilities: [
            'response-validation',
            'quality-scoring',
            'improvement-suggestions',
            'metrics-tracking',
          ],
          isActive: false,
          lastActiveTime: new Date(),
          currentTools: [],
          personality: {
            color: '#9B59B6',
            description:
              'Quality Assurance Agent - Ensures high-quality customer support responses',
          },
        },
      ];

      return {
        success: true,
        data: agents,
        total: agents.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: [],
      };
    }
  }

  /**
   * Get customer support metrics
   */
  @Get('metrics')
  async getMetrics(
    @Query('timeRange') timeRange?: 'day' | 'week' | 'month' | 'quarter'
  ): Promise<CustomerSupportMetrics> {
    return await this.metricsService.calculateRealTimeMetrics();
  }

  /**
   * Get business impact analysis
   */
  @Get('metrics/business-impact')
  async getBusinessImpact(
    @Query('timeRange') timeRange?: 'day' | 'week' | 'month' | 'quarter'
  ): Promise<BusinessImpact> {
    return await this.metricsService.getBusinessImpact(timeRange || 'month');
  }

  /**
   * Get metrics for a specific customer
   */
  @Get('customers/:customerId/metrics')
  async getCustomerMetrics(@Param('customerId') customerId: string) {
    return await this.metricsService.getCustomerMetrics(customerId);
  }

  /**
   * Search knowledge base
   */
  @Post('knowledge-base/search')
  async searchKnowledgeBase(@Body() query: KnowledgeSearchQuery) {
    try {
      const results = await this.knowledgeBaseService.searchKnowledgeBase(
        query
      );
      return {
        success: true,
        data: results,
        total: results.length,
        query: query.query,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: [],
      };
    }
  }

  /**
   * Get knowledge base analytics
   */
  @Get('knowledge-base/analytics')
  async getKnowledgeBaseAnalytics() {
    try {
      const analytics =
        await this.knowledgeBaseService.getKnowledgeBaseAnalytics();
      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Add feedback for knowledge articles
   */
  @Put('knowledge-base/articles/:articleId/feedback')
  async provideFeedback(
    @Param('articleId') articleId: string,
    @Body() feedback: { helpful: boolean; comment?: string }
  ) {
    try {
      await this.knowledgeBaseService.updateArticleEffectiveness(
        articleId,
        feedback.helpful
      );
      return {
        success: true,
        message: 'Feedback recorded successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ===== USER INTERRUPTION ENDPOINTS =====
  /**
   * 🚀 DYNAMIC USER INTERRUPTION SYSTEM
   *
   * These endpoints provide real-time user interruption capabilities during AI agent execution.
   * Users can pause workflows, inject input, ask questions, request clarifications, and resume execution
   * with dynamic context preservation and workflow state management.
   *
   * Key Features:
   * - Real-time workflow interruption and resumption
   * - Dynamic user input injection with context preservation
   * - Multiple interruption types (questions, clarifications, corrections, approvals)
   * - Workflow pause/resume with state persistence
   * - Integration with WebSocket streaming for real-time notifications
   * - Persistent audit trail via Neo4j interruption storage
   *
   * Endpoints:
   * - POST /interruptions/question - Interrupt with a user question
   * - POST /interruptions/clarification - Request clarification from user
   * - PUT /interruptions/:id/respond - Respond to an interruption
   * - GET /interruptions/:executionId - Get active interruptions
   * - PUT /interruptions/:id/cancel - Cancel an interruption
   * - POST /interruptions/dynamic - General-purpose interruption request
   * - POST /workflows/:id/inject-input - Inject input and resume execution
   */

  /**
   * Interrupt agent execution with a user question
   */
  @Post('interruptions/question')
  async interruptWithQuestion(
    @Body()
    request: {
      executionId: string;
      nodeId?: string;
      question: string;
      userId?: string;
      urgency?: 'low' | 'medium' | 'high';
    }
  ) {
    try {
      const interruptionId = await this.hitlService.interruptAgentWithQuestion(
        request.executionId,
        request.nodeId || 'current',
        request.question
      );

      // Optionally pause workflow for user input
      if (request.urgency === 'high') {
        await this.workflowManager.pauseWorkflow(
          request.executionId,
          `User question: ${request.question}`
        );
      }

      return {
        success: true,
        data: {
          interruptionId,
          executionId: request.executionId,
          message: 'Agent interrupted successfully',
          status: 'awaiting_response',
          createdAt: new Date().toISOString(),
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
   * Request clarification from user during agent execution
   */
  @Post('interruptions/clarification')
  async requestClarification(
    @Body()
    request: {
      executionId: string;
      nodeId?: string;
      clarificationRequest: string;
      context?: Record<string, unknown>;
    }
  ) {
    try {
      const interruptionId = await this.hitlService.requestClarification(
        request.executionId,
        request.nodeId || 'current',
        request.clarificationRequest
      );

      // Always pause workflow when clarification is needed
      await this.workflowManager.pauseWorkflow(
        request.executionId,
        `Clarification needed: ${request.clarificationRequest}`
      );

      return {
        success: true,
        data: {
          interruptionId,
          executionId: request.executionId,
          message: 'Clarification request created',
          clarificationRequest: request.clarificationRequest,
          status: 'awaiting_clarification',
          context: request.context,
          createdAt: new Date().toISOString(),
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
   * Respond to a user interruption
   */
  @Put('interruptions/:interruptionId/respond')
  async respondToInterruption(
    @Param('interruptionId') interruptionId: string,
    @Body()
    response: {
      response: string;
      continueExecution?: boolean;
      userId?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    try {
      const result = await this.hitlService.handleUserInterruptionResponse({
        interruptionId,
        response: response.response,
        continueExecution: response.continueExecution ?? true,
        timestamp: new Date(),
        metadata: {
          userId: response.userId,
          responseLength: response.response.length,
          ...response.metadata,
        },
      });

      // Resume workflow if requested and interruption was successfully processed
      if (
        result.success &&
        result.shouldContinue &&
        response.continueExecution
      ) {
        const interruption = await this.hitlService.getActiveUserInterruptions(
          result.executionId || ''
        );
        if (interruption.length > 0) {
          await this.workflowManager.resumeWorkflow(
            result.executionId!,
            response.response
          );
        }
      }

      return {
        success: result.success,
        data: {
          interruptionId,
          processed: result.success,
          shouldContinue: result.shouldContinue,
          workflowResumed: response.continueExecution && result.shouldContinue,
          updatedState: result.updatedState,
          error: result.error,
          processedAt: new Date().toISOString(),
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
   * Get active user interruptions for an execution
   */
  @Get('interruptions/:executionId')
  async getActiveInterruptions(@Param('executionId') executionId: string) {
    try {
      const interruptions = await this.hitlService.getActiveUserInterruptions(
        executionId
      );

      return {
        success: true,
        data: {
          executionId,
          interruptions: interruptions,
          count: interruptions.length,
          hasActiveInterruptions: interruptions.length > 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: {
          executionId,
          interruptions: [],
          count: 0,
          hasActiveInterruptions: false,
        },
      };
    }
  }

  /**
   * Cancel a user interruption
   */
  @Put('interruptions/:interruptionId/cancel')
  async cancelInterruption(
    @Param('interruptionId') interruptionId: string,
    @Body() request: { reason?: string; userId?: string }
  ) {
    try {
      const cancelled = await this.hitlService.cancelUserInterruption(
        interruptionId
      );

      return {
        success: cancelled,
        data: {
          interruptionId,
          cancelled,
          reason: request.reason || 'User cancelled',
          cancelledBy: request.userId,
          cancelledAt: new Date().toISOString(),
        },
        message: cancelled
          ? 'Interruption cancelled successfully'
          : 'Failed to cancel interruption',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Request dynamic user interruption during workflow execution
   */
  @Post('interruptions/dynamic')
  async requestUserInterruption(
    @Body()
    request: {
      executionId: string;
      nodeId?: string;
      type:
        | 'question'
        | 'clarification'
        | 'input_request'
        | 'approval_request'
        | 'correction';
      message: string;
      pauseWorkflow?: boolean;
      timeoutMs?: number;
      urgency?: 'low' | 'medium' | 'high';
      metadata?: Record<string, unknown>;
    }
  ) {
    try {
      const interruptionId = await this.hitlService.requestUserInterruption({
        executionId: request.executionId,
        nodeId: request.nodeId || 'current',
        type: request.type,
        message: request.message,
        metadata: {
          urgency: request.urgency || 'medium',
          timeoutMs: request.timeoutMs || 300000, // 5 minutes default
          source: 'rest_api',
          ...request.metadata,
        },
      });

      // Pause workflow if requested
      if (request.pauseWorkflow !== false) {
        await this.workflowManager.pauseWorkflow(
          request.executionId,
          `User interruption: ${request.type} - ${request.message}`
        );
      }

      return {
        success: true,
        data: {
          interruptionId,
          executionId: request.executionId,
          type: request.type,
          message: request.message,
          workflowPaused: request.pauseWorkflow !== false,
          estimatedResumeTime: new Date(
            Date.now() + (request.timeoutMs || 300000)
          ),
          status: 'active',
          createdAt: new Date().toISOString(),
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
   * Inject user input during workflow execution
   */
  @Post('workflows/:executionId/inject-input')
  async injectUserInput(
    @Param('executionId') executionId: string,
    @Body()
    request: {
      input: string;
      nodeId?: string;
      resumeExecution?: boolean;
      inputType?: 'text' | 'selection' | 'correction' | 'approval';
      metadata?: Record<string, unknown>;
    }
  ) {
    try {
      // Create an interruption request for input injection
      const interruptionId = await this.hitlService.requestUserInterruption({
        executionId,
        nodeId: request.nodeId || 'current',
        type: 'input_request',
        message: `User input: ${request.input}`,
        metadata: {
          inputType: request.inputType || 'text',
          source: 'input_injection',
          ...request.metadata,
        },
      });

      // Immediately respond with the provided input
      const result = await this.hitlService.handleUserInterruptionResponse({
        interruptionId,
        response: request.input,
        continueExecution: request.resumeExecution !== false,
        timestamp: new Date(),
        metadata: {
          injected: true,
          inputType: request.inputType || 'text',
        },
      });

      // Resume workflow with injected input if successful
      if (
        result.success &&
        result.shouldContinue &&
        request.resumeExecution !== false
      ) {
        await this.workflowManager.resumeWorkflow(executionId, request.input);
      }

      return {
        success: result.success,
        data: {
          executionId,
          interruptionId,
          inputInjected: result.success,
          workflowResumed:
            result.success &&
            result.shouldContinue &&
            request.resumeExecution !== false,
          input: request.input,
          inputType: request.inputType || 'text',
          processedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ===== END USER INTERRUPTION ENDPOINTS =====

  /**
   * Get active tickets (admin endpoint)
   */
  @Get('admin/tickets')
  async getActiveTickets(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('priority') priority?: string
  ): Promise<PaginatedResponse<any>> {
    try {
      // In a real implementation, this would query the database
      const mockTickets = this.generateMockTickets(
        page,
        limit,
        status,
        priority
      );

      return {
        data: mockTickets.tickets,
        total: mockTickets.total,
        page,
        limit,
        hasNext: page * limit < mockTickets.total,
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

  /**
   * Server-Sent Events stream for real-time metrics
   */
  @Sse('metrics/stream')
  streamMetrics(): Observable<MessageEvent> {
    return new Observable((observer) => {
      const interval = setInterval(async () => {
        try {
          const metrics = await this.metricsService.calculateRealTimeMetrics();
          observer.next({
            type: 'metrics',
            data: metrics,
          } as MessageEvent);
        } catch (error) {
          observer.error(error);
        }
      }, 5000); // Update every 5 seconds

      return () => clearInterval(interval);
    });
  }

  /**
   * Initialize the knowledge base with sample data
   */
  @Post('admin/knowledge-base/seed')
  async seedKnowledgeBase() {
    try {
      await this.knowledgeBaseService.initializeCollections();
      await this.knowledgeBaseService.seedKnowledgeBase();

      return {
        success: true,
        message: 'Knowledge base initialized and seeded successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Private helper methods

  private generateTicketId(): string {
    return `TICKET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateProgress(instance: any): number {
    // Simple progress calculation based on workflow status
    switch (instance.status) {
      case 'running':
        return Math.min(90, (Date.now() - instance.startedAt) / 1000); // Estimate based on elapsed time
      case 'completed':
        return 100;
      case 'failed':
        return instance.metadata?.progress || 0;
      default:
        return 0;
    }
  }

  private getProgressMessage(progress: number): string {
    if (progress < 20) return 'Initializing ticket processing...';
    if (progress < 40) return 'Analyzing ticket with AI...';
    if (progress < 60) return 'Searching knowledge base...';
    if (progress < 80) return 'Generating response...';
    if (progress < 95) return 'Finalizing response...';
    return 'Processing complete!';
  }

  private generateMockTickets(
    page: number,
    limit: number,
    status?: string,
    priority?: string
  ) {
    // Generate mock ticket data for demo
    const totalTickets = 150;
    const startIndex = (page - 1) * limit;

    const tickets = [];
    for (let i = 0; i < Math.min(limit, totalTickets - startIndex); i++) {
      const ticketId = `TICKET_${Date.now() - i * 1000}_${Math.random()
        .toString(36)
        .substr(2, 6)}`;
      tickets.push({
        id: ticketId,
        customerId: `CUST_${Math.floor(Math.random() * 1000)}`,
        title: `Sample Support Ticket ${startIndex + i + 1}`,
        description:
          'This is a sample ticket description for demonstration purposes.',
        category: ['technical', 'billing', 'product', 'general'][
          Math.floor(Math.random() * 4)
        ],
        priority:
          priority ||
          ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        status:
          status ||
          ['open', 'processing', 'completed'][Math.floor(Math.random() * 3)],
        customerTier: ['basic', 'premium', 'enterprise'][
          Math.floor(Math.random() * 3)
        ],
        createdAt: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return { tickets, total: totalTickets };
  }
}
