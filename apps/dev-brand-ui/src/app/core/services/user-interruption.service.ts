import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WebSocketService } from './websocket.service';
import { environment } from '../../../environments/environment';

// User Interruption interfaces based on integration guide
export interface UserInterruption {
  id: string;
  executionId: string;
  nodeId?: string;
  type:
    | 'question'
    | 'clarification'
    | 'input_request'
    | 'approval_request'
    | 'correction';
  message: string;
  urgency?: 'low' | 'medium' | 'high';
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  status: 'pending' | 'answered' | 'cancelled' | 'timeout';
  options?: string[];
}

export interface InterruptionResponse {
  response: string;
  continueExecution?: boolean;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface DynamicInterruptionRequest {
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

/**
 * User Interruption Service
 *
 * Provides bidirectional communication between users and AI agents during workflow execution.
 * Integrates with customer-support backend endpoints and WebSocket for real-time interruptions.
 *
 * Based on USER_INTERRUPTION_INTEGRATION_GUIDE.md
 */
@Injectable({
  providedIn: 'root',
})
export class UserInterruptionService {
  private readonly http = inject(HttpClient);
  private readonly websocket = inject(WebSocketService);
  private readonly baseUrl = `${environment.apiUrl}/api/customer-support`;

  // Reactive state
  private readonly activeInterruptions = signal<UserInterruption[]>([]);
  private readonly currentDialog = signal<UserInterruption | null>(null);
  private readonly isWorkflowPaused = signal(false);

  readonly interruptions = this.activeInterruptions.asReadonly();
  readonly dialogData = this.currentDialog.asReadonly();
  readonly workflowPaused = this.isWorkflowPaused.asReadonly();

  constructor() {
    this.setupWebSocketHandlers();
  }

  /**
   * User clicks "Ask Agent" button during execution
   * Sends question to running workflow for agent to respond
   */
  async askQuestion(
    executionId: string,
    question: string,
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<any> {
    const payload = {
      executionId,
      question,
      urgency,
      userId: 'demo-user',
    };

    // Send via REST API
    const response = await this.http
      .post(`${this.baseUrl}/interruptions/question`, payload)
      .toPromise();

    console.log(`❓ Question sent to agent: "${question}"`);
    return response;
  }

  /**
   * User provides immediate context/correction during workflow
   * Injects input directly into running workflow
   */
  async injectInput(
    executionId: string,
    input: string,
    inputType: 'text' | 'correction' | 'selection' | 'approval' = 'text'
  ): Promise<any> {
    const payload = {
      input,
      inputType,
      resumeExecution: true,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'user-interface',
      },
    };

    const response = await this.http
      .post(`${this.baseUrl}/workflows/${executionId}/inject-input`, payload)
      .toPromise();

    console.log(`💬 Input injected into workflow: "${input}"`);
    return response;
  }

  /**
   * User responds to agent's clarification request or approval prompt
   * Resolves active interruption and allows workflow to continue
   */
  async respondToInterruption(
    interruptionId: string,
    response: string,
    continueExecution = true
  ): Promise<any> {
    const payload: InterruptionResponse = {
      response,
      continueExecution,
      userId: 'demo-user',
      metadata: {
        timestamp: new Date().toISOString(),
        responseMethod: 'interface',
      },
    };

    const result = await this.http
      .put(`${this.baseUrl}/interruptions/${interruptionId}/respond`, payload)
      .toPromise();

    // Remove from active interruptions
    this.activeInterruptions.update((interruptions) =>
      interruptions.filter((i) => i.id !== interruptionId)
    );
    this.currentDialog.set(null);
    this.isWorkflowPaused.set(false);

    console.log(`✅ Responded to interruption: "${response}"`);
    return result;
  }

  /**
   * Cancel an active interruption without responding
   * Used when user wants to dismiss without providing input
   */
  async cancelInterruption(
    interruptionId: string,
    reason?: string
  ): Promise<any> {
    const payload = {
      reason: reason || 'User cancelled',
      userId: 'demo-user',
    };

    const result = await this.http
      .put(`${this.baseUrl}/interruptions/${interruptionId}/cancel`, payload)
      .toPromise();

    // Remove from active interruptions
    this.activeInterruptions.update((interruptions) =>
      interruptions.filter((i) => i.id !== interruptionId)
    );
    this.currentDialog.set(null);
    this.isWorkflowPaused.set(false);

    console.log(`❌ Cancelled interruption: ${reason}`);
    return result;
  }

  /**
   * Request a dynamic interruption during workflow execution
   * Used by agents to pause workflow and request user input
   */
  async requestUserInterruption(
    request: DynamicInterruptionRequest
  ): Promise<any> {
    const response = await this.http
      .post(`${this.baseUrl}/interruptions/dynamic`, request)
      .toPromise();

    if (request.pauseWorkflow) {
      this.isWorkflowPaused.set(true);
    }

    console.log(`🛑 Dynamic interruption requested: ${request.type}`);
    return response;
  }

  /**
   * Get all active interruptions for a specific execution
   * Used to check pending interruptions when reconnecting
   */
  async getActiveInterruptions(
    executionId: string
  ): Promise<UserInterruption[]> {
    const response = await this.http
      .get<{ success: boolean; data: UserInterruption[] }>(
        `${this.baseUrl}/interruptions/${executionId}`
      )
      .toPromise();

    if (response?.success && response.data) {
      this.activeInterruptions.set(response.data);
      if (response.data.length > 0) {
        this.currentDialog.set(response.data[0]);
      }
    }

    return response?.data || [];
  }

  /**
   * Approve a ticket (used for @RequiresApproval decorator scenarios)
   * Specialized method for handling approval workflows
   */
  async approveTicket(
    ticketId: string,
    approved: boolean,
    approvedBy = 'demo-user',
    feedback?: string
  ): Promise<any> {
    const payload = {
      approved,
      approvedBy,
      feedback:
        feedback ||
        (approved ? 'Approved via interface' : 'Rejected via interface'),
    };

    const response = await this.http
      .put(`${this.baseUrl}/tickets/${ticketId}/approve`, payload)
      .toPromise();

    console.log(
      `${approved ? '✅' : '❌'} Ticket ${
        approved ? 'approved' : 'rejected'
      }: ${ticketId}`
    );
    return response;
  }

  /**
   * Clear all interruptions (used when switching workflows or resetting)
   */
  clearAllInterruptions(): void {
    this.activeInterruptions.set([]);
    this.currentDialog.set(null);
    this.isWorkflowPaused.set(false);
    console.log('🧹 Cleared all interruptions');
  }

  /**
   * Setup WebSocket message handlers for real-time interruption events
   * Listens for interruption requests, workflow pause/resume notifications
   */
  private setupWebSocketHandlers(): void {
    // Listen for interruption requests from agents
    this.websocket.getMessages().subscribe((message) => {
      if (message.type === 'interruption_request') {
        const interruption: UserInterruption = {
          ...message.data,
          timestamp: new Date(message.data.timestamp || Date.now()),
          status: 'pending',
        };

        this.activeInterruptions.update((list) => [...list, interruption]);
        this.currentDialog.set(interruption);
        this.isWorkflowPaused.set(true);

        console.log(
          `🔔 Interruption request received: ${interruption.type} - ${interruption.message}`
        );
      }
    });

    // Listen for workflow pause notifications
    this.websocket.getMessages().subscribe((message) => {
      if (message.type === 'workflow_paused') {
        this.isWorkflowPaused.set(true);
        console.log('⏸️ Workflow paused for user input');
      }
    });

    // Listen for workflow resume notifications
    this.websocket.getMessages().subscribe((message) => {
      if (message.type === 'workflow_resumed') {
        this.isWorkflowPaused.set(false);
        this.currentDialog.set(null);
        console.log('▶️ Workflow resumed after user input');
      }
    });

    // Listen for approval requests (from @RequiresApproval decorator)
    this.websocket.getMessages().subscribe((message) => {
      if (message.type === 'approval_request') {
        const approvalRequest: UserInterruption = {
          id: message.data.approvalId || `approval-${Date.now()}`,
          executionId: message.data.executionId,
          type: 'approval_request',
          message: message.data.message || 'Approval required for this action',
          urgency: message.data.urgency || 'medium',
          timestamp: new Date(),
          status: 'pending',
          metadata: message.data,
        };

        this.activeInterruptions.update((list) => [...list, approvalRequest]);
        this.currentDialog.set(approvalRequest);
        this.isWorkflowPaused.set(true);

        console.log(`✋ Approval request received: ${approvalRequest.message}`);
      }
    });

    // Listen for timeout notifications
    this.websocket.getMessages().subscribe((message) => {
      if (message.type === 'interruption_timeout') {
        const timeoutId = message.data.interruptionId;
        this.activeInterruptions.update((interruptions) =>
          interruptions.map((i) =>
            i.id === timeoutId ? { ...i, status: 'timeout' } : i
          )
        );

        console.log(`⏰ Interruption timed out: ${timeoutId}`);
      }
    });
  }

  /**
   * Utility method to check if there are any pending interruptions
   */
  hasPendingInterruptions(): boolean {
    return this.activeInterruptions().some((i) => i.status === 'pending');
  }

  /**
   * Get the most urgent pending interruption
   */
  getMostUrgentInterruption(): UserInterruption | null {
    const pending = this.activeInterruptions().filter(
      (i) => i.status === 'pending'
    );
    if (pending.length === 0) return null;

    const urgencyOrder = { high: 3, medium: 2, low: 1 };
    return pending.reduce((most, current) => {
      const mostUrgency = urgencyOrder[most.urgency || 'medium'];
      const currentUrgency = urgencyOrder[current.urgency || 'medium'];
      return currentUrgency > mostUrgency ? current : most;
    });
  }

  /**
   * Get interruption statistics for debugging/monitoring
   */
  getInterruptionStats() {
    const interruptions = this.activeInterruptions();
    return {
      total: interruptions.length,
      pending: interruptions.filter((i) => i.status === 'pending').length,
      answered: interruptions.filter((i) => i.status === 'answered').length,
      cancelled: interruptions.filter((i) => i.status === 'cancelled').length,
      timeout: interruptions.filter((i) => i.status === 'timeout').length,
      byType: {
        question: interruptions.filter((i) => i.type === 'question').length,
        clarification: interruptions.filter((i) => i.type === 'clarification')
          .length,
        approval_request: interruptions.filter(
          (i) => i.type === 'approval_request'
        ).length,
        input_request: interruptions.filter((i) => i.type === 'input_request')
          .length,
        correction: interruptions.filter((i) => i.type === 'correction').length,
      },
    };
  }
}
