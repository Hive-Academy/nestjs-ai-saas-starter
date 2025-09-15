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
import { TicketManagementService } from '../services/ticket-management.service';
import { UserInterruptionManagementService } from '../services/user-interruption-management.service';
import { MetricsAnalyticsService } from '../services/metrics-analytics.service';
import { KnowledgeBaseManagementService } from '../services/knowledge-base-management.service';
import { AgentRegistryService } from '../core/agent-registry.service';
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
 * Refactored to use focused service delegates for better separation of concerns
 */
@Controller('customer-support')
export class CustomerSupportController {
  constructor(
    private readonly ticketManagementService: TicketManagementService,
    private readonly userInterruptionManagementService: UserInterruptionManagementService,
    private readonly metricsAnalyticsService: MetricsAnalyticsService,
    private readonly knowledgeBaseManagementService: KnowledgeBaseManagementService,
    private readonly agentRegistry: AgentRegistryService
  ) {}

  // ===== TICKET MANAGEMENT ENDPOINTS =====

  /**
   * Submit a new support ticket for processing
   */
  @Post('tickets')
  async submitTicket(
    @Body() request: TicketRequest
  ): Promise<StreamingResponse<{ ticketId: string; executionId: string }>> {
    return this.ticketManagementService.submitTicket(request);
  }

  /**
   * Submit ticket with streaming support
   */
  @Post('tickets/streaming')
  async submitTicketWithStreaming(
    @Body() request: TicketRequest
  ): Promise<StreamingResponse<any>> {
    return this.ticketManagementService.submitTicketWithStreaming(request);
  }

  /**
   * Get ticket status and details
   */
  @Get('tickets/:ticketId')
  async getTicket(@Param('ticketId') ticketId: string) {
    return this.ticketManagementService.getTicket(ticketId);
  }

  /**
   * Get workflow status for a ticket
   */
  @Get('workflows/status/:ticketId')
  async getWorkflowStatus(@Param('ticketId') ticketId: string) {
    return this.ticketManagementService.getWorkflowStatus(ticketId);
  }

  /**
   * Server-Sent Events stream for real-time ticket updates
   */
  @Sse('tickets/:ticketId/stream')
  streamTicketUpdates(
    @Param('ticketId') ticketId: string
  ): Observable<MessageEvent> {
    return this.ticketManagementService.streamTicketUpdates(ticketId);
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
    return this.ticketManagementService.approveTicket(ticketId, approval);
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
    return this.ticketManagementService.getActiveTickets(
      page,
      limit,
      status,
      priority
    );
  }

  // ===== USER INTERRUPTION ENDPOINTS =====

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
    return this.userInterruptionManagementService.interruptWithQuestion(request);
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
    return this.userInterruptionManagementService.requestClarification(request);
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
    return this.userInterruptionManagementService.respondToInterruption(
      interruptionId,
      response
    );
  }

  /**
   * Get active user interruptions for an execution
   */
  @Get('interruptions/:executionId')
  async getActiveInterruptions(@Param('executionId') executionId: string) {
    return this.userInterruptionManagementService.getActiveInterruptions(executionId);
  }

  /**
   * Cancel a user interruption
   */
  @Put('interruptions/:interruptionId/cancel')
  async cancelInterruption(
    @Param('interruptionId') interruptionId: string,
    @Body() request: { reason?: string; userId?: string }
  ) {
    return this.userInterruptionManagementService.cancelInterruption(
      interruptionId,
      request
    );
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
    return this.userInterruptionManagementService.requestUserInterruption(request);
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
    return this.userInterruptionManagementService.injectUserInput(
      executionId,
      request
    );
  }

  // ===== METRICS & ANALYTICS ENDPOINTS =====

  /**
   * Get customer support metrics
   */
  @Get('metrics')
  async getMetrics(
    @Query('timeRange') timeRange?: 'day' | 'week' | 'month' | 'quarter'
  ): Promise<CustomerSupportMetrics> {
    return this.metricsAnalyticsService.getMetrics(timeRange);
  }

  /**
   * Get business impact analysis
   */
  @Get('metrics/business-impact')
  async getBusinessImpact(
    @Query('timeRange') timeRange?: 'day' | 'week' | 'month' | 'quarter'
  ): Promise<BusinessImpact> {
    return this.metricsAnalyticsService.getBusinessImpact(timeRange);
  }

  /**
   * Get metrics for a specific customer
   */
  @Get('customers/:customerId/metrics')
  async getCustomerMetrics(@Param('customerId') customerId: string) {
    return this.metricsAnalyticsService.getCustomerMetrics(customerId);
  }

  /**
   * Server-Sent Events stream for real-time metrics
   */
  @Sse('metrics/stream')
  streamMetrics(): Observable<MessageEvent> {
    return this.metricsAnalyticsService.streamMetrics();
  }

  /**
   * Get comprehensive analytics dashboard data
   */
  @Get('analytics/dashboard')
  async getDashboardAnalytics(
    @Query('timeRange') timeRange: 'day' | 'week' | 'month' | 'quarter' = 'month'
  ) {
    return this.metricsAnalyticsService.getDashboardAnalytics(timeRange);
  }

  /**
   * Get performance trends over time
   */
  @Get('analytics/trends')
  async getPerformanceTrends(
    @Query('timeRange') timeRange: 'day' | 'week' | 'month' | 'quarter' = 'week'
  ) {
    return this.metricsAnalyticsService.getPerformanceTrends(timeRange);
  }

  /**
   * Get agent performance metrics
   */
  @Get('analytics/agents')
  async getAgentPerformance() {
    return this.metricsAnalyticsService.getAgentPerformance();
  }

  // ===== KNOWLEDGE BASE ENDPOINTS =====

  /**
   * Search knowledge base
   */
  @Post('knowledge-base/search')
  async searchKnowledgeBase(@Body() query: KnowledgeSearchQuery) {
    return this.knowledgeBaseManagementService.searchKnowledgeBase(query);
  }

  /**
   * Get knowledge base analytics
   */
  @Get('knowledge-base/analytics')
  async getKnowledgeBaseAnalytics() {
    return this.knowledgeBaseManagementService.getKnowledgeBaseAnalytics();
  }

  /**
   * Add feedback for knowledge articles
   */
  @Put('knowledge-base/articles/:articleId/feedback')
  async provideFeedback(
    @Param('articleId') articleId: string,
    @Body() feedback: { helpful: boolean; comment?: string }
  ) {
    return this.knowledgeBaseManagementService.provideFeedback(articleId, feedback);
  }

  /**
   * Initialize the knowledge base with sample data
   */
  @Post('admin/knowledge-base/seed')
  async seedKnowledgeBase() {
    return this.knowledgeBaseManagementService.seedKnowledgeBase();
  }

  /**
   * Get knowledge base statistics
   */
  @Get('knowledge-base/stats')
  async getKnowledgeBaseStats() {
    return this.knowledgeBaseManagementService.getKnowledgeBaseStats();
  }

  /**
   * Get most popular articles
   */
  @Get('knowledge-base/popular')
  async getPopularArticles(@Query('limit') limit = 10) {
    return this.knowledgeBaseManagementService.getPopularArticles(limit);
  }

  /**
   * Get articles needing review
   */
  @Get('knowledge-base/review-queue')
  async getArticlesNeedingReview() {
    return this.knowledgeBaseManagementService.getArticlesNeedingReview();
  }

  /**
   * Get search suggestions
   */
  @Get('knowledge-base/suggestions')
  async getSearchSuggestions(@Query('q') partialQuery: string) {
    return this.knowledgeBaseManagementService.getSearchSuggestions(partialQuery);
  }

  /**
   * Get content gaps analysis
   */
  @Get('knowledge-base/content-gaps')
  async getContentGapsAnalysis() {
    return this.knowledgeBaseManagementService.getContentGapsAnalysis();
  }

  // ===== MISC ENDPOINTS =====

  /**
   * Get available agents in the customer support system
   */
  @Get('agents')
  async getAvailableAgents() {
    const agents = this.agentRegistry.list();
    return {
      success: true,
      data: agents,
      total: agents.length,
    };
  }
}
