import { Injectable, Inject } from '@nestjs/common';
import {
  BaseCheckpointTuple,
  ICheckpointAdapter,
} from '@hive-academy/langgraph-core';
import {
  ExecutionHistoryNode,
  HistoryOptions,
  StateComparison,
  StateDifference,
  CheckpointNotFoundError,
  HistoryOptionsSchema,
} from '../interfaces/time-travel.interface';
// Removed unused imports

/**
 * Service responsible for execution history tracking and analysis
 * Handles history retrieval, state comparison, and export functionality
 */
@Injectable()
export class ExecutionHistoryService {
  private readonly executionHistory = new Map<string, ExecutionHistoryNode[]>();

  constructor(
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter: ICheckpointAdapter
  ) {}

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

    const checkpoints = await this.checkpointAdapter.listCheckpoints(threadId, {
      limit: options.limit ?? 100,
      offset: options.offset ?? 0,
    });

    const historyNodes: ExecutionHistoryNode[] = checkpoints.map(
      (tuple: BaseCheckpointTuple) => {
        const [config, checkpoint, metadata] = tuple;
        return {
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
        };
      }
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
      this.checkpointAdapter.loadCheckpoint<T>(threadId, checkpointId1),
      this.checkpointAdapter.loadCheckpoint<T>(threadId, checkpointId2),
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
   * Add history node
   */
  addHistoryNode(threadId: string, node: ExecutionHistoryNode): void {
    const history = this.executionHistory.get(threadId) ?? [];
    history.push(node);
    this.executionHistory.set(threadId, history);
  }

  /**
   * Get execution statistics
   */
  async getExecutionStats(threadId: string): Promise<{
    totalNodes: number;
    nodeTypes: Record<string, number>;
    averageExecutionTime: number;
    totalExecutionTime: number;
    errorCount: number;
    longestRunningNode: {
      nodeId: string;
      duration: number;
    } | null;
  }> {
    const history = await this.getExecutionHistory(threadId);

    const nodeTypes: Record<string, number> = {};
    let totalExecutionTime = 0;
    let nodeWithDuration = 0;
    let errorCount = 0;
    let longestDuration = 0;
    let longestRunningNode: { nodeId: string; duration: number } | null = null;

    for (const node of history) {
      // Count node types
      const nodeType = node.nodeType || 'unknown';
      nodeTypes[nodeType] = (nodeTypes[nodeType] || 0) + 1;

      // Count errors
      if (node.error) {
        errorCount++;
      }

      // Track execution times
      if (node.executionDuration) {
        totalExecutionTime += node.executionDuration;
        nodeWithDuration++;

        if (node.executionDuration > longestDuration) {
          longestDuration = node.executionDuration;
          longestRunningNode = {
            nodeId: node.nodeId,
            duration: node.executionDuration,
          };
        }
      }
    }

    return {
      totalNodes: history.length,
      nodeTypes,
      averageExecutionTime:
        nodeWithDuration > 0 ? totalExecutionTime / nodeWithDuration : 0,
      totalExecutionTime,
      errorCount,
      longestRunningNode,
    };
  }

  /**
   * Analyze state evolution over time
   */
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
    const history = await this.getExecutionHistory(threadId);

    const changes = history.map((node) => ({
      checkpointId: node.checkpointId,
      timestamp: node.timestamp,
      value: this.getNestedValue(node.state, fieldPath),
      valueType: typeof this.getNestedValue(node.state, fieldPath),
    }));

    const uniqueValues = new Set(changes.map((c) => JSON.stringify(c.value)))
      .size;

    return {
      changes,
      summary: {
        totalChanges: changes.length,
        uniqueValues,
        firstValue: changes[0]?.value,
        lastValue: changes[changes.length - 1]?.value,
      },
    };
  }

  /**
   * Find checkpoint by criteria
   */
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
    const history = await this.getExecutionHistory(threadId);

    for (const node of history) {
      // Check node type
      if (criteria.nodeType && node.nodeType !== criteria.nodeType) {
        continue;
      }

      // Check error state
      if (
        criteria.hasError !== undefined &&
        !!node.error !== criteria.hasError
      ) {
        continue;
      }

      // Check workflow name
      if (
        criteria.workflowName &&
        node.workflowName !== criteria.workflowName
      ) {
        continue;
      }

      // Check time range
      if (criteria.timeRange) {
        const timestamp = node.timestamp.getTime();
        if (
          timestamp < criteria.timeRange.from.getTime() ||
          timestamp > criteria.timeRange.to.getTime()
        ) {
          continue;
        }
      }

      // Check state contains
      if (criteria.stateContains) {
        let stateMatches = true;
        for (const [key, value] of Object.entries(criteria.stateContains)) {
          if (this.getNestedValue(node.state, key) !== value) {
            stateMatches = false;
            break;
          }
        }
        if (!stateMatches) {
          continue;
        }
      }

      return node;
    }

    return null;
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
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    return path
      .split('.')
      .reduce((current: any, key: string) => current?.[key], obj);
  }
}
