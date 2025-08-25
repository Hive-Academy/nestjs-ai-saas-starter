# TASK_INT_007: Implementation Plan

## Phase 1: Workflow-Engine Fixes (Day 1)

### Morning Session (4 hours)

#### 1.1 Implement SubgraphManagerService Methods

**File**: `libs/langgraph-modules/workflow-engine/src/lib/services/subgraph-manager.service.ts`

```typescript
// TODO Implementation 1: createCheckpointer()
async createCheckpointer(config?: CheckpointerConfig): Promise<BaseCheckpointSaver> {
  // Option 1: Use MemorySaver for development
  const checkpointer = new MemorySaver();

  // Option 2: Use persistent storage if configured
  if (config?.type === 'persistent') {
    // Implement Redis or PostgreSQL checkpointer
    return this.createPersistentCheckpointer(config);
  }

  return checkpointer;
}

// TODO Implementation 2: createSubgraph()
async createSubgraph<TState extends WorkflowState>(
  definition: SubgraphDefinition,
  parentState: TState
): Promise<CompiledStateGraph<TState>> {
  const subgraph = new StateGraph<TState>({
    channels: definition.channels || this.inferChannels(parentState)
  });

  // Add nodes from definition
  for (const node of definition.nodes) {
    subgraph.addNode(node.id, node.handler);
  }

  // Add edges from definition
  for (const edge of definition.edges) {
    if (edge.condition) {
      subgraph.addConditionalEdges(edge.from, edge.condition);
    } else {
      subgraph.addEdge(edge.from, edge.to);
    }
  }

  // Set entry point
  if (definition.entryPoint) {
    subgraph.setEntryPoint(definition.entryPoint);
  }

  // Compile with checkpointer
  const checkpointer = await this.createCheckpointer(definition.checkpointerConfig);
  return subgraph.compile({ checkpointer });
}
```

#### 1.2 Fix Graph Building from Workflow Definition

**File**: `libs/langgraph-modules/workflow-engine/src/lib/base/streaming-workflow.base.ts`

```typescript
// TODO Implementation 3: Build graph from workflow definition
protected buildGraphFromDefinition(definition: WorkflowDefinition): StateGraph {
  const graph = new StateGraph({
    channels: definition.stateChannels || this.getDefaultChannels()
  });

  // Process nodes with metadata
  definition.nodes.forEach(node => {
    const handler = this.wrapNodeWithStreaming(node);
    graph.addNode(node.id, handler);
  });

  // Process edges with routing
  definition.edges.forEach(edge => {
    if (edge.type === 'conditional') {
      graph.addConditionalEdges(
        edge.source,
        this.createRoutingFunction(edge.conditions)
      );
    } else {
      graph.addEdge(edge.source, edge.target);
    }
  });

  // Set workflow entry
  graph.setEntryPoint(definition.entryPoint || START);

  return graph;
}
```

### Afternoon Session (4 hours)

#### 1.3 Fix Compilation Errors

- Remove unused imports
- Fix type mismatches
- Resolve circular dependencies
- Add missing type definitions

#### 1.4 Create Unit Tests

```typescript
describe('SubgraphManagerService', () => {
  it('should create checkpointer successfully', async () => {
    const checkpointer = await service.createCheckpointer();
    expect(checkpointer).toBeDefined();
    expect(checkpointer).toBeInstanceOf(BaseCheckpointSaver);
  });

  it('should create subgraph from definition', async () => {
    const definition: SubgraphDefinition = {
      nodes: [{ id: 'test', handler: async (state) => state }],
      edges: [{ from: START, to: 'test' }],
      entryPoint: START,
    };

    const subgraph = await service.createSubgraph(definition, {});
    expect(subgraph).toBeDefined();
  });
});
```

## Phase 2: Functional-API Type Fixes (Day 2)

### Morning Session (4 hours)

#### 2.1 Fix Type Inference Issues

**File**: `libs/langgraph-modules/functional-api/src/lib/services/graph-generator.service.ts`

```typescript
// Fix entrypoint type inference
interface TaskMetadata {
  name: string;
  isEntrypoint?: boolean;
  dependencies?: string[];
}

private findEntrypoint(tasks: TaskMetadata[]): TaskMetadata | undefined {
  return tasks.find(task => task.isEntrypoint === true);
}

// Fix task name property access
private buildExecutionGraph(tasks: TaskMetadata[]): void {
  const entrypoint = this.findEntrypoint(tasks);
  if (!entrypoint?.name) {
    throw new Error('No entrypoint found');
  }

  // Use proper typing
  const tasksByName = new Map<string, TaskMetadata>();
  tasks.forEach(task => {
    if (task.name) {
      tasksByName.set(task.name, task);
    }
  });
}
```

#### 2.2 Resolve Unknown Type Issues

```typescript
// Add proper type guards
function isTaskMetadata(obj: unknown): obj is TaskMetadata {
  return typeof obj === 'object' && obj !== null && 'name' in obj && typeof (obj as any).name === 'string';
}

// Use type guards in filtering
const validTasks = allTasks.filter(isTaskMetadata);
```

### Afternoon Session (4 hours)

#### 2.3 Fix Core Library Exports

**File**: `libs/nestjs-langgraph/src/index.ts`

```typescript
// Fix missing exports
export { LangGraphModule } from './lib/langgraph.module';
export { WorkflowGraphBuilderService } from './lib/services/workflow-graph-builder.service';
export * from './lib/interfaces';
export * from './lib/decorators';
export * from './lib/base';
```

#### 2.4 Fix Interface Imports

```typescript
// Create proper interface exports
// libs/nestjs-langgraph/src/lib/interfaces/index.ts
export * from './workflow.interface';
export * from './agent.interface';
export * from './streaming.interface';
export * from './tool.interface';
```

## Phase 3: Demo Application Fixes (Day 3)

### Morning Session (4 hours)

#### 3.1 Fix Module Imports

**File**: `apps/nestjs-ai-saas-starter-demo/src/app/app.module.ts`

```typescript
import { NestjsLanggraphModule } from '@hive-academy/nestjs-langgraph';

// Fix the import to use correct module name
@Module({
  imports: [
    NestjsLanggraphModule.forRootAsync({
      // configuration
    })
  ]
})
```

#### 3.2 Fix DTO Initialization

**File**: `apps/nestjs-ai-saas-starter-demo/src/modules/documents/dto/create-document.dto.ts`

```typescript
export class CreateDocumentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content!: string; // Add definite assignment assertion

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
```

### Afternoon Session (4 hours)

#### 3.3 Fix Neo4j Service Types

```typescript
// Fix the run method signature
async createNode(createNodeDto: CreateNodeDto) {
  return this.neo4j.run(
    async (session) => {
      const result = await session.run(
        'CREATE (n:Node $props) RETURN n',
        { props: createNodeDto }
      );
      return result.records[0]?.get('n');
    }
  );
}
```

#### 3.4 Implement Missing buildFromClass

```typescript
// Add to WorkflowGraphBuilderService
async buildFromClass<T extends WorkflowState>(
  WorkflowClass: new (...args: any[]) => any
): Promise<CompiledStateGraph<T>> {
  const instance = new WorkflowClass();
  const metadata = this.metadataProcessor.extractWorkflowMetadata(WorkflowClass);

  return this.buildFromMetadata<T>(metadata, instance);
}
```

## Phase 4: First Agent Implementation (Day 4)

### Morning Session (4 hours)

#### 4.1 Create Supervisor Agent

**File**: `apps/nestjs-ai-saas-starter-demo/src/modules/agents/supervisor.agent.ts`

```typescript
@Injectable()
@Workflow({
  name: 'supervisor-workflow',
  pattern: 'supervisor',
})
export class SupervisorAgent extends DeclarativeWorkflowBase {
  @Node({ type: 'supervisor' })
  async route(state: WorkflowState): Promise<Command<WorkflowState>> {
    const { task, complexity } = state;

    // Routing logic
    if (complexity === 'simple') {
      return { type: CommandType.GOTO, goto: 'simple_worker' };
    } else if (complexity === 'complex') {
      return { type: CommandType.GOTO, goto: 'complex_worker' };
    }

    return { type: CommandType.END };
  }

  @Node({ type: 'worker' })
  async simpleWorker(state: WorkflowState): Promise<Partial<WorkflowState>> {
    // Simple task processing
    return {
      result: `Processed simple task: ${state.task}`,
      status: 'completed',
    };
  }

  @Node({ type: 'worker' })
  async complexWorker(state: WorkflowState): Promise<Partial<WorkflowState>> {
    // Complex task processing with LLM
    const result = await this.llm.invoke({
      messages: [
        {
          role: 'user',
          content: `Analyze and process: ${state.task}`,
        },
      ],
    });

    return {
      result: result.content,
      status: 'completed',
      metadata: { processingTime: Date.now() - state.startTime },
    };
  }
}
```

### Afternoon Session (4 hours)

#### 4.2 Add Streaming Support

```typescript
@Node({
  type: 'llm',
  streaming: { token: true, progress: true }
})
@StreamToken({ enabled: true, bufferSize: 50 })
async streamingWorker(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const stream = await this.llm.stream({
    messages: [{ role: 'user', content: state.prompt }]
  });

  let fullResponse = '';
  for await (const chunk of stream) {
    fullResponse += chunk.content;
    // Token streaming handled by decorator
  }

  return { response: fullResponse };
}
```

#### 4.3 Implement HITL Approval

```typescript
@Node({ type: 'human' })
@RequiresApproval({
  confidenceThreshold: 0.7,
  timeout: 30000
})
async reviewResult(state: WorkflowState): Promise<Partial<WorkflowState>> {
  // Wait for human approval
  const approved = await this.waitForApproval(state.executionId);

  if (approved) {
    return {
      status: 'approved',
      nextStep: 'finalize'
    };
  }

  return {
    status: 'rejected',
    nextStep: 'revise'
  };
}
```

#### 4.4 Create Demo Workflow

```typescript
// Complete document processing workflow
@Injectable()
export class DocumentProcessingWorkflow extends DeclarativeWorkflowBase {
  @Node({ type: 'start' })
  async extractText(state: WorkflowState): Promise<Partial<WorkflowState>> {
    // Extract text from document
    const text = await this.documentService.extractText(state.documentId);
    return { extractedText: text };
  }

  @Node({ type: 'llm', streaming: true })
  async analyzeContent(state: WorkflowState): Promise<Partial<WorkflowState>> {
    // Analyze with LLM
    const analysis = await this.llm.invoke({
      messages: [
        {
          role: 'user',
          content: `Analyze: ${state.extractedText}`,
        },
      ],
    });
    return { analysis: analysis.content };
  }

  @Node({ type: 'tool' })
  async storeResults(state: WorkflowState): Promise<Partial<WorkflowState>> {
    // Store in ChromaDB
    await this.chromaDB.addDocument('analyses', {
      content: state.analysis,
      metadata: { documentId: state.documentId },
    });

    // Store in Neo4j
    await this.neo4j.run(async (session) => {
      await session.run('CREATE (a:Analysis {id: $id, content: $content})', { id: state.documentId, content: state.analysis });
    });

    return { stored: true };
  }

  @Edge('extractText', 'analyzeContent')
  @Edge('analyzeContent', 'storeResults')
  defineFlow() {}
}
```

## Testing Strategy

### Unit Tests for Each Fix

```typescript
// Test workflow-engine fixes
describe('Workflow Engine Fixes', () => {
  it('should create checkpointer', async () => {});
  it('should create subgraph', async () => {});
  it('should build from definition', async () => {});
});

// Test functional-api fixes
describe('Functional API Fixes', () => {
  it('should handle task metadata correctly', async () => {});
  it('should infer types properly', async () => {});
});
```

### Integration Tests

```typescript
describe('End-to-End Workflow', () => {
  it('should execute complete workflow', async () => {
    const result = await workflowService.execute('DocumentProcessingWorkflow', {
      documentId: 'test-doc-1',
    });

    expect(result.status).toBe('completed');
    expect(result.stored).toBe(true);
  });
});
```

## Success Criteria

### Day 1 Success

- [ ] Workflow-engine compiles without errors
- [ ] All TODOs implemented
- [ ] Unit tests pass

### Day 2 Success

- [ ] Functional-api compiles without errors
- [ ] Type inference working
- [ ] Core library exports fixed

### Day 3 Success

- [ ] Demo app builds successfully
- [ ] All imports resolved
- [ ] Basic workflow runs

### Day 4 Success

- [ ] Supervisor agent working
- [ ] Streaming functional
- [ ] HITL approval works
- [ ] Complete demo workflow executes

## Risk Mitigation

### If Blocked on Day 1

- Implement minimal checkpointer (MemorySaver only)
- Skip complex subgraph features
- Focus on getting compilation working

### If Blocked on Day 2

- Use 'any' types temporarily to unblock
- Document type issues for later fix
- Prioritize compilation over type safety

### If Blocked on Day 3

- Create minimal demo without all features
- Focus on one working path
- Document integration issues

### If Blocked on Day 4

- Implement simpler agent first
- Skip advanced features (streaming/HITL)
- Focus on basic workflow execution
