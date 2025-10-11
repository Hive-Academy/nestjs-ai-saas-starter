# Implementation Plan - TimeTravel Module

**Task**: TASK_2025_008
**Module**: TimeTravel
**Effort Estimate**: 10 hours
**Related Files**: See implementation-plan-overview.md for shared patterns

---

## Module Overview

**Target Services**:

- `BranchManagerService` - Branch relationship graph (6 hours)
- `WorkflowReplayService` - User debugging patterns (4 hours)

**Integration Goals**:

- Store branch relationships with hierarchical namespaces
- Track branch parent-child relationships for tree visualization
- Enable personalized debugging via `getUserPatterns()`
- Discover optimal branches via semantic search

---

## Integration 5.1: Branch Relationship Graph (6 hours)

### Service Details

**Service**: `BranchManagerService`
**File**: `libs/langgraph-modules/time-travel/src/lib/services/branch-manager.service.ts`

### Current State (Evidence)

```typescript
// Line 355, 487 (verified): Flat branch storage
await this.memoryAdapter.store(branchId, JSON.stringify(branchData), metadata);
```

### Enhanced Implementation

```typescript
import { IMemoryAdapter, Store } from '@hive-academy/langgraph-core';
import { STORE_COLLECTIONS } from '@hive-academy/langgraph-memory';

@Injectable()
export class BranchManagerService {
  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter // ... other dependencies
  ) {}

  /**
   * Create branch with relationship tracking
   * Phase 2: Store-based branch graph
   */
  async createBranch(executionId: string, parentBranchId: string | null, divergencePoint: string): Promise<string> {
    // 1. Create branch (core operation)
    const branchId = this.generateBranchId();
    await this.createBranchLogic(branchId, executionId, parentBranchId, divergencePoint);

    // 2. Store branch relationship (non-blocking)
    if (this.memoryAdapter) {
      this.storeBranchRelationship(executionId, branchId, parentBranchId, divergencePoint).catch((error) => {
        this.logger.warn('Failed to store branch relationship:', error);
      });
    }

    return branchId;
  }

  /**
   * Store branch with parent relationship
   * Phase 2: Hierarchical namespace for branch tree
   */
  private async storeBranchRelationship(executionId: string, branchId: string, parentBranchId: string | null, divergencePoint: string): Promise<void> {
    const store: Store = this.memoryAdapter!.getStore(STORE_COLLECTIONS.TIME_TRAVEL.BRANCHES);

    // Hierarchical namespace: [collection, domain, executionId, subdomain, branchId]
    await store.put(['executions', executionId, 'branches', branchId], {
      parentBranch: parentBranchId,
      divergencePoint,
      createdAt: new Date(),
      metadata: {
        createdBy: this.userId,
        depth: await this.calculateBranchDepth(executionId, parentBranchId),
      },
    });

    this.logger.debug(`Stored branch relationship: ${branchId}`);
  }

  /**
   * Query entire branch tree for execution
   * Phase 2: Hierarchical namespace queries
   */
  async getBranchTree(executionId: string): Promise<BranchTreeNode[]> {
    if (!this.memoryAdapter) {
      return []; // Graceful degradation
    }

    const store: Store = this.memoryAdapter.getStore(STORE_COLLECTIONS.TIME_TRAVEL.BRANCHES);

    try {
      // List all branches for execution
      const branches = await store.list(['executions', executionId, 'branches']);

      // Build tree structure
      return this.buildBranchTree(branches);
    } catch (error) {
      this.logger.warn('Failed to get branch tree:', error);
      return [];
    }
  }

  /**
   * Find optimal branch based on outcomes
   */
  async findOptimalBranch(executionId: string): Promise<string | null> {
    const branchTree = await this.getBranchTree(executionId);

    if (branchTree.length === 0) return null;

    // Flatten tree and rank by outcome
    const allBranches = this.flattenTree(branchTree);

    const rankedBranches = allBranches.filter((b) => b.outcome !== undefined).sort((a, b) => this.compareBranchOutcomes(a.outcome!, b.outcome!));

    return rankedBranches[0]?.branchId || null;
  }

  /**
   * Search related branches across executions
   */
  async findSimilarBranches(executionId: string, branchId: string, query: string): Promise<BranchSummary[]> {
    if (!this.memoryAdapter) {
      return [];
    }

    const store: Store = this.memoryAdapter.getStore(STORE_COLLECTIONS.TIME_TRAVEL.BRANCHES);

    try {
      // Search across all executions
      const results = await store.search(
        ['executions'], // Search all executions
        query
      );

      return results.map((item) => ({
        executionId: item.namespace[1], // Extract from namespace
        branchId: item.key,
        ...item.value,
        similarity: item.score || 0,
      }));
    } catch (error) {
      this.logger.warn('Failed to search similar branches:', error);
      return [];
    }
  }

  /**
   * Build branch tree from flat list
   */
  private buildBranchTree(branches: Array<{ key: string; value: any }>): BranchTreeNode[] {
    const branchMap = new Map<string, BranchTreeNode>();
    const rootBranches: BranchTreeNode[] = [];

    // Create nodes
    branches.forEach((item) => {
      branchMap.set(item.key, {
        branchId: item.key,
        parentBranchId: item.value.parentBranch,
        divergencePoint: item.value.divergencePoint,
        depth: item.value.metadata?.depth || 0,
        children: [],
        createdAt: item.value.createdAt,
      });
    });

    // Build tree structure
    branchMap.forEach((node) => {
      if (node.parentBranchId === null) {
        rootBranches.push(node);
      } else {
        const parent = branchMap.get(node.parentBranchId);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    return rootBranches;
  }

  private flattenTree(tree: BranchTreeNode[]): BranchTreeNode[] {
    const result: BranchTreeNode[] = [];

    const traverse = (nodes: BranchTreeNode[]) => {
      nodes.forEach((node) => {
        result.push(node);
        if (node.children.length > 0) {
          traverse(node.children);
        }
      });
    };

    traverse(tree);
    return result;
  }

  private async calculateBranchDepth(executionId: string, parentBranchId: string | null): Promise<number> {
    if (parentBranchId === null) return 0;

    const store: Store = this.memoryAdapter!.getStore(STORE_COLLECTIONS.TIME_TRAVEL.BRANCHES);

    try {
      const parent = await store.get(['executions', executionId, 'branches', parentBranchId], parentBranchId);

      return (parent?.metadata?.depth || 0) + 1;
    } catch {
      return 1; // Default if parent not found
    }
  }

  private compareBranchOutcomes(a: BranchOutcome, b: BranchOutcome): number {
    // Higher score is better
    return b.score - a.score;
  }

  private generateBranchId(): string {
    return `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Supporting interfaces
 */
interface BranchTreeNode {
  branchId: string;
  parentBranchId: string | null;
  divergencePoint: string;
  depth: number;
  children: BranchTreeNode[];
  createdAt: Date;
  outcome?: BranchOutcome;
}

interface BranchOutcome {
  success: boolean;
  score: number;
  metrics: Record<string, any>;
}

interface BranchSummary {
  executionId: string;
  branchId: string;
  parentBranch: string | null;
  divergencePoint: string;
  similarity: number;
}
```

### Evidence

- Current usage: `branch-manager.service.ts:355, 487`
- Store interface: `memory-adapter.interface.ts:60-100`

### Testing Requirements

**Unit Tests**:

- Branch tree building and traversal
- Branch depth calculation
- Tree flattening for ranking
- Graceful degradation without memory adapter

**Integration Tests**:

- Branch relationship storage and queries
- Real Store operations with branch hierarchies
- Performance: Branch tree retrieval <200ms for 100 branches

**Test Cases**:

```typescript
describe('BranchManagerService - Branch Relationship Graph', () => {
  let service: BranchManagerService;
  let mockMemoryAdapter: Partial<IMemoryAdapter>;
  let mockStore: Partial<Store>;

  beforeEach(() => {
    mockStore = {
      put: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      list: jest.fn().mockResolvedValue([]),
      search: jest.fn().mockResolvedValue([]),
    };

    mockMemoryAdapter = {
      getStore: jest.fn().mockReturnValue(mockStore),
    };

    service = new BranchManagerService(
      mockMemoryAdapter as IMemoryAdapter
      // ... other dependencies
    );
  });

  it('should create branch and store relationship', async () => {
    const branchId = await service.createBranch('exec-123', null, 'node-5');

    // Wait for async storage
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(branchId).toMatch(/^branch_/);
    expect(mockStore.put).toHaveBeenCalledWith(
      ['executions', 'exec-123', 'branches', branchId],
      expect.objectContaining({
        parentBranch: null,
        divergencePoint: 'node-5',
        metadata: expect.objectContaining({
          depth: 0, // Root branch
        }),
      })
    );
  });

  it('should calculate branch depth correctly', async () => {
    mockStore.get = jest.fn().mockResolvedValue({
      metadata: { depth: 2 },
    });

    const depth = await service['calculateBranchDepth']('exec-123', 'parent-branch');

    expect(depth).toBe(3); // Parent depth + 1
  });

  it('should build branch tree from flat list', () => {
    const branches = [
      {
        key: 'branch-1',
        value: {
          parentBranch: null,
          divergencePoint: 'node-1',
          createdAt: new Date(),
          metadata: { depth: 0 },
        },
      },
      {
        key: 'branch-2',
        value: {
          parentBranch: 'branch-1',
          divergencePoint: 'node-3',
          createdAt: new Date(),
          metadata: { depth: 1 },
        },
      },
      {
        key: 'branch-3',
        value: {
          parentBranch: 'branch-1',
          divergencePoint: 'node-4',
          createdAt: new Date(),
          metadata: { depth: 1 },
        },
      },
    ];

    const tree = service['buildBranchTree'](branches);

    expect(tree).toHaveLength(1); // One root
    expect(tree[0].branchId).toBe('branch-1');
    expect(tree[0].children).toHaveLength(2); // Two children
  });

  it('should flatten branch tree', () => {
    const tree: BranchTreeNode[] = [
      {
        branchId: 'root',
        parentBranchId: null,
        divergencePoint: 'node-1',
        depth: 0,
        children: [
          {
            branchId: 'child-1',
            parentBranchId: 'root',
            divergencePoint: 'node-2',
            depth: 1,
            children: [],
            createdAt: new Date(),
          },
        ],
        createdAt: new Date(),
      },
    ];

    const flat = service['flattenTree'](tree);

    expect(flat).toHaveLength(2);
    expect(flat[0].branchId).toBe('root');
    expect(flat[1].branchId).toBe('child-1');
  });

  it('should find optimal branch by outcome score', async () => {
    mockStore.list = jest.fn().mockResolvedValue([
      {
        key: 'branch-1',
        value: {
          parentBranch: null,
          outcome: { score: 0.7, success: true },
        },
      },
      {
        key: 'branch-2',
        value: {
          parentBranch: null,
          outcome: { score: 0.95, success: true },
        },
      },
    ]);

    const optimalBranch = await service.findOptimalBranch('exec-123');

    expect(optimalBranch).toBe('branch-2'); // Higher score
  });

  it('should search similar branches across executions', async () => {
    mockStore.search = jest.fn().mockResolvedValue([
      {
        key: 'branch-A',
        namespace: ['executions', 'exec-456', 'branches', 'branch-A'],
        value: { divergencePoint: 'node-5' },
        score: 0.89,
      },
    ]);

    const similar = await service.findSimilarBranches('exec-123', 'branch-1', 'similar divergence pattern');

    expect(similar).toHaveLength(1);
    expect(similar[0].executionId).toBe('exec-456');
    expect(similar[0].branchId).toBe('branch-A');
    expect(similar[0].similarity).toBe(0.89);
  });
});
```

---

## Integration 5.2: User Debugging Patterns (4 hours)

### Service Details

**Service**: `WorkflowReplayService`
**File**: `libs/langgraph-modules/time-travel/src/lib/services/workflow-replay.service.ts`

### Current State (Evidence)

```typescript
// No user debugging pattern analysis
async replayWorkflow(executionId: string, replayOptions: ReplayOptions): Promise<ReplayResult>
```

### Enhanced Implementation

```typescript
import { IMemoryAdapter, UserMemoryPatterns } from '@hive-academy/langgraph-core';

@Injectable()
export class WorkflowReplayService {
  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter // ... other dependencies
  ) {}

  /**
   * Suggest breakpoints based on user debugging patterns
   * Phase 2: getUserPatterns for personalized debugging
   */
  async suggestBreakpoints(userId: string, workflowType: string): Promise<BreakpointSuggestion[]> {
    if (!this.memoryAdapter) {
      return this.getDefaultBreakpoints(workflowType);
    }

    try {
      // Get user's debugging patterns
      const userPatterns: UserMemoryPatterns = await this.memoryAdapter.getUserPatterns(userId);

      // Analyze where this user typically finds issues
      const commonErrorNodes = this.extractCommonErrorNodes(userPatterns);

      // Generate personalized suggestions
      return this.generateBreakpointSuggestions(workflowType, commonErrorNodes, userPatterns);
    } catch (error) {
      this.logger.warn('Failed to get user patterns:', error);
      return this.getDefaultBreakpoints(workflowType);
    }
  }

  /**
   * Extract common error nodes from user patterns
   */
  private extractCommonErrorNodes(patterns: UserMemoryPatterns): string[] {
    const frequentErrors = patterns.frequentErrors || [];

    // Parse error nodes from frequent errors
    return frequentErrors
      .map((error) => {
        // Extract node ID from error message (format: "Error in node: node_id")
        const match = error.match(/node[:\s]+([a-zA-Z0-9_-]+)/i);
        return match ? match[1] : null;
      })
      .filter((node): node is string => node !== null);
  }

  /**
   * Generate breakpoint suggestions based on user history
   */
  private generateBreakpointSuggestions(workflowType: string, commonErrorNodes: string[], patterns: UserMemoryPatterns): BreakpointSuggestion[] {
    const suggestions: BreakpointSuggestion[] = [];

    // Suggest breakpoints at common error nodes
    commonErrorNodes.forEach((nodeId) => {
      suggestions.push({
        nodeId,
        reason: 'Frequently debugged node in your history',
        confidence: 0.9,
        type: 'user-pattern',
      });
    });

    // Suggest breakpoints based on workflow type patterns
    const workflowSpecific = this.getWorkflowSpecificBreakpoints(workflowType, patterns);
    suggestions.push(...workflowSpecific);

    // Sort by confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get workflow-specific breakpoints from user patterns
   */
  private getWorkflowSpecificBreakpoints(workflowType: string, patterns: UserMemoryPatterns): BreakpointSuggestion[] {
    const suggestions: BreakpointSuggestion[] = [];

    // Analyze successful workflows for this type
    const successfulWorkflows = patterns.successfulWorkflows || [];
    const typeWorkflows = successfulWorkflows.filter((wf) => wf.includes(workflowType));

    if (typeWorkflows.length > 0) {
      // User has successfully debugged this workflow type before
      suggestions.push({
        nodeId: 'entrypoint',
        reason: `You've successfully debugged ${typeWorkflows.length} ${workflowType} workflows`,
        confidence: 0.7,
        type: 'workflow-familiarity',
      });
    }

    return suggestions;
  }

  /**
   * Get default breakpoints when no user patterns available
   */
  private getDefaultBreakpoints(workflowType: string): BreakpointSuggestion[] {
    return [
      {
        nodeId: 'entrypoint',
        reason: 'Workflow entry point (default suggestion)',
        confidence: 0.5,
        type: 'default',
      },
    ];
  }

  /**
   * Record replay session for learning
   */
  async recordReplaySession(userId: string, executionId: string, replayResult: ReplayResult): Promise<void> {
    if (!this.memoryAdapter) return;

    // Non-blocking storage
    this.memoryAdapter
      .store(
        `replay-session-${userId}`,
        JSON.stringify({
          executionId,
          breakpoints: replayResult.breakpointsUsed,
          stepsReplayed: replayResult.stepsReplayed,
          issueFound: replayResult.issueFound,
          resolutionTime: replayResult.duration,
          timestamp: new Date(),
        }),
        {
          namespace: ['replay-sessions', userId],
          tags: ['replay', replayResult.issueFound ? 'success' : 'incomplete'],
        }
      )
      .catch((error) => {
        this.logger.warn('Failed to record replay session:', error);
      });
  }
}

/**
 * Supporting interfaces
 */
interface BreakpointSuggestion {
  nodeId: string;
  reason: string;
  confidence: number;
  type: 'user-pattern' | 'workflow-familiarity' | 'default';
}

interface ReplayResult {
  success: boolean;
  breakpointsUsed: string[];
  stepsReplayed: number;
  issueFound: boolean;
  duration: number;
}
```

### Evidence

- `getUserPatterns` interface: `memory-adapter.interface.ts:184-187`
- `UserMemoryPatterns` type: `memory-adapter.interface.ts:21-32`

### Testing Requirements

**Unit Tests**:

- Breakpoint suggestion generation
- Common error node extraction from patterns
- Workflow-specific suggestions
- Graceful degradation without memory adapter

**Integration Tests**:

- User patterns retrieval and analysis
- Breakpoint confidence scoring
- Performance: Breakpoint suggestion <100ms

**Test Cases** (see implementation-plan-multi-agent.md for user pattern test structure)

---

## Quality Gates

### Pre-Implementation Checklist

- [ ] Read implementation-plan-overview.md for shared patterns
- [ ] Verify BranchManagerService current state (lines 355, 487)
- [ ] Review getUserPatterns interface in memory-adapter.interface.ts
- [ ] Check TimeTravel module CLAUDE.md for module conventions

### Implementation Checklist

- [ ] BranchManagerService branch graph implemented
- [ ] WorkflowReplayService user patterns implemented
- [ ] Optional injection pattern used (`@Optional() @Inject('IMemoryAdapter')`)
- [ ] Graceful degradation tested (works without memory adapter)
- [ ] Error handling tested (memory failures don't break replay)
- [ ] Async non-blocking pattern used for memory operations
- [ ] Unit tests written (80%+ coverage)
- [ ] Integration tests written (real Store operations)
- [ ] Performance benchmarks met (branch tree <200ms, breakpoints <100ms)
- [ ] JSDoc comments added (service + method level)
- [ ] Module CLAUDE.md updated with Phase 2 integration section

### Validation Checklist

- [ ] Build passes: `npx nx build @hive-academy/langgraph-time-travel`
- [ ] Tests pass: `npx nx test @hive-academy/langgraph-time-travel`
- [ ] Lint passes: `npx nx lint @hive-academy/langgraph-time-travel`
- [ ] Coverage: 80%+ maintained or improved
- [ ] No architectural violations detected
- [ ] Branch tree structure correctness validated

---

**Document Status**: COMPLETE ✅
**Next Module**: implementation-plan-testing-deployment.md
