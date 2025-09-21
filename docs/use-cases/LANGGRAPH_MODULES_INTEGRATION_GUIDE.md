# LangGraph Modules Integration Guide: Expert-Level Usage & Patterns

## 📋 Library Overview & Core Functions

### 1. @libs/langgraph-modules/workflow-engine

**🎯 Purpose**: Foundation execution engine for LangGraph workflows

- **Core Classes**: `UnifiedWorkflowBase`, `DeclarativeWorkflowBase`, `StreamingWorkflowBase`
- **No Direct Decorators**: Base classes for other modules to extend
- **Key Services**: `WorkflowGraphBuilderService`, `SubgraphManagerService`, `WorkflowStreamService`
- **Bridge & Registration**: Provides centralized registration patterns and integrates with AgentWorkflowBridgeService for dual agent types

### 2. @libs/langgraph-modules/multi-agent

**🎯 Purpose**: Agent coordination with three sophisticated patterns

- **Decorators**: `@Agent` (class-level), `@Workflow` (class-level), `@Tool` (method-level)
- **Patterns**: Supervisor, Swarm, Hierarchical coordination
- **Key Services**: `MultiAgentCoordinatorService`, `WorkflowManagerService`, `AgentRegistryService`
- **Bridge**: Workflow-agent support via AgentWorkflowBridgeService (internal micro-workflows compiled to a single node)

### 3. @libs/langgraph-modules/functional-api

**🎯 Purpose**: Declarative workflow composition through decorators

- **Decorators**: `@Workflow` (class-level), `@Node` (method-level), `@Edge` (method-level), `@Entrypoint` (method-level), `@Task` (method-level)
- **Two Paradigms**: Functional workflows (`@Entrypoint`/`@Task`) + Declarative workflows (`@Node`/`@Edge`)
- **Key Services**: `FunctionalWorkflowService`, `GraphGeneratorService`
- **Composition**: Unified decorator composition across modules via centralized registration

### 4. @libs/langgraph-modules/platform

**🎯 Purpose**: LangGraph Platform API integration

- **No Decorators**: Pure service-based integration
- **Key Services**: `PlatformClientService`, `WebhookService`
- **Focus**: Assistant management, thread lifecycle, run execution

### 5. @libs/langgraph-modules/hitl

**🎯 Purpose**: Human-in-the-Loop approval workflows

- **Decorators**: `@RequiresApproval` (method-level), `@ApprovalHandler` (method-level)
- **Key Services**: `HumanApprovalService`, `ConfidenceEvaluatorService`, `ApprovalChainService`
- **Features**: Risk assessment, confidence evaluation, approval chains
- **Unified Decorators**: Single enhanced `@RequiresApproval` supports cross-module composition (HITL + workflow + multi-agent)

### 6. @libs/langgraph-modules/streaming

**🎯 Purpose**: Real-time streaming capabilities for dynamic UIs

- **Decorators**: `@StreamToken` (method-level), `@StreamEvent` (method-level), `@StreamProgress` (method-level), `@StreamAll` (method-level)
- **Key Services**: `TokenStreamingService`, `EventStreamProcessorService`, `StreamingWebSocketGateway`
- **Features**: Token-level streaming, event broadcasting, progress tracking, WebSocket integration

### 7. @libs/langgraph-modules/memory

**🎯 Purpose**: Intelligent memory management with hybrid storage

- **No Decorators**: Pure service-based memory operations
- **Key Services**: `MemoryService`, `MemoryStorageService`, `MemoryGraphService`
- **Features**: Vector + graph storage, semantic search, conversation context, pattern analysis

### 8. @libs/langgraph-modules/time-travel

**🎯 Purpose**: Workflow debugging and state history capabilities

- **No Decorators**: Service-based time travel operations
- **Key Services**: `TimeTravelService`, `BranchManagerService`
- **Features**: Workflow replay, state branching, execution history, debugging analysis

## 🔗 Decorator Compatibility Matrix

### What Works Together

| Class-Level Decorator        | Compatible Method-Level Decorators                                                                                                                                                                                                                                                  | Library Source                    | Notes                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------- |
| `@Agent` (multi-agent)       | `@Tool` (multi-agent) / `@RequiresApproval` (hitl) / `@StreamToken` (streaming) / `@StreamEvent` (streaming) / `@StreamProgress` (streaming)                                                                                                                                    | Multi-Agent + HITL + Streaming    | Agents with tools, approval requirements, and streaming |
| `@Workflow` (functional-api) | `@Node` (functional-api) / `@Edge` (functional-api) / `@StartNode` (functional-api) / `@EndNode` (functional-api) / `@ApprovalNode` (functional-api) / `@RequiresApproval` (hitl) / `@StreamToken` (streaming) / `@StreamEvent` (streaming) / `@StreamProgress` (streaming) | Functional-API + HITL + Streaming | Declarative workflows with oversight and streaming      |
| `@Workflow` (functional-api) | `@Entrypoint` (functional-api) / `@Task` (functional-api) / `@StreamAll` (streaming)                                                                                                                                                                                              | Functional-API + Streaming        | Functional programming with streaming                   |
| `@Workflow` (multi-agent)    | Built-in execute method only / `@StreamEvent` (streaming)                                                                                                                                                                                                                           | Multi-Agent + Streaming           | Multi-agent workflow orchestration with streaming       |

### What DOESN'T Work Together

❌ **@Agent + @Node/@Edge**: Agents use `nodeFunction` method, not `@Node` decorators  
❌ **@Entrypoint/@Task + @Node/@Edge**: Different paradigms - use one or the other  
❌ **Multiple @Workflow decorators**: Each class can only have one workflow type

Note: Workflow-agents can define internal micro-workflows with `@Entrypoint`/`@Task` inside the agent class or in a companion class, compiled to a single external node via the AgentWorkflowBridgeService.

## 🏗️ Integration Architecture Patterns

### Pattern 1: Complete Enterprise AI Workflow

Combines workflow-engine + functional-api + hitl

```typescript
// FOUNDATION: workflow-engine base class + FUNCTIONAL-API: declarative structure
@Workflow({
  name: 'enterprise-customer-service',
  streaming: true,
  hitl: { enabled: true },
})
export class EnterpriseCustomerServiceWorkflow extends DeclarativeWorkflowBase<CustomerState> {
  // FUNCTIONAL-API: Node definitions
  @StartNode({ description: 'Initialize customer session' })
  async initializeSession(state: CustomerState): Promise<Partial<CustomerState>> {
    return {
      sessionId: `session_${Date.now()}`,
      status: 'active',
    };
  }

  // HITL: Human approval integration
  @Node({ type: 'llm' })
  @RequiresApproval({
    confidenceThreshold: 0.8,
    riskThreshold: ApprovalRiskLevel.MEDIUM,
    message: (state) => `Escalate customer issue: ${state.issue.summary}?`,
  })
  async escalateToHuman(state: CustomerState): Promise<Partial<CustomerState>> {
    return {
      escalated: true,
      escalatedAt: new Date(),
    };
  }

  // FUNCTIONAL-API: Edge definitions
  @Edge('initializeSession', 'analyzeIssue')
  initToAnalyze() {}

  @ConditionalEdge('analyzeIssue', {
    high_confidence: 'resolveAutomatically',
    low_confidence: 'escalateToHuman',
  })
  routeBasedOnConfidence(state: CustomerState): string {
    return state.confidence > 0.8 ? 'high_confidence' : 'low_confidence';
  }
}
```

### Pattern 2: Multi-Agent + Workflow-Engine Integration

Sophisticated agent coordination within workflow contexts

```typescript
// MULTI-AGENT: Agent definitions (simple-agent)
@Agent({
  id: 'researcher',
  name: 'Research Specialist',
  capabilities: ['web_search', 'document_analysis'],
  tools: ['search_engine', 'document_parser'],
})
@Injectable()
export class ResearchAgent {
  // Standard agent method - NO @Node decorator
  async nodeFunction(state: AgentState): Promise<Partial<AgentState>> {
    return {
      messages: [new AIMessage('Research completed')],
      research: await this.conductResearch(state.query),
    };
  }

  // MULTI-AGENT: Tool definitions within agents
  @Tool({
    name: 'search_knowledge_base',
    description: 'Search internal knowledge base',
    schema: z.object({ query: z.string() }),
  })
  async searchKnowledgeBase({ query }: { query: string }) {
    return await this.knowledgeBase.search(query);
  }

  // HITL: Approval requirements for agents
  @RequiresApproval({
    confidenceThreshold: 0.7,
    message: 'Approve external web search?',
  })
  async searchExternalWeb(query: string) {
    return await this.webSearch.search(query);
  }
}

// WORKFLOW-ENGINE: Orchestrating workflow that uses agents (centralized registration compiles/validates)
@Workflow({
  name: 'content-creation-pipeline',
  streaming: true,
})
export class ContentCreationWorkflow extends StreamingWorkflowBase<ContentState> {
  constructor(private readonly coordinator: MultiAgentCoordinatorService, eventEmitter: EventEmitter2, graphBuilder: WorkflowGraphBuilderService, subgraphManager: SubgraphManagerService, metadataProcessor: MetadataProcessorService, streamService?: WorkflowStreamService) {
    super(eventEmitter, graphBuilder, subgraphManager, metadataProcessor, streamService);
  }

  protected getWorkflowDefinition(): WorkflowDefinition<ContentState> {
    return {
      name: 'content-creation-pipeline',
      nodes: [
        {
          id: 'research_phase',
          handler: this.executeResearchPhase.bind(this),
          config: { streaming: true },
        },
      ],
      edges: [{ from: 'research_phase', to: 'writing_phase' }],
      entryPoint: 'research_phase',
    };
  }

  private async executeResearchPhase(state: ContentState): Promise<Partial<ContentState>> {
    // Use multi-agent coordinator within workflow
    const networkId = await this.coordinator.setupNetwork('research-network', [{ id: 'researcher', type: 'ResearchAgent' }], 'supervisor');

    const result = await this.coordinator.executeSimpleWorkflow(networkId, state.topic);
    return { research: result.finalState.metadata.research };
  }
}
```

### Pattern 3: Platform Integration with HITL

LangGraph Platform integration with human oversight

```typescript
@Injectable()
export class PlatformHitlIntegrationService {
  constructor(private readonly platformClient: PlatformClientService, private readonly approvalService: HumanApprovalService) {}

  @RequiresApproval({
    when: (state) => state.deployment?.environment === 'production',
    confidenceThreshold: 0.9,
    message: 'Deploy assistant to production?',
  })
  async deployAssistantToProduction(assistantConfig: AssistantConfig): Promise<Assistant> {
    // Create assistant on platform
    const assistant = await this.platformClient.post<Assistant>('/assistants', {
      graph_id: assistantConfig.graphId,
      config: assistantConfig.config,
    });

    return assistant;
  }
}
```

## 🧭 Centralized Registration & Bridge Patterns

- Centralized Registration: All decorators and modules resolve to a single source of truth; workflows are compiled and validated before execution
- AgentWorkflowBridgeService: Compiles internal agent micro-workflows into single external nodes, preserving the agent interface while enabling rich internal steps
- Typed Metadata: Use project-standard generic metadata types for streaming events and checkpoints; avoid any types in state transitions

## 🔁 Cross-References

- Use Cases:
    - Content Marketing: Demonstrates a workflow-agent (`SEOOptimizerAgent`) with internal micro-workflow compiled via the bridge; unified @RequiresApproval
    - DevOps Automation: Shows internal workflow for code review analysis and platform-backed audit trails
    - Financial Trading: Emphasizes risk-based approvals, platform execution, and dual agent types
    - Healthcare Diagnosis: Highlights conservative confidence thresholds, escalation strategies, and typed metadata

## 🎯 Best Practice Usage Patterns

### When to Use Each Module

1. **workflow-engine**: Always use as foundation - provides base classes
2. **functional-api**: Add for declarative workflow definition with decorators
3. **multi-agent**: Include when you need multiple AI agents coordination
4. **streaming**: Add for real-time UI updates and token-level streaming
5. **memory**: Include for conversational context and intelligent memory
6. **time-travel**: Add for debugging, testing, and workflow replay
7. **hitl**: Add for human oversight, approval chains, and governance
8. **platform**: Integrate for LangGraph Platform hosting capabilities

### Integration Hierarchy

```text
workflow-engine (Foundation)
    ↓
functional-api (Adds declarative capabilities)
    ↓
multi-agent (Adds agent coordination)
    ↓
streaming (Adds real-time capabilities)
    ↓
memory (Adds intelligent context)
    ↓
time-travel (Adds debugging capabilities)
    ↓
hitl (Adds human oversight)
    ↓
platform (Adds hosted capabilities)
```

### Module Configuration Strategy

```typescript
@Module({
  imports: [
    // 1. Foundation
    WorkflowEngineModule.forRoot({
      compilation: { cacheEnabled: true },
      execution: { streamingEnabled: true },
    }),

    // 2. Declarative capabilities
    FunctionalApiModule.forRoot({
      enableStreaming: true,
      enableCheckpointing: true,
    }),

    // 3. Multi-agent coordination
    MultiAgentModule.forRoot({
      agents: [ResearchAgent, WriterAgent, CustomerSupportAgent],
      workflows: [ContentCreationWorkflow, CustomerServiceWorkflow],
      defaultLlm: { provider: 'openai', model: 'gpt-4' },
    }),

    // 4. Real-time streaming
    StreamingModule.forRoot({
      websocket: { enabled: true, port: 8080 },
      defaultBufferSize: 50,
      gateway: { enabled: true, cors: true },
    }),

    // 5. Intelligent memory
    MemoryModule.forRoot({
      collection: 'workflow_memory',
      enableAutoSummarization: true,
      retention: { maxEntries: 10000, maxAge: 7 * 24 * 60 * 60 * 1000 },
    }),

    // 6. Debugging and testing
    TimeTravelModule.forRoot({
      enableBranching: true,
      enableAutoCheckpoint: true,
      maxCheckpointsPerThread: 100,
    }),

    // 7. Human oversight
    HitlModule.forRoot({
      enabled: true,
      confidenceThreshold: 0.8,
      approvalChains: {
        /* chain configs */
      },
    }),

    // 8. Platform integration
    PlatformModule.forRoot({
      apiKey: process.env.LANGGRAPH_API_KEY,
      baseUrl: 'https://api.langgraph.com',
    }),
  ],
})
export class AppModule {}
```

## 🔗 Advanced Integration Scenarios

### Scenario 1: AI Code Review System

```typescript
@Workflow({ name: 'ai-code-review', streaming: true })
export class AICodeReviewWorkflow extends StreamingWorkflowBase {
  @Node({ type: 'llm' })
  @RequiresApproval({
    confidenceThreshold: 0.85,
    message: 'Auto-approve code changes?',
  })
  async reviewCode(state: CodeReviewState) {
    const analysisResult = await this.coordinator.executeNetwork('code-analysis', {
      agents: ['security-reviewer', 'performance-analyzer'],
      pattern: 'swarm',
    });

    return { analysis: analysisResult, confidence: analysisResult.confidence };
  }
}
```

### Scenario 2: Customer Service Automation

```typescript
export class CustomerServiceSystem {
  async handleCustomerRequest(request: CustomerRequest): Promise<void> {
    // 1. Create platform thread
    const thread = await this.platformClient.post('/threads', {
      metadata: { customer_id: request.customerId },
    });

    // 2. Execute multi-agent workflow with HITL
    const workflow = new CustomerServiceWorkflow();
    const result = await workflow.execute({
      request,
      threadId: thread.thread_id,
    });

    // 3. Platform execution for complex cases
    if (result.requiresPlatformExecution) {
      await this.platformClient.post(`/threads/${thread.thread_id}/runs`, {
        assistant_id: 'customer-service-assistant',
        input: result.platformInput,
      });
    }
  }
}
```

## 📝 Summary

This integration guide demonstrates how to effectively combine all eight LangGraph modules:

- **workflow-engine** provides the foundation execution capabilities
- **functional-api** adds clean declarative workflow definition
- **multi-agent** enables sophisticated agent coordination
- **streaming** provides real-time capabilities for dynamic UIs
- **memory** adds intelligent context management with hybrid storage
- **time-travel** enables debugging, testing, and workflow replay
- **hitl** provides human oversight and governance
- **platform** enables hosted deployment and management

Each module serves a distinct purpose while integrating seamlessly with others to create enterprise-grade AI applications with real-time streaming, intelligent memory, comprehensive debugging, human oversight, and scalable architecture.
