# LangGraph Decorator Taxonomy - Complete Analysis

## 📊 Decorator Categories

### Category 1: **Core Workflow Patterns** (Mutually Exclusive)

#### Task-Based Pattern (Dependency-Driven)

- **@Entrypoint** - `functional-api/decorators/entrypoint.decorator.ts`
    - Single entry point per workflow
    - Method signature: `(context: TaskExecutionContext) => Promise<TaskExecutionResult>`
    - **Cannot** be mixed with @Node or @Edge

- **@Task** - `functional-api/decorators/task.decorator.ts`
    - Explicit dependencies via `dependsOn` option
    - Method signature: `(context: TaskExecutionContext) => Promise<TaskExecutionResult>`
    - **Cannot** be mixed with @Node or @Edge

#### Node-Based Pattern (Graph-Driven)

- **@Node** - `functional-api/decorators/node.decorator.ts`
    - Explicit node declaration with types (standard, condition, tool, llm, human)
    - Method signature: `(state: WorkflowState) => Promise<Partial<WorkflowState>>`
    - **Cannot** be mixed with @Entrypoint or @Task

- **@Edge** - `functional-api/decorators/edge.decorator.ts`
    - Explicit edge declarations with optional conditions
    - Method signature: `(state: WorkflowState) => boolean` (for conditional edges)
    - **Cannot** be mixed with @Entrypoint or @Task

### Category 2: **Class-Level Workflow Configuration** (Compatible with Both Patterns)

- **@Agent** - `multi-agent/decorators/agent.decorator.ts`
    - Agent registration and configuration
    - Can be used with either task-based or node-based workflows
    - Has `workflow` property for workflow-agent type configuration

- **@FunctionalWorkflow** - `functional-api/decorators/workflow.decorator.ts`
    - Workflow metadata and configuration
    - Compatible with both patterns
    - Aliased as `@Workflow` in functional-api exports

- **@Workflow** - `multi-agent/decorators/workflow.decorator.ts`
    - Different from functional-api's @FunctionalWorkflow
    - Used in multi-agent coordination
    - Compatible with both patterns

### Category 3: **Cross-Cutting Concerns** (Compatible with Both Patterns)

#### Tool Registration

- **@Tool** - `multi-agent/decorators/tool.decorator.ts`
    - Register methods as LangGraph tools
    - Can be used on methods in any workflow pattern
    - Schema validation via Zod
    - Supports streaming tools

#### Human-in-the-Loop

- **@RequiresApproval** - `hitl/decorators/approval.decorator.ts`
    - Method-level approval requirements
    - Compatible with both task-based and node-based methods
    - Risk assessment, approval chains, timeouts

#### Streaming

- **@StreamToken** - `streaming/decorators/streaming.decorator.ts`
    - Token-level streaming for LLM responses
    - Compatible with both patterns

- **@StreamProgress** - `streaming/decorators/streaming.decorator.ts`
    - Progress updates for workflow steps
    - Compatible with both patterns

- **@StreamEvent** - `streaming/decorators/streaming.decorator.ts`
    - Custom event streaming
    - Compatible with both patterns

## 🚫 Validation Rules

### Rule 1: Pattern Exclusivity

```typescript
// ❌ FORBIDDEN: Mixing patterns
class BadWorkflow {
  @Entrypoint()  // Task-based
  async start(context) { }

  @Node()  // Node-based - CONFLICT!
  async process(state) { }
}
```

### Rule 2: Cross-Cutting Compatibility

```typescript
// ✅ ALLOWED: Cross-cutting decorators with any pattern
class TaskWorkflow {
  @Entrypoint()
  @StreamProgress()  // ✅ Cross-cutting
  @RequiresApproval({ threshold: 0.8 })  // ✅ Cross-cutting
  async start(context) { }

  @Task({ dependsOn: ['start'] })
  @Tool({ name: 'process_data' })  // ✅ Cross-cutting
  async processData(context) { }
}

class NodeWorkflow {
  @Node({ type: 'standard' })
  @StreamToken()  // ✅ Cross-cutting
  @RequiresApproval({ threshold: 0.9 })  // ✅ Cross-cutting
  async analyze(state) { }

  @Node({ type: 'tool' })
  @Tool({ name: 'search' })  // ✅ Cross-cutting
  async searchData(state) { }

  @Edge('analyze', 'searchData')
  route() {}
}
```

### Rule 3: Class-Level Decorator Stacking

```typescript
// ✅ ALLOWED: Multiple class-level decorators
@Agent({
  id: 'my-agent',
  type: 'workflow-agent',
})
@FunctionalWorkflow({
  name: 'my-workflow',
  streaming: true
})
@Injectable()
export class MyWorkflowAgent {
  // Either task-based OR node-based methods
}
```

## 📋 Validation Matrix

| Decorator Category | Task-Based | Node-Based | Class-Level | Notes |
|-------------------|------------|------------|-------------|-------|
| @Entrypoint | ✅ PRIMARY | ❌ FORBIDDEN | ❌ | Task-based entry point |
| @Task | ✅ PRIMARY | ❌ FORBIDDEN | ❌ | Task-based node |
| @Node | ❌ FORBIDDEN | ✅ PRIMARY | ❌ | Node-based node |
| @Edge | ❌ FORBIDDEN | ✅ PRIMARY | ❌ | Node-based connection |
| @Agent | ✅ Compatible | ✅ Compatible | ✅ | Class-level |
| @FunctionalWorkflow | ✅ Compatible | ✅ Compatible | ✅ | Class-level |
| @Workflow (multi-agent) | ✅ Compatible | ✅ Compatible | ✅ | Class-level |
| @Tool | ✅ Compatible | ✅ Compatible | ❌ | Cross-cutting |
| @RequiresApproval | ✅ Compatible | ✅ Compatible | ❌ | Cross-cutting |
| @StreamToken | ✅ Compatible | ✅ Compatible | ❌ | Cross-cutting |
| @StreamProgress | ✅ Compatible | ✅ Compatible | ❌ | Cross-cutting |
| @StreamEvent | ✅ Compatible | ✅ Compatible | ❌ | Cross-cutting |

## 🎯 Validation Implementation Strategy

### Phase 1: Runtime Validation (Immediate)

**Validation Points:**

1. **@Entrypoint** - Validates task-based pattern on apply
2. **@Task** - Validates task-based pattern on apply
3. **@Node** - Validates node-based pattern on apply
4. **@Edge** - Validates node-based pattern on apply

**Validation Logic:**

```typescript
// Pattern metadata key
const DECORATOR_PATTERN_KEY = Symbol('decorator:pattern');

// Pattern types
type DecoratorPattern = 'task-based' | 'node-based' | 'unset';

// Validation function
function validateDecoratorPattern(
  target: any,
  newPattern: DecoratorPattern,
  decoratorName: string
): void {
  const existingPattern = getDecoratorPattern(target);

  if (existingPattern === 'unset') {
    setDecoratorPattern(target, newPattern);
    return;
  }

  if (existingPattern !== newPattern) {
    throw new DecoratorPatternConflictError(/* helpful message */);
  }
}
```

### What NOT to Validate

**Cross-cutting decorators** (@Tool, @RequiresApproval, streaming) should NOT enforce patterns:

- They work with both task-based and node-based workflows
- They are orthogonal concerns
- No validation needed

**Class-level decorators** (@Agent, @FunctionalWorkflow) should NOT enforce patterns:

- They are configuration, not pattern-defining
- Compatible with both patterns
- No validation needed

## 🏗️ Implementation Checklist

### Critical Decorators (MUST validate)

- [x] @Entrypoint - Enforce task-based
- [x] @Task - Enforce task-based
- [x] @Node - Enforce node-based
- [x] @Edge - Enforce node-based

### Compatible Decorators (NO validation)

- [ ] @Tool - Cross-cutting (no validation)
- [ ] @RequiresApproval - Cross-cutting (no validation)
- [ ] @StreamToken - Cross-cutting (no validation)
- [ ] @StreamProgress - Cross-cutting (no validation)
- [ ] @StreamEvent - Cross-cutting (no validation)
- [ ] @Agent - Class-level (no validation)
- [ ] @FunctionalWorkflow - Class-level (no validation)
- [ ] @Workflow - Class-level (no validation)

## 📊 Example Validation Scenarios

### Scenario 1: Pure Task-Based Workflow ✅

```typescript
@Agent({ id: 'task-agent', type: 'workflow-agent' })
@Injectable()
export class TaskBasedWorkflow {
  @Entrypoint()  // ✅ Sets pattern to 'task-based'
  @StreamProgress()  // ✅ Cross-cutting, no conflict
  async start(context: TaskExecutionContext) { }

  @Task({ dependsOn: ['start'] })  // ✅ Validates 'task-based'
  @Tool({ name: 'process' })  // ✅ Cross-cutting, no conflict
  @RequiresApproval({ threshold: 0.8 })  // ✅ Cross-cutting, no conflict
  async process(context: TaskExecutionContext) { }
}
```

### Scenario 2: Pure Node-Based Workflow ✅

```typescript
@Agent({ id: 'node-agent', type: 'workflow-agent' })
@Injectable()
export class NodeBasedWorkflow extends DeclarativeWorkflowBase {
  @Node({ type: 'standard' })  // ✅ Sets pattern to 'node-based'
  @StreamToken()  // ✅ Cross-cutting, no conflict
  async start(state: WorkflowState) { }

  @Node({ type: 'tool' })  // ✅ Validates 'node-based'
  @Tool({ name: 'search' })  // ✅ Cross-cutting, no conflict
  async search(state: WorkflowState) { }

  @Edge('start', 'search')  // ✅ Validates 'node-based'
  route() {}
}
```

### Scenario 3: Mixed Pattern (Conflict) ❌

```typescript
@Injectable()
export class MixedWorkflow {
  @Entrypoint()  // Sets pattern to 'task-based'
  async start(context) { }

  @Node({ type: 'standard' })  // ❌ CONFLICT! Expects 'task-based', got 'node-based'
  async process(state) { }
}

// Error thrown immediately when @Node is applied:
// DecoratorPatternConflictError: Incompatible decorator @Node detected in MixedWorkflow
// Current pattern: task-based
// Attempted pattern: node-based
// Choose ONE pattern: task-based OR node-based
```

## 🎓 Key Takeaways

1. **Only 4 decorators need validation**: @Entrypoint, @Task, @Node, @Edge
2. **Cross-cutting decorators are pattern-agnostic**: @Tool, @RequiresApproval, streaming decorators
3. **Class-level decorators don't define patterns**: @Agent, @Workflow, @FunctionalWorkflow
4. **Validation happens at decoration time**: Immediate, clear error messages
5. **First pattern-defining decorator wins**: Once set, pattern cannot change

This taxonomy ensures clean separation of concerns while maintaining flexibility for cross-cutting features.
