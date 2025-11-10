# 🔑 LangGraph State Annotation Standardization

## Problem Solved

**Error**: `Invalid StateGraph input. Make sure to pass a valid Annotation.Root or Zod schema.`

**Root Cause**: ResearcherAgent (and other agents) were missing proper LangGraph 2025 state schemas. The StateGraph constructor requires an `Annotation.Root()` object, but agents were using TypeScript interfaces without providing the runtime annotation.

**Solution**: Created standardized `buildStateAnnotation()` utility that converts simple object schemas into LangGraph-compliant annotations automatically.

---

## 🎯 Standardization Approach

### Before (Manual Annotation - Verbose)

```typescript
import { Annotation } from '@langchain/langgraph';

const StateAnnotation = Annotation.Root({
  userId: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),
  query: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),
  searchResults: Annotation<any[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  // ... 20+ more fields with repetitive code
});
```

**Issues**:

- ❌ Verbose and repetitive
- ❌ Easy to make reducer mistakes
- ❌ Inconsistent patterns across agents
- ❌ Difficult to maintain

### After (Standardized - Clean)

```typescript
import { buildStateAnnotation } from '@hive-academy/langgraph-workflow-engine';

const StateAnnotation = buildStateAnnotation({
  // Simple object schema - reducers inferred automatically
  userId: { default: '' },
  query: { default: '' },
  searchResults: { default: [] }, // Auto-concat reducer
});
```

**Benefits**:

- ✅ Clean, minimal syntax
- ✅ Automatic reducer inference
- ✅ Consistent across all agents
- ✅ Type-safe with TypeScript
- ✅ Extends AgentStateAnnotation automatically

---

## 📚 Usage Guide

### 1. Import the Utility

```typescript
import { buildStateAnnotation, InferStateType } from '@hive-academy/langgraph-workflow-engine';
```

### 2. Define State Schema

```typescript
export const MyAgentStateAnnotation = buildStateAnnotation({
  // Primitives - Latest value wins (replace)
  userId: { default: '' },
  score: { default: 0 },
  isActive: { default: true },

  // Arrays - Concatenate (like messages)
  searchResults: { default: [] },
  errors: { default: [] },

  // Optional fields
  reportPath: { default: undefined as string | undefined },

  // Enum/Union types
  status: { default: 'pending' as 'pending' | 'active' | 'completed' },

  // Custom reducer (override automatic inference)
  maxScore: {
    default: 0,
    reducer: (current, update) => Math.max(current, update),
  },
});
```

### 3. Derive TypeScript Type

```typescript
// Automatic type inference (includes AgentState base fields)
export type MyAgentState = InferStateType<typeof MyAgentStateAnnotation>;

// MyAgentState now has:
// - All your custom fields (userId, score, etc.)
// - AgentState base fields (messages, metadata, next, etc.)
```

### 4. Use in @Agent Decorator

```typescript
@Agent({
  description: 'My agent with standardized state',
  type: 'workflow-agent',
  workflow: {
    name: 'my-workflow',
    type: 'functional-task',
    channels: MyAgentStateAnnotation, // 🔑 Pass annotation here
  },
})
@Injectable()
export class MyAgent {
  // Agent implementation
}
```

---

## 🔧 Automatic Reducer Inference

The `buildStateAnnotation()` utility automatically chooses the right reducer based on the default value type:

### Primitives (string, number, boolean, null)

**Strategy**: Latest value wins (replacement)

```typescript
userId: { default: '' }
// Reducer: (current, update) => update !== undefined ? update : current
```

### Arrays

**Strategy**: Concatenate (like message history)

```typescript
searchResults: { default: [] }
// Reducer: (current, update) => [...current, ...update]
```

### Objects

**Strategy**: Shallow merge

```typescript
config: { default: {} }
// Reducer: (current, update) => ({ ...current, ...update })
```

### Custom Reducers

**Override automatic inference** when needed:

```typescript
// Keep highest score
maxScore: {
  default: 0,
  reducer: (current, update) => Math.max(current, update),
},

// Deduplicated array
tags: {
  default: [],
  reducer: (current, update) => [...new Set([...current, ...update])],
},
```

---

## 🏗️ AgentStateAnnotation Extension

By default, `buildStateAnnotation()` **extends** the base `AgentStateAnnotation`, which includes:

- `messages: BaseMessage[]` - Message history
- `metadata: Record<string, unknown>` - Agent metadata
- `next: string | undefined` - Next agent routing
- `current: string | undefined` - Current agent
- `scratchpad: string` - Collaboration notes
- `task: string | undefined` - Task description
- `threadId: string | undefined` - Memory context
- `userId: string | undefined` - User identifier

**You get all these fields automatically** without defining them!

### Standalone Annotation (No Extension)

If you need a standalone annotation without AgentState fields:

```typescript
const StandaloneAnnotation = buildStateAnnotation(
  {
    myField: { default: '' },
  },
  { extendAgentState: false } // Disable extension
);
```

---

## 📋 Migration Checklist

### For Each Agent:

1. **Import the utility**:

   ```typescript
   import { buildStateAnnotation, InferStateType } from '@hive-academy/langgraph-workflow-engine';
   ```

2. **Replace manual Annotation.Root()** with `buildStateAnnotation()`:

   ```typescript
   // OLD
   export const StateAnnotation = Annotation.Root({
     field1: Annotation<string>({ reducer: ..., default: ... }),
     // ...
   });

   // NEW
   export const StateAnnotation = buildStateAnnotation({
     field1: { default: '' },
     // ...
   });
   ```

3. **Update type derivation**:

   ```typescript
   // OLD
   export type MyState = typeof StateAnnotation.State;

   // NEW
   export type MyState = InferStateType<typeof StateAnnotation>;
   ```

4. **Add to @Agent decorator**:

   ```typescript
   @Agent({
     workflow: {
       channels: StateAnnotation, // Add this line
     },
   })
   ```

5. **Rebuild the library**:
   ```bash
   npx nx build @hive-academy/langgraph-workflow-engine
   ```

---

## 🎓 Best Practices

### 1. **One State Annotation Per Agent**

Each agent should have its own state annotation tailored to its workflow needs.

```typescript
// ✅ GOOD: Agent-specific state
export const ResearchAgentStateAnnotation = buildStateAnnotation({
  query: { default: '' },
  searchResults: { default: [] },
  reportDraft: { default: '' },
});

// ❌ BAD: Shared state across agents
export const SharedStateAnnotation = buildStateAnnotation({ ... });
```

### 2. **Use Type Aliases for Complex Types**

```typescript
// ✅ GOOD: Clear type aliases
type ResearchDepth = 'summary' | 'detailed' | 'comprehensive';
type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export const StateAnnotation = buildStateAnnotation({
  researchDepth: { default: 'detailed' as ResearchDepth },
  userApproval: { default: 'pending' as ApprovalStatus },
});
```

### 3. **Document Custom Reducers**

```typescript
export const StateAnnotation = buildStateAnnotation({
  // Keep highest confidence score
  confidence: {
    default: 0,
    reducer: (current, update) => Math.max(current, update),
  },

  // Deduplicate source URLs
  sources: {
    default: [],
    reducer: (current: string[], update: string[]) => [...new Set([...current, ...update])],
  },
});
```

### 4. **Provide Descriptions for Complex Fields**

```typescript
export const StateAnnotation = buildStateAnnotation({
  // User query input for research
  query: {
    default: '',
    description: 'User-provided research query',
  },

  // Aggregated search results from multiple sources
  searchResults: {
    default: [],
    description: 'Combined results from Tavily, news, and academic APIs',
  },
});
```

---

## 🔍 Troubleshooting

### Error: "channels does not exist in type 'AgentWorkflowConfig'"

**Solution**: Rebuild the workflow-engine library:

```bash
npx nx build @hive-academy/langgraph-workflow-engine
```

### Error: "Cannot find module '@hive-academy/langgraph-workflow-engine'"

**Solution**: The library needs to be built before use:

```bash
npm run build:libs
```

### Type Errors with InferStateType

**Issue**: TypeScript can't infer the state type properly.

**Solution**: Ensure you're using `typeof` before the annotation:

```typescript
// ✅ CORRECT
export type MyState = InferStateType<typeof MyAnnotation>;

// ❌ INCORRECT
export type MyState = InferStateType<MyAnnotation>;
```

---

## 📖 Reference Examples

### ResearcherAgent (Complete Example)

```typescript
import {
  Agent,
  buildStateAnnotation,
  InferStateType,
} from '@hive-academy/langgraph-workflow-engine';

// State annotation with buildStateAnnotation
export const ResearchAgentStateAnnotation = buildStateAnnotation({
  // Input
  userId: { default: '' },
  query: { default: '' },
  researchDepth: { default: 'detailed' as 'summary' | 'detailed' | 'comprehensive' },

  // Processing
  researchTopic: { default: '' },
  searchResults: { default: [] },
  totalSources: { default: 0 },

  // Output
  reportDraft: { default: '' },
  reportTitle: { default: '' },

  // HITL
  userApproval: { default: 'pending' as 'pending' | 'approved' | 'rejected' },
  approvalFeedback: { default: undefined as string | undefined },

  // Final
  savedReportPath: { default: undefined as string | undefined },
  savedReportFilename: { default: undefined as string | undefined },
  finalReport: { default: '' },
});

// Type derivation
export type ResearchAgentState = InferStateType<typeof ResearchAgentStateAnnotation>;

// Agent decorator
@Agent({
  description: 'Autonomous research agent',
  type: 'workflow-agent',
  tools: ['web-search', 'create-report'],
  workflow: {
    name: 'researcher-workflow',
    type: 'functional-task',
    channels: ResearchAgentStateAnnotation, // 🔑 State annotation
    streaming: true,
    multiAgentInterruption: {
      enabled: true,
      interruptAfter: ['generateReportDraft'],
    },
  },
})
@Injectable()
export class ResearcherAgent {
  // Implementation...
}
```

---

## 🚀 Summary

**What Changed**:

1. ✅ Created `buildStateAnnotation()` utility in `@hive-academy/langgraph-workflow-engine`
2. ✅ Added `channels` property to `AgentWorkflowConfig` interface
3. ✅ Updated ResearcherAgent to use standardized state annotation
4. ✅ Fixed StateGraph initialization error
5. ✅ Established consistent pattern for all future agents

**Benefits**:

- 🎯 **Consistency**: All agents use the same pattern
- 🧹 **Clean**: Simple object schema instead of verbose Annotation calls
- 🤖 **Automatic**: Reducers inferred from default values
- 🔒 **Type-Safe**: Full TypeScript inference
- 📚 **Documented**: Clear best practices and examples

**Next Steps**:

1. Migrate remaining agents (GitHubCodeAnalyzerAgent, PersonalBrandStrategistAgent, ContentCreatorAgent)
2. Test streaming workflows end-to-end
3. Update documentation in agent files

---

## 📁 Files Changed

1. **`libs/langgraph-modules/workflow-engine/src/lib/utils/state-annotation-builder.ts`** - New utility
2. **`libs/langgraph-modules/workflow-engine/src/index.ts`** - Export utility
3. **`libs/langgraph-modules/workflow-engine/src/lib/decorators/multi-agent/agent.decorator.ts`** - Add `channels` property
4. **`apps/dev-brand-api/src/app/business-workflows/agents/researcher.agent.ts`** - Migrate to standard pattern

---

**✅ The standardization is complete and ready for adoption across all agents!**
