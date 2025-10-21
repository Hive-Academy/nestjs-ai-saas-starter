import { Injectable, Logger } from '@nestjs/common';
import {
  HumanApprovalRequest,
  HumanApprovalResponse,
  ApprovalWorkflowState,
} from './approval-workflow.types';
import { EscalationStrategy } from '../decorators/approval.decorator';
import { IHitlValidationService } from '../interfaces/hitl-services.interface';
import { HITL_DEFAULTS } from '../constants';

/**
 * Service for validating HITL approval requests and responses
 * Handles policy enforcement and validation logic
 */
@Injectable()
export class HitlValidationService implements IHitlValidationService {
  private readonly logger = new Logger(HitlValidationService.name);

  constructor() {
    this.logger.log('✅ HITL Validation Service initialized');
  }

  /**
   * Validate approval request against policies
   */
  async validateApprovalRequest(request: HumanApprovalRequest): Promise<{
    isValid: boolean;
    violations: string[];
    warnings: string[];
  }> {
    const violations: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate required fields
      if (!request.id) violations.push('Request ID is required');
      if (!request.executionId) violations.push('Execution ID is required');
      if (!request.nodeId) violations.push('Node ID is required');
      if (!request.message || request.message.trim().length === 0) {
        violations.push('Approval message cannot be empty');
      }

      // Validate confidence values
      if (request.confidence.current < 0 || request.confidence.current > 1) {
        violations.push('Confidence must be between 0 and 1');
      }
      if (
        request.confidence.threshold < 0 ||
        request.confidence.threshold > 1
      ) {
        violations.push('Confidence threshold must be between 0 and 1');
      }

      // Validate timeout settings
      if (request.timeout.duration <= 0) {
        violations.push('Timeout duration must be positive');
      }
      if (request.timeout.duration > HITL_DEFAULTS.MAX_APPROVAL_TIMEOUT_MS) {
        warnings.push(
          `Timeout duration exceeds recommended maximum of ${HITL_DEFAULTS.MAX_APPROVAL_TIMEOUT_MS}ms`
        );
      }

      // Validate workflow state
      if (
        !Object.values(ApprovalWorkflowState).includes(request.workflowState)
      ) {
        violations.push('Invalid workflow state');
      }

      // Validate retry settings
      if (request.retry.count < 0)
        violations.push('Retry count cannot be negative');
      if (request.retry.maxAttempts < 0)
        violations.push('Max retry attempts cannot be negative');
      if (request.retry.count > request.retry.maxAttempts) {
        violations.push('Retry count cannot exceed max attempts');
      }

      // Validate risk assessment if present
      if (request.riskAssessment) {
        if (
          !['low', 'medium', 'high', 'critical'].includes(
            request.riskAssessment.level
          )
        ) {
          violations.push('Invalid risk assessment level');
        }
        if (
          request.riskAssessment.score < 0 ||
          request.riskAssessment.score > 1
        ) {
          violations.push('Risk assessment score must be between 0 and 1');
        }
      }

      // Validate chain configuration if present
      if (request.chainId) {
        const chainValidation = await this.validateChainConfiguration(
          request.chainId,
          request
        );
        violations.push(
          ...chainValidation.issues.filter((issue) =>
            issue.startsWith('Error:')
          )
        );
        warnings.push(
          ...chainValidation.issues.filter((issue) =>
            issue.startsWith('Warning:')
          )
        );
      }

      // Validate approvers list if present
      if (request.approvers) {
        if (request.approvers.length === 0) {
          warnings.push('No approvers specified for approval request');
        }

        // Check for duplicate approvers
        const uniqueApprovers = new Set(request.approvers);
        if (uniqueApprovers.size !== request.approvers.length) {
          warnings.push('Duplicate approvers detected in the list');
        }
      }

      // Validate metadata if present
      if (request.metadata && typeof request.metadata !== 'object') {
        violations.push('Metadata must be an object');
      }

      // Security validations
      if (request.message.length > 10000) {
        violations.push('Approval message too long (max 10000 characters)');
      }

      // Check for potential security issues in the message
      if (this.containsSensitiveData(request.message)) {
        warnings.push('Approval message may contain sensitive data');
      }

      return {
        isValid: violations.length === 0,
        violations,
        warnings,
      };
    } catch (error) {
      this.logger.error(
        `Validation error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return {
        isValid: false,
        violations: ['Internal validation error occurred'],
        warnings: [],
      };
    }
  }

  /**
   * Validate human response against constraints
   */
  async validateHumanResponse(
    response: HumanApprovalResponse,
    request: HumanApprovalRequest
  ): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Validate required fields
      if (!response.requestId) errors.push('Request ID is required');
      if (!response.decision) errors.push('Decision is required');
      if (!response.approver?.id) errors.push('Approver ID is required');
      if (!response.timestamp) errors.push('Timestamp is required');

      // Validate decision value
      if (!['approved', 'rejected', 'escalated'].includes(response.decision)) {
        errors.push('Decision must be approved, rejected, or escalated');
      }

      // Validate request ID match
      if (response.requestId !== request.id) {
        errors.push('Response request ID does not match original request');
      }

      // Validate approver authorization
      if (request.approvers && request.approvers.length > 0) {
        if (!request.approvers.includes(response.approver.id)) {
          errors.push('Approver is not authorized for this request');
        }
      }

      // Validate timing constraints
      const requestTime = request.timestamps.requested.getTime();
      const responseTime = response.timestamp.getTime();

      if (responseTime < requestTime) {
        errors.push('Response timestamp cannot be before request timestamp');
      }

      const timeElapsed = responseTime - requestTime;
      if (timeElapsed > request.timeout.duration) {
        errors.push('Response received after timeout deadline');
      }

      // Validate workflow state allows response
      if (request.workflowState === ApprovalWorkflowState.APPROVED) {
        errors.push('Cannot respond to already completed approval');
      }
      if (request.workflowState === ApprovalWorkflowState.CANCELLED) {
        errors.push('Cannot respond to cancelled approval');
      }
      if (request.workflowState === ApprovalWorkflowState.TIMEOUT) {
        errors.push('Cannot respond to timed out approval');
      }

      // Validate message length if present
      if (response.message && response.message.length > 5000) {
        errors.push('Response message too long (max 5000 characters)');
      }

      // Check for sensitive data in response
      if (response.message && this.containsSensitiveData(response.message)) {
        errors.push('Response message may contain sensitive data');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      this.logger.error(
        `Response validation error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return {
        isValid: false,
        errors: ['Internal validation error occurred'],
      };
    }
  }

  /**
   * Check if request requires escalation
   */
  async requiresEscalation(request: HumanApprovalRequest): Promise<boolean> {
    try {
      // Check confidence-based escalation
      if (
        request.confidence.current <
        HITL_DEFAULTS.ESCALATION_CONFIDENCE_THRESHOLD
      ) {
        return true;
      }

      // Check risk-based escalation
      if (request.riskAssessment?.level === 'critical') {
        return true;
      }
      if (
        request.riskAssessment?.level === 'high' &&
        request.confidence.current < 0.7
      ) {
        return true;
      }

      // Check retry-based escalation
      if (request.retry.count >= Math.floor(request.retry.maxAttempts * 0.8)) {
        return true;
      }

      // Check timeout-based escalation
      const now = Date.now();
      const requestTime = request.timestamps.requested.getTime();
      const timeElapsed = now - requestTime;

      if (timeElapsed > request.timeout.duration * 0.9) {
        return true;
      }

      // Check escalation strategy
      if (request.options.escalationStrategy === EscalationStrategy.IMMEDIATE) {
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Escalation check error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  }

  /**
   * Validate chain configuration
   */
  async validateChainConfiguration(
    chainId: string,
    request: HumanApprovalRequest
  ): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Validate chain ID format
      if (!chainId || chainId.trim().length === 0) {
        issues.push('Error: Chain ID cannot be empty');
      }

      if (chainId.length > 100) {
        issues.push('Error: Chain ID too long (max 100 characters)');
      }

      // Check for valid chain ID format (alphanumeric with hyphens/underscores)
      if (!/^[a-zA-Z0-9_-]+$/.test(chainId)) {
        issues.push('Error: Chain ID contains invalid characters');
      }

      // Validate escalation strategy compatibility
      if (request.options.escalationStrategy === EscalationStrategy.DIRECT) {
        issues.push(
          'Warning: Direct escalation strategy conflicts with chain configuration'
        );
      }

      // Check for circular chain references (basic check)
      if (chainId.includes(request.executionId)) {
        issues.push(
          'Warning: Potential circular reference in chain configuration'
        );
      }

      // Validate timeout is reasonable for chain processing
      if (request.timeout.duration < 60000) {
        // Less than 1 minute
        issues.push('Warning: Timeout may be too short for chain processing');
      }

      return {
        isValid:
          issues.filter((issue) => issue.startsWith('Error:')).length === 0,
        issues,
      };
    } catch (error) {
      this.logger.error(
        `Chain validation error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return {
        isValid: false,
        issues: ['Error: Internal chain validation error'],
      };
    }
  }

  // =====================
  // PRIVATE HELPER METHODS
  // =====================

  private containsSensitiveData(text: string): boolean {
    const sensitivePatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card numbers
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN format
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
      /\b(?:password|pwd|secret|token|key)\s*[:=]\s*\S+/i, // Password-like patterns
      /\b(?:api[_-]?key|access[_-]?token)\s*[:=]\s*\S+/i, // API keys/tokens
    ];

    return sensitivePatterns.some((pattern) => pattern.test(text));
  }
}
