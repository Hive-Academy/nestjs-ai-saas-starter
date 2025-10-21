# @hive-academy/langgraph-checkpoint

> **Enterprise State Persistence & Recovery for LangGraph Workflows**

Automagical checkpoint management with facade pattern orchestrating 8 specialized services. Provides production-grade state persistence, automatic fallbacks, and seamless ecosystem integration for building resilient AI applications.

## 🚀 Business Value

- **🔄 Automatic Recovery**: Resume workflows from any point with zero configuration
- **🛡️ Enterprise Reliability**: 8-service SOLID architecture with graceful degradation
- **⚡ Zero-Config Start**: Automatic fallback to in-memory storage for instant development
- **🔌 Universal Integration**: Auto-injected via DI into Multi-Agent, HITL, and all ecosystem modules
- **📊 Production Monitoring**: Built-in health checks, metrics, and performance insights
- **🧹 Smart Maintenance**: Automated cleanup with configurable retention policies
- **🎯 Real Multi-Agent Checkpointing**: Verified integration with actual multi-agent coordination workflows
- **🔗 Ecosystem-Wide State Management**: HITL approval persistence, Workflow-Engine execution tracking, Multi-Agent coordination
- **📝 Namespace Isolation**: Module-specific checkpoint namespaces prevent conflicts across the ecosystem

## 🎯 Perfect For

- **AI Application Developers** building fault-tolerant workflows
- **Enterprise Teams** requiring reliable state management
- **Production Systems** needing comprehensive monitoring and recovery
- **Development Teams** wanting zero-config checkpoint functionality

## 🏗️ Automagical Architecture

### **8-Service Facade Pattern**

```
┌─────────────────────────────────────────────────────────────┐
│              CheckpointManagerService (Facade)              │
│                     Single API Interface                    │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                  🎯 Service Orchestration                   │
│                                                             │
│  📝 Registry      💾 Persistence    📊 Metrics             │
│  🧹 Cleanup       💚 Health         🔄 Transform           │
│  🔌 Integration   📱 Saver Registry                        │
│                                                             │
│           All Services Auto-Coordinate Seamlessly          │
└─────────────────────────────────────────────────────────────┘
```

### **Evidence-Based Ecosystem Integration**

**VERIFIED** checkpoint integration patterns across all modules:

```
┌─────────────────────────────────────────────────────────────┐
│              🎯 Your Application Modules                    │
│  Multi-Agent | Workflow-Engine | HITL | Functional-API     │
└─────────────────────────────────────────────────────────────┘
            │ (all inject 'ICheckpointAdapter')
            ▼
┌─────────────────────────────────────────────────────────────┐
│        CheckpointManagerAdapter (Central Provider)          │
│          ICheckpointAdapter Implementation                   │
└─────────────────────────────────────────────────────────────┘
            │ (implements interface from)
            ▼
┌─────────────────────────────────────────────────────────────┐
│              @hive-academy/langgraph-core                   │
│            ICheckpointAdapter Interface                     │
└─────────────────────────────────────────────────────────────┘
```

**Real Integration Table (Source-Verified):**

| Module              | Service                     | Usage Pattern                      | Namespace                     | Dependency |
| ------------------- | --------------------------- | ---------------------------------- | ----------------------------- | ---------- |
| **Multi-Agent**     | `WorkflowCheckpointService` | `@Optional()` graceful degradation | `agent-{agentId}`             | Optional   |
| **Workflow-Engine** | `WorkflowCheckpointService` | `@Optional()` capability detection | `workflow-engine.execution.*` | Optional   |
| **HITL**            | `HitlCheckpointService`     | `@Inject()` required for approvals | `hitl-approval`, `hitl-chain` | Required   |
| **Functional-API**  | Basic wrapper               | NoOp fallback pattern              | Various                       | Fallback   |

## 📦 Installation

```bash
npm install @hive-academy/langgraph-checkpoint
```

**Auto-installs with any LangGraph checkpoint saver:**

```bash
# Choose your preferred storage
npm install @langchain/langgraph-checkpoint-sqlite
npm install @langchain/langgraph-checkpoint-redis
npm install @langchain/langgraph-checkpoint-postgres
```

## ⚡ Quick Start

### **Zero-Config Development**

```typescript
import { Module } from '@nestjs/common';
import { LanggraphModulesCheckpointModule } from '@hive-academy/langgraph-checkpoint';

@Module({
  imports: [
    LanggraphModulesCheckpointModule.forRoot(), // 🎯 That's it! Auto-fallback to memory
  ],
})
export class AppModule {}

// Logs: "⚠️ No checkpoint saver provided - falling back to in-memory storage"
// ✅ Ready for development immediately!
```

### **Production-Ready Setup**

```typescript
import { LanggraphModulesCheckpointModule } from '@hive-academy/langgraph-checkpoint';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';

@Module({
  imports: [
    LanggraphModulesCheckpointModule.forRoot({
      // 🎯 Just provide any LangGraph saver
      saver: SqliteSaver.fromConnString('production.db'),

      // 🎯 Optional: Enterprise features auto-enabled
      cleanup: { enabled: true, maxAge: 24 * 60 * 60 * 1000 },
      health: { enabled: true, checkInterval: 30000 },
      metrics: { enabled: true },
    }),
  ],
})
export class ProductionModule {}

// Logs: "✅ Checkpoint saver registered: sqlite (provided by user)"
// ✅ All 8 services auto-configured and monitoring started!
```

## 🎯 Usage Patterns

### **Simple Workflow Checkpointing**

```typescript
import { CheckpointManagerService } from '@hive-academy/langgraph-checkpoint';

@Injectable()
export class AIWorkflowService {
  constructor(private readonly checkpoints: CheckpointManagerService) {}

  async processWithCheckpoints(userQuery: string): Promise<any> {
    const threadId = `ai-${Date.now()}`;

    // 🎯 Save initial state
    await this.checkpoints.saveCheckpoint(threadId, {
      query: userQuery,
      step: 'initialized',
      timestamp: new Date(),
    });

    try {
      // Process AI workflow...
      const result = await this.processAI(userQuery);

      // 🎯 Save completion state
      await this.checkpoints.saveCheckpoint(threadId, {
        query: userQuery,
        result,
        step: 'completed',
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      // 🎯 Save error state for recovery
      await this.checkpoints.saveCheckpoint(threadId, {
        query: userQuery,
        error: error.message,
        step: 'failed',
        timestamp: new Date(),
      });
      throw error;
    }
  }

  async resumeWorkflow(threadId: string): Promise<any> {
    // 🎯 Load last checkpoint
    const checkpoint = await this.checkpoints.loadCheckpoint(threadId);

    if (checkpoint?.channel_values.step === 'failed') {
      // Resume from failure point
      return this.retryFromCheckpoint(checkpoint);
    }

    return checkpoint?.channel_values;
  }
}
```

### **Automatic Core Integration**

```typescript
import { CheckpointManagerAdapter } from '@hive-academy/langgraph-checkpoint';
import { createCheckpointIntegration } from '@hive-academy/langgraph-core';

@Injectable()
export class WorkflowEngineService {
  constructor(private readonly checkpointManager: CheckpointManagerService) {}

  createResilientWorkflow(definition: WorkflowDefinition) {
    // 🎯 Auto-bridge to core interfaces
    const adapter = new CheckpointManagerAdapter(this.checkpointManager);

    // 🎯 Use with core integration helper
    const integration = createCheckpointIntegration({
      adapter,
      config: {
        enabled: true,
        autoCheckpoint: { enabled: true, interval: 30000 },
      },
    });

    return {
      ...definition,
      checkpointing: integration,
      resilient: true,
    };
  }
}
```

### **Production Monitoring**

```typescript
import {
  CheckpointManagerService,
  CheckpointHealthService,
  CheckpointMetricsService,
} from '@hive-academy/langgraph-checkpoint';

@Injectable()
export class CheckpointMonitoringService {
  constructor(
    private readonly checkpoints: CheckpointManagerService,
    private readonly health: CheckpointHealthService,
    private readonly metrics: CheckpointMetricsService
  ) {}

  async getProductionHealth(): Promise<any> {
    // 🎯 Capability-aware monitoring
    if (!this.checkpoints.isCoreServicesAvailable()) {
      return { status: 'degraded', reason: 'Core services unavailable' };
    }

    const [healthSummary, systemReport, metrics] = await Promise.all([
      this.health?.getHealthSummary() || null,
      this.checkpoints.getSystemReport(),
      this.metrics?.getAggregatedMetrics() || null,
    ]);

    return {
      status: healthSummary?.overall.healthySavers > 0 ? 'healthy' : 'degraded',
      totalSavers: healthSummary?.overall.totalSavers || 0,
      healthySavers: healthSummary?.overall.healthySavers || 0,
      metrics: {
        totalCheckpoints: metrics?.totalOperations || 0,
        averageResponseTime: metrics?.averageResponseTime || 0,
        errorRate: metrics?.errorRate || 0,
      },
      monitoring: {
        healthEnabled: this.checkpoints.isMonitoringAvailable(),
        metricsEnabled: !!this.metrics,
      },
      recommendations: systemReport?.recommendations || [],
    };
  }

  async performSystemValidation(): Promise<any> {
    // 🎯 Comprehensive system validation with capability detection
    return this.checkpoints.validateSystem();
  }

  async getEcosystemCheckpointStatus(): Promise<any> {
    // 🎯 Monitor checkpoint usage across all ecosystem modules
    const checkpoints = await this.checkpoints.listCheckpoints('', {
      limit: 100,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });

    const moduleUsage = {
      multiAgent: checkpoints.filter((cp) => cp.metadata?.source?.includes('agent')).length,
      workflowEngine: checkpoints.filter((cp) => cp.metadata?.source?.includes('workflow-engine'))
        .length,
      hitl: checkpoints.filter((cp) => cp.metadata?.source?.includes('hitl')).length,
      functionalApi: checkpoints.filter((cp) => cp.metadata?.source?.includes('functional')).length,
    };

    return {
      totalCheckpoints: checkpoints.length,
      moduleBreakdown: moduleUsage,
      lastCheckpoint: checkpoints[0]?.metadata?.timestamp,
    };
  }
}
```

## 🔗 Ecosystem Integration

### **1. Workflow Engine Integration**

```typescript
// Auto-detected and used by workflow engines
import { WorkflowExecutionService } from '@hive-academy/langgraph-workflow-engine';
import { CheckpointManagerService } from '@hive-academy/langgraph-checkpoint';

// ✅ Engine automatically uses checkpoint service when available
const engine = new WorkflowExecutionService(checkpointManager);
```

### **2. Memory Module Coordination**

```typescript
// Perfect coordination between state and context
import { MemoryService } from '@hive-academy/langgraph-memory';
import { CheckpointManagerService } from '@hive-academy/langgraph-checkpoint';

// ✅ Checkpoint stores workflow state, Memory stores conversation context
await checkpointManager.saveCheckpoint(threadId, workflowState);
await memoryService.storeContext(threadId, conversationHistory);
```

### **3. Streaming Integration**

```typescript
// Auto-checkpoint during streaming workflows
import { TokenStreamingService } from '@hive-academy/langgraph-streaming';

// ✅ Stream processor triggers automatic checkpoints
streamingService.onMilestone((milestone) => {
  checkpointManager.saveCheckpoint(threadId, milestone.state);
});
```

### **4. Multi-Agent Coordination (Source-Verified)**

```typescript
// REAL INTEGRATION PATTERN: Multi-agent has specialized checkpoint wrapper
import { MultiAgentCoordinatorService } from '@hive-academy/langgraph-multi-agent';

// ✅ Verified integration from actual source code analysis
@Module({
  imports: [
    LanggraphModulesCheckpointModule.forRootAsync({
      useFactory: async () => ({
        saver: SqliteSaver.fromConnString('./data/checkpoints.db'),
        cleanup: { enabled: true },
        health: { enabled: true },
      }),
    }),
    MultiAgentModule.forRootAsync({
      useFactory: async (checkpointAdapter: ICheckpointAdapter) => ({
        checkpointAdapter, // Auto-injected from checkpoint module
      }),
      inject: ['ICheckpointAdapter'], // Provided by checkpoint module
    }),
  ],
})
export class AppModule {}

// ✅ Multi-agent has WorkflowCheckpointService that wraps ICheckpointAdapter
@Injectable()
export class MultiAgentCoordinatorService {
  constructor(
    @Optional()
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter?: ICheckpointAdapter
  ) {}

  async executeWorkflow(networkId: string, input: any): Promise<MultiAgentResult> {
    const threadId = this.generateThreadId(networkId);

    // Real checkpoint integration with graceful degradation
    if (this.checkpointAdapter) {
      await this.saveWorkflowCheckpoint(threadId, {
        networkId,
        phase: 'start',
        messages: input.messages,
      });
    }

    const config = {
      configurable: { thread_id: threadId },
      metadata: { checkpointEnabled: !!this.checkpointAdapter },
    };

    return await this.networkManager.executeWorkflow(networkId, input, config);
  }
}
```

### **5. HITL Module Integration (Source-Verified)**

```typescript
// REAL INTEGRATION: HITL requires checkpoint for approval persistence
import { HitlCheckpointService } from '@hive-academy/langgraph-hitl';

@Injectable()
export class HitlCheckpointService implements IHitlCheckpointService {
  constructor(
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter: ICheckpointAdapter
  ) {}

  async saveApprovalState(
    request: HumanApprovalRequest,
    source: string,
    additionalData?: Record<string, unknown>
  ): Promise<void> {
    if (!this.checkpointAdapter) {
      return; // Graceful degradation when adapter unavailable
    }

    const threadId = this.generateApprovalThreadId(request.executionId, request.nodeId);

    const metadata: BaseCheckpointMetadata = {
      timestamp: new Date().toISOString(),
      source: source as 'input' | 'loop' | 'update' | 'fork',
      workflowState: request.workflowState,
      confidence: request.confidence.current,
      riskLevel: request.riskAssessment?.level,
    };

    await this.checkpointAdapter.saveCheckpoint(
      threadId,
      checkpointData,
      metadata,
      'hitl-approval' // HITL-specific namespace
    );
  }
}
```

### **6. Workflow-Engine Integration (Source-Verified)**

```typescript
// REAL INTEGRATION: Workflow-engine can provide OR consume checkpoint adapter
import { WorkflowCheckpointService } from '@hive-academy/langgraph-workflow-engine';

@Injectable()
export class WorkflowCheckpointService {
  constructor(
    @Optional()
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter?: ICheckpointAdapter
  ) {}

  async saveCheckpoint(executionId: string, data: WorkflowCheckpointData) {
    if (!this.checkpointingEnabled || !this.checkpointAdapter) {
      return; // Graceful degradation
    }

    const threadId = this.generateThreadId(executionId); // Uses NodeIdBuilder
    await this.checkpointAdapter.saveCheckpoint(threadId, data, metadata);
  }

  private generateThreadId(executionId: string): string {
    return NodeIdBuilder.create()
      .domain('workflow-engine')
      .phase('execution')
      .activity('workflow')
      .detail(executionId)
      .build(); // workflow-engine.execution.workflow.{executionId}
  }
}
```

## 📊 Storage Options

### **Supported Storage Backends**

Any LangGraph checkpoint saver works automatically:

| Storage Type   | Package                                    | Use Case                | Auto-Detection   |
| -------------- | ------------------------------------------ | ----------------------- | ---------------- |
| **Memory**     | `@langchain/langgraph-checkpoint`          | Development, Testing    | ✅ Auto-fallback |
| **SQLite**     | `@langchain/langgraph-checkpoint-sqlite`   | Local, Single-node      | ✅ Auto-detected |
| **PostgreSQL** | `@langchain/langgraph-checkpoint-postgres` | Production, Multi-node  | ✅ Auto-detected |
| **Redis**      | `@langchain/langgraph-checkpoint-redis`    | High-performance, Cache | ✅ Auto-detected |

### **Multi-Storage Setup**

```typescript
import { CheckpointSaverRegistry } from '@hive-academy/langgraph-checkpoint';

// 🎯 Register multiple storage backends
saverRegistry.registerSaver({
  name: 'primary',
  saver: new PostgresSaver(primaryDB),
  default: true,
  metadata: { type: 'postgres', description: 'Primary production DB' },
});

saverRegistry.registerSaver({
  name: 'backup',
  saver: new RedisSaver(backupRedis),
  metadata: { type: 'redis', description: 'Backup cache storage' },
});

// ✅ Use specific storage for different workflows
await checkpoints.saveCheckpoint(threadId, state, metadata, 'primary');
```

## 🛠️ Configuration

### **Development (Zero Config)**

```typescript
LanggraphModulesCheckpointModule.forRoot(); // Just works!
```

### **Production (Full Config)**

```typescript
LanggraphModulesCheckpointModule.forRoot({
  saver: SqliteSaver.fromConnString(connectionString),

  cleanup: {
    enabled: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxPerThread: 100, // Max 100 checkpoints per thread
    interval: 60 * 60 * 1000, // Cleanup every hour
    excludeThreads: ['system', 'admin'], // Exclude system threads
  },

  health: {
    enabled: true,
    checkInterval: 30 * 1000, // Health check every 30s
    timeout: 5 * 1000, // 5s timeout
    degradedThreshold: 1000, // >1s response = degraded
    unhealthyThreshold: 5000, // >5s response = unhealthy
  },

  metrics: {
    enabled: true,
    collectInterval: 60 * 1000, // Collect metrics every minute
  },
});
```

## 🏭 Production Features

### **Enterprise Reliability**

- **Automatic Fallbacks**: Graceful degradation when services unavailable
- **Health Monitoring**: Continuous health checks with detailed diagnostics
- **Performance Metrics**: Real-time performance tracking and insights
- **Smart Cleanup**: Automated maintenance with configurable policies

### **Monitoring & Observability**

- **Health Dashboard**: Real-time system health and status
- **Performance Insights**: Identify slow or error-prone storage
- **Comprehensive Metrics**: Response times, error rates, throughput
- **Alerting Ready**: Integration points for monitoring systems

### **Operational Excellence**

- **Zero-Downtime Updates**: Hot-swappable storage configurations
- **Backup Strategies**: Multi-storage backend support
- **Disaster Recovery**: Point-in-time recovery capabilities
- **Audit Trails**: Complete checkpoint history and metadata

## 🎯 Migration Path

### **Development → Production**

```typescript
// 1. Start with zero config
LanggraphModulesCheckpointModule.forRoot();

// 2. Add real storage
LanggraphModulesCheckpointModule.forRoot({
  saver: SqliteSaver.fromConnString('dev.db'),
});

// 3. Enable production features
LanggraphModulesCheckpointModule.forRoot({
  saver: SqliteSaver.fromConnString(prodDB),
  cleanup: { enabled: true },
  health: { enabled: true },
  metrics: { enabled: true },
});

// 4. Scale with multi-storage
LanggraphModulesCheckpointModule.forRoot({
  saver: SqliteSaver.fromConnString(primaryDB),
  // + Register backup savers via CheckpointSaverRegistry
});
```

## 📈 Performance

### **Optimized for Scale**

- **Efficient Storage**: Minimal overhead checkpoint serialization
- **Smart Caching**: Intelligent caching strategies per storage type
- **Batch Operations**: Bulk operations for high-throughput scenarios
- **Connection Pooling**: Automatic connection management

### **Performance Monitoring**

- **Real-time Metrics**: Response times, throughput, error rates
- **Performance Insights**: Automatic recommendations for optimization
- **Storage Analytics**: Per-storage backend performance comparison
- **Bottleneck Detection**: Identify and resolve performance issues

## 🧪 Testing

```typescript
import { Test } from '@nestjs/testing';
import { LanggraphModulesCheckpointModule } from '@hive-academy/langgraph-checkpoint';

describe('Checkpoint Integration', () => {
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [LanggraphModulesCheckpointModule.forRoot()], // Auto-memory for tests
    }).compile();
  });

  // Tests automatically use in-memory storage
  // Perfect for unit testing without external dependencies
});
```

## 📚 Documentation

- **[Complete Implementation Guide](./CLAUDE.md)** - Detailed technical documentation
- **[Core Integration](../core/CLAUDE.md)** - Foundation interfaces
- **[Workflow Engine](../workflow-engine/CLAUDE.md)** - Execution patterns
- **[Memory Module](../memory/CLAUDE.md)** - Context management
- **[Ecosystem Overview](../../CLAUDE.md)** - Full module ecosystem

## 🏷️ Version

**v0.0.1** - Enterprise checkpoint management with automagical configuration and comprehensive monitoring.

---

**Built for Enterprise AI** | **Automagical Configuration** | **Production-Grade Reliability**
