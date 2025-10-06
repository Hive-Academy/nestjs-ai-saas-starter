# Tool Registration & Zero-Config Pattern - Complete Guide

## Overview

This document explains how the tool registration system works in the LangGraph ecosystem, including the zero-config pattern and how tools are discovered and registered.

## The @Tool Decorator Pattern

### Full Decorator (Explicit Configuration)

```typescript
@Tool({
  name: 'github-analyzer',                    // Explicit tool name
  description: 'Analyzes GitHub repositories',
  schema: z.object({...}),                    // Optional Zod validation
  agents: ['code-analyzer'],                  // Optional: Which agents can use
  rateLimit: { requests: 10, window: 60000 } // Optional: Rate limiting
})
async analyzeGitHub({...}): Promise<...> {
  // Implementation
}
```

### Zero-Config (Method Name as Tool Name)

```typescript
@Tool() // ✅ No configuration needed!
async webSearch({...}): Promise<...> {
  // Implementation
}
```

**What happens with zero-config:**

1. Tool name defaults to **method name** (`webSearch`)
2. Description defaults to `"Tool: webSearch"`
3. No schema validation (unless added later)
4. Available to all agents (no `agents` restriction)

## How Tool Registration Works

### Step 1: Decorator Stores Metadata

When you write `@Tool()` on a method, the decorator stores metadata on the CLASS:

```typescript
// libs/langgraph-modules/multi-agent/src/lib/decorators/tool.decorator.ts (line 97-125)

export function Tool(options: Partial<ToolOptions> = {}): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // Create tool metadata with defaults for zero-config
    const toolMetadata: ToolMetadata = {
      name: options.name || String(propertyKey), // 👈 Uses method name if not provided!
      description: options.description || `Tool: ${String(propertyKey)}`,
      ...options,
      methodName: String(propertyKey),
      handler: descriptor.value,
      className: target.constructor.name,
    };

    // Get existing tools from class
    const existingTools = Reflect.getMetadata(WORKFLOW_TOOLS_KEY, target.constructor) || [];

    // Add this tool
    existingTools.push(toolMetadata);

    // Store all tools on the class constructor
    Reflect.defineMetadata(WORKFLOW_TOOLS_KEY, existingTools, target.constructor);
  };
}
```

### Step 2: Extract Tools from Class

The `getClassTools()` utility reads all tool metadata from a class:

```typescript
// libs/langgraph-modules/multi-agent/src/lib/decorators/tool.decorator.ts (line 208)

export function getClassTools(target: any): ToolMetadata[] {
  return Reflect.getMetadata(WORKFLOW_TOOLS_KEY, target) || [];
}
```

### Step 3: CentralRegistryService Registers Individual Tools

When you register a tool class in `WorkflowEngineModule.forRoot({ tools: [...] })`:

```typescript
// libs/langgraph-modules/workflow-engine/src/lib/services/central-registry.service.ts

registerTool(tool: ToolProvider): void {
  // 1. Extract the class
  let toolClass = tool; // e.g., WebResearchTools

  // 2. Get all @Tool decorated methods
  const toolMetadataArray = getClassTools(toolClass);
  // Returns: [
  //   { name: 'webSearch', methodName: 'webSearch', handler: fn, ... },
  //   { name: 'newsSearch', methodName: 'newsSearch', handler: fn, ... },
  //   { name: 'academicSearch', methodName: 'academicSearch', handler: fn, ... }
  // ]

  // 3. Register EACH tool individually by its NAME
  toolMetadataArray.forEach((toolMetadata) => {
    this.tools.set(toolMetadata.name, {
      name: toolMetadata.name,      // 'webSearch'
      class: toolClass,              // WebResearchTools
      metadata: toolMetadata,        // Full metadata
    });

    this.logger.log(`Tool registered: ${toolMetadata.name}`);
  });
}
```

## Complete Example: WebResearchTools

### Definition (Zero-Config)

```typescript
// apps/dev-brand-api/src/app/business-workflows/core/tools/web-research.tools.ts

@Injectable()
export class WebResearchTools {

  @Tool() // Method name: webSearch
  async webSearch({query, maxResults}: {...}): Promise<...> {
    // Implementation
  }

  @Tool() // Method name: newsSearch
  async newsSearch({query}: {...}): Promise<...> {
    // Implementation
  }

  @Tool() // Method name: academicSearch
  async academicSearch({query}: {...}): Promise<...> {
    // Implementation
  }
}
```

### Registration

```typescript
// apps/dev-brand-api/src/app/config/workflow-engine.config.ts

export function getWorkflowEngineConfig(): WorkflowEngineModuleOptions {
  return {
    tools: [
      WebResearchTools, // Register the CLASS
    ],
  };
}
```

### What Gets Registered

```typescript
// Internal registry state after registration:
Map {
  'webSearch' => { name: 'webSearch', class: WebResearchTools, metadata: {...} },
  'newsSearch' => { name: 'newsSearch', class: WebResearchTools, metadata: {...} },
  'academicSearch' => { name: 'academicSearch', class: WebResearchTools, metadata: {...} }
}
```

### Agent Usage

```typescript
@Agent({
  id: 'research-agent',
  tools: ['webSearch', 'newsSearch'], // ✅ Reference by method name
})
export class ResearchAgent {
  // Agent can now use these tools
}
```

## Why Zero-Config Works

### Traditional Pattern (Requires Configuration)

```typescript
// ❌ OLD: Each tool needs explicit configuration
registerTool('web-search', webSearchFunction);
registerTool('news-search', newsSearchFunction);

@Agent({
  tools: ['web-search', 'news-search']
})
```

### Zero-Config Pattern (Convention over Configuration)

```typescript
// ✅ NEW: Method names are tool names
@Tool()
async webSearch() {} // Tool name: 'webSearch'

@Tool()
async newsSearch() {} // Tool name: 'newsSearch'

@Agent({
  tools: ['webSearch', 'newsSearch']  // Use method names
})
```

**Benefits:**

1. **Less Boilerplate**: No need to specify names explicitly
2. **Self-Documenting**: Tool name matches method name
3. **Refactor-Safe**: Rename method → tool name updates automatically (if using IDE refactoring)
4. **Flexible**: Can still use explicit names when needed

## When to Use Each Pattern

### Use Zero-Config (@Tool())

**When:**

- Tool name should match method name
- No special configuration needed
- Standard validation is sufficient
- Tool available to all agents

**Example:**

```typescript
@Tool()
async calculateTotal(items: Item[]): Promise<number> {
  return items.reduce((sum, item) => sum + item.price, 0);
}
// Tool name: 'calculateTotal'
```

### Use Full Config (@Tool({...}))

**When:**

- Tool name should differ from method name
- Need Zod schema validation
- Need rate limiting
- Restrict to specific agents
- Need examples for few-shot learning

**Example:**

```typescript
@Tool({
  name: 'github-analyzer',           // Different from method name
  description: 'Comprehensive GitHub analysis',
  schema: z.object({                 // Validation schema
    username: z.string(),
    includePrivate: z.boolean().optional()
  }),
  agents: ['code-analyzer'],         // Only for specific agents
  rateLimit: {                       // Rate limiting
    requests: 10,
    window: 60000
  }
})
async analyzeGitHubProfile({username, includePrivate}: {...}) {
  // Implementation
}
// Tool name: 'github-analyzer' (not 'analyzeGitHubProfile')
```

## Registration Flow Diagram

```
User Code:
┌─────────────────────────────────────┐
│ @Injectable()                       │
│ export class WebResearchTools {    │
│                                     │
│   @Tool() // Zero-config            │
│   async webSearch() {}              │
│                                     │
│   @Tool() // Zero-config            │
│   async newsSearch() {}             │
│ }                                   │
└─────────────────────────────────────┘
           ↓
Configuration:
┌─────────────────────────────────────┐
│ WorkflowEngineModule.forRoot({     │
│   tools: [WebResearchTools]         │ ← Register CLASS
│ })                                  │
└─────────────────────────────────────┘
           ↓
CentralRegistryService.registerTool():
┌─────────────────────────────────────┐
│ 1. getClassTools(WebResearchTools)  │
│    Returns: [                       │
│      {name: 'webSearch', ...},      │
│      {name: 'newsSearch', ...}      │
│    ]                                │
│                                     │
│ 2. Register each individually:      │
│    tools.set('webSearch', {...})    │
│    tools.set('newsSearch', {...})   │
└─────────────────────────────────────┘
           ↓
Agent Validation:
┌─────────────────────────────────────┐
│ @Agent({                            │
│   tools: ['webSearch', 'newsSearch']│ ← Reference by name
│ })                                  │
│                                     │
│ validateAgentTools():               │
│   tools.has('webSearch')  ✅        │
│   tools.has('newsSearch') ✅        │
└─────────────────────────────────────┘
```

## Common Issues & Solutions

### Issue 1: Tools Not Found

**Error:**

```
Agent "my-agent" requests missing tools: webSearch
Available tools: WebResearchTools
```

**Cause:** Old registration system stored class names, not individual tool names.

**Solution:** Use updated `CentralRegistryService` that extracts individual tools (see this file).

### Issue 2: Tool Name Mismatch

**Error:**

```
Agent "my-agent" requests missing tools: web-search
Available tools: webSearch
```

**Cause:** Agent references kebab-case, but tool uses camelCase (method name).

**Solutions:**

```typescript
// Option 1: Match method name (zero-config)
@Agent({
  tools: ['webSearch']  // ✅ Match the method name
})

// Option 2: Use explicit name
@Tool({ name: 'web-search' })
async webSearch() {}  // Tool name is now 'web-search'

@Agent({
  tools: ['web-search']  // ✅ Match the explicit name
})
```

### Issue 3: Duplicate Tool Names

**Error:**

```
Tool webSearch already registered, overriding
```

**Cause:** Multiple classes have methods with the same name.

**Solution:** Use explicit names to avoid conflicts:

```typescript
// Class 1
@Tool({ name: 'tavily-web-search' })
async webSearch() {}

// Class 2
@Tool({ name: 'google-web-search' })
async webSearch() {}
```

## Best Practices

### 1. Consistent Naming Convention

Choose one convention and stick to it:

```typescript
// ✅ GOOD: camelCase (matches JavaScript/TypeScript convention)
@Tool()
async webSearch() {}

@Agent({ tools: ['webSearch'] })

// ❌ BAD: Mixing conventions
@Tool({ name: 'web-search' })
async webSearch() {}

@Agent({ tools: ['webSearch'] })  // Won't work!
```

### 2. Descriptive Method Names (Zero-Config)

Since method name becomes tool name, use descriptive names:

```typescript
// ✅ GOOD: Clear, descriptive
@Tool()
async searchTavilyWeb() {}

@Tool()
async searchGoogleScholar() {}

// ❌ BAD: Generic, unclear
@Tool()
async search() {}  // Which search?
```

### 3. Group Related Tools in Classes

```typescript
// ✅ GOOD: Logical grouping
@Injectable()
export class WebResearchTools {
  @Tool() async webSearch() {}
  @Tool() async newsSearch() {}
  @Tool() async academicSearch() {}
}

@Injectable()
export class GitHubIntegrationTools {
  @Tool() async analyzeRepository() {}
  @Tool() async extractAchievements() {}
  @Tool() async getContributions() {}
}
```

### 4. Use Explicit Config for Complex Tools

```typescript
// Simple tool - zero-config is fine
@Tool()
async calculateSum(numbers: number[]): Promise<number> {
  return numbers.reduce((a, b) => a + b, 0);
}

// Complex tool - use full config
@Tool({
  name: 'github-analysis',
  description: 'Comprehensive GitHub profile analysis with rate limiting',
  schema: z.object({
    username: z.string(),
    includePrivate: z.boolean().optional(),
    timeframe: z.enum(['week', 'month', 'year'])
  }),
  rateLimit: { requests: 10, window: 60000 },
  agents: ['code-analyzer', 'profile-analyzer']
})
async analyzeGitHub({...}) {
  // Complex implementation
}
```

## Summary

**Zero-Config Pattern:**

- Decorator: `@Tool()`
- Tool name: Method name (e.g., `webSearch`)
- Registration: Register class, individual tools extracted automatically
- Agent usage: Reference by method name

**Key Benefits:**

- Less boilerplate
- Convention over configuration
- Self-documenting code
- Still flexible when needed

**When It Works Best:**

- Tool name = method name is acceptable
- Standard validation sufficient
- No special configuration needed
- Tool available to all agents
