# Requirements Document - TASK_2025_052

## Introduction

### Business Context

The current memory module provides BaseStore functionality for LangGraph workflows but lacks thread registry capabilities, resulting in the warning "Thread listing not implemented - checkpoint storage query needed" when users attempt to retrieve conversation history. This limitation prevents:

- Users from browsing their conversation history in the UI
- Backend services from implementing thread management features
- Proper conversation lifecycle management across LangGraph workflows
- Historical conversation analytics and search capabilities

### Value Proposition

Implementing thread registry with adapter pattern enables:

1. **User Experience Enhancement**: Users can view, search, and resume past conversations
2. **Architectural Consistency**: Follows established HITL adapter pattern for storage decoupling
3. **Storage Flexibility**: Pluggable adapters support Neo4j (default), ChromaDB, or custom backends
4. **Production Readiness**: Real thread listing API eliminates POC empty-array workarounds

### Scope

**In Scope**:

- IThreadRegistryStore interface definition
- Dual storage architecture (BaseStore + ThreadRegistryStore)
- Neo4j adapter implementation (default)
- ChromaDB adapter implementation (alternative)
- Memory module enhancement for ThreadRegistryStore provider
- Integration with existing conversation history APIs

**Out of Scope**:

- Thread search/filtering beyond userId (future enhancement)
- Thread analytics and statistics (future enhancement)
- Thread archival/deletion workflows (separate feature)
- UI components for thread display (handled by frontend)

---

## Requirements

### Requirement 1: Thread Registry Storage Interface

**User Story**: As a backend developer, I want a standardized IThreadRegistryStore interface, so that I can implement thread listing across different storage backends without changing business logic.

#### Acceptance Criteria

1. WHEN IThreadRegistryStore interface is defined THEN it SHALL include the following methods:

   - `listThreads(userId: string, options?: ThreadListOptions): Promise<ThreadMetadata[]>`
   - `getThread(threadId: string): Promise<ThreadMetadata | null>`
   - `createThread(userId: string, metadata: Partial<ThreadMetadata>): Promise<ThreadMetadata>`
   - `updateThread(threadId: string, updates: Partial<ThreadMetadata>): Promise<void>`
   - `deleteThread(threadId: string): Promise<boolean>`

2. WHEN ThreadMetadata type is defined THEN it SHALL include:

   ```typescript
   interface ThreadMetadata {
     threadId: string; // Unique thread identifier
     userId: string; // Owner user identifier
     createdAt: Date; // Thread creation timestamp
     lastMessageAt: Date; // Last activity timestamp
     title?: string; // Optional conversation title
     metadata?: Record<string, unknown>; // Extensible metadata
   }
   ```

3. WHEN ThreadListOptions type is defined THEN it SHALL support:

   ```typescript
   interface ThreadListOptions {
     limit?: number; // Max results (default: 50)
     offset?: number; // Pagination offset
     orderBy?: 'createdAt' | 'lastMessageAt'; // Sort field
     orderDirection?: 'ASC' | 'DESC'; // Sort direction
   }
   ```

4. WHEN interface is exported THEN it SHALL be an `@Injectable()` abstract class following HITL adapter pattern

5. WHEN interface is implemented THEN it SHALL support type-safe dependency injection via NestJS DI system

### Requirement 2: Neo4j Thread Registry Adapter (Default)

**User Story**: As a system architect, I want Neo4j as the default thread registry backend, so that thread data integrates naturally with graph-based relationship modeling.

#### Acceptance Criteria

1. WHEN Neo4jThreadRegistryAdapter is created THEN it SHALL implement IThreadRegistryStore interface

2. WHEN listThreads() is called THEN it SHALL execute Cypher query:

   ```cypher
   MATCH (t:Thread {userId: $userId})
   RETURN t
   ORDER BY t.lastMessageAt DESC
   LIMIT $limit SKIP $offset
   ```

3. WHEN createThread() is called THEN it SHALL:

   - Generate unique threadId (UUID v4)
   - Set createdAt and lastMessageAt to current timestamp
   - Create Thread node in Neo4j with all metadata
   - Return complete ThreadMetadata object

4. WHEN updateThread() is called with lastMessageAt THEN it SHALL update timestamp for conversation sorting

5. WHEN getThread() is called THEN it SHALL return null if thread not found (no exceptions)

6. WHEN deleteThread() is called THEN it SHALL return true if deleted, false if not found

7. WHEN Neo4j connection fails THEN adapter SHALL throw descriptive error with context

### Requirement 3: ChromaDB Thread Registry Adapter (Alternative)

**User Story**: As a system architect, I want ChromaDB thread registry adapter as an alternative, so that teams using ChromaDB-only deployments can leverage thread listing without Neo4j.

#### Acceptance Criteria

1. WHEN ChromaDBThreadRegistryAdapter is created THEN it SHALL implement IThreadRegistryStore interface

2. WHEN listThreads() is called THEN it SHALL:

   - Query ChromaDB collection with metadata filter: `{ userId: userId }`
   - Sort results by lastMessageAt in descending order
   - Apply limit and offset for pagination
   - Return ThreadMetadata[] array

3. WHEN createThread() is called THEN it SHALL:

   - Generate document ID from threadId
   - Store thread metadata as ChromaDB document
   - Use metadata fields for filtering (userId, createdAt, lastMessageAt)
   - Generate embedding from thread title (if provided)

4. WHEN updateThread() is called THEN it SHALL update document metadata via ChromaDB update API

5. WHEN ChromaDB query returns zero results THEN it SHALL return empty array (not null)

6. WHEN ChromaDB service unavailable THEN adapter SHALL throw ChromaDBConnectionError

### Requirement 4: Memory Module Enhancement - Dual Storage

**User Story**: As a memory module consumer, I want both BaseStore and ThreadRegistryStore available via dependency injection, so that I can manage LangGraph items and thread metadata independently.

#### Acceptance Criteria

1. WHEN MemoryModule.forRoot() is called with threadRegistry configuration THEN it SHALL:

   - Provide BASE_STORE_TOKEN (existing BaseStore)
   - Provide THREAD_REGISTRY_TOKEN (new ThreadRegistryStore)
   - Both providers available for global injection

2. WHEN MemoryModuleOptions is extended THEN it SHALL include:

   ```typescript
   interface MemoryModuleOptions {
     collection?: string; // BaseStore collection (existing)
     enableSemanticSearch?: boolean; // BaseStore feature (existing)
     threadRegistry?: {
       // NEW: Thread registry config
       adapter: Type<IThreadRegistryStore> | IThreadRegistryStore;
       defaultLimit?: number; // Default pagination limit
     };
   }
   ```

3. WHEN threadRegistry.adapter is provided THEN MemoryModule SHALL:

   - Create provider using AdapterProviderFactory pattern (HITL model)
   - Support both class-based (Type<T>) and instance-based adapters
   - Inject adapter into THREAD_REGISTRY_TOKEN

4. WHEN threadRegistry configuration is omitted THEN MemoryModule SHALL:

   - Log warning: "Thread registry not configured - thread listing unavailable"
   - Skip THREAD_REGISTRY_TOKEN provider creation
   - Allow BaseStore to function independently

5. WHEN both BaseStore and ThreadRegistryStore are configured THEN they SHALL:
   - Use separate storage backends (ChromaDB for BaseStore, Neo4j for ThreadRegistry)
   - Operate independently with zero coupling
   - Share no state or dependencies beyond module configuration

### Requirement 5: Typed Injection Token

**User Story**: As a NestJS developer, I want type-safe injection tokens for ThreadRegistryStore, so that I get compile-time type checking and IDE autocomplete.

#### Acceptance Criteria

1. WHEN THREAD_REGISTRY_TOKEN is defined THEN it SHALL:

   - Be a unique symbol: `Symbol('ThreadRegistryStore')`
   - Have TypeScript type: `IThreadRegistryStore`
   - Follow BASE_STORE_TOKEN pattern from memory module

2. WHEN token is used in @Inject() decorator THEN it SHALL provide full TypeScript type inference:

   ```typescript
   constructor(
     @Optional()
     @Inject(THREAD_REGISTRY_TOKEN)
     private readonly threadRegistry?: IThreadRegistryStore
   ) {}
   ```

3. WHEN token is exported from memory module THEN it SHALL be available via:
   ```typescript
   import { THREAD_REGISTRY_TOKEN } from '@hive-academy/langgraph-memory';
   ```

### Requirement 6: Adapter Provider Factory Integration

**User Story**: As a module maintainer, I want adapter provider creation to follow HITL's AdapterProviderFactory pattern, so that provider logic is consistent and maintainable.

#### Acceptance Criteria

1. WHEN MemoryModule creates ThreadRegistryStore provider THEN it SHALL use factory pattern:

   ```typescript
   {
     provide: THREAD_REGISTRY_TOKEN,
     useFactory: (adapter) => adapter,
     inject: [/* adapter dependencies */]
   }
   ```

2. WHEN adapter is a class (Type<T>) THEN provider SHALL use `useClass` pattern

3. WHEN adapter is an instance THEN provider SHALL use `useValue` pattern

4. WHEN adapter requires dependencies (e.g., Neo4jService) THEN factory SHALL inject them via `inject: [Neo4jService]`

5. WHEN provider creation fails THEN MemoryModule SHALL throw descriptive error with configuration details

### Requirement 7: Graceful Degradation

**User Story**: As a production engineer, I want thread registry to degrade gracefully when unavailable, so that core LangGraph workflows continue functioning.

#### Acceptance Criteria

1. WHEN ThreadRegistryStore is injected with @Optional() THEN services SHALL:

   - Check `if (!this.threadRegistry)` before usage
   - Log warning when unavailable
   - Return empty arrays for list operations
   - Continue execution without throwing errors

2. WHEN listThreads() is called without ThreadRegistryStore THEN controller SHALL:

   - Return `{ conversations: [], totalCount: 0, hasMore: false }`
   - Log info-level message: "Thread registry unavailable - returning empty list"
   - NOT throw exceptions or return 500 errors

3. WHEN createThread() is called without ThreadRegistryStore THEN it SHALL:

   - Log warning and skip thread creation
   - Allow conversation to proceed with checkpoint-based resume

4. WHEN BaseStore fails BUT ThreadRegistryStore succeeds THEN thread listing SHALL work independently

### Requirement 8: Integration with Conversation APIs

**User Story**: As an API consumer, I want existing conversation list endpoints to use ThreadRegistryStore, so that I receive real thread data instead of empty arrays.

#### Acceptance Criteria

1. WHEN DevBrandController.getSupervisorConversationList() is called THEN it SHALL:

   - Inject ThreadRegistryStore via @Optional() @Inject(THREAD_REGISTRY_TOKEN)
   - Call `threadRegistry.listThreads(userId, { limit: 50, orderBy: 'lastMessageAt', orderDirection: 'DESC' })`
   - Map ThreadMetadata[] to ConversationListItem[] response format
   - Remove warning: "Thread listing not implemented - checkpoint storage query needed"

2. WHEN ResearchChatController.getConversationList() is called THEN it SHALL:

   - Use same ThreadRegistryStore injection pattern
   - Apply identical query logic with userId filtering
   - Return consistent response format across all conversation APIs

3. WHEN thread metadata is returned THEN response SHALL include:

   ```typescript
   interface ConversationListItem {
     threadId: string;
     title: string; // From metadata.title or "Conversation {createdAt}"
     lastMessageAt: string; // ISO 8601 timestamp
     messageCount?: number; // Optional (future enhancement)
   }
   ```

4. WHEN pagination is required THEN API SHALL support query parameters:
   - `?limit=50` (default: 50, max: 100)
   - `?offset=0` (default: 0)
   - Return `hasMore: boolean` flag in response

---

## Non-Functional Requirements

### Performance Requirements

**Thread Listing Performance**:

- **Response Time**: 95% of requests under 200ms, 99% under 500ms
- **Throughput**: Handle 100 concurrent listThreads() requests
- **Database Efficiency**: Single-query retrieval (no N+1 queries)
- **Pagination**: Support offset-based pagination up to 10,000 threads per user

**Thread Creation Performance**:

- **Response Time**: 95% of requests under 100ms, 99% under 300ms
- **ID Generation**: UUID v4 generation < 1ms
- **Neo4j Write**: Thread node creation < 50ms (p95)

**Caching Strategy** (Future Enhancement):

- In-memory cache for recent thread lists (TTL: 60 seconds)
- Cache invalidation on thread creation/update
- Reduces database load by 70% for repeat queries

### Type Safety Requirements

**TypeScript Strict Mode Compliance**:

- **NO 'any' types** - All interfaces fully typed
- **Strict null checks** - Handle null/undefined explicitly
- **Discriminated unions** for adapter type detection
- **Generic constraints** for factory functions

**Type Coverage**:

- 100% type coverage for IThreadRegistryStore interface
- 100% type coverage for ThreadMetadata and ThreadListOptions
- 100% type coverage for adapter implementations

### Scalability Requirements

**User Load**:

- Support 10,000+ concurrent users
- Support 1 million+ threads in registry (Neo4j scalability)
- Support 100,000+ threads per user (edge case: power users)

**Adapter Scalability**:

- Neo4j adapter: Leverage indexed queries on userId and lastMessageAt
- ChromaDB adapter: Use metadata filtering for efficient queries
- Support horizontal scaling via stateless adapter design

### Reliability Requirements

**Error Handling**:

- **Database Connection Failures**: Throw descriptive errors with retry guidance
- **Invalid Input**: Validate userId, threadId, and options parameters
- **Concurrent Updates**: Handle race conditions via database transactions
- **Adapter Failures**: Log errors with full context (userId, threadId, operation)

**Data Integrity**:

- **Thread Uniqueness**: Enforce unique threadId constraint in storage
- **Timestamp Consistency**: Ensure lastMessageAt >= createdAt
- **Orphan Prevention**: Validate userId exists before thread creation (optional foreign key)

**Uptime**:

- 99.9% availability for thread registry operations
- Graceful degradation when storage backend unavailable
- Recovery within 30 seconds after storage backend restoration

### Testability Requirements

**Unit Test Coverage**: 80% minimum

- IThreadRegistryStore interface contract tests
- Neo4j adapter implementation tests
- ChromaDB adapter implementation tests
- MemoryModule provider creation tests
- Type safety validation tests

**Integration Test Coverage**:

- End-to-end thread creation → listing → retrieval flow
- Neo4j adapter with real Neo4j test instance
- ChromaDB adapter with real ChromaDB test instance
- Graceful degradation scenarios (storage unavailable)
- Concurrent thread operations (race condition handling)

**Test Data Management**:

- Isolated test database instances (Neo4j, ChromaDB)
- Automated cleanup after test execution
- Deterministic test data generation (fixed UUIDs, timestamps)

### Security Requirements

**Access Control**:

- **User Isolation**: Users can only list their own threads (enforced by userId filter)
- **Thread Ownership Validation**: Verify userId matches thread owner before operations
- **Parameter Sanitization**: Validate all user inputs (userId, threadId, pagination params)

**Data Protection**:

- **Sensitive Metadata**: Support optional encryption for thread metadata
- **Audit Logging**: Log all thread creation, update, deletion operations
- **PII Compliance**: Thread titles treated as PII (GDPR, CCPA compliance)

**Injection Prevention**:

- **Cypher Injection**: Use parameterized queries for all Neo4j operations
- **NoSQL Injection**: Sanitize ChromaDB metadata filters
- **Input Validation**: Reject invalid UUIDs, negative offsets, excessive limits

---

## Acceptance Criteria Summary

### Core Functionality Checklist

- [ ] IThreadRegistryStore interface defined with all required methods
- [ ] ThreadMetadata and ThreadListOptions types fully specified
- [ ] Neo4jThreadRegistryAdapter implements full interface with Cypher queries
- [ ] ChromaDBThreadRegistryAdapter implements full interface with metadata filtering
- [ ] MemoryModule.forRoot() supports threadRegistry configuration option
- [ ] THREAD_REGISTRY_TOKEN exported with type-safe injection
- [ ] AdapterProviderFactory pattern used for provider creation
- [ ] Graceful degradation when threadRegistry unavailable
- [ ] DevBrandController.getSupervisorConversationList() uses ThreadRegistryStore
- [ ] ResearchChatController.getConversationList() uses ThreadRegistryStore
- [ ] Warning "Thread listing not implemented" eliminated from codebase

### Quality Gates

- [ ] All unit tests pass (80%+ coverage)
- [ ] All integration tests pass
- [ ] No 'any' types in implementation
- [ ] Type-check passes with strict mode
- [ ] Lint passes with zero warnings
- [ ] Performance benchmarks meet requirements (p95 < 200ms)
- [ ] Security audit passes (no injection vulnerabilities)
- [ ] Documentation complete (interface, adapters, usage examples)

### Performance Benchmarks

- [ ] listThreads() p95 response time < 200ms (Neo4j adapter)
- [ ] listThreads() p95 response time < 200ms (ChromaDB adapter)
- [ ] createThread() p95 response time < 100ms (both adapters)
- [ ] Concurrent load test: 100 requests/second sustained
- [ ] Pagination performance: offset=10,000 < 500ms

---

## Dependencies

### Internal Dependencies

1. **@hive-academy/nestjs-neo4j** (v1.0.0)

   - Neo4jService for graph database operations
   - Neo4jModule for DI integration
   - Required for Neo4jThreadRegistryAdapter

2. **@hive-academy/nestjs-chromadb** (v1.0.0)

   - ChromaDBService for vector database operations
   - ChromaDBModule for DI integration
   - Required for ChromaDBThreadRegistryAdapter

3. **@hive-academy/langgraph-memory** (current)

   - MemoryModule for BaseStore provider
   - BASE_STORE_TOKEN pattern reference
   - Integration target for ThreadRegistryStore

4. **@hive-academy/langgraph-hitl** (v1.0.0)
   - AdapterProviderFactory pattern reference
   - IHitlStorageService interface pattern reference
   - Architectural guidance for adapter implementation

### External Dependencies

1. **@nestjs/common** (^10.0.0)

   - @Injectable() decorator
   - DynamicModule for forRoot() pattern
   - Dependency injection system

2. **uuid** (^9.0.0)

   - v4() for thread ID generation
   - Imported as: `import { v4 as uuidv4 } from 'uuid';`

3. **@langchain/langgraph-checkpoint** (^0.0.10)
   - No direct dependency (decoupled from checkpoint system)
   - ThreadRegistry operates independently of checkpoint storage

---

## Reference Architecture

### Checkpoint Module Adapter Pattern

**File**: `libs/langgraph-modules/checkpoint/CLAUDE.md`

**Key Learnings**:

- Checkpoint module successfully uses adapter pattern for storage decoupling
- Provides both PostgreSQL and Neo4j adapters
- Interface-based abstraction enables swappable backends
- Factory pattern for provider creation

**Pattern Application to Thread Registry**:

- IThreadRegistryStore interface follows ICheckpointStorageService pattern
- Adapter factory creation mirrors checkpoint provider pattern
- Graceful degradation when adapter unavailable

### HITL Adapter Architecture

**File**: `libs/langgraph-modules/hitl/src/lib/interfaces/hitl-storage.interface.ts`

**Key Learnings**:

- IHitlStorageService is `@Injectable()` abstract class (DI token + contract)
- Multiple adapters support different backends (Neo4j, PostgreSQL, Redis)
- AdapterProviderFactory centralizes provider creation logic
- Optional injection with `@Optional()` decorator for graceful degradation

**Pattern Application to Thread Registry**:

- IThreadRegistryStore follows `@Injectable()` abstract class pattern
- THREAD_REGISTRY_TOKEN follows BASE_STORE_TOKEN pattern
- Provider creation uses factory pattern for class vs instance adapters

### Memory Module BaseStore Pattern

**File**: `libs/langgraph-modules/memory/src/lib/memory.module.ts`

**Key Learnings**:

- MemoryModule.forRoot() provides BASE_STORE_TOKEN globally
- Repository pattern (LangGraphStoreRepository) encapsulates business logic
- ChromaDBBaseStore delegates to repository for CRUD operations
- Type-safe injection tokens (BASE_STORE_TOKEN as unique symbol)

**Pattern Application to Thread Registry**:

- ThreadRegistryStore provider created in MemoryModule.forRoot()
- THREAD_REGISTRY_TOKEN exported alongside BASE_STORE_TOKEN
- Dual storage architecture: BaseStore + ThreadRegistryStore both global
- Repository pattern NOT used (adapters implement interface directly)

---

## Risk Assessment

### Technical Risks

#### Risk 1: Adapter Performance Disparity

**Description**: Neo4j adapter may perform significantly better than ChromaDB adapter for thread listing due to indexed graph queries vs metadata filtering.

**Probability**: High
**Impact**: Medium
**Mitigation**:

- Implement performance benchmarks for both adapters during development
- Document performance characteristics in CLAUDE.md
- Recommend Neo4j adapter for production deployments with high thread volume
- Add indexing guidance for ChromaDB metadata fields

**Contingency**:

- Implement caching layer for frequently accessed thread lists
- Provide hybrid adapter (Neo4j for writes, ChromaDB for reads)

#### Risk 2: Thread Metadata Schema Evolution

**Description**: Future requirements may require additional metadata fields (tags, folders, starred), requiring schema migrations across adapters.

**Probability**: Medium
**Impact**: Medium
**Mitigation**:

- Design ThreadMetadata with extensible `metadata: Record<string, unknown>` field
- Document schema evolution strategy in CLAUDE.md
- Use database migration tools (Neo4j migrations, ChromaDB re-indexing)

**Contingency**:

- Implement versioned metadata schemas (v1, v2, v3)
- Provide migration scripts for each adapter

#### Risk 3: Concurrent Thread Updates

**Description**: Multiple simultaneous updates to the same thread (lastMessageAt) may cause race conditions.

**Probability**: Low
**Impact**: Low
**Mitigation**:

- Use database transactions for thread updates (Neo4j, ChromaDB)
- Implement optimistic locking with version field
- Document concurrency handling in adapter implementation

**Contingency**:

- Add retry logic for failed concurrent updates
- Implement eventual consistency for lastMessageAt updates

### Business Risks

#### Risk 4: Migration Complexity for Existing Threads

**Description**: If threads already exist in checkpoint storage, migration to thread registry may require complex data transformation.

**Probability**: Medium
**Impact**: High
**Mitigation**:

- Investigate existing thread data in checkpoint storage
- Design migration script if threads exist
- Provide backward compatibility during migration period

**Contingency**:

- Phase 1: Read from checkpoint (fallback)
- Phase 2: Write to both checkpoint + registry (dual-write)
- Phase 3: Read from registry only (complete migration)

#### Risk 5: Storage Backend Availability SLA

**Description**: Thread registry availability depends on Neo4j/ChromaDB uptime, which may have lower SLA than core workflow execution.

**Probability**: Low
**Impact**: Medium
**Mitigation**:

- Implement graceful degradation (return empty arrays)
- Add health checks for thread registry storage
- Monitor storage backend availability metrics

**Contingency**:

- Cache thread lists in Redis for high-availability scenarios
- Implement circuit breaker pattern for storage adapter calls

---

## Risk Matrix

| Risk                             | Probability | Impact | Score | Mitigation Strategy                                 |
| -------------------------------- | ----------- | ------ | ----- | --------------------------------------------------- |
| Adapter Performance Disparity    | High        | Medium | 6     | Benchmarks + caching layer + Neo4j recommendation   |
| Thread Metadata Schema Evolution | Medium      | Medium | 4     | Extensible metadata field + migration documentation |
| Concurrent Thread Updates        | Low         | Low    | 2     | Database transactions + optimistic locking          |
| Migration Complexity             | Medium      | High   | 6     | Investigate existing data + phased migration plan   |
| Storage Backend Availability     | Low         | Medium | 3     | Graceful degradation + health checks + Redis cache  |

---

## Success Metrics

### Immediate Success Criteria

1. **Warning Elimination**: Zero occurrences of "Thread listing not implemented" in logs
2. **API Functionality**: All conversation list endpoints return real thread data
3. **Test Coverage**: 80%+ unit test coverage, 100% integration test coverage
4. **Type Safety**: Zero 'any' types in implementation
5. **Performance**: p95 response time < 200ms for thread listing

### Long-Term Success Criteria

1. **User Engagement**: 60% of users browse conversation history weekly
2. **System Reliability**: 99.9% uptime for thread registry operations
3. **Adapter Adoption**: 2+ production adapters implemented (Neo4j, ChromaDB)
4. **Scalability**: Support 1 million+ threads without performance degradation
5. **Developer Satisfaction**: Zero adapter-related support tickets post-launch

---

## Stakeholder Communication

### For Technical Team

**Summary**: Implementing IThreadRegistryStore interface with Neo4j and ChromaDB adapters following HITL adapter pattern. Memory module enhanced with dual storage providers (BaseStore + ThreadRegistryStore). Performance target: p95 < 200ms for thread listing.

**Key Technical Decisions**:

- Adapter pattern over repository pattern (pluggable backends)
- Dual storage architecture (BaseStore independent of ThreadRegistryStore)
- Type-safe injection tokens (THREAD_REGISTRY_TOKEN)
- Graceful degradation with @Optional() injection

### For Product Team

**Summary**: Users will now see their conversation history instead of empty lists. Backend implements thread registry with Neo4j (default) and ChromaDB (alternative) adapters. Thread listing API ready for UI integration.

**Business Value**:

- Improved user experience (conversation history browsing)
- Enabler for conversation search and analytics features
- Production-ready conversation management infrastructure

### For Users

**User-Facing Changes**: The conversation history sidebar will now display your past conversations with accurate timestamps and titles. You can browse, search, and resume any previous conversation.

**Behind the Scenes**: We've implemented a robust thread registry system that tracks all your conversations across multiple storage backends, ensuring reliability and performance.

---

## Future Enhancements (Out of Scope)

1. **Thread Search & Filtering**

   - Full-text search across thread titles and messages
   - Filter by date range, tags, folders
   - Advanced search with semantic similarity

2. **Thread Analytics**

   - Conversation frequency metrics
   - User engagement tracking
   - Popular conversation topics analysis

3. **Thread Organization**

   - User-defined folders and tags
   - Starred/favorite threads
   - Archived threads (soft delete)

4. **Multi-User Threads**

   - Shared conversations between users
   - Team collaboration threads
   - Permission-based access control

5. **Thread Export/Import**
   - Export conversations to JSON/Markdown
   - Import historical conversations from external systems
   - Backup and restore functionality
