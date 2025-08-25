import { Injectable, Inject, Optional } from '@nestjs/common';
import type {
  ICreatableAdapter,
  IExecutableAdapter,
  ExtendedAdapterStatus,
} from './interfaces/adapter.interface';
import { BaseModuleAdapter } from './base/base.adapter';

/**
 * Configuration for time travel operations
 */
export interface TimeTravelConfig {
  enabled?: boolean;
  /** Enable automatic snapshot capture */
  autoSnapshot?: boolean;
  /** Snapshot interval in milliseconds */
  snapshotInterval?: number;
  /** Maximum snapshots to retain */
  maxSnapshots?: number;
  /** Storage backend for snapshots */
  storage?: 'memory' | 'disk' | 'database';
  /** Debugging options */
  debugging?: {
    /** Enable breakpoints */
    enableBreakpoints?: boolean;
    /** Enable step-by-step execution */
    enableStepping?: boolean;
    /** Enable variable inspection */
    enableInspection?: boolean;
  };
  /** Replay options */
  replay?: {
    /** Enable replay functionality */
    enabled?: boolean;
    /** Include side effects in replay */
    includeSideEffects?: boolean;
  };
}

/**
 * Result of time travel operations
 */
export interface TimeTravelResult {
  /** Operation identifier */
  id: string;
  /** Operation type */
  type: 'snapshot' | 'replay' | 'debug' | 'history';
  /** Current state */
  state: any;
  /** Operation metadata */
  metadata: {
    workflowId?: string;
    snapshotId?: string;
    timestamp: Date;
    captureMethod: 'automatic' | 'manual' | 'breakpoint';
  };
  /** Navigation information */
  navigation?: {
    canGoBack: boolean;
    canGoForward: boolean;
    currentStep: number;
    totalSteps: number;
  };
}

/**
 * Execution snapshot structure
 */
export interface ExecutionSnapshot {
  /** Snapshot ID */
  id: string;
  /** Workflow ID */
  workflowId: string;
  /** Snapshot timestamp */
  timestamp: Date;
  /** Workflow state at this point */
  state: any;
  /** Step information */
  step: {
    name: string;
    index: number;
    type: string;
  };
  /** Variable values */
  variables: Record<string, any>;
  /** Call stack */
  callStack: string[];
}

/**
 * Debugging request structure
 */
export interface DebuggingRequest {
  /** Workflow to debug */
  workflow: any;
  /** Breakpoints to set */
  breakpoints?: Array<{
    step: string;
    condition?: string;
  }>;
  /** Debugging options */
  options?: {
    stepMode?: boolean;
    inspectVariables?: boolean;
    captureCallStack?: boolean;
  };
}

/**
 * Execution history entry
 */
export interface ExecutionHistoryEntry {
  /** Entry ID */
  id: string;
  /** Workflow ID */
  workflowId: string;
  /** Execution start time */
  startTime: Date;
  /** Execution end time */
  endTime?: Date;
  /** Execution status */
  status: 'running' | 'completed' | 'failed' | 'debugged';
  /** Number of steps */
  stepCount: number;
  /** Snapshots taken */
  snapshotCount: number;
  /** Error information if failed */
  error?: {
    message: string;
    step: string;
    timestamp: Date;
  };
}

/**
 * Adapter that bridges the main NestJS LangGraph library to the enterprise time travel module
 *
 * This adapter follows the Adapter pattern to provide seamless integration between
 * the main library and the specialized time travel debugging module without breaking existing APIs.
 *
 * Benefits:
 * - Maintains backward compatibility with existing debugging APIs
 * - Delegates to enterprise-grade time travel module when available
 * - Provides fallback to basic logging when child module not installed
 * - Follows SOLID principles with single responsibility (bridge interface)
 */
@Injectable()
export class TimeTravelAdapter
  extends BaseModuleAdapter<TimeTravelConfig, TimeTravelResult>
  implements
    ICreatableAdapter<TimeTravelConfig, TimeTravelResult>,
    IExecutableAdapter<DebuggingRequest, TimeTravelResult>
{
  protected readonly serviceName = 'time-travel';

  constructor(
    @Optional()
    @Inject('TimeTravelService')
    private readonly timeTravelService?: any,
    @Optional()
    @Inject('DebuggingService')
    private readonly debuggingService?: any
  ) {
    super();
  }

  /**
   * Create time travel session - delegates to enterprise module if available
   * Falls back to basic logging when enterprise module not installed
   */
  async create(config: TimeTravelConfig): Promise<TimeTravelResult> {
    this.validateConfig(config);

    if (!config.enabled) {
      throw new Error('Time travel debugging is not enabled');
    }

    // Try enterprise time travel module first
    if (this.timeTravelService) {
      this.logEnterpriseUsage('time travel session creation');
      try {
        const session = await this.timeTravelService.createSession(config);
        return {
          id: session.id,
          type: 'debug',
          state: session.state,
          metadata: {
            timestamp: new Date(),
            captureMethod: 'automatic',
          },
          navigation: {
            canGoBack: false,
            canGoForward: false,
            currentStep: 0,
            totalSteps: 0,
          },
        };
      } catch (error) {
        this.logger.warn(
          'Enterprise time travel module failed, falling back to basic logging:',
          error
        );
        return this.createFallbackSession(config);
      }
    }

    // Try debugging service
    if (this.debuggingService) {
      this.logger.log('Using debugging service via adapter');
      try {
        const session = await this.debuggingService.createSession(config);
        return {
          id: session.id,
          type: 'debug',
          state: session.state,
          metadata: {
            timestamp: new Date(),
            captureMethod: 'automatic',
          },
          navigation: {
            canGoBack: false,
            canGoForward: false,
            currentStep: 0,
            totalSteps: 0,
          },
        };
      } catch (error) {
        this.logger.warn(
          'Debugging service failed, falling back to basic logging:',
          error
        );
        return this.createFallbackSession(config);
      }
    }

    // Fallback to basic logging
    this.logFallbackUsage(
      'time travel session creation',
      'no enterprise services available - using basic logging'
    );
    return this.createFallbackSession(config);
  }

  /**
   * Execute workflow with debugging capabilities
   */
  async execute(request: DebuggingRequest): Promise<TimeTravelResult> {
    // Try enterprise time travel service first
    if (this.timeTravelService) {
      this.logEnterpriseUsage('workflow debugging');
      try {
        const result = await this.timeTravelService.debugWorkflow(
          request.workflow,
          request.breakpoints,
          request.options
        );
        return {
          id: `debug-${Date.now()}`,
          type: 'debug',
          state: result.state,
          metadata: {
            workflowId: result.workflowId,
            timestamp: new Date(),
            captureMethod: 'breakpoint',
          },
          navigation: result.navigation,
        };
      } catch (error) {
        return this.handleFallback(error as Error, 'workflow debugging');
      }
    }

    // Try debugging service
    if (this.debuggingService) {
      this.logger.log('Using debugging service for workflow debugging');
      try {
        const result = await this.debuggingService.debug(request);
        return {
          id: `debug-${Date.now()}`,
          type: 'debug',
          state: result.state,
          metadata: {
            workflowId: result.workflowId,
            timestamp: new Date(),
            captureMethod: 'breakpoint',
          },
          navigation: result.navigation,
        };
      } catch (error) {
        return this.handleFallback(
          error as Error,
          'workflow debugging via debugging service'
        );
      }
    }

    // Basic execution without debugging
    this.logFallbackUsage(
      'workflow debugging',
      'executing without debug capabilities'
    );
    try {
      const result = await request.workflow;
      return {
        id: `basic-${Date.now()}`,
        type: 'debug',
        state: result,
        metadata: {
          timestamp: new Date(),
          captureMethod: 'manual',
        },
        navigation: {
          canGoBack: false,
          canGoForward: false,
          currentStep: 1,
          totalSteps: 1,
        },
      };
    } catch (error) {
      return this.handleFallback(error as Error, 'basic workflow execution');
    }
  }

  /**
   * Capture execution snapshot
   */
  async captureSnapshots(workflowId: string): Promise<ExecutionSnapshot[]> {
    if (this.timeTravelService) {
      this.logEnterpriseUsage('snapshot capture');
      try {
        return await this.timeTravelService.captureSnapshots(workflowId);
      } catch (error) {
        this.logger.warn('Failed to capture snapshots:', error);
        return [];
      }
    }

    if (this.debuggingService) {
      try {
        return await this.debuggingService.captureSnapshots(workflowId);
      } catch (error) {
        this.logger.warn(
          'Failed to capture snapshots via debugging service:',
          error
        );
        return [];
      }
    }

    return [];
  }

  /**
   * Replay from specific snapshot
   */
  async replayFrom(snapshotId: string): Promise<TimeTravelResult> {
    if (this.timeTravelService) {
      this.logEnterpriseUsage('snapshot replay');
      try {
        const result = await this.timeTravelService.replayFrom(snapshotId);
        return {
          id: `replay-${Date.now()}`,
          type: 'replay',
          state: result.state,
          metadata: {
            snapshotId,
            timestamp: new Date(),
            captureMethod: 'manual',
          },
          navigation: result.navigation,
        };
      } catch (error) {
        return this.handleFallback(error as Error, 'snapshot replay');
      }
    }

    if (this.debuggingService) {
      try {
        const result = await this.debuggingService.replayFrom(snapshotId);
        return {
          id: `replay-${Date.now()}`,
          type: 'replay',
          state: result.state,
          metadata: {
            snapshotId,
            timestamp: new Date(),
            captureMethod: 'manual',
          },
        };
      } catch (error) {
        return this.handleFallback(
          error as Error,
          'snapshot replay via debugging service'
        );
      }
    }

    throw new Error('Snapshot replay requires enterprise time travel module');
  }

  /**
   * Get execution history for a workflow
   */
  async getExecutionHistory(
    workflowId: string
  ): Promise<ExecutionHistoryEntry[]> {
    if (this.timeTravelService) {
      try {
        return await this.timeTravelService.getExecutionHistory(workflowId);
      } catch (error) {
        this.logger.warn('Failed to get execution history:', error);
        return [];
      }
    }

    if (this.debuggingService) {
      try {
        return await this.debuggingService.getHistory(workflowId);
      } catch (error) {
        this.logger.warn(
          'Failed to get execution history via debugging service:',
          error
        );
        return [];
      }
    }

    return [];
  }

  /**
   * Create fallback session for basic logging
   */
  private createFallbackSession(config: TimeTravelConfig): TimeTravelResult {
    return {
      id: `fallback-${Date.now()}`,
      type: 'debug',
      state: {
        message: 'Time travel debugging not available, using basic logging',
        config,
      },
      metadata: {
        timestamp: new Date(),
        captureMethod: 'manual',
      },
      navigation: {
        canGoBack: false,
        canGoForward: false,
        currentStep: 0,
        totalSteps: 0,
      },
    };
  }

  /**
   * Check if enterprise time travel module is available
   */
  isEnterpriseAvailable(): boolean {
    return !!this.timeTravelService;
  }

  /**
   * Check if debugging service is available
   */
  isDebuggingServiceAvailable(): boolean {
    return !!this.debuggingService;
  }

  /**
   * Get adapter status for diagnostics
   */
  getAdapterStatus(): ExtendedAdapterStatus {
    const enterpriseAvailable = this.isEnterpriseAvailable();
    const debuggingServiceAvailable = this.isDebuggingServiceAvailable();
    const fallbackMode = !enterpriseAvailable && !debuggingServiceAvailable;

    const capabilities = this.getBaseCapabilities();
    capabilities.push('basic_logging', 'workflow_execution');

    if (enterpriseAvailable) {
      capabilities.push(
        'enterprise_time_travel',
        'snapshot_capture',
        'snapshot_replay',
        'breakpoint_debugging',
        'step_by_step_execution',
        'variable_inspection',
        'execution_history',
        'call_stack_tracking'
      );
    }

    if (debuggingServiceAvailable) {
      capabilities.push('debugging_service', 'basic_debugging');
    }

    return {
      enterpriseAvailable,
      debuggingServiceAvailable,
      fallbackMode,
      capabilities,
    };
  }
}

/**
 * Factory function for backward compatibility
 */
export function createTimeTravelProvider(): TimeTravelAdapter {
  return new TimeTravelAdapter();
}
