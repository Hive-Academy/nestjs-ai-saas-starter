# Task Description - TASK_2025_053

## Title

Thread Registry Critical Fixes - Security & Business Logic

## Priority

P0-Critical

## Type

Bugfix

## Estimated Effort

Medium (M) - 2 batches, 7 tasks total

## Description

Fix 2 critical issues identified during code review of TASK_2025_052:

1. **SECURITY FIX**: Add userId parameter to thread CRUD methods (getThread, updateThread, deleteThread) to prevent IDOR vulnerability
2. **BUSINESS LOGIC FIX**: Add thread creation logic in conversation creation endpoints to ensure threads appear in conversation lists

## Requirements

### Requirement 1: User Isolation in Thread CRUD Methods (SECURITY)

**Current State**: Only listThreads() enforces user isolation
**Required State**: ALL CRUD methods enforce user isolation

**Files to Modify**:

1. `libs/langgraph-modules/memory/src/lib/interfaces/thread-registry-store.interface.ts`
   - Add userId parameter to getThread(), updateThread(), deleteThread()
2. `libs/langgraph-modules/adapters/src/lib/adapters/thread-registry/neo4j-thread-registry.adapter.ts`
   - Add userId validation and pass to repository
3. `libs/langgraph-modules/adapters/src/lib/repositories/neo4j/thread-registry.repository.ts`
   - Add userId parameter to Cypher WHERE clauses
4. `apps/dev-brand-api/src/app/controllers/devbrand.controller.ts`
   - Update getSupervisorConversationHistory() to pass userId if using getThread()
5. `apps/dev-brand-api/src/app/business-workflows/controllers/research-chat.controller.ts`
   - Update getConversationHistory() to pass userId if using getThread()

**Security Verification**:

```cypher
// Before: VULNERABLE
MATCH (t:Thread) WHERE t.threadId = $threadId RETURN t

// After: SECURE
MATCH (t:Thread) WHERE t.threadId = $threadId AND t.userId = $userId RETURN t
```

### Requirement 2: Thread Creation in Conversation Endpoints (BUSINESS LOGIC)

**Current State**: Threads NOT created on new conversation
**Required State**: Threads auto-created with proper metadata

**Files to Modify**:

1. `apps/dev-brand-api/src/app/controllers/devbrand.controller.ts`
   - Add threadRegistry.createThread() in createNewConversation()
2. `apps/dev-brand-api/src/app/business-workflows/controllers/research-chat.controller.ts`
   - Add threadRegistry.createThread() in createNewConversation()

**Implementation Pattern**:

```typescript
async createNewConversation(dto: NewConversationDto, @Req() request: any) {
  const userId = request.headers['x-user-id'] || 'test-devbrand-001';
  const threadId = `devbrand-${Date.now()}-${userId}`;

  // NEW: Create thread in ThreadRegistryStore
  if (this.threadRegistry) {
    try {
      await this.threadRegistry.createThread(userId, {
        title: dto.initialQuery || 'New Conversation',
        metadata: {
          source: 'web_ui',
          workflowType: 'supervisor',
          initialQuery: dto.initialQuery
        }
      });
      this.logger.log(`✅ Thread created in registry: ${threadId}`);
    } catch (error) {
      this.logger.warn(`Failed to create thread in registry: ${error.message}`);
      // Continue - graceful degradation
    }
  }

  return { threadId, status: 'created', conversationUrl: `/devbrand` };
}
```

## Quality Gates

1. ✅ TypeScript strict mode (zero 'any' types)
2. ✅ All Cypher queries parameterized (injection prevention)
3. ✅ User isolation enforced in ALL thread operations
4. ✅ Graceful degradation (no exceptions if registry unavailable)
5. ✅ Commitlint compliance (type(scope): description)
6. ✅ Build passes: `npx nx build backend-api`
7. ✅ Zero breaking changes to frontend

## Acceptance Criteria

### Security Fix Acceptance Criteria

- [ ] Interface updated with userId parameter in 3 methods
- [ ] Adapter validates userId before delegation
- [ ] Repository Cypher queries include userId filter
- [ ] Controllers pass userId from request headers
- [ ] Security test: User A cannot access User B's threads

### Business Logic Fix Acceptance Criteria

- [ ] DevBrandController creates thread on new conversation
- [ ] ResearchChatController creates thread on new conversation
- [ ] Thread metadata includes workflowType and source
- [ ] Conversation list shows newly created threads
- [ ] Error handling with graceful degradation

## Dependencies

- TASK_2025_052 (Thread Registry Implementation) - COMPLETE
- Neo4j database running
- ThreadRegistry configured in MemoryModule

## Branch Strategy

- Branch: `purge/langgraph-service-layer` (continue from TASK_2025_052)
- No new branch required (related fixes)

## Testing Strategy

### Manual Security Testing

```bash
# Test 1: User isolation verification
curl -H "x-user-id: user-123" http://localhost:3000/api/research/conversation/history/thread-456
# Expected: 404 if thread-456 belongs to user-999

curl -H "x-user-id: user-999" http://localhost:3000/api/research/conversation/history/thread-456
# Expected: 200 if thread-456 belongs to user-999
```

### Manual Business Logic Testing

```bash
# Test 2: Thread creation verification
curl -X POST -H "x-user-id: user-123" \
  -H "Content-Type: application/json" \
  -d '{"initialQuery": "Test conversation"}' \
  http://localhost:3000/api/research/conversation/new

# Then verify thread appears in list
curl -H "x-user-id: user-123" http://localhost:3000/api/research/conversation/list
# Expected: Thread with title "Test conversation" in response
```

## Notes

- Zero backward compatibility required (direct replacement)
- All changes are additive (userId parameter) or enhancement (thread creation)
- Frontend code requires NO changes (100% compatible)
- Follow commitlint rules strictly
