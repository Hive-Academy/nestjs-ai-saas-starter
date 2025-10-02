import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ReplayOptions,
  BranchOptions,
  ExecutionHistoryNode,
  HistoryOptions,
  StateComparison,
  WorkflowExecution,
  TimeTravelConfig,
  TimeTravelServiceInterface,
  BranchInfo,
} from '../interfaces/time-travel.interface';
// Removed unused import
import { BranchManagerService } from './branch-manager.service';
import { WorkflowReplayService } from './workflow-replay.service';
import { ExecutionHistoryService } from './execution-history.service';
import { WorkflowRegistryService } from './workflow-registry.service';

/**
 * Time Travel Facade Service
 *
 * Lightweight coordinator that delegates to focused services:
 * - BranchManagerService: Branch lifecycle management
 * - WorkflowReplayService: Workflow replay operations
 * - ExecutionHistoryService: History tracking and analysis
 * - WorkflowRegistryService: Workflow registration and discovery
 */
@Injectable()
export class TimeTravelService
  implements TimeTravelServiceInterface, OnModuleInit
{
  private readonly logger = new Logger(TimeTravelService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly branchManager: BranchManagerService,
    private readonly workflowReplay: WorkflowReplayService,
    private readonly executionHistory: ExecutionHistoryService,
    private readonly workflowRegistry: WorkflowRegistryService
  ) {}

  async onModuleInit(): Promise<void> {
    const config = this.configService.get<TimeTravelConfig>('timeTravel');

    if (config?.enableBranching) {
      this.logger.log('✅ Branch management enabled for time travel');
    }

    this.logger.log(
      '✅ Checkpoint operations delegated to injected checkpoint adapter'
    );

    this.logger.log(
      '🚀 Time Travel facade service initialized with focused services'
    );
  }

  // ========================================
  // Workflow Registration (delegates to WorkflowRegistryService)
  // ========================================

  async registerWorkflow(registration: {
    name: string;
    instance: {
      [key: string]: (...args: unknown[]) => unknown;
    };
    metadata: {
      entrypoint: string;
      domain: string;
      [key: string]: unknown;
    };
  }): Promise<void> {
    return this.workflowRegistry.registerWorkflow(registration);
  }

  getAvailableWorkflows(): string[] {
    return this.workflowRegistry.getAvailableWorkflows();
  }

  // ========================================
  // Workflow Replay (delegates to WorkflowReplayService)
  // ========================================

  async replayFromCheckpoint<T extends Record<string, unknown>>(
    threadId: string,
    checkpointId: string,
    options: ReplayOptions<T> = {}
  ): Promise<WorkflowExecution<T>> {
    return this.workflowReplay.replayFromCheckpoint(
      threadId,
      checkpointId,
      options
    );
  }

  async replayWithSpeed<T extends Record<string, unknown>>(
    threadId: string,
    checkpointId: string,
    replaySpeed = 1.0,
    options: Omit<ReplayOptions<T>, 'replaySpeed'> = {}
  ): Promise<WorkflowExecution<T>> {
    return this.workflowReplay.replayWithSpeed(
      threadId,
      checkpointId,
      replaySpeed,
      options
    );
  }

  async replayForTesting<T extends Record<string, unknown>>(
    threadId: string,
    checkpointId: string,
    testScenario: {
      name: string;
      stateModifications: Partial<T>;
      expectedOutcome: {
        status?: 'completed' | 'failed';
        outputContains?: string[];
        stateContains?: Partial<T>;
      };
    }
  ): Promise<{
    passed: boolean;
    execution: WorkflowExecution<T>;
    failures: string[];
  }> {
    return this.workflowReplay.replayForTesting(
      threadId,
      checkpointId,
      testScenario
    );
  }

  async canReplay(
    threadId: string,
    checkpointId: string
  ): Promise<{
    canReplay: boolean;
    reason?: string;
    workflowName?: string;
  }> {
    return this.workflowReplay.canReplay(threadId, checkpointId);
  }

  // ========================================
  // Branch Management (delegates to BranchManagerService)
  // ========================================

  async createBranch<T extends Record<string, unknown>>(
    threadId: string,
    fromCheckpointId: string,
    branchOptions: BranchOptions<T>
  ): Promise<string> {
    return this.branchManager.createBranch(
      threadId,
      fromCheckpointId,
      branchOptions
    );
  }

  async listBranches(threadId: string): Promise<readonly BranchInfo[]> {
    return this.branchManager.listBranches(threadId);
  }

  async getBranchInfo(threadId: string, branchId: string): Promise<BranchInfo> {
    return this.branchManager.getBranchInfo(threadId, branchId);
  }

  async mergeBranch<T extends Record<string, unknown>>(
    threadId: string,
    branchId: string,
    mergeStrategy: 'overwrite' | 'merge' | 'custom' = 'merge'
  ): Promise<void> {
    return this.branchManager.mergeBranch(threadId, branchId, mergeStrategy);
  }

  async deleteBranch(threadId: string, branchId: string): Promise<void> {
    return this.branchManager.deleteBranch(threadId, branchId);
  }

  async getBranchStats(threadId: string): Promise<{
    totalBranches: number;
    activeBranches: number;
    mergedBranches: number;
    deletedBranches: number;
  }> {
    return this.branchManager.getBranchStats(threadId);
  }

  // ========================================
  // Execution History (delegates to ExecutionHistoryService)
  // ========================================

  async getExecutionHistory(
    threadId: string,
    options: HistoryOptions = {}
  ): Promise<readonly ExecutionHistoryNode[]> {
    return this.executionHistory.getExecutionHistory(threadId, options);
  }

  async compareCheckpoints<T extends Record<string, unknown>>(
    threadId: string,
    checkpointId1: string,
    checkpointId2: string
  ): Promise<StateComparison<T>> {
    return this.executionHistory.compareCheckpoints(
      threadId,
      checkpointId1,
      checkpointId2
    );
  }

  async exportHistory(
    threadId: string,
    format: 'json' | 'csv' | 'mermaid' = 'json'
  ): Promise<string> {
    return this.executionHistory.exportHistory(threadId, format);
  }

  async getExecutionStats(threadId: string): Promise<{
    totalNodes: number;
    nodeTypes: Record<string, number>;
    averageExecutionTime: number;
    totalExecutionTime: number;
    errorCount: number;
    longestRunningNode: { nodeId: string; duration: number } | null;
  }> {
    return this.executionHistory.getExecutionStats(threadId);
  }

  async analyzeStateEvolution(
    threadId: string,
    fieldPath: string
  ): Promise<{
    changes: Array<{
      checkpointId: string;
      timestamp: Date;
      value: unknown;
      valueType: string;
    }>;
    summary: {
      totalChanges: number;
      uniqueValues: number;
      firstValue: unknown;
      lastValue: unknown;
    };
  }> {
    return this.executionHistory.analyzeStateEvolution(threadId, fieldPath);
  }

  async findCheckpoint(
    threadId: string,
    criteria: {
      nodeType?: ExecutionHistoryNode['nodeType'];
      hasError?: boolean;
      workflowName?: string;
      stateContains?: Record<string, unknown>;
      timeRange?: { from: Date; to: Date };
    }
  ): Promise<ExecutionHistoryNode | null> {
    return this.executionHistory.findCheckpoint(threadId, criteria);
  }

  // ========================================
  // Convenience Methods
  // ========================================

  /**
   * Get comprehensive system status
   */
  async getSystemStatus(): Promise<{
    workflowRegistry: {
      totalWorkflows: number;
      autoRegistered: number;
      manuallyRegistered: number;
    };
    capabilities: {
      branching: boolean;
      autoCheckpoint: boolean;
      replayAvailable: boolean;
    };
  }> {
    const config = this.configService.get<TimeTravelConfig>('timeTravel');
    const workflowStats = this.workflowRegistry.getWorkflowStats();

    return {
      workflowRegistry: {
        totalWorkflows: workflowStats.totalWorkflows,
        autoRegistered: workflowStats.autoRegistered,
        manuallyRegistered: workflowStats.manuallyRegistered,
      },
      capabilities: {
        branching: config?.enableBranching ?? false,
        autoCheckpoint: false, // Checkpoint creation is handled by checkpoint adapter
        replayAvailable: workflowStats.totalWorkflows > 0,
      },
    };
  }

  /**
   * Validate system health
   */
  async validateSystem(): Promise<{
    healthy: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check workflow registry
    const workflows = this.workflowRegistry.getAvailableWorkflows();
    if (workflows.length === 0) {
      warnings.push('No workflows registered for time travel');
    }

    // Validate each registered workflow
    for (const workflowName of workflows) {
      const validation = this.workflowRegistry.validateWorkflow(workflowName);
      if (!validation.valid) {
        issues.push(
          ...validation.issues.map(
            (issue) => `Workflow '${workflowName}': ${issue}`
          )
        );
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
      warnings,
    };
  }
}
