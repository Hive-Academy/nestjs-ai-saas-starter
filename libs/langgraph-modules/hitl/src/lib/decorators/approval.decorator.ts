import 'reflect-metadata';

import type { WorkflowState } from '@hive-academy/langgraph-core';
import type { RunnableConfig } from '@langchain/core/runnables';
import { UnauthorizedException } from '@nestjs/common';

import type { HumanApprovalService } from '../services/human-approval.service';
import type { ConfidenceEvaluatorService } from '../services/confidence-evaluator.service';
import type { ApprovalChainService } from '../services/approval-chain.service';
import { getHitlConfigWithDefaults } from '../utils/hitl-config.accessor';
import { getApprovalEvaluatorService } from '../utils/approval-service.locator';
import { WorkflowAuthContextService } from '@hive-academy/langgraph-workflow-engine';

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

  /** Approver authorization requirements */
  approverAuth?: {
    roles?: string[];
    permissions?: string[];
    tiers?: ('free' | 'pro' | 'enterprise')[];
    requireChainMembership?: boolean;
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
 *   },
 *   approverAuth: {
 *     roles: ['admin', 'manager'],
 *     tiers: ['enterprise']
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
      state: WorkflowState,
      config?: RunnableConfig
    ): Promise<any> {
      try {
        // ✅ REFACTORED: Get ApprovalEvaluatorService from service locator
        // No manual injection required - service automatically available from module
        const evaluatorService = getApprovalEvaluatorService();

        if (!evaluatorService) {
          throw new Error(
            `ApprovalEvaluatorService not initialized. ` +
              `Ensure HitlModule.forRoot() is imported in your root module.`
          );
        }

        // ✅ TASK 3.1: Extract user context from RunnableConfig
        // Evidence: hitl-auth-analysis.md:129-153
        // This enables skip condition validation and stores approver auth for service validation
        const user = WorkflowAuthContextService.extractUserContext(config);

        if (!user) {
          throw new UnauthorizedException(
            `Approval operations require authentication`
          );
        }

        // ✅ TASK 3.1: Store approver auth requirements in state for later validation
        // Evidence: hitl-auth-analysis.md:147-153
        // HumanApprovalService.processApprovalResponse() will validate against this
        if (mergedOptions.approverAuth) {
          // Store in state metadata for approval service validation
          // Type assertion needed as WorkflowState has readonly index signature
          (state as any)._approvalContext = {
            requesterId: user.userId,
            requesterRoles: user.roles,
            approverAuth: mergedOptions.approverAuth,
          };
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
          return originalMethod.call(this, state, config);
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
          return originalMethod.call(this, state, config);
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
        const result = await originalMethod.call(this, state, config);

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

    // ✅ ARCHITECTURE: Service Locator Pattern
    // ApprovalEvaluatorService accessed via service locator (no manual injection required)
    // Service is stored globally by HitlModule during initialization
    // This eliminates the need for consumers to inject ApprovalEvaluatorService

    return descriptor;
  };
}

/**
 * ARCHITECTURE NOTES
 *
 * Service Access Pattern:
 * - ApprovalEvaluatorService accessed via service locator (getApprovalEvaluatorService())
 * - No manual injection required in consumer classes
 * - Service automatically available when HitlModule.forRoot() is imported
 *
 * Previous Architecture (REMOVED):
 * - Required manual injection: constructor(@Inject(...) private approvalEvaluator)
 * - Error-prone: Easy to forget injection
 * - Poor DX: Extra boilerplate in every consumer class
 *
 * New Architecture (CURRENT):
 * - Automatic service access via service locator
 * - Zero boilerplate in consumer classes
 * - Just use @RequiresApproval() - it works!
 */

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
