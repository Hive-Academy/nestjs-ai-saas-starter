import { Injectable, Inject, Optional } from '@nestjs/common';
import type {
  ICreatableAdapter,
  IExecutableAdapter,
  ExtendedAdapterStatus,
} from './interfaces/adapter.interface';
import { BaseModuleAdapter } from './base/base.adapter';

/**
 * Configuration for workflow engine operations
 */
export interface WorkflowEngineConfig {
  enabled?: boolean;
  /** Default execution mode */
  defaultMode?: 'sequential' | 'parallel' | 'conditional' | 'event-driven';
  /** Orchestration settings */
  orchestration?: {
    /** Enable advanced orchestration */
    enabled?: boolean;
    /** Maximum concurrent workflows */
    maxConcurrency?: number;
    /** Queue configuration */
    queue?: {
      type: 'memory' | 'redis' | 'database';
      config?: Record<string, any>;
    };
  };
  /** Scheduling configuration */
  scheduling?: {
    /** Enable workflow scheduling */
    enabled?: boolean;
    /** Default timezone */
    timezone?: string;
    /** Scheduler type */
    scheduler?: 'cron' | 'interval' | 'event';
  };
  /** Branching configuration */
  branching?: {
    /** Enable conditional branching */
    enabled?: boolean;
    /** Maximum branch depth */
    maxDepth?: number;
  };
  /** Error handling */
  errorHandling?: {
    /** Retry strategy */
    retryStrategy?: 'none' | 'fixed' | 'exponential';
    /** Maximum retries */
    maxRetries?: number;
    /** Timeout in milliseconds */
    timeout?: number;
  };
}

/**
 * Result of workflow engine operations
 */
export interface WorkflowEngineResult {
  /** Operation identifier */
  id: string;
  /** Engine type */
  engineType: 'basic' | 'advanced' | 'enterprise';
  /** Operation status */
  status: 'created' | 'running' | 'completed' | 'failed' | 'scheduled';
  /** Engine configuration */
  config: {
    mode: string;
    features: string[];
  };
  /** Execution metadata */
  execution?: {
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    workflowCount?: number;
    parallelExecutions?: number;
  };
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  /** Orchestrator name */
  name: string;
  /** Execution strategy */
  strategy: 'supervisor' | 'peer-to-peer' | 'hierarchical' | 'event-driven';
  /** Resource limits */
  resources?: {
    maxMemory?: string;
    maxCpu?: string;
    timeout?: number;
  };
  /** Workflow coordination */
  coordination?: {
    /** Enable workflow dependencies */
    dependencies?: boolean;
    /** Enable workflow synchronization */
    synchronization?: boolean;
  };
}

/**
 * Workflow scheduling request
 */
export interface WorkflowScheduleRequest {
  /** Workflow to schedule */
  workflow: any;
  /** Schedule configuration */
  schedule: {
    /** Schedule type */
    type: 'cron' | 'interval' | 'once';
    /** Cron expression or interval */
    expression: string;
    /** Start time */
    startTime?: Date;
    /** End time */
    endTime?: Date;
    /** Timezone */
    timezone?: string;
  };
  /** Scheduling options */
  options?: {
    /** Allow concurrent executions */
    allowConcurrent?: boolean;
    /** Maximum executions */
    maxExecutions?: number;
  };
}

/**
 * Conditional branch configuration
 */
export interface ConditionalBranch {
  /** Branch name */
  name: string;
  /** Condition to evaluate */
  condition: string | ((context: any) => boolean);
  /** Workflow to execute if condition is true */
  trueWorkflow: any;
  /** Workflow to execute if condition is false */
  falseWorkflow?: any;
  /** Branch metadata */
  metadata?: Record<string, any>;
}

/**
 * Parallel execution request
 */
export interface ParallelExecutionRequest {
  /** Workflows to execute in parallel */
  workflows: Array<{
    id: string;
    workflow: any;
    priority?: number;
  }>;
  /** Execution options */
  options?: {
    /** Wait for all to complete */
    waitForAll?: boolean;
    /** Maximum concurrent executions */
    maxConcurrency?: number;
    /** Timeout for all executions */
    timeout?: number;
  };
}

/**
 * Adapter that bridges the main NestJS LangGraph library to the enterprise workflow engine module
 *
 * This adapter follows the Adapter pattern to provide seamless integration between
 * the main library and the specialized workflow orchestration engine without breaking existing APIs.
 *
 * Benefits:
 * - Maintains backward compatibility with existing workflow APIs
 * - Delegates to enterprise-grade orchestration module when available
 * - Provides fallback to basic sequential execution when child module not installed
 * - Follows SOLID principles with single responsibility (bridge interface)
 */
@Injectable()
export class WorkflowEngineAdapter
  extends BaseModuleAdapter<WorkflowEngineConfig, WorkflowEngineResult>
  implements
    ICreatableAdapter<WorkflowEngineConfig, WorkflowEngineResult>,
    IExecutableAdapter<any, WorkflowEngineResult>
{
  protected readonly serviceName = 'workflow-engine';

  constructor(
    @Optional()
    @Inject('WorkflowOrchestrationService')
    private readonly orchestrationService?: any,
    @Optional()
    @Inject('AdvancedWorkflowEngine')
    private readonly advancedEngine?: any
  ) {
    super();
  }

  /**
   * Create workflow orchestrator - delegates to enterprise module if available
   * Falls back to basic sequential execution when enterprise module not installed
   */
  async create(config: WorkflowEngineConfig): Promise<WorkflowEngineResult> {
    this.validateConfig(config);

    if (!config.enabled) {
      throw new Error('Workflow engine is not enabled');
    }

    // Try enterprise orchestration service first
    if (this.orchestrationService) {
      this.logEnterpriseUsage('workflow orchestrator creation');
      try {
        const orchestrator = await this.orchestrationService.createOrchestrator(
          config
        );
        return {
          id: orchestrator.id,
          engineType: 'enterprise',
          status: 'created',
          config: {
            mode: config.defaultMode || 'sequential',
            features: [
              'advanced_orchestration',
              'scheduling',
              'conditional_branching',
              'parallel_execution',
              'error_handling',
            ],
          },
          createdAt: new Date(),
        };
      } catch (error) {
        this.logger.warn(
          'Enterprise orchestration service failed, falling back to basic engine:',
          error
        );
        return this.createFallbackEngine(config);
      }
    }

    // Try advanced workflow engine
    if (this.advancedEngine) {
      this.logger.log('Using advanced workflow engine via adapter');
      try {
        const engine = await this.advancedEngine.create(config);
        return {
          id: engine.id,
          engineType: 'advanced',
          status: 'created',
          config: {
            mode: config.defaultMode || 'sequential',
            features: ['advanced_execution', 'basic_scheduling'],
          },
          createdAt: new Date(),
        };
      } catch (error) {
        this.logger.warn(
          'Advanced workflow engine failed, falling back to basic engine:',
          error
        );
        return this.createFallbackEngine(config);
      }
    }

    // Fallback to basic sequential execution
    this.logFallbackUsage(
      'workflow orchestrator creation',
      'no enterprise services available - using basic sequential execution'
    );
    return this.createFallbackEngine(config);
  }

  /**
   * Execute workflow using the engine
   */
  async execute(workflow: any, options?: any): Promise<WorkflowEngineResult> {
    const startTime = new Date();

    // Try enterprise orchestration service first
    if (this.orchestrationService) {
      this.logEnterpriseUsage('workflow execution');
      try {
        const result = await this.orchestrationService.execute(
          workflow,
          options
        );
        return {
          id: `execution-${Date.now()}`,
          engineType: 'enterprise',
          status: 'completed',
          config: {
            mode: options?.mode || 'sequential',
            features: ['enterprise_execution'],
          },
          execution: {
            startTime,
            endTime: new Date(),
            duration: Date.now() - startTime.getTime(),
            workflowCount: 1,
          },
          createdAt: startTime,
        };
      } catch (error) {
        return this.handleFallback(error as Error, 'workflow execution');
      }
    }

    // Try advanced workflow engine
    if (this.advancedEngine) {
      this.logger.log('Using advanced workflow engine for execution');
      try {
        const result = await this.advancedEngine.execute(workflow, options);
        return {
          id: `execution-${Date.now()}`,
          engineType: 'advanced',
          status: 'completed',
          config: {
            mode: options?.mode || 'sequential',
            features: ['advanced_execution'],
          },
          execution: {
            startTime,
            endTime: new Date(),
            duration: Date.now() - startTime.getTime(),
            workflowCount: 1,
          },
          createdAt: startTime,
        };
      } catch (error) {
        return this.handleFallback(
          error as Error,
          'workflow execution via advanced engine'
        );
      }
    }

    // Basic execution
    this.logFallbackUsage(
      'workflow execution',
      'executing with basic sequential processing'
    );
    try {
      const result = await workflow;
      return {
        id: `basic-${Date.now()}`,
        engineType: 'basic',
        status: 'completed',
        config: {
          mode: 'sequential',
          features: ['basic_execution'],
        },
        execution: {
          startTime,
          endTime: new Date(),
          duration: Date.now() - startTime.getTime(),
          workflowCount: 1,
        },
        createdAt: startTime,
      };
    } catch (error) {
      return this.handleFallback(error as Error, 'basic workflow execution');
    }
  }

  /**
   * Schedule workflow execution
   */
  async scheduleWorkflow(
    request: WorkflowScheduleRequest
  ): Promise<WorkflowEngineResult> {
    if (this.orchestrationService) {
      this.logEnterpriseUsage('workflow scheduling');
      try {
        const result = await this.orchestrationService.scheduleWorkflow(
          request.schedule.expression,
          request.workflow,
          request.options
        );
        return {
          id: result.scheduleId,
          engineType: 'enterprise',
          status: 'scheduled',
          config: {
            mode: 'scheduled',
            features: ['enterprise_scheduling'],
          },
          createdAt: new Date(),
        };
      } catch (error) {
        return this.handleFallback(error as Error, 'workflow scheduling');
      }
    }

    if (this.advancedEngine) {
      try {
        const result = await this.advancedEngine.schedule(request);
        return {
          id: result.id,
          engineType: 'advanced',
          status: 'scheduled',
          config: {
            mode: 'scheduled',
            features: ['basic_scheduling'],
          },
          createdAt: new Date(),
        };
      } catch (error) {
        return this.handleFallback(
          error as Error,
          'workflow scheduling via advanced engine'
        );
      }
    }

    throw new Error(
      'Workflow scheduling requires enterprise workflow engine module'
    );
  }

  /**
   * Create conditional branch
   */
  async createConditionalBranch(
    branch: ConditionalBranch
  ): Promise<WorkflowEngineResult> {
    if (this.orchestrationService) {
      this.logEnterpriseUsage('conditional branch creation');
      try {
        const result = await this.orchestrationService.createConditionalBranch(
          branch.condition
        );
        return {
          id: result.branchId,
          engineType: 'enterprise',
          status: 'created',
          config: {
            mode: 'conditional',
            features: ['conditional_branching'],
          },
          createdAt: new Date(),
        };
      } catch (error) {
        return this.handleFallback(
          error as Error,
          'conditional branch creation'
        );
      }
    }

    if (this.advancedEngine) {
      try {
        const result = await this.advancedEngine.createBranch(branch);
        return {
          id: result.id,
          engineType: 'advanced',
          status: 'created',
          config: {
            mode: 'conditional',
            features: ['basic_branching'],
          },
          createdAt: new Date(),
        };
      } catch (error) {
        return this.handleFallback(
          error as Error,
          'conditional branch creation via advanced engine'
        );
      }
    }

    // Basic conditional execution
    try {
      const conditionResult =
        typeof branch.condition === 'function'
          ? await branch.condition({})
          : Boolean(branch.condition);

      const selectedWorkflow = conditionResult
        ? branch.trueWorkflow
        : branch.falseWorkflow;
      if (selectedWorkflow) {
        await selectedWorkflow;
      }

      return {
        id: `branch-${Date.now()}`,
        engineType: 'basic',
        status: 'completed',
        config: {
          mode: 'conditional',
          features: ['basic_conditional'],
        },
        createdAt: new Date(),
      };
    } catch (error) {
      return this.handleFallback(error as Error, 'basic conditional execution');
    }
  }

  /**
   * Execute workflows in parallel
   */
  async orchestrateParallel(
    request: ParallelExecutionRequest
  ): Promise<WorkflowEngineResult> {
    const startTime = new Date();

    if (this.orchestrationService) {
      this.logEnterpriseUsage('parallel workflow orchestration');
      try {
        const result = await this.orchestrationService.orchestrateParallel(
          request.workflows.map((w) => w.workflow),
          request.options
        );
        return {
          id: `parallel-${Date.now()}`,
          engineType: 'enterprise',
          status: 'completed',
          config: {
            mode: 'parallel',
            features: ['enterprise_parallel'],
          },
          execution: {
            startTime,
            endTime: new Date(),
            duration: Date.now() - startTime.getTime(),
            workflowCount: request.workflows.length,
            parallelExecutions: request.workflows.length,
          },
          createdAt: startTime,
        };
      } catch (error) {
        return this.handleFallback(
          error as Error,
          'parallel workflow orchestration'
        );
      }
    }

    if (this.advancedEngine) {
      try {
        const result = await this.advancedEngine.parallel(request);
        return {
          id: `parallel-${Date.now()}`,
          engineType: 'advanced',
          status: 'completed',
          config: {
            mode: 'parallel',
            features: ['advanced_parallel'],
          },
          execution: {
            startTime,
            endTime: new Date(),
            duration: Date.now() - startTime.getTime(),
            workflowCount: request.workflows.length,
            parallelExecutions: request.workflows.length,
          },
          createdAt: startTime,
        };
      } catch (error) {
        return this.handleFallback(
          error as Error,
          'parallel execution via advanced engine'
        );
      }
    }

    // Basic parallel execution using Promise.all
    this.logFallbackUsage(
      'parallel workflow orchestration',
      'using basic Promise.all'
    );
    try {
      const results = await Promise.all(
        request.workflows.map((w) => w.workflow)
      );
      return {
        id: `parallel-${Date.now()}`,
        engineType: 'basic',
        status: 'completed',
        config: {
          mode: 'parallel',
          features: ['basic_parallel'],
        },
        execution: {
          startTime,
          endTime: new Date(),
          duration: Date.now() - startTime.getTime(),
          workflowCount: request.workflows.length,
          parallelExecutions: request.workflows.length,
        },
        createdAt: startTime,
      };
    } catch (error) {
      return this.handleFallback(error as Error, 'basic parallel execution');
    }
  }

  /**
   * Create fallback workflow engine result
   */
  private createFallbackEngine(
    config: WorkflowEngineConfig
  ): WorkflowEngineResult {
    return {
      id: `fallback-${Date.now()}`,
      engineType: 'basic',
      status: 'created',
      config: {
        mode: 'sequential',
        features: ['basic_execution'],
      },
      createdAt: new Date(),
    };
  }

  /**
   * Check if enterprise orchestration service is available
   */
  isEnterpriseAvailable(): boolean {
    return !!this.orchestrationService;
  }

  /**
   * Check if advanced workflow engine is available
   */
  isAdvancedEngineAvailable(): boolean {
    return !!this.advancedEngine;
  }

  /**
   * Get adapter status for diagnostics
   */
  getAdapterStatus(): ExtendedAdapterStatus {
    const enterpriseAvailable = this.isEnterpriseAvailable();
    const advancedEngineAvailable = this.isAdvancedEngineAvailable();
    const fallbackMode = !enterpriseAvailable && !advancedEngineAvailable;

    const capabilities = this.getBaseCapabilities();
    capabilities.push('basic_sequential_execution', 'basic_parallel_execution');

    if (enterpriseAvailable) {
      capabilities.push(
        'enterprise_orchestration',
        'advanced_scheduling',
        'conditional_branching',
        'parallel_coordination',
        'workflow_dependencies',
        'resource_management',
        'error_recovery'
      );
    }

    if (advancedEngineAvailable) {
      capabilities.push('advanced_workflow_engine', 'enhanced_execution');
    }

    return {
      enterpriseAvailable,
      advancedEngineAvailable,
      fallbackMode,
      capabilities,
    };
  }
}

/**
 * Factory function for backward compatibility
 */
export function createWorkflowEngineProvider(): WorkflowEngineAdapter {
  return new WorkflowEngineAdapter();
}
