# Workflow Engine Module - User Manual

## Overview

The **@hive-academy/langgraph-workflow-engine** module provides the execution engine for building and running sophisticated LangGraph workflows in NestJS applications. It orchestrates graph compilation, state management, streaming, and command processing to create enterprise-grade AI workflow applications.

**Key Features:**

- **Unified Workflow Base Classes** - Abstract base classes for declarative and streaming workflows
- **Graph Builder & Compilation** - Automatic graph construction from decorators or definitions
- **Workflow Streaming Engine** - Real-time workflow execution with streaming capabilities
- **Command Processing** - Sophisticated command routing and control flow management
- **Subgraph Management** - Hierarchical workflow composition with nested graph support
- **Performance Optimization** - Compilation caching, metadata processing, and optimized execution

## Quick Start

### Installation & Setup

```bash
npm install @hive-academy/langgraph-workflow-engine
```

```typescript
import { Module } from '@nestjs/common';
import { WorkflowEngineModule } from '@hive-academy/langgraph-workflow-engine';

@Module({
  imports: [
    WorkflowEngineModule.forRoot({
      compilation: {
        cacheEnabled: true,
        cacheTTL: 3600000, // 1 hour
        optimizeGraphs: true,
      },
      execution: {
        defaultTimeout: 300000, // 5 minutes
        streamingEnabled: true,
        parallelExecution: true,
        maxConcurrency: 10,
      },
      debugging: {
        enabled: true,
        logLevel: 'debug',
        traceExecution: true,
      },
      subgraphs: {
        enabled: true,
        maxDepth: 5,
        isolateContext: true,
      },
    }),
  ],
})
export class AppModule {}
```

## Core Base Classes

### UnifiedWorkflowBase - Foundation Class

**Abstract base class** providing common workflow functionality:

```typescript
// Core workflow lifecycle methods
abstract initialize(): Promise<void>
abstract buildGraph(): Promise<StateGraph<TState>>
abstract getWorkflowDefinition(): WorkflowDefinition<TState>

// Execution methods
invoke(state: Partial<TState>, config?: RunnableConfig): Promise<TState>
stream(state: Partial<TState>, config?: RunnableConfig): AsyncIterableIterator<TState>

// Command processing
processCommand(command: Command<TState>, state: TState): Promise<Partial<TState> | Command<TState>>

// Human-in-the-loop integration
handleHumanApproval(state: TState): Promise<Command<TState>>
waitForApproval(approvalId: string): Promise<boolean>
```

### DeclarativeWorkflowBase - Decorator-Based Workflows

**Base class for workflows using decorators** from functional-api module:

```typescript
// Automatically builds workflows from @Node, @Edge, @Workflow decorators
// No need to implement getWorkflowDefinition()
// Provides decorator-specific functionality
```

### Complete Production Usage Example

```typescript
import { Injectable } from '@nestjs/common';
import { UnifiedWorkflowBase, WorkflowDefinition, WorkflowState, Command } from '@hive-academy/langgraph-workflow-engine';

interface CustomerServiceState extends WorkflowState {
  customer: {
    id: string;
    tier: 'basic' | 'premium' | 'enterprise';
    history: CustomerInteraction[];
    currentIssue: SupportTicket;
  };
  conversation: {
    messages: ConversationMessage[];
    sentiment: 'positive' | 'neutral' | 'negative';
    urgency: 'low' | 'medium' | 'high' | 'critical';
  };
  resolution: {
    status: 'investigating' | 'escalated' | 'resolved' | 'closed';
    assignedAgent?: string;
    estimatedTime?: number;
    solution?: ResolutionPlan;
  };
  automation: {
    confidenceLevel: number;
    suggestedActions: string[];
    requiresHuman: boolean;
    escalationReason?: string;
  };
}

@Injectable()
export class EnterpriseCustomerServiceWorkflow extends UnifiedWorkflowBase<CustomerServiceState> {
  protected readonly workflowConfig = {
    name: 'enterprise-customer-service',
    description: 'Comprehensive customer service automation with escalation',
    confidenceThreshold: 0.8,
    requiresHumanApproval: true,
    autoApproveThreshold: 0.95,
    streaming: true,
    cache: true,
    metrics: true,
    hitl: {
      enabled: true,
      timeout: 600000, // 10 minutes
      fallbackStrategy: 'escalate',
    },
  };

  getWorkflowDefinition(): WorkflowDefinition<CustomerServiceState> {
    return {
      name: 'enterprise-customer-service',
      description: 'AI-powered customer service with human oversight',

      nodes: [
        {
          id: 'initialize-session',
          name: 'Initialize Customer Session',
          description: 'Set up customer service session with context',
          handler: this.initializeSession.bind(this),
          config: {
            timeout: 30000,
            retry: { maxAttempts: 3, delay: 1000 },
          },
        },
        {
          id: 'analyze-request',
          name: 'Analyze Customer Request',
          description: 'AI analysis of customer issue and sentiment',
          handler: this.analyzeRequest.bind(this),
          config: {
            streaming: true,
            tools: ['sentiment-analyzer', 'intent-classifier'],
            timeout: 60000,
          },
        },
        {
          id: 'determine-complexity',
          name: 'Assess Issue Complexity',
          description: 'Evaluate complexity and routing requirements',
          handler: this.determineComplexity.bind(this),
          config: {
            requiresApproval: false, // Automated decision
          },
        },
        {
          id: 'auto-resolution',
          name: 'Automated Resolution',
          description: 'Attempt automated resolution for simple issues',
          handler: this.attemptAutoResolution.bind(this),
          config: {
            streaming: true,
            timeout: 120000,
            requiresApproval: true,
            approval: {
              threshold: 0.9,
              condition: (state) => state.customer.tier === 'enterprise' || state.conversation.urgency === 'critical',
              message: (state) => `Auto-resolution for ${state.customer.tier} customer: ${state.customer.currentIssue.summary}`,
            },
          },
        },
        {
          id: 'human-escalation',
          name: 'Human Agent Escalation',
          description: 'Route to human agent with full context',
          handler: this.escalateToHuman.bind(this),
          config: {
            requiresApproval: true,
            approval: {
              riskLevel: 'medium',
              message: 'Human escalation required - preparing agent handoff',
            },
          },
        },
        {
          id: 'specialist-routing',
          name: 'Specialist Routing',
          description: 'Route to specialized support team',
          handler: this.routeToSpecialist.bind(this),
          config: {
            timeout: 180000,
            requiresApproval: true,
            approval: { riskLevel: 'high' },
          },
        },
        {
          id: 'resolution-verification',
          name: 'Verify Resolution',
          description: 'Confirm issue resolution with customer',
          handler: this.verifyResolution.bind(this),
          config: { streaming: true },
        },
        {
          id: 'close-ticket',
          name: 'Close Support Ticket',
          description: 'Finalize ticket closure and follow-up',
          handler: this.closeTicket.bind(this),
        },
      ],

      edges: [
        { from: 'initialize-session', to: 'analyze-request' },
        { from: 'analyze-request', to: 'determine-complexity' },
        {
          from: 'determine-complexity',
          to: {
            condition: (state) => {
              const complexity = state.automation.confidenceLevel;
              const urgency = state.conversation.urgency;
              const tier = state.customer.tier;

              if (urgency === 'critical' || tier === 'enterprise') return 'high-priority';
              if (complexity > 0.8 && !state.automation.requiresHuman) return 'auto-resolvable';
              if (complexity > 0.5) return 'human-assisted';
              return 'specialist-required';
            },
            routes: {
              'auto-resolvable': 'auto-resolution',
              'human-assisted': 'human-escalation',
              'specialist-required': 'specialist-routing',
              'high-priority': 'specialist-routing',
            },
            default: 'human-escalation',
          },
          config: {
            priority: 1,
            condition: (state) => state.status === 'active',
          },
        },
        {
          from: 'auto-resolution',
          to: {
            condition: (state) => (state.resolution.status === 'resolved' ? 'resolved' : 'needs-escalation'),
            routes: {
              resolved: 'resolution-verification',
              'needs-escalation': 'human-escalation',
            },
            default: 'human-escalation',
          },
        },
        { from: 'human-escalation', to: 'resolution-verification' },
        { from: 'specialist-routing', to: 'resolution-verification' },
        { from: 'resolution-verification', to: 'close-ticket' },
      ],

      entryPoint: 'initialize-session',
    };
  }

  private async initializeSession(state: CustomerServiceState): Promise<Partial<CustomerServiceState>> {
    const customerId = state.customer.id;

    // Load customer context
    const customerData = await this.loadCustomerContext(customerId);
    const conversationHistory = await this.loadConversationHistory(customerId);

    return {
      status: 'active',
      currentNode: 'initialize-session',
      completedNodes: ['initialize-session'],
      customer: {
        ...state.customer,
        ...customerData,
        history: conversationHistory,
      },
      conversation: {
        messages: [],
        sentiment: 'neutral',
        urgency: 'medium',
      },
      resolution: {
        status: 'investigating',
      },
      automation: {
        confidenceLevel: 0.5,
        suggestedActions: [],
        requiresHuman: false,
      },
      timestamps: { ...state.timestamps, updated: new Date() },
    };
  }

  private async analyzeRequest(state: CustomerServiceState): Promise<Partial<CustomerServiceState>> {
    const issue = state.customer.currentIssue;

    try {
      // AI analysis of customer request
      const analysis = await this.performAIAnalysis(issue);

      const sentimentScore = analysis.sentiment.score;
      const intentConfidence = analysis.intent.confidence;
      const urgencyLevel = this.calculateUrgency(analysis, state.customer);

      return {
        currentNode: 'analyze-request',
        completedNodes: ['analyze-request'],
        conversation: {
          ...state.conversation,
          sentiment: sentimentScore > 0.3 ? 'positive' : sentimentScore < -0.3 ? 'negative' : 'neutral',
          urgency: urgencyLevel,
        },
        automation: {
          ...state.automation,
          confidenceLevel: intentConfidence,
          suggestedActions: analysis.suggestedActions,
          requiresHuman: intentConfidence < 0.7 || urgencyLevel === 'critical',
        },
        metadata: {
          ...state.metadata,
          aiAnalysis: analysis,
          processingTime: analysis.processingTime,
        },
      };
    } catch (error) {
      return this.handleAnalysisError(error, state);
    }
  }

  private async determineComplexity(state: CustomerServiceState): Promise<Partial<CustomerServiceState> | Command> {
    const { automation, customer, conversation } = state;

    // Complexity scoring algorithm
    let complexityScore = automation.confidenceLevel;

    // Adjust based on customer tier
    if (customer.tier === 'enterprise') complexityScore += 0.1;
    if (customer.tier === 'basic') complexityScore -= 0.1;

    // Adjust based on conversation urgency
    switch (conversation.urgency) {
      case 'critical':
        complexityScore -= 0.2;
        break;
      case 'high':
        complexityScore -= 0.1;
        break;
      case 'low':
        complexityScore += 0.1;
        break;
    }

    // Historical success rate adjustment
    const historicalSuccessRate = await this.getHistoricalSuccessRate(customer.id);
    if (historicalSuccessRate < 0.5) complexityScore -= 0.15;

    const finalComplexity = Math.max(0.1, Math.min(1.0, complexityScore));

    // Determine if human involvement is required
    const requiresHuman = finalComplexity < 0.6 || conversation.urgency === 'critical' || customer.tier === 'enterprise';

    return {
      currentNode: 'determine-complexity',
      completedNodes: ['determine-complexity'],
      automation: {
        ...automation,
        confidenceLevel: finalComplexity,
        requiresHuman,
        escalationReason: requiresHuman ? this.determineEscalationReason(state) : undefined,
      },
      confidence: finalComplexity,
    };
  }

  private async attemptAutoResolution(state: CustomerServiceState): Promise<Partial<CustomerServiceState> | Command> {
    const issue = state.customer.currentIssue;

    try {
      // Attempt automated resolution
      const resolutionPlan = await this.generateResolutionPlan(issue, state.customer);
      const executionResult = await this.executeResolutionPlan(resolutionPlan);

      if (executionResult.success) {
        return {
          currentNode: 'auto-resolution',
          completedNodes: ['auto-resolution'],
          resolution: {
            status: 'resolved',
            solution: resolutionPlan,
            estimatedTime: 0, // Already resolved
          },
          confidence: Math.min(state.confidence + 0.2, 1.0),
        };
      } else {
        // Auto-resolution failed, needs escalation
        return {
          type: 'goto',
          goto: 'human-escalation',
          reason: 'Auto-resolution failed - escalating to human agent',
          metadata: {
            failureReason: executionResult.error,
            attemptedSolution: resolutionPlan,
          },
        };
      }
    } catch (error) {
      return {
        type: 'error',
        error,
        reason: 'Auto-resolution process encountered an error',
      };
    }
  }

  private async escalateToHuman(state: CustomerServiceState): Promise<Partial<CustomerServiceState> | Command> {
    const escalationContext = this.buildEscalationContext(state);

    // Find available human agent
    const assignedAgent = await this.findAvailableAgent(state.conversation.urgency, state.customer.tier);

    if (!assignedAgent) {
      return {
        type: 'goto',
        goto: 'specialist-routing',
        reason: 'No human agents available - routing to specialist queue',
      };
    }

    // Prepare handoff to human agent
    await this.prepareHumanHandoff(assignedAgent, escalationContext);

    return {
      currentNode: 'human-escalation',
      completedNodes: ['human-escalation'],
      resolution: {
        ...state.resolution,
        status: 'escalated',
        assignedAgent: assignedAgent.id,
        estimatedTime: this.estimateResolutionTime(state),
      },
      requiresApproval: false, // Human is now handling
      metadata: {
        ...state.metadata,
        escalationContext,
        handoffTime: new Date(),
        assignedAgent,
      },
    };
  }

  private async routeToSpecialist(state: CustomerServiceState): Promise<Partial<CustomerServiceState>> {
    const specializationType = this.determineSpecializationType(state);
    const specialistQueue = await this.findSpecialistQueue(specializationType);

    await this.addToSpecialistQueue(specialistQueue, state);

    return {
      currentNode: 'specialist-routing',
      completedNodes: ['specialist-routing'],
      resolution: {
        ...state.resolution,
        status: 'escalated',
        estimatedTime: specialistQueue.averageWaitTime + specialistQueue.averageResolutionTime,
      },
      metadata: {
        ...state.metadata,
        specialistType: specializationType,
        queuePosition: specialistQueue.position,
        estimatedWait: specialistQueue.averageWaitTime,
      },
    };
  }

  private async verifyResolution(state: CustomerServiceState): Promise<Partial<CustomerServiceState> | Command> {
    if (state.resolution.status !== 'resolved') {
      return {
        type: 'error',
        error: new Error('Cannot verify resolution - issue not marked as resolved'),
        reason: 'Resolution verification called on unresolved issue',
      };
    }

    // Verify with customer (this might involve waiting for customer response)
    const verificationResult = await this.requestCustomerVerification(state);

    if (verificationResult.satisfied) {
      return {
        currentNode: 'resolution-verification',
        completedNodes: ['resolution-verification'],
        resolution: {
          ...state.resolution,
          status: 'resolved',
        },
        confidence: 1.0,
      };
    } else {
      return {
        type: 'goto',
        goto: 'human-escalation',
        reason: 'Customer not satisfied with resolution - re-escalating',
        metadata: { customerFeedback: verificationResult.feedback },
      };
    }
  }

  private async closeTicket(state: CustomerServiceState): Promise<Partial<CustomerServiceState>> {
    const ticketClosure = await this.performTicketClosure(state);

    return {
      status: 'completed',
      currentNode: 'close-ticket',
      completedNodes: ['close-ticket'],
      resolution: {
        ...state.resolution,
        status: 'closed',
      },
      timestamps: {
        ...state.timestamps,
        completed: new Date(),
        updated: new Date(),
      },
      metadata: {
        ...state.metadata,
        ticketClosure,
        totalResolutionTime: Date.now() - state.startedAt.getTime(),
      },
    };
  }

  // Helper methods (simplified for brevity)
  private async loadCustomerContext(customerId: string): Promise<any> {
    return { tier: 'premium', preferences: {}, contactHistory: [] };
  }

  private async performAIAnalysis(issue: any): Promise<any> {
    return {
      sentiment: { score: 0.2 },
      intent: { confidence: 0.8 },
      suggestedActions: ['check_account', 'verify_identity'],
      processingTime: 1500,
    };
  }

  private calculateUrgency(analysis: any, customer: any): 'low' | 'medium' | 'high' | 'critical' {
    // Simplified urgency calculation
    return analysis.sentiment.score < -0.5 ? 'high' : 'medium';
  }

  private async getHistoricalSuccessRate(customerId: string): Promise<number> {
    return 0.75; // 75% historical success rate
  }
}
```

## Configuration

### Basic Configuration

```typescript
WorkflowEngineModule.forRoot({
  compilation: { cacheEnabled: true },
  execution: { defaultTimeout: 300000 },
  debugging: { enabled: false },
});
```

### Production Configuration

```typescript
WorkflowEngineModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    compilation: {
      cacheEnabled: configService.get('WORKFLOW_CACHE_ENABLED', true),
      cacheTTL: configService.get('WORKFLOW_CACHE_TTL', 3600000),
      optimizeGraphs: configService.get('GRAPH_OPTIMIZATION', true),
      precompileWorkflows: configService.get('PRECOMPILE_WORKFLOWS', false),
    },
    execution: {
      defaultTimeout: configService.get('WORKFLOW_DEFAULT_TIMEOUT', 300000),
      streamingEnabled: configService.get('STREAMING_ENABLED', true),
      parallelExecution: configService.get('PARALLEL_EXECUTION', true),
      maxConcurrency: configService.get('MAX_CONCURRENCY', 10),
      memoryLimit: configService.get('MEMORY_LIMIT', '1GB'),
    },
    debugging: {
      enabled: configService.get('DEBUG_WORKFLOWS', false),
      logLevel: configService.get('DEBUG_LOG_LEVEL', 'info'),
      traceExecution: configService.get('TRACE_EXECUTION', false),
      saveExecutionLogs: configService.get('SAVE_EXECUTION_LOGS', true),
    },
    subgraphs: {
      enabled: configService.get('SUBGRAPHS_ENABLED', true),
      maxDepth: configService.get('MAX_SUBGRAPH_DEPTH', 5),
      isolateContext: configService.get('ISOLATE_SUBGRAPH_CONTEXT', true),
      cacheCompiledSubgraphs: configService.get('CACHE_SUBGRAPHS', true),
    },
    performance: {
      enableMetrics: configService.get('ENABLE_PERFORMANCE_METRICS', true),
      profileExecution: configService.get('PROFILE_EXECUTION', false),
      optimizeMemoryUsage: configService.get('OPTIMIZE_MEMORY', true),
    },
  }),
  inject: [ConfigService],
});
```

## Core Interfaces

### Workflow Engine Types

```typescript
interface WorkflowDefinition<TState = WorkflowState> {
  name: string;
  description?: string;
  channels?: any;
  nodes: Array<WorkflowNode<TState>>;
  edges: Array<WorkflowEdge<TState>>;
  entryPoint: string;
  config?: WorkflowNodeConfig;
}

interface WorkflowNode<TState = WorkflowState> {
  id: string;
  name: string;
  description?: string;
  handler: (state: TState) => Promise<Partial<TState> | Command<TState>>;
  requiresApproval?: boolean;
  config?: WorkflowNodeConfig;
}

interface Command<TState = WorkflowState> {
  type?: 'goto' | 'update' | 'end' | 'error' | 'retry' | 'skip' | 'stop';
  goto?: string;
  update?: Partial<TState>;
  error?: Error | WorkflowError;
  reason?: string;
  metadata?: Record<string, any>;
}

abstract class UnifiedWorkflowBase<TState extends WorkflowState> {
  protected abstract readonly workflowConfig: WorkflowExecutionConfig;
  abstract getWorkflowDefinition(): WorkflowDefinition<TState>;

  // Core methods
  async initialize(): Promise<void>;
  async invoke(state: Partial<TState>, config?: RunnableConfig): Promise<TState>;
  stream(state: Partial<TState>, config?: RunnableConfig): AsyncIterableIterator<TState>;
}
```

## Error Handling

```typescript
import { WorkflowError, Command, UnifiedWorkflowBase } from '@hive-academy/langgraph-workflow-engine';

@Injectable()
export class RobustWorkflowService extends UnifiedWorkflowBase<WorkflowState> {
  protected async safeNodeExecution<TState extends WorkflowState>(nodeId: string, handler: (state: TState) => Promise<Partial<TState> | Command<TState>>, state: TState): Promise<Partial<TState> | Command<TState>> {
    try {
      const startTime = Date.now();
      const result = await handler(state);
      const duration = Date.now() - startTime;

      // Log successful execution
      this.logger.debug(`Node ${nodeId} executed successfully in ${duration}ms`);

      return result;
    } catch (error) {
      this.logger.error(`Node ${nodeId} execution failed:`, error);

      // Return error command for workflow handling
      return {
        type: 'error',
        error: this.createWorkflowError(error, nodeId),
        reason: `Node execution failed: ${error.message}`,
        metadata: {
          nodeId,
          timestamp: new Date(),
          recoverable: this.isRecoverableError(error),
        },
      };
    }
  }

  protected createWorkflowError(error: Error, nodeId: string): WorkflowError {
    return {
      id: `error_${nodeId}_${Date.now()}`,
      nodeId,
      type: this.classifyError(error),
      message: error.message,
      stackTrace: error.stack,
      isRecoverable: this.isRecoverableError(error),
      timestamp: new Date(),
      context: { nodeId, error: error.name },
    };
  }

  protected classifyError(error: Error): WorkflowError['type'] {
    if (error.name === 'ValidationError') return 'validation';
    if (error.name === 'TimeoutError') return 'timeout';
    if (error.message.includes('permission')) return 'permission';
    return 'execution';
  }

  protected isRecoverableError(error: Error): boolean {
    // Define recovery logic
    if (error.name === 'NetworkError') return true;
    if (error.name === 'TemporaryError') return true;
    if (error.message.includes('timeout')) return true;
    return false;
  }
}
```

## Testing

### Unit Testing

```typescript
import { Test } from '@nestjs/testing';
import { WorkflowEngineModule, UnifiedWorkflowBase, WorkflowGraphBuilderService } from '@hive-academy/langgraph-workflow-engine';

describe('UnifiedWorkflowBase', () => {
  let workflow: TestWorkflow;
  let graphBuilder: WorkflowGraphBuilderService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        WorkflowEngineModule.forRoot({
          compilation: { cacheEnabled: false },
          debugging: { enabled: true },
        }),
      ],
      providers: [TestWorkflow],
    }).compile();

    workflow = module.get<TestWorkflow>(TestWorkflow);
    graphBuilder = module.get<WorkflowGraphBuilderService>(WorkflowGraphBuilderService);
  });

  it('should initialize workflow successfully', async () => {
    await expect(workflow.initialize()).resolves.not.toThrow();
    expect(workflow.graph).toBeDefined();
  });

  it('should execute workflow with valid state', async () => {
    await workflow.initialize();

    const initialState = { executionId: 'test-exec', status: 'pending' };
    const result = await workflow.invoke(initialState);

    expect(result.status).toBe('completed');
    expect(result.completedNodes).toContain('test-node');
  });
});

@Injectable()
class TestWorkflow extends UnifiedWorkflowBase<WorkflowState> {
  protected readonly workflowConfig = {
    name: 'test-workflow',
    streaming: false,
  };

  getWorkflowDefinition() {
    return {
      name: 'test-workflow',
      nodes: [
        {
          id: 'test-node',
          name: 'Test Node',
          handler: async (state) => ({ status: 'completed', completedNodes: ['test-node'] }),
        },
      ],
      edges: [],
      entryPoint: 'test-node',
    };
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Graph Compilation Failures

```typescript
// Problem: Complex graph definitions causing compilation errors
// Solution: Use simplified node handlers and validate definitions
const validateWorkflowDefinition = (definition: WorkflowDefinition) => {
  // Check for circular dependencies
  const nodeIds = definition.nodes.map((n) => n.id);
  const edgeTargets = definition.edges.map((e) => (typeof e.to === 'string' ? e.to : 'conditional'));

  const invalidTargets = edgeTargets.filter((target) => target !== 'conditional' && !nodeIds.includes(target));

  if (invalidTargets.length > 0) {
    throw new Error(`Invalid edge targets: ${invalidTargets.join(', ')}`);
  }
};
```

#### 2. Memory Leaks in Long-Running Workflows

```typescript
// Solution: Implement proper cleanup and state management
WorkflowEngineModule.forRoot({
  execution: {
    memoryLimit: '512MB',
    cleanupInterval: 300000, // 5 minutes
    maxWorkflowAge: 3600000, // 1 hour
  },
  compilation: {
    cacheTTL: 1800000, // 30 minutes
    maxCacheSize: 1000,
  },
});
```

#### 3. Subgraph Context Isolation Issues

```typescript
// Problem: State bleeding between subgraphs
// Solution: Enable proper context isolation
const subgraphConfig = {
  subgraphs: {
    enabled: true,
    isolateContext: true, // Isolate state
    deepCopyState: true, // Deep copy state between levels
    maxDepth: 3, // Limit recursion
    sanitizeStateTransitions: true, // Clean transitions
  },
};
```

This comprehensive workflow engine module provides the execution foundation for building sophisticated, production-ready LangGraph AI workflows with enterprise-grade performance, monitoring, and reliability features.
