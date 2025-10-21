# Requirements Document - TASK_2025_005

## Introduction

### Business Context

The memory library (`@hive-academy/langgraph-memory`) currently contains hardcoded business logic that bypasses the adapter pattern, creating architectural violations and data inconsistencies. This refactoring establishes a clean separation of concerns where the library acts as a pure orchestrator, delegating all database operations to application-provided adapters while maintaining sophisticated agent memory features through proper integration.

### Strategic Value Proposition

**Current State Issues:**

- Memory library writes directly to databases using hardcoded schemas
- Creates parallel data stores (library vs. application collections)
- 555 lines of sophisticated agent memory logic (AgentMemoryBridgeService) completely unused
- Adapter pattern invalidated by library business logic bypass
- Multi-agent, HITL, workflow-engine modules cannot benefit from agent isolation features

**Target State Benefits:**

- Single source of truth for memory data (application-controlled)
- Library becomes pure orchestrator (delegates all operations)
- AgentMemoryBridgeService integrated with IMemoryAdapter flow
- Agent isolation, checkpoint sync, and per-agent statistics functional
- All consuming modules (multi-agent, HITL, workflow-engine) get enhanced functionality

### Business Impact

- **Data Integrity**: Eliminates parallel data stores and schema conflicts
- **Maintainability**: Clear separation of concerns (library orchestrates, adapters execute)
- **Extensibility**: AgentMemoryBridgeService provides agent isolation without breaking existing API
- **Performance**: Batch operations and checkpoint synchronization improve efficiency
- **Developer Experience**: Clear architectural boundaries and reusable agent memory patterns

---

## Requirements

### Requirement 1: Remove Library Business Logic

**User Story:** As a library consumer, I want the memory library to delegate ALL database operations to my adapters, so that I have full control over data schemas and storage implementations.

#### Acceptance Criteria

1. WHEN MemoryGraphService.trackMemory() is called THEN it SHALL delegate to IGraphService adapter methods WITHOUT writing hardcoded Cypher queries
2. WHEN MemoryStorageService.store() is called THEN it SHALL delegate to IVectorService adapter methods WITHOUT using hardcoded collection names
3. WHEN library services execute ANY database operation THEN they SHALL NOT bypass the adapter layer with direct queries
4. WHEN getVectorStats() or getGraphStats() is called THEN statistics SHALL be retrieved from adapter implementations ONLY
5. WHEN buildSemanticRelationships() is called THEN relationship logic SHALL be delegated to graph adapter WITHOUT hardcoded label queries

**Technical Specifications:**

- Delete hardcoded Cypher queries in MemoryGraphService (lines 42-59, 216-228, 394-402)
- Remove generic collection name fallbacks (`this.config.collection || 'memory_store'`)
- Eliminate config.collection usage entirely (collections controlled by entity decorators)
- Keep only pure delegation methods in MemoryStorageService and MemoryGraphService
- Remove methods: trackMemory, trackMemoriesBatch, removeMemories, buildSemanticRelationships, getGraphStats (MemoryGraphService)
- Remove methods: getVectorStats, getOperationMetrics (MemoryStorageService)

**Validation:**

```bash
# Verify no hardcoded Cypher
grep -r "MERGE (m:Memory" libs/langgraph-modules/memory/src/
# Expected: No results

# Verify no generic collections
grep -r "memory_store" libs/langgraph-modules/memory/src/
# Expected: No results in service implementations

# Verify no config.collection usage
grep -r "this.config.collection" libs/langgraph-modules/memory/src/
# Expected: No results
```

---

### Requirement 2: Refactor AgentMemoryBridgeService

**User Story:** As a memory library maintainer, I want AgentMemoryBridgeService to call adapters directly instead of broken MemoryService, so that agent-specific functionality works with correct data stores.

#### Acceptance Criteria

1. WHEN AgentMemoryBridgeService constructor is called THEN it SHALL accept IVectorService and IGraphService adapters directly WITHOUT MemoryService dependency
2. WHEN getAgentMemoryContext() is called THEN it SHALL call vectorService.searchAgentMemories() WITHOUT delegating to MemoryService.searchForContext()
3. WHEN storeAgentMemory() is called THEN it SHALL call vectorService.storeAgentMemory() WITHOUT delegating to MemoryService.store()
4. WHEN storeAgentMemoriesBatch() is called THEN it SHALL call vectorService methods directly WITHOUT delegating to MemoryService.storeBatch()
5. WHEN syncWithCheckpoint() is called THEN checkpoint coordination SHALL work independently of MemoryService

**Technical Specifications:**

```typescript
// OLD (BROKEN):
constructor(
  private readonly memoryService: MemoryService, // ❌ Remove
  @Optional() @Inject('ICheckpointAdapter')
  private readonly checkpointAdapter?: ICheckpointAdapter
) {}

// NEW (CORRECT):
constructor(
  @Inject('IVectorService')
  private readonly vectorService: IVectorService, // ✅ Direct adapter
  @Inject('IGraphService')
  private readonly graphService: IGraphService,   // ✅ Direct adapter
  @Optional() @Inject('ICheckpointAdapter')
  private readonly checkpointAdapter?: ICheckpointAdapter
) {}
```

**Method Updates:**

- getAgentMemoryContext: Call vectorService.searchAgentMemories() directly
- storeAgentMemory: Call vectorService.storeAgentMemory() directly
- storeAgentMemoriesBatch: Call vectorService batch methods directly
- getAgentMemoryStats: Calculate from adapter data, not MemoryService
- All 15+ methods must be refactored to use adapters directly

**Validation:**

```bash
# Verify no MemoryService dependency
grep "MemoryService" libs/langgraph-modules/memory/src/lib/services/agent-memory-bridge.service.ts
# Expected: No MemoryService imports or usages

# Verify adapter usage
grep "vectorService\." libs/langgraph-modules/memory/src/lib/services/agent-memory-bridge.service.ts | wc -l
# Expected: 10+ direct adapter calls
```

---

### Requirement 3: Integrate AgentMemoryBridgeService with IMemoryAdapter

**User Story:** As a multi-agent module developer, I want IMemoryAdapter to provide agent isolation features automatically, so that each agent gets its own memory namespace without manual configuration.

#### Acceptance Criteria

1. WHEN MemoryModule provides IMemoryAdapter token THEN it SHALL use AgentMemoryBridgeService implementation (Option A) OR MemoryManagerAdapter with AgentMemoryBridgeService integration (Option B)
2. WHEN MultiAgentModule injects IMemoryAdapter THEN agent memory isolation SHALL work automatically with namespace-based storage
3. WHEN HITL module injects IMemoryAdapter THEN approval learning SHALL store agent-specific patterns correctly
4. WHEN WorkflowEngine injects IMemoryAdapter THEN workflow memory SHALL benefit from agent isolation and checkpoint sync
5. WHEN any module calls IMemoryAdapter.getAgentContext() THEN AgentMemoryBridgeService features SHALL be available (statistics, batch ops, checkpoint sync)

**Integration Pattern (Option A - Recommended):**

```typescript
// memory.module.ts
providers.push({
  provide: 'IMemoryAdapter',
  useFactory: (
    vectorAdapter: IVectorService,
    graphAdapter: IGraphService,
    checkpointAdapter: ICheckpointAdapter
  ) => {
    return new AgentMemoryBridgeService(vectorAdapter, graphAdapter, checkpointAdapter); // ✅ Direct usage as IMemoryAdapter
  },
  inject: ['IVectorService', 'IGraphService', 'ICheckpointAdapter'],
});
```

**Integration Pattern (Option B - Alternative):**

```typescript
export class MemoryManagerAdapter extends IMemoryAdapter {
  private readonly agentBridge: AgentMemoryBridgeService;

  constructor(
    vectorService: IVectorService,
    graphService: IGraphService,
    checkpointAdapter: ICheckpointAdapter
  ) {
    this.agentBridge = new AgentMemoryBridgeService(
      vectorService,
      graphService,
      checkpointAdapter
    );
  }

  // Delegate all methods to agentBridge
  async getAgentContext(state: AgentState) {
    return this.agentBridge.getAgentMemoryContext(...);
  }
}
```

**Validation:**

```bash
# Verify IMemoryAdapter uses AgentMemoryBridgeService
grep -A 10 "provide: 'IMemoryAdapter'" libs/langgraph-modules/memory/src/lib/memory.module.ts
# Expected: AgentMemoryBridgeService in factory

# Test agent isolation
npm test -- --testPathPattern=agent-memory-bridge.service.spec.ts
# Expected: All tests pass with namespace isolation
```

---

### Requirement 4: Register and Export AgentMemoryBridgeService

**User Story:** As a library consumer, I want AgentMemoryBridgeService to be properly registered and exported, so that I can access agent memory features when needed.

#### Acceptance Criteria

1. WHEN MemoryModule is imported THEN AgentMemoryBridgeService SHALL be registered in providers array
2. WHEN consuming application imports from @hive-academy/langgraph-memory THEN AgentMemoryBridgeService SHALL be exported from index.ts
3. WHEN IMemoryAdapter is injected THEN AgentMemoryBridgeService SHALL be available through DI container
4. WHEN consuming modules use IMemoryAdapter THEN all AgentMemoryBridgeService features SHALL be accessible
5. WHEN documentation is consulted THEN AgentMemoryBridgeService SHALL be documented in CLAUDE.md with usage examples

**Registration:**

```typescript
// memory.module.ts
const providers: Provider[] = [
  MEMORY_CONFIG,
  ...adapterProviders,
  MemoryStorageService,
  MemoryGraphService,
  MemoryService,
  AgentMemoryBridgeService, // ✅ Add to providers
];

const exports = [
  MemoryService,
  AgentMemoryBridgeService, // ✅ Add to exports
  'IMemoryAdapter',
];
```

**Export:**

```typescript
// index.ts
export { AgentMemoryBridgeService } from './lib/services/agent-memory-bridge.service';
export { IAgentMemoryBridge } from './lib/interfaces/agent-memory.interface';
```

**Validation:**

```bash
# Verify registration
grep "AgentMemoryBridgeService" libs/langgraph-modules/memory/src/lib/memory.module.ts
# Expected: Found in providers and exports arrays

# Verify export
grep "AgentMemoryBridgeService" libs/langgraph-modules/memory/src/index.ts
# Expected: Export statement present
```

---

### Requirement 5: Single Data Store Verification

**User Story:** As a platform operator, I want to verify that memory operations write to a single data store per database, so that data integrity is guaranteed and parallel stores are eliminated.

#### Acceptance Criteria

1. WHEN application stores agent memory THEN ChromaDB SHALL contain ONLY 'vector-memories' collection (NOT 'memory_store' or 'memory')
2. WHEN library operations execute THEN Neo4j SHALL contain ONLY application Memory entity schema (NOT generic Memory nodes with hardcoded labels)
3. WHEN memories are retrieved THEN data SHALL come from application-controlled collections ONLY
4. WHEN graph relationships are queried THEN results SHALL use application entity schemas ONLY
5. WHEN vector statistics are checked THEN metrics SHALL reflect single collection usage ONLY

**Testing Verification:**

```typescript
// Integration test
it('should write to single vector collection', async () => {
  await memoryService.store('thread-1', 'test content');

  const collections = await chromaClient.listCollections();
  expect(collections).toContain('vector-memories');
  expect(collections).not.toContain('memory_store');
  expect(collections).not.toContain('memory');
});

it('should use application entity schema only', async () => {
  await memoryService.store('thread-1', 'test content');

  const result = await neo4jSession.run('MATCH (m:Memory) RETURN m.memoryType, m.agentId');
  expect(result.records[0].get('memoryType')).toBeDefined(); // Application schema
  expect(result.records[0].get('agentId')).toBeDefined(); // Application schema
});
```

**Validation:**

```bash
# Check ChromaDB collections
curl http://localhost:8000/api/v1/collections | jq '.[] | .name'
# Expected: Only 'vector-memories' (no 'memory_store', no 'memory')

# Check Neo4j schema
echo "MATCH (m:Memory) RETURN labels(m), keys(m) LIMIT 1" | cypher-shell
# Expected: Application Memory entity properties (memoryType, agentId, sessionId)
```

---

## Non-Functional Requirements

### Performance Requirements

- **Memory Retrieval**: 95% of memory retrieval operations under 100ms, 99% under 200ms
- **Batch Storage**: Handle batch storage of 100 memories in under 500ms
- **Search Latency**: Vector similarity search under 150ms for 95% of queries
- **Agent Context**: Agent context retrieval (multi-scope) under 200ms for 95% of operations
- **Resource Usage**: Memory service CPU usage < 10%, memory usage < 200MB during normal operations

**Measurement Strategy:**

```typescript
// Add performance tracking
const startTime = Date.now();
const result = await agentMemoryBridge.getAgentMemoryContext(...);
const duration = Date.now() - startTime;
logger.debug(`Agent context retrieval: ${duration}ms`);
```

### Reliability Requirements

- **Uptime**: Memory service 99.9% availability
- **Error Handling**: Graceful degradation when adapters fail (return empty context, log warnings)
- **Recovery Time**: Automatic recovery from adapter failures within 30 seconds
- **Data Integrity**: Zero data loss during adapter refactoring (verified through integration tests)
- **Backward Compatibility**: Existing IMemoryAdapter consumers continue to work WITHOUT code changes

**Error Handling Example:**

```typescript
async getAgentMemoryContext(...): Promise<AgentMemoryContext> {
  try {
    return await this.vectorService.searchAgentMemories(...);
  } catch (error) {
    logger.warn('Agent memory retrieval failed, using empty context', error);
    return { threadMemories: [], userMemories: [], agentMemories: [], ... };
  }
}
```

### Maintainability Requirements

- **Code Quality**: ESLint score 10/10, zero TypeScript `any` types
- **Test Coverage**: 80% minimum coverage for refactored services
- **Documentation**: CLAUDE.md updated with new architecture and usage examples
- **API Stability**: IMemoryAdapter interface remains unchanged (implementation enhancement only)
- **Type Safety**: All adapter calls use proper TypeScript interfaces (IVectorService, IGraphService)

**Quality Gates:**

```bash
npm run lint -- --fix
npm run test -- --coverage
# Expected: Zero lint errors, 80%+ coverage
```

### Scalability Requirements

- **Agent Isolation**: Support 100+ concurrent agents with isolated memory namespaces
- **Batch Operations**: Handle batch storage of 1000 memories without performance degradation
- **Checkpoint Sync**: Support 50+ concurrent checkpoint synchronization operations
- **Memory Growth**: Handle 10,000+ memories per thread with efficient cleanup policies
- **Cross-Thread Patterns**: Analyze patterns across 1000+ threads without timeout

---

## Stakeholder Analysis

### Primary Stakeholders

**Library Consumers (Development Teams)**

- **Needs**: Clean adapter pattern, predictable data flows, comprehensive features
- **Pain Points**: Currently fighting parallel data stores, cannot access agent isolation features
- **Success Criteria**: Single data store, all operations delegated to adapters, AgentMemoryBridgeService accessible
- **Impact Level**: HIGH - Direct code changes required in consuming applications

**Multi-Agent Module Maintainers**

- **Needs**: Automatic agent memory isolation, per-agent statistics, batch operations
- **Pain Points**: Currently implementing manual agent isolation, missing checkpoint sync
- **Success Criteria**: IMemoryAdapter provides agent isolation automatically, zero manual namespace management
- **Impact Level**: HIGH - Gains 555 lines of functionality without code changes

**HITL Module Maintainers**

- **Needs**: Learn from approval patterns, store agent-specific feedback, analyze decision history
- **Pain Points**: Currently storing generic feedback, cannot track agent-specific learning
- **Success Criteria**: Approval learning automatically benefits from agent isolation
- **Impact Level**: MEDIUM - Enhanced learning capabilities without breaking changes

### Secondary Stakeholders

**Workflow-Engine Module Maintainers**

- **Needs**: Memory-aware workflow optimization, checkpoint coordination
- **Pain Points**: Optional memory integration lacks sophisticated features
- **Success Criteria**: Workflows automatically get agent context with checkpoint sync
- **Impact Level**: MEDIUM - Enhanced optimization capabilities

**Platform Operations Team**

- **Needs**: Single data store for monitoring, clear data flows, performance metrics
- **Pain Points**: Currently monitoring multiple parallel data stores, unclear data flows
- **Success Criteria**: Single ChromaDB collection, single Neo4j schema, clear metrics
- **Impact Level**: MEDIUM - Simplified monitoring and operations

**Security/Compliance Team**

- **Needs**: Data integrity guarantees, audit trails, clear ownership boundaries
- **Pain Points**: Parallel data stores create compliance risks, unclear data ownership
- **Success Criteria**: Single source of truth, clear adapter boundaries, audit-ready architecture
- **Impact Level**: LOW - Compliance risk reduction

### Stakeholder Impact Matrix

| Stakeholder         | Impact Level | Involvement            | Success Criteria                      |
| ------------------- | ------------ | ---------------------- | ------------------------------------- |
| Library Consumers   | High         | Implementation/Testing | Single data store, adapter delegation |
| Multi-Agent Module  | High         | Testing/Validation     | Agent isolation automatic             |
| HITL Module         | Medium       | Testing                | Learning patterns enhanced            |
| Workflow-Engine     | Medium       | Validation             | Checkpoint sync working               |
| Operations          | Medium       | Monitoring             | Single data store verified            |
| Security/Compliance | Low          | Audit Review           | Data integrity guaranteed             |

---

## Risk Analysis Framework

### Technical Risks

**Risk 1: Breaking Changes to IMemoryAdapter Interface**

- **Probability**: LOW
- **Impact**: CRITICAL
- **Mitigation**: Keep IMemoryAdapter interface unchanged, enhance implementation only
- **Contingency**: If interface changes needed, provide compatibility wrapper with deprecation warnings
- **Validation**: Run all consuming module tests before merging

**Risk 2: AgentMemoryBridgeService Refactoring Introduces Bugs**

- **Probability**: MEDIUM
- **Impact**: HIGH
- **Mitigation**: Comprehensive unit tests for all 15+ methods, integration tests with real adapters
- **Contingency**: Feature flag to disable AgentMemoryBridgeService, fallback to MemoryManagerAdapter
- **Validation**: Test suite with 80%+ coverage, manual testing with multi-agent scenarios

**Risk 3: Performance Degradation from Adapter Delegation**

- **Probability**: LOW
- **Impact**: MEDIUM
- **Mitigation**: Benchmark adapter calls before/after refactor, add performance monitoring
- **Contingency**: Implement caching layer in AgentMemoryBridgeService if needed
- **Validation**: Load testing with 100+ concurrent agent operations

**Risk 4: Data Migration Issues (Existing Data in Wrong Collections)**

- **Probability**: HIGH
- **Impact**: MEDIUM
- **Mitigation**: Provide data migration script to move 'memory_store' → 'vector-memories'
- **Contingency**: Gradual migration with dual-read support (read from both, write to new)
- **Validation**: Test migration script with production-like data volumes

**Risk 5: Checkpoint Sync Integration Complexity**

- **Probability**: MEDIUM
- **Impact**: MEDIUM
- **Mitigation**: Checkpoint adapter is optional, graceful degradation if not provided
- **Contingency**: Disable checkpoint sync feature if integration issues arise
- **Validation**: Integration tests with checkpoint module, verify sync behavior

### Business Risks

**Risk 1: Extended Timeline Due to Complexity**

- **Probability**: MEDIUM
- **Impact**: MEDIUM
- **Mitigation**: Phased implementation (Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5)
- **Contingency**: Deliver Phase 1 (remove business logic) as MVP, defer AgentMemoryBridgeService integration
- **Success Metric**: Complete refactor within 8-13 hour estimate

**Risk 2: Consuming Applications Require Code Changes**

- **Probability**: LOW
- **Impact**: HIGH
- **Mitigation**: Maintain backward compatibility at IMemoryAdapter interface level
- **Contingency**: Provide migration guide and compatibility shims
- **Success Metric**: Zero breaking changes to IMemoryAdapter consumers

**Risk 3: Documentation Lag**

- **Probability**: HIGH
- **Impact**: LOW
- **Mitigation**: Update CLAUDE.md as part of implementation, not separate task
- **Contingency**: Create quick reference guide first, comprehensive docs later
- **Success Metric**: CLAUDE.md reflects new architecture before PR merge

### Risk Matrix

| Risk                            | Probability | Impact   | Score | Mitigation Strategy                                 |
| ------------------------------- | ----------- | -------- | ----- | --------------------------------------------------- |
| IMemoryAdapter Breaking Changes | Low         | Critical | 6     | Interface stability testing, compatibility wrappers |
| AgentMemoryBridgeService Bugs   | Medium      | High     | 6     | Comprehensive testing (80%+ coverage)               |
| Performance Degradation         | Low         | Medium   | 3     | Benchmarking, caching layer                         |
| Data Migration Issues           | High        | Medium   | 6     | Migration script, gradual migration                 |
| Checkpoint Sync Complexity      | Medium      | Medium   | 4     | Optional feature, graceful degradation              |
| Timeline Extension              | Medium      | Medium   | 4     | Phased delivery, MVP approach                       |
| Consumer Code Changes           | Low         | High     | 5     | Backward compatibility enforcement                  |
| Documentation Lag               | High        | Low      | 3     | Inline documentation updates                        |

---

## Implementation Phases

### Phase 1: Remove Library Business Logic (3-5 hours)

- Delete hardcoded Cypher queries in MemoryGraphService
- Remove generic collection name usage in MemoryStorageService
- Eliminate config.collection references entirely
- Update services to pure delegation pattern

### Phase 2: Refactor AgentMemoryBridgeService (2-3 hours)

- Remove MemoryService dependency from constructor
- Add IVectorService and IGraphService direct injection
- Update all 15+ methods to call adapters directly
- Implement proper error handling and graceful degradation

### Phase 3: Integrate AgentMemoryBridgeService (1-2 hours)

- Implement Option A (direct IMemoryAdapter) or Option B (MemoryManagerAdapter integration)
- Update MemoryModule provider configuration
- Verify IMemoryAdapter consumers work unchanged

### Phase 4: Register and Export (30 minutes)

- Add AgentMemoryBridgeService to providers and exports
- Update index.ts exports
- Document integration in CLAUDE.md

### Phase 5: Testing and Validation (2-3 hours)

- Integration tests verifying single data store
- Performance benchmarking
- Multi-agent scenario testing
- HITL learning validation
- Checkpoint sync verification

**Total Estimated Effort**: 8-13 hours

---

## Quality Gates

**Before delegation to next agent, verify:**

- [x] All requirements follow SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound)
- [x] Acceptance criteria in proper WHEN/THEN/SHALL format
- [x] Stakeholder analysis complete with impact matrix
- [x] Risk assessment with mitigation strategies for all identified risks
- [x] Success metrics clearly defined (single data store, adapter delegation, agent isolation)
- [x] Dependencies identified (ChromaDB adapter, Neo4j adapter, Checkpoint adapter)
- [x] Non-functional requirements specified (performance, reliability, maintainability, scalability)
- [x] Compliance requirements addressed (data integrity, audit trails)
- [x] Performance benchmarks established (95% under 100ms, batch ops under 500ms)
- [x] Security requirements documented (graceful degradation, error handling)

---

## Success Metrics

### Technical Success Criteria

- Zero hardcoded Cypher queries in library services
- Zero generic collection names in library services
- AgentMemoryBridgeService integrated with IMemoryAdapter
- Single data store verified (ChromaDB: 'vector-memories' only, Neo4j: application Memory entity only)
- 80%+ test coverage for refactored services
- All existing IMemoryAdapter consumers work unchanged

### Business Success Criteria

- Multi-agent module gains agent isolation without code changes
- HITL module gains enhanced learning without code changes
- Workflow-engine gains checkpoint sync without code changes
- Operations team monitors single data store (reduced complexity)
- Development velocity improves with clear adapter boundaries

### Performance Success Criteria

- 95% of memory retrieval operations under 100ms
- Batch storage of 100 memories under 500ms
- Agent context retrieval under 200ms
- Zero performance regression from baseline

---

## Delegation Recommendation

**Next Agent**: software-architect

**Rationale**: Requirements are comprehensive and clear. The task requires architectural design decisions (Option A vs. Option B for AgentMemoryBridgeService integration) and detailed implementation planning. Software architect should create the implementation plan with technical design choices, interface contracts, and testing strategy.

**Success Criteria**:

- Detailed implementation plan for all 5 phases
- Architectural decision: Option A or Option B for AgentMemoryBridgeService integration
- Interface contracts and method signatures defined
- Testing strategy with specific test cases
- Risk mitigation approaches detailed

**Quality Bar**: Implementation plan must be actionable by backend-developer without architectural ambiguity.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
