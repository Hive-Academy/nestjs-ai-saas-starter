---
trigger: always_on
---

# dev-brand-api

## Overview

NestJS API for the Dev Brand SaaS platform. Features AI-powered workflows, vector/graph databases, and multi-agent coordination.

---

## Architecture

**Data Layer:**

- ChromaDB: Vector storage for semantic search
- Neo4j: Graph database for relationships

**Workflow Layer:**

- LangGraph: AI workflow orchestration
- Multi-agent: Specialized agents (GitHub, Content, Strategy)

**API Layer:**

- REST controllers
- WebSocket streaming

---

## Repository Pattern

### ChromaDB Repository

```typescript
@Injectable()
export class MyRepository extends ChromaDBRepository<MyEntity> {
  constructor(chromaDB: ChromaDBService, registry: CollectionRegistryService) {
    super(MyEntity, 'my-collection', chromaDB, registry);
  }
}
```

### Neo4j Repository

```typescript
@Injectable()
export class MyRepository extends Neo4jRepositoryBase<MyEntity> {
  constructor(neogma: NeogmaService, crud: Neo4jCrudService) {
    super(MyEntity, 'MyLabel', neogma, crud);
  }
}
```

---

## Workflow Integration

### Define Workflow

Place in `src/app/business-workflows/workflows/`:

```typescript
@FunctionalWorkflow({
  name: 'my-workflow',
  type: WorkflowType.FUNCTIONAL_TASK,
})
@Injectable()
export class MyWorkflow {
  @Entrypoint()
  async start(context: TaskExecutionContext) {
    return { state: { ...context.state, started: true } };
  }
}
```

### Expose via Controller

```typescript
@Controller('workflows')
export class WorkflowController {
  constructor(private myWorkflow: MyWorkflow) {}

  @Post('execute')
  async execute(@Body() input: any) {
    return this.workflowExecutor.execute(this.myWorkflow, input);
  }
}
```

---

## Best Practices

1. Place workflows in `business-workflows/workflows/`
2. Place agents in `business-workflows/agents/`
3. Extend base repositories for data access
4. Use decorators for cross-cutting concerns
