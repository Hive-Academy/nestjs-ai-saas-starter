# Decorator Analysis Addendum - TASK_2025_054

## Comprehensive Decorator Auth Integration Analysis

Based on user request to scan all decorators for auth/guard integration possibilities.

---

## Complete Decorator Inventory

**Total Decorators**: 9

**Functional Decorators** (6):

1. `@FunctionalWorkflow` - Class decorator
2. `@Node` - Method decorator (node-based pattern)
3. `@Task` - Method decorator (task-based pattern)
4. `@LLMTask` - Method decorator (task-based pattern, wraps @Task)
5. `@Entrypoint` - Method decorator (task-based pattern)
6. `@Edge` - Method decorator (routing logic)

**Multi-Agent Decorators** (3): 7. `@Agent` - Class decorator 8. `@MultiAgent` - Class decorator 9. `@Tool` - Method decorator

---

## Detailed Auth Integration Analysis

### 1. @FunctionalWorkflow (Class Decorator)

**Current State**: No auth support

**Integration Opportunity**: **MEDIUM PRIORITY**

**Rationale**:

- Class-level decorator applied once at instantiation
- Auth enforcement happens at:
  - **Controller level**: `@UseGuards(JwtAuthGuard)` on endpoints
  - **Workflow invocation**: User context passed via `RunnableConfig`
- Adding auth requirements here would be **workflow-wide** policy

**Proposed Enhancement**:

```typescript
export interface WorkflowOptions {
  // ... existing fields

  /**
   * Workflow-wide auth requirements
   * Applied whenever workflow is invoked
   */
  auth?: {
    /** Require authentication for all tasks/nodes */
    required?: boolean;
    /** Roles required to invoke this workflow */
    roles?: string[];
    /** Tier restrictions */
    tiers?: ('free' | 'pro' | 'enterprise')[];
  };
}

@FunctionalWorkflow({
  name: 'premium-workflow',
  auth: { required: true, tiers: ['pro', 'enterprise'] },
})
export class PremiumWorkflow {}
```

**Usage**: Validate at workflow invocation time before creating LangGraph

**Benefits**:

- Prevents workflow compilation if user unauthorized
- Clear documentation of workflow access requirements
- Fail-fast approach

---

### 2. @Edge (Routing Decorator)

**Current State**: No auth support (routing logic only)

**Integration Opportunity**: **LOW PRIORITY / NOT APPLICABLE**

**Rationale**:

- Edges are **routing conditions**, not execution units
- No execution context (state, config)
- Auth enforcement belongs in **source/target nodes**

**Example**:

```typescript
// Auth enforced in nodes, not edges
@Node({ auth: { required: true, roles: ['admin'] } })
async process(state, config) {}

@Edge('analyze', 'process') // No auth needed - process node enforces
shouldProcess(state) { return state.ready; }
```

**Conclusion**: No auth integration needed

---

### 3. @Agent (Class Decorator)

**Current State**: No auth support

**Integration Opportunity**: **HIGH PRIORITY**

**Rationale**:

- Multi-agent workflows invoke agents dynamically
- **Supervisor** selects agents based on task
- Need **agent-level authorization**:
  - Which users can invoke this agent?
  - Which roles are required?
  - Tier-based agent access (e.g., premium agents)

**Proposed Enhancement**:

```typescript
export interface AgentConfig {
  // ... existing fields

  /**
   * Agent-level auth requirements
   * Controls who can invoke this agent in multi-agent workflows
   */
  auth?: {
    /** Require authentication to invoke this agent */
    required?: boolean;
    /** Roles required to use this agent */
    roles?: string[];
    /** Tier restrictions */
    tiers?: ('free' | 'pro' | 'enterprise')[];
    /** Permissions required */
    permissions?: string[];
  };
}

@Agent({
  description: 'Premium strategy generator',
  auth: { required: true, tiers: ['pro', 'enterprise'] },
})
export class PremiumStrategyAgent {}
```

**Enforcement Point**: Multi-agent coordinator/supervisor

```typescript
// In supervisor before routing to agent
const agent = this.registry.getAgent(selectedAgentId);
const agentConfig = getAgentConfig(agent.constructor);

if (agentConfig.auth?.required) {
  const user = WorkflowAuthContextService.extractUserContext(config);
  if (!user) {
    throw new UnauthorizedException(`Agent requires authentication`);
  }

  if (agentConfig.auth.tiers && !agentConfig.auth.tiers.includes(user.tier)) {
    throw new UnauthorizedException(`Agent requires ${agentConfig.auth.tiers.join(' or ')} tier`);
  }
}
```

---

### 4. @MultiAgent (Class Decorator)

**Current State**: No auth support

**Integration Opportunity**: **MEDIUM PRIORITY**

**Rationale**:

- Configures multi-agent coordination topology
- Supervisor can enforce auth before delegating to workers
- Can inherit auth from `@FunctionalWorkflow` if both applied

**Proposed Enhancement**:

```typescript
@MultiAgent({
  type: 'supervisor',
  supervisor: {
    workers: ['github-analyzer', 'content-creator'],
    auth: {
      // Auth inherited by all workers in this topology
      required: true,
      roles: ['user'],
    },
  },
})
@FunctionalWorkflow({
  name: 'multi-agent-workflow',
  auth: { required: true }, // Workflow-level auth
})
export class SupervisorWorkflow {}
```

---

### 5. @Tool (Method Decorator)

**Current State**: No auth support

**Integration Opportunity**: **HIGH PRIORITY**

**Rationale**:

- Tools are invoked by LLMs autonomously
- **Security risk**: Sensitive tools (e.g., database writes, external API calls)
- Need **tool-level authorization**:
  - Which users can call this tool?
  - Tier-based tool access
  - Permission-based restrictions

**Proposed Enhancement**:

```typescript
export interface ToolConfig {
  // ... existing fields

  /**
   * Tool-level auth requirements
   * Controls who can call this tool
   */
  auth?: {
    /** Require authentication to call this tool */
    required?: boolean;
    /** Roles required to use this tool */
    roles?: string[];
    /** Tier restrictions */
    tiers?: ('free' | 'pro' | 'enterprise')[];
    /** Permissions required */
    permissions?: string[];
  };
}

@Injectable()
export class DatabaseTools {
  @Tool({
    name: 'database_write',
    auth: { required: true, roles: ['admin'], permissions: ['db:write'] },
  })
  async writeToDatabase(query: string) {
    // Sensitive operation
  }

  @Tool({
    name: 'web_search',
    auth: { required: true, tiers: ['pro', 'enterprise'] },
  })
  async searchWeb(query: string) {
    // Premium feature
  }
}
```

**Enforcement Point**: LangGraph `ToolNode` wrapper

```typescript
// In ToolNode execution
const toolMetadata = getToolMetadata(toolFunction);

if (toolMetadata.auth?.required) {
  const user = WorkflowAuthContextService.extractUserContext(config);

  if (!user) {
    return {
      error: 'Tool requires authentication',
      name: toolMetadata.name,
    };
  }

  if (toolMetadata.auth.roles && !toolMetadata.auth.roles.some((r) => user.roles.includes(r))) {
    return {
      error: `Tool requires roles: ${toolMetadata.auth.roles.join(', ')}`,
      name: toolMetadata.name,
    };
  }
}
```

---

## Priority Summary

| Decorator             | Auth Integration Priority | Justification                                      |
| --------------------- | ------------------------- | -------------------------------------------------- |
| `@Tool`               | **HIGH**                  | Security risk - tools perform sensitive operations |
| `@Agent`              | **HIGH**                  | Premium agents, tier-based access control          |
| `@Entrypoint`         | **HIGH** (CRITICAL BUG)   | Workflow entry point has ZERO auth enforcement     |
| `@FunctionalWorkflow` | **MEDIUM**                | Workflow-wide policy, fail-fast validation         |
| `@MultiAgent`         | **MEDIUM**                | Topology-level auth inheritance                    |
| `@Task`               | ✅ **COMPLETE**           | Already implemented                                |
| `@Node`               | ✅ **COMPLETE**           | Already implemented                                |
| `@LLMTask`            | ✅ **COMPLETE**           | Inherits from @Task                                |
| `@Edge`               | ❌ **N/A**                | Routing logic, no execution context                |

---

## Guard Integration Analysis

### Controller-Level Guards

**Current**: `@UseGuards(JwtAuthGuard)` on HTTP endpoints

**Purpose**: Validate JWT from HTTP-only cookies, populate `req.user`

**Coverage**: 7 endpoints in `research-chat.controller.ts`

**Gap**: SSE endpoints have NO guards

---

### Proposed: @UseGuards Integration in Decorators

**Concept**: Allow decorators to enforce NestJS guards

**Challenge**: Decorators run at **graph compilation time**, not **request time**

**Solution**: Store guard metadata, enforce at execution time

**Example**:

```typescript
@Task({
  auth: { required: true, roles: ['admin'] },
  guards: [JwtAuthGuard, RolesGuard] // NEW: NestJS guard integration
})
async sensitiveTask(context: TaskExecutionContext) {}
```

**Implementation**:

```typescript
// In task execution strategy
const taskMetadata = getTaskMetadata(workflow, taskName);

if (taskMetadata.guards) {
  // Create execution context from workflow config
  const executionContext = createExecutionContext(context.config);

  for (const GuardClass of taskMetadata.guards) {
    const guard = new GuardClass();
    const canActivate = await guard.canActivate(executionContext);

    if (!canActivate) {
      throw new UnauthorizedException('Guard failed');
    }
  }
}
```

**Complexity**: HIGH - requires bridging LangGraph execution context to NestJS ExecutionContext

**Recommendation**: **NOT RECOMMENDED** - Use declarative `auth` field instead

---

## Recommended Implementation Order

Per user request to scan for guard/auth integration possibilities:

### Phase 5A: Complete Decorator Auth (HIGH PRIORITY)

1. ✅ **@Entrypoint** - Add auth field (CRITICAL BUG FIX)
2. ✅ **@Tool** - Add auth enforcement (SECURITY)
3. ✅ **@Agent** - Add tier-based agent access (PREMIUM FEATURES)

### Phase 5B: SSE Authentication (HIGH PRIORITY)

4. ✅ **QueryTokenAuthGuard** - Short-lived ticket pattern

### Phase 5C: Workflow-Level Auth (MEDIUM PRIORITY)

5. ⏸️ **@FunctionalWorkflow** - Workflow-wide auth requirements
6. ⏸️ **@MultiAgent** - Topology-level auth inheritance

### Phase 5D: Testing (MEDIUM PRIORITY)

7. ⏸️ Integration tests for all auth-enabled decorators

---

## Code Examples

### 1. Tool Auth Enforcement

```typescript
// Tool definition with auth
@Injectable()
export class PremiumTools {
  @Tool({
    name: 'advanced_analytics',
    description: 'Run machine learning analytics',
    auth: {
      required: true,
      tiers: ['pro', 'enterprise'],
      permissions: ['analytics:read'],
    },
  })
  async runAnalytics(data: any) {
    return this.mlService.analyze(data);
  }
}

// Tool execution wrapper
async function executeToolWithAuthCheck(tool, input, config) {
  const toolMetadata = getToolMetadata(tool);

  if (toolMetadata.auth?.required) {
    const user = WorkflowAuthContextService.extractUserContext(config);

    if (!user) {
      throw new ToolAuthException('Tool requires authentication');
    }

    if (toolMetadata.auth.tiers && !toolMetadata.auth.tiers.includes(user.tier)) {
      throw new ToolAuthException(`Tool requires ${toolMetadata.auth.tiers.join('/')} tier`);
    }

    if (toolMetadata.auth.permissions) {
      const hasPermission = toolMetadata.auth.permissions.every((p) =>
        user.permissions?.includes(p)
      );
      if (!hasPermission) {
        throw new ToolAuthException('Insufficient permissions');
      }
    }
  }

  return tool(input);
}
```

### 2. Agent Auth Enforcement

```typescript
// Agent definition with tier restriction
@Agent({
  description: 'Premium brand strategy generator',
  tools: ['web_search', 'competitor_analysis'],
  auth: {
    required: true,
    tiers: ['pro', 'enterprise'],
    roles: ['user'],
  },
})
export class PremiumStrategyAgent {}

// Supervisor routing with auth check
async function routeToAgent(agentId: string, state, config) {
  const agent = this.registry.getAgent(agentId);
  const agentConfig = getAgentConfig(agent.constructor);

  if (agentConfig.auth) {
    const user = WorkflowAuthContextService.extractUserContext(config);

    if (!user && agentConfig.auth.required) {
      throw new UnauthorizedException('Agent requires authentication');
    }

    if (agentConfig.auth.tiers && !agentConfig.auth.tiers.includes(user.tier)) {
      // Route to upgrade prompt or fallback agent
      return this.routeToFreeAlternative(agentId, state, config);
    }
  }

  return agent.execute(state, config);
}
```

---

## References

**Codebase Files Analyzed**:

- `libs/langgraph-modules/workflow-engine/src/lib/decorators/functional/*.decorator.ts` (6 files)
- `libs/langgraph-modules/workflow-engine/src/lib/decorators/multi-agent/*.decorator.ts` (3 files)
- `libs/langgraph-modules/workflow-engine/src/lib/services/auth-context.service.ts`
- `apps/dev-brand-api/src/app/auth/guards/jwt-auth.guard.ts`

**Key Findings**:

1. **9 total decorators** scanned
2. **3 have auth** (@Node, @Task, @LLMTask)
3. **1 CRITICAL GAP** (@Entrypoint)
4. **2 HIGH-PRIORITY additions** (@Tool, @Agent)
5. **2 MEDIUM-PRIORITY additions** (@FunctionalWorkflow, @MultiAgent)

---

This addendum should be integrated into the main research-findings.md document as Section 1.5 "Comprehensive Decorator Analysis".
