# LangGraph Workflow Patterns Guide

**When to Use @Entrypoint/@Task vs @Node/@Edge in NestJS AI SaaS Starter**

This guide documents best practices for choosing between LangGraph's Functional API patterns (`@Entrypoint` + `@Task`) and Graph API patterns (`@Node` + `@Edge`), based on official LangGraph documentation and our codebase implementation.

---

## Table of Contents

1. [Pattern Overview](#pattern-overview)
2. [When to Use Each Pattern](#when-to-use-each-pattern)
3. [Functional-Task Pattern (@Entrypoint + @Task)](#functional-task-pattern)
4. [Functional-Node Pattern (@Node + @Edge)](#functional-node-pattern)
5. [Tool Calling Patterns](#tool-calling-patterns)
6. [HITL (Human-in-the-Loop) Integration](#hitl-human-in-the-loop-integration)
7. [Real-World Examples from Our Codebase](#real-world-examples)
8. [Migration Guide](#migration-guide)

---

## Pattern Overview

LangGraph provides **two primary workflow patterns** in our NestJS implementation:

| Pattern             | Workflow Type     | Decorators              | Use Case                               | Control Flow                           |
| ------------------- | ----------------- | ----------------------- | -------------------------------------- | -------------------------------------- |
| **Functional-Task** | `functional-task` | `@Entrypoint` + `@Task` | Linear, sequential workflows           | Predetermined, top-to-bottom execution |
| **Functional-Node** | `functional-node` | `@Node` + `@Edge`       | Complex routing, branching, LLM-driven | Dynamic, graph-based execution         |

### Key Architectural Difference

```typescript
// Functional-Task: Linear execution (A → B → C → D)
@Agent({ workflow: { type: 'functional-task' } })
class DataPipeline {
  @Entrypoint() async step1() { }  // Always runs first
  @Task() async step2() { }         // Always runs second
  @Task() async step3() { }         // Always runs third
  @Task() async step4() { }         // Always runs fourth
}

// Functional-Node: Graph-based routing (A → B or C → D)
@Agent({ workflow: { type: 'functional-node' } })
class SmartWorkflow {
  @Node({ type: 'llm' }) async analyze() { }     // LLM decides next step
  @Node() async processHigh() { }                 // If confidence > 0.8
  @Node() async processLow() { }                  // If confidence < 0.8
  @Edge('analyze', (state) => state.confidence > 0.8 ? 'processHigh' : 'processLow')
}
```

---

## When to Use Each Pattern

### ✅ Use **Functional-Task** (`@Entrypoint` + `@Task`) When:

1. **Workflow is purely sequential** - Each step always follows the previous
2. **No conditional branching** - Single predetermined path
3. **Traditional ETL/pipeline** - Extract → Transform → Load pattern
4. **Simple data processing** - No decision points or routing logic
5. **No LLM tool calling** - Tools are called manually in procedural order

**Examples:**

- Data ingestion pipelines (fetch → validate → transform → store)
- Simple notification workflows (prepare → send → log)
- Basic CRUD operations (create → validate → save → notify)
- Report generation without research (fetch data → format → save)

### ✅ Use **Functional-Node** (`@Node` + `@Edge`) When:

1. **LLM-driven tool calling** - LLM autonomously decides which tools to use
2. **Conditional branching** - Multiple paths based on state/confidence
3. **Complex routing logic** - Decision points throughout workflow
4. **Parallel execution** - Multiple branches that can run concurrently
5. **Human-in-the-loop** - Approval gates with conditional routing
6. **Agent workflows** - Autonomous decision-making and tool orchestration

**Examples:**

- **Research agents** (LLM chooses web-search vs research-search)
- **GitHub analysis** (LLM orchestrates 4 tools autonomously)
- **Approval workflows** (route based on user decision)
- **Multi-step analysis** (LLM decides when sufficient data gathered)
- **Content generation** (LLM chooses appropriate generation tools)

---

## Functional-Task Pattern

### Configuration

```typescript
@Agent({
  type: 'workflow-agent',
  workflow: {
    type: 'functional-task', // 🔑 Sequential execution
    streaming: true,
    enableInternalCheckpointing: true,
  },
})
@Injectable()
export class SequentialWorkflow {
  @Entrypoint({ timeout: 15000 })
  async initialize(context: TaskExecutionContext<WorkflowState>) {
    // Always executes first
    return { state: { ...context.state, initialized: true } };
  }

  @Task({ dependsOn: ['initialize'] })
  async process(context: TaskExecutionContext<WorkflowState>) {
    // Executes after initialize completes
    return { state: { ...context.state, processed: true } };
  }

  @Task({ dependsOn: ['process'] })
  async finalize(context: TaskExecutionContext<WorkflowState>) {
    // Executes after process completes
    return { state: { ...context.state, complete: true } };
  }
}
```

### Characteristics

- **Execution Order**: Top-to-bottom in class definition
- **Dependencies**: `dependsOn` creates linear chain
- **State Management**: Each task receives full state, returns partial updates
- **Checkpointing**: Checkpoint created after each task completion
- **Visualization**: NOT supported (dynamic runtime graph)

### HITL with Functional-Task

```typescript
@Task({ dependsOn: ['generateReport'] })
@RequiresApproval({
  confidenceThreshold: 0.8,
  timeoutMs: 120000,
  message: (state) => `Review report before saving`,
})
async saveReport(context: TaskExecutionContext<WorkflowState>) {
  // Workflow interrupts before this task
  // User reviews in UI, approves/rejects
  // If approved, this task executes
  // If rejected, workflow ends
}
```

**Interruption Behavior:**

- Workflow pauses **BEFORE** task execution
- User reviews state accumulated from previous tasks
- Approval/rejection determines if task runs
- Cannot conditionally route after interruption (linear only)

---

## Functional-Node Pattern

### Configuration

```typescript
@Agent({
  type: 'workflow-agent',
  tools: ['web-search', 'research-search', 'create-report'], // Tools auto-bound to LLM
  workflow: {
    type: 'functional-node', // 🔑 Graph-based routing
    streaming: true,
    enableInternalCheckpointing: true,
    multiAgentInterruption: {
      enabled: true,
      interruptAfter: ['research'], // Pause after specific nodes
    },
  },
})
@Injectable()
export class ResearchWorkflow {
  @Node({ type: 'llm' }) // 🔑 LLM with auto-bound tools
  async research(state: WorkflowState) {
    // LLM autonomously calls tools
    // Framework handles: node → tools → node loop
    // Completes when LLM makes no tool_calls
    return { metadata: { ...state.metadata, researchStarted: true } };
  }

  @Node({ type: 'standard' })
  @RequiresApproval({ confidenceThreshold: 0.8 })
  async saveReport(state: WorkflowState) {
    // Save approved report
    return { metadata: { ...state.metadata, saved: true } };
  }

  @Edge('research', 'saveReport')
  researchToSave(): boolean {
    return true; // HITL interruption happens between these nodes
  }

  @Edge('saveReport', '__end__')
  complete(): boolean {
    return true;
  }
}
```

### Characteristics

- **Execution Order**: Determined by edges, not class order
- **Routing**: Conditional edges enable dynamic paths
- **State Management**: Nodes receive state, return partial updates
- **Checkpointing**: Checkpoint after each **superstep** (parallel nodes = 1 superstep)
- **Visualization**: Fully supported (static graph structure)

### Node Types

```typescript
// Standard node - Basic processing
@Node({ type: 'standard' })
async processData(state: WorkflowState) { }

// LLM node - Automatic tool binding
@Node({ type: 'llm' })
async aiAnalysis(state: WorkflowState) {
  // Tools from @Agent decorator automatically bound
  // LLM can call tools autonomously
}

// Condition node - Routing logic
@Node({ type: 'condition' })
async routeByConfidence(state: WorkflowState): string {
  return state.confidence > 0.8 ? 'high' : 'low';
}

// Approval node - HITL
@Node({ type: 'human' })
@RequiresApproval({ confidenceThreshold: 0.8 })
async approveContent(state: WorkflowState) { }
```

### Edge Patterns

```typescript
// Simple unconditional edge
@Edge('nodeA', 'nodeB')
simpleTransition(): boolean {
  return true; // Always route from A to B
}

// Conditional edge with function
@Edge('analyze', 'approve')
shouldApprove(state: WorkflowState): boolean {
  return state.confidence >= 0.9 && state.riskLevel === 'low';
}

// Dynamic routing (returns node name)
@Edge('assessment', (state) => {
  if (state.score > 0.9) return 'auto_approve';
  if (state.score > 0.7) return 'human_review';
  return 'reject';
})
routeByScore() { }

// Conditional routing with named paths
@ConditionalEdge('analyze', {
  'high_confidence': 'auto_process',
  'medium_confidence': 'human_review',
  'low_confidence': 'reject'
}, { default: 'fallback' })
routeByConfidence(state: WorkflowState): string {
  if (state.confidence > 0.9) return 'high_confidence';
  if (state.confidence > 0.6) return 'medium_confidence';
  return 'low_confidence';
}
```

### HITL with Functional-Node

```typescript
@Node({ type: 'standard' })
@RequiresApproval({
  confidenceThreshold: 0.8,
  timeoutMs: 120000,
  message: (state) => `Review analysis for ${state.metadata.username}`,
})
async finalizeAnalysis(state: WorkflowState) {
  // Workflow interrupts BEFORE this node
  // User reviews in UI modal
  // Can route to different nodes based on approval
}

// Conditional routing after approval
@Edge('finalizeAnalysis', (state) => {
  if (state.metadata.userApproval === 'approved') return 'saveReport';
  if (state.metadata.userApproval === 'rejected') return 'reviseAnalysis';
  return '__end__';
})
routeAfterApproval() { }
```

**Interruption Behavior:**

- Workflow pauses **AFTER** node completes (via `interruptAfter`)
- OR **BEFORE** node executes (via `@RequiresApproval` decorator)
- User reviews accumulated state
- **Can conditionally route** based on approval decision
- Supports complex approval workflows (approve → save, reject → revise)

---

## Tool Calling Patterns

### ❌ WRONG: Manual Tool Calling (Old Pattern)

```typescript
// Don't do this - defeats purpose of LLM autonomy
@Task({ dependsOn: ['parseQuery'] })
async conductResearch(context: TaskExecutionContext<WorkflowState>) {
  // ❌ Hardcoded tool invocation - no LLM decision
  const results = await this.webTools.researchSearch({
    topic: context.state.metadata.query,
    includeAcademic: true,
    minSources: 10, // Always uses expensive comprehensive search
  });

  return { state: { ...context.state, results } };
}
```

**Problems:**

- LLM never decides which tool to use
- Always calls same tool regardless of query complexity
- Wastes resources (expensive tools for simple queries)
- Not truly autonomous

### ✅ CORRECT: LLM-Driven Tool Calling (New Pattern)

```typescript
@Agent({
  tools: ['web-search', 'research-search', 'create-report'], // Declared at agent level
  workflow: {
    type: 'functional-node', // 🔑 MUST be functional-node for tool calling
  },
})
class ResearcherAgent {
  @Node({ type: 'llm' }) // 🔑 Triggers automatic tool binding
  async conductAutonomousResearch(state: WorkflowState) {
    // Framework automatically:
    // 1. Binds tools to LLM (from @Agent decorator)
    // 2. Invokes LLM with state.messages
    // 3. Detects tool_calls in LLM response
    // 4. Routes to ToolNode if tool_calls present
    // 5. Executes tools, appends results to messages
    // 6. Routes back to this node with tool results
    // 7. Repeats until LLM makes no tool_calls

    // We only provide intelligent system prompt to guide LLM
    const systemPrompt = `You are a research agent with access to:
- web-search: Quick facts (2-5 sources, $0.01, <10s)
- research-search: Comprehensive (5-10 sources, $0.05, <30s)
- create-report: Generate markdown report

STRATEGY:
- Simple queries → use web-search
- Complex queries → use research-search
- When sufficient data → call create-report

Query: "${state.metadata.query}"
Depth: ${state.metadata.researchDepth}

Analyze query complexity and choose appropriate tools autonomously.`;

    return {
      metadata: {
        ...state.metadata,
        systemPrompt, // Store for reference
      },
    };
  }
}
```

**Benefits:**

- LLM autonomously decides: "Is this simple (React) or complex (quantum computing)?"
- Cost-optimized: Simple queries → cheap web-search, complex → expensive research-search
- Adaptive: LLM can call multiple tools if needed
- True autonomy: LLM controls tool orchestration

### Tool Execution Flow

```
┌─────────────────────┐
│  User Query         │
│ "What is React?"    │
└──────────┬──────────┘
           │
           ▼
┌───────────────────────────────────┐
│ @Node({ type: 'llm' })             │
│ - LLM receives query + tools      │
│ - Tools auto-bound to LLM         │
└──────────┬────────────────────────┘
           │
           ▼ LLM decides: "Simple query → web-search"
┌───────────────────────────────────┐
│ Framework Detects tool_calls      │
│ Routes to ToolNode                │
└──────────┬────────────────────────┘
           │
           ▼
┌───────────────────────────────────┐
│ ToolNode Executes web-search      │
│ Returns results                   │
└──────────┬────────────────────────┘
           │
           ▼
┌───────────────────────────────────┐
│ Routes back to LLM node           │
│ with tool results in messages     │
└──────────┬────────────────────────┘
           │
           ▼ LLM: "Sufficient data, no more tools"
┌───────────────────────────────────┐
│ Node completes (no tool_calls)    │
│ Workflow continues to next node   │
└───────────────────────────────────┘
```

### Tool Registration

Tools must be registered in `WorkflowEngineModule.forRoot()`:

```typescript
// apps/dev-brand-api/src/app/app.module.ts
WorkflowEngineModule.forRootAsync({
  useFactory: async () => ({
    tools: [
      GitHubIntegrationTools,    // Contains @Tool('github-analyzer'), etc.
      WebResearchTools,          // Contains @Tool('web-search'), @Tool('research-search')
      FileOperationTools,        // Contains @Tool('create-report'), @Tool('save-report')
      BrandStrategistTools,
      ContentCreatorTools,
    ],
  }),
}),
```

Tools are defined with `@Tool` decorator:

```typescript
@Injectable()
export class WebResearchTools {
  @Tool({
    name: 'web-search',
    description: 'Quick web search for factual queries (2-5 sources)',
    schema: z.object({
      query: z.string().describe('Search query'),
      maxResults: z.number().optional().describe('Max results (default: 5)'),
    }),
  })
  async webSearch({ query, maxResults = 5 }) {
    // Implementation
  }

  @Tool({
    name: 'research-search',
    description: 'Comprehensive research with academic sources (5-10+ sources)',
    schema: z.object({
      topic: z.string().describe('Research topic'),
      includeAcademic: z.boolean().optional().describe('Include academic papers'),
      minSources: z.number().optional().describe('Minimum sources'),
    }),
  })
  async researchSearch({ topic, includeAcademic = false, minSources = 5 }) {
    // Implementation
  }
}
```

---

## HITL (Human-in-the-Loop) Integration

### HITL with Functional-Task Pattern

**Limitation**: Linear execution only, no conditional routing after approval.

```typescript
@Agent({ workflow: { type: 'functional-task' } })
class ReportWorkflow {
  @Entrypoint()
  async fetchData(context: TaskExecutionContext<WorkflowState>) {
    return { state: { ...context.state, data: fetchedData } };
  }

  @Task({ dependsOn: ['fetchData'] })
  async generateDraft(context: TaskExecutionContext<WorkflowState>) {
    return { state: { ...context.state, draft: generatedDraft } };
  }

  @Task({ dependsOn: ['generateDraft'] })
  @RequiresApproval({
    confidenceThreshold: 0.8,
    timeoutMs: 120000,
    message: (state) => `Review draft before saving`,
    onTimeout: 'escalate',
  })
  async saveDraft(context: TaskExecutionContext<WorkflowState>) {
    // ⚠️ Interruption happens BEFORE this task executes
    // If user approves → this task runs
    // If user rejects → workflow ends (no conditional routing)

    if (context.state.metadata.userApproval !== 'approved') {
      return { state: { ...context.state, error: 'User rejected' } };
    }

    // Save approved draft
    return { state: { ...context.state, saved: true } };
  }

  // ❌ Cannot route to different task based on approval
  // Next task always executes (or workflow ends)
  @Task({ dependsOn: ['saveDraft'] })
  async notifyUser(context: TaskExecutionContext<WorkflowState>) {
    // This runs regardless of approval outcome
  }
}
```

**Configuration:**

```typescript
workflow: {
  type: 'functional-task',
  multiAgentInterruption: {
    enabled: true,
    // ⚠️ interruptAfter NOT supported for functional-task
    // Interruption happens via @RequiresApproval decorator only
  },
}
```

### HITL with Functional-Node Pattern

**Advantage**: Full conditional routing after approval.

```typescript
@Agent({
  workflow: {
    type: 'functional-node',
    multiAgentInterruption: {
      enabled: true,
      interruptAfter: ['generateDraft'], // Pause after this node completes
    },
  },
})
class SmartReportWorkflow {
  @Node({ type: 'llm' })
  async generateDraft(state: WorkflowState) {
    // LLM generates draft
    return { metadata: { ...state.metadata, draftReady: true } };
  }

  @Node({ type: 'standard' })
  @RequiresApproval({
    confidenceThreshold: 0.8,
    timeoutMs: 120000,
    message: (state) => `Review draft: ${state.metadata.draftTitle}`,
    metadata: (state) => ({
      draftId: state.metadata.draftId,
      confidence: state.metadata.confidenceScore,
    }),
  })
  async processDraft(state: WorkflowState) {
    // ✅ Interruption happens BEFORE this node
    // User can approve, reject, or request changes
    return { metadata: { ...state.metadata, processed: true } };
  }

  @Node({ type: 'standard' })
  async saveDraft(state: WorkflowState) {
    // Save approved draft
    return { metadata: { ...state.metadata, saved: true } };
  }

  @Node({ type: 'standard' })
  async reviseDraft(state: WorkflowState) {
    // Revise based on feedback
    return { metadata: { ...state.metadata, revised: true } };
  }

  // ✅ Conditional routing based on approval decision
  @Edge('processDraft', (state) => {
    if (state.metadata.userApproval === 'approved') return 'saveDraft';
    if (state.metadata.userApproval === 'rejected') return 'reviseDraft';
    return '__end__'; // Timeout/escalated
  })
  routeAfterApproval() {}

  @Edge('saveDraft', '__end__')
  complete() {
    return true;
  }

  @Edge('reviseDraft', 'generateDraft') // Loop back for revision
  retryAfterRevision() {
    return true;
  }
}
```

**Interruption Mechanisms:**

1. **`interruptAfter` (workflow-level)**:

   ```typescript
   multiAgentInterruption: {
     enabled: true,
     interruptAfter: ['generateDraft'], // Pause AFTER node completes
   }
   ```

   - Workflow checkpoints after node
   - User reviews state
   - Resumes at next node when approved

2. **`@RequiresApproval` (node-level)**:
   ```typescript
   @Node({ type: 'standard' })
   @RequiresApproval({ /* config */ })
   async criticalNode(state: WorkflowState) {
     // Workflow interrupts BEFORE this node executes
   }
   ```
   - More granular control
   - Can check confidence threshold
   - Can timeout and escalate

**Best Practice**: Combine both for robust HITL:

```typescript
@Agent({
  workflow: {
    type: 'functional-node',
    multiAgentInterruption: {
      enabled: true,
      interruptAfter: ['research'], // Checkpoint after research
    },
  },
})
class ResearcherAgent {
  @Node({ type: 'llm' })
  async research(state: WorkflowState) {
    // Autonomous research with tool calling
    // interruptAfter triggers here
  }

  @Node({ type: 'standard' })
  @RequiresApproval({
    /* additional validation */
  })
  async saveReport(state: WorkflowState) {
    // @RequiresApproval adds extra gate
    // Only save if user explicitly approves
  }

  @Edge('research', 'saveReport')
  researchToSave() {
    return true;
  } // HITL happens between these

  @Edge('saveReport', '__end__')
  complete() {
    return true;
  }
}
```

---

## Real-World Examples

### Example 1: Researcher Agent (Functional-Node + LLM Tools)

**File**: `apps/dev-brand-api/src/app/business-workflows/agents/researcher.agent.ts`

**Pattern**: Functional-Node with LLM-driven autonomous tool calling

```typescript
@Agent({
  tools: ['web-search', 'research-search', 'create-report', 'save-report'],
  workflow: {
    type: 'functional-node', // Graph-based for LLM tool calling
    multiAgentInterruption: {
      enabled: true,
      interruptAfter: ['conductAutonomousResearch'], // After research completes
    },
  },
})
export class ResearcherAgent {
  @Node({ type: 'llm' }) // 🔑 Automatic tool binding
  async conductAutonomousResearch(state: TypedAgentState<ResearcherMetadata>) {
    // LLM autonomously orchestrates tools:
    // - Analyzes query complexity
    // - Calls web-search (simple) OR research-search (complex)
    // - Processes results
    // - Calls create-report when sufficient data

    const systemPrompt = `Intelligent research agent with tools:
- web-search: Quick (2-5 sources, $0.01)
- research-search: Comprehensive (5-10 sources, $0.05)
- create-report: Generate markdown report

Query: "${state.metadata.query}"
Depth: ${state.metadata.researchDepth}

Choose tools based on query complexity.`;

    return {
      metadata: {
        ...state.metadata,
        systemPrompt,
      },
    };
  }

  @Node({ type: 'standard' })
  async saveApprovedReport(state: TypedAgentState<ResearcherMetadata>) {
    // Check approval (from HITL interruption)
    if (state.metadata.userApproval !== 'approved') {
      return {
        metadata: { ...state.metadata, error: 'User rejected report' },
      };
    }

    // Save approved report
    const result = await this.fileTools.createReport({
      /* ... */
    });
    return {
      metadata: {
        ...state.metadata,
        savedReportPath: result.filepath,
      },
    };
  }

  @Edge('conductAutonomousResearch', 'saveApprovedReport')
  researchToSave() {
    return true;
  }

  @Edge('saveApprovedReport', '__end__')
  complete() {
    return true;
  }
}
```

**Why Functional-Node?**

- ✅ LLM needs autonomous tool selection
- ✅ Dynamic tool orchestration (web-search vs research-search)
- ✅ HITL with conditional routing (approve → save, reject → end)
- ✅ Cost optimization via intelligent tool choice

### Example 2: GitHub Code Analyzer (Functional-Node + Multi-Tool Orchestration)

**File**: `apps/dev-brand-api/src/app/business-workflows/agents/github-code-analyzer/github-code-analyzer.agent.ts`

**Pattern**: Functional-Node with LLM orchestrating 4 tools sequentially

```typescript
@Agent({
  tools: [
    'github-analyzer', // Step 1: Fetch repo data
    'achievement-extractor', // Step 2: Extract accomplishments
    'developer-insights', // Step 3: Assess expertise
    'ai-synthesis', // Step 4: Generate narrative
  ],
  workflow: {
    type: 'functional-node', // Graph-based for complex tool orchestration
    multiAgentInterruption: {
      enabled: true,
      interruptAfter: ['finalizeAnalysis'], // After full analysis
    },
  },
})
export class GitHubCodeAnalyzerAgent {
  @Node({ type: 'llm' }) // LLM orchestrates all 4 tools
  async analyzeGitHubProfile(state: TypedAgentState<GitHubAnalyzerMetadata>) {
    // LLM autonomously orchestrates multi-tool workflow:
    // 1. Calls github-analyzer → gets repo data
    // 2. Calls achievement-extractor → analyzes commits
    // 3. Calls developer-insights → assesses expertise
    // 4. Calls ai-synthesis (optional) → generates narrative
    // 5. Synthesizes final comprehensive analysis

    const systemPrompt = `GitHub analyzer with multi-tool orchestration:

TOOLS (call in sequence):
1. github-analyzer: Fetch repos, commits, PRs
2. achievement-extractor: Identify accomplishments
3. developer-insights: Assess technical expertise
4. ai-synthesis: Generate professional profile

Target: ${state.metadata.githubUsername}
Timeframe: ${state.metadata.timeframe}

Orchestrate tools to build comprehensive developer analysis.`;

    return {
      metadata: {
        ...state.metadata,
        systemPrompt,
      },
    };
  }

  @Node({ type: 'standard' })
  @RequiresApproval({
    /* HITL config */
  })
  async finalizeAnalysis(state: TypedAgentState<GitHubAnalyzerMetadata>) {
    // Extract analysis from tool results in messages
    // Package for next agent
    return {
      metadata: {
        ...state.metadata,
        githubAnalysisCompleted: true,
      },
      next: 'personal-brand-strategist',
    };
  }

  @Edge('analyzeGitHubProfile', 'finalizeAnalysis')
  analysisToFinalize() {
    return true;
  }

  @Edge('finalizeAnalysis', '__end__')
  complete() {
    return true;
  }
}
```

**Why Functional-Node?**

- ✅ LLM orchestrates 4 tools sequentially
- ✅ Adaptive: LLM can skip ai-synthesis if it synthesizes directly
- ✅ HITL approval before passing to next agent
- ✅ Complex analysis pipeline needs intelligent orchestration

### Example 3: Personal Brand Strategist (Functional-Node + Conditional Routing)

**File**: `apps/dev-brand-api/src/app/business-workflows/agents/personal-brand-strategist/personal-brand-strategist.agent.ts`

**Pattern**: Functional-Node with conditional edges for confidence-based routing

```typescript
@Agent({
  tools: ['memory-analysis', 'brand-optimization', 'strategy-generation'],
  workflow: {
    type: 'functional-node', // Graph-based for conditional routing
    multiAgentInterruption: {
      enabled: true,
    },
  },
})
export class PersonalBrandStrategistAgent {
  @Node({ type: 'standard' })
  async initializeBrandAnalysis(state: TypedAgentState<BrandStrategistMetadata>) {
    return { metadata: { ...state.metadata, initialized: true } };
  }

  @Node({ type: 'standard' })
  async gatherBrandData(state: TypedAgentState<BrandStrategistMetadata>) {
    // Fetch from memory service
    return { metadata: { ...state.metadata, dataGathered: true } };
  }

  @Node({ type: 'standard' })
  async analyzeBrandPositioning(state: TypedAgentState<BrandStrategistMetadata>) {
    // LLM analyzes current brand
    const analysis = await this.llm.getLLM({ temperature: 0.3 });
    const response = await analysis.invoke([
      /* prompts */
    ]);

    return {
      messages: [...state.messages, response],
      metadata: { ...state.metadata, brandScore: 0.85 },
    };
  }

  @Node({ type: 'standard' })
  async assessBrandStrength(state: TypedAgentState<BrandStrategistMetadata>) {
    // Decision node
    return {
      metadata: {
        ...state.metadata,
        needsRebuild: state.metadata.brandScore < 0.6,
      },
    };
  }

  @Node({ type: 'standard' })
  async optimizeBrand(state: TypedAgentState<BrandStrategistMetadata>) {
    // Enhancement path (score >= 0.6)
    return { metadata: { ...state.metadata, optimized: true } };
  }

  @Node({ type: 'standard' })
  async rebuildBrand(state: TypedAgentState<BrandStrategistMetadata>) {
    // Rebuild path (score < 0.6)
    return { metadata: { ...state.metadata, rebuilt: true } };
  }

  // Conditional routing based on brand strength
  @Edge('assessBrandStrength', (state) => {
    return state.metadata.needsRebuild ? 'rebuildBrand' : 'optimizeBrand';
  })
  routeByStrength() {}

  @Edge('optimizeBrand', '__end__')
  @Edge('rebuildBrand', '__end__')
  complete() {
    return true;
  }
}
```

**Why Functional-Node?**

- ✅ Conditional routing (optimize vs rebuild)
- ✅ Decision point based on brand score
- ✅ Multiple execution paths
- ❌ Would NOT work with functional-task (linear only)

---

## Migration Guide

### Migrating from Functional-Task to Functional-Node

**When to Migrate:**

1. Need LLM-driven tool calling
2. Adding conditional routing
3. Implementing complex HITL workflows
4. Want cost optimization via intelligent tool selection

**Migration Steps:**

**Step 1: Update Workflow Configuration**

```diff
@Agent({
+  tools: ['web-search', 'research-search', 'create-report'],
   workflow: {
-    type: 'functional-task',
+    type: 'functional-node',
     multiAgentInterruption: {
       enabled: true,
-      // Remove task-specific config
+      interruptAfter: ['research'],
     },
   },
})
```

**Step 2: Replace Decorators**

```diff
- import { Entrypoint, Task } from '@hive-academy/langgraph-workflow-engine';
+ import { Node, Edge } from '@hive-academy/langgraph-workflow-engine';

- @Entrypoint({ timeout: 15000 })
- async parseQuery(context: TaskExecutionContext<WorkflowState>) {
+ @Node({ type: 'standard' })
+ async parseQuery(state: WorkflowState) {
-   const { state } = context;
-   return { state: updatedState };
+   return { metadata: updatedMetadata };
  }
```

**Step 3: Consolidate Tool-Calling Tasks into Single LLM Node**

```diff
- @Task({ dependsOn: ['parseQuery'] })
- async conductResearch(context: TaskExecutionContext<WorkflowState>) {
-   const results = await this.webTools.researchSearch({ /* manual */ });
-   return { state: { ...context.state, results } };
- }
-
- @Task({ dependsOn: ['conductResearch'] })
- async generateReport(context: TaskExecutionContext<WorkflowState>) {
-   const report = await this.fileTools.createReport({ /* manual */ });
-   return { state: { ...context.state, report } };
- }

+ @Node({ type: 'llm' }) // Single autonomous node
+ async conductAutonomousResearch(state: WorkflowState) {
+   // LLM autonomously calls tools:
+   // 1. research-search → get data
+   // 2. create-report → generate report
+   // Framework handles execution loop
+   return { metadata: { ...state.metadata, systemPrompt } };
+ }
```

**Step 4: Add Edges**

```diff
+ @Edge('parseQuery', 'conductAutonomousResearch')
+ parseToResearch() { return true; }
+
+ @Edge('conductAutonomousResearch', 'saveReport')
+ researchToSave() { return true; }
+
+ @Edge('saveReport', '__end__')
+ complete() { return true; }
```

**Step 5: Update Return Types**

```diff
- Promise<TaskExecutionResult<TypedAgentState<Metadata>>>
+ Promise<Partial<TypedAgentState<Metadata>>>

- return { state: { ...context.state, data } };
+ return { metadata: { ...state.metadata, data } };
```

---

## Summary Decision Matrix

| Requirement              | Functional-Task  | Functional-Node   |
| ------------------------ | ---------------- | ----------------- |
| **Sequential workflow**  | ✅ Perfect fit   | ⚠️ Overkill       |
| **LLM tool calling**     | ❌ Not supported | ✅ Perfect fit    |
| **Conditional routing**  | ❌ Not supported | ✅ Perfect fit    |
| **Simple HITL**          | ✅ Supported     | ✅ Better support |
| **Complex HITL routing** | ❌ Not supported | ✅ Perfect fit    |
| **Cost optimization**    | ❌ Manual only   | ✅ LLM-driven     |
| **Visualization**        | ❌ Not supported | ✅ Supported      |
| **Parallel execution**   | ❌ Not supported | ✅ Supported      |
| **Code simplicity**      | ✅ Very simple   | ⚠️ More complex   |

---

## References

- [LangGraph Functional API Overview](https://docs.langchain.com/oss/javascript/langgraph/functional-api)
- [LangGraph Graph API Overview](https://docs.langchain.com/oss/python/langgraph/graph-api)
- [LangGraph Workflows and Agents](https://docs.langchain.com/oss/javascript/langgraph/workflows-agents)
- Workflow Engine CLAUDE.md: `libs/langgraph-modules/workflow-engine/CLAUDE.md`
- Researcher Agent Example: `apps/dev-brand-api/src/app/business-workflows/agents/researcher.agent.ts`
- GitHub Analyzer Example: `apps/dev-brand-api/src/app/business-workflows/agents/github-code-analyzer/github-code-analyzer.agent.ts`

---

**Last Updated**: 2025-01-12
**Author**: NestJS AI SaaS Starter Team
**Status**: Living Document - Update as patterns evolve
