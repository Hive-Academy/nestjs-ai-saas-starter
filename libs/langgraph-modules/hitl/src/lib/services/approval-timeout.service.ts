import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HITL_EVENTS } from '../constants';
import {
  ApprovalWorkflowState,
  HumanApprovalRequest,
  HumanApprovalResponse,
} from './approval-workflow.types';

/**
 * Approval Timeout Service
 * Handles timeout logic for approval requests
 */
@Injectable()
export class ApprovalTimeoutService {
  private readonly logger = new Logger(ApprovalTimeoutService.name);
  private readonly timeoutHandlers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Setup timeout for approval request
   */
  setupTimeout(
    requestId: string,
    request: HumanApprovalRequest,
    onTimeout: (requestId: string) => Promise<void>
  ): void {
    // Clear existing timeout
    this.clearTimeout(requestId);

    // Set new timeout
    const timeout = setTimeout(() => {
      onTimeout(requestId);
    }, request.timeout.duration);

    this.timeoutHandlers.set(requestId, timeout);
  }

  /**
   * Clear timeout for approval request
   */
  clearTimeout(requestId: string): void {
    const timeout = this.timeoutHandlers.get(requestId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeoutHandlers.delete(requestId);
    }
  }

  /**
   * Handle approval timeout
   */
  async handleTimeout(
    requestId: string,
    request: HumanApprovalRequest,
    processResponse: (
      requestId: string,
      response: HumanApprovalResponse
    ) => Promise<any>
  ): Promise<void> {
    if (
      !request ||
      request.workflowState !== ApprovalWorkflowState.IN_PROGRESS
    ) {
      return;
    }

    this.logger.warn(`Approval timeout for request ${requestId}`);

    request.workflowState = ApprovalWorkflowState.TIMEOUT;
    request.timestamps.timeout = new Date();

    // Handle based on timeout strategy
    switch (request.timeout.strategy) {
      case 'approve':
        await processResponse(requestId, {
          requestId,
          decision: 'approved',
          approver: {
            id: 'system',
            name: 'Auto-Approval (Timeout)',
            role: 'system',
          },
          message: 'Auto-approved due to timeout',
          timestamp: new Date(),
        });
        break;

      case 'reject':
        await processResponse(requestId, {
          requestId,
          decision: 'rejected',
          approver: {
            id: 'system',
            name: 'Auto-Rejection (Timeout)',
            role: 'system',
          },
          message: 'Auto-rejected due to timeout',
          timestamp: new Date(),
        });
        break;

      case 'escalate':
        if (request.chainId) {
          await processResponse(requestId, {
            requestId,
            decision: 'escalated',
            approver: {
              id: 'system',
              name: 'Auto-Escalation (Timeout)',
              role: 'system',
            },
            message: 'Escalated due to timeout',
            timestamp: new Date(),
          });
        } else {
          // No chain to escalate to, reject
          await processResponse(requestId, {
            requestId,
            decision: 'rejected',
            approver: {
              id: 'system',
              name: 'Auto-Rejection (No Escalation)',
              role: 'system',
            },
            message: 'Rejected due to timeout (no escalation chain)',
            timestamp: new Date(),
          });
        }
        break;

      case 'retry':
        if (request.retry.count < request.retry.maxAttempts) {
          request.retry.count++;
          request.workflowState = ApprovalWorkflowState.IN_PROGRESS;
          this.setupTimeout(requestId, request, (id) =>
            this.handleTimeout(id, request, processResponse)
          );

          await this.eventEmitter.emit(HITL_EVENTS.APPROVAL_REQUESTED, {
            request,
            retryAttempt: request.retry.count,
          });
        } else {
          await processResponse(requestId, {
            requestId,
            decision: 'rejected',
            approver: {
              id: 'system',
              name: 'Auto-Rejection (Max Retries)',
              role: 'system',
            },
            message: 'Rejected after maximum retry attempts',
            timestamp: new Date(),
          });
        }
        break;
    }

    // Emit timeout event
    await this.eventEmitter.emit(HITL_EVENTS.APPROVAL_TIMEOUT, {
      requestId,
      executionId: request.executionId,
      strategy: request.timeout.strategy,
      retryCount: request.retry.count,
    });
  }

  /**
   * Clear all timeouts (useful for cleanup)
   */
  clearAllTimeouts(): void {
    for (const [requestId, timeout] of this.timeoutHandlers.entries()) {
      clearTimeout(timeout);
      this.logger.debug(`Cleaned up timeout handler for request ${requestId}`);
    }
    this.timeoutHandlers.clear();
  }
}
