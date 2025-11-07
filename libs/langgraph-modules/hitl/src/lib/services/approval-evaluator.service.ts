import { Injectable, Logger } from '@nestjs/common';
import type { WorkflowState } from '@hive-academy/langgraph-core';
import type {
  RequiresApprovalOptions,
  ApprovalRiskLevel,
} from '../decorators/approval.decorator';
import type { HumanApprovalService } from './human-approval.service';
import type { ConfidenceEvaluatorService } from './confidence-evaluator.service';
import type { ApprovalChainService } from './approval-chain.service';

/**
 * ApprovalEvaluatorService - Centralized Approval Decision Logic
 *
 * Purpose: Extract decorator logic into a proper injectable service
 * Pattern: Service delegation pattern for decorator support
 *
 * This service contains all the business logic previously embedded in the
 * @RequiresApproval decorator. By extracting to a service, we:
 *
 * 1. ✅ Fix decorator method binding issues
 * 2. ✅ Enable proper dependency injection
 * 3. ✅ Make logic testable in isolation
 * 4. ✅ Follow SOLID principles (Single Responsibility)
 * 5. ✅ Enable reuse across multiple decorators/contexts
 *
 * @injectable NestJS service with proper DI
 */
@Injectable()
export class ApprovalEvaluatorService {
  private readonly logger = new Logger(ApprovalEvaluatorService.name);

  /**
   * Evaluate if approval should be skipped based on configured conditions
   *
   * @param state - Current workflow state
   * @param options - Approval configuration options
   * @returns true if approval should be skipped, false otherwise
   */
  async evaluateSkipConditions(
    state: WorkflowState,
    options: RequiresApprovalOptions
  ): Promise<boolean> {
    const skip = options.skipConditions;
    if (!skip) {
      return false;
    }

    // High confidence skip
    if (skip.highConfidence && (state.confidence || 0) >= skip.highConfidence) {
      this.logger.debug(
        `Skipping approval: confidence ${state.confidence} >= ${skip.highConfidence}`
      );
      return true;
    }

    // User role skip
    if (skip.userRole && state.metadata?.userRole) {
      const userRole = state.metadata.userRole as string;
      if (skip.userRole.includes(userRole)) {
        this.logger.debug(
          `Skipping approval: user role ${userRole} in allowed list`
        );
        return true;
      }
    }

    // Safe mode skip
    if (skip.safeMode && state.metadata?.safeMode === true) {
      this.logger.debug('Skipping approval: safe mode enabled');
      return true;
    }

    // Custom skip condition
    if (skip.custom) {
      const customResult = skip.custom(state);
      if (customResult) {
        this.logger.debug('Skipping approval: custom condition met');
      }
      return customResult;
    }

    return false;
  }

  /**
   * Evaluate if approval is required based on confidence, risk, and custom conditions
   *
   * @param state - Current workflow state
   * @param options - Approval configuration options
   * @param services - Optional services for advanced evaluation (confidence, chains)
   * @returns true if approval is required, false otherwise
   */
  async evaluateApprovalRequired(
    state: WorkflowState,
    options: RequiresApprovalOptions,
    services: {
      humanApprovalService?: HumanApprovalService;
      confidenceEvaluator?: ConfidenceEvaluatorService;
      approvalChainService?: ApprovalChainService;
    }
  ): Promise<boolean> {
    // Custom condition check
    if (options.when?.(state)) {
      this.logger.debug(
        'Approval required: custom when() condition returned true'
      );
      return true;
    }

    // Confidence threshold check
    if (options.confidenceThreshold !== undefined) {
      const confidence = services.confidenceEvaluator
        ? await services.confidenceEvaluator.evaluateConfidence(state)
        : state.confidence || 0;

      if (confidence < options.confidenceThreshold) {
        this.logger.debug(
          `Approval required: confidence ${confidence} < threshold ${options.confidenceThreshold}`
        );
        return true;
      }
    }

    // Risk assessment check
    if (options.riskAssessment?.enabled && services.confidenceEvaluator) {
      const riskAssessment = await services.confidenceEvaluator.assessRisk(
        state,
        {
          factors: options.riskAssessment.factors || [],
          customEvaluator: options.riskAssessment.evaluator,
        }
      );

      if (options.riskThreshold) {
        const riskLevels = {
          low: 1,
          medium: 2,
          high: 3,
          critical: 4,
        };

        const currentRiskLevel =
          riskLevels[riskAssessment.level as ApprovalRiskLevel];
        const thresholdLevel = riskLevels[options.riskThreshold];

        if (currentRiskLevel >= thresholdLevel) {
          this.logger.debug(
            `Approval required: risk level ${riskAssessment.level} >= threshold ${options.riskThreshold}`
          );
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Route workflow to approval node with all necessary context
   *
   * @param state - Current workflow state
   * @param options - Approval configuration options
   * @param nodeId - ID of the node requiring approval
   * @returns Routing command to send workflow to approval node
   */
  async routeToApproval(
    state: WorkflowState,
    options: RequiresApprovalOptions,
    nodeId: string
  ): Promise<any> {
    // Generate approval message
    const message =
      typeof options.message === 'function'
        ? options.message(state)
        : options.message || `Approval required for ${nodeId}`;

    // Generate metadata
    const metadata = options.metadata ? options.metadata(state) : {};

    this.logger.log(`Routing to approval: ${message}`);

    return {
      type: 'goto',
      goto: 'human_approval',
      update: {
        waitingForApproval: true,
        approvalRequest: {
          nodeId,
          message,
          metadata: {
            ...metadata,
            confidenceThreshold: options.confidenceThreshold,
            riskThreshold: options.riskThreshold,
            chainId: options.chainId,
            escalationStrategy: options.escalationStrategy,
            timeoutMs: options.timeoutMs,
            onTimeout: options.onTimeout || 'reject',
          },
          requestedAt: new Date(),
        },
      },
      metadata: {
        approvalOptions: options,
        nodeId,
        timestamp: new Date(),
      },
    };
  }
}
