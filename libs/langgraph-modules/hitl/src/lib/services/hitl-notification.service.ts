import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  STREAMING_SERVICE_TOKEN,
  type IStreamingService,
} from '@hive-academy/langgraph-core';
import { HITL_EVENTS } from '../constants';

/**
 * Notification service for HITL approval requests
 *
 * This service handles notifications for approval requests including:
 * - Console logging for demo visibility
 * - WebSocket events for real-time UI updates
 * - Email/Slack/SMS notifications (future extensibility)
 */
@Injectable()
export class HitlNotificationService {
  private readonly logger = new Logger(HitlNotificationService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Optional()
    @Inject(STREAMING_SERVICE_TOKEN)
    private readonly streaming?: IStreamingService
  ) {
    this.logger.debug('HitlNotificationService initialized', {
      streamingAvailable: !!this.streaming,
    });
  }

  /**
   * Send approval request notification
   */
  async notifyApprovalRequest(data: ApprovalNotificationData): Promise<void> {
    try {
      // Console notification for demo visibility
      this.sendConsoleNotification(data);

      // WebSocket event for real-time UI
      await this.sendWebSocketNotification(data);

      // Future: Email, Slack, SMS notifications can be added here
      // await this.sendEmailNotification(data);
      // await this.sendSlackNotification(data);

      this.logger.debug(`Sent notifications for approval request ${data.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to send notifications for approval ${data.id}`,
        error
      );
      // Don't throw - notifications should not block approval flow
    }
  }

  /**
   * Send approval response notification
   */
  async notifyApprovalResponse(
    data: ApprovalResponseNotificationData
  ): Promise<void> {
    try {
      // Console notification for demo visibility
      this.sendConsoleResponseNotification(data);

      // WebSocket event for real-time UI
      await this.sendWebSocketResponseNotification(data);

      this.logger.debug(
        `Sent response notifications for approval ${data.requestId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to send response notifications for approval ${data.requestId}`,
        error
      );
    }
  }

  /**
   * Send timeout notification
   */
  async notifyApprovalTimeout(
    data: ApprovalTimeoutNotificationData
  ): Promise<void> {
    try {
      // Console warning for timeout
      console.warn(`⏰ APPROVAL TIMEOUT: ${data.requestId}`);
      console.warn(`   Execution: ${data.executionId}`);
      console.warn(`   Strategy: ${data.timeoutStrategy}`);
      console.warn(`   Duration: ${data.timeoutDuration}ms`);

      // WebSocket event
      const timeoutStreamData = {
        type: 'approval_timeout',
        data: {
          requestId: data.requestId,
          executionId: data.executionId,
          strategy: data.timeoutStrategy,
          message: 'Approval request timed out',
          timestamp: new Date().toISOString(),
        },
      };

      // Send via streaming service
      if (this.streaming) {
        try {
          await this.streaming.broadcastToExecution(
            data.executionId,
            timeoutStreamData
          );
          this.logger.warn(
            `Sent streaming timeout notification for approval ${data.requestId}`
          );
        } catch (error) {
          this.logger.warn(
            `Failed to send streaming timeout notification: ${(error as Error).message}`
          );
        }
      }

      await this.eventEmitter.emitAsync(
        HITL_EVENTS.APPROVAL_TIMEOUT,
        timeoutStreamData
      );

      this.logger.warn(
        `Approval ${data.requestId} timed out after ${data.timeoutDuration}ms`
      );
    } catch (error) {
      this.logger.error(
        `Failed to send timeout notifications for approval ${data.requestId}`,
        error
      );
    }
  }

  /**
   * Send escalation notification
   */
  async notifyApprovalEscalation(
    data: ApprovalEscalationNotificationData
  ): Promise<void> {
    try {
      // Console notification for escalation
      console.log(`🔺 APPROVAL ESCALATED: ${data.requestId}`);
      console.log(`   From: ${data.escalatedFrom}`);
      console.log(`   To: ${data.escalatedTo.join(', ')}`);
      console.log(`   Reason: ${data.reason || 'Manual escalation'}`);

      // WebSocket event
      const escalationStreamData = {
        type: 'approval_escalated',
        data: {
          requestId: data.requestId,
          escalatedFrom: data.escalatedFrom,
          escalatedTo: data.escalatedTo,
          reason: data.reason,
          message: `Approval escalated from ${
            data.escalatedFrom
          } to ${data.escalatedTo.join(', ')}`,
          timestamp: new Date().toISOString(),
        },
      };

      // Send via streaming service
      if (this.streaming) {
        try {
          await this.streaming.broadcastToExecution(
            data.requestId,
            escalationStreamData
          );
          this.logger.log(
            `Sent streaming escalation notification for approval ${data.requestId}`
          );
        } catch (error) {
          this.logger.warn(
            `Failed to send streaming escalation notification: ${(error as Error).message}`
          );
        }
      }

      await this.eventEmitter.emitAsync(
        HITL_EVENTS.APPROVAL_ESCALATED,
        escalationStreamData
      );

      this.logger.log(
        `Approval ${data.requestId} escalated to ${data.escalatedTo.join(', ')}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to send escalation notifications for approval ${data.requestId}`,
        error
      );
    }
  }

  /**
   * Send urgent notification (for high-risk approvals)
   */
  async notifyUrgentApproval(data: ApprovalNotificationData): Promise<void> {
    try {
      // Enhanced console notification for urgent requests
      console.error(`🚨 URGENT APPROVAL REQUIRED: ${data.id}`);
      console.error(`   Execution: ${data.executionId}`);
      console.error(`   Risk Level: ${data.riskLevel || 'UNKNOWN'}`);
      console.error(`   Message: ${data.message}`);
      console.error(
        `   Timeout: ${Math.round(data.timeoutMs / 60000)} minutes`
      );
      console.error(`   Approve at: /api/hitl/approve/${data.id}`);
      console.error('   ⚠️  REQUIRES IMMEDIATE ATTENTION ⚠️');

      // WebSocket event with urgent flag
      const urgentStreamData = {
        type: 'urgent_approval_requested',
        urgent: true,
        data: {
          id: data.id,
          executionId: data.executionId,
          nodeId: data.nodeId,
          message: data.message,
          riskLevel: data.riskLevel,
          confidence: data.confidence,
          timeout: data.timeoutMs,
          approvalUrl: `/api/hitl/approve/${data.id}`,
          timestamp: new Date().toISOString(),
        },
      };

      // Send via streaming service with urgent priority
      if (this.streaming) {
        try {
          await this.streaming.broadcastToExecution(
            data.executionId,
            urgentStreamData
          );
          this.logger.error(
            `Sent URGENT streaming notification for approval ${data.id}`
          );
        } catch (error) {
          this.logger.error(
            `Failed to send URGENT streaming notification: ${(error as Error).message}`
          );
        }
      }

      // Also emit via EventEmitter2
      await this.eventEmitter.emitAsync(
        HITL_EVENTS.APPROVAL_REQUESTED,
        urgentStreamData
      );

      this.logger.error(
        `URGENT: Approval ${data.id} requires immediate attention`
      );
    } catch (error) {
      this.logger.error(
        `Failed to send urgent notifications for approval ${data.id}`,
        error
      );
    }
  }

  // Private helper methods

  private sendConsoleNotification(data: ApprovalNotificationData): void {
    // Enhanced console logging as specified in the critical fixes
    console.log(`🚨 APPROVAL REQUIRED: ${data.id}`);
    console.log(`📋 Execution: ${data.executionId}`);
    console.log(`🔧 Node: ${data.nodeId}`);
    console.log(`📝 Message: ${data.message}`);
    if (data.riskLevel) {
      console.log(`⚠️  Risk Level: ${data.riskLevel.toUpperCase()}`);
    }
    if (data.confidence !== undefined) {
      console.log(`🎯 Confidence: ${Math.round(data.confidence * 100)}%`);
    }
    console.log(`⏰ Timeout: ${Math.round(data.timeoutMs / 60000)} minutes`);
    console.log(`🔗 Approve at: /api/hitl/approve/${data.id}`);
    if (data.approvers?.length) {
      console.log(`👥 Approvers: ${data.approvers.join(', ')}`);
    }
    console.log('─'.repeat(50));
  }

  private sendConsoleResponseNotification(
    data: ApprovalResponseNotificationData
  ): void {
    const emoji =
      data.decision === 'approved'
        ? '✅'
        : data.decision === 'rejected'
        ? '❌'
        : '🔺';
    console.log(
      `${emoji} APPROVAL ${data.decision.toUpperCase()}: ${data.requestId}`
    );
    console.log(`👤 Decided by: ${data.approvedBy}`);
    if (data.message) {
      console.log(`💬 Reason: ${data.message}`);
    }
    console.log(`⏱️  Response time: ${data.responseTimeMs}ms`);
    console.log('─'.repeat(50));
  }

  private async sendWebSocketNotification(
    data: ApprovalNotificationData
  ): Promise<void> {
    const streamData = {
      type: 'approval_requested',
      data: {
        id: data.id,
        executionId: data.executionId,
        nodeId: data.nodeId,
        message: data.message,
        riskLevel: data.riskLevel,
        confidence: data.confidence,
        timeout: data.timeoutMs,
        approvers: data.approvers,
        approvalUrl: `/api/hitl/approve/${data.id}`,
        timestamp: new Date().toISOString(),
      },
    };

    // Send via streaming service for real-time WebSocket delivery
    if (this.streaming) {
      try {
        await this.streaming.broadcastToExecution(
          data.executionId,
          streamData
        );
        this.logger.debug(
          `Sent streaming notification for approval ${data.id}`
        );
      } catch (error) {
        this.logger.warn(
          `Failed to send streaming notification: ${(error as Error).message}`
        );
      }
    }

    // Also emit via EventEmitter2 for other listeners
    await this.eventEmitter.emitAsync(
      HITL_EVENTS.APPROVAL_REQUESTED,
      streamData
    );
  }

  private async sendWebSocketResponseNotification(
    data: ApprovalResponseNotificationData
  ): Promise<void> {
    const streamData = {
      type: 'approval_completed',
      data: {
        requestId: data.requestId,
        executionId: data.executionId,
        decision: data.decision,
        approvedBy: data.approvedBy,
        message: data.message,
        responseTime: data.responseTimeMs,
        timestamp: new Date().toISOString(),
      },
    };

    // Send via streaming service for real-time WebSocket delivery
    if (this.streaming) {
      try {
        await this.streaming.broadcastToExecution(
          data.executionId,
          streamData
        );
        this.logger.debug(
          `Sent streaming response notification for approval ${data.requestId}`
        );
      } catch (error) {
        this.logger.warn(
          `Failed to send streaming response notification: ${(error as Error).message}`
        );
      }
    }

    // Also emit via EventEmitter2 for other listeners
    await this.eventEmitter.emitAsync(
      HITL_EVENTS.APPROVAL_COMPLETED,
      streamData
    );
  }
}

/**
 * Data structure for approval request notifications
 */
export interface ApprovalNotificationData {
  /** Approval request ID */
  id: string;

  /** Execution ID */
  executionId: string;

  /** Node ID requesting approval */
  nodeId: string;

  /** Approval message */
  message: string;

  /** Timeout in milliseconds */
  timeoutMs: number;

  /** Risk level if available */
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';

  /** Confidence score (0-1) if available */
  confidence?: number;

  /** Assigned approvers if available */
  approvers?: string[];

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Data structure for approval response notifications
 */
export interface ApprovalResponseNotificationData {
  /** Approval request ID */
  requestId: string;

  /** Execution ID */
  executionId: string;

  /** Approval decision */
  decision: 'approved' | 'rejected' | 'escalated' | 'timeout';

  /** Who made the decision */
  approvedBy: string;

  /** Optional message/reason */
  message?: string;

  /** Response time in milliseconds */
  responseTimeMs: number;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Data structure for approval timeout notifications
 */
export interface ApprovalTimeoutNotificationData {
  /** Approval request ID */
  requestId: string;

  /** Execution ID */
  executionId: string;

  /** Timeout strategy applied */
  timeoutStrategy: 'approve' | 'reject' | 'escalate';

  /** Timeout duration in milliseconds */
  timeoutDuration: number;
}

/**
 * Data structure for approval escalation notifications
 */
export interface ApprovalEscalationNotificationData {
  /** Approval request ID */
  requestId: string;

  /** Who escalated the request */
  escalatedFrom: string;

  /** Who the request was escalated to */
  escalatedTo: string[];

  /** Escalation reason */
  reason?: string;
}
