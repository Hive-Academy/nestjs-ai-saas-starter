# Multi-Agent Module - User Manual

## Overview

The **Multi-Agent Module** enables sophisticated AI agent coordination and orchestration with three primary patterns:

- **Supervisor Pattern** - Hierarchical coordination with intelligent routing
- **Swarm Pattern** - Peer-to-peer agent networks with dynamic handoffs
- **Hierarchical Pattern** - Multi-level agent systems with escalation

Built on **2025 LangGraph patterns** with full TypeScript support and enterprise-ready features.

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

### Hierarchical Pattern

**Best for**: Approval workflows, escalation systems, enterprise processes

```typescript
// Setup hierarchical network
const networkId = await coordinator.setupNetwork(
  'support-hierarchy',
  [
    { id: 'tier1-support', type: 'Tier1SupportAgent' },
    { id: 'tier2-support', type: 'Tier2SupportAgent' },
    { id: 'support-manager', type: 'SupportManagerAgent' },
  ],
  'hierarchical',
  {
    levels: [
      ['support-manager'], // Management level
      ['tier2-support'], // Specialist level
      ['tier1-support'], // Front-line level
    ],
    escalationRules: [
      {
        condition: (state) => state.metadata?.severity === 'critical',
        targetLevel: 0, // Escalate to management
        message: 'Critical severity - immediate attention required',
      },
    ],
  }
);
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
