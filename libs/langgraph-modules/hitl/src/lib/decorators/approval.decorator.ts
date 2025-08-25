import 'reflect-metadata';

import type { WorkflowState } from '@hive-academy/langgraph-core';

import type { HumanApprovalService } from '../services/human-approval.service';
import type { ConfidenceEvaluatorService } from '../services/confidence-evaluator.service';
import type { ApprovalChainService } from '../services/approval-chain.service';

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
    // Store enhanced approval metadata
    Reflect.defineMetadata(
      'approval:metadata',
      {
        ...options,
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
        // Get services from DI container (if available)
        const humanApprovalService = this
          .humanApprovalService as HumanApprovalService;
        const confidenceEvaluator = this
          .confidenceEvaluatorService as ConfidenceEvaluatorService;
        const approvalChainService = this
          .approvalChainService as ApprovalChainService;

        // Run pre-approval hook if defined
        if (options.handlers?.beforeApproval) {
          await options.handlers.beforeApproval(state);
        }

        // Check skip conditions first
        const shouldSkip = await this.evaluateSkipConditions(state, options);
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

        // Evaluate if approval is needed
        const needsApproval = await this.evaluateApprovalRequired(
          state,
          options,
          {
            humanApprovalService,
            confidenceEvaluator,
            approvalChainService,
          }
        );

        if (needsApproval) {
          return await this.routeToApproval(
            state,
            options,
            String(propertyKey)
          );
        }

        // Execute the original method
        const result = await originalMethod.call(this, state);

        // Run post-approval hook if defined
        if (options.handlers?.afterApproval) {
          await options.handlers.afterApproval(state, true);
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
        if (options.handlers?.afterApproval) {
          try {
            await options.handlers.afterApproval(state, false);
          } catch (hookError) {
            if (this.logger) {
              this.logger.error('Error in afterApproval hook:', hookError);
            }
          }
        }

        throw error;
      }
    };

    // Add helper methods to the decorated class
    if (!target.evaluateSkipConditions) {
      target.evaluateSkipConditions = async function (
        state: WorkflowState,
        options: RequiresApprovalOptions
      ): Promise<boolean> {
        const skip = options.skipConditions;
        if (!skip) {return false;}

        // High confidence skip
        if (
          skip.highConfidence &&
          (state.confidence || 0) >= skip.highConfidence
        ) {
          return true;
        }

        // User role skip
        if (skip.userRole && state.metadata?.userRole) {
          const userRole = state.metadata.userRole as string;
          if (skip.userRole.includes(userRole)) {
            return true;
          }
        }

        // Safe mode skip
        if (skip.safeMode && state.metadata?.safeMode === true) {
          return true;
        }

        // Custom skip condition
        if (skip.custom) {
          return skip.custom(state);
        }

        return false;
      };
    }

    if (!target.evaluateApprovalRequired) {
      target.evaluateApprovalRequired = async function (
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
          return true;
        }

        // Confidence threshold check
        if (options.confidenceThreshold !== undefined) {
          const confidence = services.confidenceEvaluator
            ? await services.confidenceEvaluator.evaluateConfidence(state)
            : state.confidence || 0;

          if (confidence < options.confidenceThreshold) {
            if (this.logger) {
              this.logger.debug(
                `Approval required: confidence ${confidence} < threshold ${options.confidenceThreshold}`
              );
            }
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
              [ApprovalRiskLevel.LOW]: 1,
              [ApprovalRiskLevel.MEDIUM]: 2,
              [ApprovalRiskLevel.HIGH]: 3,
              [ApprovalRiskLevel.CRITICAL]: 4,
            };

            const currentRiskLevel = riskLevels[riskAssessment.level as ApprovalRiskLevel];
            const thresholdLevel = riskLevels[options.riskThreshold];

            if (currentRiskLevel >= thresholdLevel) {
              if (this.logger) {
                this.logger.debug(
                  `Approval required: risk level ${riskAssessment.level} >= threshold ${options.riskThreshold}`
                );
              }
              return true;
            }
          }
        }

        return false;
      };
    }

    if (!target.routeToApproval) {
      target.routeToApproval = async function (
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

        if (this.logger) {
          this.logger.log(`Routing to approval: ${message}`);
        }

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
      };
    }

    return descriptor;
  };
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
