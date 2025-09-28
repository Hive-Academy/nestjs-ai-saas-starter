# Platform Module - LangGraph Platform Integration

## 🚀 LangGraph Platform Integration

**Evidence-Based API Documentation** (verified through source code inspection)

The Platform Module provides HTTP client integration with LangGraph Platform services through a focused service architecture for hosted assistant management and webhook handling.

### ✅ Verified Architecture Patterns

**HTTP Client Integration**: Real HTTP client for LangGraph Platform API

```typescript
// VERIFIED EXPORTS: Platform services
import {
  PlatformModule, // NestJS module
  PlatformClientService, // HTTP client for LangGraph Platform
  WebhookService, // Webhook handling
} from '@hive-academy/langgraph-platform';

// Real HTTP client implementation using @nestjs/axios
class PlatformClientService {
  constructor(private readonly httpService: HttpService) {}

  // Real API methods for LangGraph Platform integration
  async createAssistant(config: AssistantConfig): Promise<Assistant>;
  async createThread(config: ThreadConfig): Promise<Thread>;
  async createRun(config: RunConfig): Promise<Run>;
}
```

**Type-Safe Platform Interfaces**: Comprehensive platform API types

```typescript
// VERIFIED EXPORTS: Platform interfaces and types
import type {
  PlatformConfig, // Platform configuration
  AssistantConfig, // Assistant configuration
  ThreadConfig, // Thread configuration
  RunConfig, // Run configuration
} from '@hive-academy/langgraph-platform';

// Thread and run interfaces
import {
  Thread, // Thread interface
  Run, // Run interface
} from '@hive-academy/langgraph-platform';

// Webhook interfaces
import type {
  WebhookEvent, // Webhook event types
  WebhookPayload, // Webhook payload structure
} from '@hive-academy/langgraph-platform';
```

**Webhook Integration**: Real webhook handling for platform events

```typescript
@Injectable()
export class MyPlatformService {
  constructor(private readonly platformClient: PlatformClientService, private readonly webhookService: WebhookService) {}

  async setupPlatformIntegration() {
    // HTTP client for platform API calls
    const assistant = await this.platformClient.createAssistant({
      name: 'my-assistant',
      graph: workflowGraph,
      config: assistantConfig,
    });

    // Webhook service for platform events
    await this.webhookService.registerWebhook({
      url: 'https://myapp.com/webhooks/platform',
      events: ['run.completed', 'thread.updated'],
    });

    return { assistant };
  }
}
```

## Quick Start

### Installation & Setup

```bash
npm install @hive-academy/langgraph-platform
```

```typescript
import { Module } from '@nestjs/common';
import { PlatformModule } from '@hive-academy/langgraph-platform';

@Module({
  imports: [
    PlatformModule.forRoot({
      baseUrl: 'https://api.langgraph.com',
      apiKey: process.env.LANGGRAPH_API_KEY,
      timeout: 30000,
      retryPolicy: {
        maxRetries: 3,
        backoffFactor: 2,
        maxBackoffTime: 30000,
      },
      webhook: {
        enabled: true,
        secret: process.env.WEBHOOK_SECRET,
        retryPolicy: {
          maxRetries: 3,
          backoffFactor: 2,
          maxBackoffTime: 30000,
        },
      },
    }),
  ],
})
export class AppModule {}
```

## 🏗️ Ecosystem Integration Patterns

### Hybrid Deployment Architecture

**Usage**: Bridge between on-premise ecosystem and LangGraph Platform cloud services

```typescript
@Injectable()
export class HybridDeploymentService {
  constructor(private readonly platformClient: PlatformClientService, private readonly workflowEngine: WorkflowEngine, private readonly monitoring: MonitoringFacadeService, private readonly memory: MemoryService) {}

  async createHybridWorkflow(workflowName: string): Promise<HybridWorkflow> {
    // Deploy workflow graph to LangGraph Platform
    const platformGraph = await this.deployToPlatform(workflowName);

    // Create on-premise execution coordinator
    const localCoordinator = await this.workflowEngine.create({
      name: `${workflowName}-coordinator`,

      // Hybrid execution configuration
      deployment: {
        mode: 'hybrid',
        platformGraph: platformGraph.graph_id,
        localExecution: {
          memory: true,
          monitoring: true,
          checkpoints: true,
        },
        cloudExecution: {
          assistants: true,
          threadManagement: true,
          scaling: true,
        },
      },

      nodes: [
        {
          name: 'local-preprocessing',
          type: 'function',
          execution: 'local',
          function: async (state, context) => {
            // Execute locally with memory and monitoring
            const enrichedData = await this.enrichWithMemory(state.input);

            await context.monitoring.recordTimer('hybrid.local.preprocessing', Date.now() - state.startTime, {
              workflow_name: workflowName,
              execution_mode: 'local',
            });

            return { preprocessedData: enrichedData };
          },
        },

        {
          name: 'platform-ai-processing',
          type: 'platform-assistant',
          execution: 'cloud',
          function: async (state, context) => {
            // Execute on LangGraph Platform
            const thread = await this.platformClient.post<Thread>('/threads', {
              metadata: {
                workflow_name: workflowName,
                local_execution_id: context.executionId,
                hybrid_mode: true,
              },
            });

            const run = await this.platformClient.post<Run>(`/threads/${thread.thread_id}/runs`, {
              assistant_id: platformGraph.assistant_id,
              input: state.preprocessedData,
              config: {
                tags: ['hybrid-execution', 'cloud-processing'],
              },
            });

            // Monitor platform execution locally
            await context.monitoring.recordGauge('hybrid.platform.run_id', run.run_id, {
              workflow_name: workflowName,
              thread_id: thread.thread_id,
            });

            return await this.waitForPlatformCompletion(thread.thread_id, run.run_id);
          },
        },

        {
          name: 'local-postprocessing',
          type: 'function',
          execution: 'local',
          function: async (state, context) => {
            // Store results in local memory for future context
            await context.memory.store(`workflow-${workflowName}`, JSON.stringify(state.platformResult), {
              type: 'summary',
              importance: 0.8,
              tags: JSON.stringify(['hybrid-result', 'platform-processed']),
            });

            // Final local processing
            const finalResult = await this.finalizeResult(state.platformResult);

            await context.monitoring.recordCounter('hybrid.executions.completed', 1, {
              workflow_name: workflowName,
              success: 'true',
              execution_mode: 'hybrid',
            });

            return finalResult;
          },
        },
      ],
    });

    return {
      platformGraph,
      localCoordinator,
      execute: async (input: any) => {
        return localCoordinator.execute(input);
      },
    };
  }

  private async deployToPlatform(workflowName: string): Promise<PlatformGraph> {
    // Create assistant on platform
    const assistant = await this.platformClient.post<Assistant>('/assistants', {
      graph_id: `hybrid-${workflowName}`,
      name: `Hybrid ${workflowName} Assistant`,
      config: {
        configurable: {
          hybrid_mode: true,
          local_coordinator: true,
        },
        recursion_limit: 50,
        tags: ['hybrid-deployment', 'enterprise'],
      },
      metadata: {
        deployment_type: 'hybrid',
        local_modules: ['memory', 'monitoring', 'checkpoint'],
        created_by: 'hybrid-deployment-service',
      },
    });

    return {
      graph_id: `hybrid-${workflowName}`,
      assistant_id: assistant.assistant_id,
      deployment_mode: 'hybrid',
    };
  }
}
```

### Multi-Environment Deployment

**Usage**: Manage development, staging, and production environments

```typescript
@Injectable()
export class MultiEnvironmentPlatformService {
  constructor(private readonly platformClient: PlatformClientService) {}

  async deployToEnvironment(workflowDefinition: WorkflowDefinition, environment: 'development' | 'staging' | 'production'): Promise<EnvironmentDeployment> {
    const envConfig = this.getEnvironmentConfig(environment);

    // Create environment-specific assistant
    const assistant = await this.platformClient.post<Assistant>('/assistants', {
      graph_id: `${workflowDefinition.name}-${environment}`,
      name: `${workflowDefinition.name} (${environment})`,
      config: {
        configurable: {
          ...workflowDefinition.config,
          environment,
          ...envConfig.overrides,
        },
        recursion_limit: envConfig.recursionLimit,
        tags: [environment, 'automated-deployment'],
      },
      metadata: {
        environment,
        workflow_version: workflowDefinition.version,
        deployment_timestamp: new Date().toISOString(),
        auto_deployed: true,
        monitoring_enabled: environment === 'production',
      },
    });

    // Set up environment-specific monitoring
    if (environment === 'production') {
      await this.setupProductionMonitoring(assistant.assistant_id);
    }

    // Create health check webhook
    const webhook = await this.platformClient.post<Webhook>('/webhooks', {
      url: `${envConfig.baseUrl}/webhooks/health/${environment}`,
      events: ['run.start', 'run.end', 'run.error'],
      secret: envConfig.webhookSecret,
      metadata: {
        environment,
        assistant_id: assistant.assistant_id,
        purpose: 'health-monitoring',
      },
    });

    return {
      environment,
      assistant,
      webhook,
      config: envConfig,
      deployment: {
        deployedAt: new Date(),
        version: workflowDefinition.version,
        status: 'active',
      },
    };
  }

  async promoteToProduction(stagingDeployment: EnvironmentDeployment, validationChecks: ValidationCheck[]): Promise<EnvironmentDeployment> {
    // Run validation checks
    for (const check of validationChecks) {
      const result = await this.runValidationCheck(stagingDeployment.assistant.assistant_id, check);
      if (!result.passed) {
        throw new Error(`Validation failed: ${check.name} - ${result.reason}`);
      }
    }

    // Clone staging configuration for production
    const productionConfig = {
      ...stagingDeployment.assistant.config,
      configurable: {
        ...stagingDeployment.assistant.config.configurable,
        environment: 'production',
        rate_limiting: true,
        enhanced_monitoring: true,
        audit_logging: true,
      },
    };

    // Deploy to production
    const productionDeployment = await this.deployToEnvironment(
      {
        name: stagingDeployment.assistant.name.replace(' (staging)', ''),
        config: productionConfig,
        version: stagingDeployment.deployment.version,
      },
      'production'
    );

    // Set up blue-green deployment
    await this.configureBlueGreenDeployment(stagingDeployment, productionDeployment);

    return productionDeployment;
  }

  private getEnvironmentConfig(environment: string): EnvironmentConfig {
    const configs = {
      development: {
        recursionLimit: 25,
        baseUrl: 'https://dev.myapp.com',
        webhookSecret: process.env.DEV_WEBHOOK_SECRET,
        overrides: {
          debug_mode: true,
          verbose_logging: true,
          cache_disabled: true,
        },
      },
      staging: {
        recursionLimit: 40,
        baseUrl: 'https://staging.myapp.com',
        webhookSecret: process.env.STAGING_WEBHOOK_SECRET,
        overrides: {
          performance_testing: true,
          load_testing: true,
          integration_testing: true,
        },
      },
      production: {
        recursionLimit: 50,
        baseUrl: 'https://app.myapp.com',
        webhookSecret: process.env.PRODUCTION_WEBHOOK_SECRET,
        overrides: {
          high_availability: true,
          enhanced_security: true,
          audit_logging: true,
          rate_limiting: true,
        },
      },
    };

    return configs[environment];
  }
}
```

### Monitoring Integration with Platform

**Usage**: Unified monitoring across local and platform executions

```typescript
@Injectable()
export class PlatformMonitoringIntegration {
  constructor(private readonly platformClient: PlatformClientService, private readonly monitoring: MonitoringFacadeService) {}

  async initializePlatformMonitoring(): Promise<void> {
    // Monitor platform API health
    await this.monitoring.registerHealthCheck('langgraph-platform-api', async () => {
      try {
        const startTime = Date.now();
        await this.platformClient.get('/assistants?limit=1');
        const responseTime = Date.now() - startTime;

        return {
          healthy: responseTime < 5000,
          degraded: responseTime > 2000,
          responseTime,
          metadata: { api_version: 'v1', endpoint: 'assistants' },
        };
      } catch (error) {
        return {
          healthy: false,
          error: error.message,
          metadata: { error_code: error.status },
        };
      }
    });

    // Monitor platform quotas and limits
    await this.monitoring.registerHealthCheck('platform-quotas', async () => {
      const quotaStatus = await this.checkPlatformQuotas();
      return {
        healthy: quotaStatus.usage < quotaStatus.limit * 0.8,
        degraded: quotaStatus.usage > quotaStatus.limit * 0.6,
        metadata: quotaStatus,
      };
    });

    // Set up webhook monitoring
    await this.setupWebhookMonitoring();
  }

  async trackPlatformExecution(assistantId: string, threadId: string, runId: string, operationType: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Track execution start
      await this.monitoring.recordCounter('platform.executions.started', 1, {
        assistant_id: assistantId,
        operation_type: operationType,
        environment: process.env.NODE_ENV,
      });

      // Monitor execution status
      const run = await this.waitForRunCompletion(threadId, runId);
      const executionTime = Date.now() - startTime;

      // Track completion metrics
      await this.monitoring.recordTimer('platform.execution.duration', executionTime, {
        assistant_id: assistantId,
        operation_type: operationType,
        status: run.status,
        environment: process.env.NODE_ENV,
      });

      if (run.status === 'success') {
        await this.monitoring.recordCounter('platform.executions.success', 1, {
          assistant_id: assistantId,
          operation_type: operationType,
        });
      } else {
        await this.monitoring.recordCounter('platform.executions.failed', 1, {
          assistant_id: assistantId,
          operation_type: operationType,
          error_type: run.error || 'unknown',
        });
      }

      // Track resource usage if available
      if (run.usage) {
        await this.monitoring.recordGauge('platform.tokens.used', run.usage.total_tokens || 0, {
          assistant_id: assistantId,
          operation_type: operationType,
        });
      }
    } catch (error) {
      await this.monitoring.recordCounter('platform.monitoring.errors', 1, {
        assistant_id: assistantId,
        error_type: error.constructor.name,
      });
    }
  }

  private async setupWebhookMonitoring(): Promise<void> {
    // Monitor webhook delivery success rate
    await this.monitoring.createAlertRule({
      id: 'webhook-delivery-failure',
      name: 'Platform Webhook Delivery Failures',
      description: 'Alert when webhook delivery failure rate exceeds threshold',
      condition: {
        metric: 'platform.webhooks.delivery_failures',
        operator: 'gt',
        threshold: 5,
        timeWindow: 300000, // 5 minutes
        aggregation: 'sum',
        evaluationWindow: 60000,
      },
      severity: 'warning',
      channels: [{ type: 'slack', name: 'alerts', config: {}, enabled: true }],
      cooldownPeriod: 600000, // 10 minutes
      enabled: true,
      metadata: { component: 'platform-integration' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  private async waitForRunCompletion(threadId: string, runId: string): Promise<Run> {
    const maxWaitTime = 300000; // 5 minutes
    const pollInterval = 2000; // 2 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const run = await this.platformClient.get<Run>(`/threads/${threadId}/runs/${runId}`);

      if (['success', 'error', 'cancelled'].includes(run.status)) {
        return run;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Run ${runId} timed out after ${maxWaitTime}ms`);
  }
}
```

### Multi-Agent Platform Coordination

**Usage**: Coordinate local agent networks with platform assistants

```typescript
@Injectable()
export class PlatformAgentCoordination {
  constructor(private readonly platformClient: PlatformClientService, private readonly agentNetwork: MultiAgentNetwork, private readonly memory: MemoryService) {}

  async createHybridAgentNetwork(): Promise<HybridAgentNetwork> {
    // Create platform assistants for complex reasoning
    const reasoningAssistant = await this.platformClient.post<Assistant>('/assistants', {
      graph_id: 'complex-reasoning-graph',
      name: 'Hybrid Reasoning Assistant',
      config: {
        configurable: {
          model: 'gpt-4',
          temperature: 0.1,
          max_tokens: 4000,
        },
        tags: ['reasoning', 'hybrid-agent'],
      },
    });

    const analysisAssistant = await this.platformClient.post<Assistant>('/assistants', {
      graph_id: 'data-analysis-graph',
      name: 'Hybrid Analysis Assistant',
      config: {
        configurable: {
          model: 'gpt-4',
          temperature: 0.0,
          specialized_tools: ['data_analysis', 'statistical_modeling'],
        },
        tags: ['analysis', 'hybrid-agent'],
      },
    });

    // Create local coordination agent
    const coordinatorAgent = Agent.create({
      name: 'hybrid-coordinator',
      role: 'coordination',
      function: async (task: string, context: AgentContext) => {
        // Determine routing strategy
        const strategy = await this.determineRoutingStrategy(task);

        if (strategy.requiresPlatform) {
          // Route to platform assistant
          return await this.routeToPlatformAssistant(task, strategy.assistantId, context);
        } else {
          // Handle locally
          return await this.routeToLocalAgent(task, strategy.localAgentId, context);
        }
      },
    });

    // Create local specialized agents
    const dataAgent = Agent.create({
      name: 'data-specialist',
      role: 'data-processing',
      function: async (query: string, context: AgentContext) => {
        // Fast local data processing
        const processedData = await this.processDataLocally(query);

        // Store in shared memory for platform agents
        await context.memory.store(
          'hybrid-agent-shared',
          JSON.stringify({
            type: 'data-processing-result',
            agent: 'data-specialist',
            result: processedData,
            timestamp: new Date().toISOString(),
          }),
          {
            type: 'fact',
            importance: 0.8,
            tags: JSON.stringify(['agent-result', 'data-processing']),
          }
        );

        return processedData;
      },
    });

    return this.agentNetwork.createHybridNetwork({
      localAgents: [coordinatorAgent, dataAgent],
      platformAssistants: [reasoningAssistant, analysisAssistant],
      coordination: {
        strategy: 'capability-based-routing',
        sharedMemory: this.memory,
        fallbackMode: 'local-only',
      },
    });
  }

  private async routeToPlatformAssistant(task: string, assistantId: string, context: AgentContext): Promise<any> {
    // Create thread for platform execution
    const thread = await this.platformClient.post<Thread>('/threads', {
      metadata: {
        hybrid_agent_task: true,
        local_agent_context: context.agentId,
        coordination_timestamp: new Date().toISOString(),
      },
    });

    // Get relevant context from local memory
    const localContext = await context.memory.searchForContext(task, 'hybrid-agent-shared');

    // Execute on platform with local context
    const run = await this.platformClient.post<Run>(`/threads/${thread.thread_id}/runs`, {
      assistant_id: assistantId,
      input: {
        task,
        local_context: localContext.relevantMemories,
        hybrid_mode: true,
      },
      config: {
        tags: ['hybrid-execution', 'agent-coordination'],
      },
    });

    // Wait for completion
    const completedRun = await this.waitForRunCompletion(thread.thread_id, run.run_id);
    const result = await this.platformClient.get<ThreadState>(`/threads/${thread.thread_id}/state`);

    // Store platform result in local memory
    await context.memory.store(
      'hybrid-agent-shared',
      JSON.stringify({
        type: 'platform-assistant-result',
        assistant_id: assistantId,
        result: result.values,
        execution_time: completedRun.updated_at,
      }),
      {
        type: 'summary',
        importance: 0.9,
        tags: JSON.stringify(['platform-result', 'agent-coordination']),
      }
    );

    return result.values;
  }
}
```

## Core Services

### PlatformClientService - HTTP Client Foundation

**Base HTTP client** with authentication and error handling:

```typescript
// Core HTTP operations with automatic authentication
get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T>
post<T>(endpoint: string, data?: unknown): Promise<T>
put<T>(endpoint: string, data?: unknown): Promise<T>
patch<T>(endpoint: string, data?: unknown): Promise<T>
delete<T>(endpoint: string): Promise<T>

// Built-in retry logic and error handling
// Automatic API key injection and timeout management
// Comprehensive logging and monitoring
```

### WebhookService - Real-Time Event Processing

**Webhook management** for platform event notifications:

```typescript
// Webhook lifecycle management
create(config: WebhookCreateRequest): Promise<Webhook>
update(webhookId: string, config: WebhookUpdateRequest): Promise<Webhook>
delete(webhookId: string): Promise<void>
list(limit?: number, offset?: number): Promise<Webhook[]>

// Security and payload verification
verifySignature(payload: string, signature: string, secret: string): boolean
processSecureWebhook(payload: WebhookPayload, signature: string): Promise<void>
```

### Complete Usage Example

```typescript
import { Injectable } from '@nestjs/common';
import { PlatformClientService, WebhookService } from '@hive-academy/langgraph-platform';

interface AssistantConfig {
  graphId: string;
  name: string;
  variables: Record<string, any>;
  maxSteps: number;
  tags: string[];
}

@Injectable()
export class EnterpriseAssistantService {
  constructor(private readonly platformClient: PlatformClientService, private readonly webhookService: WebhookService) {}

  async createProductionAssistant(config: AssistantConfig): Promise<Assistant> {
    // Create assistant on LangGraph Platform
    const assistant = await this.platformClient.post<Assistant>('/assistants', {
      graph_id: config.graphId,
      name: config.name,
      config: {
        configurable: config.variables,
        recursion_limit: config.maxSteps,
        tags: ['production', ...config.tags],
      },
      metadata: {
        created_by: 'enterprise-service',
        environment: 'production',
        deployed_at: new Date().toISOString(),
      },
    });

    // Set up production monitoring webhooks
    await this.webhookService.create({
      url: 'https://myapp.com/webhooks/langgraph/production',
      events: ['run.start', 'run.end', 'run.error', 'run.interrupt'],
      secret: process.env.PRODUCTION_WEBHOOK_SECRET,
      metadata: {
        assistant_id: assistant.assistant_id,
        environment: 'production',
      },
    });

    return assistant;
  }

  async executeConversationalWorkflow(assistantId: string, userId: string, message: string): Promise<ConversationResult> {
    // Create or get existing thread for user
    let thread: Thread;
    const threadId = `user-${userId}`;

    try {
      thread = await this.platformClient.get<Thread>(`/threads/${threadId}`);
    } catch (error) {
      // Create new thread if not exists
      thread = await this.platformClient.post<Thread>('/threads', {
        thread_id: threadId,
        metadata: {
          user_id: userId,
          conversation_type: 'support',
          created_at: new Date().toISOString(),
        },
      });
    }

    // Execute assistant run with streaming
    const run = await this.platformClient.post<Run>(`/threads/${thread.thread_id}/runs`, {
      assistant_id: assistantId,
      input: { message },
      config: {
        tags: ['user-message', 'production'],
        metadata: {
          user_id: userId,
          timestamp: new Date().toISOString(),
        },
      },
      stream_mode: 'values', // Enable streaming
      webhook: 'https://myapp.com/webhooks/run-updates',
    });

    // Wait for completion with timeout
    const completedRun = await this.waitForRunCompletion(
      thread.thread_id,
      run.run_id,
      300000 // 5 minutes timeout
    );

    // Get final thread state
    const finalState = await this.platformClient.get<ThreadState>(`/threads/${thread.thread_id}/state`);

    return {
      runId: completedRun.run_id,
      threadId: thread.thread_id,
      response: finalState.values.messages?.[finalState.values.messages.length - 1],
      status: completedRun.status,
      executionTime: new Date(completedRun.updated_at).getTime() - new Date(completedRun.created_at).getTime(),
    };
  }

  private async waitForRunCompletion(threadId: string, runId: string, timeoutMs: number = 300000): Promise<Run> {
    const startTime = Date.now();
    const pollInterval = 1000; // 1 second

    while (Date.now() - startTime < timeoutMs) {
      const run = await this.platformClient.get<Run>(`/threads/${threadId}/runs/${runId}`);

      if (run.status === 'success' || run.status === 'error' || run.status === 'cancelled') {
        return run;
      }

      if (run.status === 'interrupted') {
        // Handle human-in-the-loop scenarios
        await this.handleRunInterrupt(threadId, runId, run);
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Run ${runId} timed out after ${timeoutMs}ms`);
  }

  private async handleRunInterrupt(threadId: string, runId: string, run: Run): Promise<void> {
    // Handle interrupt based on the interruption reason
    const interruptData = run.kwargs?.interrupt;

    if (interruptData?.type === 'human_approval') {
      // Log interrupt for human review
      console.log(`Run ${runId} requires human approval:`, interruptData);

      // Could trigger notification system, queue for review, etc.
      await this.notifyHumanReviewNeeded(threadId, runId, interruptData);
    }
  }

  private async notifyHumanReviewNeeded(threadId: string, runId: string, data: any): Promise<void> {
    // Implementation for human review notification
    console.log(`Human review needed for run ${runId}:`, data);
  }
}
```

## Configuration

### Basic Configuration

```typescript
PlatformModule.forRoot({
  baseUrl: 'https://api.langgraph.com',
  apiKey: process.env.LANGGRAPH_API_KEY,
  timeout: 30000,
  retryPolicy: {
    maxRetries: 3,
    backoffFactor: 2,
    maxBackoffTime: 30000,
  },
});
```

### Advanced Production Configuration

```typescript
PlatformModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    baseUrl: configService.get('LANGGRAPH_PLATFORM_URL'),
    apiKey: configService.get('LANGGRAPH_API_KEY'),
    timeout: configService.get('PLATFORM_TIMEOUT', 60000),
    retryPolicy: {
      maxRetries: configService.get('PLATFORM_MAX_RETRIES', 3),
      backoffFactor: configService.get('PLATFORM_BACKOFF_FACTOR', 2),
      maxBackoffTime: configService.get('PLATFORM_MAX_BACKOFF', 30000),
    },
    webhook: {
      enabled: configService.get('WEBHOOKS_ENABLED', true),
      secret: configService.get('WEBHOOK_SECRET'),
      retryPolicy: {
        maxRetries: 3,
        backoffFactor: 2,
        maxBackoffTime: 30000,
      },
    },
    rateLimit: {
      enabled: configService.get('RATE_LIMITING_ENABLED', true),
      maxRequestsPerMinute: configService.get('RATE_LIMIT_RPM', 100),
      burstLimit: configService.get('RATE_LIMIT_BURST', 10),
    },
    monitoring: {
      enabled: configService.get('MONITORING_ENABLED', true),
      metricsPrefix: 'langgraph_platform',
      logRequests: configService.get('LOG_REQUESTS', false),
      logResponses: configService.get('LOG_RESPONSES', false),
    },
  }),
  inject: [ConfigService],
});
```

## Advanced Features

### Webhook Security & Processing

```typescript
import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { WebhookService } from '@hive-academy/langgraph-platform';

@Controller('webhooks')
export class LangGraphWebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('langgraph')
  async handleLangGraphWebhook(@Body() payload: WebhookPayload, @Headers('x-langgraph-signature') signature: string): Promise<void> {
    // Verify webhook signature for security
    const secret = process.env.WEBHOOK_SECRET;
    const isValid = this.webhookService.verifySignature(JSON.stringify(payload), signature, secret);

    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Process different webhook events
    switch (payload.event) {
      case 'run.start':
        await this.handleRunStart(payload.data);
        break;

      case 'run.end':
        await this.handleRunComplete(payload.data);
        break;

      case 'run.error':
        await this.handleRunError(payload.data);
        break;

      case 'run.interrupt':
        await this.handleRunInterrupt(payload.data);
        break;

      default:
        console.warn(`Unhandled webhook event: ${payload.event}`);
    }
  }

  private async handleRunStart(data: RunStartData): Promise<void> {
    console.log(`Run started: ${data.run_id} in thread ${data.thread_id}`);

    // Track run metrics
    await this.trackRunMetric('run_started', {
      runId: data.run_id,
      threadId: data.thread_id,
      assistantId: data.assistant_id,
      timestamp: new Date(),
    });
  }

  private async handleRunComplete(data: RunCompleteData): Promise<void> {
    console.log(`Run completed: ${data.run_id} with status ${data.status}`);

    // Calculate execution time and log metrics
    const executionTime = new Date(data.updated_at).getTime() - new Date(data.created_at).getTime();

    await this.trackRunMetric('run_completed', {
      runId: data.run_id,
      status: data.status,
      executionTime,
      tokensUsed: data.usage?.total_tokens || 0,
    });
  }

  private async handleRunError(data: RunErrorData): Promise<void> {
    console.error(`Run failed: ${data.run_id} - ${data.error}`);

    // Alert on critical errors
    if (data.error_type === 'system_error') {
      await this.alertCriticalError(data);
    }
  }

  private async handleRunInterrupt(data: RunInterruptData): Promise<void> {
    console.log(`Run interrupted: ${data.run_id} - ${data.interrupt_reason}`);

    // Queue for human review if needed
    if (data.interrupt_reason === 'human_approval_required') {
      await this.queueHumanReview(data);
    }
  }

  private async trackRunMetric(event: string, data: any): Promise<void> {
    // Implementation for metrics tracking
    console.log(`Metric: ${event}`, data);
  }

  private async alertCriticalError(data: RunErrorData): Promise<void> {
    // Implementation for critical error alerting
    console.error('CRITICAL ERROR:', data);
  }

  private async queueHumanReview(data: RunInterruptData): Promise<void> {
    // Implementation for human review queueing
    console.log('Queued for human review:', data);
  }
}
```

### Thread State Management

```typescript
@Injectable()
export class ThreadManagementService {
  constructor(private readonly platformClient: PlatformClientService) {}

  async createConversationThread(userId: string, metadata: Record<string, any> = {}): Promise<Thread> {
    const thread = await this.platformClient.post<Thread>('/threads', {
      metadata: {
        user_id: userId,
        created_by: 'conversation-service',
        created_at: new Date().toISOString(),
        ...metadata,
      },
    });

    return thread;
  }

  async getThreadState(threadId: string): Promise<ThreadState> {
    return this.platformClient.get<ThreadState>(`/threads/${threadId}/state`);
  }

  async updateThreadState(threadId: string, values: Record<string, any>, asNode?: string): Promise<ThreadState> {
    const updatePayload: any = { values };

    if (asNode) {
      updatePayload.as_node = asNode;
    }

    return this.platformClient.patch<ThreadState>(`/threads/${threadId}/state`, updatePayload);
  }

  async getThreadHistory(threadId: string, limit: number = 10, before?: string, metadata?: Record<string, any>): Promise<ThreadHistoryResponse> {
    const params: any = { limit };

    if (before) params.before = before;
    if (metadata) params.metadata = JSON.stringify(metadata);

    return this.platformClient.get<ThreadHistoryResponse>(`/threads/${threadId}/history`, params);
  }

  async searchThreads(criteria: ThreadSearchCriteria): Promise<ThreadSearchResponse> {
    const params = {
      limit: criteria.limit || 50,
      offset: criteria.offset || 0,
    };

    if (criteria.metadata) {
      params.metadata = JSON.stringify(criteria.metadata);
    }

    if (criteria.status) {
      params.status = criteria.status;
    }

    return this.platformClient.get<ThreadSearchResponse>('/threads', params);
  }

  async archiveThread(threadId: string): Promise<void> {
    await this.platformClient.patch(`/threads/${threadId}`, {
      metadata: { archived: true, archived_at: new Date().toISOString() },
    });
  }
}
```

### Enterprise Rate Limiting

```typescript
@Injectable()
export class RateLimitedPlatformService {
  private readonly requestCounts = new Map<string, { count: number; resetTime: number }>();
  private readonly WINDOW_SIZE = 60000; // 1 minute
  private readonly MAX_REQUESTS = 100; // per window

  constructor(private readonly platformClient: PlatformClientService) {}

  async executeWithRateLimit<T>(operation: () => Promise<T>, key: string = 'default'): Promise<T> {
    await this.checkRateLimit(key);

    try {
      const result = await operation();
      this.incrementCounter(key);
      return result;
    } catch (error) {
      this.incrementCounter(key); // Count failed requests too
      throw error;
    }
  }

  private async checkRateLimit(key: string): Promise<void> {
    const now = Date.now();
    const record = this.requestCounts.get(key);

    if (!record || now >= record.resetTime) {
      // Reset or initialize counter
      this.requestCounts.set(key, {
        count: 0,
        resetTime: now + this.WINDOW_SIZE,
      });
      return;
    }

    if (record.count >= this.MAX_REQUESTS) {
      const waitTime = record.resetTime - now;
      throw new Error(`Rate limit exceeded. Retry after ${waitTime}ms`);
    }
  }

  private incrementCounter(key: string): void {
    const record = this.requestCounts.get(key);
    if (record) {
      record.count++;
    }
  }

  async createAssistantWithRateLimit(config: AssistantConfig): Promise<Assistant> {
    return this.executeWithRateLimit(() => this.platformClient.post<Assistant>('/assistants', config), 'assistant_creation');
  }

  async executeRunWithRateLimit(threadId: string, runConfig: RunConfig): Promise<Run> {
    return this.executeWithRateLimit(() => this.platformClient.post<Run>(`/threads/${threadId}/runs`, runConfig), `run_execution_${threadId}`);
  }
}
```

## Core Interfaces

### Platform Types

```typescript
interface Assistant {
  assistant_id: string;
  graph_id: string;
  name: string;
  description?: string;
  config: AssistantConfig;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface Thread {
  thread_id: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

interface Run {
  run_id: string;
  thread_id: string;
  assistant_id: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled' | 'interrupted';
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  created_at: string;
  updated_at: string;
  kwargs?: Record<string, any>;
}

interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  webhook_id: string;
}
```

### Configuration Types

```typescript
interface PlatformModuleOptions {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  webhook?: WebhookConfig;
  rateLimit?: RateLimitConfig;
  monitoring?: MonitoringConfig;
}

interface RetryPolicy {
  maxRetries: number;
  backoffFactor: number;
  maxBackoffTime: number;
}
```

## Error Handling

```typescript
import { PlatformError, WebhookError, RateLimitError } from '@hive-academy/langgraph-platform';

@Injectable()
export class RobustPlatformService {
  constructor(private readonly platformClient: PlatformClientService) {}

  async safeExecute<T>(operation: () => Promise<T>): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof RateLimitError) {
        this.logger.warn('Rate limit exceeded, implementing backoff');
        await this.exponentialBackoff();
        return this.safeExecute(operation);
      } else if (error instanceof PlatformError) {
        this.logger.error('Platform API error:', error.message);
        throw new ServiceUnavailableException('LangGraph Platform temporarily unavailable');
      } else if (error instanceof WebhookError) {
        this.logger.error('Webhook processing error:', error.message);
        // Continue execution, don't fail the main operation
        return null;
      }
      throw error;
    }
  }

  private async exponentialBackoff(): Promise<void> {
    const backoffTime = Math.min(1000 * Math.pow(2, Math.random()), 30000);
    await new Promise((resolve) => setTimeout(resolve, backoffTime));
  }
}
```

## Testing

### Unit Testing

```typescript
import { Test } from '@nestjs/testing';
import { PlatformModule, PlatformClientService } from '@hive-academy/langgraph-platform';

describe('PlatformClientService', () => {
  let service: PlatformClientService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        PlatformModule.forRoot({
          baseUrl: 'https://test-api.langgraph.com',
          apiKey: 'test-api-key',
          timeout: 10000,
        }),
      ],
    }).compile();

    service = module.get<PlatformClientService>(PlatformClientService);
  });

  it('should create assistant successfully', async () => {
    const assistantConfig = {
      graph_id: 'test-graph',
      name: 'Test Assistant',
      config: { recursion_limit: 50 },
      metadata: { test: true },
    };

    // Mock successful API response
    jest.spyOn(service, 'post').mockResolvedValue({
      assistant_id: 'test-assistant-id',
      ...assistantConfig,
    });

    const result = await service.post('/assistants', assistantConfig);

    expect(result.assistant_id).toBe('test-assistant-id');
    expect(result.name).toBe('Test Assistant');
  });
});
```

## Troubleshooting

### Common Issues

#### 1. API Authentication Failures

```typescript
// Solution: Validate API key and permissions
const validateApiKey = async () => {
  try {
    await platformClient.get('/assistants?limit=1');
    console.log('API key is valid');
  } catch (error) {
    if (error.status === 401) {
      throw new Error('Invalid API key - check LANGGRAPH_API_KEY environment variable');
    }
    if (error.status === 403) {
      throw new Error('API key lacks required permissions');
    }
    throw error;
  }
};
```

#### 2. Webhook Delivery Failures

```typescript
// Solution: Implement retry logic and validation
@Injectable()
export class ReliableWebhookService {
  async handleWebhookWithRetry(payload: any, maxRetries = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.processWebhook(payload);
        return; // Success
      } catch (error) {
        console.warn(`Webhook processing attempt ${attempt} failed:`, error.message);

        if (attempt === maxRetries) {
          throw error; // Final attempt failed
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}
```

#### 3. Thread State Synchronization Issues

```typescript
// Solution: Implement state validation and recovery
async validateThreadState(threadId: string, expectedState: any): Promise<void> {
  const currentState = await this.getThreadState(threadId);

  if (!this.statesMatch(currentState.values, expectedState)) {
    console.warn(`Thread ${threadId} state mismatch, attempting recovery`);

    // Attempt to recover by updating state
    await this.updateThreadState(threadId, expectedState);

    // Verify recovery
    const recoveredState = await this.getThreadState(threadId);
    if (!this.statesMatch(recoveredState.values, expectedState)) {
      throw new Error(`Failed to recover thread ${threadId} state`);
    }
  }
}
```

This comprehensive platform module provides production-ready integration with LangGraph Platform, enabling hosted assistant management, robust execution monitoring, and secure webhook processing for enterprise AI applications.
