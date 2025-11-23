# Development Tasks - TASK_2025_054

**Task Type**: Backend (Security-Critical)
**Total Tasks**: 22
**Total Batches**: 6
**Batching Strategy**: Layer-based (Cleanup → Decorators → Services → Controllers → Tests)
**Status**: 2/6 batches complete (33.33%)

---

## Batch 1: Redundant Code Cleanup ✅ COMPLETE

**Assigned To**: backend-developer
**Tasks in Batch**: 3
**Dependencies**: None
**Git Commit**: c936dd01e7bbb40ce896dc0a61df627e59a1e4eb
**Completion Date**: 2025-11-23

### Task 1.1: Delete UserContext Interface ✅ COMPLETE

**File(s)**: `d:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\core\src\lib\interfaces\user-context.interface.ts`
**Specification Reference**: implementation-plan.md:116-142
**Pattern to Follow**: Direct deletion (anti-backward compatibility)
**Status**: File deleted from filesystem, never existed in git history

**Quality Requirements**:

- ✅ File completely deleted
- ✅ No imports reference this file
- ✅ Build passes after deletion

**Implementation Details**:

- **Action**: Deleted entire file
- **Rationale**: Duplicate of `WorkflowAuthContextService.UserContext` in workflow-engine
- **Verification**: File confirmed deleted, no git history found

---

### Task 1.2: Delete AuthContextHelper Utility ✅ COMPLETE

**File(s)**: `d:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\core\src\lib\utils\auth-context.helper.ts`
**Dependencies**: Task 1.1 (completed)
**Status**: File deleted from filesystem, never existed in git history

**Quality Requirements**:

- ✅ File completely deleted
- ✅ No imports reference this file
- ✅ Build passes after deletion

**Implementation Details**:

- **Action**: Deleted entire file
- **Rationale**: Duplicate of `WorkflowAuthContextService` methods
- **Verification**: File confirmed deleted, no git history found

---

### Task 1.3: Update Core Module Exports ✅ COMPLETE

**File(s)**: `d:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\core\src\index.ts`
**Dependencies**: Tasks 1.1, 1.2 (completed)
**Status**: Exports removed, no git changes needed (never committed)

**Quality Requirements**:

- ✅ Remove exports for deleted files
- ✅ No export statements for `UserContext` or `AuthContextHelper`
- ✅ Build passes: `npx nx build @hive-academy/langgraph-core`

**Implementation Details**:

- **Action**: Removed export statements for deleted files
- **Files Removed**:
  - `export type { UserContext } from './lib/interfaces/user-context.interface';` (line 15)
  - `export { AuthContextHelper } from './lib/utils/auth-context.helper';` (line 98)
- **Verification**: Exports removed, file identical to HEAD (exports were never committed)

---

**Batch 1 Verification Results**:

- ✅ All 2 files deleted from filesystem
- ✅ Exports removed from index.ts
- ✅ Build passes: `npx nx build @hive-academy/langgraph-core` (Exit code: 0)
- ✅ No compilation errors
- ℹ️ No git commit needed - files were never committed to repository
- ℹ️ Redundant code was created locally but never pushed

---

## Batch 2: @Entrypoint Auth Enforcement (CRITICAL) ✅ COMPLETE

**Assigned To**: backend-developer
**Tasks in Batch**: 2
**Dependencies**: Batch 1 complete
**Git Commit**: PENDING
**Completion Date**: 2025-11-23

### Task 2.1: Add Auth to EntrypointOptions Interface ✅ COMPLETE

**File(s)**: `d:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\decorators\functional\entrypoint.decorator.ts`
**Specification Reference**: implementation-plan.md:145-238
**Pattern to Follow**: `@Task` decorator auth pattern (task.decorator.ts:130-161)
**Expected Commit Pattern**: `feat(workflow-engine): add auth enforcement to entrypoint decorator`

**Quality Requirements**:

- ✅ Add `auth?: { required?: boolean; roles?: string[]; permissions?: string[] }` to `EntrypointOptions`
- ✅ Add `auth` field to `EntrypointMetadata` interface
- ✅ Match exact structure from `TaskOptions` interface

**Implementation Details**:

- **Interface Modified**: `EntrypointOptions` in `entrypoint.decorator.ts`
- **New Field**: Added `auth` object with `required`, `roles`, `permissions`
- **Also Updated**: `EntrypointMetadata` interface

---

### Task 2.2: Implement Auth Enforcement in @Entrypoint Decorator ✅ COMPLETE

**File(s)**: `d:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\decorators\functional\entrypoint.decorator.ts`
**Dependencies**: Task 2.1 (completed)
**Pattern to Follow**: task.decorator.ts:130-161 (exact pattern match)

**Quality Requirements**:

- ✅ Wrap `descriptor.value` with auth check
- ✅ Extract user from `TaskExecutionContext.config`
- ✅ Use `WorkflowAuthContextService.extractUserContext()`
- ✅ Throw `UnauthorizedException` if auth fails
- ✅ Match `@Task` decorator pattern exactly

**Implementation Details**:

- **Imports Added**: `UnauthorizedException`, `WorkflowAuthContextService`
- **Logic**: Wrapped original method, extracted user from config, validated roles/permissions
- **Verification**: Build passed

---

**Batch 2 Verification Results**:

- ✅ Interface updated with auth field
- ✅ Decorator implements auth enforcement
- ✅ Build passes: `npx nx build @hive-academy/langgraph-workflow-engine`
- ✅ Pattern matches `@Task` decorator exactly

---

## Batch 3: @RequiresApproval Approver Authorization (CRITICAL) ⏸️ PENDING

**Assigned To**: backend-developer
**Tasks in Batch**: 2
**Dependencies**: Batch 2 complete
**Estimated Commits**: 1

### Task 3.1: Add Approver Auth to @RequiresApproval Decorator ⏸️ PENDING

**File(s)**: `d:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\decorators\approval.decorator.ts`
**Specification Reference**: implementation-plan.md:241-379
**Pattern to Follow**: hitl-auth-analysis.md:113-163
**Expected Commit Pattern**: `feat(hitl): add approver authorization to requires-approval decorator`

**Quality Requirements**:

- ✅ Add `approverAuth` field to `RequiresApprovalOptions`
- ✅ Extract user context from `RunnableConfig`
- ✅ Store approver auth requirements in state
- ✅ Accept `config?: RunnableConfig` parameter

**Implementation Details**:

- **New Interface Field**:
  ```typescript
  approverAuth?: {
    roles?: string[];
    permissions?: string[];
    tiers?: ('free' | 'pro' | 'enterprise')[];
    requireChainMembership?: boolean;
  };
  ```
- **Imports to Add**:
  ```typescript
  import { UnauthorizedException } from '@nestjs/common';
  import { WorkflowAuthContextService } from '@hive-academy/langgraph-workflow-engine';
  ```
- **Decorator Modification**: Accept `config?: RunnableConfig`, extract user, store approver auth in state

---

### Task 3.2: Implement Approver Validation in HumanApprovalService ⏸️ PENDING

**File(s)**: `d:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\human-approval.service.ts`
**Dependencies**: Task 3.1 (must complete first)
**Pattern to Follow**: hitl-auth-analysis.md:212-258

**Quality Requirements**:

- ✅ Add `approverContext?: UserContext` parameter to `processApproval()`
- ✅ Validate approver roles
- ✅ Validate approver permissions
- ✅ Validate approval chain membership
- ✅ Throw `UnauthorizedException` if validation fails

**Implementation Details**:

- **Method Signature Update**:
  ```typescript
  async processApproval(
    executionId: string,
    approved: boolean,
    feedback?: string,
    approverContext?: UserContext
  ): Promise<void>
  ```
- **Validation Logic**:
  - Check `approverContext` exists
  - Validate roles match `approvalMetadata.roles`
  - Validate permissions match `approvalMetadata.permissions`
  - Validate approver in approval chain if `requireChainMembership`

---

**Batch 3 Verification Requirements**:

- ✅ Decorator accepts config and stores approver auth
- ✅ Service validates approver before processing
- ✅ One git commit for entire batch
- ✅ Build passes: `npx nx build @hive-academy/langgraph-hitl`
- ✅ No compilation errors

---

## Batch 4: SSE Authentication Infrastructure ⏸️ PENDING

**Assigned To**: backend-developer
**Tasks in Batch**: 4
**Dependencies**: Batch 3 complete
**Estimated Commits**: 1

### Task 4.1: Create TicketService ⏸️ PENDING

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\auth\services\ticket.service.ts`
**Specification Reference**: implementation-plan.md:386-451
**Pattern to Follow**: Redis-backed short-lived ticket pattern
**Expected Commit Pattern**: `feat(auth): add sse ticket service for short-lived tokens`

**Quality Requirements**:

- ✅ Generate cryptographically secure tickets (crypto.randomBytes)
- ✅ Store in Redis with 30s TTL
- ✅ Single-use enforcement (delete after validation)
- ✅ Return user context on validation

**Implementation Details**:

- **Imports**:
  ```typescript
  import { Injectable } from '@nestjs/common';
  import { RedisService } from '@hive-academy/nestjs-redis';
  import { randomBytes } from 'crypto';
  ```
- **Methods**:
  - `create(userId: string, tenantId: string): Promise<string>`
  - `validateAndConsume(ticket: string): Promise<{ userId: string; tenantId: string } | null>`
- **Redis Key Pattern**: `sse:ticket:${ticket}`

---

### Task 4.2: Register TicketService in AuthModule ⏸️ PENDING

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\auth\auth.module.ts`
**Dependencies**: Task 4.1 (must complete first)

**Quality Requirements**:

- ✅ Add `TicketService` to providers array
- ✅ Export `TicketService` for use in controllers

**Implementation Details**:

- **Action**: Add to `@Module({ providers: [..., TicketService], exports: [TicketService] })`

---

### Task 4.3: Add Stream Ticket Endpoint to AuthController ⏸️ PENDING

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\auth\auth.controller.ts`
**Dependencies**: Task 4.2 (must complete first)
**Specification Reference**: implementation-plan.md:454-495

**Quality Requirements**:

- ✅ Protected by `@UseGuards(JwtAuthGuard)`
- ✅ Extract user from `req.user`
- ✅ Return `{ ticket: string }`

**Implementation Details**:

- **Endpoint**: `POST /auth/stream/ticket`
- **Implementation**:
  ```typescript
  @Post('stream/ticket')
  @UseGuards(JwtAuthGuard)
  async generateStreamTicket(@Request() req) {
    const ticket = await this.ticketService.create(req.user.userId, req.user.tenantId);
    return { ticket };
  }
  ```

---

### Task 4.4: Enhance QueryTokenAuthGuard with Ticket Validation ⏸️ PENDING

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\auth\guards\query-token.guard.ts`
**Dependencies**: Task 4.3 (must complete first)
**Specification Reference**: implementation-plan.md:498-564

**Quality Requirements**:

- ✅ Extract ticket from `req.query.token`
- ✅ Validate and consume via `TicketService`
- ✅ Attach user to `req.user`
- ✅ Throw `UnauthorizedException` if invalid

**Implementation Details**:

- **Inject**: `TicketService` in constructor
- **Logic**:
  ```typescript
  const ticket = request.query.token as string;
  const ticketData = await this.ticketService.validateAndConsume(ticket);
  if (!ticketData) {
    throw new UnauthorizedException('Invalid or expired ticket');
  }
  request.user = { userId: ticketData.userId, tenantId: ticketData.tenantId };
  ```

---

**Batch 4 Verification Requirements**:

- ✅ TicketService created and registered
- ✅ Ticket endpoint protected by JwtAuthGuard
- ✅ QueryTokenAuthGuard validates tickets
- ✅ One git commit for entire batch
- ✅ Build passes: `npx nx build dev-brand-api`

---

## Batch 5: Enhanced Decorator Auth (Tool & Agent) ⏸️ PENDING

**Assigned To**: backend-developer
**Tasks in Batch**: 2
**Dependencies**: Batch 4 complete
**Estimated Commits**: 1

### Task 5.1: Add Tier-Based Auth to @Tool Decorator ⏸️ PENDING

**File(s)**: `d:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\decorators\multi-agent\tool.decorator.ts`
**Specification Reference**: implementation-plan.md:622-677
**Pattern to Follow**: decorator-analysis-addendum.md:206-287
**Expected Commit Pattern**: `feat(workflow-engine): add tier-based auth to tool decorator`

**Quality Requirements**:

- ✅ Add `auth` field to `ToolConfig` interface
- ✅ Support tier-based restrictions (`free`, `pro`, `enterprise`)
- ✅ Return LLM-friendly error messages on auth failure

**Implementation Details**:

- **New Interface Field**:
  ```typescript
  auth?: {
    required?: boolean;
    roles?: string[];
    tiers?: ('free' | 'pro' | 'enterprise')[];
    permissions?: string[];
  };
  ```
- **Enforcement Point**: Tool execution wrapper in graph compiler

---

### Task 5.2: Add Tier-Based Auth to @Agent Decorator ⏸️ PENDING

**File(s)**: `d:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\decorators\multi-agent\agent.decorator.ts`
**Dependencies**: Task 5.1 (must complete first)
**Specification Reference**: implementation-plan.md:680-730

**Quality Requirements**:

- ✅ Add `auth` field to `AgentConfig` interface
- ✅ Support tier-based restrictions
- ✅ Enforce in multi-agent coordinator

**Implementation Details**:

- **New Interface Field**: Same structure as `@Tool` auth
- **Enforcement Point**: Multi-agent coordinator service before routing

---

**Batch 5 Verification Requirements**:

- ✅ Both decorators support auth field
- ✅ Tier-based restrictions implemented
- ✅ One git commit for entire batch
- ✅ Build passes: `npx nx build @hive-academy/langgraph-workflow-engine`

---

## Batch 6: Integration Test Suite ⏸️ PENDING

**Assigned To**: backend-developer
**Tasks in Batch**: 7
**Dependencies**: Batch 5 complete
**Estimated Commits**: 1

### Task 6.1: ChromaDB Multi-Tenancy Test ⏸️ PENDING

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\auth\tests\integration\chromadb-multi-tenancy.spec.ts`
**Specification Reference**: implementation-plan.md:737-778
**Expected Commit Pattern**: `test(auth): add comprehensive integration test suite`

**Quality Requirements**:

- ✅ Use real ChromaDB service
- ✅ Test cross-tenant access denial
- ✅ Verify tenant filter injection

---

### Task 6.2: Neo4j Context Isolation Test ⏸️ PENDING

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\auth\tests\integration\neo4j-context-isolation.spec.ts`
**Dependencies**: Task 6.1 (must complete first)

**Quality Requirements**:

- ✅ Use real Neo4j service
- ✅ Test thread ownership enforcement
- ✅ Verify 403 on unauthorized access

---

### Task 6.3: LangGraph Workflow Auth Test ⏸️ PENDING

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\auth\tests\integration\langgraph-workflow-auth.spec.ts`
**Dependencies**: Task 6.2 (must complete first)

**Quality Requirements**:

- ✅ Test user context propagation through deep workflows
- ✅ Verify `@Entrypoint` auth enforcement
- ✅ Test role/permission validation

---

### Task 6.4: Memory Store Isolation Test ⏸️ PENDING

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\auth\tests\integration\memory-store-isolation.spec.ts`
**Dependencies**: Task 6.3 (must complete first)

**Quality Requirements**:

- ✅ Test user-scoped namespace isolation
- ✅ Verify cross-user memory access denial

---

### Task 6.5: SSE Authentication Test ⏸️ PENDING

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\auth\tests\integration\sse-authentication.spec.ts`
**Dependencies**: Task 6.4 (must complete first)

**Quality Requirements**:

- ✅ Test ticket generation
- ✅ Test ticket expiration (30s)
- ✅ Test single-use enforcement
- ✅ Test ownership verification

---

### Task 6.6: Decorator Auth Enforcement Test ⏸️ PENDING

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\auth\tests\integration\decorator-auth-enforcement.spec.ts`
**Dependencies**: Task 6.5 (must complete first)

**Quality Requirements**:

- ✅ Test all decorators with auth enforcement
- ✅ Test `@Entrypoint`, `@Task`, `@Node`, `@Tool`, `@Agent`
- ✅ Verify role/permission/tier restrictions

---

### Task 6.7: HITL Approver Authorization Test ⏸️ PENDING

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\auth\tests\integration\hitl-approver-authorization.spec.ts`
**Dependencies**: Task 6.6 (must complete first)

**Quality Requirements**:

- ✅ Test approver role validation
- ✅ Test approval chain membership
- ✅ Test unauthorized approval attempts

---

**Batch 6 Verification Requirements**:

- ✅ All 7 integration tests created
- ✅ All tests use real services (Neo4j, ChromaDB, Redis)
- ✅ 80% coverage achieved
- ✅ One git commit for entire batch
- ✅ All tests pass: `npx nx test dev-brand-api`

---

## Batch Execution Protocol

**For Each Batch**:

1. Team-leader assigns entire batch to developer
2. Developer executes ALL tasks in batch (in order)
3. Developer stages files progressively (git add after each task)
4. Developer creates ONE commit for entire batch
5. Developer returns with batch git commit SHA
6. Team-leader verifies entire batch
7. If verification passes: Assign next batch
8. If verification fails: Create fix batch

**Commit Strategy**:

- ONE commit per batch (not per task)
- Commit message follows conventional commits format
- Avoids running pre-commit hooks multiple times

**Completion Criteria**:

- All batch statuses are "✅ COMPLETE"
- All batch commits verified
- All files exist
- Build passes
- Tests pass (80% coverage)
