# TASK_2025_053 - Thread Registry Critical Fixes

## Context

This task addresses 2 CRITICAL issues identified during code review of TASK_2025_052 (Thread Registry Implementation):

1. **SECURITY VULNERABILITY (CRITICAL)**: IDOR (Insecure Direct Object Reference) in thread CRUD methods
2. **BUSINESS LOGIC GAP (HIGH)**: Missing thread creation in conversation creation endpoints

## Code Review Findings Summary

**Review Source**: task-tracking/TASK_2025_052/code-review.md
**Overall Score**: 9.5/10 (Exceptional code quality with 2 critical fixes required)
**Reviewer**: code-reviewer (Elite Technical Quality Review - Triple Phase Analysis)

### Issue 1: IDOR Vulnerability (SECURITY - CRITICAL)

**Problem**: Thread CRUD methods (getThread, updateThread, deleteThread) lack userId parameter for user isolation

- Users can access/modify other users' threads if they know the threadId
- Missing authorization checks in interface, adapter, and repository
- Only listThreads() enforces user isolation

**Current Vulnerable Code**:

```typescript
// Interface (thread-registry-store.interface.ts:59)
abstract getThread(threadId: string): Promise<ThreadMetadata | null>;

// Repository (thread-registry.repository.ts:107-127)
async getThread(threadId: string): Promise<ThreadMetadata | null> {
  queryBuilder
    .match(`(t:Thread)`)
    .where(`t.threadId = $threadId`)  // 🔴 No userId check
    .return(`t`);
}
```

**Required Fix**:

- Add userId parameter to getThread(), updateThread(), deleteThread() in IThreadRegistryStore interface
- Update Neo4jThreadRegistryAdapter to validate and pass userId
- Update ThreadRegistryRepository Cypher queries to include `AND t.userId = $userId` filter
- Update controller calls to pass userId from request headers

**Impact**: MEDIUM severity - Requires threadId knowledge but still exploitable (IDOR attack vector)

### Issue 2: Missing Thread Creation (BUSINESS LOGIC - HIGH)

**Problem**: Controllers query threads but don't create threads on first conversation

- First conversation returns empty array until thread manually created elsewhere
- Breaking user experience for new conversations

**Current Missing Logic**:

```typescript
// DevBrandController.createNewConversation() (devbrand.controller.ts:481-517)
// ResearchChatController.createNewConversation() (research-chat.controller.ts:~line 300)

// 🔴 MISSING: Thread creation in ThreadRegistryStore
async createNewConversation(dto: NewConversationDto, @Req() request: any) {
  const userId = request.headers['x-user-id'] || 'test-devbrand-001';
  const threadId = `devbrand-${Date.now()}-${userId}`;

  // Thread ID generated but NOT saved to ThreadRegistryStore
  // User cannot see this conversation in getConversationList()

  return { threadId, status: 'created', conversationUrl: `/devbrand` };
}
```

**Required Fix**:

- Add thread creation logic in DevBrandController.createNewConversation()
- Add thread creation logic in ResearchChatController.createNewConversation()
- Use graceful degradation (wrap in try-catch, log warning if registry unavailable)
- Set appropriate metadata (source: 'web_ui', workflowType: 'supervisor' | 'researcher')

**Impact**: HIGH - Functional gap causing poor UX for new users

## User Intent

Fix critical security vulnerability and business logic gap before production deployment while maintaining 100% backward compatibility with existing frontend code.

## Success Criteria

1. ✅ IDOR vulnerability eliminated (user isolation enforced in all CRUD methods)
2. ✅ Threads automatically created on new conversation creation
3. ✅ Zero breaking changes to existing code
4. ✅ All commits follow commitlint rules
5. ✅ Build passes: `npx nx build backend-api`
6. ✅ Security verification: Users cannot access other users' threads

## Related Tasks

- **TASK_2025_052**: Thread Registry Implementation (code review source)
- **TASK_2025_050**: Conversation History Sidebar (integration context)
