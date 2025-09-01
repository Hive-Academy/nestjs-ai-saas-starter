import { Injectable, Logger } from '@nestjs/common';
import type { WorkflowState } from '@hive-academy/langgraph-core';

/**
 * Service for handling workflow routing logic
 * Provides flexible routing patterns for LangGraph workflows
 */
@Injectable()
export class WorkflowRoutingService {
  private readonly logger = new Logger(WorkflowRoutingService.name);

  /**
   * Route based on human approval decision
   */
  routeAfterHumanApproval(state: WorkflowState): string {
    if (!state.humanFeedback) {
      this.logger.debug('No human feedback available, defaulting to retry');
      return 'retry'; // Wait for feedback
    }

    const decision = state.humanFeedback.status;
    this.logger.log(`Human approval decision: ${decision}`);

    switch (decision) {
      case 'approved':
        return 'approved';
      case 'rejected':
        return 'rejected';
      case 'needs_revision':
        return 'revision';
      default:
        return 'retry';
    }
  }

  /**
   * Route based on confidence level
   */
  routeBasedOnConfidence(
    state: WorkflowState,
    nextNode: string,
    options?: {
      confidenceThreshold?: number;
      requiresHumanApproval?: boolean;
      autoApproveThreshold?: number;
      lowConfidenceRoute?: string;
    }
  ): string {
    const confidenceThreshold = options?.confidenceThreshold ?? 0.8;
    const requiresHumanApproval = options?.requiresHumanApproval ?? false;
    const autoApproveThreshold = options?.autoApproveThreshold ?? 0.95;
    const lowConfidenceRoute = options?.lowConfidenceRoute ?? 'human_approval';

    const confidence = state.confidence || 0;

    this.logger.debug(
      `Routing based on confidence: ${confidence} (threshold: ${confidenceThreshold})`
    );

    // High confidence - auto approve if enabled
    if (confidence >= autoApproveThreshold) {
      this.logger.log(`High confidence (${confidence}) - auto approving`);
      return nextNode;
    }

    // Medium confidence - human approval if required
    if (confidence >= confidenceThreshold) {
      if (requiresHumanApproval) {
        this.logger.log(
          `Medium confidence (${confidence}) - requiring human approval`
        );
        return 'human_approval';
      }
      this.logger.log(
        `Medium confidence (${confidence}) - proceeding to next node`
      );
      return nextNode;
    }

    // Low confidence - use configured route
    this.logger.log(
      `Low confidence (${confidence}) - routing to ${lowConfidenceRoute}`
    );
    return lowConfidenceRoute;
  }

  /**
   * Route based on workflow status
   */
  routeBasedOnStatus(
    state: WorkflowState,
    options?: {
      maxRetries?: number;
      pausedRoute?: string;
      waitingRoute?: string;
    }
  ): string {
    const maxRetries = options?.maxRetries ?? 3;
    const pausedRoute = options?.pausedRoute ?? 'human_approval';
    const waitingRoute = options?.waitingRoute ?? 'human_approval';

    const status = state.workflowStatus || state.status;

    this.logger.debug(`Routing based on status: ${status}`);

    switch (status) {
      case 'completed':
        return 'end';
      case 'failed':
        return (state.retryCount || 0) < maxRetries ? 'retry' : 'end';
      case 'paused':
        return pausedRoute;
      case 'waiting_input':
        return waitingRoute;
      default:
        return 'continue';
    }
  }

  /**
   * Route based on error conditions
   */
  routeOnError(
    state: WorkflowState,
    error: Error,
    options?: {
      maxRetries?: number;
      retryRoute?: string;
      errorRoute?: string;
    }
  ): string {
    const maxRetries = options?.maxRetries ?? 3;
    const retryRoute = options?.retryRoute ?? 'retry';
    const errorRoute = options?.errorRoute ?? 'human_approval';

    const retryCount = state.retryCount || 0;

    this.logger.debug(
      `Routing on error: ${error.message} (retry ${retryCount}/${maxRetries})`
    );

    // Check if error is recoverable
    if (this.isRecoverableError(error)) {
      if (retryCount < maxRetries) {
        this.logger.log(
          `Recoverable error, retrying (attempt ${retryCount + 1})`
        );
        return retryRoute;
      }
      this.logger.log(`Max retries exceeded, routing to ${errorRoute}`);
      return errorRoute;
    }
    this.logger.log(`Non-recoverable error, routing to ${errorRoute}`);
    return errorRoute;
  }

  /**
   * Check if an error is recoverable
   */
  isRecoverableError(error: Error): boolean {
    const recoverablePatterns = [
      /timeout/i,
      /network/i,
      /connection/i,
      /rate limit/i,
      /temporary/i,
      /transient/i,
      /retry/i,
    ];

    return recoverablePatterns.some((pattern) => pattern.test(error.message));
  }

  /**
   * Get suggested recovery action for an error
   */
  getSuggestedRecoveryAction(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('network')) {
      return 'retry_with_backoff';
    }
    if (message.includes('rate limit')) {
      return 'wait_and_retry';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'human_review';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'check_credentials';
    }
    if (message.includes('not found')) {
      return 'verify_resource';
    }

    return 'human_review';
  }

  /**
   * Create routing map for conditional edges
   */
  createRoutingMap(
    routes: Record<string, string>,
    options?: {
      includeDefaults?: boolean;
      defaultRoutes?: Record<string, string>;
    }
  ): Record<string, string> {
    const includeDefaults = options?.includeDefaults ?? true;
    const defaultRoutes = options?.defaultRoutes ?? this.getDefaultRouting();

    const routingMap: Record<string, string> = { ...routes };

    if (includeDefaults) {
      // Add default routes if not already defined
      Object.entries(defaultRoutes).forEach(([condition, target]) => {
        if (!(condition in routingMap)) {
          routingMap[condition] = target;
        }
      });
    }

    return routingMap;
  }

  /**
   * Validate routing configuration
   */
  validateRouting(
    routingMap: Record<string, string>,
    availableNodes: string[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const nodeSet = new Set(availableNodes);

    Object.entries(routingMap).forEach(([condition, target]) => {
      if (!nodeSet.has(target) && !['end', '__end__'].includes(target)) {
        errors.push(
          `Invalid routing target '${target}' for condition '${condition}'`
        );
      }
    });

    if (errors.length > 0) {
      this.logger.warn(`Routing validation failed: ${errors.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get default routing for common scenarios
   */
  getDefaultRouting(): Record<string, string> {
    return {
      approved: 'continue',
      rejected: 'end',
      retry: 'retry',
      error: 'human_approval',
      timeout: 'retry',
      success: 'end',
      failure: 'human_approval',
      continue: 'continue',
      skip: 'skip',
      end: 'end',
    };
  }

  /**
   * Create a conditional routing function
   */
  createConditionalRouter<TState extends WorkflowState = WorkflowState>(
    routingLogic: (state: TState) => string
  ): (state: TState) => string {
    return (state: TState) => {
      try {
        const route = routingLogic(state);
        this.logger.debug(`Conditional routing selected: ${route}`);
        return route;
      } catch (error) {
        this.logger.error('Error in conditional routing:', error);
        return 'error';
      }
    };
  }

  /**
   * Create a multi-condition router
   */
  createMultiConditionRouter<TState extends WorkflowState = WorkflowState>(
    conditions: Array<{
      condition: (state: TState) => boolean;
      route: string;
    }>,
    defaultRoute = 'continue'
  ): (state: TState) => string {
    return (state: TState) => {
      for (const { condition, route } of conditions) {
        try {
          if (condition(state)) {
            this.logger.debug(`Multi-condition routing matched: ${route}`);
            return route;
          }
        } catch (error) {
          this.logger.warn(
            `Error evaluating condition for route ${route}:`,
            error
          );
        }
      }

      this.logger.debug(
        `No conditions matched, using default: ${defaultRoute}`
      );
      return defaultRoute;
    };
  }

  /**
   * Create a weighted random router for A/B testing
   */
  createWeightedRouter(
    routes: Array<{ route: string; weight: number }>
  ): () => string {
    const totalWeight = routes.reduce((sum, r) => sum + r.weight, 0);

    return () => {
      const random = Math.random() * totalWeight;
      let accumulated = 0;

      for (const { route, weight } of routes) {
        accumulated += weight;
        if (random < accumulated) {
          this.logger.debug(
            `Weighted routing selected: ${route} (weight: ${weight})`
          );
          return route;
        }
      }

      // Fallback (should not happen with proper weights)
      return routes[0].route;
    };
  }

  /**
   * Create a sequential router that follows a predefined order
   */
  createSequentialRouter<TState extends WorkflowState = WorkflowState>(
    sequence: string[],
    options?: {
      loop?: boolean;
      skipCondition?: (state: TState) => boolean;
    }
  ): (state: TState) => string {
    return (state: TState) => {
      const currentIndex = sequence.indexOf(state.currentNode || '');

      // Check skip condition
      if (options?.skipCondition?.(state)) {
        this.logger.debug('Skip condition met, ending sequence');
        return 'end';
      }

      // Determine next index
      let nextIndex = currentIndex + 1;

      if (nextIndex >= sequence.length) {
        if (options?.loop) {
          nextIndex = 0;
          this.logger.debug('Sequence complete, looping back to start');
        } else {
          this.logger.debug('Sequence complete, ending');
          return 'end';
        }
      }

      const nextRoute = sequence[nextIndex];
      this.logger.debug(
        `Sequential routing: ${nextRoute} (step ${nextIndex + 1}/${
          sequence.length
        })`
      );
      return nextRoute;
    };
  }
}
