import { Injectable, Inject, Optional } from '@nestjs/common';
import type {
  ICreatableAdapter,
  IExecutableAdapter,
  ExtendedAdapterStatus,
} from './interfaces/adapter.interface';
import { BaseModuleAdapter } from './base/base.adapter';

/**
 * Configuration for Human-in-the-Loop (HITL) operations
 */
export interface HitlConfig {
  enabled?: boolean;
  /** Timeout in milliseconds for human responses */
  timeout?: number;
  /** Default interrupt points in workflow */
  interruptPoints?: string[];
  /** Auto-approve certain operations */
  autoApprove?: string[];
  /** Notification settings */
  notifications?: {
    enabled?: boolean;
    webhook?: string;
    email?: string;
  };
}

/**
 * Result of HITL operations
 */
export interface HitlResult {
  /** Unique identifier for the interrupt */
  interruptId: string;
  /** Current state of the human interaction */
  state: 'waiting' | 'approved' | 'rejected' | 'timeout';
  /** Human decision/input */
  decision?: any;
  /** Timestamp of interaction */
  timestamp: Date;
  /** Context for the human decision */
  context?: Record<string, any>;
}

/**
 * Human input request structure
 */
export interface HumanInputRequest {
  /** Prompt to display to human */
  prompt: string;
  /** Timeout for response */
  timeout?: number;
  /** Available options for human */
  options?: string[];
  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Adapter that bridges the main NestJS LangGraph library to the enterprise HITL module
 *
 * This adapter follows the Adapter pattern to provide seamless integration between
 * the main library and the specialized Human-in-the-Loop module without breaking existing APIs.
 *
 * Benefits:
 * - Maintains backward compatibility with existing HITL APIs
 * - Delegates to enterprise-grade HITL module when available
 * - Provides fallback to basic functionality when child module not installed
 * - Follows SOLID principles with single responsibility (bridge interface)
 */
@Injectable()
export class HitlAdapter
  extends BaseModuleAdapter<HitlConfig, HitlResult>
  implements
    ICreatableAdapter<HitlConfig, HitlResult>,
    IExecutableAdapter<HumanInputRequest, HitlResult>
{
  protected readonly serviceName = 'hitl';

  constructor(
    @Optional()
    @Inject('HitlInterruptService')
    private readonly hitlService?: any,
    @Optional()
    @Inject('HumanInteractionManager')
    private readonly interactionManager?: any
  ) {
    super();
  }

  /**
   * Create HITL interrupt handler - delegates to enterprise module if available
   * Falls back to basic implementation when enterprise module not installed
   */
  async create(config: HitlConfig): Promise<HitlResult> {
    this.validateConfig(config);

    if (!config.enabled) {
      throw new Error('Human-in-the-Loop is not enabled');
    }

    // Try enterprise HITL module first
    if (this.hitlService) {
      this.logEnterpriseUsage('HITL handler creation');
      try {
        return await this.hitlService.createInterruptHandler(config);
      } catch (error) {
        return this.handleFallback(error as Error, 'HITL handler creation');
      }
    }

    // Try interaction manager
    if (this.interactionManager) {
      this.logger.log('Using interaction manager via adapter');
      try {
        return await this.interactionManager.create(config);
      } catch (error) {
        return this.handleFallback(
          error as Error,
          'HITL handler creation via interaction manager'
        );
      }
    }

    // Fallback - HITL requires human intervention, no reasonable fallback
    this.handleEnterpriseUnavailable(
      'HITL handler creation',
      '@libs/langgraph-modules/hitl'
    );
  }

  /**
   * Execute human input request - waits for human decision
   */
  async execute(request: HumanInputRequest): Promise<HitlResult> {
    // Try enterprise HITL service first
    if (this.hitlService) {
      this.logEnterpriseUsage('human input request');
      try {
        return await this.hitlService.waitForHumanInput(
          request.prompt,
          request.timeout || 300000, // 5 minutes default
          request.options,
          request.context
        );
      } catch (error) {
        return this.handleFallback(error as Error, 'human input request');
      }
    }

    // Try interaction manager
    if (this.interactionManager) {
      this.logger.log('Using interaction manager for human input');
      try {
        return await this.interactionManager.requestInput(request);
      } catch (error) {
        return this.handleFallback(
          error as Error,
          'human input request via interaction manager'
        );
      }
    }

    // No fallback for HITL - requires human intervention
    this.handleEnterpriseUnavailable(
      'human input request',
      '@libs/langgraph-modules/hitl'
    );
  }

  /**
   * Resume workflow with human decision
   */
  async resumeWithHumanInput(
    interruptId: string,
    decision: any
  ): Promise<HitlResult> {
    if (this.hitlService) {
      this.logEnterpriseUsage('workflow resume with human input');
      try {
        return await this.hitlService.resumeWithHumanInput(
          interruptId,
          decision
        );
      } catch (error) {
        return this.handleFallback(
          error as Error,
          'workflow resume with human input'
        );
      }
    }

    if (this.interactionManager) {
      try {
        return await this.interactionManager.resumeWithInput(
          interruptId,
          decision
        );
      } catch (error) {
        return this.handleFallback(
          error as Error,
          'workflow resume via interaction manager'
        );
      }
    }

    this.handleEnterpriseUnavailable(
      'workflow resume with human input',
      '@libs/langgraph-modules/hitl'
    );
  }

  /**
   * Get current state of human interaction
   */
  async getHumanState(workflowId: string): Promise<HitlResult | null> {
    if (this.hitlService) {
      try {
        return await this.hitlService.getHumanState(workflowId);
      } catch (error) {
        this.logger.warn('Failed to get human state:', error);
        return null;
      }
    }

    if (this.interactionManager) {
      try {
        return await this.interactionManager.getState(workflowId);
      } catch (error) {
        this.logger.warn(
          'Failed to get human state via interaction manager:',
          error
        );
        return null;
      }
    }

    return null;
  }

  /**
   * Check if enterprise HITL module is available
   */
  isEnterpriseAvailable(): boolean {
    return !!this.hitlService;
  }

  /**
   * Check if interaction manager is available
   */
  isInteractionManagerAvailable(): boolean {
    return !!this.interactionManager;
  }

  /**
   * Get adapter status for diagnostics
   */
  getAdapterStatus(): ExtendedAdapterStatus {
    const enterpriseAvailable = this.isEnterpriseAvailable();
    const interactionManagerAvailable = this.isInteractionManagerAvailable();
    const fallbackMode = !enterpriseAvailable && !interactionManagerAvailable;

    const capabilities = this.getBaseCapabilities();
    capabilities.push('interrupt_handling', 'human_decision_points');

    if (enterpriseAvailable) {
      capabilities.push(
        'enterprise_hitl',
        'advanced_notifications',
        'workflow_interrupts',
        'auto_approval',
        'timeout_handling'
      );
    }

    if (interactionManagerAvailable) {
      capabilities.push('interaction_manager', 'basic_human_input');
    }

    return {
      enterpriseAvailable,
      interactionManagerAvailable,
      fallbackMode,
      capabilities,
    };
  }
}

/**
 * Factory function for backward compatibility
 */
export function createHitlProvider(): HitlAdapter {
  return new HitlAdapter();
}
