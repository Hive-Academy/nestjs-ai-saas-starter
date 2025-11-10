# 🔑 LangGraph StateGraph Channels: Research & Architectural Decision

## Executive Summary

**Decision**: **DISALLOW custom `channels` in workflow configuration**. All agents must use the default `AgentStateAnnotation` with metadata nesting pattern.

**Rationale**: Custom channels create architectural inconsistencies, type safety issues, and conflict with the established `TypedAgentState<Metadata>` pattern used throughout the codebase.

**Impact**: Remove `channels` property from `AgentWorkflowConfig`, deprecate `buildStateAnnotation()` utility, standardize all agents on `TypedAgentState<Metadata>` pattern.

---

## 📊 Research Findings

### LangGraph StateGraph Constructor Patterns (2025)

LangGraph's StateGraph constructor accepts **three** different patterns for state schema definition:

#### Pattern 1: Annotation.Root (Recommended by LangGraph)

```typescript
import { Annotation, StateGraph } from '@langchain/langgraph';

const MyStateAnnotation = Annotation.Root({
  userId: Annotation<string>({
    reducer: (current, update) => update ?? current,
    default: () => '',
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
});

const graph = new StateGraph(MyStateAnnotation);
```

**Characteristics**:

- ✅ Type-safe via `.State` property extraction
- ✅ Custom reducers for state merging logic
- ✅ Default values for initialization
- ✅ Full TypeScript inference

**LangGraph Documentation Quote**:

> "State in LangGraph is defined using the `Annotation.Root` function, which creates a type-safe state schema where each field represents a state channel."

---

#### Pattern 2: Zod Schemas (Alternative)

```typescript
import { z } from 'zod';
import { StateGraph } from '@langchain/langgraph';

const MyState = z.object({
  messages: z.array(z.custom<BaseMessage>()).register(registry, MessagesZodMeta),
  extraField: z.number(),
});

const graph = new StateGraph(MyState);
```

**Characteristics**:

- ✅ Runtime validation via Zod
- ✅ Type-safe with Zod type inference
- ✅ Good for API boundary validation

---

#### Pattern 3: Legacy Channels Object (Deprecated)

```typescript
import { StateGraph } from '@langchain/langgraph';

interface WorkflowChannelsState {
  messages: BaseMessage[];
  question: string;
  answer: string;
}

const graph = new StateGraph<WorkflowChannelsState>({
  channels: {
    messages: {
      reducer: (currentState, updateValue) => currentState.concat(updateValue),
      default: () => [],
    },
    question: null,
    answer: null,
  },
});
```

**Characteristics**:

- ⚠️ Described as "alternative" approach in docs
- ⚠️ Zod is explicitly "recommended" over this pattern
- ⚠️ More verbose than Annotation.Root
- ❌ No mention in latest LangGraph quickstart guides

**LangGraph Documentation Quote**:

> "While Zod schemas are the recommended approach, LangGraph also supports other ways to define state schemas"

---

### Current Codebase Implementation

#### Default Pattern: AgentStateAnnotation

**File**: `libs/langgraph-modules/core/src/lib/annotations/agent-state.annotation.ts`

```typescript
export const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  metadata: Annotation<Record<string, unknown>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),
  next: Annotation<string | undefined>({
    reducer: (_, update) => update,
    default: () => undefined,
  }),
  current: Annotation<string | undefined>({
    reducer: (_, update) => update,
    default: () => undefined,
  }),
  scratchpad: Annotation<string>({
    reducer: (current, update) => (update ? `${current}\n${update}` : current),
    default: () => '',
  }),
  task: Annotation<string | undefined>({
    reducer: (_, update) => update,
    default: () => undefined,
  }),
  threadId: Annotation<string | undefined>({
    reducer: (_, update) => update,
    default: () => undefined,
  }),
  userId: Annotation<string | undefined>({
    reducer: (_, update) => update,
    default: () => undefined,
  }),
});

export type AgentState = typeof AgentStateAnnotation.State;
```

**Usage Pattern**:

```typescript
// All agents use TypedAgentState<Metadata> which nests custom fields in metadata
export interface TypedAgentState<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> {
  messages: BaseMessage[];
  metadata: TMetadata;
  next?: string;
  current?: string;
  scratchpad?: string;
  task?: string;
  threadId?: string;
  userId?: string;
}

// Example usage
interface ResearcherMetadata extends WorkflowAgentMetadata {
  query: string;
  searchResults?: any[];
  reportDraft?: string;
}

// Access pattern: state.metadata.query, state.metadata.searchResults
```

---

#### WorkflowExecutionService Implementation

**File**: `libs/langgraph-modules/workflow-engine/src/lib/execution/workflow-execution.service.ts:364`

```typescript
private buildStateGraph<TState extends WorkflowState = WorkflowState>(
  definition: WorkflowDefinition<TState>
): StateGraph<TState> {
  // Create StateGraph with channels from definition
  const graph = new StateGraph<TState>(definition.channels);

  // ... rest of graph building
}
```

**Key Finding**: The `definition.channels` parameter comes from `workflowOptions.channels` passed through metadata compilation.

---

#### MetadataProcessorService Implementation

**File**: `libs/langgraph-modules/workflow-engine/src/lib/core/metadata-processor.service.ts:255,302`

```typescript
// Task-based workflow
const definition: WorkflowDefinition<TState> = {
  name: workflowOptions.name || workflowClass.name,
  description: workflowOptions.description,
  channels: workflowOptions.channels, // 🔑 Custom channels if provided
  nodes: this.convertNodesToDefinition<TState>(nodes),
  edges: [],
  // ...
};

// Node-based workflow
const definition: WorkflowDefinition<TState> = {
  name: workflowOptions.name || workflowClass.name,
  description: workflowOptions.description,
  channels: workflowOptions.channels, // 🔑 Custom channels if provided
  nodes: this.convertNodesToDefinition<TState>(nodeMetadata),
  edges: this.convertEdgesToDefinition<TState>(edgeMetadata, nodeMetadata),
  // ...
};
```

**Key Finding**: If `workflowOptions.channels` is `undefined`, the StateGraph constructor receives `undefined`, which should fail with "Invalid StateGraph input" error.

---

### The Fundamental Conflict

#### Problem: Two Incompatible Patterns

1. **Custom Channels Pattern** (`buildStateAnnotation()` from LANGGRAPH_STATE_STANDARDIZATION.md):

   - Fields at ROOT level: `state.query`, `state.searchResults`
   - Created via `buildStateAnnotation({ query: { default: '' } })`
   - Passed as `channels: ResearchAgentStateAnnotation` to workflow config

2. **Metadata Nesting Pattern** (`TypedAgentState<Metadata>`):
   - Fields in METADATA: `state.metadata.query`, `state.metadata.searchResults`
   - Used by ALL other agents (GitHubCodeAnalyzerAgent, PersonalBrandStrategistAgent, ContentCreatorAgent)
   - Standard pattern throughout codebase

**Conflict**:

```typescript
// ResearcherAgent with buildStateAnnotation
const StateAnnotation = buildStateAnnotation({
  query: { default: '' }, // Root-level field
});

@Agent({
  workflow: {
    channels: StateAnnotation, // StateGraph expects state.query
  },
})
export class ResearcherAgent {
  @Entrypoint()
  async parseQuery(context: TaskExecutionContext<TypedAgentState<ResearcherMetadata>>) {
    const state = context.state;
    // ❌ CONFLICT: Code accesses state.metadata.query
    // ❌ But StateGraph schema expects state.query
    this.logger.log(`Query: ${state.metadata.query}`);
  }
}
```

**Result**: "Invalid StateGraph input. Make sure to pass a valid Annotation.Root or Zod schema."

---

## 🔍 Root Cause Analysis

### Why Did the Error Occur?

1. **ResearcherAgent** specified `channels: ResearchAgentStateAnnotation`
2. **StateAnnotation** created fields at ROOT level (`query`, `searchResults`, etc.)
3. **TypedAgentState** pattern expects fields in `metadata` namespace
4. **StateGraph** received annotation where fields don't match access patterns
5. **Error**: Schema mismatch between annotation structure and code access patterns

### Why Do Other Agents Work?

**GitHubCodeAnalyzerAgent, PersonalBrandStrategistAgent, ContentCreatorAgent**:

- ❌ Do NOT specify `channels` in workflow config
- ✅ Use default `AgentStateAnnotation` implicitly
- ✅ Access fields via `state.metadata.githubUsername`, `state.metadata.brandData`, etc.
- ✅ No schema mismatch

**Code Evidence**:

```typescript
@Agent({
  description: 'Analyzes GitHub repositories',
  type: 'workflow-agent',
  workflow: {
    name: 'github-analyzer-workflow',
    type: 'functional-task',
    // NO channels field - uses default AgentStateAnnotation
  },
})
export class GitHubCodeAnalyzerAgent {
  @Entrypoint()
  async step1(context: TaskExecutionContext<TypedAgentState<GitHubAnalyzerMetadata>>) {
    const state = context.state;
    // ✅ Accesses state.metadata.githubUsername
    this.logger.log(`Analyzing ${state.metadata.githubUsername}`);
  }
}
```

---

## 🎯 Architectural Decision

### Decision: Disallow Custom Channels

**Reasoning**:

1. **Pattern Consistency**

   - All existing agents use `TypedAgentState<Metadata>` pattern
   - Custom channels create divergent patterns within same codebase
   - Developers must learn two different state access patterns

2. **Type Safety**

   - `TypedAgentState<Metadata>` provides compile-time type checking
   - Custom channels can create runtime schema mismatches
   - Metadata nesting is more explicit and safer

3. **LangGraph Best Practices**

   - LangGraph recommends Annotation.Root for **graph-level state definition**
   - Our use case: **agent-level** state is better handled via metadata
   - Supervisor workflows need consistent state structure across agents

4. **Maintenance & Debugging**

   - Single pattern = easier debugging
   - Clear convention: custom fields always in `state.metadata`
   - Reduces cognitive load for developers

5. **Extensibility**
   - `AgentStateAnnotation` already provides:
     - `messages` - LangGraph standard
     - `metadata` - Extensible Record<string, unknown>
     - `next`, `current` - Multi-agent routing
     - `scratchpad` - Collaboration notes
   - No need for custom channels to add fields

---

### Proper Pattern: Extend Metadata, Not Channels

**❌ WRONG: Custom Channels**

```typescript
const StateAnnotation = buildStateAnnotation({
  query: { default: '' },
  searchResults: { default: [] },
});

@Agent({
  workflow: {
    channels: StateAnnotation, // ❌ Disallowed
  },
})
```

**✅ CORRECT: Metadata Extension**

```typescript
// 1. Define metadata interface
export interface ResearcherMetadata extends WorkflowAgentMetadata {
  query: string;
  searchResults?: any[];
  reportDraft?: string;
}

// 2. Use TypedAgentState<Metadata>
@Agent({
  workflow: {
    // NO channels field - uses default AgentStateAnnotation
  },
})
export class ResearcherAgent {
  @Entrypoint()
  async parseQuery(context: TaskExecutionContext<TypedAgentState<ResearcherMetadata>>) {
    const state = context.state;
    // ✅ Access via state.metadata.query
    this.logger.log(`Query: ${state.metadata.query}`);

    return {
      state: {
        ...state,
        metadata: {
          ...state.metadata,
          researchTopic: extractedTopic,
        },
      },
    };
  }
}
```

---

## 📋 Implementation Plan

### Phase 1: Remove channels Property

**File**: `libs/langgraph-modules/workflow-engine/src/lib/decorators/multi-agent/agent.decorator.ts`

**Action**: Remove `channels` from `AgentWorkflowConfig` interface

```typescript
// BEFORE
export interface AgentWorkflowConfig {
  name?: string;
  type?: 'functional-task' | 'functional-node';
  channels?: any; // ❌ REMOVE
  streaming?: boolean;
  // ... other properties
}

// AFTER
export interface AgentWorkflowConfig {
  name?: string;
  type?: 'functional-task' | 'functional-node';
  // channels removed
  streaming?: boolean;
  // ... other properties
}
```

---

### Phase 2: Provide Default Channels

**File**: `libs/langgraph-modules/workflow-engine/src/lib/core/metadata-processor.service.ts`

**Action**: Always use `AgentStateAnnotation` when channels are undefined

```typescript
import { AgentStateAnnotation } from '@hive-academy/langgraph-core';

private compileTaskBasedWorkflow<TState extends WorkflowState>(
  workflowClass: any,
  workflowOptions: any
): WorkflowDefinition<TState> {
  // ... existing code

  const definition: WorkflowDefinition<TState> = {
    name: workflowOptions.name || workflowClass.name,
    description: workflowOptions.description,
    channels: AgentStateAnnotation, // 🔑 Always use default
    nodes: this.convertNodesToDefinition<TState>(nodes),
    edges: [],
    // ... rest
  };

  return definition;
}

private compileNodeBasedWorkflow<TState extends WorkflowState>(
  workflowClass: any,
  workflowOptions: any
): WorkflowDefinition<TState> {
  // ... existing code

  const definition: WorkflowDefinition<TState> = {
    name: workflowOptions.name || workflowClass.name,
    description: workflowOptions.description,
    channels: AgentStateAnnotation, // 🔑 Always use default
    nodes: this.convertNodesToDefinition<TState>(nodeMetadata),
    edges: this.convertEdgesToDefinition<TState>(edgeMetadata, nodeMetadata),
    // ... rest
  };

  return definition;
}
```

---

### Phase 3: Deprecate buildStateAnnotation

**File**: `libs/langgraph-modules/workflow-engine/src/lib/utils/state-annotation-builder.ts`

**Action**: Add deprecation notice

````typescript
/**
 * @deprecated This utility is deprecated as of 2025-11-11.
 *
 * **Reason**: Custom state annotations create inconsistencies with the standard
 * TypedAgentState<Metadata> pattern used throughout the codebase.
 *
 * **Migration**: Instead of custom channels, define metadata interfaces:
 *
 * ```typescript
 * // OLD (deprecated)
 * const StateAnnotation = buildStateAnnotation({
 *   query: { default: '' },
 * });
 *
 * // NEW (recommended)
 * interface MyMetadata extends WorkflowAgentMetadata {
 *   query: string;
 * }
 *
 * // Use TypedAgentState<MyMetadata>
 * ```
 *
 * All agents now use the default AgentStateAnnotation with metadata nesting.
 *
 * @see LANGGRAPH_CHANNELS_DECISION.md for full architectural rationale
 */
export function buildStateAnnotation<StateSchema extends Record<string, StateFieldDefinition>>(
  schema: StateSchema,
  options: { extendAgentState?: boolean } = {}
): ReturnType<typeof Annotation.Root> {
  console.warn(
    '[DEPRECATED] buildStateAnnotation() is deprecated. Use TypedAgentState<Metadata> pattern instead. ' +
      'See LANGGRAPH_CHANNELS_DECISION.md for migration guide.'
  );

  // ... existing implementation
}
````

---

### Phase 4: Update Documentation

**File**: `LANGGRAPH_STATE_STANDARDIZATION.md`

**Action**: Add deprecation notice at top

````markdown
# 🔑 LangGraph State Annotation Standardization

> **⚠️ DEPRECATION NOTICE (2025-11-11)**
>
> The `buildStateAnnotation()` utility and custom `channels` configuration
> have been **deprecated** in favor of the `TypedAgentState<Metadata>` pattern.
>
> **Reason**: Custom channels create architectural inconsistencies and type safety issues.
>
> **See**: `LANGGRAPH_CHANNELS_DECISION.md` for full rationale and migration guide.
>
> **TL;DR**: Define metadata interfaces instead of custom state annotations.

## ~~Problem Solved~~ (Deprecated Approach)

This document describes the deprecated `buildStateAnnotation()` approach.
For the current recommended pattern, see **Proper State Management** below.

---

## Proper State Management (Current Approach)

### Pattern: TypedAgentState<Metadata>

All agents use the standard `AgentStateAnnotation` with metadata nesting:

1. **Define Metadata Interface**:
   ```typescript
   export interface MyAgentMetadata extends WorkflowAgentMetadata {
     query: string;
     results?: any[];
   }
   ```
````

2. **Use TypedAgentState in Methods**:

   ```typescript
   @Entrypoint()
   async step1(
     context: TaskExecutionContext<TypedAgentState<MyAgentMetadata>>
   ) {
     const state = context.state;
     // Access via state.metadata.query
   }
   ```

3. **NO Custom Channels**:
   ```typescript
   @Agent({
     workflow: {
       // NO channels field - uses default AgentStateAnnotation
     },
   })
   ```

### Migration Checklist

For each agent currently using `buildStateAnnotation()`:

1. ✅ Create metadata interface in `shared/metadata.types.ts`
2. ✅ Change method signatures to `TypedAgentState<Metadata>`
3. ✅ Update state access from `state.field` to `state.metadata.field`
4. ✅ Remove `buildStateAnnotation()` import
5. ✅ Remove custom annotation creation
6. ✅ Remove `channels` from workflow config
7. ✅ Rebuild and test

---

## ~~buildStateAnnotation() Usage~~ (Deprecated)

The content below is kept for historical reference only.
Do NOT use this pattern for new code.

...

````

---

### Phase 5: Update workflow-engine CLAUDE.md

**File**: `libs/langgraph-modules/workflow-engine/CLAUDE.md`

**Action**: Add section on state management

```markdown
## State Management

### Standard Pattern: AgentStateAnnotation + Metadata

All agents use the default `AgentStateAnnotation` with metadata nesting:

**AgentStateAnnotation Fields**:
- `messages: BaseMessage[]` - LangGraph message history
- `metadata: Record<string, unknown>` - **Extensible custom state**
- `next: string | undefined` - Multi-agent routing target
- `current: string | undefined` - Current agent identifier
- `scratchpad: string` - Collaboration notes
- `task: string | undefined` - Task description
- `threadId: string | undefined` - Memory context
- `userId: string | undefined` - User identifier

**How to Add Custom State**:

1. Define metadata interface in `shared/metadata.types.ts`:
   ```typescript
   export interface MyAgentMetadata extends WorkflowAgentMetadata {
     query: string;
     results?: any[];
   }
````

2. Use `TypedAgentState<Metadata>` in methods:

   ```typescript
   @Node()
   async processQuery(
     context: TaskExecutionContext<TypedAgentState<MyAgentMetadata>>
   ) {
     const state = context.state;

     // ✅ Access custom state via metadata
     this.logger.log(`Processing: ${state.metadata.query}`);

     // ✅ Return partial state update
     return {
       state: {
         ...state,
         metadata: {
           ...state.metadata,
           results: fetchedResults,
         },
       },
     };
   }
   ```

3. **DO NOT specify `channels` in workflow config**:
   ```typescript
   @Agent({
     workflow: {
       // NO channels field - always uses AgentStateAnnotation
       type: 'functional-node',
       streaming: true,
     },
   })
   ```

**Why This Pattern?**:

- ✅ Consistency across all agents
- ✅ Type-safe with TypeScript
- ✅ Compatible with multi-agent supervisor workflows
- ✅ Extensible via metadata interfaces
- ✅ No schema mismatches or runtime errors

**Deprecated Patterns**:

- ❌ Custom `channels` in workflow config
- ❌ `buildStateAnnotation()` utility
- ❌ Root-level custom state fields

See `LANGGRAPH_CHANNELS_DECISION.md` for full architectural rationale.

````

---

## 🧪 Verification Tests

### Test 1: ResearcherAgent Without Channels

```typescript
// Should work after removing channels
@Agent({
  description: 'Autonomous research agent',
  workflow: {
    name: 'researcher-workflow',
    type: 'functional-task',
    // NO channels field
  },
})
export class ResearcherAgent {
  @Entrypoint()
  async parseQuery(
    context: TaskExecutionContext<TypedAgentState<ResearcherMetadata>>
  ) {
    const state = context.state;
    // Should access state.metadata.query successfully
    this.logger.log(`Query: ${state.metadata.query}`);
  }
}
````

**Expected**: Build succeeds, streaming works, no StateGraph error

---

### Test 2: All Agents Consistent

```bash
# Search for any remaining channels usage
npx nx run-many -t grep -- "channels:" apps/dev-brand-api/src/app/business-workflows/agents

# Expected: No matches
```

---

### Test 3: Type Safety

```typescript
// Should fail at compile time
@Entrypoint()
async step1(context: TaskExecutionContext<TypedAgentState<ResearcherMetadata>>) {
  const state = context.state;
  // ❌ Should fail: Property 'query' does not exist on type 'AgentState'
  const query = state.query;

  // ✅ Should succeed: Property 'query' exists on 'ResearcherMetadata'
  const query = state.metadata.query;
}
```

---

## 📚 Reference Documentation

### LangGraph Official Docs

1. **StateGraph Constructor**: https://langchain-ai.github.io/langgraphjs/reference/classes/langgraph.StateGraph.html
2. **Annotation.Root API**: https://docs.langchain.com/oss/javascript/langgraph/use-graph-api
3. **State Definition Patterns**: https://langchain-ai.github.io/langgraphjs/concepts/low_level/

**Key Quote**:

> "State in LangGraph is defined using the `Annotation.Root` function, which creates a type-safe state schema where each field represents a state channel."

### Internal Documentation

1. **AgentStateAnnotation**: `libs/langgraph-modules/core/src/lib/annotations/agent-state.annotation.ts`
2. **TypedAgentState**: `libs/langgraph-modules/core/src/lib/types/agent.types.ts`
3. **Metadata Types**: `apps/dev-brand-api/src/app/business-workflows/agents/shared/metadata.types.ts`

---

## 🎓 Best Practices

### ✅ DO

1. **Define Metadata Interfaces**

   ```typescript
   export interface MyMetadata extends WorkflowAgentMetadata {
     customField: string;
   }
   ```

2. **Use TypedAgentState<Metadata>**

   ```typescript
   @Node()
   async myNode(context: TaskExecutionContext<TypedAgentState<MyMetadata>>) {
     const state = context.state;
     return { state: { ...state, metadata: { ...state.metadata, customField: 'value' } } };
   }
   ```

3. **Access State via Metadata**

   ```typescript
   const value = state.metadata.customField;
   ```

4. **Omit channels from Workflow Config**
   ```typescript
   @Agent({
     workflow: {
       type: 'functional-node',
       // NO channels field
     },
   })
   ```

### ❌ DON'T

1. **Don't Use buildStateAnnotation()**

   ```typescript
   ❌ const StateAnnotation = buildStateAnnotation({ ... });
   ```

2. **Don't Specify Custom Channels**

   ```typescript
   ❌ @Agent({
        workflow: {
          channels: CustomStateAnnotation,
        },
      })
   ```

3. **Don't Access State at Root Level**

   ```typescript
   ❌ const value = state.customField; // Wrong
   ✅ const value = state.metadata.customField; // Correct
   ```

4. **Don't Create Root-Level State Fields**

   ```typescript
   ❌ Annotation.Root({
        customField: Annotation<string>(), // Creates state.customField
      });

   ✅ interface MyMetadata {
        customField: string; // Creates state.metadata.customField
      }
   ```

---

## 🚀 Summary

### Key Decisions

1. ✅ **DISALLOW** custom `channels` in workflow configuration
2. ✅ **ALWAYS USE** default `AgentStateAnnotation` for all agents
3. ✅ **EXTEND STATE** via metadata interfaces (`TypedAgentState<Metadata>`)
4. ✅ **DEPRECATE** `buildStateAnnotation()` utility
5. ✅ **STANDARDIZE** on single pattern across entire codebase

### Benefits

- 🎯 **Consistency**: One pattern for all agents
- 🔒 **Type Safety**: Compile-time checking via metadata interfaces
- 🧹 **Simplicity**: No schema mismatch errors
- 📚 **Maintainability**: Clear convention for state access
- 🤝 **Collaboration**: Easier onboarding for new developers
- 🚀 **Performance**: No runtime schema resolution overhead

### Migration Impact

- **Affected Files**: 1 (ResearcherAgent) - already fixed
- **Breaking Changes**: None (custom channels were never fully adopted)
- **Deprecations**: `buildStateAnnotation()`, `channels` property
- **Documentation Updates**: LANGGRAPH_STATE_STANDARDIZATION.md, workflow-engine CLAUDE.md

---

**Decision Approved**: 2025-11-11
**Implemented By**: Claude Code
**Reviewed By**: User (pending)

---

## 🔗 Related Documents

- `LANGGRAPH_STATE_STANDARDIZATION.md` - Original standardization attempt (deprecated)
- `libs/langgraph-modules/workflow-engine/CLAUDE.md` - Workflow engine documentation
- `apps/dev-brand-api/src/app/business-workflows/agents/shared/metadata.types.ts` - Metadata type definitions
