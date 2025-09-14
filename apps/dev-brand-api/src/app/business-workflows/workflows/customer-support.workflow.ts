import { Injectable, Inject } from '@nestjs/common';
import {
  Workflow,
  Entrypoint,
  Task,
} from '@hive-academy/langgraph-functional-api';
import {
  StreamProgress,
  StreamToken,
  StreamEvent,
} from '@hive-academy/langgraph-streaming';
import {
  TOKEN_STREAMING_SERVICE_TOKEN,
  WEBSOCKET_BRIDGE_SERVICE_TOKEN,
  ITokenStreamingService,
  IWebSocketBridgeService,
} from '@hive-academy/langgraph-core';
import {
  RequiresApproval,
  HumanApprovalService,
} from '@hive-academy/langgraph-hitl';
import { StreamEventType } from '@hive-academy/langgraph-core';
import { LlmProviderService } from '@hive-academy/langgraph-multi-agent';
import { CustomerSupportAgent } from '../agents/customer-support.agent';
import type { CustomerSupportState, TicketRequest } from '../types';

/**
 * Customer Support Automation Workflow
 * Implements sophisticated ticket processing with real-time streaming
 * Following REFACTORING_GUIDE.md specifications
 */
@Workflow({
  name: 'customer-support-automation',
  streaming: true,
  hitl: { enabled: true, timeout: 300000 }, // 5 minutes timeout for human approval
})
@Injectable()
export class CustomerSupportWorkflow {
  constructor(
    private readonly supportAgent: CustomerSupportAgent,
    @Inject(TOKEN_STREAMING_SERVICE_TOKEN)
    private readonly tokenStreamingService: ITokenStreamingService,
    @Inject(WEBSOCKET_BRIDGE_SERVICE_TOKEN)
    private readonly webSocketBridge: IWebSocketBridgeService,
    private readonly llmProvider: LlmProviderService,
    private readonly hitlService: HumanApprovalService // In a real implementation, these would be injected // private readonly emailService: EmailService,
  ) // private readonly metricsService: BusinessMetricsService
  {}

  /**
   * Entry point - Initialize ticket processing
   */
  @Entrypoint()
  @StreamProgress({ enabled: true, includeETA: true })
  async processTicket(request: TicketRequest): Promise<CustomerSupportState> {
    const ticketId = this.generateTicketId();

    // Create initial state
    const initialState: CustomerSupportState = {
      ticketId,
      ticket: {
        id: ticketId,
        customerId: request.customerId,
        title: request.title,
        description: request.description,
        category: (request.category as any) || 'general',
        priority: (request.priority as any) || 'medium',
        status: 'processing',
        customerTier: (request.customerTier as any) || 'basic',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
        metadata: request.metadata || {},
      },
      status: 'processing',
      startTime: Date.now(),
      metadata: {
        requestReceived: true,
        initialProcessingTime: Date.now(),
      },
    };

    // Emit initial progress
    this.emitProgress({
      ticketId,
      progress: 10,
      message: 'Ticket received and initialized',
      currentStep: 'initialization',
    });

    return initialState;
  }

  /**
   * Step 1: Analyze the ticket using AI agent
   */
  @Task({ dependsOn: ['processTicket'] })
  @StreamToken({ enabled: true, format: 'structured' })
  async analyzeTicket(
    state: CustomerSupportState
  ): Promise<Partial<CustomerSupportState>> {
    try {
      this.emitProgress({
        ticketId: state.ticketId,
        progress: 30,
        message: 'Analyzing ticket with AI agent',
        currentStep: 'analysis',
      });

      // Stream analysis tokens
      this.emitStreamToken({
        ticketId: state.ticketId,
        nodeId: 'customer-support-specialist',
        type: 'analysis_start',
        data: { message: 'Starting comprehensive ticket analysis...' },
      });

      // Use the customer support agent for analysis
      const analysisResult = await this.supportAgent.nodeFunction(state);

      this.emitStreamToken({
        ticketId: state.ticketId,
        nodeId: 'customer-support-specialist',
        type: 'analysis_complete',
        data: {
          analysisComplete: true,
          similarTicketsFound: analysisResult.similarTickets?.length || 0,
          escalationRequired: analysisResult.escalationRequired,
        },
      });

      this.emitProgress({
        ticketId: state.ticketId,
        progress: 50,
        message: 'Ticket analysis completed',
        currentStep: 'analysis_complete',
      });

      return {
        ...analysisResult,
        status: 'analyzed',
        metadata: {
          ...state.metadata,
          analysisCompletedAt: Date.now(),
        },
      };
    } catch (error) {
      this.emitStreamEvent({
        ticketId: state.ticketId,
        event: 'analysis_failed',
        data: { error: error instanceof Error ? error.message : String(error) },
      });

      return {
        status: 'processing',
        metadata: {
          ...state.metadata,
          analysisError: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * NEW: Dynamic user interruption point during analysis
   */
  @Task({ dependsOn: ['analyzeTicket'] })
  async checkForUserQuestions(
    state: CustomerSupportState
  ): Promise<Partial<CustomerSupportState>> {
    try {
      // Check if user has any questions about the analysis
      if (state.analysis?.complexity === 'high' || state.escalationRequired) {
        const interruptionId = await this.hitlService.requestClarification(
          state.ticketId,
          'analysis-review',
          `I've analyzed this ${
            state.ticket.category
          } ticket and found it requires special attention. 
          Key findings: ${
            state.analysis?.keyTopics?.join(', ') || 'Complex issue detected'
          }
          
          Would you like me to:
          1. Proceed with standard resolution
          2. Escalate to human specialist immediately  
          3. Request more information from customer first
          
          What's your preference?`
        );

        this.emitProgress({
          ticketId: state.ticketId,
          progress: 60,
          message: 'Waiting for user guidance on resolution approach',
          currentStep: 'awaiting_user_input',
        });

        return {
          ...state,
          status: 'awaiting_user_input',
          metadata: {
            ...state.metadata,
            interruptionId,
            interruptionReason: 'complex_analysis_requires_guidance',
          },
        };
      }

      return { ...state, status: 'analyzed' };
    } catch (error) {
      console.error('Error in checkForUserQuestions:', error);
      return { ...state };
    }
  }

  /**
   * Step 2: Generate response based on analysis
   */
  @Task({ dependsOn: ['checkForUserQuestions'] })
  @StreamEvent({ events: [StreamEventType.MILESTONE, StreamEventType.VALUES] })
  async generateResponse(
    state: CustomerSupportState
  ): Promise<Partial<CustomerSupportState>> {
    try {
      this.emitProgress({
        ticketId: state.ticketId,
        progress: 70,
        message: 'Generating customer response',
        currentStep: 'response_generation',
      });

      // Generate response based on analysis
      const response = await this.createResponse(state);

      // Emit appropriate event
      if (state.escalationRequired) {
        this.emitStreamEvent({
          ticketId: state.ticketId,
          event: 'escalation_required',
          data: {
            reason: 'Ticket requires human escalation',
            escalationFactors: state.analysis?.riskFactors || [],
          },
        });
      } else {
        this.emitStreamEvent({
          ticketId: state.ticketId,
          event: 'solution_found',
          data: {
            confidence: state.analysis?.confidence || 0,
            estimatedResolutionTime:
              state.analysis?.estimatedResolutionTime || 0,
          },
        });
      }

      this.emitProgress({
        ticketId: state.ticketId,
        progress: 85,
        message: 'Response generated successfully',
        currentStep: 'response_ready',
      });

      return {
        response,
        status: 'response_generated',
        metadata: {
          ...state.metadata,
          responseGeneratedAt: Date.now(),
        },
      };
    } catch (error) {
      this.emitStreamEvent({
        ticketId: state.ticketId,
        event: 'response_generation_failed',
        data: { error: error instanceof Error ? error.message : String(error) },
      });

      return {
        status: 'analyzed',
        metadata: {
          ...state.metadata,
          responseError: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Step 3: Send response (with optional human approval)
   */
  @Task({ dependsOn: ['generateResponse'] })
  @RequiresApproval({
    confidenceThreshold: 0.8,
    timeoutMs: 300000, // 5 minutes
    when: (state) => this.determineApprovalRequirement(state),
    onTimeout: 'escalate',
    riskThreshold: 'medium',
    message: (state) =>
      `Review response for ${state.ticket.customerTier} customer: "${state.ticket.title}"`,
    metadata: (state) => ({
      ticketCategory: state.ticket.category,
      customerTier: state.ticket.customerTier,
      escalationRequired: state.escalationRequired,
      businessImpact: state.analysis?.businessImpact,
    }),
  })
  async sendResponse(
    state: CustomerSupportState
  ): Promise<Partial<CustomerSupportState>> {
    try {
      // Check if approval is required
      const requiresApproval = this.determineApprovalRequirement(state);

      if (requiresApproval) {
        this.emitProgress({
          ticketId: state.ticketId,
          progress: 90,
          message: 'Waiting for human approval',
          currentStep: 'pending_approval',
        });

        return {
          requiresApproval: true,
          status: 'pending_approval',
          metadata: {
            ...state.metadata,
            approvalRequestedAt: Date.now(),
            approvalReason: this.getApprovalReason(state),
          },
        };
      }

      // Send response directly
      await this.sendCustomerResponse(state);

      this.emitProgress({
        ticketId: state.ticketId,
        progress: 100,
        message: 'Response sent to customer',
        currentStep: 'completed',
      });

      return {
        status: 'completed',
        completedAt: Date.now(),
        metadata: {
          ...state.metadata,
          responseSentAt: Date.now(),
          totalProcessingTime: Date.now() - state.startTime,
        },
      };
    } catch (error) {
      this.emitStreamEvent({
        ticketId: state.ticketId,
        event: 'send_response_failed',
        data: { error: error instanceof Error ? error.message : String(error) },
      });

      return {
        status: 'response_generated',
        metadata: {
          ...state.metadata,
          sendError: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Approval handler for human-in-the-loop scenarios
   */
  async handleApproval(
    state: CustomerSupportState,
    approved: boolean,
    approvedBy: string,
    feedback?: string
  ): Promise<Partial<CustomerSupportState>> {
    if (approved) {
      // Send the approved response
      await this.sendCustomerResponse(state);

      this.emitStreamEvent({
        ticketId: state.ticketId,
        event: 'response_approved_and_sent',
        data: { approvedBy, feedback },
      });

      this.emitProgress({
        ticketId: state.ticketId,
        progress: 100,
        message: 'Response approved and sent',
        currentStep: 'completed',
      });

      return {
        status: 'completed',
        completedAt: Date.now(),
        approvedBy,
        metadata: {
          ...state.metadata,
          approvedAt: Date.now(),
          approvedBy,
          approvalFeedback: feedback,
        },
      };
    } else {
      // Response was rejected, needs revision
      this.emitStreamEvent({
        ticketId: state.ticketId,
        event: 'response_rejected',
        data: { rejectedBy: approvedBy, feedback },
      });

      return {
        status: 'analyzed', // Go back to generate a new response
        metadata: {
          ...state.metadata,
          rejectedAt: Date.now(),
          rejectedBy: approvedBy,
          rejectionFeedback: feedback,
        },
      };
    }
  }

  // Private helper methods

  private generateTicketId(): string {
    return `TICKET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async createResponse(state: CustomerSupportState): Promise<string> {
    try {
      // Use the real LLM provider to generate the response
      const llm = await this.llmProvider.getLLM();

      const prompt = `Generate a professional customer support response based on the following information:

Ticket Details:
- Title: ${state.ticket.title}
- Description: ${state.ticket.description}
- Category: ${state.ticket.category}
- Priority: ${state.ticket.priority}
- Customer Tier: ${state.ticket.customerTier}

Analysis Results:
- Sentiment: ${state.analysis?.sentiment || 'neutral'}
- Urgency: ${state.analysis?.urgency || 0.5}
- Confidence: ${state.analysis?.confidence || 0.5}
- Business Impact: ${state.analysis?.businessImpact || 'low'}
- Key Topics: ${state.analysis?.keyTopics?.join(', ') || 'none'}
- Detected Issues: ${state.analysis?.detectedIssues?.join(', ') || 'none'}

Customer Context:
- Name: ${state.customerContext?.name || 'Customer'}
- Tier: ${state.customerContext?.tier || 'basic'}
- Previous Tickets: ${state.customerContext?.totalTickets || 0}
- Satisfaction Score: ${state.customerContext?.satisfactionScore || 'N/A'}

Similar Tickets Solutions:
${
  state.similarTickets
    ?.slice(0, 2)
    .map(
      (ticket, index) =>
        `${index + 1}. ${ticket.title} (Similarity: ${(
          ticket.similarity * 100
        ).toFixed(1)}%) - Resolution: ${ticket.resolution}`
    )
    .join('\n') || 'No similar tickets found'
}

Suggested Actions:
${
  state.suggestedActions
    ?.map((action, index) => `${index + 1}. ${action}`)
    .join('\n') || 'Standard support process'
}

${
  state.escalationRequired
    ? 'IMPORTANT: This ticket requires escalation to specialist team.'
    : ''
}

Please generate a personalized, professional response that:
1. Acknowledges the customer's issue with empathy
2. Provides helpful information or solutions
3. Sets appropriate expectations
4. Maintains a professional but friendly tone
5. Includes relevant next steps

Response:`;

      const response = await llm.invoke([{ role: 'user', content: prompt }]);
      return response.content.toString();
    } catch (error) {
      console.error('Error generating LLM response:', error);

      // Fallback to template-based response if LLM fails
      const { analysis, similarTickets, customerContext } = state;
      let response = `Dear ${customerContext?.name || 'Customer'},\n\n`;
      response += `Thank you for contacting us regarding your ${
        analysis?.category || 'support'
      } inquiry.\n\n`;

      if (
        analysis?.businessImpact === 'critical' ||
        analysis?.businessImpact === 'high'
      ) {
        response += `We understand this is a high-priority issue for you, and we're committed to resolving it quickly.\n\n`;
      }

      if (state.suggestedActions && state.suggestedActions.length > 0) {
        response += `Recommended next steps:\n`;
        state.suggestedActions.forEach((action, index) => {
          response += `${index + 1}. ${action}\n`;
        });
        response += `\n`;
      }

      if (state.escalationRequired) {
        response += `Due to the nature of your inquiry, I'm escalating this to our specialist team who will contact you within ${
          analysis?.estimatedResolutionTime || 240
        } minutes.\n\n`;
      }

      response += `If you have any additional questions, please don't hesitate to reach out.\n\n`;
      response += `Best regards,\nAI Customer Support Specialist`;

      return response;
    }
  }

  private determineApprovalRequirement(state: CustomerSupportState): boolean {
    // Require approval for high-risk scenarios
    if (state.escalationRequired) return true;
    if (state.ticket.customerTier === 'enterprise') return true;
    if (state.analysis?.businessImpact === 'critical') return true;
    if (state.analysis?.sentiment != null && state.analysis.sentiment < -0.5)
      return true;
    if (state.customerContext?.riskLevel === 'high') return true;

    return false;
  }

  private getApprovalReason(state: CustomerSupportState): string {
    const reasons: string[] = [];

    if (state.escalationRequired) reasons.push('Escalation required');
    if (state.ticket.customerTier === 'enterprise')
      reasons.push('Enterprise customer');
    if (state.analysis?.businessImpact === 'critical')
      reasons.push('Critical business impact');
    if (state.analysis?.sentiment != null && state.analysis.sentiment < -0.5)
      reasons.push('Negative sentiment detected');
    if (state.customerContext?.riskLevel === 'high')
      reasons.push('High-risk customer');

    return reasons.join(', ');
  }

  private async sendCustomerResponse(
    state: CustomerSupportState
  ): Promise<void> {
    // In a real implementation, this would send email/notification
    console.log(`[CUSTOMER RESPONSE] Ticket ${state.ticketId}:`);
    console.log(state.response);

    // Here you would integrate with email service, CRM, etc.
    // await this.emailService.send({
    //   to: state.customerContext?.email,
    //   subject: `Re: ${state.ticket.title}`,
    //   body: state.response
    // });
  }

  // Streaming helper methods - NOW PROPERLY WIRED TO STREAMING SERVICE!
  private async emitProgress(data: {
    ticketId: string;
    progress: number;
    message: string;
    currentStep: string;
  }) {
    if (this.webSocketBridge) {
      await this.webSocketBridge.broadcastToExecution(data.ticketId, {
        type: 'progress',
        progress: data.progress,
        message: data.message,
        currentStep: data.currentStep,
        timestamp: new Date(),
      });
    }
  }

  private emitStreamToken(data: {
    ticketId: string;
    nodeId: string;
    type: string;
    data: any;
  }) {
    if (this.tokenStreamingService) {
      this.tokenStreamingService.streamToken(
        data.ticketId,
        data.nodeId,
        JSON.stringify({ type: data.type, ...data.data }),
        { type: data.type, timestamp: new Date() }
      );
    }
  }

  private async emitStreamEvent(data: {
    ticketId: string;
    event: string;
    data: any;
  }) {
    if (this.webSocketBridge) {
      await this.webSocketBridge.broadcastToExecution(data.ticketId, {
        type: 'event',
        event: data.event,
        data: data.data,
        timestamp: new Date(),
      });
    }
  }
}
