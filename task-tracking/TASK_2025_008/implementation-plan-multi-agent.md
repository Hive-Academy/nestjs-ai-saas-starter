# Implementation Plan - MultiAgent Module

**Task**: TASK_2025_008
**Module**: MultiAgent
**Effort Estimate**: 9 hours
**Related Files**: See implementation-plan-overview.md for shared patterns

---

## Module Overview

**Target Services**:

- `NetworkSetupService` - Agent collaboration graph (6 hours)
- `MultiAgentCoordinatorService` - User-agent affinity patterns (3 hours)

**Integration Goals**:

- Store agent collaboration patterns with hierarchical namespaces
- Track collaboration success rates and response times
- Enable personalized agent selection via `getUserPatterns()`
- Discover optimal collaboration partners via semantic search

---

## Integration 3.1: Agent Collaboration Graph (6 hours)

### Service Details

**Service**: `NetworkSetupService`
**File**: `libs/langgraph-modules/multi-agent/src/lib/coordination/network-setup.service.ts`

### Current State (Evidence)

```typescript
// Line 190, 308 (verified): Generic storage without relationships
await this.memoryAdapter.store(`network-topology-${networkId}`, JSON.stringify(topologyData), metadata);
```

### Enhanced Implementation

```typescript
import { IMemoryAdapter, Store } from '@hive-academy/langgraph-core';
import { STORE_COLLECTIONS } from '@hive-academy/langgraph-memory';

@Injectable()
export class NetworkSetupService {
  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter // ... other dependencies
  ) {}

  /**
   * Track agent collaboration in network
   * Phase 2: Store-based collaboration graph
   */
  async trackAgentCollaboration(networkId: string, collaboration: AgentCollaboration): Promise<void> {
    if (!this.memoryAdapter) return;

    // Non-blocking storage
    this.storeCollaborationAsync(networkId, collaboration).catch((error) => {
      this.logger.warn('Failed to store collaboration:', error);
    });
  }

  private async storeCollaborationAsync(networkId: string, collaboration: AgentCollaboration): Promise<void> {
    const store: Store = this.memoryAdapter!.getStore(STORE_COLLECTIONS.MULTI_AGENT.COLLABORATIONS);

    // Store bidirectional collaboration data
    // Namespace: [collection, domain, networkId, subdomain, agent1, agent2]
    await store.put(['networks', networkId, 'collaborations', collaboration.agent1Id, collaboration.agent2Id], {
      successRate: collaboration.successRate,
      avgResponseTime: collaboration.avgResponseTime,
      taskTypes: collaboration.commonTasks,
      totalCollaborations: collaboration.count,
      lastCollaboration: new Date(),
      metrics: {
        errorRate: collaboration.errorRate || 0,
        avgQuality: collaboration.qualityScore || 0.8,
      },
    });

    this.logger.debug(`Stored collaboration: ${collaboration.agent1Id} <-> ${collaboration.agent2Id}`);
  }

  /**
   * Query best collaboration partners for an agent
   * Phase 2: Hierarchical namespace queries
   */
  async getAgentCollaborators(networkId: string, agentId: string): Promise<CollaboratorRanking[]> {
    if (!this.memoryAdapter) {
      return []; // Graceful degradation
    }

    const store: Store = this.memoryAdapter.getStore(STORE_COLLECTIONS.MULTI_AGENT.COLLABORATIONS);

    try {
      // List all collaborators for this agent
      const collaborators = await store.list(['networks', networkId, 'collaborations', agentId]);

      // Rank by success rate and response time
      return this.rankCollaborators(collaborators);
    } catch (error) {
      this.logger.warn('Failed to get agent collaborators:', error);
      return [];
    }
  }

  /**
   * Find best collaboration partner for task
   */
  async findBestCollaborator(networkId: string, agentId: string, taskType: string): Promise<string | null> {
    const collaborators = await this.getAgentCollaborators(networkId, agentId);

    if (collaborators.length === 0) return null;

    // Find collaborator with best success rate for this task type
    const bestForTask = collaborators.find((c) => c.taskTypes.includes(taskType));

    return bestForTask?.agentId || collaborators[0].agentId;
  }

  /**
   * Rank collaborators by performance
   */
  private rankCollaborators(collaborators: Array<{ key: string; value: any }>): CollaboratorRanking[] {
    return collaborators
      .map((item) => ({
        agentId: item.key,
        successRate: item.value.successRate,
        avgResponseTime: item.value.avgResponseTime,
        taskTypes: item.value.taskTypes,
        score: this.calculateCollaboratorScore(item.value),
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate collaborator score (higher is better)
   */
  private calculateCollaboratorScore(collaboration: any): number {
    const successWeight = 0.6;
    const responseTimeWeight = 0.3;
    const qualityWeight = 0.1;

    const successScore = collaboration.successRate * successWeight;
    const responseScore = Math.max(0, 1 - collaboration.avgResponseTime / 5000) * responseTimeWeight;
    const qualityScore = (collaboration.metrics?.avgQuality || 0.8) * qualityWeight;

    return successScore + responseScore + qualityScore;
  }
}

/**
 * Supporting interfaces
 */
interface AgentCollaboration {
  agent1Id: string;
  agent2Id: string;
  successRate: number;
  avgResponseTime: number;
  commonTasks: string[];
  count: number;
  errorRate?: number;
  qualityScore?: number;
}

interface CollaboratorRanking {
  agentId: string;
  successRate: number;
  avgResponseTime: number;
  taskTypes: string[];
  score: number;
}
```

### Evidence

- Current usage: `network-setup.service.ts:190, 308`
- Store interface: `memory-adapter.interface.ts:60-100`

### Testing Requirements

**Unit Tests**:

- Collaboration tracking and ranking
- Collaborator score calculation (60% success, 30% response time, 10% quality)
- Best collaborator selection for task types
- Graceful degradation without memory adapter

**Integration Tests**:

- Real Store operations with multiple agents
- Collaboration queries with hierarchical namespaces
- Performance: Collaboration queries <100ms

**Test Cases**:

```typescript
describe('NetworkSetupService - Collaboration Graph', () => {
  let service: NetworkSetupService;
  let mockMemoryAdapter: Partial<IMemoryAdapter>;
  let mockStore: Partial<Store>;

  beforeEach(() => {
    mockStore = {
      put: jest.fn().mockResolvedValue(undefined),
      list: jest.fn().mockResolvedValue([]),
    };

    mockMemoryAdapter = {
      getStore: jest.fn().mockReturnValue(mockStore),
    };

    service = new NetworkSetupService(
      mockMemoryAdapter as IMemoryAdapter
      // ... other dependencies
    );
  });

  it('should track agent collaboration', async () => {
    const collaboration: AgentCollaboration = {
      agent1Id: 'agent-A',
      agent2Id: 'agent-B',
      successRate: 0.92,
      avgResponseTime: 1200,
      commonTasks: ['data-processing', 'analysis'],
      count: 45,
      errorRate: 0.08,
      qualityScore: 0.88,
    };

    await service.trackAgentCollaboration('network-123', collaboration);

    // Wait for async storage
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockStore.put).toHaveBeenCalledWith(
      ['networks', 'network-123', 'collaborations', 'agent-A', 'agent-B'],
      expect.objectContaining({
        successRate: 0.92,
        avgResponseTime: 1200,
        taskTypes: ['data-processing', 'analysis'],
      })
    );
  });

  it('should calculate collaborator score correctly', () => {
    const collaboration = {
      successRate: 0.9,
      avgResponseTime: 1000,
      metrics: { avgQuality: 0.85 },
    };

    const score = service['calculateCollaboratorScore'](collaboration);

    // Expected: (0.9 * 0.6) + ((1 - 1000/5000) * 0.3) + (0.85 * 0.1)
    // = 0.54 + 0.24 + 0.085 = 0.865
    expect(score).toBeCloseTo(0.865, 2);
  });

  it('should rank collaborators by score', () => {
    const collaborators = [
      {
        key: 'agent-A',
        value: {
          successRate: 0.8,
          avgResponseTime: 2000,
          taskTypes: ['task1'],
          metrics: { avgQuality: 0.75 },
        },
      },
      {
        key: 'agent-B',
        value: {
          successRate: 0.95,
          avgResponseTime: 800,
          taskTypes: ['task1', 'task2'],
          metrics: { avgQuality: 0.9 },
        },
      },
    ];

    const ranked = service['rankCollaborators'](collaborators);

    expect(ranked[0].agentId).toBe('agent-B'); // Higher score
    expect(ranked[1].agentId).toBe('agent-A');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it('should find best collaborator for task type', async () => {
    mockStore.list = jest.fn().mockResolvedValue([
      {
        key: 'agent-X',
        value: {
          successRate: 0.9,
          avgResponseTime: 1000,
          taskTypes: ['data-processing'],
          metrics: { avgQuality: 0.85 },
        },
      },
      {
        key: 'agent-Y',
        value: {
          successRate: 0.88,
          avgResponseTime: 900,
          taskTypes: ['analysis', 'reporting'],
          metrics: { avgQuality: 0.82 },
        },
      },
    ]);

    const bestForProcessing = await service.findBestCollaborator('network-123', 'agent-A', 'data-processing');

    expect(bestForProcessing).toBe('agent-X'); // Has data-processing task
  });

  it('should return all collaborators for agent', async () => {
    mockStore.list = jest.fn().mockResolvedValue([
      { key: 'agent-1', value: { successRate: 0.9, avgResponseTime: 1000, taskTypes: [] } },
      { key: 'agent-2', value: { successRate: 0.85, avgResponseTime: 1200, taskTypes: [] } },
    ]);

    const collaborators = await service.getAgentCollaborators('network-123', 'agent-A');

    expect(collaborators).toHaveLength(2);
    expect(collaborators[0].agentId).toBe('agent-1'); // Higher success rate
  });
});
```

---

## Integration 3.2: User-Agent Affinity Patterns (3 hours)

### Service Details

**Service**: `MultiAgentCoordinatorService`
**File**: `libs/langgraph-modules/multi-agent/src/lib/coordination/multi-agent-coordinator.service.ts`

### Current State (Evidence)

```typescript
// No user preference tracking - agents selected without personalization
async selectAgentForTask(task: TaskDescriptor): Promise<string>
```

### Enhanced Implementation

```typescript
import { IMemoryAdapter, UserMemoryPatterns } from '@hive-academy/langgraph-core';

@Injectable()
export class MultiAgentCoordinatorService {
  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter // ... other dependencies
  ) {}

  /**
   * Select agent with user affinity consideration
   * Phase 2: Personalized agent selection
   */
  async selectAgentForUser(userId: string, task: TaskDescriptor): Promise<string> {
    // 1. Get compatible agents for task
    const compatibleAgents = this.getCompatibleAgents(task);

    if (compatibleAgents.length === 0) {
      throw new Error(`No agents compatible with task type: ${task.type}`);
    }

    // 2. Apply user affinity if memory available
    if (this.memoryAdapter) {
      try {
        const preferredAgent = await this.selectWithUserAffinity(userId, task, compatibleAgents);
        return preferredAgent;
      } catch (error) {
        this.logger.debug('User affinity selection failed:', error);
        // Fallback to first compatible agent
      }
    }

    // 3. Default selection (no personalization)
    return compatibleAgents[0].id;
  }

  /**
   * Select agent using user affinity patterns
   * Phase 2: getUserPatterns for personalization
   */
  private async selectWithUserAffinity(userId: string, task: TaskDescriptor, compatibleAgents: AgentDefinition[]): Promise<string> {
    // Get user's historical agent preferences
    const userPatterns: UserMemoryPatterns = await this.memoryAdapter!.getUserPatterns(userId);

    // Filter by user preference
    const preferredAgents = userPatterns.preferredAgents || [];

    // Find preferred agent that's compatible with task
    const preferredCompatible = compatibleAgents.find((agent) => preferredAgents.includes(agent.id));

    if (preferredCompatible) {
      this.logger.log(`Selected preferred agent ${preferredCompatible.id} for user ${userId}`);
      return preferredCompatible.id;
    }

    // No preference match - select by success rate
    return this.selectBySuccessRate(compatibleAgents, userPatterns);
  }

  /**
   * Select agent by historical success rate for this user
   */
  private selectBySuccessRate(agents: AgentDefinition[], patterns: UserMemoryPatterns): string {
    const successfulWorkflows = patterns.successfulWorkflows || [];

    // Count successful workflows per agent
    const agentSuccess = agents.map((agent) => {
      const successCount = successfulWorkflows.filter((wf) => wf.includes(agent.id)).length;

      return {
        agentId: agent.id,
        successCount,
      };
    });

    // Sort by success count
    agentSuccess.sort((a, b) => b.successCount - a.successCount);

    return agentSuccess[0].agentId;
  }

  /**
   * Get agents compatible with task type
   */
  private getCompatibleAgents(task: TaskDescriptor): AgentDefinition[] {
    return this.registeredAgents.filter((agent) => agent.capabilities.includes(task.type));
  }

  /**
   * Store agent selection outcome for learning
   */
  async recordAgentOutcome(userId: string, agentId: string, task: TaskDescriptor, success: boolean): Promise<void> {
    if (!this.memoryAdapter) return;

    // Non-blocking storage
    this.memoryAdapter
      .store(
        `agent-outcome-${userId}`,
        JSON.stringify({
          agentId,
          taskType: task.type,
          success,
          timestamp: new Date(),
        }),
        {
          namespace: ['agent-outcomes', userId],
          tags: ['outcome', success ? 'success' : 'failure', task.type],
        }
      )
      .catch((error) => {
        this.logger.warn('Failed to store agent outcome:', error);
      });
  }
}
```

### Evidence

- `getUserPatterns` interface: `memory-adapter.interface.ts:184-187`
- `UserMemoryPatterns` type: `memory-adapter.interface.ts:21-32`

### Testing Requirements

**Unit Tests**:

- User affinity selection logic
- Agent selection by success rate
- Compatible agent filtering
- Graceful degradation without memory adapter

**Integration Tests**:

- User patterns retrieval and agent ranking
- Preferred agent prioritization
- Performance: User patterns retrieval <50ms

**Test Cases**:

```typescript
describe('MultiAgentCoordinatorService - User Affinity', () => {
  let service: MultiAgentCoordinatorService;
  let mockMemoryAdapter: Partial<IMemoryAdapter>;

  beforeEach(() => {
    mockMemoryAdapter = {
      getUserPatterns: jest.fn().mockResolvedValue({
        userId: 'user-123',
        preferredAgents: [],
        successfulWorkflows: [],
        commonTopics: [],
        interactionFrequency: {},
        preferredMemoryTypes: [],
        averageSessionLength: 0,
        totalSessions: 0,
      }),
      store: jest.fn().mockResolvedValue('memory-id'),
    };

    // Mock registered agents
    service = new MultiAgentCoordinatorService(
      mockMemoryAdapter as IMemoryAdapter
      // ... other dependencies
    );

    service['registeredAgents'] = [
      { id: 'agent-A', capabilities: ['data-processing', 'analysis'] },
      { id: 'agent-B', capabilities: ['reporting', 'visualization'] },
      { id: 'agent-C', capabilities: ['data-processing', 'reporting'] },
    ];
  });

  it('should select preferred agent when available', async () => {
    mockMemoryAdapter.getUserPatterns = jest.fn().mockResolvedValue({
      userId: 'user-123',
      preferredAgents: ['agent-C', 'agent-A'],
      successfulWorkflows: [],
    });

    const task = { type: 'data-processing' };
    const selectedAgent = await service.selectAgentForUser('user-123', task);

    // agent-C is preferred and compatible with data-processing
    expect(selectedAgent).toBe('agent-C');
  });

  it('should select by success rate when no preferred agent', async () => {
    mockMemoryAdapter.getUserPatterns = jest.fn().mockResolvedValue({
      userId: 'user-123',
      preferredAgents: [],
      successfulWorkflows: ['workflow-1-agent-A-success', 'workflow-2-agent-A-success', 'workflow-3-agent-C-success'],
    });

    const task = { type: 'data-processing' };
    const selectedAgent = await service.selectAgentForUser('user-123', task);

    // agent-A has 2 successful workflows, agent-C has 1
    expect(selectedAgent).toBe('agent-A');
  });

  it('should filter compatible agents by task type', () => {
    const task = { type: 'reporting' };
    const compatible = service['getCompatibleAgents'](task);

    expect(compatible).toHaveLength(2); // agent-B and agent-C
    expect(compatible.map((a) => a.id)).toContain('agent-B');
    expect(compatible.map((a) => a.id)).toContain('agent-C');
  });

  it('should select first compatible agent when no memory adapter', async () => {
    const serviceWithoutMemory = new MultiAgentCoordinatorService(undefined);
    serviceWithoutMemory['registeredAgents'] = [{ id: 'agent-A', capabilities: ['data-processing'] }];

    const task = { type: 'data-processing' };
    const selectedAgent = await serviceWithoutMemory.selectAgentForUser('user-123', task);

    expect(selectedAgent).toBe('agent-A');
  });

  it('should record agent outcome for learning', async () => {
    const task = { type: 'data-processing' };

    await service.recordAgentOutcome('user-123', 'agent-A', task, true);

    // Wait for async storage
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockMemoryAdapter.store).toHaveBeenCalledWith(
      'agent-outcome-user-123',
      expect.stringContaining('agent-A'),
      expect.objectContaining({
        namespace: ['agent-outcomes', 'user-123'],
        tags: ['outcome', 'success', 'data-processing'],
      })
    );
  });

  it('should throw when no compatible agents found', async () => {
    const task = { type: 'unsupported-task-type' };

    await expect(service.selectAgentForUser('user-123', task)).rejects.toThrow('No agents compatible with task type');
  });
});
```

---

## Quality Gates

### Pre-Implementation Checklist

- [ ] Read implementation-plan-overview.md for shared patterns
- [ ] Verify NetworkSetupService current state (line 190, 308)
- [ ] Review getUserPatterns interface in memory-adapter.interface.ts
- [ ] Check MultiAgent module CLAUDE.md for module conventions

### Implementation Checklist

- [ ] NetworkSetupService collaboration graph implemented
- [ ] MultiAgentCoordinatorService user affinity implemented
- [ ] Optional injection pattern used (`@Optional() @Inject('IMemoryAdapter')`)
- [ ] Graceful degradation tested (works without memory adapter)
- [ ] Error handling tested (memory failures don't break agent selection)
- [ ] Async non-blocking pattern used for memory operations
- [ ] Unit tests written (80%+ coverage)
- [ ] Integration tests written (real Store operations)
- [ ] Performance benchmarks met (collaboration queries <100ms, user patterns <50ms)
- [ ] JSDoc comments added (service + method level)
- [ ] Module CLAUDE.md updated with Phase 2 integration section

### Validation Checklist

- [ ] Build passes: `npx nx build @hive-academy/langgraph-multi-agent`
- [ ] Tests pass: `npx nx test @hive-academy/langgraph-multi-agent`
- [ ] Lint passes: `npx nx lint @hive-academy/langgraph-multi-agent`
- [ ] Coverage: 80%+ maintained or improved
- [ ] No architectural violations detected
- [ ] Collaboration ranking algorithm correct

---

**Document Status**: COMPLETE ✅
**Next Module**: implementation-plan-functional-api.md
