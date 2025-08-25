# CLAUDE.md - Multi-Agent Module

This file provides comprehensive guidance to Claude Code when working with the multi-agent coordination module, focusing on enterprise-grade multi-agent orchestration and coordination patterns for complex AI workflows.

## Business Domain

### Core Purpose

The multi-agent module enables sophisticated AI agent coordination and orchestration for complex business workflows. It supports three primary coordination patterns:

- **Supervisor Pattern**: Hierarchical agent coordination with intelligent routing decisions
- **Swarm Pattern**: Peer-to-peer agent networks with dynamic handoffs and collaboration
- **Hierarchical Pattern**: Multi-level agent systems with escalation and parent graph navigation

### Target Use Cases

- **Research Teams**: Multi-agent research workflows with specialized roles (researcher, analyst, writer)
- **Content Creation**: Collaborative content generation with reviewers, editors, and publishers
- **Customer Support**: Multi-tier support systems with escalation and specialization
- **Data Processing**: Pipeline-based data analysis with validation and quality assurance
- **Decision Support**: Complex decision-making workflows with multiple expert agents
- **Quality Assurance**: Multi-stage review and approval processes

### Business Value

- **Specialization**: Agents can focus on specific domain expertise
- **Scalability**: Distribute workload across multiple specialized agents
- **Quality**: Multi-agent review and validation processes
- **Flexibility**: Dynamic routing based on context and requirements
- **Reliability**: Fault tolerance through agent redundancy and failover

## Architecture Overview

### Core Services Architecture

#### MultiAgentCoordinatorService (Facade)

The primary interface following the Facade pattern, providing:

- Simplified API for common operations
- Delegation to specialized services
- Backward compatibility
- Convenience methods for quick setup

```typescript
// High-level API usage
await coordinator.setupNetwork('research-team', agents, 'supervisor');
const result = await coordinator.executeSimpleWorkflow('research-team', 'Analyze market trends');
```

#### AgentRegistryService (Registry Pattern)

Centralized agent lifecycle management:

- Agent registration and validation
- Health monitoring and status tracking
- Capability-based agent discovery
- Event-driven notifications

```typescript
// Agent registration with validation
agentRegistry.registerAgent({
  id: 'researcher',
  name: 'Research Specialist',
  description: 'Conducts market research and analysis',
  nodeFunction: async (state) => { /* implementation */ }
});
```

#### NetworkManagerService (Orchestrator)

High-level network coordination:

- Network creation and compilation
- Workflow execution management
- Streaming and real-time updates
- Performance monitoring and metrics

#### GraphBuilderService (Builder Pattern)

Specialized graph construction for different patterns:

- Supervisor graph compilation
- Swarm graph with handoff tools
- Hierarchical multi-level graphs
- LangGraph integration and optimization

#### LlmProviderService (Provider Pattern)

LLM abstraction and management:

- Multi-provider support (OpenAI, Anthropic, local models)
- Caching and performance optimization
- Token usage tracking
- Connection pooling

### State Management

#### AgentState Interface

Following 2025 LangGraph patterns:

```typescript
interface AgentState {
  messages: BaseMessage[];     // Core message history
  next?: string;              // Routing decision
  current?: string;           // Current executing agent
  scratchpad?: string;        // Shared workspace
  task?: string;              // Current task description
  metadata?: Record<string, unknown>; // Extensible context
}
```

#### State Flow Patterns

- **Supervisor**: Centralized routing with state aggregation
- **Swarm**: Peer-to-peer state sharing with context isolation
- **Hierarchical**: Multi-level state with escalation capabilities

## Multi-Agent Coordination Patterns

### 1. Supervisor Pattern

Centralized coordination with intelligent routing:

```typescript
const supervisorConfig: SupervisorConfig = {
  systemPrompt: "You coordinate research team agents based on task requirements",
  workers: ['researcher', 'analyst', 'writer'],
  llm: { model: 'gpt-4', temperature: 0 },
  enableForwardMessage: true,
  removeHandoffMessages: true
};
```

**Key Features:**

- Intelligent agent selection based on task context
- Centralized decision making and coordination
- Message forwarding to reduce token usage
- Worker specialization and task delegation

**Best Use Cases:**

- Complex workflows requiring coordination
- Quality control with review cycles
- Resource allocation and load balancing
- Sequential task processing

### 2. Swarm Pattern

Decentralized peer-to-peer agent collaboration:

```typescript
const swarmConfig: SwarmConfig = {
  enableDynamicHandoffs: true,
  messageHistory: {
    removeHandoffMessages: true,
    addAgentAttribution: true,
    maxMessages: 50
  },
  contextIsolation: {
    enabled: false,
    sharedKeys: ['shared_context', 'project_data']
  }
};
```

**Key Features:**

- Dynamic handoffs between any agents
- Context sharing and isolation controls
- Agent attribution for message tracking
- Flexible collaboration patterns

**Best Use Cases:**

- Creative collaboration workflows
- Peer review and feedback systems
- Brainstorming and ideation processes
- Parallel processing with coordination

### 3. Hierarchical Pattern

Multi-level agent systems with escalation:

```typescript
const hierarchicalConfig: HierarchicalConfig = {
  levels: [
    ['executive_agent'],           // Top level
    ['manager_agent_1', 'manager_agent_2'], // Management level
    ['worker_agent_1', 'worker_agent_2', 'worker_agent_3'] // Worker level
  ],
  escalationRules: [{
    condition: (state) => state.metadata?.requiresEscalation === true,
    targetLevel: 0,
    message: "Escalating to executive level for decision"
  }]
};
```

**Key Features:**

- Multi-level agent hierarchy
- Automatic escalation rules
- Parent graph navigation
- Command propagation

**Best Use Cases:**

- Enterprise approval workflows
- Multi-tier decision systems
- Complex organizational structures
- Compliance and governance processes

## Agent Design Best Practices

### Agent Definition Structure

```typescript
const agentDefinition: AgentDefinition = {
  id: 'unique_agent_id',
  name: 'Human Readable Name',
  description: 'Clear description for supervisor routing',
  systemPrompt: 'Specific role and behavior instructions',
  tools: [/* Available tools */],
  handoffTools: [/* Swarm handoff capabilities */],
  nodeFunction: async (state, config) => {
    // Core agent logic
    return { messages: [new AIMessage(response)] };
  },
  metadata: {
    capabilities: ['research', 'analysis'],
    specialization: 'market_research',
    version: '1.0.0'
  }
};
```

### Node Function Best Practices

#### 1. Input Validation

```typescript
nodeFunction: async (state: AgentState, config?: RunnableConfig) => {
  // Validate required state
  if (!state.messages?.length) {
    throw new Error('No messages in state');
  }

  const lastMessage = state.messages[state.messages.length - 1];
  // Process message...
}
```

#### 2. Error Handling

```typescript
nodeFunction: async (state: AgentState) => {
  try {
    // Agent processing logic
    const result = await processTask(state);
    return { messages: [new AIMessage(result)] };
  } catch (error) {
    return {
      messages: [new AIMessage(`Error: ${error.message}`)],
      metadata: { error: true, errorDetails: error }
    };
  }
}
```

#### 3. State Management

```typescript
nodeFunction: async (state: AgentState) => {
  // Update scratchpad for collaboration
  const updatedScratchpad = `${state.scratchpad || ''}\n${agentId}: Completed analysis`;
  
  // Preserve important metadata
  const metadata = {
    ...state.metadata,
    lastAgent: agentId,
    completedAt: new Date().toISOString()
  };

  return {
    messages: [new AIMessage(response)],
    scratchpad: updatedScratchpad,
    metadata
  };
}
```

## Communication Protocols

### Message Flow Patterns

#### Supervisor Message Flow

1. **Human Message** → Supervisor Agent
2. **Supervisor** analyzes task and routes to worker
3. **Worker Agent** processes and responds
4. **Supervisor** reviews and either continues or ends

#### Swarm Message Flow

1. **Agent A** receives task
2. **Agent A** processes and determines handoff
3. **Handoff Tool** transfers control to **Agent B**
4. **Agent B** continues processing
5. Cycle continues until completion

#### Hierarchical Message Flow

1. **Request** enters at appropriate level
2. **Processing** occurs at current level
3. **Escalation** triggers if conditions met
4. **Parent Level** handles escalated requests

### Handoff Strategies

#### Tool-Based Handoffs (Swarm)

```typescript
const handoffTool: HandoffTool = {
  name: 'transfer_to_specialist',
  description: 'Transfer complex technical questions to specialist',
  targetAgent: 'technical_specialist',
  schema: z.object({
    task: z.string(),
    context: z.string(),
    priority: z.enum(['low', 'medium', 'high'])
  }),
  contextFilter: (state) => ({
    messages: state.messages.slice(-5), // Last 5 messages
    task: state.task,
    metadata: { handoff: true }
  })
};
```

#### Command-Based Navigation (Hierarchical)

```typescript
const parentCommand: AgentCommand = {
  goto: 'parent_supervisor',
  update: { task: 'Requires executive approval' },
  graph: 'PARENT'
};
```

## Resource Management

### Performance Optimization

#### Token Management

```typescript
const performanceConfig = {
  tokenOptimization: true,        // Optimize token usage
  contextWindowManagement: true,  // Manage context size
  enableMessageForwarding: true,  // Forward messages efficiently
  messageHistory: {
    maxMessages: 50,             // Limit history size
    pruneStrategy: 'fifo'        // First-in-first-out pruning
  }
};
```

#### Caching Strategy

- **LLM Response Caching**: Cache frequent responses
- **Graph Compilation Caching**: Reuse compiled graphs
- **State Checkpointing**: Persist intermediate states

### Load Balancing

#### Agent Distribution

```typescript
// Register multiple instances of the same agent type
for (let i = 0; i < 3; i++) {
  agentRegistry.registerAgent({
    id: `researcher_${i}`,
    name: `Researcher ${i}`,
    // ... same configuration
  });
}
```

#### Dynamic Routing

```typescript
// Supervisor can route based on load
const availableAgents = workers.filter(agentId => 
  agentRegistry.getAgentHealth(agentId)
);
```

## Fault Tolerance

### Agent Health Monitoring

```typescript
// Continuous health monitoring
setInterval(() => {
  for (const agentId of agentRegistry.listAgentIds()) {
    const isHealthy = await testAgentHealth(agentId);
    agentRegistry.updateAgentHealth(agentId, isHealthy);
  }
}, 30000); // Check every 30 seconds
```

### Error Recovery Patterns

#### Graceful Degradation

```typescript
nodeFunction: async (state: AgentState) => {
  try {
    return await primaryProcessing(state);
  } catch (error) {
    // Fallback to simpler processing
    return await fallbackProcessing(state);
  }
}
```

#### Circuit Breaker Pattern

```typescript
class AgentCircuitBreaker {
  private failures = 0;
  private readonly threshold = 5;
  private lastFailureTime = 0;
  private readonly timeout = 60000; // 1 minute

  async execute(operation: () => Promise<any>) {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

## Monitoring and Observability

### Event-Driven Monitoring

#### Network Events

```typescript
// Network lifecycle events
eventEmitter.on('network.created', (event) => {
  logger.info(`Network created: ${event.networkId} (${event.type})`);
});

eventEmitter.on('workflow.completed', (event) => {
  metrics.recordExecutionTime(event.networkId, event.executionTime);
});
```

#### Agent Events

```typescript
// Agent health and performance events
eventEmitter.on('agent.health.changed', (event) => {
  if (!event.isHealthy) {
    alerting.sendAlert(`Agent ${event.agentId} is unhealthy`);
  }
});
```

### Metrics Collection

#### Execution Metrics

```typescript
interface ExecutionMetrics {
  networkId: string;
  executionTime: number;
  tokenUsage: {
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
  };
  executionPath: string[];
  messageCount: number;
}
```

#### Performance Dashboards

- Network execution times and success rates
- Agent utilization and health status
- Token usage and cost optimization
- Error rates and failure patterns

## Integration with LangGraph Workflows

### Subgraph Integration

```typescript
// Multi-agent network as subgraph
const mainWorkflow = new StateGraph(AgentState)
  .addNode('input_processing', processInput)
  .addNode('multi_agent_analysis', multiAgentNetwork) // Subgraph
  .addNode('output_generation', generateOutput);
```

### State Compilation

```typescript
const compilationOptions = {
  enableInterrupts: true,        // Human-in-the-loop support
  checkpointer: memoryCheckpointer, // State persistence
  debug: process.env.NODE_ENV === 'development'
};
```

## Common Implementation Patterns

### Research Team Pattern

```typescript
async function createResearchTeam() {
  const agents = [
    createResearcherAgent(),
    createAnalystAgent(),
    createWriterAgent(),
    createReviewerAgent()
  ];

  return coordinator.setupNetwork(
    'research-team',
    agents,
    'supervisor',
    {
      systemPrompt: 'Coordinate research team for comprehensive analysis',
      workers: agents.map(a => a.id),
      enableForwardMessage: true
    }
  );
}
```

### Content Creation Pipeline

```typescript
async function createContentPipeline() {
  const network: AgentNetwork = {
    id: 'content-pipeline',
    type: 'swarm',
    agents: [
      createContentCreatorAgent(),
      createEditorAgent(),
      createSEOSpecialistAgent(),
      createFactCheckerAgent()
    ],
    config: {
      enableDynamicHandoffs: true,
      messageHistory: { removeHandoffMessages: true, addAgentAttribution: true },
      contextIsolation: { enabled: false }
    }
  };

  return networkManager.createNetwork(network);
}
```

### Customer Support Hierarchy

```typescript
async function createSupportHierarchy() {
  const network: AgentNetwork = {
    id: 'support-hierarchy',
    type: 'hierarchical',
    agents: [
      createTier1Agent(),
      createTier2Agent(),
      createManagerAgent()
    ],
    config: {
      levels: [
        ['manager_agent'],
        ['tier2_agent'],
        ['tier1_agent']
      ],
      escalationRules: [{
        condition: (state) => state.metadata?.escalate === true,
        targetLevel: 1,
        message: 'Escalating to tier 2 support'
      }]
    }
  };

  return networkManager.createNetwork(network);
}
```

## Testing Strategies

### Unit Testing Agents

```typescript
describe('ResearcherAgent', () => {
  it('should process research requests', async () => {
    const state: AgentState = {
      messages: [new HumanMessage('Research AI trends')]
    };

    const result = await researcherAgent.nodeFunction(state);
    
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toContain('research findings');
  });
});
```

### Integration Testing Networks

```typescript
describe('ResearchTeamNetwork', () => {
  it('should complete research workflow', async () => {
    const networkId = await coordinator.setupNetwork(
      'test-research-team',
      testAgents,
      'supervisor'
    );

    const result = await coordinator.executeSimpleWorkflow(
      networkId,
      'Analyze market trends in AI'
    );

    expect(result.success).toBe(true);
    expect(result.executionPath).toContain('researcher');
    expect(result.finalState.messages).toBeTruthy();
  });
});
```

### Performance Testing

```typescript
describe('NetworkPerformance', () => {
  it('should handle concurrent executions', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      coordinator.executeSimpleWorkflow(networkId, `Task ${i}`)
    );

    const results = await Promise.all(promises);
    
    expect(results.every(r => r.success)).toBe(true);
    expect(results.every(r => r.executionTime < 10000)).toBe(true);
  });
});
```

## Configuration Management

### Environment-Based Configuration

```typescript
const moduleConfig: MultiAgentModuleOptions = {
  defaultLlm: {
    model: process.env.DEFAULT_LLM_MODEL || 'gpt-4',
    apiKey: process.env.OPENAI_API_KEY,
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0'),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4000')
  },
  messageHistory: {
    maxMessages: parseInt(process.env.MAX_MESSAGE_HISTORY || '50'),
    pruneStrategy: process.env.PRUNE_STRATEGY as 'fifo' | 'lifo' || 'fifo'
  },
  streaming: {
    enabled: process.env.ENABLE_STREAMING === 'true',
    modes: ['values', 'updates', 'messages']
  },
  debug: {
    enabled: process.env.NODE_ENV === 'development',
    logLevel: process.env.LOG_LEVEL as any || 'info'
  },
  performance: {
    tokenOptimization: process.env.OPTIMIZE_TOKENS !== 'false',
    contextWindowManagement: process.env.MANAGE_CONTEXT !== 'false',
    enableMessageForwarding: process.env.ENABLE_FORWARDING !== 'false'
  }
};
```

### Module Registration

```typescript
@Module({
  imports: [
    MultiAgentModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        defaultLlm: {
          model: configService.get('LLM_MODEL'),
          apiKey: configService.get('OPENAI_API_KEY'),
        },
        debug: {
          enabled: configService.get('NODE_ENV') === 'development'
        }
      }),
      inject: [ConfigService]
    })
  ]
})
export class AppModule {}
```

## Security Considerations

### Input Validation

```typescript
// Validate agent definitions
const validation = AgentDefinitionSchema.safeParse(definition);
if (!validation.success) {
  throw new Error(`Invalid agent definition: ${validation.error.message}`);
}
```

### Access Control

```typescript
// Role-based agent access
class SecureAgentRegistry extends AgentRegistryService {
  registerAgent(definition: AgentDefinition, userRole: string): void {
    if (!this.hasPermission(userRole, 'agent:create')) {
      throw new Error('Insufficient permissions');
    }
    super.registerAgent(definition);
  }
}
```

### Audit Logging

```typescript
// Track all agent operations
eventEmitter.on('agent.registered', (event) => {
  auditLogger.log({
    action: 'agent_registered',
    agentId: event.agentId,
    userId: getCurrentUserId(),
    timestamp: event.timestamp
  });
});
```

This multi-agent module provides a robust foundation for building sophisticated AI agent workflows with enterprise-grade coordination, monitoring, and scalability features. The architecture follows SOLID principles and modern LangGraph patterns for maximum flexibility and maintainability.
