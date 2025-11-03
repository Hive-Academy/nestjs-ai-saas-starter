# Agent Memory Access Analysis

## Question

Can agents **autonomously call memory themselves** (agent-driven), or do we have to **hardcode memory calls** in our codebase?

## Answer

**Current Implementation: HARDCODED** ❌

The current system **automatically injects memory context** into agent state via `NodeFactoryService.enhanceAgentWithMemory()`, but **agents CANNOT autonomously decide when to access memory**. The LLM doesn't have tools to call memory - it's done behind the scenes before the agent executes.

---

## Current Architecture (Hardcoded Pattern)

### How It Works Now

**Source**: `libs/langgraph-modules/multi-agent/src/lib/network/node-factory.service.ts:114-187`

```typescript
// NodeFactoryService automatically wraps ALL agents with memory enhancement
private async enhanceAgentWithMemory(
  agent: AgentDefinition,
  state: AgentState,
  agentExecution: () => Promise<Partial<AgentState>>
): Promise<Partial<AgentState>> {
  // 1. BEFORE agent executes: Automatically fetch memory context
  if (this.memoryAdapter) {
    const memoryContext = await this.memoryAdapter.getAgentContext(state);
    enhancedState = {
      ...state,
      metadata: {
        ...state.metadata,
        memoryContext: {
          threadMemories: memoryContext.threadMemories.slice(0, 5),
          userMemories: memoryContext.userMemories.slice(0, 3),
          // ... memory data
        }
      }
    };
  }

  // 2. Execute agent with pre-loaded memory in state
  const result = await agentExecution();

  // 3. AFTER agent executes: Automatically store execution result
  if (this.memoryAdapter && result) {
    await this.memoryAdapter.storeAgentExecution(enhancedState, result, agent.id);
  }

  return result;
}
```

### What This Means

**Agent Execution Flow**:

```
1. User sends message to workflow
2. NodeFactoryService intercepts agent execution
3. NodeFactoryService fetches memory context (AUTOMATIC, not agent-driven)
4. Memory injected into state.metadata.memoryContext
5. Agent executes with pre-loaded memory in state
6. Agent returns result
7. NodeFactoryService stores result in memory (AUTOMATIC)
```

**Agent Code**:

```typescript
@Agent({ id: 'my-agent' })
export class MyAgent extends DeclarativeWorkflowBase<AgentState> {
  @Entrypoint()
  async process(context: TaskExecutionContext<AgentState>) {
    // Memory is already in state.metadata.memoryContext (injected by framework)
    const memories = context.state.metadata?.memoryContext?.threadMemories || [];

    // Agent CANNOT:
    // - Decide when to fetch memory
    // - Search for specific memory
    // - Control what memory to retrieve
    // - Skip memory fetching if not needed

    // Agent CAN:
    // - Read pre-loaded memory from state.metadata
    // - Use or ignore the memory

    return { messages: [...] };
  }
}
```

### Key Characteristics

| Aspect                      | Current Implementation                         |
| --------------------------- | ---------------------------------------------- |
| **Who fetches memory?**     | NodeFactoryService (framework)                 |
| **When is memory fetched?** | BEFORE every agent execution (automatic)       |
| **Can agent control it?**   | ❌ NO - agent receives pre-loaded memory       |
| **Can LLM decide?**         | ❌ NO - LLM doesn't see memory tools           |
| **Memory query control**    | ❌ Fixed (last 5 thread, last 3 user memories) |
| **Agent autonomy**          | ❌ LOW - agent is passive consumer of memory   |

---

## What "Agent-Driven" Would Look Like

### Option 1: Memory as LangChain Tools (Agent Decides)

**Pattern**: Give LLM tools to search/retrieve memory when it decides it needs context

```typescript
// Register memory tools for agents
@Injectable()
export class MemoryToolsService {
  constructor(
    private readonly toolRegistry: ToolRegistryService,
    private readonly memoryAdapter: IMemoryAdapter
  ) {}

  async onModuleInit() {
    // Register "search_memory" tool
    await this.toolRegistry.registerDynamicTool(
      new DynamicStructuredTool({
        name: 'search_memory',
        description: 'Search conversation history and past interactions for relevant context',
        schema: z.object({
          query: z.string().describe('What to search for in memory'),
          limit: z.number().optional().describe('Max results to return'),
        }),
        func: async (input) => {
          const results = await this.memoryAdapter.search({
            query: input.query,
            limit: input.limit || 5,
          });
          return JSON.stringify(results);
        },
      }),
      { agents: '*' } // Available to all agents
    );

    // Register "get_user_patterns" tool
    await this.toolRegistry.registerDynamicTool(
      new DynamicStructuredTool({
        name: 'get_user_patterns',
        description: 'Get behavioral patterns for the current user',
        schema: z.object({
          userId: z.string(),
          days: z.number().optional().describe('Look back this many days'),
        }),
        func: async (input) => {
          const patterns = await this.memoryAdapter.getUserPatterns(input.userId, input.days || 30);
          return JSON.stringify(patterns);
        },
      }),
      { agents: '*' }
    );

    // Register "store_memory" tool
    await this.toolRegistry.registerDynamicTool(
      new DynamicStructuredTool({
        name: 'store_memory',
        description: 'Store important information for future reference',
        schema: z.object({
          content: z.string().describe('What to remember'),
          importance: z.number().min(0).max(1).describe('How important (0-1)'),
          tags: z.array(z.string()).optional(),
        }),
        func: async (input) => {
          await this.memoryAdapter.store('agent-memory', input.content, {
            importance: input.importance,
            tags: input.tags,
          });
          return 'Memory stored successfully';
        },
      }),
      { agents: '*' }
    );
  }
}
```

**Agent Execution with Tools**:

```typescript
// LLM conversation flow:
User: "What did we discuss about the database migration last week?"

LLM: I should search memory for context about database migration.
[LLM calls tool: search_memory({ query: "database migration", limit: 3 })]

Tool Result: [
  { content: "Discussed PostgreSQL to MongoDB migration", timestamp: "..." },
  { content: "Decided to use Prisma for migration scripts", timestamp: "..." },
  { content: "Target completion date: end of Q2", timestamp: "..." }
]

LLM: Based on our previous conversations, we discussed migrating from PostgreSQL
to MongoDB using Prisma migration scripts, with a target completion by end of Q2.

[LLM calls tool: store_memory({
  content: "User asked about database migration status",
  importance: 0.7,
  tags: ["database", "migration", "follow-up"]
})]
```

**Characteristics**:

| Aspect                      | Tool-Based (Agent-Driven)                           |
| --------------------------- | --------------------------------------------------- |
| **Who fetches memory?**     | LLM decides when to call tool                       |
| **When is memory fetched?** | ONLY when LLM determines it's needed                |
| **Can agent control it?**   | ✅ YES - LLM calls tools autonomously               |
| **Can LLM decide?**         | ✅ YES - LLM sees tool descriptions, decides usage  |
| **Memory query control**    | ✅ Dynamic (LLM specifies query, limit, filters)    |
| **Agent autonomy**          | ✅ HIGH - agent actively decides when/what to fetch |

### Option 2: Hybrid (Framework + Tools)

**Pattern**: Combine automatic memory injection (current) with optional tools for explicit searches

```typescript
// Current automatic memory injection continues
NodeFactoryService.enhanceAgentWithMemory() // Provides baseline memory

// PLUS agents can call tools for specific searches
@Agent({ id: 'smart-agent' })
export class SmartAgent extends DeclarativeWorkflowBase<AgentState> {
  @Entrypoint()
  async process(context: TaskExecutionContext<AgentState>) {
    // 1. Framework provides baseline memory in state.metadata.memoryContext
    const baselineMemories = context.state.metadata?.memoryContext?.threadMemories || [];

    // 2. LLM can ALSO call search_memory tool for specific queries
    // LLM: "User mentioned 'API performance' - let me search for related context"
    // [Calls search_memory({ query: "API performance optimization" })]

    return { messages: [...] };
  }
}
```

**Characteristics**:

| Aspect                      | Hybrid Approach                                  |
| --------------------------- | ------------------------------------------------ |
| **Who fetches memory?**     | Framework (baseline) + LLM (on-demand)           |
| **When is memory fetched?** | Always (baseline) + when LLM decides (specific)  |
| **Can agent control it?**   | ⚠️ PARTIAL - baseline automatic, tools optional  |
| **Can LLM decide?**         | ✅ YES - for specific searches beyond baseline   |
| **Memory query control**    | ⚠️ Mixed (baseline fixed, tool queries dynamic)  |
| **Agent autonomy**          | ⚠️ MEDIUM - passive baseline + active tool usage |

---

## Comparison Table

| Approach                   | Current (Hardcoded)        | Tool-Based (Agent-Driven) | Hybrid                |
| -------------------------- | -------------------------- | ------------------------- | --------------------- |
| **Agent autonomy**         | ❌ LOW                     | ✅ HIGH                   | ⚠️ MEDIUM             |
| **Memory efficiency**      | ⚠️ Fetches always          | ✅ Fetches on-demand      | ⚠️ Always + on-demand |
| **LLM token usage**        | ✅ Low (no tools)          | ⚠️ Higher (tool calls)    | ⚠️ Higher             |
| **Agent control**          | ❌ NO                      | ✅ YES                    | ⚠️ PARTIAL            |
| **Complexity**             | ✅ Simple                  | ⚠️ Medium (tool setup)    | ❌ Complex            |
| **Startup time**           | ⚠️ Delayed (Phase 1 fixes) | ✅ Instant (lazy)         | ⚠️ Delayed baseline   |
| **Memory cost**            | ⚠️ Always loaded           | ✅ Only when needed       | ❌ Highest (both)     |
| **LangGraph 2025 aligned** | ⚠️ Partial (in-node)       | ✅ Full (tool-based)      | ✅ Full               |

---

## Recommendation

### For Your Use Case: **Tool-Based (Agent-Driven)** ✅

**Why Tool-Based is Better**:

1. **Agent Autonomy**: LLM decides when memory is needed, not hardcoded
2. **Efficiency**: Memory only fetched when LLM determines it's relevant
3. **Flexibility**: LLM can specify exact queries (e.g., "search for API discussions from last week")
4. **Scalability**: No startup delays (tools are lazy by nature)
5. **LangGraph 2025 Alignment**: Tools are the recommended pattern for memory access

**When Current (Hardcoded) is Better**:

- Simple chatbots where EVERY message needs conversation history
- Low-context tasks (e.g., customer support with short sessions)
- When LLM shouldn't decide (e.g., compliance requires all context)

**When Hybrid is Better**:

- Migration path (keep current behavior, add tools incrementally)
- When baseline context is ALWAYS needed + specific searches occasionally
- Heavy logging/audit requirements (automatic storage + manual retrieval)

---

## Implementation Recommendation

### Phase 1: Fix HITL Startup Queries (REQUIRED)

- Remove OnModuleInit queries from HITL services
- Follow `PHASE_1_IMPLEMENTATION_PLAN.md`
- **Result**: Application starts instantly, no ChromaDB errors

### Phase 2: Add Memory Tools (RECOMMENDED - Agent-Driven)

**Create Memory Tools Service**:

```typescript
// libs/langgraph-modules/memory/src/lib/tools/memory-tools.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { IMemoryAdapter } from '@hive-academy/langgraph-core';
import { ToolRegistryService } from '@hive-academy/langgraph-multi-agent';

@Injectable()
export class MemoryToolsService implements OnModuleInit {
  constructor(
    private readonly memoryAdapter: IMemoryAdapter,
    private readonly toolRegistry: ToolRegistryService
  ) {}

  async onModuleInit() {
    await this.registerMemoryTools();
  }

  private async registerMemoryTools() {
    // 1. Search Memory Tool
    const searchMemoryTool = new DynamicStructuredTool({
      name: 'search_memory',
      description:
        'Search conversation history and past interactions for relevant context. Use this when you need to recall previous discussions or find specific information.',
      schema: z.object({
        query: z
          .string()
          .describe(
            'Natural language query for what to search (e.g., "API performance discussion", "database migration plan")'
          ),
        limit: z
          .number()
          .optional()
          .default(5)
          .describe('Maximum number of results to return (default: 5)'),
        minRelevance: z
          .number()
          .optional()
          .default(0.6)
          .describe('Minimum relevance score 0-1 (default: 0.6)'),
      }),
      func: async (input) => {
        const results = await this.memoryAdapter.search({
          query: input.query,
          limit: input.limit,
          minRelevance: input.minRelevance,
        });

        if (results.length === 0) {
          return 'No relevant memories found. Try a different search query.';
        }

        return JSON.stringify(
          results.map((r) => ({
            content: r.content,
            timestamp: r.timestamp,
            relevance: r.score,
          }))
        );
      },
    });

    // 2. Get User Patterns Tool
    const getUserPatternsTool = new DynamicStructuredTool({
      name: 'get_user_patterns',
      description:
        'Retrieve behavioral patterns and preferences for the current user. Use this to personalize responses or understand user habits.',
      schema: z.object({
        userId: z.string().describe('User ID to get patterns for'),
        limitDays: z
          .number()
          .optional()
          .default(30)
          .describe('Look back this many days (default: 30)'),
      }),
      func: async (input) => {
        const patterns = await this.memoryAdapter.getUserPatterns(input.userId, input.limitDays);

        return JSON.stringify({
          commonTopics: patterns.commonTopics || [],
          interactionFrequency: patterns.interactionFrequency || 0,
          preferredStyle: patterns.preferredStyle || 'unknown',
        });
      },
    });

    // 3. Store Important Memory Tool
    const storeMemoryTool = new DynamicStructuredTool({
      name: 'store_memory',
      description:
        'Store important information for future reference. Use this to remember key decisions, preferences, or facts.',
      schema: z.object({
        content: z.string().describe('What to remember (be specific and concise)'),
        importance: z
          .number()
          .min(0)
          .max(1)
          .describe('Importance level 0-1 (0.5=normal, 0.8=important, 1.0=critical)'),
        tags: z
          .array(z.string())
          .optional()
          .describe('Tags for categorization (e.g., ["decision", "preference", "api"])'),
      }),
      func: async (input) => {
        await this.memoryAdapter.store(`memory-${Date.now()}`, input.content, {
          importance: input.importance,
          tags: input.tags || [],
          type: 'agent-stored',
          timestamp: new Date(),
        });

        return `Memory stored successfully: "${input.content.substring(0, 50)}..."`;
      },
    });

    // Register all tools with multi-agent module
    await this.toolRegistry.registerDynamicTool(searchMemoryTool, { agents: '*' });
    await this.toolRegistry.registerDynamicTool(getUserPatternsTool, { agents: '*' });
    await this.toolRegistry.registerDynamicTool(storeMemoryTool, { agents: '*' });

    console.log('✅ Memory tools registered: search_memory, get_user_patterns, store_memory');
  }
}
```

**Update MemoryModule**:

```typescript
// libs/langgraph-modules/memory/src/lib/memory.module.ts

import { Module } from '@nestjs/common';
import { MemoryToolsService } from './tools/memory-tools.service';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';

@Module({
  imports: [
    MultiAgentModule, // Import to access ToolRegistryService
  ],
  providers: [
    // ... existing providers
    MemoryToolsService, // NEW: Register memory tools
  ],
  exports: [
    // ... existing exports
    MemoryToolsService,
  ],
})
export class MemoryModule {}
```

**Result**: Agents can now autonomously decide when to search memory, store memories, and retrieve user patterns via LLM tool calling.

### Phase 3: Remove Hardcoded Memory Injection (OPTIONAL)

If you want **full agent autonomy**, remove the automatic memory injection:

```typescript
// libs/langgraph-modules/multi-agent/src/lib/network/node-factory.service.ts

// COMMENT OUT automatic memory enhancement
// private async enhanceAgentWithMemory(...) { ... }

// Agents now ONLY access memory via tools (no automatic injection)
```

**Trade-off**:

- ✅ Full agent control
- ✅ No wasted memory fetches
- ❌ LLM must explicitly call tools (might forget)
- ❌ Higher token usage (tool calls)

---

## Final Answer to Your Question

**Current State**: ❌ **HARDCODED** - Memory is automatically injected before agent execution. Agents CANNOT decide when to fetch memory.

**Recommended State**: ✅ **AGENT-DRIVEN** - Provide memory tools so LLM can autonomously decide when to search/store memory.

**Implementation**:

1. ✅ Phase 1: Fix HITL startup queries (removes blocking queries)
2. ✅ Phase 2: Add memory tools (enables agent autonomy)
3. ⚠️ Phase 3: Remove hardcoded injection (optional - full autonomy)

**Answer**: Yes, we **currently hardcode** memory calls, but we **should provide tools** for agents to call memory themselves. This aligns with LangGraph 2025 best practices and gives agents true autonomy.
