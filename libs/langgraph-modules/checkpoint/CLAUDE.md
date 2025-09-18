# Checkpoint Module - User Manual

## Overview

The **@hive-academy/langgraph-checkpoint** module provides sophisticated state persistence and recovery for LangGraph workflows, enabling durable execution, time travel debugging, branch management, and enterprise-grade monitoring across multiple storage backends.

**Key Features:**

- **Multi-Backend Storage** - Memory, Redis, PostgreSQL, SQLite support
- **Time Travel & Debugging** - Navigate execution history and create branches
- **Enterprise Monitoring** - Comprehensive metrics, health checks, performance insights
- **Automated Cleanup** - Intelligent data lifecycle management with retention policies
- **Dual Integration** - Custom enterprise savers + official LangGraph compatibility
- **SOLID Architecture** - Clean separation with dependency injection

## Quick Start

### Installation & Setup

```bash
npm install @hive-academy/langgraph-checkpoint
```

```typescript
import { Module } from '@nestjs/common';
import { LanggraphModulesCheckpointModule } from '@hive-academy/langgraph-checkpoint';

@Module({
  imports: [
    LanggraphModulesCheckpointModule.forRoot({
      checkpoint: {
        savers: [
          {
            type: 'redis',
            name: 'primary',
            default: true,
            redis: {
              url: 'redis://localhost:6379',
              keyPrefix: 'checkpoints:',
              ttl: 86400,
            },
          },
        ],
        cleanupInterval: 3600000, // 1 hour
        maxAge: 2592000000, // 30 days
        maxPerThread: 100,
      },
    }),
  ],
})
export class AppModule {}
```

## Core Services

### CheckpointManagerService - Facade Interface

**Primary service** orchestrating all checkpoint operations:

```typescript
// Core checkpoint operations
saveCheckpoint(threadId: string, checkpoint: EnhancedCheckpoint, metadata?: EnhancedCheckpointMetadata): Promise<void>
loadCheckpoint(threadId: string, checkpointId?: string): Promise<EnhancedCheckpoint | null>
listCheckpoints(threadId: string, options?: CheckpointListOptions): Promise<CheckpointTuple[]>

// Registry management
getAvailableSavers(): string[]
getDefaultSaverName(): string | undefined
getSaverType(saverName: string): string | undefined

// Monitoring and metrics
getCheckpointStats(): Promise<CheckpointSystemStats>
getMetrics(): CheckpointMetrics
getPerformanceInsights(): PerformanceInsights

// Cleanup operations
cleanupCheckpoints(options?: CheckpointCleanupOptions): Promise<number>
```

### Complete Usage Example

```typescript
import { Injectable } from '@nestjs/common';
import { CheckpointManagerService, EnhancedCheckpoint, EnhancedCheckpointMetadata } from '@hive-academy/langgraph-checkpoint';

@Injectable()
export class WorkflowExecutionService {
  constructor(private readonly checkpointManager: CheckpointManagerService) {}

  async executeWorkflowWithCheckpoints(workflowId: string, initialState: any): Promise<any> {
    const threadId = `workflow-${workflowId}`;

    try {
      // Save initial checkpoint
      await this.checkpointManager.saveCheckpoint(
        threadId,
        {
          id: `${threadId}-start`,
          channel_values: initialState,
          v: 1,
          ts: new Date().toISOString(),
        },
        {
          threadId,
          workflowName: 'order-processing',
          stepName: 'initialize',
          nodeType: 'start',
          executionDuration: 0,
        }
      );

      // Execute workflow steps with checkpoints
      let currentState = initialState;
      const steps = ['validate', 'process', 'complete'];

      for (const [index, step] of steps.entries()) {
        const startTime = Date.now();

        // Execute step
        currentState = await this.executeStep(step, currentState);

        const executionDuration = Date.now() - startTime;

        // Save checkpoint after each step
        await this.checkpointManager.saveCheckpoint(
          threadId,
          {
            id: `${threadId}-${step}`,
            channel_values: currentState,
            v: index + 2,
            ts: new Date().toISOString(),
          },
          {
            threadId,
            workflowName: 'order-processing',
            stepName: step,
            nodeType: 'task',
            executionDuration,
          }
        );
      }

      return currentState;
    } catch (error) {
      // Save error checkpoint for debugging
      await this.checkpointManager.saveCheckpoint(
        threadId,
        {
          id: `${threadId}-error`,
          channel_values: { error: error.message, lastValidState: currentState },
          v: -1,
          ts: new Date().toISOString(),
        },
        {
          threadId,
          workflowName: 'order-processing',
          stepName: 'error',
          nodeType: 'error',
          error: error.message,
        }
      );

      throw error;
    }
  }

  async resumeWorkflow(threadId: string, fromCheckpoint?: string): Promise<any> {
    // Load checkpoint state
    const checkpoint = await this.checkpointManager.loadCheckpoint(threadId, fromCheckpoint);

    if (!checkpoint) {
      throw new Error(`No checkpoint found for thread ${threadId}`);
    }

    // Resume workflow from checkpoint state
    return this.continueWorkflowExecution(checkpoint.channel_values);
  }
}
```

## Configuration

### Basic Configuration

```typescript
LanggraphModulesCheckpointModule.forRoot({
  checkpoint: {
    savers: [
      {
        type: 'redis',
        name: 'primary',
        default: true,
        redis: {
          url: 'redis://localhost:6379',
          keyPrefix: 'checkpoints:',
          ttl: 86400,
          compression: 'gzip',
        },
      },
      {
        type: 'postgres',
        name: 'backup',
        postgres: {
          connectionString: 'postgresql://user:pass@localhost:5432/db',
          tableName: 'workflow_checkpoints',
          schema: 'langgraph',
        },
      },
    ],
    cleanupInterval: 3600000, // 1 hour
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxPerThread: 100,
    health: {
      checkInterval: 30000,
      degradedThreshold: 1000,
      unhealthyThreshold: 5000,
    },
  },
});
```

### Async Configuration

```typescript
LanggraphModulesCheckpointModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    checkpoint: {
      savers: [
        {
          type: 'redis',
          name: 'primary',
          default: true,
          redis: {
            url: configService.get('REDIS_URL'),
            keyPrefix: configService.get('CHECKPOINT_PREFIX', 'checkpoints:'),
            ttl: configService.get('CHECKPOINT_TTL', 86400),
          },
        },
      ],
      cleanupInterval: configService.get('CLEANUP_INTERVAL', 3600000),
      maxAge: configService.get('MAX_CHECKPOINT_AGE', 30 * 24 * 60 * 60 * 1000),
    },
  }),
  inject: [ConfigService],
});
```

## Storage Backend Options

### Redis Backend - High Performance

```typescript
{
  type: 'redis',
  redis: {
    url: 'redis://redis:6379',
    keyPrefix: 'checkpoints:',
    ttl: 86400,           // 24 hours
    compression: 'gzip',  // Reduce memory usage
    maxRetries: 3,
    cluster: { enableReadyCheck: true }
  }
}
```

**Best for**: High-throughput workloads, distributed systems, sub-millisecond performance

### PostgreSQL Backend - ACID Compliance

```typescript
{
  type: 'postgres',
  postgres: {
    connectionString: 'postgresql://user:pass@localhost:5432/db',
    tableName: 'workflow_checkpoints',
    schema: 'langgraph',
    poolSize: 10,
    compression: 'gzip',
    partitioning: {
      strategy: 'time',
      interval: 'month'
    }
  }
}
```

**Best for**: ACID transactions, complex queries, audit trails, strong consistency

### SQLite Backend - Single Node

```typescript
{
  type: 'sqlite',
  sqlite: {
    databasePath: './data/checkpoints.db',
    busyTimeout: 5000,
    journalMode: 'WAL',
    synchronous: 'NORMAL'
  }
}
```

**Best for**: Single-node deployments, embedded systems, development

### Memory Backend - Development

```typescript
{
  type: 'memory',
  memory: {
    maxCheckpoints: 1000,
    ttl: 3600000,           // 1 hour TTL
    cleanupInterval: 300000  // 5 min cleanup
  }
}
```

**Best for**: Development, testing, ephemeral workflows

## Advanced Features

### Time Travel & Branch Management

```typescript
@Injectable()
export class WorkflowTimeTravel {
  constructor(private checkpointManager: CheckpointManagerService) {}

  async createBranch(originalThreadId: string, checkpointId: string, branchName: string): Promise<string> {
    const branchThreadId = `${originalThreadId}-branch-${branchName}`;

    // Load checkpoint from original thread
    const checkpoint = await this.checkpointManager.loadCheckpoint(originalThreadId, checkpointId);

    if (!checkpoint) {
      throw new Error('Checkpoint not found');
    }

    // Create new branch with modified metadata
    await this.checkpointManager.saveCheckpoint(
      branchThreadId,
      {
        ...checkpoint,
        id: `${branchThreadId}-branch-start`,
      },
      {
        threadId: branchThreadId,
        branchName,
        parentThreadId: originalThreadId,
        parentCheckpointId: checkpointId,
        branchCreatedAt: new Date().toISOString(),
        branchDescription: `Branch created from ${checkpointId}`,
      }
    );

    return branchThreadId;
  }

  async getExecutionHistory(threadId: string): Promise<CheckpointHistory[]> {
    const checkpoints = await this.checkpointManager.listCheckpoints(threadId, {
      sortOrder: 'asc',
      sortBy: 'timestamp',
    });

    return checkpoints.map(([config, checkpoint, metadata]) => ({
      checkpointId: checkpoint.id,
      timestamp: metadata.timestamp,
      stepName: metadata.stepName,
      nodeType: metadata.nodeType,
      executionDuration: metadata.executionDuration,
      hasError: !!metadata.error,
    }));
  }

  async rollbackToCheckpoint(threadId: string, checkpointId: string): Promise<void> {
    const checkpoint = await this.checkpointManager.loadCheckpoint(threadId, checkpointId);

    if (!checkpoint) {
      throw new Error('Checkpoint not found for rollback');
    }

    // Create rollback checkpoint
    await this.checkpointManager.saveCheckpoint(
      threadId,
      {
        ...checkpoint,
        id: `${threadId}-rollback-${Date.now()}`,
        ts: new Date().toISOString(),
      },
      {
        threadId,
        stepName: 'rollback',
        nodeType: 'system',
        rollbackFromCheckpoint: checkpointId,
        rollbackTimestamp: new Date().toISOString(),
      }
    );
  }
}
```

### Performance Monitoring

```typescript
@Injectable()
export class CheckpointMonitoring {
  constructor(private checkpointManager: CheckpointManagerService) {}

  async getSystemHealth(): Promise<HealthReport> {
    const stats = await this.checkpointManager.getCheckpointStats();
    const metrics = this.checkpointManager.getMetrics();
    const insights = this.checkpointManager.getPerformanceInsights();

    return {
      overall: {
        healthySavers: stats.overall.healthySavers,
        unhealthySavers: stats.overall.unhealthySavers,
        status: stats.overall.healthySavers > 0 ? 'healthy' : 'unhealthy',
      },
      performance: {
        averageSaveTime: metrics.averageSaveTime,
        averageLoadTime: metrics.averageLoadTime,
        errorRate: metrics.errorRate,
        throughput: metrics.operationsPerSecond,
      },
      recommendations: [...stats.recommendations, ...insights.recommendations],
    };
  }

  async optimizePerformance(): Promise<OptimizationReport> {
    const insights = this.checkpointManager.getPerformanceInsights();

    const actions: OptimizationAction[] = [];

    // Identify slow savers
    for (const saver of insights.slowestSavers) {
      if (saver.averageTime > 1000) {
        actions.push({
          type: 'configure',
          target: saver.name,
          action: 'increase_timeout',
          reason: `Saver ${saver.name} averaging ${saver.averageTime}ms`,
        });
      }
    }

    // Identify error-prone savers
    for (const saver of insights.errorProneSavers) {
      if (saver.errorRate > 0.05) {
        actions.push({
          type: 'investigate',
          target: saver.name,
          action: 'check_connection',
          reason: `Saver ${saver.name} has ${(saver.errorRate * 100).toFixed(2)}% error rate`,
        });
      }
    }

    return { actions, insights };
  }
}
```

### Multi-Backend High Availability

```typescript
@Injectable()
export class HighAvailabilityCheckpoints {
  constructor(private checkpointManager: CheckpointManagerService) {}

  async saveWithFailover(threadId: string, checkpoint: EnhancedCheckpoint, metadata?: EnhancedCheckpointMetadata): Promise<void> {
    const availableSavers = this.checkpointManager.getAvailableSavers();

    let lastError: Error | null = null;
    let successfulSaves = 0;

    for (const saverName of availableSavers) {
      try {
        await this.checkpointManager.saveCheckpoint(threadId, checkpoint, metadata);
        successfulSaves++;

        // If we have at least one successful save, consider it a success
        if (successfulSaves >= 1) {
          return;
        }
      } catch (error) {
        lastError = error;
        console.warn(`Checkpoint save failed on ${saverName}:`, error.message);
      }
    }

    if (successfulSaves === 0) {
      throw new Error(`All checkpoint savers failed. Last error: ${lastError?.message}`);
    }
  }

  async loadWithFallback(threadId: string, checkpointId?: string): Promise<EnhancedCheckpoint | null> {
    const availableSavers = this.checkpointManager.getAvailableSavers();

    for (const saverName of availableSavers) {
      try {
        const checkpoint = await this.checkpointManager.loadCheckpoint(threadId, checkpointId);
        if (checkpoint) {
          return checkpoint;
        }
      } catch (error) {
        console.warn(`Checkpoint load failed on ${saverName}:`, error.message);
      }
    }

    return null;
  }
}
```

## Core Interfaces

### Checkpoint Structure

```typescript
interface EnhancedCheckpoint<T = Record<string, unknown>> {
  id: string;
  channel_values: T; // Workflow state data
  pending_sends?: unknown[];
  v?: number; // Version
  ts?: string; // Timestamp
  metadata?: EnhancedCheckpointMetadata;
  size?: number; // Storage size
  compression?: 'none' | 'gzip' | 'lz4';
  checksum?: string; // Integrity verification
}

interface EnhancedCheckpointMetadata {
  threadId?: string;
  timestamp?: string;
  version?: string;
  workflowName?: string;
  stepName?: string;
  nodeType?: 'task' | 'decision' | 'human-approval' | 'start' | 'end' | 'error';
  executionDuration?: number;
  error?: string;

  // Branch management
  branchName?: string;
  parentThreadId?: string;
  parentCheckpointId?: string;
  branchCreatedAt?: string;
  branchDescription?: string;

  [key: string]: unknown;
}
```

### Configuration Types

```typescript
interface CheckpointSaverConfig {
  type: 'memory' | 'redis' | 'postgres' | 'sqlite';
  name: string;
  default?: boolean;
  redis?: RedisConfig;
  postgres?: PostgresConfig;
  sqlite?: SqliteConfig;
  memory?: MemoryConfig;
}

interface CheckpointModuleConfig {
  savers: CheckpointSaverConfig[];
  cleanupInterval?: number;
  maxAge?: number;
  maxPerThread?: number;
  health?: HealthConfig;
}
```

## Error Handling

```typescript
import { CheckpointStorageError, CheckpointRetrievalError, CheckpointConfigurationError } from '@hive-academy/langgraph-checkpoint';

@Injectable()
export class RobustCheckpointService {
  constructor(private checkpointManager: CheckpointManagerService) {}

  async safeCheckpointOperation<T>(operation: () => Promise<T>): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof CheckpointStorageError) {
        this.logger.error('Checkpoint storage failed', error.message);
        // Continue workflow without checkpointing
        return null;
      } else if (error instanceof CheckpointRetrievalError) {
        this.logger.warn('Checkpoint retrieval failed', error.message);
        // Start workflow from beginning
        return null;
      } else if (error instanceof CheckpointConfigurationError) {
        this.logger.error('Checkpoint configuration invalid', error.message);
        throw new BadRequestException('Checkpoint system misconfigured');
      }
      throw error;
    }
  }
}
```

## Testing

### Unit Testing

```typescript
import { Test } from '@nestjs/testing';
import { LanggraphModulesCheckpointModule, CheckpointManagerService } from '@hive-academy/langgraph-checkpoint';

describe('CheckpointManagerService', () => {
  let service: CheckpointManagerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        LanggraphModulesCheckpointModule.forRoot({
          checkpoint: {
            savers: [{ type: 'memory', name: 'test', default: true }],
          },
        }),
      ],
    }).compile();

    service = module.get<CheckpointManagerService>(CheckpointManagerService);
  });

  it('should save and load checkpoints', async () => {
    const threadId = 'test-thread';
    const checkpoint = {
      id: 'test-checkpoint',
      channel_values: { step: 1, data: 'test' },
      v: 1,
    };

    await service.saveCheckpoint(threadId, checkpoint);
    const loaded = await service.loadCheckpoint(threadId);

    expect(loaded).toBeTruthy();
    expect(loaded?.channel_values).toEqual(checkpoint.channel_values);
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Storage Backend Connection Failures

```typescript
// Solution: Configure multiple backends for redundancy
{
  savers: [
    { type: 'redis', name: 'primary', default: true },
    { type: 'postgres', name: 'backup' },
    { type: 'memory', name: 'fallback' },
  ];
}
```

#### 2. Performance Degradation

```typescript
// Solution: Optimize storage configuration
{
  redis: {
    compression: 'gzip',      // Reduce memory usage
    ttl: 3600,               // Automatic cleanup
    maxRetries: 3            // Handle temporary failures
  }
}
```

#### 3. Storage Space Growth

```typescript
// Solution: Implement aggressive cleanup
async performMaintenance(): Promise<void> {
  await this.checkpointManager.cleanupCheckpoints({
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxPerThread: 50,
    preserveLatest: true
  });
}
```

This comprehensive checkpoint module provides production-ready state persistence with enterprise-grade monitoring, multi-backend support, and sophisticated debugging capabilities for reliable LangGraph workflow execution.
