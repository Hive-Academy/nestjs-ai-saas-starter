# dev-brand-api

## Overview

NestJS API for the Dev Brand SaaS platform. Features AI-powered workflows, vector/graph databases, and multi-agent coordination for personal brand building.

---

## Architecture Layers

**Data Layer:**

- **ChromaDB**: Vector storage for semantic search, content similarity, trend analysis
- **Neo4j**: Graph database for developer relationships, skill networks, brand strategies

**Workflow Layer:**

- **LangGraph**: AI workflow orchestration (chat, analysis, content generation)
- **Multi-Agent**: Specialized agents (GitHub Analyzer, Content Creator, Brand Strategist)

**API Layer:**

- **REST**: Standard endpoints for CRUD operations
- **WebSocket**: Real-time workflow streaming

---

## Project Structure

```
src/app/
├── app.module.ts              # Root module
├── repositories/              # Data access
│   ├── chromadb/             # Vector DB repositories
│   └── neo4j/                # Graph DB repositories
├── business-workflows/        # AI orchestration
│   ├── workflows/            # Workflow definitions
│   ├── agents/               # Agent definitions
│   └── controllers/          # Workflow controllers
└── services/                  # Business logic
```

---

## Repository Pattern

### ChromaDB Repository

```typescript
import { Injectable } from '@nestjs/common';
import {
  ChromaDBRepository,
  ChromaDBService,
  CollectionRegistryService,
} from '@hive-academy/nestjs-chromadb';

@Injectable()
export class TechTrendsRepository extends ChromaDBRepository<TechTrendEntity> {
  constructor(chromaDB: ChromaDBService, registry: CollectionRegistryService) {
    super(TechTrendEntity, 'tech-trends', chromaDB, registry);
  }

  async findEmergingTech(): Promise<TechTrendEntity[]> {
    return this.search('emerging AI technologies', {
      nResults: 10,
      where: { category: 'emerging' },
    });
  }
}
```

**Location**: `src/app/repositories/chromadb/`

### Neo4j Repository

```typescript
import { Injectable } from '@nestjs/common';
import { Neo4jRepositoryBase, NeogmaService, Neo4jCrudService } from '@hive-academy/nestjs-neo4j';

@Injectable()
export class DeveloperRepository extends Neo4jRepositoryBase<Developer> {
  constructor(neogma: NeogmaService, crud: Neo4jCrudService) {
    super(Developer, 'Developer', neogma, crud);
  }

  async findByEmail(email: string): Promise<Developer | null> {
    return this.findOne({ where: { email } });
  }
}
```

**Location**: `src/app/repositories/neo4j/`

---

## Workflow Integration

### Define Workflow

**Location**: `src/app/business-workflows/workflows/`

```typescript
import {
  FunctionalWorkflow,
  Entrypoint,
  Task,
  WorkflowType,
} from '@hive-academy/langgraph-workflow-engine';

@FunctionalWorkflow({
  name: 'brand-analysis',
  type: WorkflowType.FUNCTIONAL_TASK,
  streaming: true,
})
@Injectable()
export class BrandAnalysisWorkflow {
  constructor(private devRepo: DeveloperRepository, private llm: LlmProviderService) {}

  @Entrypoint()
  async start(context: TaskExecutionContext) {
    const { userId } = context.state;
    const profile = await this.devRepo.findById(userId);
    return { state: { ...context.state, profile } };
  }

  @Task({ dependsOn: ['start'] })
  async analyze(context: TaskExecutionContext) {
    // Analysis logic
    return { state: context.state };
  }
}
```

### Define Agent

**Location**: `src/app/business-workflows/agents/`

```typescript
import { Agent } from '@hive-academy/langgraph-workflow-engine';

@Agent({
  description: 'Analyzes GitHub repositories',
  tools: ['github_analyzer'],
  workflow: {
    type: 'functional-task',
    streaming: true,
  },
})
@Injectable()
export class GitHubAnalyzerAgent {
  @Entrypoint()
  async analyze(context: TaskExecutionContext) {
    // Agent logic
  }
}
```

---

## Controller Integration

### Workflow Controller

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { WorkflowExecutionService } from '@hive-academy/langgraph-workflow-engine';

@Controller('workflows')
export class WorkflowController {
  constructor(
    private workflowExecutor: WorkflowExecutionService,
    private chatWorkflow: DevBrandChatWorkflow
  ) {}

  @Post('chat')
  async executeChat(@Body() input: ChatInput) {
    return this.workflowExecutor.execute(this.chatWorkflow, {
      userId: input.userId,
      userMessage: input.message,
      conversationId: input.conversationId,
    });
  }
}
```

### Streaming Controller

```typescript
@Controller('workflows')
export class StreamingWorkflowController {
  @Post('chat/stream')
  async streamChat(@Body() input: ChatInput, @Res() res: Response) {
    const stream = await this.workflowExecutor.stream(this.chatWorkflow, input);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const event of stream) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    res.end();
  }
}
```

---

## Module Organization

### Feature Module Example

```typescript
@Module({
  imports: [ChromaDBModule, Neo4jModule, WorkflowEngineModule],
  providers: [
    // Repositories
    TechTrendsRepository,
    DeveloperRepository,

    // Workflows
    DevBrandChatWorkflow,

    // Agents
    GitHubAnalyzerAgent,

    // Services
    PersonalBrandMemoryService,
  ],
  controllers: [WorkflowController],
})
export class BrandingModule {}
```

---

## Best Practices

### 1. Place Files Correctly

-**Workflows**: `src/app/business-workflows/workflows/`

- **Agents**: `src/app/business-workflows/agents/`
- **ChromaDB Repos**: `src/app/repositories/chromadb/`
- **Neo4j Repos**: `src/app/repositories/neo4j/`
- **Controllers**: `src/app/business-workflows/controllers/` or `src/app/controllers/`

### 2. Use Repository Pattern

```typescript
// ✅ CORRECT: Repository for data access
@Injectable()
export class MyService {
  constructor(private devRepo: DeveloperRepository) {}

  async getData() {
    return this.devRepo.findAll();
  }
}

// ❌ WRONG: Direct service usage
@Injectable()
export class MyService {
  constructor(private chromaDB: ChromaDBService) {}

  async getData() {
    return this.chromaDB.query(...); // Don't do this
  }
}
```

### 3. Apply Cross-Cutting Concerns via Decorators

```typescript
@Cached({ ttl: 3600000 })
@Profiled({ slowQueryThreshold: 200 })
@Retry({ maxAttempts: 3 })
async expensiveOperation() {
  // Business logic
}
```

### 4. Use Workflow Streaming for Real-Time UX

```typescript
@FunctionalWorkflow({
  streaming: true, // Enable streaming
})
```

---

## Common Patterns

### RAG Pattern

```typescript
@Task()
async generateAnswer(context: TaskExecutionContext) {
  const { question, userId } = context.state;

  // 1. Retrieve context from ChromaDB
  const context = await this.knowledgeRepo.search(question, {
    nResults: 5,
    where: { userId }
  });

  // 2. Fetch relationships from Neo4j
  const relationships = await this.devRepo.getNetwork(userId);

  // 3. Generate with LLM
  const llm = await this.llmProvider.getLLM();
  const answer = await llm.invoke([...]);

  return { state: { ...context.state, answer } };
}
```

### Multi-Agent Coordination

```typescript
@MultiAgent({
  type: 'supervisor',
  supervisor: {
    workers: ['github-analyzer', 'content-creator'],
    routingStrategy: 'llm-based',
  },
})
@Injectable()
export class BrandSupervisor {}
```

---

## Reference

### Key Imports

```typescript
import {
  // Workflow Engine
  FunctionalWorkflow,
  Entrypoint,
  Task,
  Agent,
  WorkflowType,

  // ChromaDB
  ChromaDBRepository,

  // Neo4j
  Neo4jRepositoryBase,
} from '@hive-academy/*';
```
