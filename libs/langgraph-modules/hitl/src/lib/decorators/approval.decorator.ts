import 'reflect-metadata';

import type { WorkflowState } from '@hive-academy/langgraph-core';

import type { HumanApprovalService } from '../services/human-approval.service';
import type { ConfidenceEvaluatorService } from '../services/confidence-evaluator.service';
import type { ApprovalChainService } from '../services/approval-chain.service';
import { getHitlConfigWithDefaults } from '../utils/hitl-config.accessor';

/**
 * Risk level enumeration for approval decisions
 */
export enum ApprovalRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Approval escalation strategy
 */
export enum EscalationStrategy {
  CHAIN = 'chain', // Follow approval chain
  DIRECT = 'direct', // Direct to specific approver
  BROADCAST = 'broadcast', // Send to all in level
  ADAPTIVE = 'adaptive', // AI-driven selection
  IMMEDIATE = 'immediate', // Immediate escalation
}

/**
 * Enhanced options for @RequiresApproval decorator
 */
export interface RequiresApprovalOptions {
  /** Condition function to determine if approval is needed */
  when?: (state: WorkflowState) => boolean;

  /** Confidence threshold below which approval is required (0-1) */
  confidenceThreshold?: number;

  /** Risk level threshold for approval requirement */
  riskThreshold?: ApprovalRiskLevel;

  /** Message to show when requesting approval */
  message?: string | ((state: WorkflowState) => string);

  /** Additional metadata to include with approval request */
  metadata?: (state: WorkflowState) => Record<string, unknown>;

  /** Timeout for approval in milliseconds */
  timeoutMs?: number;

  /** What to do if timeout is reached */
  onTimeout?: 'approve' | 'reject' | 'escalate' | 'retry';

  /** Approval chain ID to use */
  chainId?: string;

  /** Escalation strategy */
  escalationStrategy?: EscalationStrategy;

  /** Skip approval if conditions are met */
  skipConditions?: {
    /** Skip if confidence above this threshold */
    highConfidence?: number;
    /** Skip if user has role */
    userRole?: string[];
    /** Skip if in safe mode */
    safeMode?: boolean;
    /** Custom skip condition */
    custom?: (state: WorkflowState) => boolean;
  };

  /** Risk assessment configuration */
  riskAssessment?: {
    /** Enable automatic risk evaluation */
    enabled?: boolean;
    /** Risk factors to consider */
    factors?: string[];
    /** Custom risk evaluator */
    evaluator?: (state: WorkflowState) => {
      level: ApprovalRiskLevel;
      factors: string[];
      score: number;
    };
  };

  /** Approval delegation options */
  delegation?: {
    /** Allow delegation */
    enabled?: boolean;
    /** Maximum delegation levels */
    maxLevels?: number;
    /** Allowed delegate roles */
    allowedRoles?: string[];
  };

  /** Custom approval handlers */
  handlers?: {
    /** Pre-approval hook */
    beforeApproval?: (state: WorkflowState) => Promise<void>;
    /** Post-approval hook */
    afterApproval?: (state: WorkflowState, approved: boolean) => Promise<void>;
  };
}

/**
 * Enhanced decorator to mark a node as requiring human approval with confidence evaluation
 * and approval chain integration
 *
 * @example
 * ```typescript
 * @Node('risky_operation')
 * @RequiresApproval({
 *   confidenceThreshold: 0.7,
 *   riskThreshold: ApprovalRiskLevel.MEDIUM,
 *   chainId: 'development-chain',
 *   message: (state) => `Deploy changes to ${state.environment}?`,
 *   timeoutMs: 3600000, // 1 hour
 *   onTimeout: 'escalate',
 *   riskAssessment: {
 *     enabled: true,
 *     factors: ['security', 'data-impact', 'user-impact']
 *   },
 *   skipConditions: {
 *     highConfidence: 0.95,
 *     userRole: ['admin', 'lead-developer']
 *   }
 * })
 * async performRiskyOperation(state: WorkflowState) {
 *   // This will route to approval based on confidence and risk assessment
 *   return { result: 'completed' };
 * }
 * ```
 */
export function RequiresApproval(
  options: RequiresApprovalOptions = {}
): MethodDecorator {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    // Get stored module configuration
    const moduleConfig = getHitlConfigWithDefaults();

    // Merge module config with decorator overrides
    const mergedOptions: RequiresApprovalOptions = {
      // ✅ Inherit from module config
      timeoutMs: options.timeoutMs ?? moduleConfig.defaultTimeout,
      confidenceThreshold:
        options.confidenceThreshold ?? moduleConfig.confidenceThreshold,
      // Other options from decorator
      ...options,
    };

    // Store enhanced approval metadata
    Reflect.defineMetadata(
      'approval:metadata',
      {
        ...mergedOptions,
        nodeId: String(propertyKey),
        decoratedAt: new Date(),
      },
      target,
      propertyKey
    );

    // Wrap the original method with enhanced approval logic
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      this: any,
      state: WorkflowState
    ): Promise<any> {
      try {
        // ✅ NEW: Get ApprovalEvaluatorService from DI container
        const evaluatorService = this.approvalEvaluatorService;

        if (!evaluatorService) {
          throw new Error(
            `ApprovalEvaluatorService not injected into ${
              target.constructor?.name || 'class'
            }. ` +
              `Classes using @RequiresApproval must inject ApprovalEvaluatorService.`
          );
        }

        // Get other services from DI container (for advanced evaluation)
        const humanApprovalService = this
          .humanApprovalService as HumanApprovalService;
        const confidenceEvaluator = this
          .confidenceEvaluatorService as ConfidenceEvaluatorService;
        const approvalChainService = this
          .approvalChainService as ApprovalChainService;

        // Run pre-approval hook if defined
        if (mergedOptions.handlers?.beforeApproval) {
          await mergedOptions.handlers.beforeApproval(state);
        }

        // ✅ REFACTORED: Use service delegation instead of prototype methods
        const shouldSkip = await evaluatorService.evaluateSkipConditions(
          state,
          mergedOptions
        );

        if (shouldSkip) {
          if (this.logger) {
            this.logger.debug(
              `Skipping approval for ${String(
                propertyKey
              )} - skip conditions met`
            );
          }
          return originalMethod.call(this, state);
        }

        // Check if already approved
        const approvalKey = `approved_${String(propertyKey)}`;
        const alreadyApproved = state[approvalKey] || state.approvalReceived;

        if (alreadyApproved) {
          if (this.logger) {
            this.logger.debug(
              `Approval already received for ${String(propertyKey)}`
            );
          }
          return originalMethod.call(this, state);
        }

        // ✅ REFACTORED: Use service delegation for approval evaluation
        const needsApproval = await evaluatorService.evaluateApprovalRequired(
          state,
          mergedOptions,
          {
            humanApprovalService,
            confidenceEvaluator,
            approvalChainService,
          }
        );

        if (needsApproval) {
          // ✅ REFACTORED: Use service delegation for routing
          return await evaluatorService.routeToApproval(
            state,
            mergedOptions,
            String(propertyKey)
          );
        }

        // Execute the original method
        const result = await originalMethod.call(this, state);

        // Run post-approval hook if defined
        if (mergedOptions.handlers?.afterApproval) {
          await mergedOptions.handlers.afterApproval(state, true);
        }

        return result;
      } catch (error) {
        if (this.logger) {
          this.logger.error(
            `Error in approval decorator for ${String(propertyKey)}:`,
            error
          );
        }

        // Run post-approval hook with failure
        if (mergedOptions.handlers?.afterApproval) {
          try {
            await mergedOptions.handlers.afterApproval(state, false);
          } catch (hookError) {
            if (this.logger) {
              this.logger.error('Error in afterApproval hook:', hookError);
            }
          }
        }

        throw error;
      }
    };

    // ✅ REMOVED: No longer adding prototype methods
    // All logic now delegated to ApprovalEvaluatorService
    // Classes using @RequiresApproval must inject ApprovalEvaluatorService

    return descriptor;
  };
}

/**
 * DEPRECATED PROTOTYPE METHODS - Removed in favor of ApprovalEvaluatorService
 *
 * The following methods were previously added to the class prototype:
 * - evaluateSkipConditions
 * - evaluateApprovalRequired
 * - routeToApproval
 *
 * They are now implemented in ApprovalEvaluatorService for proper DI support.
 */

// Remove old implementation - placeholder to mark where code was removed
function _deprecatedPrototypeMethods_DO_NOT_USE() {
  // This function exists only to document the refactoring
  // Old prototype method implementations have been moved to ApprovalEvaluatorService
  throw new Error(
    'Deprecated: Use ApprovalEvaluatorService instead of prototype methods'
  );
}

/**
 * Get approval options from a method
 */
export function getApprovalOptions(
  target: any,
  propertyKey: string | symbol
): RequiresApprovalOptions | undefined {
  return Reflect.getMetadata('approval:required', target, propertyKey);
}

/**
 * Decorator to handle approval responses
 *
 * @example
 * ```typescript
 * @ApprovalHandler()
 * async handleApproval(state: WorkflowState, feedback: HumanFeedback) {
 *   if (feedback.approved) {
 *     return { type: 'goto', goto: 'continue' };
 *   } else {
 *     return { type: 'end', update: { rejected: true } };
 *   }
 * }
 * ```
 */
export function ApprovalHandler(): MethodDecorator {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    // Mark as approval handler
    Reflect.defineMetadata('approval:handler', true, target, propertyKey);
    return descriptor;
  };
}

/**
 * Check if a method is an approval handler
 */
export function isApprovalHandler(
  target: any,
  propertyKey: string | symbol
): boolean {
  return Reflect.getMetadata('approval:handler', target, propertyKey) === true;
}
