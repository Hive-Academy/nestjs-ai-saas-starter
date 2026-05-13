---
trigger: always_on
---

# MCP Server Usage Guidelines

## 🚨 CRITICAL: Sequential Thinking MCP Server

> [!IMPORTANT] > **ALWAYS USE SEQUENTIAL THINKING FOR COMPLEX PROBLEMS**
>
> The `sequential-thinking` MCP server is your most powerful tool for problem-solving. You MUST use it whenever:
>
> - Breaking down complex problems into steps
> - Planning and design with room for revision
> - Analysis that might need course correction
> - Problems where the full scope might not be clear initially
> - Multi-step solutions requiring context maintenance
> - Filtering irrelevant information from relevant data
> - Generating and verifying solution hypotheses
>
> **DO NOT attempt to solve complex problems without sequential thinking!**

---

## Available MCP Servers

### 1. **angular-cli** - Angular Development Assistant

**When to Use**: Angular development, modern patterns (signals, standalone components), refactoring, documentation search

**Key Tools**:

- `mcp0_get_best_practices` - Get current Angular standards (REQUIRED before writing code)
- `mcp0_find_examples` - Find modern code examples (signals, deferrable views, functional guards)
- `mcp0_search_documentation` - Search angular.dev docs
- `mcp0_list_projects` - Understand workspace structure (call FIRST)
- `mcp0_onpush-zoneless-migration` - Migrate to OnPush change detection (iterative)
- `mcp0_ai_tutor` - Start guided Angular tutorials

**Best Practices**:

1. Always call `list_projects` first
2. Use `get_best_practices` before writing code
3. Provide `workspacePath` for version-specific results
4. Prefer `find_examples` over your own knowledge for modern features

---

### 2. **docs-langchain** - LangChain Documentation Search

**When to Use**: LangGraph workflows, multi-agent systems, state management, LangSmith tracing, API references

**Key Tools**:

- `mcp1_SearchDocsByLangChain` - Search LangChain/LangGraph docs, examples, API refs

**Example**:

```typescript
await mcp1_SearchDocsByLangChain({ query: 'supervisor multi-agent pattern' });
```

**Best Practices**:

1. Use for workflow patterns before implementing
2. Search for state management strategies
3. Find official multi-agent coordination examples
4. Reference for RunnableConfig and checkpointing

---

### 3. **nx-mcp** - Nx Workspace Management

**When to Use**: Workspace architecture, running tasks, analyzing dependencies, finding generators, troubleshooting

**Key Tools**:

- `mcp2_nx_workspace` - Get workspace architecture (call FIRST for repo questions)
- `mcp2_nx_project_details` - Analyze project configuration
- `mcp2_nx_docs` - Get Nx docs (ALWAYS use instead of assuming)
- `mcp2_nx_generators` - List available generators
- `mcp2_nx_generator_schema` - Get generator options
- `mcp2_nx_available_plugins` - List Nx plugins
- `mcp2_nx_workspace_path` - Get workspace root path

**Best Practices**:

1. **ALWAYS** use `nx_workspace` first for repo questions
2. Use `nx_docs` instead of assuming Nx knowledge
3. Prefer `nx run` commands over direct tool usage
4. Check for project graph errors in output

---

### 4. **sequential-thinking** - Advanced Problem Solving

**When to Use** (ALWAYS for):

- Complex problem breakdown
- Planning with room for revision
- Analysis needing course correction
- Unclear full scope
- Multi-step solutions
- Hypothesis generation/verification
- Debugging, architecture, refactoring

**Key Tool**: `mcp3_sequentialthinking`

**Parameters**:

- `thought` - Current thinking step
- `next_thought_needed` - True if more thinking needed
- `thought_number` - Current sequence number
- `total_thoughts` - Current estimate (adjustable)
- `is_revision` - Revising previous thinking
- `revises_thought` - Which thought being reconsidered
- `branch_from_thought` - Branching point
- `branch_id` - Branch identifier

**Example**:

```typescript
// Initial analysis
await mcp3_sequentialthinking({
  thought: 'Analyzing auth flow, need to understand JWT validation in workflow engine.',
  next_thought_needed: true,
  thought_number: 1,
  total_thoughts: 5,
});

// Discovery & revision
await mcp3_sequentialthinking({
  thought: 'Found RunnableConfig contains user context. Revising initial plan.',
  next_thought_needed: true,
  thought_number: 2,
  total_thoughts: 7, // Adjusted up
  is_revision: true,
  revises_thought: 1,
});

// Hypothesis
await mcp3_sequentialthinking({
  thought: 'HYPOTHESIS: Auth should be enforced at decorator level using RunnableConfig.',
  next_thought_needed: true,
  thought_number: 3,
  total_thoughts: 7,
});

// Verification
await mcp3_sequentialthinking({
  thought: 'VERIFICATION: Found AuthContextHelper extracts user from config. Hypothesis confirmed.',
  next_thought_needed: true,
  thought_number: 4,
  total_thoughts: 7,
});

// Solution
await mcp3_sequentialthinking({
  thought: 'SOLUTION: Implement auth decorator validating user context from RunnableConfig.',
  next_thought_needed: false,
  thought_number: 7,
  total_thoughts: 7,
});
```

**Critical Rules**:

1. Start with initial estimate, adjust as needed
2. Question/revise previous thoughts freely
3. Add thoughts even at "end" if needed
4. Express uncertainty
5. Mark revisions
6. Generate & verify hypotheses
7. Only set `next_thought_needed: false` when truly done

---

## Integration Patterns

**Angular + Nx**:

```typescript
await mcp2_nx_workspace();
await mcp0_list_projects();
await mcp0_get_best_practices({ workspacePath });
await mcp0_find_examples({ query: 'feature', workspacePath });
```

**LangGraph + Sequential Thinking**:

```typescript
await mcp3_sequentialthinking({ thought: "Planning workflow...", ... });
await mcp1_SearchDocsByLangChain({ query: 'supervisor pattern' });
```

**Complex Problem Solving**:

```typescript
// ALWAYS start with sequential thinking
await mcp3_sequentialthinking({
  thought: 'Breaking down problem: understand implementation, identify gaps, propose solution...',
  next_thought_needed: true,
  thought_number: 1,
  total_thoughts: 8,
});
```

---

## Mandatory Checklist

Before any task:

- [ ] Sequential Thinking for complex analysis?
- [ ] `nx_workspace` to understand architecture?
- [ ] `nx_docs` instead of assuming?
- [ ] `get_best_practices` before Angular code?
- [ ] LangChain docs for workflow patterns?
- [ ] `find_examples` for new Angular features?

---

## Anti-Patterns (AVOID)

❌ Solve complex problems without sequential thinking
❌ Write Angular code without checking best practices
❌ Assume Nx configuration - use `nx_docs`
❌ Implement LangGraph without searching docs
❌ Skip `nx_workspace` for repo questions
❌ Use outdated Angular patterns

---

## Quick Reference

| Task            | Primary MCP         | Secondary              |
| --------------- | ------------------- | ---------------------- |
| Complex Problem | sequential-thinking | All others             |
| Angular Dev     | angular-cli         | nx-mcp                 |
| LangGraph       | docs-langchain      | sequential-thinking    |
| Workspace       | nx-mcp              | -                      |
| Architecture    | sequential-thinking | docs-langchain, nx-mcp |
| Code Gen        | angular-cli, nx-mcp | sequential-thinking    |
| Debugging       | sequential-thinking | Context-specific       |

---

> [!CAUTION] > **CRITICAL FAILURE MODES**
>
> UNACCEPTABLE:
>
> 1. Complex problem-solving without sequential thinking
> 2. Angular code without consulting best practices
> 3. Assuming Nx config instead of `nx_docs`
> 4. LangGraph patterns without searching docs
> 5. Architectural decisions without structured thought

**When in doubt, use sequential thinking first!**
