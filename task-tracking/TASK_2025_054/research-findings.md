# Research Findings - TASK_2025_054

## Authentication & Authorization Deep Dive

**Research Date**: 2025-11-22  
**Researcher**: Elite Research Agent  
**Scope**: Comprehensive analysis of existing auth implementation, LangGraph patterns, SSE security, and gap identification

---

## Executive Summary

**CRITICAL FINDING**: The existing `workflow-engine` library already contains a **production-ready authentication system** (Phase 4 complete per `docs/auth-implementation-status.md`). The initial implementation attempt in Batch 1 created **redundant code** by duplicating:

1. `UserContext` interface (exists in `WorkflowAuthContextService`)
2. `extractUserContext()` helper (exists as static method in `WorkflowAuthContextService`)

**Key Recommendation**: **DELETE redundant code** and **complete Phase 5** with focus on:

1. Adding auth enforcement to `@Entrypoint` decorator (missing)
2. Implementing SSE authentication using **short-lived ticket pattern**
3. Testing multi-tenancy isolation (ChromaDB, Neo4j, Memory)
4. Rate limiting and audit logging

---

## 1. Existing Auth Implementation Analysis

### 1.1 WorkflowAuthContextService (Authoritative)

**Location**: `libs/langgraph-modules/workflow-engine/src/lib/services/auth-context.service.ts`

**Capabilities:**

```typescript
export interface UserContext {
  userId: string;
  tenantId: string;
  roles: string[];
  tier: 'free' | 'pro' | 'enterprise';
  permissions?: string[];
  email?: string;
  organizationId?: string;
}

@Injectable()
export class WorkflowAuthContextService {
  // Inject user context into RunnableConfig
  enrichConfig(config: RunnableConfig, user: UserContext): RunnableConfig;

  // Create new RunnableConfig with user
  createUserConfig(user: UserContext, metadata?: Record<string, any>): RunnableConfig;

  // Extract user from config (STATIC METHOD)
  static extractUserContext(config?: RunnableConfig): UserContext | undefined;

  // Generate scoped thread IDs
  createThreadId(tenantId: string, userId: string, workflowType: string): string;

  // Parse thread IDs for ownership verification
  parseThreadId(threadId: string): { tenantId; userId; type } | null;
}
```

**Storage Pattern**: `config.configurable.user`

### 1.2 Decorator Auth Enforcement

| Decorator     | Auth Support | Implementation Status                                                    |
| ------------- | ------------ | ------------------------------------------------------------------------ |
| `@Node`       | ✅ COMPLETE  | Lines 147-170, supports `auth: { required, roles, permissions }`         |
| `@Task`       | ✅ COMPLETE  | Lines 130-161, supports `auth: { required, roles }`                      |
| `@LLMTask`    | ✅ INHERITED | Wraps `@Task` internally (line 223), gets auth enforcement automatically |
| `@Entrypoint` | ❌ MISSING   | **NO AUTH ENFORCEMENT WHATSOEVER**                                       |
| `@Edge`       | ⚠️ N/A       | Routing logic, no execution context                                      |
| `@Workflow`   | ⚠️ N/A       | Class-level decorator, config at invoke time                             |

**Auth Enforcement Pattern:**

```typescript
// From @Node decorator (lines 147-170)
if (nodeMetadata.auth?.required) {
  const config = args[1]; // LangGraph passes (state, config)
  const user = WorkflowAuthContextService.extractUserContext(config);

  if (!user) {
    throw new UnauthorizedException(`Node ${id} requires authentication`);
  }

  if (auth.roles && !auth.roles.some((r) => user.roles.includes(r))) {
    throw new UnauthorizedException(`User missing required roles`);
  }
}
```

### 1.3 Thread ID Scoping (Production Ready)

**Format**: `{tenantId}::{userId}::{type}::{randomId}`

**Example**: `org_abc123::user_xyz789::research::Kp2x9dF4mN1Q`

**Benefits**:

- `::` separator safely handles underscores in IDs
- Tenant isolation at ID level
- Ownership verification (parseThreadId)
- Collision-resistant (NanoID)

### 1.4 Controller Integration

**Pattern** (from `research-chat.controller.ts`):

```typescript
@UseGuards(JwtAuthGuard) // HTTP-only cookie auth
async startResearch(@Request() req) {
  const user = req.user; // RequestUser from JWT

  // Create user-scoped config
  const config = this.authContext.createUserConfig({
    userId: user.userId,
    tenantId: user.tenantId,
    roles: user.roles,
    tier: user.tier,
    permissions: user.permissions,
  });

  // Generate scoped thread
  const threadId = this.authContext.createThreadId(
    user.tenantId, user.userId, 'research'
  );

  // Execute workflow with user context
  return this.agent.executeWithStreaming(input, config);
}
```

**Guards Used**: `JwtAuthGuard` on 7 endpoints (lines 115, 355, 453, 483, 561, 633, 725)

**SSE Endpoints**: NO AUTH (relying on thread ID ownership check only)

---

## 2. LangGraph Best Practices (from LangChain MCP)

### 2.1 RunnableConfig Context Propagation

**Source**: LangChain Docs - Nest Traces

**Key Pattern**:

```typescript
// CORRECT: Pass config down to child runnables
@RunnableLambda
async function childNode(state: State, config: RunnableConfig) {
  // Config flows automatically - includes user context
  return { output };
}

@RunnableLambda
async function parentNode(state: State, config: RunnableConfig) {
  // Pass config to children
  const result = await childNode.invoke(state, config);
  return result;
}
```

**LangGraph Node Signature**:

```typescript
function myNode(
  state: State, // Graph state
  config: RunnableConfig, // Contains thread_id, user context, tags
  runtime: Runtime // Contains store, stream_writer
): Partial<State>;
```

**Context Storage Pattern**:

```typescript
// LangGraph convention
config.configurable.user = { userId, tenantId, roles };
config.configurable.thread_id = 'scoped-id';
```

**Best Practice**: Use dataclasses for custom context:

```typescript
@dataclass
class AppContext {
  user_id: string;
  tenant_id: string;
}

// Access in nodes via runtime
function node(state: State, runtime: Runtime<AppContext>) {
  console.log('User:', runtime.context.user_id);
}
```

### 2.2 Multi-Tenancy in LangGraph

**Pattern**: Store tenant context in `RunnableConfig.configurable`

**Isolation**: Each workflow invocation gets isolated config

**Checkpointing**: User context persists across checkpoints

---

## 3. SSE Authentication Security (Web Research)

### 3.1 EventSource Limitations

**Problem**: `EventSource` API does NOT support custom headers

**Impact**: Cannot use `Authorization: Bearer <token>` header

**Available Options**:

1. Cookie-based auth
2. Query parameter tokens
3. Polyfills (`fetch-event-source`)
4. WebSockets (requires protocol change)

### 3.2 Short-Lived Ticket Token Pattern (RECOMMENDED)

**Source**: Stack Overflow, security blogs (2024)

**Flow**:

```
1. Client authenticates → receives short-lived ticket (API call)
2. Client opens SSE: new EventSource(`/stream?ticket=SHORT_LIVED`)
3. Server validates ticket → invalidates immediately → starts stream
4. Server sends long-lived session token in initial SSE event (id field)
5. On reconnect, EventSource sends Last-Event-ID with session token
6. Server validates session token → resumes stream
```

**Security Benefits**:

- Ticket expires in seconds (e.g., 30s)
- Single-use (invalidated after first connection)
- If intercepted, window of opportunity is minimal
- Session token never in URL (only in Last-Event-ID header)

**Implementation Sketch**:

```typescript
// Step 1: Generate ticket endpoint
@Post('stream/ticket')
@UseGuards(JwtAuthGuard)
async generateStreamTicket(@Request() req) {
  const ticket = await this.ticketService.create({
    userId: req.user.userId,
    expiresAt: Date.now() + 30000, // 30s
    singleUse: true,
  });
  return { ticket: ticket.id };
}

// Step 2: SSE endpoint with ticket auth
@Sse('stream/:executionId')
async streamWorkflow(@Query('ticket') ticket: string, @Param('executionId') id: string) {
  // Validate and consume ticket
  const user = await this.ticketService.validateAndConsume(ticket);

  // Send session token in first event
  const sessionToken = this.jwt.sign({ userId: user.userId }, { expiresIn: '1h' });
  yield { id: sessionToken, data: { type: 'init' } };

  // Stream events...
}
```

### 3.3 Cookie vs Query Parameter Comparison

| Method                               | Pros                                          | Cons                                                    | Security Risk                  |
| ------------------------------------ | --------------------------------------------- | ------------------------------------------------------- | ------------------------------ |
| Cookie                               | Automatic, simple, CSRF protection (SameSite) | Requires session state, not for non-browser clients     | Medium (CSRF if misconfigured) |
| Query Parameter (long-lived)         | Works with EventSource                        | **Logged in servers, browser history, referer headers** | **HIGH**                       |
| Query Parameter (short-lived ticket) | EventSource compatible, ticket expires fast   | Requires 2-step auth flow                               | **LOW**                        |
| Polyfill (fetch-event-source)        | Custom headers supported                      | Client-side complexity, not native EventSource          | LOW                            |

**Recommendation**: Short-lived ticket for SSE, transition to polyfill long-term

---

## 4. Gap Analysis

### 4.1 Missing Auth Enforcement

**Critical Gap**: `@Entrypoint` decorator has NO auth enforcement

**Impact**: Workflows can start without authentication if using `@Entrypoint`

**Current Code** (lines 63-107 in `entrypoint.decorator.ts`):

```typescript
export function Entrypoint(options: EntrypointOptions = {}): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const metadata: EntrypointMetadata = {
      name: options.name ?? methodName,
      methodName,
      isEntrypoint: true,
      timeout: options.timeout ?? 30000,
      retryCount: options.retryCount ?? 3,
      errorHandler: options.errorHandler ?? '',
      metadata: options.metadata ?? {}, // NO AUTH FIELD
    };

    // NO DESCRIPTOR WRAPPING FOR AUTH CHECK
    return descriptor;
  };
}
```

**Required Changes**:

1. Add `auth?: { required, roles, permissions }` to `EntrypointOptions`
2. Wrap `descriptor.value` to enforce auth check
3. Extract user from `TaskExecutionContext.config`
4. Match pattern from `@Task` decorator (lines 130-161)

### 4.2 SSE Endpoint Security

**Current State** (from grep search):

```typescript
// research-chat.controller.ts - NO GUARD ON SSE
@Sse('stream/:id')
async streamWorkflow(@Param('id') executionId: string) {
  // Relies ONLY on thread ID ownership check
  const metadata = this.threadRegistry.getMetadata(executionId);
  if (metadata.userId !== /* ??? */) { // NO USER CONTEXT
    throw new UnauthorizedException();
  }
}
```

**Gap**: No authentication guard, relies on thread registry ownership

**Risk**: If thread ID is leaked, unauthorized access possible

### 4.3 Missing Testing (from Phase 5)

**ChromaDB Multi-Tenancy**:

- ✅ `@TenantAware` decorator exists (`nestjs-chromadb` library)
- ❌ NOT CONFIGURED to extract from `request.user.tenantId`
- ❌ NO TESTS verifying cross-tenant isolation

**Neo4j Context**:

- ✅ `@TenantIsolated`, `@RequireTenantFeatures` decorators exist
- ❌ NO TESTS with JWT integration
- ❌ NO TESTS for thread ownership enforcement

**LangGraph Workflows**:

- ✅ Auth enforcement in `@Node` and `@Task`
- ❌ NO END-TO-END TESTS with multi-step workflows
- ❌ NO TESTS for HITL user-awareness

**Memory Store**:

- ✅ Thread ID scoping implemented
- ❌ NO TESTS for user-scoped isolation
- ❌ NO TESTS preventing cross-user memory access

### 4.4 Missing Features (from Phase 5)

**Rate Limiting**:

- ❌ NO per-tenant rate limits
- ❌ NO per-user rate limits
- ❌ NO tier-based limits (free/pro/enterprise)

**Audit Logging**:

- ❌ NO authentication event logging
- ❌ NO authorization failure logging
- ❌ NO sensitive operation logging

---

## 5. Recommended Implementation Plan

### 5.1 Cleanup Phase (IMMEDIATE)

**Action 1**: Delete redundant code from Batch 1

```bash
# Remove duplicates
rm libs/langgraph-modules/core/src/lib/interfaces/user-context.interface.ts
rm libs/langgraph-modules/core/src/lib/utils/auth-context.helper.ts

# Update exports
# Remove exports from libs/langgraph-modules/core/src/index.ts
```

**Action 2**: Keep only `QueryTokenAuthGuard`

```typescript
// apps/dev-brand-api/src/app/auth/guards/query-token.guard.ts
// This is the ONLY valid artifact from Batch 1
```

### 5.2 Phase 5A: Complete Decorator Auth (HIGH PRIORITY)

**Task 1**: Add auth to `@Entrypoint` decorator

**File**: `libs/langgraph-modules/workflow-engine/src/lib/decorators/functional/entrypoint.decorator.ts`

**Changes**:

```typescript
export interface EntrypointOptions {
  readonly name?: string;
  readonly timeout?: number;
  readonly retryCount?: number;
  readonly errorHandler?: string;
  readonly metadata?: Record<string, unknown>;

  // NEW: Add auth field
  readonly auth?: {
    required?: boolean;
    roles?: string[];
    permissions?: string[];
  };
}

export function Entrypoint(options: EntrypointOptions = {}): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const metadata: EntrypointMetadata = {
      // ... existing fields
      auth: options.auth ?? {}, // Store auth config
    };

    // NEW: Wrap descriptor for auth check
    const originalMethod = descriptor.value;
    descriptor.value = async function (this: any, ...args: any[]) {
      if (metadata.auth?.required) {
        const context = args[0]; // TaskExecutionContext
        const config = context?.config;
        const user = WorkflowAuthContextService.extractUserContext(config);

        if (!user) {
          throw new UnauthorizedException('Entrypoint requires authentication');
        }

        // Role check (same as @Task)
        if (metadata.auth.roles && !metadata.auth.roles.some((r) => user.roles.includes(r))) {
          throw new UnauthorizedException('User missing required roles');
        }
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
```

### 5.3 Phase 5B: SSE Authentication (HIGH PRIORITY)

**Task 2**: Implement short-lived ticket pattern

**Architecture**:

```
Client                           API
  |                               |
  | POST /api/stream/ticket      |
  |----------------------------->|
  |                               | (JwtAuthGuard validates)
  |                               | (Generate 30s ticket)
  |<-----------------------------|
  | { ticket: "TEMP_TOKEN" }     |
  |                               |
  | EventSource("/stream/:id?ticket=TEMP_TOKEN")
  |----------------------------->|
  |                               | (Validate ticket)
  |                               | (Invalidate ticket)
  |                               | (Start SSE stream)
  |<-----------------------------|
  | SSE: id: SESSION_TOKEN       |
  | SSE: data: {...}             |
  |                               |
```

**Files**:

1. **Ticket Service**: `apps/dev-brand-api/src/app/auth/services/ticket.service.ts`
2. **Ticket Controller**: `apps/dev-brand-api/src/app/auth/auth.controller.ts` (add endpoint)
3. **SSE Guard**: Use `QueryTokenAuthGuard` with ticket validation
4. **Controller Update**: Apply guard to SSE endpoints

### 5.4 Phase 5C: Testing (MEDIUM PRIORITY)

**Test Suite Structure**:

```
tests/integration/auth/
  ├── chromadb-multi-tenancy.spec.ts
  ├── neo4j-context-isolation.spec.ts
  ├── langgraph-workflow-auth.spec.ts
  ├── memory-store-isolation.spec.ts
  └── sse-authentication.spec.ts
```

**Key Test Cases**:

1. ChromaDB: User A cannot query User B's collections
2. Neo4j: Thread ownership enforcement
3. LangGraph: Deep workflow context propagation
4. Memory: User-scoped namespace isolation
5. SSE: Ticket expiration, invalidation, session resumption

### 5.5 Phase 5D: Rate Limiting & Audit (LOW PRIORITY)

**Rate Limiting**:

```typescript
// Use @nestjs/throttler
@Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 req/min
@Throttle({ tier: { limit: getUserLimit(req.user.tier), ttl: 60000 } })
```

**Audit Logging**:

```typescript
@Injectable()
export class AuditLoggerService {
  logAuth(event: 'login' | 'logout' | 'token_refresh', user: UserContext) {}
  logAuthzFailure(resource: string, user: UserContext, requiredRoles: string[]) {}
  logSensitiveOp(operation: string, user: UserContext, metadata: any) {}
}
```

---

## 6. Architecture Decisions

### 6.1 UserContext Location

**Decision**: Keep `UserContext` in `workflow-engine` library

**Rationale**:

- Already defined and used throughout decorators
- Centralized auth logic
- Avoid duplication in `langgraph-modules/core`

**Export**:

```typescript
// libs/langgraph-modules/workflow-engine/src/index.ts
export { UserContext } from './lib/services/auth-context.service';
export { WorkflowAuthContextService } from './lib/services/auth-context.service';
```

### 6.2 SSE Authentication Method

**Decision**: Short-lived ticket pattern (30s expiration)

**Rationale**:

- Balances security with EventSource compatibility
- Ticket exposure window is minimal
- Session token in Last-Event-ID header (not URL)
- Gradual migration path to polyfill

**Alternative Considered**: Cookie-based auth

**Rejected Because**:

- Requires session state (conflicts with stateless API design)
- Not suitable for non-browser clients
- Current JWT infrastructure is token-based

### 6.3 Decorator Auth Pattern

**Decision**: Consistent pattern across all decorators

**Required Fields**:

```typescript
auth?: {
  required?: boolean;
  roles?: string[];
  permissions?: string[];
}
```

**Enforcement Order**:

1. Check `required` (throw if no user context)
2. Check `roles` (throw if user missing ANY required role)
3. Check `permissions` (throw if user missing ANY required permission)

---

## 7. Code Examples

### 7.1 Entrypoint with Auth

```typescript
@FunctionalWorkflow({ name: 'secure-workflow' })
@Injectable()
export class SecureWorkflow {
  @Entrypoint({
    auth: { required: true, roles: ['admin'] },
  })
  async start(context: TaskExecutionContext) {
    // User automatically validated, roles checked
    const user = WorkflowAuthContextService.extractUserContext(context.config);
    return { state: { userId: user.userId, started: true } };
  }
}
```

### 7.2 SSE with Ticket Auth

**Client**:

```typescript
// Step 1: Get ticket
const { ticket } = await fetch('/api/stream/ticket', {
  method: 'POST',
  credentials: 'include', // Send JWT cookie
}).then((r) => r.json());

// Step 2: Open SSE
const eventSource = new EventSource(`/api/stream/${executionId}?ticket=${ticket}`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data);
};
```

**Server**:

```typescript
@Controller('stream')
export class StreamController {
  @Post('ticket')
  @UseGuards(JwtAuthGuard)
  async generateTicket(@Request() req) {
    return this.ticketService.create({
      userId: req.user.userId,
      expiresAt: Date.now() + 30000,
    });
  }

  @Sse(':id')
  @UseGuards(QueryTokenAuthGuard) // Validates ticket
  async stream(@Param('id') id: string, @Request() req) {
    // req.user populated by guard after ticket validation
    const user = req.user;

    // Send session token in first event
    const sessionToken = this.jwt.sign({ userId: user.userId });
    yield { id: sessionToken, data: { type: 'init' } };

    // Stream workflow events...
    for await (const event of this.executor.stream(id, user)) {
      yield { data: event };
    }
  }
}
```

---

## 8. Risk Assessment

| Risk                               | Probability | Impact   | Mitigation                                      |
| ---------------------------------- | ----------- | -------- | ----------------------------------------------- |
| Ticket interception (MITM)         | Low         | High     | **HTTPS mandatory**, 30s expiration, single-use |
| Session token leak (Last-Event-ID) | Low         | Medium   | 1h expiration, rotation on reconnect            |
| `@Entrypoint` bypass               | Medium      | High     | **Add auth enforcement immediately** (Phase 5A) |
| Cross-tenant data access           | Medium      | Critical | **Comprehensive testing** (Phase 5C)            |
| Token replay attacks               | Low         | Medium   | Invalidate ticket after first use, track usage  |

---

## 9. References

### Codebase

- `libs/langgraph-modules/workflow-engine/src/lib/services/auth-context.service.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/decorators/functional/*.decorator.ts`
- `apps/dev-brand-api/src/app/auth/guards/jwt-auth.guard.ts`
- `docs/auth-implementation-status.md`

### LangChain Docs

- LangGraph Nest Traces: Context propagation patterns
- RunnableConfig: `configurable` field usage
- Runtime context: Multi-tenancy with dataclasses

### Web Research

- Stack Overflow: SSE authentication patterns
- Security blogs: Short-lived ticket implementation
- Hahwul.com: EventSource CSRF vulnerabilities

---

## 10. Next Steps

**Immediate Actions** (for Architect):

1. **Review this research document** with user
2. **Delete redundant code** from Batch 1 (Cleanup Phase)
3. **Create comprehensive implementation plan** for Phase 5:
   - Phase 5A: Entrypoint auth
   - Phase 5B: SSE ticket pattern
   - Phase 5C: Integration testing
   - Phase 5D: Rate limiting & audit
4. **Decompose into atomic tasks** via Team Leader

**Architecture Validation Questions** (for user):

1. Approve short-lived ticket pattern for SSE?
2. Approve keeping `UserContext` in `workflow-engine` (no duplication)?
3. Priority order correct (5A → 5B → 5C → 5D)?
4. Any additional security requirements for ticket generation?
