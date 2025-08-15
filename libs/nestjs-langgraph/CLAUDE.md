# CLAUDE.md - NestJS LangGraph Integration Library

This file provides Claude Code with comprehensive guidance for working with the NestJS LangGraph integration library, a sophisticated AI agent workflow orchestration system.

## Business Domain & Purpose

### Core Mission
The NestJS LangGraph library enables building sophisticated AI agent workflows with:
- **Declarative Workflow Definition**: Use TypeScript decorators to define complex AI workflows
- **Real-time Streaming**: Token, event, and progress streaming for responsive user experiences  
- **Human-in-the-Loop (HITL)**: Sophisticated approval workflows with risk assessment
- **Tool Autodiscovery**: Automatic tool registration and intelligent agent-tool mapping
- **Production-Ready**: Enterprise features including monitoring, checkpointing, and error handling

### Target Use Cases
- **Multi-agent AI Systems**: Coordinate multiple specialized AI agents
- **Document Processing Pipelines**: Complex document analysis and transformation workflows
- **Customer Support Automation**: AI-powered support with human escalation
- **Content Generation Systems**: AI content creation with approval workflows
- **Knowledge Management**: RAG pipelines with semantic search and graph relationships
- **Decision Support Systems**: AI recommendations with human oversight

## Technical Architecture

### High-Level Design Patterns

#### 1. Decorator-Driven Architecture
```typescript
@Workflow({
  name: 'content-review-workflow',
  streaming: true,
  hitl: { enabled: true, confidenceThreshold: 0.8 }
})
export class ContentReviewWorkflow extends DeclarativeWorkflowBase {
  
  @Node({ type: 'llm', description: 'Generate content' })
  @StreamToken({ enabled: true, bufferSize: 30 })
  async generateContent(state: WorkflowState) {
    // Node implementation
  }
  
  @Node({ type: 'human', description: 'Review generated content' })
  @RequiresApproval({
    confidenceThreshold: 0.7,
    riskThreshold: ApprovalRiskLevel.MEDIUM
  })
  async reviewContent(state: WorkflowState) {
    // Approval node implementation
  }
}
```

#### 2. Streaming-First Design
The library is built around real-time streaming capabilities:
- **Token Streaming**: Real-time token delivery with buffering and batching
- **Event Streaming**: Lifecycle and custom events throughout workflow execution
- **Progress Streaming**: Granular progress updates with ETA calculations
- **WebSocket Bridge**: Seamless real-time communication with frontend clients

#### 3. Compilation and Caching System
```typescript
// Workflows are compiled once and cached for performance
const compiled = await workflowGraphBuilder.buildFromDecorators(MyWorkflow);
const cachedGraph = compilationCache.get(workflowId);
```

### Core Service Architecture

#### 1. WorkflowGraphBuilderService
**Purpose**: Compiles decorator-based workflows into executable LangGraph StateGraphs
**Key Features**:
- Metadata extraction from decorators
- Graph topology validation
- Command pattern support (GOTO, UPDATE, END, RETRY, ERROR)
- Subgraph composition
- Pattern implementations (supervisor, pipeline, parallel)

**Usage Pattern**:
```typescript
const graph = await workflowGraphBuilder.buildFromDecorators(
  WorkflowClass,
  {
    checkpointer: memoryCheckpointer,
    interrupt: { before: ['human_approval'] }
  }
);
```

#### 2. Streaming Services Ecosystem

**TokenStreamingService**:
- Manages token-level streaming with configurable buffering
- Supports filtering, batching, and custom token processing
- Real-time statistics and performance monitoring

**EventStreamProcessorService**:
- Handles workflow lifecycle events
- Custom event registration and routing
- Event filtering and transformation

**WorkflowStreamService**:
- Orchestrates multiple streaming types
- Stream lifecycle management
- Integration with WebSocket bridge

#### 3. Tool Registry and Discovery

**ToolDiscoveryService**:
- Automatic tool discovery via reflection
- Agent-tool mapping based on capabilities
- Tool validation and schema enforcement

**ToolRegistryService**:
- Central repository for all available tools
- Dynamic tool loading and unloading
- Tool versioning and compatibility checking

#### 4. Human-in-the-Loop (HITL) System

**HumanApprovalService**:
- Sophisticated approval workflows with timeout handling
- Risk assessment and confidence evaluation
- Multi-level approval chains with escalation
- Real-time approval streaming

**ConfidenceEvaluatorService**:
- AI confidence assessment using multiple factors
- Risk evaluation with customizable criteria
- Dynamic threshold adjustment

## Core Patterns & Best Practices

### 1. Base Class Hierarchy

#### UnifiedWorkflowBase
```typescript
export abstract class UnifiedWorkflowBase {
  protected workflowConfig: WorkflowConfig;
  protected channels: any;
  protected pattern: string;
  
  // Core workflow lifecycle methods
  abstract defineNodes(): void;
  abstract defineEdges(): void;
}
```

#### DeclarativeWorkflowBase
```typescript
export class DeclarativeWorkflowBase extends UnifiedWorkflowBase {
  // Decorator-driven workflow implementation
  // Automatic node and edge discovery
  // Built-in streaming support
}
```

#### StreamingWorkflowBase
```typescript
export class StreamingWorkflowBase extends DeclarativeWorkflowBase {
  // Enhanced streaming capabilities
  // Real-time progress tracking
  // WebSocket integration
}
```

#### AgentNodeBase
```typescript
export abstract class AgentNodeBase {
  abstract agentType: AgentType;
  abstract execute(state: WorkflowState): Promise<Partial<WorkflowState>>;
  
  // Built-in error handling and retry logic
  // Tool integration capabilities
  // State management utilities
}
```

### 2. Workflow Design Patterns

#### Supervisor Pattern
```typescript
@Workflow({ pattern: 'supervisor' })
export class SupervisorWorkflow extends DeclarativeWorkflowBase {
  
  @Node({ type: 'supervisor' })
  async supervisorNode(state: WorkflowState): Promise<Command<WorkflowState>> {
    // Route to appropriate worker based on task
    if (state.taskType === 'research') {
      return { type: CommandType.GOTO, goto: 'research_agent' };
    }
    return { type: CommandType.GOTO, goto: 'analysis_agent' };
  }
  
  @Node({ type: 'worker' })
  async researchAgent(state: WorkflowState) {
    // Research implementation
  }
  
  @Edge('supervisorNode', (state, command) => command?.goto || 'end')
  defineRouting() {}
}
```

#### Pipeline Pattern
```typescript
@Workflow({ pattern: 'pipeline' })
export class DataProcessingPipeline extends DeclarativeWorkflowBase {
  
  @Node({ type: 'transform' })
  async extractData(state: WorkflowState) { /* ... */ }
  
  @Node({ type: 'transform' })
  async validateData(state: WorkflowState) { /* ... */ }
  
  @Node({ type: 'transform' })
  async enrichData(state: WorkflowState) { /* ... */ }
  
  @Edge('extractData', 'validateData')
  @Edge('validateData', 'enrichData')
  defineSequence() {}
}
```

#### Map-Reduce Pattern
```typescript
@Workflow({ pattern: 'map-reduce' })
export class ParallelProcessingWorkflow extends DeclarativeWorkflowBase {
  
  @Node({ type: 'mapper' })
  async mapData(state: WorkflowState) {
    // Split data into parallel tasks
  }
  
  @Node({ type: 'worker' })
  async processPartition(state: WorkflowState) {
    // Process individual partition
  }
  
  @Node({ type: 'reducer' })
  async reduceResults(state: WorkflowState) {
    // Combine results
  }
}
```

### 3. Streaming Architecture Patterns

#### Progressive Streaming
```typescript
@Node({ type: 'llm' })
@StreamAll({
  token: { enabled: true, bufferSize: 25 },
  event: { events: [StreamEventType.PROGRESS] },
  progress: { granularity: 'detailed', includeETA: true }
})
async comprehensiveGeneration(state: WorkflowState) {
  // All streaming types active simultaneously
}
```

#### Conditional Streaming
```typescript
@Node({ type: 'analysis' })
@StreamToken({
  enabled: true,
  filter: {
    minLength: 2,
    excludeWhitespace: true,
    pattern: /[a-zA-Z]/
  },
  processor: (token, metadata) => {
    return metadata.isImportant ? `**${token}**` : token;
  }
})
async analyzeWithConditionalStreaming(state: WorkflowState) {
  // Smart token filtering and processing
}
```

### 4. Tool Integration Patterns

#### Basic Tool Definition
```typescript
@Tool({
  name: 'semantic_search',
  description: 'Search documents using semantic similarity',
  schema: z.object({
    query: z.string().describe('Search query'),
    limit: z.number().default(10),
    threshold: z.number().min(0).max(1).default(0.7)
  }),
  agents: [AgentType.RESEARCHER, AgentType.ANALYST],
  examples: [{
    input: { query: 'machine learning algorithms', limit: 5 },
    output: [{ title: 'ML Overview', relevance: 0.95 }]
  }]
})
async semanticSearch({ query, limit, threshold }) {
  // Tool implementation
}
```

#### Composed Tool System
```typescript
@ComposedTool({
  name: 'research_pipeline',
  description: 'Complete research workflow',
  components: ['web_search', 'content_extract', 'summarize', 'fact_check'],
  strategy: 'sequential',
  timeout: 120000
})
async researchPipeline({ topic }: { topic: string }) {
  // Sequential execution of component tools
}
```

### 5. HITL Implementation Patterns

#### Risk-Based Approval
```typescript
@Node({ type: 'human' })
@RequiresApproval({
  confidenceThreshold: 0.8,
  riskThreshold: ApprovalRiskLevel.MEDIUM,
  riskAssessment: {
    enabled: true,
    factors: ['complexity', 'impact', 'reversibility'],
    evaluator: (state) => ({
      level: state.complexity > 0.7 ? ApprovalRiskLevel.HIGH : ApprovalRiskLevel.MEDIUM,
      factors: ['complexity-score', 'user-impact'],
      score: state.complexity * state.userImpact
    })
  },
  escalationStrategy: EscalationStrategy.CHAIN,
  chainId: 'content-approval-chain'
})
async publishContent(state: WorkflowState) {
  // Content publishing with risk assessment
}
```

#### Approval Chain Configuration
```typescript
// Define approval chains in module configuration
const approvalChains = {
  'content-approval-chain': {
    levels: [
      { approvers: ['content-reviewer'], threshold: 1 },
      { approvers: ['senior-editor', 'legal-review'], threshold: 1 },
      { approvers: ['director'], threshold: 1 }
    ],
    escalationConditions: {
      riskLevel: ApprovalRiskLevel.HIGH,
      confidenceThreshold: 0.6
    }
  }
};
```

## Key Services Deep Dive

### WorkflowGraphBuilderService
**Responsibilities**:
- Extract workflow metadata from decorators
- Build LangGraph StateGraph instances
- Validate workflow topology
- Handle command pattern routing
- Support subgraph composition

**Key Methods**:
```typescript
buildFromDecorators<T>(workflowClass: any, options?: GraphBuilderOptions): StateGraph<T>
buildSupervisorGraph<T>(name: string, supervisor: NodeHandler<T>, workers: Record<string, NodeHandler<T>>): StateGraph<T>
buildPipelineGraph<T>(name: string, stages: Array<{id: string, handler: NodeHandler<T>}>): StateGraph<T>
```

### CompilationCacheService
**Purpose**: Optimize workflow compilation through intelligent caching
**Features**:
- LRU cache with configurable size limits
- Invalidation on workflow changes
- Performance metrics tracking
- Memory usage optimization

### MetadataProcessorService
**Responsibilities**:
- Extract decorator metadata using Reflection API
- Validate workflow definitions
- Generate workflow summaries
- Process node and edge configurations

### SubgraphManagerService
**Purpose**: Enable complex workflow composition
**Capabilities**:
- Nested workflow execution
- State transformation between parent and child workflows
- Resource isolation
- Performance monitoring

### Streaming Services

#### TokenStreamingService
```typescript
// Initialize token streaming for a node
await tokenStreamingService.initializeTokenStream({
  executionId: 'exec-123',
  nodeId: 'generate-content',
  config: {
    enabled: true,
    bufferSize: 50,
    flushInterval: 200,
    format: 'text'
  }
});

// Stream individual tokens
tokenStreamingService.streamToken(
  'exec-123',
  'generate-content', 
  'token-content',
  { importance: 'high' }
);
```

#### WebSocketBridgeService
**Purpose**: Bridge internal streaming to WebSocket connections
**Features**:
- Connection pooling and management
- Event routing and filtering
- Automatic reconnection handling
- Rate limiting and backpressure

### Tool Services

#### ToolRegistryService
```typescript
// Register tools dynamically
await toolRegistry.registerTool({
  name: 'custom_analyzer',
  implementation: customAnalyzerTool,
  agents: [AgentType.ANALYST],
  version: '2.1.0'
});

// Get tools for specific agent
const tools = toolRegistry.getToolsForAgent(AgentType.RESEARCHER);
```

#### ToolDiscoveryService
**Automatic Discovery Process**:
1. Scan modules for @Tool decorated methods
2. Extract tool metadata and schemas
3. Validate tool implementations
4. Register with ToolRegistryService
5. Map tools to compatible agents

### HITL Services

#### HumanApprovalService
**Workflow Management**:
- Request creation and tracking
- Timeout handling with configurable strategies
- Response processing and state updates
- Real-time streaming of approval status

**Key Features**:
```typescript
// Request approval with risk assessment
const request = await humanApprovalService.requestApproval(
  executionId,
  nodeId,
  'Approve content publication',
  state,
  {
    confidenceThreshold: 0.8,
    riskAssessment: { enabled: true },
    timeoutMs: 1800000, // 30 minutes
    onTimeout: 'escalate'
  }
);
```

#### ApprovalChainService
**Multi-Level Approval**:
- Chain definition and configuration
- Level-by-level processing
- Escalation handling
- Delegation support

#### FeedbackProcessorService
**Human Feedback Integration**:
- Feedback collection and analysis
- Learning from approval patterns
- Confidence adjustment based on feedback
- Integration with confidence evaluator

## Testing Strategies

### WorkflowTestBuilder
**Fluent Testing API**:
```typescript
const testBuilder = new WorkflowTestBuilder()
  .withWorkflow(MyWorkflow)
  .withInitialState({ prompt: 'test prompt' })
  .withMockLLM(mockResponse)
  .withMockTool('web_search', mockSearchResults)
  .expectNode('initialize')
  .expectNode('generateContent')
  .expectState({ content: 'expected content' })
  .withTimeout(30000);

const result = await testBuilder.execute();
```

### MockAgentFactory
**Agent Mocking**:
```typescript
const mockAgent = MockAgentFactory.create({
  type: AgentType.RESEARCHER,
  responses: {
    search: mockSearchResponse,
    analyze: mockAnalysisResponse
  },
  latency: 100 // Simulate realistic response times
});
```

### Testing Patterns

#### Unit Testing Nodes
```typescript
describe('ContentGeneratorWorkflow', () => {
  let workflow: ContentGeneratorWorkflow;
  let testBuilder: WorkflowTestBuilder;

  beforeEach(() => {
    testBuilder = new WorkflowTestBuilder();
    workflow = new ContentGeneratorWorkflow();
  });

  it('should generate content successfully', async () => {
    const state = testBuilder.createTestState({
      prompt: 'Write about AI'
    });

    const result = await workflow.generateContent(state);
    
    expect(result.content).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0.5);
  });
});
```

#### Integration Testing
```typescript
describe('Complete Workflow Integration', () => {
  it('should execute full workflow with streaming', async () => {
    const graph = await workflowGraphBuilder.buildFromDecorators(
      TestWorkflow,
      { streaming: true }
    );

    const result = await testBuilder.executeTest(
      graph,
      initialState,
      { timeout: 60000, recordEvents: true }
    );

    const events = testBuilder.getEvents();
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'node_start' })
    );
  });
});
```

#### HITL Testing
```typescript
describe('Human Approval Flow', () => {
  it('should handle approval timeout correctly', async () => {
    const request = await humanApprovalService.requestApproval(
      'test-exec',
      'approval-node',
      'Test approval',
      state,
      { timeoutMs: 1000, onTimeout: 'reject' }
    );

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 1500));

    const updatedRequest = humanApprovalService.getApprovalRequest(request.id);
    expect(updatedRequest.workflowState).toBe(ApprovalWorkflowState.TIMEOUT);
  });
});
```

## Performance Optimization

### Compilation Caching
```typescript
// Configure compilation cache
NestjsLanggraphModule.forRoot({
  compilation: {
    cache: true,
    maxCacheSize: 100,
    ttl: 3600000 // 1 hour
  }
});
```

### Stream Optimization
```typescript
// Optimized streaming configuration
@StreamToken({
  enabled: true,
  bufferSize: 100,      // Larger buffer for efficiency
  batchSize: 10,        // Batch tokens for processing
  flushInterval: 500,   // Balance responsiveness vs efficiency
  filter: {
    minLength: 2,       // Filter short tokens
    excludeWhitespace: true
  }
})
```

### Memory Management
```typescript
// Cleanup stale resources
@Node({ type: 'cleanup' })
async cleanupResources(state: WorkflowState) {
  // Close token streams
  tokenStreamingService.closeExecutionTokenStreams(state.executionId);
  
  // Clear approval requests
  humanApprovalService.cancelApproval(approvalRequestId);
  
  // Clean cache entries
  compilationCache.evictStale();
}
```

## Common Use Cases & Implementation Patterns

### 1. Multi-Agent Research System
```typescript
@Workflow({ 
  name: 'research-system',
  pattern: 'supervisor',
  streaming: true 
})
export class ResearchSystemWorkflow extends DeclarativeWorkflowBase {
  
  @Node({ type: 'supervisor' })
  async coordinateResearch(state: WorkflowState): Promise<Command<WorkflowState>> {
    const { researchTopic, complexity } = state;
    
    if (complexity === 'high') {
      return { type: CommandType.GOTO, goto: 'senior_researcher' };
    }
    return { type: CommandType.GOTO, goto: 'junior_researcher' };
  }
  
  @Node({ type: 'agent' })
  async seniorResearcher(state: WorkflowState) {
    const research = await this.executeTool('deep_research', {
      topic: state.researchTopic,
      depth: 'comprehensive'
    });
    return { ...state, research };
  }
}
```

### 2. Content Generation with Approval
```typescript
@Workflow({ 
  name: 'content-pipeline',
  hitl: { enabled: true, confidenceThreshold: 0.7 }
})
export class ContentPipelineWorkflow extends DeclarativeWorkflowBase {
  
  @Node({ type: 'llm' })
  @StreamToken({ enabled: true, bufferSize: 30 })
  async generateContent(state: WorkflowState) {
    const content = await this.llm.invoke(state.prompt);
    return { ...state, content };
  }
  
  @Node({ type: 'human' })
  @RequiresApproval({
    confidenceThreshold: 0.8,
    riskThreshold: ApprovalRiskLevel.MEDIUM,
    chainId: 'content-approval'
  })
  async reviewContent(state: WorkflowState) {
    // Content review logic
    return { ...state, approved: true };
  }
}
```

### 3. RAG Pipeline with Graph Integration
```typescript
@Workflow({ name: 'rag-pipeline' })
export class RAGPipelineWorkflow extends DeclarativeWorkflowBase {
  
  @Node({ type: 'tool' })
  async vectorSearch(state: WorkflowState) {
    const results = await this.executeTool('semantic_search', {
      query: state.query,
      limit: 10
    });
    return { ...state, vectorResults: results };
  }
  
  @Node({ type: 'tool' })
  async graphSearch(state: WorkflowState) {
    const results = await this.executeTool('graph_search', {
      entities: state.extractedEntities,
      relationships: ['RELATED_TO', 'PART_OF']
    });
    return { ...state, graphResults: results };
  }
  
  @Node({ type: 'llm' })
  async generateAnswer(state: WorkflowState) {
    const context = [
      ...state.vectorResults,
      ...state.graphResults
    ].join('\n');
    
    const answer = await this.llm.invoke({
      messages: [{
        role: 'user',
        content: `Context: ${context}\n\nQuestion: ${state.query}`
      }]
    });
    
    return { ...state, answer };
  }
}
```

## Integration Patterns

### WebSocket Real-time Integration
```typescript
// Setup WebSocket gateway
@WebSocketGateway(3001, { cors: true })
export class WorkflowGateway {
  
  @SubscribeMessage('subscribe_workflow')
  handleWorkflowSubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { executionId: string }
  ) {
    // Register for real-time updates
    this.humanApprovalService.registerStreamConnection(
      data.executionId,
      client
    );
  }
}
```

### Database Checkpoint Integration
```typescript
// Configure persistent checkpointing
NestjsLanggraphModule.forRoot({
  checkpointing: {
    enabled: true,
    provider: 'postgresql',
    config: {
      connectionString: process.env.DATABASE_URL,
      tableName: 'workflow_checkpoints'
    }
  }
});
```

### External API Integration
```typescript
@Tool({
  name: 'external_api_call',
  description: 'Call external API with retry logic'
})
async callExternalAPI({ endpoint, payload }) {
  const response = await this.httpService
    .post(endpoint, payload)
    .pipe(
      retry(3),
      timeout(30000),
      catchError(error => {
        this.logger.error('External API call failed:', error);
        throw new ToolExecutionError('API call failed', error);
      })
    )
    .toPromise();
    
  return response.data;
}
```

## Configuration and Module Setup

### Complete Module Configuration
```typescript
@Module({
  imports: [
    NestjsLanggraphModule.forRoot({
      // Streaming configuration
      streaming: {
        enabled: true,
        websocket: {
          enabled: true,
          port: 3001,
          cors: true
        },
        defaultBufferSize: 50,
        performanceTracking: true
      },
      
      // Tool system configuration
      tools: {
        autoDiscover: true,
        validation: true,
        cache: true,
        providers: ['openai', 'custom']
      },
      
      // HITL configuration
      hitl: {
        enabled: true,
        defaultTimeout: 1800000, // 30 minutes
        confidenceThreshold: 0.7,
        riskThresholds: {
          low: 0.3,
          medium: 0.6,
          high: 0.8,
          critical: 0.95
        }
      },
      
      // Compilation and performance
      compilation: {
        cache: true,
        eager: false,
        maxCacheSize: 100
      },
      
      // Provider configuration
      providers: {
        llm: {
          provider: 'openai',
          config: {
            apiKey: process.env.OPENAI_API_KEY,
            model: 'gpt-4'
          }
        },
        checkpoint: {
          provider: 'memory',
          config: { maxSize: 1000 }
        }
      }
    })
  ],
  providers: [
    ContentPipelineWorkflow,
    ResearchSystemWorkflow,
    RAGPipelineWorkflow
  ]
})
export class WorkflowModule {}
```

## Integration with LangGraph Modules

The NestJS LangGraph library is designed to work seamlessly with specialized child modules located in `@libs/langgraph-modules/`. These modules provide advanced capabilities that extend the core workflow functionality:

### Available LangGraph Modules

#### 1. Memory Module (`@libs/langgraph-modules/memory`)
**Contextual memory management for AI agents**
```typescript
// Import and configure memory module
import { LanggraphModulesMemoryModule, MemoryFacadeService } from '@libs/langgraph-modules/memory';

@Module({
  imports: [
    NestjsLanggraphModule.forRoot({...}),
    LanggraphModulesMemoryModule.forRoot({
      chromadb: { collection: 'agent_memory' },
      neo4j: { database: 'memory_graph' },
      retention: { maxEntries: 10000, ttlDays: 30 }
    })
  ]
})
export class WorkflowModule {}

// Use in workflows
@Node({ type: 'memory' })
async rememberContext(state: WorkflowState) {
  await this.memoryService.storeEntry({
    content: state.conversation,
    metadata: { userId: state.userId, importance: 'high' }
  });
  
  const similar = await this.memoryService.searchSimilar(state.query, { limit: 5 });
  return { ...state, relevantMemories: similar };
}
```

#### 2. Checkpoint Module (`@libs/langgraph-modules/checkpoint`)
**Advanced state persistence and recovery**
```typescript
import { CheckpointModule, CheckpointManagerService } from '@libs/langgraph-modules/checkpoint';

@Module({
  imports: [
    CheckpointModule.forRoot({
      backend: 'redis',
      config: { url: process.env.REDIS_URL },
      retention: { maxCheckpoints: 1000, ttlHours: 24 }
    })
  ]
})
export class WorkflowModule {}

// Use in workflows with automatic checkpointing
@Node({ type: 'llm', checkpoint: { enabled: true, strategy: 'before_execution' } })
async processWithCheckpoint(state: WorkflowState) {
  // Automatic checkpoint before execution
  const result = await this.llm.invoke(state.prompt);
  return { ...state, result };
}
```

#### 3. Multi-Agent Module (`@libs/langgraph-modules/multi-agent`)
**Multi-agent coordination and orchestration**
```typescript
import { MultiAgentModule, MultiAgentCoordinatorService } from '@libs/langgraph-modules/multi-agent';

@Workflow({ 
  name: 'research-coordination',
  pattern: 'multi-agent',
  agents: ['researcher', 'analyst', 'writer']
})
export class ResearchCoordinationWorkflow extends DeclarativeWorkflowBase {
  
  constructor(private coordinator: MultiAgentCoordinatorService) {
    super();
  }
  
  @Node({ type: 'coordinator' })
  async coordinateResearch(state: WorkflowState) {
    const assignment = await this.coordinator.assignTask({
      task: state.researchTopic,
      requiredCapabilities: ['web_search', 'analysis'],
      priority: 'high'
    });
    
    return { ...state, agentAssignment: assignment };
  }
}
```

#### 4. Functional API Module (`@libs/langgraph-modules/functional-api`)
**Functional programming patterns for workflows**
```typescript
import { FunctionalApiModule } from '@libs/langgraph-modules/functional-api';
import { Entrypoint, Task } from '@libs/langgraph-modules/functional-api';

@Module({
  imports: [
    FunctionalApiModule.forRoot({ validation: true, memoization: true })
  ]
})
export class FunctionalWorkflowModule {}

// Pure functional workflow definition
export class DataProcessingPipeline {
  
  @Entrypoint()
  @Task({ pure: true, memoize: true })
  async processData(input: DataInput): Promise<ProcessedData> {
    return pipe(
      input,
      this.validateInput,
      this.transformData,
      this.enrichData,
      this.generateOutput
    );
  }
  
  @Task({ pure: true })
  private validateInput = (data: DataInput): ValidatedInput => {
    // Pure validation function
  };
}
```

#### 5. Platform Module (`@libs/langgraph-modules/platform`)
**LangGraph Platform integration**
```typescript
import { PlatformModule, PlatformClientService } from '@libs/langgraph-modules/platform';

@Module({
  imports: [
    PlatformModule.forRoot({
      apiKey: process.env.LANGGRAPH_API_KEY,
      endpoint: process.env.LANGGRAPH_ENDPOINT,
      webhookSecret: process.env.WEBHOOK_SECRET
    })
  ]
})
export class PlatformWorkflowModule {}

// Deploy workflow to LangGraph Platform
@Node({ type: 'platform' })
async deployToCloud(state: WorkflowState) {
  const deployment = await this.platformService.deployAssistant({
    name: 'customer-support-bot',
    workflow: state.compiledWorkflow,
    config: { streaming: true, memory: true }
  });
  
  return { ...state, deployment };
}
```

#### 6. Time Travel Module (`@libs/langgraph-modules/time-travel`)
**Workflow debugging and state history**
```typescript
import { TimeTravelModule, TimeTravelService } from '@libs/langgraph-modules/time-travel';

// Enable time travel for debugging
@Workflow({ 
  name: 'debug-workflow',
  timeTravel: { enabled: true, maxSnapshots: 50 }
})
export class DebuggingWorkflow extends DeclarativeWorkflowBase {
  
  constructor(private timeTravelService: TimeTravelService) {
    super();
  }
  
  @Node({ type: 'debug', snapshot: true })
  async debugStep(state: WorkflowState) {
    // Take snapshot for debugging
    await this.timeTravelService.createSnapshot(state.executionId, 'debug-point');
    
    const result = await this.processStep(state);
    return result;
  }
}

// Use time travel for testing
const replay = await timeTravelService.replayFrom('exec-123', 'debug-point');
```

#### 7. Monitoring Module (`@libs/langgraph-modules/monitoring`)
**Production observability and metrics**
```typescript
import { MonitoringModule, MonitoringFacadeService } from '@libs/langgraph-modules/monitoring';

@Module({
  imports: [
    MonitoringModule.forRoot({
      prometheus: { enabled: true, port: 9090 },
      alerting: {
        channels: ['slack', 'email'],
        rules: [
          { metric: 'workflow_failure_rate', threshold: 0.05, severity: 'warning' }
        ]
      }
    })
  ]
})
export class MonitoredWorkflowModule {}

// Automatic monitoring integration
@Node({ 
  type: 'llm', 
  monitoring: { 
    metrics: ['latency', 'token_usage', 'cost'],
    alerts: ['high_latency', 'token_limit']
  }
})
async monitoredGeneration(state: WorkflowState) {
  // Automatically monitored execution
  return await this.llm.invoke(state.prompt);
}
```

### Module Integration Patterns

#### 1. Combined Memory and Checkpointing
```typescript
@Workflow({ 
  name: 'persistent-conversation',
  modules: ['memory', 'checkpoint']
})
export class PersistentConversationWorkflow extends DeclarativeWorkflowBase {
  
  @Node({ type: 'memory', checkpoint: true })
  async processWithMemoryAndCheckpoint(state: WorkflowState) {
    // Checkpoint before memory operation
    const memories = await this.memoryService.retrieveContext(state.userId);
    
    const response = await this.llm.invoke({
      messages: [...memories, state.currentMessage]
    });
    
    // Store new memory entry
    await this.memoryService.storeEntry({
      content: response,
      metadata: { userId: state.userId }
    });
    
    return { ...state, response, memories };
  }
}
```

#### 2. Multi-Agent with Monitoring
```typescript
@Workflow({
  name: 'monitored-multi-agent',
  modules: ['multi-agent', 'monitoring'],
  sla: { maxDuration: 300000, errorRate: 0.02 }
})
export class MonitoredMultiAgentWorkflow extends DeclarativeWorkflowBase {
  
  @Node({ 
    type: 'coordinator',
    monitoring: { dashboard: 'agent-coordination', alerts: true }
  })
  async coordinateWithMonitoring(state: WorkflowState) {
    const metrics = this.monitoringService.startMetricsCollection({
      workflowId: state.executionId,
      operation: 'agent-coordination'
    });
    
    try {
      const result = await this.coordinator.assignTask(state.task);
      metrics.recordSuccess();
      return { ...state, assignment: result };
    } catch (error) {
      metrics.recordError(error);
      throw error;
    }
  }
}
```

#### 3. Full-Stack Integration
```typescript
@Module({
  imports: [
    // Core LangGraph module
    NestjsLanggraphModule.forRoot({
      streaming: true,
      tools: { autoDiscover: true }
    }),
    
    // All child modules
    LanggraphModulesMemoryModule.forRoot({...}),
    CheckpointModule.forRoot({...}),
    MultiAgentModule.forRoot({...}),
    FunctionalApiModule.forRoot({...}),
    PlatformModule.forRoot({...}),
    TimeTravelModule.forRoot({...}),
    MonitoringModule.forRoot({...})
  ]
})
export class ComprehensiveWorkflowModule {}

// Full-featured workflow
@Workflow({
  name: 'enterprise-workflow',
  modules: ['memory', 'checkpoint', 'multi-agent', 'monitoring', 'platform'],
  features: {
    streaming: true,
    timeTravel: true,
    hitl: true,
    monitoring: true
  }
})
export class EnterpriseWorkflow extends DeclarativeWorkflowBase {
  // Leverage all module capabilities
}
```

### Best Practices for Module Integration

1. **Selective Import**: Only import modules you actually use
2. **Configuration Consistency**: Ensure compatible configurations across modules
3. **Resource Management**: Monitor resource usage when combining multiple modules
4. **Testing Strategy**: Test module interactions thoroughly
5. **Performance Impact**: Consider performance implications of multiple modules
6. **Documentation**: Document which modules are used and why

### Module Dependencies

Some modules work particularly well together:
- **Memory + Neo4j**: Enhanced relationship tracking
- **Checkpoint + Redis**: Distributed state persistence  
- **Multi-Agent + Monitoring**: Production agent coordination
- **Time Travel + Checkpoint**: Advanced debugging capabilities
- **Platform + Monitoring**: Cloud deployment with observability

This comprehensive guide provides Claude Code with the necessary context to understand and effectively work with the NestJS LangGraph integration library, covering all major patterns, services, and implementation strategies for building sophisticated AI agent workflows with full module integration capabilities.