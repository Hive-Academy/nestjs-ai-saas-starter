import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { CheckpointManagerService } from '@hive-academy/langgraph-checkpoint';
import {
  ReplayOptions,
  BranchOptions,
  ExecutionHistoryNode,
  HistoryOptions,
  StateComparison,
  StateDifference,
  WorkflowExecution,
  TimeTravelConfig,
  TimeTravelServiceInterface,
  BranchInfo,
  CheckpointNotFoundError,
  BranchNotFoundError,
  ReplayOptionsSchema,
  BranchOptionsSchema,
  HistoryOptionsSchema,
} from '../interfaces/time-travel.interface';

/**
 * Time travel service for workflow replay and debugging
 */
@Injectable()
export class TimeTravelService
  implements TimeTravelServiceInterface, OnModuleInit
{
  private readonly logger = new Logger(TimeTravelService.name);
  private readonly branches = new Map<string, BranchInfo>();
  private readonly executionHistory = new Map<string, ExecutionHistoryNode[]>();
  private readonly workflowRegistry: Map<string, unknown> = new Map();

  constructor(
    private readonly configService: ConfigService,
    @Inject(CheckpointManagerService)
    private readonly checkpointManager: CheckpointManagerService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  /**
   * Initialize time travel service
   */
  private async initialize(): Promise<void> {
    const config = this.configService.get<TimeTravelConfig>('timeTravel');

    if (config?.enableBranching) {
      this.logger.log('Branch management enabled for time travel');
    }

    if (config?.enableAutoCheckpoint) {
      this.logger.log(
        `Auto-checkpoint enabled with interval: ${config.checkpointInterval}ms`
      );
    }

    this.logger.log('Time travel service initialized');
  }

  /**
   * Replay workflow from specific checkpoint with optional modifications
   */
  async replayFromCheckpoint<T extends Record<string, unknown>>(
    threadId: string,
    checkpointId: string,
    options: ReplayOptions<T> = {}
  ): Promise<WorkflowExecution<T>> {
    this.logger.log(
      `Starting replay from checkpoint ${checkpointId} for thread ${threadId}`
    );

    // Validate options
    const validation = ReplayOptionsSchema.safeParse(options);
    if (!validation.success) {
      throw new Error(`Invalid replay options: ${validation.error.message}`);
    }

    // Load the target checkpoint
    const checkpoint = await this.checkpointManager.loadCheckpoint<T>(
      threadId,
      checkpointId
    );

    if (!checkpoint) {
      throw new CheckpointNotFoundError(
        `Checkpoint ${checkpointId} not found for thread ${threadId}`,
        threadId,
        checkpointId
      );
    }

    // Create new execution context
    const replayThreadId =
      options.newThreadId ?? `${threadId}_replay_${Date.now()}`;
    const executionId = `exec_${uuidv4()}`;

    // Apply input modifications if provided
    let modifiedState = checkpoint.channel_values;
    if (options.stateModifications) {
      modifiedState = {
        ...modifiedState,
        ...options.stateModifications,
      };
    }

    // Get workflow definition
    const workflowName = checkpoint.metadata?.workflowName as string;
    if (!workflowName) {
      throw new Error('Checkpoint metadata missing workflow name');
    }

    const workflow = this.workflowRegistry.get(workflowName);
    if (!workflow) {
      throw new Error(`Workflow ${workflowName} not found in registry`);
    }

    // Create execution result
    const execution: WorkflowExecution<T> = {
      executionId,
      threadId: replayThreadId,
      startTime: new Date(),
      state: modifiedState,
      status: 'running',
      checkpoints: [checkpointId],
    };

    // Store initial history node
    const historyNode: ExecutionHistoryNode = {
      checkpointId,
      threadId: replayThreadId,
      nodeId: 'replay-start',
      timestamp: new Date(),
      state: modifiedState,
      workflowName,
      nodeType: 'start',
    };

    this.addHistoryNode(replayThreadId, historyNode);

    // In a real implementation, this would execute the workflow
    // For now, we'll simulate completion
    setTimeout(() => {
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.result = modifiedState;
    }, 100);

    this.logger.log(`Replay started with new thread ID: ${replayThreadId}`);
    return execution;
  }

  /**
   * Create execution branch from checkpoint
   */
  async createBranch<T extends Record<string, unknown>>(
    threadId: string,
    fromCheckpointId: string,
    branchOptions: BranchOptions<T>
  ): Promise<string> {
    // Validate options
    const validation = BranchOptionsSchema.safeParse(branchOptions);
    if (!validation.success) {
      throw new Error(`Invalid branch options: ${validation.error.message}`);
    }

    const checkpoint = await this.checkpointManager.loadCheckpoint<T>(
      threadId,
      fromCheckpointId
    );

    if (!checkpoint) {
      throw new CheckpointNotFoundError(
        `Checkpoint ${fromCheckpointId} not found`,
        threadId,
        fromCheckpointId
      );
    }

    const branchId = `branch_${uuidv4()}`;
    const branchThreadId = `${threadId}_${branchOptions.name}_${Date.now()}`;

    // Apply branch modifications
    let branchedState = checkpoint.channel_values;
    if (branchOptions.stateModifications) {
      branchedState = {
        ...branchedState,
        ...branchOptions.stateModifications,
      };
    }

    // Create branch checkpoint
    const branchCheckpoint = {
      ...checkpoint,
      id: `${checkpoint.id}_branch_${branchOptions.name}`,
      channel_values: branchedState,
    };

    // Save branch checkpoint with branch metadata
    await this.checkpointManager.saveCheckpoint(
      branchThreadId,
      branchCheckpoint,
      {
        ...checkpoint.metadata,
        branchName: branchOptions.name,
        parentThreadId: threadId,
        parentCheckpointId: fromCheckpointId,
        branchCreatedAt: new Date().toISOString(),
        branchDescription: branchOptions.description,
        source: 'fork',
        step: 0,
        parents: {},
      }
    );

    // Store branch info
    const branchInfo: BranchInfo = {
      id: branchId,
      name: branchOptions.name,
      description: branchOptions.description,
      parentThreadId: threadId,
      parentCheckpointId: fromCheckpointId,
      createdAt: new Date(),
      checkpointCount: 1,
      status: 'active',
      metadata: branchOptions.metadata,
    };

    this.branches.set(branchId, branchInfo);

    this.logger.log(
      `Created branch '${branchOptions.name}' with ID: ${branchId}`
    );
    return branchId;
  }

  /**
   * Get comprehensive execution history for visualization
   */
  async getExecutionHistory(
    threadId: string,
    options: HistoryOptions = {}
  ): Promise<readonly ExecutionHistoryNode[]> {
    // Validate options
    const validation = HistoryOptionsSchema.safeParse(options);
    if (!validation.success) {
      throw new Error(`Invalid history options: ${validation.error.message}`);
    }

    const checkpoints = await this.checkpointManager.listCheckpoints(threadId, {
      limit: options.limit ?? 100,
      offset: options.offset ?? 0,
    });

    const historyNodes: ExecutionHistoryNode[] = checkpoints.map(
      ([config, checkpoint, metadata]) => ({
        checkpointId: checkpoint.id,
        threadId:
          ((config as any)?.configurable?.thread_id as string) ?? threadId,
        nodeId: String(metadata?.step ?? 'unknown'),
        timestamp: new Date(metadata?.timestamp ?? Date.now()),
        state: checkpoint.channel_values,
        parentCheckpointId: metadata?.parent_checkpoint_id as string,
        branchId: metadata?.branch_id as string,
        branchName: metadata?.branch_name as string,
        workflowName: metadata?.workflowName as string,
        executionDuration: metadata?.execution_duration as number,
        nodeType: metadata?.node_type as ExecutionHistoryNode['nodeType'],
        error: metadata?.error as ExecutionHistoryNode['error'],
      })
    );

    // Apply filters
    let filteredNodes = historyNodes;

    if (options.nodeType) {
      filteredNodes = filteredNodes.filter(
        (node) => node.nodeType === options.nodeType
      );
    }

    if (options.workflowName) {
      filteredNodes = filteredNodes.filter(
        (node) => node.workflowName === options.workflowName
      );
    }

    if (options.branchName) {
      filteredNodes = filteredNodes.filter(
        (node) => node.branchName === options.branchName
      );
    }

    if (options.dateRange) {
      const { from, to } = options.dateRange;
      filteredNodes = filteredNodes.filter((node) => {
        const date = node.timestamp.getTime();
        return (
          (!from || date >= from.getTime()) && (!to || date <= to.getTime())
        );
      });
    }

    // Sort by timestamp for chronological order
    filteredNodes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Build tree structure if includeChildren is true
    if (options.includeChildren) {
      filteredNodes = this.buildHistoryTree(filteredNodes);
    }

    return filteredNodes;
  }

  /**
   * Compare states between two checkpoints
   */
  async compareCheckpoints<T extends Record<string, unknown>>(
    threadId: string,
    checkpointId1: string,
    checkpointId2: string
  ): Promise<StateComparison<T>> {
    const [checkpoint1, checkpoint2] = await Promise.all([
      this.checkpointManager.loadCheckpoint<T>(threadId, checkpointId1),
      this.checkpointManager.loadCheckpoint<T>(threadId, checkpointId2),
    ]);

    if (!checkpoint1 || !checkpoint2) {
      throw new CheckpointNotFoundError(
        'One or both checkpoints not found',
        threadId
      );
    }

    return this.compareStates(
      checkpoint1.channel_values,
      checkpoint2.channel_values
    );
  }

  /**
   * List all branches for a thread
   */
  async listBranches(threadId: string): Promise<readonly BranchInfo[]> {
    const branches: BranchInfo[] = [];

    for (const branch of this.branches.values()) {
      if (branch.parentThreadId === threadId) {
        branches.push(branch);
      }
    }

    // Sort by creation date
    branches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return branches;
  }

  /**
   * Merge branch back to main execution
   */
  async mergeBranch<T extends Record<string, unknown>>(
    threadId: string,
    branchId: string,
    mergeStrategy: 'overwrite' | 'merge' | 'custom' = 'merge'
  ): Promise<void> {
    const branch = this.branches.get(branchId);

    if (!branch) {
      throw new BranchNotFoundError(
        `Branch ${branchId} not found`,
        threadId,
        branchId
      );
    }

    if (branch.status !== 'active') {
      throw new Error(
        `Branch ${branchId} is not active (status: ${branch.status})`
      );
    }

    // In a real implementation, this would merge the branch state
    // back to the main thread based on the merge strategy

    // Update branch status
    branch.status = 'merged';
    branch.updatedAt = new Date();

    this.logger.log(
      `Merged branch ${branchId} into thread ${threadId} using ${mergeStrategy} strategy`
    );
  }

  /**
   * Delete a branch
   */
  async deleteBranch(threadId: string, branchId: string): Promise<void> {
    const branch = this.branches.get(branchId);

    if (!branch) {
      throw new BranchNotFoundError(
        `Branch ${branchId} not found`,
        threadId,
        branchId
      );
    }

    if (branch.status === 'merged') {
      throw new Error(`Cannot delete merged branch ${branchId}`);
    }

    // Update status to abandoned
    branch.status = 'abandoned';
    branch.updatedAt = new Date();

    this.logger.log(`Deleted branch ${branchId}`);
  }

  /**
   * Export execution history for analysis
   */
  async exportHistory(
    threadId: string,
    format: 'json' | 'csv' | 'mermaid' = 'json'
  ): Promise<string> {
    const history = await this.getExecutionHistory(threadId, {
      includeChildren: true,
    });

    switch (format) {
      case 'json':
        return JSON.stringify(history, null, 2);

      case 'csv':
        return this.exportHistoryAsCSV(history);

      case 'mermaid':
        return this.exportHistoryAsMermaid(history);

      default:
        return JSON.stringify(history, null, 2);
    }
  }

  /**
   * Compare two states and return differences
   */
  private compareStates<T>(state1: T, state2: T): StateComparison<T> {
    const differences: StateDifference[] = [];
    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    // Deep comparison implementation
    const compareObjects = (obj1: unknown, obj2: unknown, path = ''): void => {
      if (obj1 === obj2) {
        return;
      }

      const type1 = typeof obj1;
      const type2 = typeof obj2;

      if (type1 !== type2) {
        differences.push({
          path,
          type: 'type-changed',
          value1: obj1,
          value2: obj2,
          type1,
          type2,
        });
        modified.push(path);
        return;
      }

      if (obj1 === null || obj1 === undefined) {
        differences.push({
          path,
          type: obj2 === undefined ? 'removed' : 'added',
          value1: obj1,
          value2: obj2,
        });
        if (obj2 === undefined) {
          removed.push(path);
        } else {
          added.push(path);
        }
        return;
      }

      if (type1 === 'object' && !Array.isArray(obj1)) {
        const keys1 = Object.keys(obj1 as object);
        const keys2 = Object.keys(obj2 as object);
        const allKeys = new Set([...keys1, ...keys2]);

        for (const key of allKeys) {
          const newPath = path ? `${path}.${key}` : key;
          compareObjects(
            (obj1 as Record<string, unknown>)[key],
            (obj2 as Record<string, unknown>)[key],
            newPath
          );
        }
      } else if (Array.isArray(obj1) && Array.isArray(obj2)) {
        const maxLength = Math.max(obj1.length, obj2.length);
        for (let i = 0; i < maxLength; i++) {
          const newPath = `${path}[${i}]`;
          compareObjects(obj1[i], obj2[i], newPath);
        }
      } else {
        differences.push({
          path,
          type: 'modified',
          value1: obj1,
          value2: obj2,
        });
        modified.push(path);
      }
    };

    compareObjects(state1, state2);

    return {
      identical: differences.length === 0,
      differences,
      added,
      removed,
      modified,
      state1,
      state2,
    };
  }

  /**
   * Build history tree structure
   */
  private buildHistoryTree(
    nodes: ExecutionHistoryNode[]
  ): ExecutionHistoryNode[] {
    const nodeMap = new Map<string, ExecutionHistoryNode>();
    const roots: ExecutionHistoryNode[] = [];

    // First pass: create map
    for (const node of nodes) {
      nodeMap.set(node.checkpointId, { ...node, children: [] });
    }

    // Second pass: build tree
    for (const node of nodeMap.values()) {
      if (node.parentCheckpointId) {
        const parent = nodeMap.get(node.parentCheckpointId);
        if (parent) {
          (parent.children as ExecutionHistoryNode[]).push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /**
   * Add history node
   */
  private addHistoryNode(threadId: string, node: ExecutionHistoryNode): void {
    const history = this.executionHistory.get(threadId) ?? [];
    history.push(node);
    this.executionHistory.set(threadId, history);
  }

  /**
   * Export history as CSV
   */
  private exportHistoryAsCSV(history: readonly ExecutionHistoryNode[]): string {
    const headers = [
      'Checkpoint ID',
      'Thread ID',
      'Node ID',
      'Timestamp',
      'Node Type',
      'Workflow Name',
      'Duration (ms)',
      'Error',
    ];

    const rows = history.map((node) => [
      node.checkpointId,
      node.threadId,
      node.nodeId,
      node.timestamp.toISOString(),
      node.nodeType ?? '',
      node.workflowName ?? '',
      node.executionDuration?.toString() ?? '',
      node.error?.message ?? '',
    ]);

    return [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');
  }

  /**
   * Export history as Mermaid diagram
   */
  private exportHistoryAsMermaid(
    history: readonly ExecutionHistoryNode[]
  ): string {
    const lines: string[] = ['graph TD'];

    const addNode = (node: ExecutionHistoryNode, indent = 1): void => {
      const nodeId = node.checkpointId.replace(/-/g, '');
      const label = `${node.nodeId}\\n${node.timestamp.toISOString()}`;
      const spacing = '  '.repeat(indent);

      lines.push(`${spacing}${nodeId}["${label}"]`);

      if (node.children) {
        for (const child of node.children) {
          const childId = child.checkpointId.replace(/-/g, '');
          lines.push(`${spacing}${nodeId} --> ${childId}`);
          addNode(child, indent);
        }
      }
    };

    for (const root of history) {
      addNode(root);
    }

    return lines.join('\n');
  }

  /**
   * Register workflow for replay
   */
  registerWorkflow(name: string, workflow: unknown): void {
    this.workflowRegistry.set(name, workflow);
    this.logger.debug(`Registered workflow: ${name}`);
  }
}
