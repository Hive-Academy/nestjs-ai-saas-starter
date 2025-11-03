# Phase 1 Implementation Plan: Remove Startup Queries

## Objective

Eliminate ChromaDB queries during application startup (OnModuleInit lifecycle) to prevent race conditions and startup failures. Implement lazy-loading pattern where data is loaded only when workflows execute.

## Root Cause Analysis

**Problem**: Services query ChromaDB during `OnModuleInit` before collections are initialized
**Symptoms**: HTTP 404 "collection not found" errors masked as connection failures
**Impact**: Application startup fails or becomes unstable

**Current Pattern (BROKEN)**:

```typescript
async onModuleInit(): Promise<void> {
  // ❌ Queries ChromaDB before collections ready
  const data = await this.storage.getAllPending();
  await this.restoreState(data);
}
```

**Target Pattern (FIXED)**:

```typescript
async onModuleInit(): Promise<void> {
  // ✅ No storage queries - just mark ready
  this.logger.log('✅ Service initialized (lazy-loading enabled)');
}

async resumeWorkflow(threadId: string) {
  // ✅ Load data on-demand when workflow executes
  const data = await this.storage.getPending({ threadId });
  return this.restoreState(data);
}
```

## Services Requiring Modification

### 1. UserInterruptionService

**File**: `libs/langgraph-modules/hitl/src/lib/services/user-interruption.service.ts`

**Current Implementation** (lines 70-107):

```typescript
async onModuleInit(): Promise<void> {
  await this.recoverActiveInterruptions(); // ❌ STARTUP QUERY
}

private async recoverActiveInterruptions(): Promise<void> {
  const allActiveInterruptions =
    await this.interruptionStorage.getAllActiveInterruptions(); // ❌ QUERY

  allActiveInterruptions.forEach((interruption) => {
    this.interruptionCache.set(interruption.id, interruption);
    if (interruption.status === InterruptionStatus.PENDING) {
      this.setupInterruptionTimeout(interruption.id);
    }
  });
}
```

**Required Changes**:

1. Remove `recoverActiveInterruptions()` call from `onModuleInit()`
2. Create new method `resumeInterruptions(threadId: string)` for lazy loading
3. Update cache-loading logic to filter by threadId
4. Add lazy-loading trigger when workflow resumes

**New Pattern**:

```typescript
async onModuleInit(): Promise<void> {
  this.logger.log('✅ User Interruption Service initialized (lazy-loading enabled)');
}

async resumeInterruptions(threadId: string): Promise<void> {
  const interruptions = await this.interruptionStorage.getByThreadId(threadId);

  interruptions.forEach((interruption) => {
    this.interruptionCache.set(interruption.id, interruption);
    if (interruption.status === InterruptionStatus.PENDING) {
      this.setupInterruptionTimeout(interruption.id);
    }
  });

  this.logger.log(`✅ Loaded ${interruptions.length} interruptions for thread ${threadId}`);
}
```

**Storage Adapter Impact**:

- May need to add `getByThreadId(threadId: string)` method to `IInterruptionStorageAdapter`
- Falls back to `getAllActiveInterruptions()` filtered by threadId if method doesn't exist

---

### 2. ConfidenceEvaluatorService

**File**: `libs/langgraph-modules/hitl/src/lib/services/confidence-evaluator.service.ts`

**Current Implementation** (lines 155-171, 737-771):

```typescript
async onModuleInit(): Promise<void> {
  if (this.confidenceStorage) {
    await this.loadHistoricalPatterns(); // ❌ STARTUP QUERY
  }
}

private async loadHistoricalPatterns(): Promise<void> {
  const allPatterns = await this.confidenceStorage.getAllActivePatterns(); // ❌ QUERY
  allPatterns.forEach((pattern) => {
    this.patternCache.set(pattern.nodeId, pattern);
  });

  const allHistory = await this.confidenceStorage.getAllActiveHistory(); // ❌ QUERY
  Object.entries(allHistory).forEach(([executionId, factors]) => {
    this.historyCache.set(executionId, factors);
  });
}
```

**Required Changes**:

1. Remove `loadHistoricalPatterns()` call from `onModuleInit()`
2. Create `loadPatternsForExecution(executionId: string)` for lazy loading
3. Load historical patterns only when evaluating confidence for specific execution
4. Keep ML model initialization (doesn't query storage)

**New Pattern**:

```typescript
async onModuleInit(): Promise<void> {
  await this.initializeMLHooks(); // ✅ No storage queries
  this.logger.log('✅ Confidence Evaluator Service initialized (lazy-loading enabled)');
}

async loadPatternsForExecution(executionId: string): Promise<void> {
  // Load patterns for specific execution's workflow nodes
  const patterns = await this.confidenceStorage.getPatternsByExecution(executionId);
  patterns.forEach((pattern) => {
    this.patternCache.set(pattern.nodeId, pattern);
  });

  // Load historical confidence factors for this execution
  const history = await this.confidenceStorage.getHistoryByExecution(executionId);
  this.historyCache.set(executionId, history);

  this.logger.log(`✅ Loaded ${patterns.length} patterns for execution ${executionId}`);
}
```

**Storage Adapter Impact**:

- Add `getPatternsByExecution(executionId: string)` method
- Add `getHistoryByExecution(executionId: string)` method
- Patterns/history loaded incrementally as workflows execute

---

### 3. ApprovalChainService

**File**: `libs/langgraph-modules/hitl/src/lib/services/approval-chain.service.ts`

**Current Implementation** (lines 261-300):

```typescript
async onModuleInit(): Promise<void> {
  await this.recoverActiveRequests(); // ❌ STARTUP QUERY
}

private async recoverActiveRequests(): Promise<void> {
  const activeRequests = await this.chainStorage.getAllActiveRequests(); // ❌ QUERY
  activeRequests.forEach((request) => {
    this.requestCache.set(request.id, request);
  });

  const allChains = await this.chainStorage.getAllApprovalChains(); // ❌ QUERY
  Object.entries(allChains).forEach(([chainId, levels]) => {
    this.chainCache.set(chainId, levels);
  });
}
```

**Required Changes**:

1. Remove `recoverActiveRequests()` call from `onModuleInit()`
2. Create `resumeChainForExecution(executionId: string)` for lazy loading
3. Load approval chains and requests only for specific execution
4. Preserve IMemoryAdapter.getStore() usage for hierarchical tracking

**New Pattern**:

```typescript
async onModuleInit(): Promise<void> {
  this.logger.log('✅ Approval Chain Service initialized (lazy-loading enabled)');
}

async resumeChainForExecution(executionId: string): Promise<void> {
  // Load active requests for this execution
  const requests = await this.chainStorage.getRequestsByExecution(executionId);
  requests.forEach((request) => {
    this.requestCache.set(request.id, request);
  });

  // Load approval chain configurations for this execution
  const chains = await this.chainStorage.getChainsByExecution(executionId);
  Object.entries(chains).forEach(([chainId, levels]) => {
    this.chainCache.set(chainId, levels);
  });

  this.logger.log(`✅ Loaded ${requests.length} approval requests for execution ${executionId}`);
}
```

**Storage Adapter Impact**:

- Add `getRequestsByExecution(executionId: string)` method
- Add `getChainsByExecution(executionId: string)` method

---

### 4. FeedbackProcessorService

**File**: `libs/langgraph-modules/hitl/src/lib/services/feedback-processor.service.ts`

**Current Implementation** (lines 42-112):

```typescript
async onModuleInit(): Promise<void> {
  await this.recoverActiveFeedback(); // ❌ STARTUP QUERY
  await this.startFeedbackProcessingPipeline(); // ❌ STARTUP QUERY
}

private async recoverActiveFeedback(): Promise<void> {
  const activeFeedback = await this.feedbackStorage.getAllActiveFeedback(); // ❌ QUERY
  activeFeedback.forEach((feedback) => {
    this.feedbackCache.set(feedback.id, feedback);
  });

  const executionFeedback =
    await this.feedbackStorage.getAllExecutionFeedback(); // ❌ QUERY
  Object.entries(executionFeedback).forEach(([executionId, feedbackList]) => {
    this.executionCache.set(executionId, feedbackList);
  });
}

private async startFeedbackProcessingPipeline(): Promise<void> {
  const unprocessed = await this.feedbackStorage.getUnprocessedFeedback(); // ❌ QUERY
}
```

**Required Changes**:

1. Remove both `recoverActiveFeedback()` and `startFeedbackProcessingPipeline()` from `onModuleInit()`
2. Create `loadFeedbackForExecution(executionId: string)` for lazy loading
3. Process feedback only when workflows request it
4. Keep feedback processing logic but defer execution

**New Pattern**:

```typescript
async onModuleInit(): Promise<void> {
  this.logger.log('✅ Feedback Processor Service initialized (lazy-loading enabled)');
}

async loadFeedbackForExecution(executionId: string): Promise<void> {
  // Load active feedback for this execution
  const feedback = await this.feedbackStorage.getFeedbackByExecution(executionId);
  feedback.forEach((fb) => {
    this.feedbackCache.set(fb.id, fb);
  });

  this.executionCache.set(executionId, feedback);

  // Process unprocessed feedback for this execution
  const unprocessed = feedback.filter(fb => !fb.processed);
  if (unprocessed.length > 0) {
    await this.processFeedbackBatch(unprocessed);
  }

  this.logger.log(`✅ Loaded ${feedback.length} feedback entries for execution ${executionId}`);
}
```

**Storage Adapter Impact**:

- Add `getFeedbackByExecution(executionId: string)` method
- Filter feedback by execution context

---

### 5. HitlRecoveryService

**File**: `libs/langgraph-modules/hitl/src/lib/services/hitl-recovery.service.ts`

**Current Implementation** (lines 31-91):

```typescript
async recoverPendingApprovals(): Promise<void> {
  const pendingApprovals = await this.hitlStorage.getAllPending(); // ❌ QUERY

  for (const approval of pendingApprovals) {
    if (this.isValidForRecovery(approval)) {
      this.recoveryCache.set(approval.id, approval);
    }
  }
}
```

**Required Changes**:

1. Make `recoverPendingApprovals()` accept optional `executionId` parameter
2. Don't call this method during startup (called by other services' OnModuleInit)
3. Load approvals only when specific workflow resumes
4. Update `recoverServiceState()` to be execution-scoped

**New Pattern**:

```typescript
async recoverPendingApprovals(executionId?: string): Promise<void> {
  try {
    let pendingApprovals: HumanApprovalRequest[];

    if (executionId) {
      // ✅ Load only for specific execution
      pendingApprovals = await this.hitlStorage.getPendingByExecution(executionId);
      this.logger.log(
        `🔄 Loading ${pendingApprovals.length} pending approvals for execution ${executionId}`
      );
    } else {
      // ✅ Called explicitly by admin/recovery tools (not startup)
      pendingApprovals = await this.hitlStorage.getAllPending();
      this.logger.log(
        `🔄 Loading ${pendingApprovals.length} pending approvals (all executions)`
      );
    }

    for (const approval of pendingApprovals) {
      if (this.isValidForRecovery(approval)) {
        this.recoveryCache.set(approval.id, approval);
      }
    }

    this.lastRecoveryTime = new Date();
  } catch (error) {
    this.logger.error(`❌ Failed to recover pending approvals: ${error}`);
    throw new Error(`Recovery failed: ${error}`);
  }
}
```

**Storage Adapter Impact**:

- Add `getPendingByExecution(executionId: string)` method
- Keep `getAllPending()` for admin/recovery tools (not called at startup)

---

## Storage Adapter Interface Updates

### New Methods Required

Add these methods to storage adapter interfaces to support execution-scoped lazy loading:

```typescript
// IInterruptionStorageAdapter
getByThreadId(threadId: string): Promise<InterruptionRequest[]>;

// IConfidenceStorageAdapter
getPatternsByExecution(executionId: string): Promise<ConfidencePattern[]>;
getHistoryByExecution(executionId: string): Promise<ConfidenceFactor[]>;

// IApprovalChainStorageAdapter
getRequestsByExecution(executionId: string): Promise<ApprovalRequest[]>;
getChainsByExecution(executionId: string): Promise<Record<string, ApprovalLevel[]>>;

// IFeedbackStorageAdapter
getFeedbackByExecution(executionId: string): Promise<FeedbackEntry[]>;

// IHitlStorageAdapter
getPendingByExecution(executionId: string): Promise<HumanApprovalRequest[]>;
```

### Backward Compatibility

- Keep existing `getAll*()` methods for admin/recovery tools
- New execution-scoped methods provide filtered results
- No breaking changes to existing storage adapter implementations
- Adapters can implement new methods incrementally

---

## Testing Strategy

### 1. Unit Tests

**For Each Modified Service**:

```typescript
describe('UserInterruptionService - Lazy Loading', () => {
  it('should initialize without storage queries', async () => {
    const storageSpy = jest.spyOn(interruptionStorage, 'getAllActiveInterruptions');

    await service.onModuleInit();

    expect(storageSpy).not.toHaveBeenCalled();
  });

  it('should load interruptions when workflow resumes', async () => {
    const threadId = 'thread-123';
    const mockInterruptions = [
      /* mock data */
    ];

    jest.spyOn(interruptionStorage, 'getByThreadId').mockResolvedValue(mockInterruptions);

    await service.resumeInterruptions(threadId);

    expect(interruptionStorage.getByThreadId).toHaveBeenCalledWith(threadId);
    expect(service.interruptionCache.size).toBe(mockInterruptions.length);
  });
});
```

### 2. Integration Tests

**Startup Without Errors**:

```typescript
describe('Application Startup', () => {
  it('should start without ChromaDB queries', async () => {
    const app = await NestFactory.create(AppModule);

    // Monitor ChromaDB connection logs
    const chromaLogs = await captureChromaDBLogs();

    await app.init();

    expect(chromaLogs).not.toContain('collection not found');
    expect(chromaLogs).not.toContain('connection error');

    await app.close();
  });
});
```

**Lazy Loading During Workflow**:

```typescript
describe('Workflow Resume', () => {
  it('should lazy-load state when workflow resumes', async () => {
    const threadId = 'thread-123';
    const executionId = 'exec-456';

    // Start workflow
    const workflow = await workflowEngine.resume(threadId, executionId);

    // Verify lazy loading occurred
    expect(userInterruptionService.interruptionCache.size).toBeGreaterThan(0);
    expect(approvalChainService.requestCache.size).toBeGreaterThan(0);

    // Verify workflow executes successfully
    const result = await workflow.execute();
    expect(result.status).toBe('success');
  });
});
```

### 3. End-to-End Tests

**Full Workflow Execution**:

```bash
# 1. Start application
npm run dev:api

# 2. Verify no ChromaDB errors in logs
grep "collection not found" logs/app.log
# Expected: No matches

# 3. Execute workflow
curl -X POST http://localhost:3000/api/workflows/resume \
  -H "Content-Type: application/json" \
  -d '{"threadId": "thread-123", "executionId": "exec-456"}'

# 4. Verify lazy loading occurred
grep "Loaded.*interruptions for thread" logs/app.log
grep "Loaded.*patterns for execution" logs/app.log

# 5. Verify workflow completed successfully
curl http://localhost:3000/api/workflows/exec-456/status
# Expected: {"status": "completed"}
```

---

## Implementation Checklist

### Phase 1.1: Service Modifications

- [ ] Modify UserInterruptionService
  - [ ] Remove `recoverActiveInterruptions()` from `onModuleInit()`
  - [ ] Create `resumeInterruptions(threadId: string)` method
  - [ ] Update tests
- [ ] Modify ConfidenceEvaluatorService
  - [ ] Remove `loadHistoricalPatterns()` from `onModuleInit()`
  - [ ] Create `loadPatternsForExecution(executionId: string)` method
  - [ ] Update tests
- [ ] Modify ApprovalChainService
  - [ ] Remove `recoverActiveRequests()` from `onModuleInit()`
  - [ ] Create `resumeChainForExecution(executionId: string)` method
  - [ ] Update tests
- [ ] Modify FeedbackProcessorService
  - [ ] Remove `recoverActiveFeedback()` and `startFeedbackProcessingPipeline()` from `onModuleInit()`
  - [ ] Create `loadFeedbackForExecution(executionId: string)` method
  - [ ] Update tests
- [ ] Modify HitlRecoveryService
  - [ ] Add optional `executionId` parameter to `recoverPendingApprovals()`
  - [ ] Update `recoverServiceState()` to be execution-scoped
  - [ ] Update tests

### Phase 1.2: Storage Adapter Updates

- [ ] Add new methods to storage adapter interfaces
  - [ ] `IInterruptionStorageAdapter.getByThreadId()`
  - [ ] `IConfidenceStorageAdapter.getPatternsByExecution()`
  - [ ] `IConfidenceStorageAdapter.getHistoryByExecution()`
  - [ ] `IApprovalChainStorageAdapter.getRequestsByExecution()`
  - [ ] `IApprovalChainStorageAdapter.getChainsByExecution()`
  - [ ] `IFeedbackStorageAdapter.getFeedbackByExecution()`
  - [ ] `IHitlStorageAdapter.getPendingByExecution()`
- [ ] Implement new methods in ChromaDB adapter implementations

### Phase 1.3: Workflow Integration

- [ ] Update workflow engine to trigger lazy loading
  - [ ] Call service lazy-load methods when workflow resumes
  - [ ] Pass threadId/executionId to services
  - [ ] Handle lazy-load failures gracefully
- [ ] Add workflow lifecycle hooks
  - [ ] `onWorkflowResume(threadId, executionId)` - trigger lazy loading
  - [ ] `onWorkflowComplete(executionId)` - optional cache cleanup

### Phase 1.4: Testing & Validation

- [ ] Run unit tests for all modified services
- [ ] Run integration tests for startup behavior
- [ ] Run end-to-end tests for workflow execution
- [ ] Verify no ChromaDB errors during startup
- [ ] Verify lazy loading works during workflow resume
- [ ] Performance testing (measure lazy-load impact)

### Phase 1.5: Documentation

- [ ] Update service documentation with lazy-loading behavior
- [ ] Document new storage adapter methods
- [ ] Create migration guide for existing workflows
- [ ] Update CLAUDE.md with new patterns

---

## Success Criteria

### ✅ Phase 1 Complete When:

1. **No Startup Queries**: Application starts without ANY ChromaDB queries in OnModuleInit
2. **No Startup Errors**: Zero "collection not found" or connection errors in logs
3. **Lazy Loading Works**: Services load state when workflows execute, not at startup
4. **Tests Pass**: 100% of unit/integration/e2e tests passing
5. **Performance Acceptable**: Lazy loading adds <100ms to workflow resume time
6. **Backward Compatible**: Existing workflows continue working without changes

### Metrics to Track:

- **Startup Time**: Should remain constant or improve (no preloading overhead)
- **Workflow Resume Time**: May increase slightly (<100ms) due to lazy loading
- **Memory Usage**: Should decrease (no preloading all state at startup)
- **Error Rate**: Zero ChromaDB errors during startup phase
- **Cache Hit Rate**: Measure effectiveness of execution-scoped caching

---

## Rollback Plan

If Phase 1 implementation causes issues:

1. **Revert Service Changes**: Restore OnModuleInit queries
2. **Keep Storage Adapter Methods**: New execution-scoped methods provide value
3. **Investigate Failure**: Analyze logs to identify root cause
4. **Incremental Rollout**: Apply changes to one service at a time instead of all five

**Rollback Safety**: All changes are backward compatible - old methods still work

---

## Next Steps (Post-Phase 1)

After Phase 1 is complete and validated:

1. **Phase 2**: Audit existing memory/RAG implementation
2. **Phase 3**: Create agent-driven memory tools (RAG as capability, not dependency)
3. **Phase 4**: Implement lazy thread memory injection
4. **Phase 5**: Performance optimization and monitoring

---

## References

- **Root Cause Analysis**: See `log.md` lines 146-740 for startup error examples
- **Previous Fix Attempts**: See `CHROMADB_AUTO_INIT_IMPLEMENTATION_COMPLETE.md`
- **Service Files**:
  - `libs/langgraph-modules/hitl/src/lib/services/user-interruption.service.ts`
  - `libs/langgraph-modules/hitl/src/lib/services/confidence-evaluator.service.ts`
  - `libs/langgraph-modules/hitl/src/lib/services/approval-chain.service.ts`
  - `libs/langgraph-modules/hitl/src/lib/services/feedback-processor.service.ts`
  - `libs/langgraph-modules/hitl/src/lib/services/hitl-recovery.service.ts`
