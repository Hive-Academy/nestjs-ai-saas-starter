# Platform Module - User Manual

## Overview

The **@hive-academy/langgraph-platform** module provides enterprise-grade integration with the LangGraph Platform API, enabling hosted assistant management, thread lifecycle operations, run execution monitoring, and real-time webhook notifications for production AI applications.

**Key Features:**

- **Hosted Assistant Management** - Create, configure, and manage AI assistants on LangGraph Platform
- **Thread Lifecycle Management** - Persistent conversation threads with state and history
- **Run Execution & Monitoring** - Execute assistant runs with streaming and status tracking
- **Webhook Integration** - Real-time event notifications and secure payload handling
- **Enterprise HTTP Client** - Robust client with authentication, retries, and error handling
- **Production-Ready Configuration** - Rate limiting, timeout management, and security features

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
