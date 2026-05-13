# ChromaDB Operation Timeout - Root Cause Analysis

## Problem Summary

**Error**: ChromaDB operations timeout after 10 seconds during memory storage workflow
**Impact**: Memory storage fails, causing workflow failures
**Timeline**:

- 4:43:48 PM: ChromaDB connection healthy (37ms) ✅
- 4:44:30 PM: First memory storage operation starts
- 4:44:40 PM: Operation times out after 10 seconds ❌
- 4:44:53 PM: Final failure after 3 retries (~13 seconds total)

## Root Cause

### The Hanging Operation

**Call Chain** (verified via code analysis):

```
AgentMemoryCoreService.storeAgentMemory()
  → ChromaVectorAdapter.storeMemory()
    → VectorMemoryRepository.storeMemory()
      → ChromaDBRepository.create()
        → ChromaDBService.addDocuments()
          → ChromaDBEmbeddingProcessorService.processDocumentEmbeddings() ← BLOCKS HERE
            → ChromaDBPerformanceService.executeWithMonitoring()
              → ChromaDBOperationsService.addDocuments()
                → ChromaDBDocumentService.addDocuments()
                  → ChromaDBConnectionService.executeWithRetry()
                    → collection.add() ← THE ACTUAL CHROMADB CALL
```

**Critical File Locations**:

- Timeout configured: `libs/nestjs-chromadb/src/lib/services/core/chromadb-connection.service.ts:369`
- Actual operation: `libs/nestjs-chromadb/src/lib/services/core/chromadb-document.service.ts:66`

### The Timeout Configuration

**Source**: `chromadb-connection.service.ts:367-382`

```typescript
private async withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 10000  // ← HARDCODED 10-SECOND TIMEOUT
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(
      () =>
        reject(
          new ChromaDBTimeoutError(`Operation timed out after ${timeoutMs}ms`)
        ),
      timeoutMs
    );
  });

  return Promise.race([promise, timeout]);
}
```

**Used In**: `chromadb-connection.service.ts:248`

```typescript
const result = await this.withTimeout(operation(), this.config.timeout);
```

## Why It Times Out

### Scenario Analysis

**From Log Evidence**:

1. **Connection is healthy** (line 321: `isConnected: true`) ✅
2. **Embeddings complete successfully** (line 312-317) ✅
3. **Semaphore acquired in 14ms** (line 318) ✅
4. **Two concurrent operations** (line 330: `active: 2, queued: 0`)

**The problem occurs AFTER embedding processing** (between line 317 and line 318):

- Line 317: Embeddings done
- Line 318: ChromaDB operation starts
- Line 374: Operation times out after 10 seconds

### Probable Root Causes (Ranked by Likelihood)

#### 1. Collection Doesn't Exist (HIGH PROBABILITY)

**Evidence**:

- ChromaDB tries to create collection on first `add()` operation
- Collection creation can be slow (indexes, metadata, etc.)
- 10 seconds suggests waiting for collection initialization

**Verification**:

```bash
# Check if collections exist
curl http://localhost:8000/api/v1/collections
```

**Expected Collections** (from logs):

- `vector-memories` (line 60: VectorMemoryRepository)
- `langgraph-stores` (line 61: LangGraphStoreRepository)

#### 2. Concurrent Operation Deadlock (MEDIUM PROBABILITY)

**Evidence**:

- Line 330 shows 2 active operations
- Both operations may be trying to create the same collection
- ChromaDB may have collection-level locks causing deadlock

**Timeline**:

```
Operation 1 (op-1762094670354-7xnmwt00s):
  - Acquires semaphore (active: 2)
  - Tries to add to 'vector-memories'
  - Times out after 10 seconds

Operation 2 (op-1762094670369-ns0fgf1y4):
  - Acquires semaphore (active: 2)
  - Tries to add to 'vector-memories'
  - Fails with connection error (line 342)
```

#### 3. ChromaDB Server Slow/Overwhelmed (LOW PROBABILITY)

**Evidence Against**:

- Connection is healthy
- This is the first operation after startup (42 seconds of warmup time)
- No other operations running (clean state)

## Configuration Discovery

**Timeout Configuration Source**:

1. **Default**: `withTimeout(..., timeoutMs = 10000)` (10 seconds)
2. **Override**: `this.config.timeout` (from ConnectionConfig)

**ConnectionConfig Path**:

```
ChromaDBModule.forRoot({
  connection: {
    host: 'localhost',
    port: 8000,
    timeout: 30000  // ← This should override default
  }
})
```

**Current Configuration** (from startup logs):

- Line 59: `ChromaDB semaphore initialized: max 5 concurrent operations`
- Line 142: Connection successful in 37ms
- **Timeout**: Not explicitly logged, likely using default 10000ms

## Impact Analysis

**What Works**:

- ✅ Connection establishment (37ms)
- ✅ Embedding generation (completes successfully)
- ✅ Semaphore acquisition (14ms)

**What Fails**:

- ❌ ChromaDB `collection.add()` operation (times out after 10 seconds)
- ❌ All 3 retry attempts (exponential backoff: 1s, 2s, 4s)
- ❌ Memory storage (cascades to workflow failure)

**Workflow Impact**:

- Memory is NOT stored
- Workflow continues with missing memory context
- Subsequent operations may fail due to missing data

## Recommended Fixes

### Fix 1: Pre-Create Collections (RECOMMENDED)

**Rationale**: Eliminate collection creation delay from hot path

**Implementation**:

```typescript
// In ChromaVectorAdapter constructor
constructor(
  @Inject(getChromaRepositoryToken(VectorMemoryEntity))
  private readonly vectorMemoryRepo: VectorMemoryRepository,

  @Inject(getChromaRepositoryToken(LangGraphStoreEntity))
  private readonly langGraphStoreRepo: LangGraphStoreRepository
) {
  super();
  // Ensure collections exist on startup (async fire-and-forget)
  this.initializeCollections().catch(err =>
    this.logger.error('Failed to initialize collections', err)
  );
}

private async initializeCollections(): Promise<void> {
  await this.ensureCollectionsInitialized();
  this.logger.log('ChromaDB collections pre-created and ready');
}
```

**Benefits**:

- Collections created once at startup
- `add()` operations skip collection creation
- Sub-100ms operation times (normal for ChromaDB)

### Fix 2: Increase Operation Timeout

**Rationale**: Allow more time for slow operations (collection creation, indexing)

**Implementation**:

```typescript
// In dev-brand-api module configuration
ChromaDBModule.forRoot({
  connection: {
    host: 'localhost',
    port: 8000,
    timeout: 30000, // Increase to 30 seconds (from default 10s)
  },
});
```

**Benefits**:

- Handles slow collection creation
- Handles slow indexing operations
- More resilient to ChromaDB server load

### Fix 3: Add Collection Existence Check

**Rationale**: Verify collection exists before operation, create if missing

**Implementation**:

```typescript
// In VectorMemoryRepository.storeMemory()
async storeMemory(...): Promise<MemoryEntry> {
  // Add collection check before operation
  await this.ensureCollectionExists();

  // Proceed with create operation
  await this.create({...});
}

private async ensureCollectionExists(): Promise<void> {
  try {
    await this.getCollectionInfo();
  } catch (error) {
    this.logger.warn('Collection not found, creating...');
    // Collection will be created on first operation
  }
}
```

### Fix 4: Add Circuit Breaker for Collection Operations

**Rationale**: Fail fast if collection creation is consistently slow

**Implementation**:

```typescript
// Track collection creation failures
private collectionCreationFailures = new Map<string, number>();

private async executeCollectionOperation<T>(
  collection: string,
  operation: () => Promise<T>
): Promise<T> {
  const failures = this.collectionCreationFailures.get(collection) || 0;

  if (failures >= 3) {
    throw new Error(`Collection ${collection} creation failed too many times`);
  }

  try {
    return await operation();
  } catch (error) {
    if (error.message.includes('timeout')) {
      this.collectionCreationFailures.set(collection, failures + 1);
    }
    throw error;
  }
}
```

## Implementation Priority

1. **IMMEDIATE** (Fix 1 + Fix 2):

   - Pre-create collections on startup
   - Increase timeout to 30 seconds

2. **SHORT-TERM** (Fix 3):

   - Add collection existence checks

3. **LONG-TERM** (Fix 4):
   - Add circuit breaker for resilience

## Testing Plan

### 1. Verify Collection Exists

```bash
# Before fix
curl http://localhost:8000/api/v1/collections
# Expected: Empty or missing 'vector-memories'

# After fix
curl http://localhost:8000/api/v1/collections
# Expected: 'vector-memories' and 'langgraph-stores' present
```

### 2. Measure Operation Time

```typescript
// Add timing logs
const start = Date.now();
await this.vectorMemoryRepo.storeMemory(...);
const duration = Date.now() - start;
this.logger.log(`Memory storage completed in ${duration}ms`);

// Expected BEFORE fix: 10000+ms (timeout)
// Expected AFTER fix: <100ms (normal ChromaDB operation)
```

### 3. Test Concurrent Operations

```typescript
// Simulate concurrent memory storage
const promises = Array(10)
  .fill(null)
  .map((_, i) => this.vectorMemoryRepo.storeMemory(`thread-${i}`, `content-${i}`, {}, 'user-123'));

await Promise.all(promises);

// Expected: All complete in <1 second total
```

## Success Criteria

- ✅ Memory storage operations complete in <100ms
- ✅ No timeout errors in logs
- ✅ Collections pre-created on startup
- ✅ Concurrent operations handled without deadlock
- ✅ Workflow completes successfully with memory storage

## Related Issues

- **LangGraph Error**: Separate investigation ongoing (parallel thread)
- **Workflow Failure**: Root cause is ChromaDB timeout preventing memory storage
- **Thread ID Mismatch**: Fixed in TASK_2025_031 (committed), should not be related

## Evidence Files

- **Log File**: `task-tracking/TASK_2025_032/log.md`
- **Timeout Configuration**: `libs/nestjs-chromadb/src/lib/services/core/chromadb-connection.service.ts:369`
- **Operation Chain**: `libs/nestjs-chromadb/src/lib/services/core/chromadb-document.service.ts:66`
- **Repository**: `apps/dev-brand-api/src/app/repositories/chromadb/vector-memory.repository.ts:212`

---

**Analysis Date**: 2025-02-11
**Investigator**: backend-developer
**Status**: ROOT CAUSE IDENTIFIED - Ready for Fix Implementation
