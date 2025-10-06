# LangGraph Decorator Patterns Analysis

## 🎯 Problem Statement

We're experiencing errors where edges reference nodes that aren't found ("Target node 'finalizeAnalysis' not found"). This indicates confusion about how decorators work together.

## 📊 Decorator Ecosystem Overview

### 1. **@Agent** (from `@hive-academy/langgraph-multi-agent`)

**Purpose**: Marks a class as an agent in the multi-agent system
**Level**: Class decorator
**Used for**: Agent identity, capabilities, tools, priority

```typescript
@Agent({
  id: 'github-code-analyzer',
  name: 'GitHub Code Analyzer',
  type: 'workflow-agent' | 'simple-agent',
  capabilities: ['code-analysis'],
  tools: ['github-analyzer'],
  priority: 'high',
  workflow: {  // 🔑 KEY: workflow configuration
    name: 'github-analyzer-workflow',
    enableInternalStreaming: true,
    enableInternalCheckpointing: true,
  }
})
```

### 2. **@FunctionalWorkflow** (from `@hive-academy/langgraph-functional-api`)

**Purpose**: Marks a class as a workflow with declarative configuration
**Level**: Class decorator
**Used for**: Workflow configuration, streaming, checkpointing, HITL

```typescript
@FunctionalWorkflow({
  name: 'my-workflow',
  description: 'Workflow description',
  streaming: true,
  confidenceThreshold: 0.8,
  channels: MyStateAnnotation,
  pattern: 'supervisor' | 'pipeline' | 'parallel',
})
```

### 3. **@Entrypoint** (from `@hive-academy/langgraph-functional-api`)

**Purpose**: Marks the SINGLE entry point method of a workflow
**Level**: Method decorator
**Used for**: Starting point of workflow execution
**Constraint**: Exactly ONE per workflow

```typescript
@Entrypoint({ timeout: 15000 })
async initializeWorkflow(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  return { state: { initialized: true } };
}
```

### 4. **@Task** (from `@hive-academy/langgraph-functional-api`)

**Purpose**: Defines workflow tasks with explicit dependencies
**Level**: Method decorator
**Used for**: Sequential/parallel task execution with dependency management

```typescript
@Task({
  dependsOn: ['initializeWorkflow'],
  timeout: 30000,
  retryCount: 3
})
async processData(context: TaskExecutionContext): Promise<TaskExecutionResult> {
  return { state: { processed: true } };
}
```

### 5. **@Node** (from `@hive-academy/langgraph-functional-api`)

**Purpose**: Defines workflow nodes with specific types (condition, tool, llm, etc.)
**Level**: Method decorator
**Used for**: Conditional routing, tool execution, LLM calls, human approval

```typescript
@Node({
  type: 'condition' | 'tool' | 'llm' | 'human' | 'standard',
  requiresApproval: boolean,
  timeout: number
})
async routeBasedOnCondition(context: TaskExecutionContext): Promise<{ route: string }> {
  return { route: state.confidence > 0.8 ? 'high' : 'low' };
}
```

### 6. **@Edge** (from `@hive-academy/langgraph-functional-api`)

**Purpose**: Defines connections between nodes with optional conditions
**Level**: Method decorator
**Used for**: Routing logic, conditional transitions

```typescript
@Edge('sourceNode', 'targetNode', {
  condition: (state) => state.ready
})
routeFromSourceToTarget(state: WorkflowState): boolean {
  return state.confidence > 0.8;
}
```

## 🔍 Current Problem Analysis

### GitHubCodeAnalyzerAgent Issues

**Current Setup**:

```typescript
@Agent({
  id: 'github-code-analyzer',
  type: 'workflow-agent',
  workflow: { ... } // workflow config in @Agent
})
export class GitHubCodeAnalyzerAgent extends DeclarativeWorkflowBase {
  @Entrypoint()
  async initializeGitHubAnalysis() { ... }

  @Task({ dependsOn: ['initializeGitHubAnalysis'] })
  async analyzeGitHubActivity() { ... }

  @Task({ dependsOn: ['extractAchievements'] })
  async finalizeAnalysis() { ... }  // ⚠️ Decorated with @Task

  @Edge('assessAnalysisQuality', 'finalizeAnalysis')  // ❌ ERROR: Can't find 'finalizeAnalysis'
  shouldProceedToFinalize() { ... }
}
```

**Problem**:

- `finalizeAnalysis` is decorated with `@Task`
- But `getWorkflowNodes()` only looks for `@Node` decorators
- The edge can't find the target node because it's not registered as a node

## 🎯 Two Decorator Patterns

### Pattern 1: **Functional/Task-Based Workflow** (Dependency-Driven)

**Best for**: Linear or dependency-driven workflows
**Uses**: `@Entrypoint` + `@Task` (NO @Node, NO @Edge)
**Edges**: Automatically created from `dependsOn` relationships

```typescript
@FunctionalWorkflow({ name: 'task-workflow' })
export class TaskWorkflow {
  @Entrypoint()
  async start(context): Promise<TaskExecutionResult> { ... }

  @Task({ dependsOn: ['start'] })
  async step1(context): Promise<TaskExecutionResult> { ... }

  @Task({ dependsOn: ['step1'] })
  async step2(context): Promise<TaskExecutionResult> { ... }

  @Task({ dependsOn: ['step1', 'step2'] })  // Parallel dependencies
  async final(context): Promise<TaskExecutionResult> { ... }
}
```

**Execution Flow**:

```
start → step1 → step2 ↘
                      → final
```

### Pattern 2: **Declarative/Node-Based Workflow** (Graph-Driven)

**Best for**: Complex routing, conditional logic, branching
**Uses**: `@Node` + `@Edge` (NO @Entrypoint, NO @Task)
**Edges**: Explicitly defined with `@Edge` decorators

```typescript
@FunctionalWorkflow({ name: 'node-workflow' })
export class NodeWorkflow extends DeclarativeWorkflowBase {
  @Node({ type: 'standard' })
  async start(state: WorkflowState) { ... }

  @Node({ type: 'condition' })
  async routeDecision(state: WorkflowState): Promise<{ route: string }> {
    return { route: state.confidence > 0.8 ? 'high' : 'low' };
  }

  @Node({ type: 'standard' })
  async processHigh(state: WorkflowState) { ... }

  @Node({ type: 'standard' })
  async processLow(state: WorkflowState) { ... }

  @Edge('start', 'routeDecision')
  startToRoute() {}

  @Edge('routeDecision', 'processHigh')
  routeToHigh(state: WorkflowState): boolean {
    return state.confidence > 0.8;
  }

  @Edge('routeDecision', 'processLow')
  routeToLow(state: WorkflowState): boolean {
    return state.confidence <= 0.8;
  }
}
```

## ❌ Anti-Pattern: Mixing @Task and @Node/@Edge

**DON'T DO THIS**:

```typescript
@Task({ dependsOn: ['start'] })
async step1() { ... }

@Task({ dependsOn: ['step1'] })
async step2() { ... }

@Edge('step1', 'step2')  // ❌ Conflicts with dependsOn
conditionalRoute() { ... }
```

**Why it fails**:

- `@Task` creates implicit edges from `dependsOn`
- `@Edge` creates explicit edges
- These conflict and cause confusion in graph compilation

## ✅ Solution for GitHubCodeAnalyzerAgent

### Option 1: Pure Task-Based (Recommended for Linear Flow)

Remove all `@Node` and `@Edge` decorators, rely on `dependsOn`:

```typescript
@Agent({ ... })
export class GitHubCodeAnalyzerAgent {
  @Entrypoint()
  async initializeGitHubAnalysis() { ... }

  @Task({ dependsOn: ['initializeGitHubAnalysis'] })
  async analyzeGitHubActivity() { ... }

  @Task({ dependsOn: ['analyzeGitHubActivity'] })
  async extractAchievements() { ... }

  @Task({ dependsOn: ['extractAchievements'] })
  async generateDeveloperInsights() { ... }

  @Task({ dependsOn: ['generateDeveloperInsights'] })
  async synthesizeWithAI() { ... }

  @Task({ dependsOn: ['synthesizeWithAI'] })
  async finalizeAnalysis() { ... }
}
```

### Option 2: Pure Node-Based (Recommended for Conditional Flow)

Convert all `@Task` to `@Node`, keep `@Edge`:

```typescript
@Agent({ ... })
export class GitHubCodeAnalyzerAgent extends DeclarativeWorkflowBase {
  @Node({ type: 'standard' })
  async initializeGitHubAnalysis(state) { ... }

  @Node({ type: 'standard' })
  async analyzeGitHubActivity(state) { ... }

  @Node({ type: 'standard' })
  async extractAchievements(state) { ... }

  @Node({ type: 'standard' })
  async generateDeveloperInsights(state) { ... }

  @Node({ type: 'standard' })
  async synthesizeWithAI(state) { ... }

  @Node({ type: 'condition' })
  async assessAnalysisQuality(state): Promise<{ route: string }> { ... }

  @Node({ type: 'standard' })
  async finalizeAnalysis(state) { ... }

  // Define all edges
  @Edge('initializeGitHubAnalysis', 'analyzeGitHubActivity')
  initToAnalyze() {}

  @Edge('analyzeGitHubActivity', 'extractAchievements')
  analyzeToExtract() {}

  // ... more edges ...

  @Edge('assessAnalysisQuality', 'finalizeAnalysis')
  shouldProceedToFinalize(state): boolean {
    return state.confidence > 0.0;
  }
}
```

## 🎓 Key Takeaways

1. **@Task = Dependency-driven** (implicit edges from `dependsOn`)
2. **@Node + @Edge = Graph-driven** (explicit edge declarations)
3. **NEVER MIX** @Task with @Node/@Edge in the same workflow
4. **@Entrypoint** is ONLY for task-based workflows
5. **DeclarativeWorkflowBase** is for node-based workflows
6. **@Agent.workflow** config vs **@FunctionalWorkflow** decorator:
   - @Agent.workflow: agent-level workflow settings
   - @FunctionalWorkflow: standalone workflow definition
   - Both can coexist (workflow-agent pattern)

## 📝 Recommended Fix

For GitHubCodeAnalyzerAgent, since it has linear flow with one conditional routing point:

**Use Pure Task-Based** for simplicity, remove conditional routing:

```typescript
@Agent({ type: 'workflow-agent', workflow: { ... } })
export class GitHubCodeAnalyzerAgent {
  @Entrypoint()
  async initializeGitHubAnalysis(context: TaskExecutionContext) { ... }

  @Task({ dependsOn: ['initializeGitHubAnalysis'] })
  async analyzeGitHubActivity(context: TaskExecutionContext) { ... }

  @Task({ dependsOn: ['analyzeGitHubActivity'] })
  async extractAchievements(context: TaskExecutionContext) { ... }

  @Task({ dependsOn: ['extractAchievements'] })
  async generateDeveloperInsights(context: TaskExecutionContext) { ... }

  @Task({ dependsOn: ['generateDeveloperInsights'] })
  async synthesizeWithAI(context: TaskExecutionContext) { ... }

  @Task({ dependsOn: ['synthesizeWithAI'] })
  async finalizeAnalysis(context: TaskExecutionContext) { ... }

  // assessAnalysisQuality removed - confidence check moved into finalizeAnalysis
}
```

This eliminates the node registration issue completely.
