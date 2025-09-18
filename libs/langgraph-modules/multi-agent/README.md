# Multi-Agent Module - User Manual

## Overview

The **Multi-Agent Module** enables sophisticated AI agent coordination and orchestration with three primary patterns:

- **Supervisor Pattern** - Hierarchical coordination with intelligent routing
- **Swarm Pattern** - Peer-to-peer agent networks with dynamic handoffs
- **Hierarchical Pattern** - Multi-level agent systems with escalation

Built on **2025 LangGraph patterns** with full TypeScript support and enterprise-ready features.

## 🚀 New Enhanced Capabilities

### Hierarchical Multi-Level Coordination

Truly hierarchical agent systems with **intelligent escalation** and **level-specific routing**:

- **Executive Level** - Strategic decisions and policy enforcement
- **Specialist Level** - Technical expertise and complex problem resolution
- **Operational Level** - Direct execution and customer interaction
- **Dynamic Escalation** - Automatic routing based on conditions and metadata

### Weighted Tool Coordination

Sophisticated **confidence-based decision making** with weighted merging:

- **Tool Confidence Tracking** - Each tool result has confidence/importance weights
- **Intelligent Result Merging** - Weighted averages for numbers, confidence-based selection for strings
- **Multi-Type Value Handling** - Arrays, objects, primitives all handled appropriately
- **Cumulative Weight Accumulation** - Results improve with more confident sources

### Adaptive Strategy Selection

Dynamic coordination patterns that **adapt in real-time**:

- **Context Analysis** - Real-time assessment of task characteristics
- **Strategy Switching** - Automatic pattern selection (supervisor vs swarm vs hierarchical)
- **Performance Optimization** - Route selection based on urgency, complexity, customer tier
- **Feedback-Driven Learning** - Strategy effectiveness tracking and optimization

## Quick Start

### Installation & Setup

```bash
npm install @hive-academy/langgraph-modules-multi-agent
```

```typescript
import { Module } from '@nestjs/common';
import { MultiAgentModule } from '@hive-academy/langgraph-modules-multi-agent';

@Module({
  imports: [
    MultiAgentModule.forRoot({
      // LLM Configuration
      defaultLlm: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0,
        openaiApiKey: process.env.OPENAI_API_KEY,
      },
      // Enable streaming and performance optimizations
      streaming: { enabled: true },
      performance: {
        tokenOptimization: true,
        enableMessageForwarding: true,
      },
    }),
  ],
})
export class AppModule {}
```

## Agent Definition

### @Agent Decorator - CLASS-LEVEL

**Applied to the entire class** to define agent metadata:

```typescript
@Agent({
  id: string;                    // Unique agent identifier
  name: string;                  // Human-readable name for routing
  description: string;           // Description for supervisor routing decisions
  capabilities?: string[];       // Agent capabilities for discovery
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tools?: string[];              // Tool names available to agent
  metadata?: Record<string, unknown>; // Extended configuration
})
```

### nodeFunction - METHOD-LEVEL

**Core agent logic** - not decorated, standard TypeScript method:

```typescript
// METHOD-LEVEL: Standard TypeScript method (no decorator)
async nodeFunction(state: AgentState, config?: RunnableConfig): Promise<Partial<AgentState>> {
  // Agent processing logic
  return {
    messages: [new AIMessage('Response from agent')],
    metadata: { processedBy: this.agentId, completedAt: new Date() }
  };
}
```

## Complete Agent Example

```typescript
import { Injectable } from '@nestjs/common';
import { Agent } from '@hive-academy/langgraph-modules-multi-agent';
import { AgentState } from '@hive-academy/langgraph-modules-multi-agent';
import { AIMessage } from '@langchain/core/messages';

// CLASS-LEVEL DECORATOR: Applied to entire class
@Agent({
  id: 'content-creator',
  name: 'Content Creation Specialist',
  description: 'Creates high-quality content based on research and requirements',
  capabilities: ['writing', 'content_creation', 'editing'],
  priority: 'high',
})
@Injectable()
export class ContentCreatorAgent {
  constructor(private readonly writingService: AIWritingService) {}

  // METHOD-LEVEL: Standard method implementation (no decorator)
  async nodeFunction(state: AgentState): Promise<Partial<AgentState>> {
    const lastMessage = state.messages[state.messages.length - 1];
    const requirements = lastMessage.content.toString();

    // Create content based on requirements
    const content = await this.writingService.createContent(requirements);

    // Determine next step based on content complexity
    const needsReview = content.complexity > 0.8;

    return {
      messages: [new AIMessage(`Content created: ${content.title}\n\nPreview: ${content.preview}`)],
      next: needsReview ? 'content-editor' : undefined,
      metadata: {
        ...state.metadata,
        contentCreated: true,
        needsReview,
        complexity: content.complexity,
      },
    };
  }
}
```

## Coordination Patterns

### Supervisor Pattern

**Best for**: Sequential workflows, quality control, structured processes

```typescript
// Setup supervisor network
const networkId = await coordinator.setupNetwork(
  'content-team',
  [
    { id: 'researcher', type: 'ResearchAgent' },
    { id: 'writer', type: 'ContentCreatorAgent' },
    { id: 'editor', type: 'EditorAgent' },
  ],
  'supervisor',
  {
    systemPrompt: 'You coordinate content creation: researcher → writer → editor',
    workers: ['researcher', 'writer', 'editor'],
    enableForwardMessage: true,
    removeHandoffMessages: true,
  }
);

// Execute workflow
const result = await coordinator.executeSimpleWorkflow(networkId, 'Create comprehensive guide about TypeScript best practices');
```

### Swarm Pattern

**Best for**: Creative collaboration, brainstorming, flexible workflows

```typescript
// Setup swarm network
const networkId = await coordinator.setupNetwork(
  'creative-swarm',
  [
    { id: 'idea-generator', type: 'IdeaGeneratorAgent' },
    { id: 'concept-developer', type: 'ConceptDeveloperAgent' },
    { id: 'content-creator', type: 'ContentCreatorAgent' },
  ],
  'swarm',
  {
    enableDynamicHandoffs: true,
    messageHistory: {
      removeHandoffMessages: true,
      addAgentAttribution: true,
      maxMessages: 50,
    },
    contextIsolation: {
      enabled: false, // Share context for collaboration
      sharedKeys: ['projectBrief', 'targetAudience'],
    },
  }
);
```

### Hierarchical Pattern - **ENHANCED**

**Best for**: Approval workflows, escalation systems, enterprise processes

Now supports **true multi-level hierarchical coordination** with intelligent escalation:

```typescript
// Setup enhanced hierarchical network
const networkId = await coordinator.setupNetwork(
  'customer-support-hierarchy',
  [
    // Executive Level - Strategic decisions
    {
      id: 'support-executive',
      name: 'Support Executive',
      description: 'Makes high-level customer service decisions, handles escalations',
      nodeFunction: createExecutiveAgent(),
      capabilities: ['strategic_planning', 'escalation_management', 'policy_decisions'],
      priority: 'critical',
    },
    // Specialist Level - Technical expertise
    {
      id: 'technical-specialist',
      name: 'Technical Specialist',
      description: 'Provides technical expertise and complex problem resolution',
      nodeFunction: createTechnicalSpecialistAgent(),
      capabilities: ['technical_analysis', 'complex_troubleshooting', 'solution_architecture'],
      priority: 'high',
    },
    // Operational Level - Direct customer interaction
    {
      id: 'frontline-agent',
      name: 'Frontline Support Agent',
      description: 'Handles direct customer interaction and basic support tasks',
      nodeFunction: createFrontlineAgent(),
      capabilities: ['customer_interaction', 'basic_support', 'ticket_processing'],
      priority: 'medium',
    },
  ],
  'hierarchical', // Uses enhanced GraphBuilderService internally!
  {
    levels: [
      ['support-executive'], // Level 0: Executive
      ['technical-specialist'], // Level 1: Specialist
      ['frontline-agent'], // Level 2: Operational
    ],
    escalationRules: [
      {
        condition: (state) => state.metadata?.priority === 'critical',
        targetLevel: 0, // Escalate to executive
        message: 'Critical priority - executive attention required',
      },
      {
        condition: (state) => state.metadata?.complexity === 'high',
        targetLevel: 1, // Escalate to specialist
        message: 'Technical complexity requires specialist expertise',
      },
    ],
  }
);
```

### Weighted Tool Coordination - **NEW**

**Best for**: Multi-source analysis, confidence-based decisions, expert system integration

```typescript
// Setup weighted tool coordination
const networkId = await coordinator.setupNetwork(
  'weighted-analysis-tools',
  [
    {
      id: 'knowledge-searcher',
      name: 'Knowledge Base Searcher',
      description: 'Searches knowledge base for solutions',
      nodeFunction: createKnowledgeSearchAgent(),
      capabilities: ['knowledge_search', 'solution_lookup'],
    },
    {
      id: 'ai-analyzer',
      name: 'AI Solution Analyzer',
      description: 'Uses AI to analyze and propose solutions',
      nodeFunction: createAIAnalyzerAgent(),
      capabilities: ['ai_analysis', 'solution_generation'],
    },
    {
      id: 'historical-matcher',
      name: 'Historical Pattern Matcher',
      description: 'Matches against historical successful resolutions',
      nodeFunction: createHistoricalMatcherAgent(),
      capabilities: ['pattern_matching', 'historical_analysis'],
    },
  ],
  'supervisor',
  {
    systemPrompt: `You coordinate multiple analysis tools with different confidence levels.
    
TOOL WEIGHTS:
- AI Analyzer: 0.7 (high confidence, sophisticated analysis)  
- Historical Matcher: 0.8 (very high confidence, proven solutions)
- Knowledge Searcher: 0.5 (medium confidence, basic lookup)

Route to the tool most appropriate for the problem complexity.`,
    workers: ['knowledge-searcher', 'ai-analyzer', 'historical-matcher'],
    enableForwardMessage: true,
  }
);

// Agents return weighted metadata that gets intelligently merged:
// In agent implementations:
return {
  messages: [new AIMessage(`AI analysis suggests: ${analysis.recommendation}`)],
  metadata: {
    ...state.metadata,
    aiAnalysis: analysis,
    toolWeight: 0.7, // Higher confidence - AI analysis
    analysisCompleted: true,
  },
};
```

### Adaptive Strategy Selection - **NEW**

**Best for**: Dynamic workflows, context-sensitive routing, intelligent automation

```typescript
// Adaptive strategy that chooses coordination pattern based on context
const networkId = await coordinator.setupNetwork(
  `adaptive-support-${strategy}`, // Strategy determined at runtime
  [
    {
      id: 'rapid-responder',
      name: 'Rapid Response Agent',
      description: 'Provides quick initial responses and basic solutions',
      nodeFunction: createRapidResponseAgent(),
      capabilities: ['quick_response', 'basic_solutions'],
    },
    {
      id: 'deep-analyzer',
      name: 'Deep Analysis Agent',
      description: 'Performs thorough analysis for complex issues',
      nodeFunction: createDeepAnalysisAgent(),
      capabilities: ['deep_analysis', 'complex_solutions'],
    },
    {
      id: 'quality-controller',
      name: 'Quality Control Agent',
      description: 'Reviews and validates proposed solutions',
      nodeFunction: createQualityControlAgent(),
      capabilities: ['quality_control', 'solution_validation'],
    },
  ],
  strategy === 'urgent' ? 'swarm' : 'supervisor', // Dynamic pattern selection
  strategy === 'urgent'
    ? {
        enableDynamicHandoffs: true,
        messageHistory: { removeHandoffMessages: true },
      }
    : {
        systemPrompt: 'Coordinate thorough analysis with quality validation',
        workers: ['deep-analyzer', 'quality-controller'],
      }
);

// Function to determine strategy based on real-time conditions:
function determineOptimalStrategy(request: any): 'urgent' | 'thorough' {
  return request.priority === 'critical' || request.customerTier === 'enterprise' ? 'urgent' : 'thorough';
}
```

## Core Interfaces

### AgentState

Foundation of all multi-agent communication:

```typescript
interface AgentState {
  messages: BaseMessage[]; // Message history - core component
  next?: string; // Next agent to execute (supervisor pattern)
  current?: string; // Current executing agent
  scratchpad?: string; // Shared workspace for collaboration
  task?: string; // Task description passed between agents
  metadata?: Record<string, unknown>; // Extensible context
}
```

### AgentDefinition

```typescript
interface AgentDefinition {
  id: string; // Unique agent identifier
  name: string; // Agent name for routing decisions
  description: string; // Agent description for supervisor routing
  nodeFunction: AgentNodeFunction; // Core agent logic
  capabilities?: string[]; // Agent capabilities
  metadata?: Record<string, unknown>; // Extended configuration
}
```

## Service APIs

### MultiAgentCoordinatorService

**Primary interface** for multi-agent operations:

```typescript
// Quick network setup and execution
async setupNetwork(
  networkId: string,
  agents: AgentDefinition[],
  type: 'supervisor' | 'swarm' | 'hierarchical',
  config: SupervisorConfig | SwarmConfig | HierarchicalConfig
): Promise<string>

// Simple workflow execution
async executeSimpleWorkflow(
  networkId: string,
  initialMessage: string,
  config?: RunnableConfig
): Promise<MultiAgentResult>

// Agent management
registerAgent(definition: AgentDefinition): void
getAgent(agentId: string): AgentDefinition
getAllAgents(): AgentDefinition[]
getAgentsByCapability(capability: string): AgentDefinition[]
```

### AgentRegistryService

**Agent lifecycle management**:

```typescript
// Core registration
registerAgent(definition: AgentDefinition): void
getAgent(agentId: string): AgentDefinition
hasAgent(agentId: string): boolean

// Discovery and querying
getAllAgents(): AgentDefinition[]
getAgentsByCapability(capability: string): AgentDefinition[]

// Health monitoring
getAgentHealth(agentId: string): boolean
updateAgentHealth(agentId: string, isHealthy: boolean): void
```

## Configuration

### Basic Configuration

```typescript
MultiAgentModule.forRoot({
  // Agent registration (replaces auto-discovery)
  agents: [ResearchAgent, WriterAgent, EditorAgent],

  // LLM provider configuration
  defaultLlm: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0,
    maxTokens: 4000,
    openaiApiKey: process.env.OPENAI_API_KEY,
  },

  // Message management
  messageHistory: {
    maxMessages: 50,
    pruneStrategy: 'fifo',
  },

  // Performance settings
  performance: {
    tokenOptimization: true,
    contextWindowManagement: true,
    enableMessageForwarding: true,
  },

  // Streaming configuration
  streaming: {
    enabled: true,
    modes: ['values', 'updates'],
  },
});
```

### Advanced Configuration

```typescript
MultiAgentModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    // Multiple provider support
    defaultLlm: {
      provider: configService.get('LLM_PROVIDER', 'openai'),
      model: configService.get('LLM_MODEL', 'gpt-4'),
      temperature: configService.get('LLM_TEMPERATURE', 0),

      // Multiple API keys for redundancy
      openaiApiKey: configService.get('OPENAI_API_KEY'),
      anthropicApiKey: configService.get('ANTHROPIC_API_KEY'),
      openrouterApiKey: configService.get('OPENROUTER_API_KEY'),
    },

    // Checkpointing configuration
    checkpointing: {
      enabled: true,
      enableForAllNetworks: true,
      defaultThreadPrefix: 'multi-agent',
      autoCheckpoint: {
        enabled: true,
        interval: 30000, // 30 seconds
        after: ['task', 'decision', 'error'],
      },
    },

    // Debug configuration
    debug: {
      enabled: configService.get('NODE_ENV') === 'development',
      logLevel: 'debug',
    },
  }),
  inject: [ConfigService],
});
```

### Provider-Specific Configurations

```typescript
// OpenAI
defaultLlm: {
  provider: 'openai',
  model: 'gpt-4-turbo-preview',
  openaiApiKey: process.env.OPENAI_API_KEY,
  openai: {
    organization: 'your-org-id',
    project: 'your-project-id'
  }
}

// Anthropic
defaultLlm: {
  provider: 'anthropic',
  model: 'claude-3-sonnet-20240229',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropic: {
    version: '2023-06-01'
  }
}

// OpenRouter
defaultLlm: {
  provider: 'openrouter',
  model: 'anthropic/claude-3-sonnet',
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    siteName: 'Your App',
    siteUrl: 'https://yourapp.com'
  }
}
```

## 🎯 Enhanced Internal Architecture

### Powerful Internal Services

The Multi-Agent Module now includes sophisticated **internal infrastructure services** that provide enterprise-grade capabilities while maintaining clean public APIs:

#### GraphBuilderService - **Enhanced Hierarchical Coordination**

_Internal service (not exported) providing sophisticated graph construction:_

- **True Multi-Level Hierarchical Graphs** - Real executive → specialist → operational routing
- **Dynamic Escalation Logic** - Condition-based level switching with contextual messaging
- **Level-Specific Coordination** - Each hierarchy level has tailored prompt engineering and routing rules
- **Intelligent Routing Decisions** - Context-aware agent selection and workflow orchestration

#### ToolNodeService - **Enhanced Weighted Merging**

_Internal service (not exported) providing sophisticated result coordination:_

- **Multi-Type Weighted Merging** - Handles numbers, strings, arrays, objects with different strategies
- **Confidence-Based Selection** - Chooses best values based on tool confidence levels
- **Recursive Object Merging** - Deep merging of complex nested structures
- **Cumulative Weight Tracking** - Maintains weight history for improved decision making

#### NodeFactoryService - **Enhanced Coordination Patterns**

_Internal integration service providing:_

- **Tool-Enhanced Agent Nodes** - Agents with automatic weighted result processing
- **Adaptive Coordinator Nodes** - Dynamic strategy selection and pattern switching
- **Advanced Retry Logic** - Intelligent failure handling and recovery strategies
- **Performance Optimization** - Efficient resource utilization and scaling

### Clean Public API Design

All enhanced capabilities are accessed through the **MultiAgentCoordinatorService facade**:

```typescript
// Simple public interface hides complex internal infrastructure
const result = await coordinator.setupNetwork(
  'network-id',
  agents,
  'hierarchical', // Uses enhanced GraphBuilderService internally
  config
);

// Weighted coordination handled automatically by ToolNodeService
// Adaptive strategies managed by NodeFactoryService
// Enterprise-grade capabilities through simple method calls
```

## Advanced Features

### Checkpointing & Recovery

```typescript
// Enable checkpointing
MultiAgentModule.forRoot({
  checkpointing: {
    enabled: true,
    enableForAllNetworks: true,
    autoCheckpoint: {
      enabled: true,
      interval: 30000, // Checkpoint every 30 seconds
      after: ['task', 'decision', 'error'],
    },
  },
  checkpointAdapter: new RedisCheckpointAdapter({
    host: 'localhost',
    port: 6379,
  }),
});

// Resume from checkpoint
const result = await coordinator.resumeFromCheckpoint('workflow-12345', 'checkpoint-67890');
```

### Streaming & Real-time Updates

```typescript
// Enable streaming
MultiAgentModule.forRoot({
  streaming: {
    enabled: true,
    modes: ['values', 'updates', 'messages'],
  },
});

// Stream workflow execution
@WebSocketGateway()
export class WorkflowGateway {
  async handleStreamWorkflow(networkId: string, input: string) {
    const observable = this.networkManager.streamWorkflow(networkId, {
      messages: [new HumanMessage(input)],
    });

    observable.subscribe((state) => {
      this.server.emit('workflow-update', {
        networkId,
        currentAgent: state.current,
        messages: state.messages,
        progress: this.calculateProgress(state),
      });
    });
  }
}
```

### Error Handling & Recovery

```typescript
// Custom error handling in agents
// METHOD-LEVEL: Error-aware agent implementation
async nodeFunction(state: AgentState): Promise<Partial<AgentState>> {
  try {
    const result = await this.performOperation(state);
    return { messages: [new AIMessage(result)] };
  } catch (error) {
    if (error instanceof RetryableError && state.metadata?.retryCount < 3) {
      return {
        messages: [new AIMessage(`Retrying... (${state.metadata?.retryCount + 1}/3)`)],
        metadata: {
          ...state.metadata,
          retryCount: (state.metadata?.retryCount || 0) + 1
        }
      };
    }

    // Escalate after max retries
    return {
      messages: [new AIMessage(`Operation failed: ${error.message}`)],
      next: 'error-handler',
      metadata: {
        ...state.metadata,
        error: true,
        errorType: error.constructor.name
      }
    };
  }
}
```

## Testing

### Unit Testing Agents

```typescript
import { Test } from '@nestjs/testing';
import { MultiAgentModule } from '@hive-academy/langgraph-modules-multi-agent';

describe('ContentCreatorAgent', () => {
  let agent: ContentCreatorAgent;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        MultiAgentModule.forRoot({
          agents: [ContentCreatorAgent],
          defaultLlm: {
            provider: 'openai',
            model: 'gpt-3.5-turbo',
            openaiApiKey: 'test-key',
          },
        }),
      ],
      providers: [ContentCreatorAgent],
    }).compile();

    agent = module.get<ContentCreatorAgent>(ContentCreatorAgent);
  });

  it('should create content from requirements', async () => {
    const state: AgentState = {
      messages: [new HumanMessage('Create article about TypeScript')],
    };

    const result = await agent.nodeFunction(state);

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toContain('Content created');
    expect(result.metadata.contentCreated).toBe(true);
  });
});
```

### Integration Testing Networks

```typescript
describe('MultiAgentNetworkIntegration', () => {
  let coordinator: MultiAgentCoordinatorService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        MultiAgentModule.forRoot({
          agents: [ResearchAgent, WriterAgent, EditorAgent],
        }),
      ],
    }).compile();

    coordinator = module.get<MultiAgentCoordinatorService>(MultiAgentCoordinatorService);
  });

  it('should execute complete workflow', async () => {
    const networkId = await coordinator.setupNetwork(
      'test-content-team',
      [
        { id: 'researcher', type: 'ResearchAgent' },
        { id: 'writer', type: 'WriterAgent' },
        { id: 'editor', type: 'EditorAgent' },
      ],
      'supervisor',
      {
        systemPrompt: 'Coordinate content creation workflow',
        workers: ['researcher', 'writer', 'editor'],
      }
    );

    const result = await coordinator.executeSimpleWorkflow(networkId, 'Create article about TypeScript best practices');

    expect(result.success).toBe(true);
    expect(result.executionPath).toContain('researcher');
    expect(result.finalState.messages).toBeTruthy();
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Agent Registration Failures

```typescript
// Error: Agent 'my-agent' not found
// Solution: Ensure agent is registered in module configuration
MultiAgentModule.forRoot({
  agents: [MyAgent], // Add agent class to registration
});

// Check @Agent decorator is properly applied
@Agent({
  id: 'my-agent', // Ensure ID matches usage
  name: 'My Agent',
  description: 'Agent description',
})
@Injectable()
export class MyAgent {
  /* ... */
}
```

#### 2. LLM Configuration Issues

```typescript
// Error: LLM provider not configured
// Solution: Provide complete LLM configuration
defaultLlm: {
  provider: 'openai',              // Must specify provider
  model: 'gpt-4',                  // Must specify model
  openaiApiKey: process.env.OPENAI_API_KEY // Must provide API key
}
```

#### 3. Network Execution Failures

```typescript
// Error: Network execution timeout
// Solution: Increase timeout or optimize agents
const result = await coordinator.executeSimpleWorkflow(networkId, message, {
  configurable: {
    recursionLimit: 50, // Increase if needed
    maxConcurrency: 5, // Adjust based on resources
  },
});
```

This comprehensive manual provides everything needed to build sophisticated multi-agent systems with proper coordination patterns, error handling, and production-ready features.
