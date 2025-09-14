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
import { CustomerSupportWorkflow } from '../workflows/customer-support.workflow';
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
    private readonly supportWorkflow: CustomerSupportWorkflow,
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
      // Initialize the workflow
      const initialState = await this.supportWorkflow.processTicket(request);
      const executionId = initialState.ticketId; // Use ticketId as executionId

      // Execute the real workflow steps
      this.executeRealWorkflow(initialState);

      return {
        success: true,
        data: {
          ticketId: initialState.ticketId,
          executionId,
        },
        executionId,
        streaming: true,
        streamUrl: `/customer-support/tickets/${initialState.ticketId}/stream`,
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

  private async executeRealWorkflow(initialState: any) {
    // Execute the real workflow steps asynchronously
    try {
      // Step 1: Analysis
      const analysisResult = await this.supportWorkflow.analyzeTicket(
        initialState
      );

      // Step 2: Generate Response
      const responseResult = await this.supportWorkflow.generateResponse({
        ...initialState,
        ...analysisResult,
      });

      // Step 3: Send Response (or request approval)
      const finalState = {
        ...initialState,
        ...analysisResult,
        ...responseResult,
      };

      const sendResult = await this.supportWorkflow.sendResponse(finalState);

      console.log('Real workflow execution completed:', sendResult);

      // Track metrics with real data
      await this.metricsService.trackCustomerSupport({
        ...finalState,
        ...sendResult,
      });
    } catch (error) {
      console.error('Real workflow execution error:', error);
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
