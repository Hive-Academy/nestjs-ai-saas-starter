# CLAUDE.md - Checkpoint Module

This file provides comprehensive guidance for working with the Checkpoint Module in the LangGraph system. The checkpoint module provides sophisticated state persistence and recovery capabilities for workflow executions.

## Business Domain: State Persistence & Recovery

### Core Purpose
The checkpoint module enables **durable workflow execution** by persisting workflow state at critical points, allowing for:

- **Workflow Continuity**: Resume execution after failures or interruptions
- **Time Travel**: Navigate to previous states for debugging or alternative paths
- **State Recovery**: Restore workflows to known good states
- **Branch Management**: Create and manage execution branches for experimentation
- **Audit Trail**: Complete history of workflow state changes

### Key Business Value
- **Resilience**: Zero data loss during workflow interruptions
- **Debugging**: Full state inspection and replay capabilities
- **Scalability**: Distributed execution with persistent state
- **Compliance**: Complete audit trail of workflow decisions
- **Efficiency**: Resume from checkpoints instead of full re-execution

## Architecture Overview

### High-Level Design
The checkpoint module follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────┐
│     CheckpointManagerService        │  ← Facade Layer
├─────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────────┐│
│  │ Persistence │ │    Registry     ││  ← Core Services
│  │   Service   │ │    Service      ││
│  └─────────────┘ └─────────────────┘│
├─────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐│
│  │ Metrics │ │ Cleanup │ │ Health  ││  ← Supporting Services
│  │ Service │ │ Service │ │ Service ││
│  └─────────┘ └─────────┘ └─────────┘│
├─────────────────────────────────────┤
│ CheckpointSaverFactory │ LangGraph  │  ← Factory Layer
│    (Custom Savers)     │ Provider   │
├─────────────────────────────────────┤
│ Memory │ Redis │ Postgres │ SQLite  │  ← Storage Backends
│ (Custom Enterprise) │ (Official)    │
└─────────────────────────────────────┘
```

### Dual Provider Strategy

The module provides **two complementary approaches** for checkpoint management:

1. **Custom Enterprise Savers** (`CheckpointSaverFactory`)
   - Enhanced monitoring and metrics
   - Custom compression and optimization
   - Enterprise health checking
   - Full control over implementation

2. **Official LangGraph Integration** (`LangGraphCheckpointProvider`)
   - Direct integration with official LangGraph packages
   - Guaranteed compatibility with LangGraph ecosystem
   - Minimal custom logic for maximum reliability
   - Easy migration path from pure LangGraph

### SOLID Principles Implementation

**Single Responsibility**:
- `CheckpointManagerService`: Facade for all checkpoint operations
- `CheckpointPersistenceService`: Core CRUD operations
- `CheckpointRegistryService`: Saver lifecycle management
- `CheckpointMetricsService`: Performance tracking
- `CheckpointCleanupService`: Data lifecycle management
- `CheckpointHealthService`: System monitoring

**Open/Closed**:
- Factory pattern for new storage backends
- Interface-based design for extensibility
- Plugin architecture for custom savers

**Dependency Inversion**:
- All services depend on interfaces, not implementations
- Dependency injection throughout

## Checkpoint Patterns & Storage Backends

### Memory Checkpoint Saver
**Use Case**: Development, testing, ephemeral workflows

```typescript
// Configuration
{
  type: 'memory',
  name: 'dev-memory',
  memory: {
    maxCheckpoints: 1000,        // Max checkpoints in memory
    ttl: 3600000,               // 1 hour TTL
    cleanupInterval: 300000,     // 5 minutes cleanup
    compressionThreshold: 1024   // Compress if > 1KB
  }
}
```

**Characteristics**:
- Fast read/write performance
- No external dependencies
- Data lost on service restart
- Memory usage scales with checkpoint count
- Ideal for development and testing

### Redis Checkpoint Saver
**Use Case**: Production, distributed systems, caching layer

```typescript
// Configuration
{
  type: 'redis',
  name: 'prod-redis',
  redis: {
    url: 'redis://redis:6379',
    keyPrefix: 'checkpoints:',
    ttl: 86400,                 // 24 hours
    compression: 'gzip',
    maxRetries: 3,
    retryDelay: 1000,
    cluster: {
      enableReadyCheck: true,
      maxRetriesPerRequest: 3
    }
  }
}
```

**Characteristics**:
- Sub-millisecond read/write performance
- Native clustering support
- Built-in expiration (TTL)
- Memory-efficient with compression
- Excellent for high-throughput workloads

### PostgreSQL Checkpoint Saver
**Use Case**: ACID compliance, complex queries, long-term storage

```typescript
// Configuration
{
  type: 'postgres',
  name: 'audit-postgres',
  postgres: {
    connectionString: 'postgresql://user:pass@localhost:5432/checkpoints',
    tableName: 'workflow_checkpoints',
    schema: 'langgraph',
    poolSize: 10,
    indexStrategy: 'btree',
    compression: 'gzip',
    partitioning: {
      strategy: 'time',
      interval: 'month'
    }
  }
}
```

**Characteristics**:
- ACID transactions
- Complex querying capabilities
- Excellent for audit trails
- Table partitioning for performance
- Strong consistency guarantees

### SQLite Checkpoint Saver
**Use Case**: Single-node deployments, embedded systems

```typescript
// Configuration
{
  type: 'sqlite',
  name: 'embedded-sqlite',
  sqlite: {
    databasePath: './data/checkpoints.db',
    busyTimeout: 5000,
    journalMode: 'WAL',
    synchronous: 'NORMAL',
    cacheSize: 2000,
    enableForeignKeys: true
  }
}
```

**Characteristics**:
- Zero configuration
- File-based storage
- ACID compliance
- Good performance for single-node
- Excellent for edge deployments

## State Management Best Practices

### Enhanced State Annotations
Create comprehensive state definitions with validation and reducers:

```typescript
import { StateTransformerService } from '@langgraph-modules/checkpoint';

// Define workflow state with built-in channels
const workflowAnnotation = stateService.createStateAnnotation({
  name: 'order-processing',
  channels: {
    // Custom channels
    orderId: {
      reducer: (current, update) => update ?? current,
      default: () => null,
      validator: (value) => typeof value === 'string' && value.length > 0,
      description: 'Unique order identifier',
      required: true,
    },
    orderStatus: {
      reducer: (current, update) => update ?? current,
      default: () => 'pending',
      validator: (value) => ['pending', 'processing', 'completed', 'cancelled'].includes(value),
      description: 'Current order processing status',
      required: true,
    },
    processingHistory: {
      reducer: (current: string[], update: string[]) => [...current, ...update],
      default: () => [],
      description: 'History of processing steps',
      required: false,
    },
    // Built-in channels are automatically included:
    // messages, confidence, metadata, error, status, currentNode, etc.
  },
  validation: z.object({
    orderId: z.string().min(1),
    orderStatus: z.enum(['pending', 'processing', 'completed', 'cancelled']),
    processingHistory: z.array(z.string()),
  })
});
```

### Checkpoint Versioning Strategy
Implement version-aware checkpoints for safe migrations:

```typescript
// Version 1.0 checkpoint
const v1Checkpoint = {
  channel_values: { orderId: '123', status: 'pending' },
  metadata: { version: '1.0', workflowName: 'order-processing' }
};

// Version 2.0 checkpoint (with migration)
const migrationTransformer = {
  canTransform: (state) => state.metadata?.version === '1.0',
  transform: (v1State) => ({
    ...v1State,
    channel_values: {
      ...v1State.channel_values,
      orderStatus: v1State.channel_values.status, // Rename field
      processingHistory: [] // Add new field
    },
    metadata: { ...v1State.metadata, version: '2.0' }
  })
};

stateService.registerStateTransformer('v1-to-v2-migration', migrationTransformer);
```

## Key Services Deep Dive

### CheckpointManagerService (Facade)
**Purpose**: Unified interface for all checkpoint operations

```typescript
@Injectable()
class MyWorkflowService {
  constructor(private checkpointManager: CheckpointManagerService) {}

  async executeWorkflow(threadId: string, input: unknown) {
    // Save initial checkpoint
    await this.checkpointManager.saveCheckpoint(threadId, input, {
      stepName: 'initialize',
      nodeType: 'start',
      workflowName: 'order-processing'
    });

    try {
      // Process workflow...
      const result = await this.processOrder(input);
      
      // Save completion checkpoint
      await this.checkpointManager.saveCheckpoint(threadId, result, {
        stepName: 'complete',
        nodeType: 'end',
        executionDuration: Date.now() - startTime
      });

      return result;
    } catch (error) {
      // Load last good checkpoint for recovery
      const lastCheckpoint = await this.checkpointManager.loadCheckpoint(threadId);
      throw new RecoverableError('Workflow failed, can resume from checkpoint', {
        lastCheckpoint,
        error
      });
    }
  }
}
```

### CheckpointRegistry (Saver Management)
**Purpose**: Manage multiple storage backends with failover

```typescript
// Multi-backend configuration
const checkpointConfig = {
  savers: [
    { type: 'redis', name: 'primary', default: true },
    { type: 'postgres', name: 'backup' },
    { type: 'memory', name: 'fallback' }
  ]
};

// Automatic failover logic
class ResilientCheckpointService {
  async saveWithFailover(threadId: string, checkpoint: unknown) {
    const savers = ['primary', 'backup', 'fallback'];
    
    for (const saverName of savers) {
      try {
        await this.checkpointManager.saveCheckpoint(threadId, checkpoint, undefined, saverName);
        return; // Success
      } catch (error) {
        console.warn(`Checkpoint save failed on ${saverName}:`, error);
        // Try next saver
      }
    }
    
    throw new Error('All checkpoint savers failed');
  }
}
```

### StateTransformer (Advanced State Operations)
**Purpose**: Handle complex state transformations and migrations

```typescript
// State merge strategies
const mergeOptions = {
  conflictStrategy: 'merge', // 'overwrite', 'preserve', 'merge', 'error'
  excludeFields: ['metadata.timestamp'],
  forceOverwrite: ['status'],
  validate: true
};

const currentState = { orderId: '123', status: 'processing', data: { step: 1 } };
const updateState = { status: 'completed', data: { step: 2, result: 'success' } };

const mergedState = stateService.mergeStates(currentState, updateState, mergeOptions);
// Result: { orderId: '123', status: 'completed', data: { step: 2, result: 'success' } }
```

## Recovery Strategies & Rollback

### Time Travel Implementation
Navigate workflow execution history:

```typescript
class WorkflowTimeTravel {
  async createBranch(threadId: string, checkpointId: string, branchName: string) {
    // Load specific checkpoint
    const checkpoint = await this.checkpointManager.loadCheckpoint(threadId, checkpointId);
    
    // Create new thread for branch
    const branchThreadId = `${threadId}_branch_${branchName}`;
    
    // Save as new checkpoint with branch metadata
    await this.checkpointManager.saveCheckpoint(branchThreadId, checkpoint.channel_values, {
      ...checkpoint.metadata,
      branchName,
      parentThreadId: threadId,
      parentCheckpointId: checkpointId,
      branchCreatedAt: new Date().toISOString(),
      branchDescription: `Branch created from step ${checkpoint.metadata?.stepName}`
    });

    return branchThreadId;
  }

  async mergeBranch(mainThreadId: string, branchThreadId: string) {
    const mainCheckpoint = await this.checkpointManager.loadCheckpoint(mainThreadId);
    const branchCheckpoint = await this.checkpointManager.loadCheckpoint(branchThreadId);
    
    // Implement merge logic based on your domain
    const mergedState = this.stateService.mergeStates(
      mainCheckpoint.channel_values,
      branchCheckpoint.channel_values,
      { conflictStrategy: 'merge' }
    );

    // Save merged result
    await this.checkpointManager.saveCheckpoint(mainThreadId, mergedState, {
      stepName: 'merge',
      nodeType: 'merge',
      branchName: 'main',
      mergedFromBranch: branchThreadId
    });
  }
}
```

### Rollback Mechanisms
Implement safe state rollback:

```typescript
class WorkflowRollback {
  async rollbackToCheckpoint(threadId: string, targetCheckpointId: string) {
    // Get checkpoint history for validation
    const checkpoints = await this.checkpointManager.listCheckpoints(threadId, {
      sortOrder: 'desc',
      sortBy: 'timestamp'
    });

    const targetCheckpoint = checkpoints.find(([, checkpoint]) => 
      checkpoint.id === targetCheckpointId
    );

    if (!targetCheckpoint) {
      throw new Error(`Checkpoint ${targetCheckpointId} not found`);
    }

    // Create rollback checkpoint
    const [, checkpoint, metadata] = targetCheckpoint;
    await this.checkpointManager.saveCheckpoint(threadId, checkpoint.channel_values, {
      ...metadata,
      stepName: 'rollback',
      nodeType: 'rollback',
      rolledBackFrom: checkpoints[0][1].id, // Latest checkpoint
      rollbackReason: 'Manual rollback initiated'
    });

    return checkpoint;
  }
}
```

## Performance Optimization

### Caching Strategies
Implement intelligent caching for frequently accessed checkpoints:

```typescript
class CheckpointCache {
  private cache = new Map<string, { checkpoint: unknown; expiry: number }>();
  private readonly TTL = 300000; // 5 minutes

  async getCachedCheckpoint(threadId: string, checkpointId?: string): Promise<unknown | null> {
    const key = `${threadId}:${checkpointId || 'latest'}`;
    const cached = this.cache.get(key);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.checkpoint;
    }

    // Load from storage
    const checkpoint = await this.checkpointManager.loadCheckpoint(threadId, checkpointId);
    
    if (checkpoint) {
      this.cache.set(key, {
        checkpoint,
        expiry: Date.now() + this.TTL
      });
    }

    return checkpoint;
  }
}
```

### Compression Strategies
Optimize storage usage with intelligent compression:

```typescript
// Automatic compression based on size
const compressionConfig = {
  threshold: 1024,        // Compress if > 1KB
  algorithm: 'gzip',      // 'gzip', 'lz4', 'brotli'
  level: 6,               // Compression level (1-9)
  detectDuplicates: true  // Skip compression if duplicate
};

// Field-level compression for large objects
const fieldCompressionRules = {
  'channel_values.messages': { algorithm: 'gzip', threshold: 512 },
  'channel_values.largeData': { algorithm: 'lz4', threshold: 2048 },
  'metadata.debugInfo': { algorithm: 'brotli', threshold: 256 }
};
```

## Cleanup & Retention Policies

### Automated Cleanup Configuration
Implement comprehensive data lifecycle management:

```typescript
const cleanupPolicies = {
  // Global policies
  maxAge: 30 * 24 * 60 * 60 * 1000,    // 30 days
  maxPerThread: 100,                    // Keep latest 100 checkpoints
  cleanupInterval: 60 * 60 * 1000,      // Run cleanup hourly
  
  // Thread-specific policies
  threadPolicies: {
    'critical-*': { maxAge: 90 * 24 * 60 * 60 * 1000 }, // 90 days for critical
    'temp-*': { maxAge: 24 * 60 * 60 * 1000 },          // 1 day for temp
    'audit-*': { maxAge: 365 * 24 * 60 * 60 * 1000 }    // 1 year for audit
  },
  
  // Conditional cleanup rules
  conditionalRules: [
    {
      condition: (metadata) => metadata.nodeType === 'debug',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days for debug checkpoints
    },
    {
      condition: (metadata) => metadata.error,
      preserve: true // Never delete error checkpoints
    }
  ]
};

// Schedule cleanup
await this.checkpointManager.cleanupCheckpoints({
  ...cleanupPolicies,
  onDelete: (checkpointId, threadId) => {
    this.logger.info(`Cleaned checkpoint ${checkpointId} from thread ${threadId}`);
  }
});
```

### Smart Retention Strategies
Implement intelligent retention based on checkpoint importance:

```typescript
class SmartRetention {
  calculateImportance(checkpoint: EnhancedCheckpoint, metadata: EnhancedCheckpointMetadata): number {
    let score = 0;
    
    // Node type importance
    if (metadata.nodeType === 'human-approval') score += 10;
    if (metadata.nodeType === 'decision') score += 8;
    if (metadata.nodeType === 'error') score += 9;
    if (metadata.nodeType === 'start' || metadata.nodeType === 'end') score += 7;
    
    // Execution duration (longer = more important)
    if (metadata.executionDuration && metadata.executionDuration > 10000) score += 5;
    
    // Branch checkpoints are important
    if (metadata.branchName && metadata.branchName !== 'main') score += 6;
    
    // Size-based scoring (larger states might be more important)
    if (checkpoint.size && checkpoint.size > 10240) score += 3;
    
    return score;
  }

  async retentionCleanup(threadId: string) {
    const checkpoints = await this.checkpointManager.listCheckpoints(threadId);
    const scoredCheckpoints = checkpoints.map(([config, checkpoint, metadata]) => ({
      config, checkpoint, metadata,
      importance: this.calculateImportance(checkpoint, metadata)
    }));

    // Sort by importance and keep top N
    scoredCheckpoints.sort((a, b) => b.importance - a.importance);
    const toKeep = scoredCheckpoints.slice(0, 50); // Keep top 50
    const toDelete = scoredCheckpoints.slice(50);

    for (const { checkpoint } of toDelete) {
      // Delete low-importance checkpoints
      await this.deleteCheckpoint(threadId, checkpoint.id);
    }
  }
}
```

## Common Use Cases & Patterns

### 1. Workflow Replay & Debugging
Record detailed execution history for debugging:

```typescript
class WorkflowDebugger {
  async replayWorkflow(threadId: string, options: { 
    fromStep?: string;
    toStep?: string;
    breakpoints?: string[];
  } = {}) {
    const checkpoints = await this.checkpointManager.listCheckpoints(threadId, {
      sortOrder: 'asc',
      sortBy: 'timestamp'
    });

    const startIndex = options.fromStep 
      ? checkpoints.findIndex(([,, meta]) => meta.stepName === options.fromStep)
      : 0;
    
    const endIndex = options.toStep
      ? checkpoints.findIndex(([,, meta]) => meta.stepName === options.toStep)
      : checkpoints.length - 1;

    for (let i = startIndex; i <= endIndex; i++) {
      const [config, checkpoint, metadata] = checkpoints[i];
      
      console.log(`Step ${i + 1}: ${metadata.stepName} (${metadata.nodeType})`);
      console.log('State:', JSON.stringify(checkpoint.channel_values, null, 2));
      
      if (options.breakpoints?.includes(metadata.stepName || '')) {
        await this.waitForUserInput(`Breakpoint at ${metadata.stepName}. Continue? (y/n)`);
      }
      
      if (metadata.executionDuration) {
        console.log(`Duration: ${metadata.executionDuration}ms`);
      }
    }
  }

  async analyzePerformance(threadId: string) {
    const checkpoints = await this.checkpointManager.listCheckpoints(threadId);
    const performance = checkpoints
      .filter(([,, meta]) => meta.executionDuration)
      .map(([,, meta]) => ({
        step: meta.stepName,
        duration: meta.executionDuration!,
        type: meta.nodeType
      }))
      .sort((a, b) => b.duration - a.duration);

    console.log('Slowest steps:');
    performance.slice(0, 5).forEach(({ step, duration, type }) => {
      console.log(`  ${step} (${type}): ${duration}ms`);
    });
  }
}
```

### 2. Human-in-the-Loop Workflows
Manage human approval checkpoints:

```typescript
class HITLWorkflow {
  async waitForApproval(threadId: string, decision: unknown, context: unknown) {
    // Save pre-approval checkpoint
    await this.checkpointManager.saveCheckpoint(threadId, { decision, context }, {
      stepName: 'await-approval',
      nodeType: 'human-approval',
      status: 'pending',
      requiresHumanInput: true,
      approvalContext: {
        decisionType: typeof decision,
        urgency: this.calculateUrgency(context),
        estimatedReviewTime: '15m'
      }
    });

    // Return checkpoint ID for external approval system
    return `approval_${threadId}_${Date.now()}`;
  }

  async processApproval(threadId: string, approved: boolean, feedback?: string) {
    const checkpoint = await this.checkpointManager.loadCheckpoint(threadId);
    
    const updatedState = {
      ...checkpoint.channel_values,
      approved,
      approvalFeedback: feedback,
      approvalTimestamp: new Date().toISOString()
    };

    await this.checkpointManager.saveCheckpoint(threadId, updatedState, {
      stepName: approved ? 'approved' : 'rejected',
      nodeType: 'approval-result',
      humanFeedback: feedback,
      approvalDecision: approved
    });

    return updatedState;
  }
}
```

### 3. Multi-Backend High Availability
Implement redundant storage for critical workflows:

```typescript
class HACheckpointManager {
  private readonly criticalThreadPatterns = [/^critical-/, /^audit-/, /^financial-/];

  async saveCheckpointHA(threadId: string, checkpoint: unknown, metadata?: EnhancedCheckpointMetadata) {
    const isCritical = this.criticalThreadPatterns.some(pattern => 
      pattern.test(threadId)
    );

    if (isCritical) {
      // Save to multiple backends for critical workflows
      const savePromises = [
        this.checkpointManager.saveCheckpoint(threadId, checkpoint, metadata, 'primary-redis'),
        this.checkpointManager.saveCheckpoint(threadId, checkpoint, metadata, 'backup-postgres'),
        this.checkpointManager.saveCheckpoint(threadId, checkpoint, metadata, 'archive-s3')
      ];

      const results = await Promise.allSettled(savePromises);
      const failures = results.filter(r => r.status === 'rejected');

      if (failures.length === results.length) {
        throw new Error('All checkpoint saves failed for critical workflow');
      }

      if (failures.length > 0) {
        this.logger.warn(`${failures.length} checkpoint saves failed for ${threadId}`);
      }
    } else {
      // Regular save for non-critical workflows
      await this.checkpointManager.saveCheckpoint(threadId, checkpoint, metadata);
    }
  }
}
```

## Integration with LangGraph Workflows

### Automatic Checkpoint Integration
Seamlessly integrate checkpoints with workflow decorators:

```typescript
import { Workflow, Node, CheckpointAfter } from '@anubis/nestjs-langgraph';

@Workflow({
  name: 'order-processing',
  checkpoints: {
    enabled: true,
    saveAfterEachNode: true,
    compressionThreshold: 1024
  }
})
class OrderProcessingWorkflow {
  @Node('validate-order')
  @CheckpointAfter() // Automatic checkpoint after this node
  async validateOrder(state: OrderState): Promise<Partial<OrderState>> {
    // Validation logic
    return { validationStatus: 'passed', validatedAt: new Date() };
  }

  @Node('process-payment')
  @CheckpointAfter({ 
    metadata: { critical: true, auditRequired: true } 
  })
  async processPayment(state: OrderState): Promise<Partial<OrderState>> {
    // Payment processing
    return { paymentStatus: 'completed', paymentId: 'pay_123' };
  }

  @Node('fulfill-order')
  async fulfillOrder(state: OrderState): Promise<Partial<OrderState>> {
    // Fulfillment logic
    return { fulfillmentStatus: 'shipped', trackingNumber: 'TRK123' };
  }
}
```

### Stream Processing with Checkpoints
Handle streaming workflows with checkpoint integration:

```typescript
class StreamingWorkflowWithCheckpoints {
  async processStreamWithCheckpoints(streamId: string, dataStream: AsyncIterable<unknown>) {
    let batchCount = 0;
    const batchSize = 100;
    let batch: unknown[] = [];

    for await (const item of dataStream) {
      batch.push(item);

      if (batch.length >= batchSize) {
        // Process batch
        const result = await this.processBatch(batch);
        
        // Checkpoint after each batch
        await this.checkpointManager.saveCheckpoint(streamId, {
          batchCount,
          processedItems: batchCount * batchSize,
          lastProcessedAt: new Date(),
          batchResult: result
        }, {
          stepName: `batch-${batchCount}`,
          nodeType: 'batch-processing',
          batchInfo: {
            batchNumber: batchCount,
            itemCount: batch.length,
            processingDuration: result.duration
          }
        });

        batch = [];
        batchCount++;
      }
    }

    // Process final partial batch
    if (batch.length > 0) {
      const result = await this.processBatch(batch);
      await this.checkpointManager.saveCheckpoint(streamId, {
        batchCount,
        processedItems: batchCount * batchSize + batch.length,
        completed: true,
        finalBatchResult: result
      }, {
        stepName: 'final-batch',
        nodeType: 'stream-completion'
      });
    }
  }
}
```

## Metrics & Monitoring

### Comprehensive Monitoring Setup
Monitor checkpoint system health and performance:

```typescript
class CheckpointMonitoring {
  async setupHealthDashboard() {
    const systemReport = this.checkpointManager.getSystemReport();
    
    // Key metrics to monitor
    const metrics = {
      // Performance metrics
      averageSaveTime: systemReport.metrics.averageSaveTime,
      averageLoadTime: systemReport.metrics.averageLoadTime,
      errorRate: systemReport.metrics.errorRate,
      
      // Storage metrics
      totalCheckpoints: systemReport.registry.totalSavers,
      healthySavers: systemReport.health.overall.healthySavers,
      degradedSavers: systemReport.health.overall.degradedSavers,
      
      // Cleanup metrics
      lastCleanup: systemReport.cleanup.lastCleanupTime,
      cleanedCheckpoints: systemReport.cleanup.totalCleanedCheckpoints,
      
      // Alerts
      alerts: [
        ...systemReport.health.recommendations,
        ...systemReport.performance.recommendations
      ]
    };

    return metrics;
  }

  async createAlertRules() {
    return {
      'high-error-rate': {
        condition: () => this.checkpointManager.getAggregatedMetrics().errorRate > 0.05,
        message: 'Checkpoint error rate exceeds 5%',
        severity: 'high'
      },
      'slow-performance': {
        condition: () => this.checkpointManager.getAggregatedMetrics().averageSaveTime > 1000,
        message: 'Checkpoint save time exceeds 1 second',
        severity: 'medium'
      },
      'unhealthy-savers': {
        condition: () => this.checkpointManager.getHealthSummary().overall.unhealthySavers > 0,
        message: 'One or more checkpoint savers are unhealthy',
        severity: 'high'
      },
      'storage-full': {
        condition: async () => {
          const diagnostic = await this.checkpointManager.getDiagnosticInfo();
          return diagnostic.storageInfo?.details?.usage > 0.9; // 90% full
        },
        message: 'Checkpoint storage is approaching capacity',
        severity: 'high'
      }
    };
  }
}
```

### Performance Profiling
Profile checkpoint operations for optimization:

```typescript
class CheckpointProfiler {
  private profiles = new Map<string, Array<{ operation: string; duration: number; metadata: unknown }>>();

  async profileOperation<T>(
    threadId: string, 
    operation: string, 
    fn: () => Promise<T>,
    metadata?: unknown
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      this.recordProfile(threadId, operation, duration, { ...metadata, success: true });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordProfile(threadId, operation, duration, { ...metadata, success: false, error: error.message });
      throw error;
    }
  }

  private recordProfile(threadId: string, operation: string, duration: number, metadata: unknown) {
    if (!this.profiles.has(threadId)) {
      this.profiles.set(threadId, []);
    }
    
    this.profiles.get(threadId)!.push({ operation, duration, metadata });
  }

  generatePerformanceReport(threadId: string) {
    const profile = this.profiles.get(threadId) || [];
    
    const operationStats = profile.reduce((acc, { operation, duration }) => {
      if (!acc[operation]) {
        acc[operation] = { count: 0, totalTime: 0, minTime: Infinity, maxTime: 0 };
      }
      
      acc[operation].count++;
      acc[operation].totalTime += duration;
      acc[operation].minTime = Math.min(acc[operation].minTime, duration);
      acc[operation].maxTime = Math.max(acc[operation].maxTime, duration);
      
      return acc;
    }, {} as Record<string, { count: number; totalTime: number; minTime: number; maxTime: number }>);

    // Calculate averages
    Object.values(operationStats).forEach(stats => {
      (stats as { averageTime: number }).averageTime = stats.totalTime / stats.count;
    });

    return {
      threadId,
      totalOperations: profile.length,
      totalTime: profile.reduce((sum, { duration }) => sum + duration, 0),
      operationBreakdown: operationStats,
      slowestOperations: Object.entries(operationStats)
        .map(([op, stats]) => ({ operation: op, averageTime: (stats as { averageTime: number }).averageTime }))
        .sort((a, b) => b.averageTime - a.averageTime)
        .slice(0, 5)
    };
  }
}
```

This comprehensive checkpoint module provides robust state persistence and recovery capabilities for LangGraph workflows, with support for multiple storage backends, intelligent cleanup policies, comprehensive monitoring, and advanced features like time travel and branch management.