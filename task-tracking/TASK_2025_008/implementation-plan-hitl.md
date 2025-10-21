# Implementation Plan - HITL Module

**Task**: TASK_2025_008
**Module**: HITL (Human-in-the-Loop)
**Effort Estimate**: 7 hours
**Related Files**: See implementation-plan-overview.md for shared patterns

---

## Module Overview

**Target Services**:

- `ApprovalChainService` - Approval chain Store tracking (4 hours)
- `ApprovalProcessingService` - Approval agent execution tracking (3 hours)

**Integration Goals**:

- Store approval chain patterns with hierarchical namespaces
- Track approval coordinator as agent for learning
- Enable approval chain pattern discovery via semantic search

---

## Integration 1.1: Approval Chain Store Tracking (4 hours)

### Service Details

**Service**: `ApprovalChainService`
**File**: `libs/langgraph-modules/hitl/src/lib/services/approval-chain.service.ts`

### Current State (Evidence)

```typescript
// Line 355 (verified): Generic store with no hierarchy
await this.memoryAdapter.store(threadId, JSON.stringify(chainData), metadata);
```

### Enhanced Implementation

```typescript
import { IMemoryAdapter, Store } from '@hive-academy/langgraph-core';
import { STORE_COLLECTIONS } from '@hive-academy/langgraph-memory';

@Injectable()
export class ApprovalChainService {
  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter // ... other dependencies
  ) {}

  /**
   * Complete approval chain and store with hierarchical namespace
   * Phase 2: Store-based chain tracking
   */
  async completeApprovalChain(
    chainId: string,
    executionId: string,
    finalDecision: 'approved' | 'rejected'
  ): Promise<void> {
    // 1. Complete chain in Neo4j (primary storage - blocking)
    await this.chainStorage.updateChainStatus(chainId, 'completed', finalDecision);

    // 2. Store chain pattern in memory (learning - non-blocking)
    if (this.memoryAdapter) {
      this.storeChainPatternAsync(chainId, executionId, finalDecision).catch((error) => {
        this.logger.warn('Failed to store chain pattern:', error);
      });
    }
  }

  /**
   * Store approval chain pattern in Store with hierarchical namespace
   * Non-blocking async operation
   */
  private async storeChainPatternAsync(
    chainId: string,
    executionId: string,
    finalDecision: string
  ): Promise<void> {
    const store: Store = this.memoryAdapter!.getStore(STORE_COLLECTIONS.HITL.CHAINS);

    // Get chain data from Neo4j
    const chainData = await this.chainStorage.getApprovalChain(chainId);

    // Store with hierarchical namespace: [collection, domain, executionId, chainId]
    await store.put(['chains', executionId, chainId], {
      approvers: chainData.approvers,
      decisions: chainData.decisions,
      totalTime: chainData.duration,
      finalDecision,
      riskLevel: chainData.riskLevel,
      timestamp: new Date(),
    });

    this.logger.debug(`Stored approval chain pattern: ${chainId}`);
  }

  /**
   * Query all chains for an execution
   * Phase 2: Hierarchical namespace queries
   */
  async getExecutionChains(executionId: string): Promise<ChainSummary[]> {
    if (!this.memoryAdapter) {
      return []; // Graceful degradation
    }

    const store: Store = this.memoryAdapter.getStore(STORE_COLLECTIONS.HITL.CHAINS);

    try {
      // List all chains for this execution
      const chains = await store.list(['chains', executionId]);

      return chains.map((item) => ({
        chainId: item.key,
        ...item.value,
      }));
    } catch (error) {
      this.logger.warn('Failed to query execution chains:', error);
      return [];
    }
  }

  /**
   * Search related approval chains across executions
   * Phase 2: Semantic search in Store
   */
  async findSimilarChains(
    riskLevel: string,
    query: string,
    limit: number = 10
  ): Promise<ChainSummary[]> {
    if (!this.memoryAdapter) {
      return [];
    }

    const store: Store = this.memoryAdapter.getStore(STORE_COLLECTIONS.HITL.CHAINS);

    try {
      // Search across all chains
      const results = await store.search(
        ['chains'], // Search at domain level
        `${riskLevel} risk ${query}`
      );

      return results.slice(0, limit).map((item) => ({
        chainId: item.key,
        ...item.value,
        similarity: item.score || 0,
      }));
    } catch (error) {
      this.logger.warn('Failed to search similar chains:', error);
      return [];
    }
  }
}
```

### Evidence

- Store interface: `memory-adapter.interface.ts:60-100`
- Pattern verified: Phase 1 HITL `store()` usage
- Service location: `approval-chain.service.ts:355, 487`

### Testing Requirements

**Unit Tests**:

- Store operations with mock IMemoryAdapter
- Graceful degradation when memory adapter unavailable
- Error handling for Store operation failures
- Chain pattern storage and retrieval

**Integration Tests**:

- Real Store with ChromaDB backend
- Store put/get/list operations with hierarchical namespaces
- Semantic search for similar approval chains
- Performance: Store operations <50ms (95th percentile)

**Test Cases**:

```typescript
describe('ApprovalChainService - Store Integration', () => {
  let service: ApprovalChainService;
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

    service = new ApprovalChainService(
      mockMemoryAdapter as IMemoryAdapter
      // ... other dependencies
    );
  });

  it('should store chain pattern with hierarchical namespace', async () => {
    await service.completeApprovalChain('chain-123', 'exec-456', 'approved');

    expect(mockMemoryAdapter.getStore).toHaveBeenCalledWith(STORE_COLLECTIONS.HITL.CHAINS);
    expect(mockStore.put).toHaveBeenCalledWith(
      ['chains', 'exec-456', 'chain-123'],
      expect.objectContaining({
        finalDecision: 'approved',
        riskLevel: expect.any(String),
      })
    );
  });

  it('should list all chains for execution', async () => {
    mockStore.list = jest.fn().mockResolvedValue([
      { key: 'chain-1', value: { finalDecision: 'approved' } },
      { key: 'chain-2', value: { finalDecision: 'rejected' } },
    ]);

    const chains = await service.getExecutionChains('exec-456');

    expect(chains).toHaveLength(2);
    expect(chains[0].chainId).toBe('chain-1');
  });

  it('should search similar chains semantically', async () => {
    mockStore.search = jest.fn().mockResolvedValue([
      { key: 'chain-1', value: { riskLevel: 'high' }, score: 0.95 },
      { key: 'chain-2', value: { riskLevel: 'high' }, score: 0.87 },
    ]);

    const similar = await service.findSimilarChains('high', 'production deployment', 5);

    expect(similar).toHaveLength(2);
    expect(similar[0].similarity).toBe(0.95);
  });

  it('should handle Store failures gracefully', async () => {
    mockStore.put = jest.fn().mockRejectedValue(new Error('Store unavailable'));

    // Should not throw
    await expect(
      service.completeApprovalChain('chain-123', 'exec-456', 'approved')
    ).resolves.not.toThrow();
  });

  it('should work without memory adapter', async () => {
    const serviceWithoutMemory = new ApprovalChainService(undefined);

    const chains = await serviceWithoutMemory.getExecutionChains('exec-456');

    expect(chains).toEqual([]);
  });
});
```

---

## Integration 1.2: Approval Agent Execution Tracking (3 hours)

### Service Details

**Service**: `ApprovalProcessingService`
**File**: `libs/langgraph-modules/hitl/src/lib/services/approval-processing.service.ts`

### Current State (Evidence)

```typescript
// Generic approval processing without agent tracking
async processApprovalRequest(request: HumanApprovalRequest): Promise<string> {
  // ... approval logic
}
```

### Enhanced Implementation

```typescript
import { IMemoryAdapter, AgentState } from '@hive-academy/langgraph-core';

@Injectable()
export class ApprovalProcessingService {
  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter,
    private readonly approverIntelligence: ApproverIntelligenceService // ... other dependencies
  ) {}

  /**
   * Process approval with agent execution tracking
   * Phase 2: Track approval coordinator as agent
   */
  async processApprovalWithTracking(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): Promise<void> {
    // 1. Process approval (blocking)
    await this.processApprovalLogic(request, response);

    // 2. Track as agent execution (non-blocking)
    if (this.memoryAdapter) {
      this.storeApprovalAgentExecution(request, response).catch((error) => {
        this.logger.warn('Failed to store agent execution:', error);
      });
    }
  }

  /**
   * Store approval coordinator agent execution
   * Phase 2: Enhanced storeAgentExecution with metrics
   */
  private async storeApprovalAgentExecution(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): Promise<void> {
    const state: AgentState = {
      messages: [],
      metadata: {
        approvalType: request.riskAssessment?.level || 'unknown',
        executionId: request.executionId,
        nodeId: request.nodeId,
      },
    };

    const result = {
      decision: response.decision,
      success: response.decision === 'approved',
      metrics: {
        responseTime: this.calculateResponseTime(request, response),
        confidenceAlignment: this.calculateConfidenceAlignment(request, response),
        riskAssessmentAccurate: this.assessRiskPredictionAccuracy(request, response),
      },
      approver: response.approvedBy,
      confidence: request.confidence.current,
    };

    await this.memoryAdapter!.storeAgentExecution(state, result, 'approval-coordinator');

    this.logger.debug('Stored approval agent execution');
  }

  /**
   * Calculate response time from request creation to approval
   */
  private calculateResponseTime(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): number {
    return response.approvedAt.getTime() - request.timestamps.requested.getTime();
  }

  /**
   * Calculate confidence alignment (how well confidence predicted approval)
   */
  private calculateConfidenceAlignment(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): number {
    const confidence = request.confidence.current;
    const approved = response.decision === 'approved';

    // High confidence + approved OR low confidence + rejected = high alignment
    return approved
      ? confidence // Approved: confidence is alignment
      : 1 - confidence; // Rejected: (1 - confidence) is alignment
  }

  /**
   * Assess if risk prediction was accurate
   */
  private assessRiskPredictionAccuracy(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): boolean {
    const predictedHighRisk =
      request.riskAssessment?.level === 'high' || request.riskAssessment?.level === 'critical';
    const humanRejected = response.decision === 'rejected';

    // Accurate if: (high risk predicted AND rejected) OR (low risk AND approved)
    return predictedHighRisk === humanRejected;
  }
}
```

### Evidence

- `storeAgentExecution` interface: `memory-adapter.interface.ts:121-125`
- Pattern verified: Multi-agent module usage `node-factory.service.ts:157`

### Testing Requirements

**Unit Tests**:

- Agent execution tracking with metrics
- Metrics calculations accuracy (responseTime, confidenceAlignment, riskAccuracy)
- Graceful degradation without memory adapter
- Error handling for agent execution storage failures

**Integration Tests**:

- Agent context retrieval works with stored executions
- storeAgentExecution integration with real memory adapter
- Performance: Non-blocking storage doesn't impact approval flow

**Test Cases**:

```typescript
describe('ApprovalProcessingService - Agent Tracking', () => {
  let service: ApprovalProcessingService;
  let mockMemoryAdapter: Partial<IMemoryAdapter>;

  beforeEach(() => {
    mockMemoryAdapter = {
      storeAgentExecution: jest.fn().mockResolvedValue(undefined),
    };

    service = new ApprovalProcessingService(
      mockMemoryAdapter as IMemoryAdapter
      // ... other dependencies
    );
  });

  it('should track approval as agent execution', async () => {
    const request: HumanApprovalRequest = {
      executionId: 'exec-123',
      nodeId: 'approval-node',
      confidence: { current: 0.85 },
      riskAssessment: { level: 'high' },
      timestamps: { requested: new Date('2025-01-11T10:00:00Z') },
    };

    const response: HumanApprovalResponse = {
      decision: 'approved',
      approvedBy: 'user-456',
      approvedAt: new Date('2025-01-11T10:05:00Z'),
    };

    await service.processApprovalWithTracking(request, response);

    expect(mockMemoryAdapter.storeAgentExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          approvalType: 'high',
          executionId: 'exec-123',
        }),
      }),
      expect.objectContaining({
        decision: 'approved',
        success: true,
        metrics: expect.objectContaining({
          responseTime: 300000, // 5 minutes
          confidenceAlignment: expect.any(Number),
          riskAssessmentAccurate: expect.any(Boolean),
        }),
      }),
      'approval-coordinator'
    );
  });

  it('should calculate response time correctly', async () => {
    const request = {
      timestamps: { requested: new Date('2025-01-11T10:00:00Z') },
    };
    const response = {
      approvedAt: new Date('2025-01-11T10:03:30Z'),
    };

    const responseTime = service['calculateResponseTime'](request, response);

    expect(responseTime).toBe(210000); // 3.5 minutes = 210 seconds
  });

  it('should calculate confidence alignment for approved decision', async () => {
    const request = { confidence: { current: 0.9 } };
    const response = { decision: 'approved' };

    const alignment = service['calculateConfidenceAlignment'](request, response);

    expect(alignment).toBe(0.9); // High confidence + approved = alignment
  });

  it('should calculate confidence alignment for rejected decision', async () => {
    const request = { confidence: { current: 0.3 } };
    const response = { decision: 'rejected' };

    const alignment = service['calculateConfidenceAlignment'](request, response);

    expect(alignment).toBe(0.7); // Low confidence + rejected = 1 - 0.3 = 0.7 alignment
  });

  it('should assess risk prediction accuracy', async () => {
    const highRiskRequest = { riskAssessment: { level: 'high' } };
    const rejectedResponse = { decision: 'rejected' };

    const accurate = service['assessRiskPredictionAccuracy'](highRiskRequest, rejectedResponse);

    expect(accurate).toBe(true); // High risk predicted AND rejected = accurate
  });

  it('should not block approval flow on agent execution failure', async () => {
    mockMemoryAdapter.storeAgentExecution = jest
      .fn()
      .mockRejectedValue(new Error('Agent execution storage failed'));

    const request = {
      /* ... */
    };
    const response = {
      /* ... */
    };

    // Should not throw
    await expect(service.processApprovalWithTracking(request, response)).resolves.not.toThrow();
  });
});
```

---

## Quality Gates

### Pre-Implementation Checklist

- [ ] Read implementation-plan-overview.md for shared patterns
- [ ] Verify Store interface in memory-adapter.interface.ts
- [ ] Review Phase 1 HITL implementation (approver-intelligence.service.ts)
- [ ] Check HITL module CLAUDE.md for module conventions

### Implementation Checklist

- [ ] ApprovalChainService Store integration implemented
- [ ] ApprovalProcessingService agent tracking implemented
- [ ] Optional injection pattern used (`@Optional() @Inject('IMemoryAdapter')`)
- [ ] Graceful degradation tested (works without memory adapter)
- [ ] Error handling tested (memory failures don't break core functionality)
- [ ] Async non-blocking pattern used for memory operations
- [ ] Unit tests written (80%+ coverage)
- [ ] Integration tests written (real Store operations)
- [ ] Performance benchmarks met (Store <50ms, search <150ms)
- [ ] JSDoc comments added (service + method level)
- [ ] Module CLAUDE.md updated with Phase 2 integration section

### Validation Checklist

- [ ] Build passes: `npx nx build @hive-academy/langgraph-hitl`
- [ ] Tests pass: `npx nx test @hive-academy/langgraph-hitl`
- [ ] Lint passes: `npx nx lint @hive-academy/langgraph-hitl`
- [ ] Coverage: 80%+ maintained or improved
- [ ] No architectural violations detected

---

## Module CLAUDE.md Update Template

**Add to**: `libs/langgraph-modules/hitl/CLAUDE.md`

````markdown
## Phase 2 Memory Integration (TASK_2025_008)

### Store-Based Approval Chain Tracking

The HITL module now uses LangGraph Store for hierarchical namespace-based approval chain storage.

**Collections**:

- `hitl-chains`: Approval chain patterns and relationships

**Usage Example**:

```typescript
import { IMemoryAdapter, Store } from '@hive-academy/langgraph-core';
import { STORE_COLLECTIONS } from '@hive-academy/langgraph-memory';

@Injectable()
export class ApprovalChainService {
  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {}

  async storeChainPattern(chainId: string, executionId: string): Promise<void> {
    if (!this.memoryAdapter) return;

    const store = this.memoryAdapter.getStore(STORE_COLLECTIONS.HITL.CHAINS);

    await store.put(['chains', executionId, chainId], {
      // Chain data
    });
  }
}
```
````

**Evidence**:

- Integration: approval-chain.service.ts:300-400
- Pattern verified: Phase 1 HITL implementation

### Enhanced Methods (Phase 2)

**completeApprovalChain**:

- **New**: Uses Store for chain pattern storage
- **Namespace**: ['chains', executionId, chainId]
- **Performance**: Non-blocking, <50ms
- **Graceful Degradation**: Works without memory adapter

**processApprovalWithTracking**:

- **New**: Tracks approval coordinator as agent
- **Metrics**: responseTime, confidenceAlignment, riskAccuracy
- **Performance**: Non-blocking agent execution storage
- **Graceful Degradation**: Approval processing continues on storage failure

```

---

**Document Status**: COMPLETE ✅
**Next Module**: implementation-plan-workflow-engine.md
```
