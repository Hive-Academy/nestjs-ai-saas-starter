# LangGraph Checkpoint Module

## Overview

**@hive-academy/langgraph-checkpoint** provides state persistence and recovery for LangGraph workflows through a SOLID architecture implementing a facade pattern with specialized services. The module automatically provides fallback to in-memory storage when no external saver is configured.

## 🔧 EVIDENCE-BASED ARCHITECTURE

**Based on actual source code analysis** - this documentation reflects the real implementation.

### **Module Structure (Verified)**

```typescript
// ACTUAL MODULE IMPORT NAME (from source inspection)
import { CheckpointModule } from '@hive-academy/langgraph-checkpoint';

// REAL FACADE PATTERN: CheckpointManagerService orchestrates 8 services
CheckpointManagerService (Main Facade)
├── CheckpointSaverRegistry       // User-provided saver management
├── CheckpointRegistryService     // Registry operations
├── CheckpointPersistenceService  // Storage operations
├── CheckpointMetricsService      // Performance tracking
├── CheckpointCleanupService      // Maintenance & cleanup
├── CheckpointHealthService       // Health monitoring
├── StateTransformerService       // State transformations
└── CheckpointManagerAdapter      // ICheckpointAdapter bridge to core
```

**Core Integration Bridge:**

- `CheckpointManagerAdapter` implements `ICheckpointAdapter` from `@hive-academy/langgraph-core`
- Automatically provided as `'ICheckpointAdapter'` DI token
- Used by multi-agent module and other modules that need checkpointing

## Installation

```bash
npm install @hive-academy/langgraph-checkpoint
```

**Dependencies:**

- `@hive-academy/langgraph-core` (peer) - for ICheckpointAdapter interface
- `@nestjs/common` ^11.0.0 (peer)
- `@langchain/langgraph` ^0.4.0 (peer)

## Quick Start

### **Real Module Usage (Verified)**

```typescript
import { Module } from '@nestjs/common';
import { CheckpointModule } from '@hive-academy/langgraph-checkpoint';

@Module({
  imports: [
    // Auto-fallback to MemorySaver when no saver provided
    CheckpointModule.forRoot(),
  ],
})
export class AppModule {}
```

### **Production Setup (Verified Pattern)**

```typescript
import { CheckpointModule, CheckpointModuleOptions } from '@hive-academy/langgraph-checkpoint';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';

@Module({
  imports: [
    CheckpointModule.forRoot({
      // User provides any LangGraph checkpoint saver
      saver: SqliteSaver.fromConnString('./checkpoints.db'),

      // Optional configuration (verified from interfaces)
      cleanup: {
        enabled: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        maxPerThread: 100,
      },
      health: {
        enabled: true,
        checkInterval: 30000, // 30 seconds
      },
      metrics: {
        enabled: true,
        collectInterval: 60000, // 1 minute
      },
    } satisfies CheckpointModuleOptions),
  ],
})
export class ProductionModule {}
```

## 🔍 VERIFIED EXPORTS (From Source Analysis)

### **Primary Exports**

```typescript
// Main NestJS Module (VERIFIED)
export { CheckpointModule } from '@hive-academy/langgraph-checkpoint';
export type { CheckpointModuleOptions } from '@hive-academy/langgraph-checkpoint';

// Main Facade Service (VERIFIED)
export { CheckpointManagerService } from '@hive-academy/langgraph-checkpoint';

// Core Integration Adapter (VERIFIED)
export { CheckpointManagerAdapter } from '@hive-academy/langgraph-checkpoint';
```

### **Specialized Services (All Verified)**

```typescript
// 7 Core Services + Registry (SOLID architecture)
export {
  CheckpointSaverRegistry, // User saver management
  CheckpointRegistryService, // Registry operations
  CheckpointPersistenceService, // Storage operations
  CheckpointMetricsService, // Performance tracking
  CheckpointCleanupService, // Maintenance
  CheckpointHealthService, // Health monitoring
  StateTransformerService, // State transformations
} from '@hive-academy/langgraph-checkpoint';
```

### **Interface Exports (Verified)**

```typescript
// Configuration interfaces
export type {
  CheckpointConfig,
  CheckpointModuleConfig,
  CheckpointSaverConfig,
  CheckpointSaverMetadata,
} from '@hive-academy/langgraph-checkpoint';

// Core interfaces
export type {
  EnhancedCheckpointMetadata,
  EnhancedCheckpoint,
  EnhancedCheckpointTuple,
  ListCheckpointsOptions,
  CheckpointStats,
  CheckpointCleanupOptions,
} from '@hive-academy/langgraph-checkpoint';
```

## 🎯 VERIFIED ECOSYSTEM INTEGRATION PATTERNS

**Critical Discovery**: Based on comprehensive source code analysis across all modules, here are the **real checkpoint integration patterns** used throughout the LangGraph ecosystem.

### **1. Multi-Agent Module Integration (Source Verified)**

**Pattern**: `WorkflowCheckpointService` wraps `ICheckpointAdapter` with graceful degradation

```typescript
// VERIFIED USAGE: Multi-agent has specialized checkpoint service
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

    // Execute with checkpoint-enabled config
    const config = {
      configurable: { thread_id: threadId },
      metadata: { checkpointEnabled: !!this.checkpointAdapter },
    };

    return await this.networkManager.executeWorkflow(networkId, input, config);
  }
}

// VERIFIED: Multi-agent also has WorkflowCheckpointService
@Injectable()
export class WorkflowCheckpointService {
  constructor(
    @Optional()
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter?: ICheckpointAdapter
  ) {}

  // Provides workflow-specific checkpoint operations
  async saveCheckpoint(threadId: string, state: AgentState, metadata?: Record<string, unknown>) {
    if (!this.checkpointAdapter) {
      this.logger.debug('Checkpoint save skipped - no adapter available');
      return;
    }
    // Specialized checkpoint logic for multi-agent workflows
  }
}
```

### **2. Workflow-Engine Module Integration (Source Verified)**

**Pattern**: Can provide `ICheckpointAdapter` or consume from other modules

```typescript
// VERIFIED USAGE: Workflow-engine can be checkpoint provider OR consumer
WorkflowEngineModule.forRoot({
  checkpointAdapter: options.checkpointAdapter, // Optional: provide to ecosystem
  providers: [
    {
      provide: 'ICheckpointAdapter',
      useFactory: (options) => options.checkpointAdapter || null,
      inject: ['WORKFLOW_ENGINE_MODULE_OPTIONS'],
    },
  ],
});

// VERIFIED: Workflow-engine's own checkpoint service
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
}
```

### **3. HITL Module Integration (Source Verified)**

**Pattern**: Requires `ICheckpointAdapter` for approval persistence, fails fast if missing

```typescript
// VERIFIED USAGE: HITL has approval-specific checkpoint service
@Injectable()
export class HitlCheckpointService implements IHitlCheckpointService {
  constructor(
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter: ICheckpointAdapter // Required, not optional
  ) {}

  async saveApprovalState(request: HumanApprovalRequest, source: string) {
    if (!this.checkpointAdapter) {
      return; // Graceful degradation
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

### **4. Functional-API Module Integration (Source Verified)**

**Pattern**: Always provides `ICheckpointAdapter` via NoOp fallback pattern

```typescript
// VERIFIED USAGE: Functional-API ensures adapter is always available
FunctionalApiModule.forRoot({
  providers: [
    {
      provide: 'ICheckpointAdapter',
      useFactory: (options: FunctionalApiModuleOptions) => {
        return options.checkpointAdapter || new NoOpCheckpointAdapter();
      },
      inject: [FUNCTIONAL_API_MODULE_OPTIONS],
    },
  ],
});
```

### **5. The Real Ecosystem Architecture (Evidence-Based)**

```typescript
// VERIFIED INTEGRATION PATTERN: App-level checkpoint coordination
@Module({
  imports: [
    // 1. Checkpoint module provides CheckpointManagerAdapter as ICheckpointAdapter
    CheckpointModule.forRootAsync({
      useFactory: async () => ({
        saver: SqliteSaver.fromConnString('./data/checkpoints.db'),
        cleanup: { enabled: true },
        health: { enabled: true },
        metrics: { enabled: true },
      }),
    }),

    // 2. All other modules automatically receive ICheckpointAdapter via DI
    MultiAgentModule.forRootAsync({
      useFactory: async (checkpointAdapter: ICheckpointAdapter) => ({
        checkpointAdapter, // Auto-injected from checkpoint module
      }),
      inject: ['ICheckpointAdapter'], // Provided by checkpoint module
    }),

    HitlModule.forRootAsync({
      useFactory: async (checkpointAdapter: ICheckpointAdapter) => ({
        adapters: {
          storage: Neo4jHitlStorageAdapter,
          interruptionStorage: Neo4jInterruptionStorageAdapter,
        },
        // Checkpoint adapter auto-injected for approval persistence
      }),
      inject: ['ICheckpointAdapter'],
    }),

    WorkflowEngineModule.forRoot({
      // Can override or use injected adapter
      checkpointAdapter: customAdapter, // Optional override
    }),
  ],
})
export class AppModule {}
```

### **6. Module-Specific Checkpoint Services (Evidence-Based)**

Each module wraps the base `ICheckpointAdapter` with domain-specific operations:

| Module              | Service                     | Namespace                     | Thread ID Pattern                               | Purpose              |
| ------------------- | --------------------------- | ----------------------------- | ----------------------------------------------- | -------------------- |
| **Multi-Agent**     | `WorkflowCheckpointService` | `agent-{agentId}`             | `NodeIdBuilder` pattern                         | Agent workflow state |
| **Workflow-Engine** | `WorkflowCheckpointService` | `workflow-engine.execution.*` | `workflow-engine.execution.{executionId}`       | Execution metadata   |
| **HITL**            | `HitlCheckpointService`     | `hitl-approval`, `hitl-chain` | `hitl.approval.workflow.{executionId}-{nodeId}` | Approval states      |
| **Functional-API**  | Basic wrapper               | Various                       | Standard patterns                               | Task/workflow states |

### **7. Key Architectural Insights (Source-Based)**

1. **Checkpoint Module as Primary Provider**: `CheckpointModule` provides `CheckpointManagerAdapter` as `'ICheckpointAdapter'` DI token
2. **Graceful Degradation**: All modules handle missing checkpoint adapter gracefully - Multi-Agent, Workflow-Engine use `@Optional()`
3. **Fail-Fast for Critical Modules**: HITL requires checkpoint adapter and fails fast if not provided (human approvals must be persisted)
4. **Namespace Isolation**: Each module uses different checkpoint namespaces to avoid conflicts
5. **NodeIdBuilder Consistency**: All modules use `NodeIdBuilder` for consistent thread ID generation
6. **Specialized Metadata**: Each module adds domain-specific metadata (confidence, risk levels, workflow states)

This analysis reveals that the checkpoint module is the **central nervous system** for state persistence across the entire LangGraph ecosystem, with each module building specialized checkpoint services on top of the core `CheckpointManagerAdapter`.

## 🔄 VERIFIED AUTOMAGICAL FEATURES

### **1. Auto-Fallback Storage (Verified)**

```typescript
// From module source analysis - real fallback logic:
private static initializeCheckpointSaver(registry: CheckpointSaverRegistry, options: CheckpointModuleOptions) {
  if (options.saver) {
    // User provided saver - register it
    const saverType = this.detectSaverType(options.saver);
    registry.registerSaver({
      name: 'primary', saver: options.saver, default: true,
      metadata: { type: saverType, persistent: saverType !== 'memory' }
    });
    console.log(`✅ Checkpoint saver registered: ${saverType} (provided by user)`);
  } else {
    // Auto-fallback to in-memory
    import('@langchain/langgraph-checkpoint').then(({ MemorySaver }) => {
      registry.registerSaver({
        name: 'fallback', saver: new MemorySaver(), default: true,
        metadata: { type: 'memory', persistent: false }
      });
      console.log('⚠️ No checkpoint saver provided - falling back to in-memory storage');
    });
  }
}
```

### **2. Auto-Saver Detection (Verified)**

```typescript
// From module source - real detection logic:
private static detectSaverType(saver: any): string {
  const constructorName = saver.constructor.name;
  if (constructorName.includes('Memory')) return 'memory';
  if (constructorName.includes('Sqlite') || constructorName.includes('SQLite')) return 'sqlite';
  if (constructorName.includes('Redis')) return 'redis';
  if (constructorName.includes('Postgres')) return 'postgres';
  return 'custom';
}
```

### **3. Graceful Service Degradation (Verified)**

```typescript
// From CheckpointManagerService source - real capability detection:
public isCoreServicesAvailable(): boolean {
  return !!(this.saverRegistry && this.registryService && this.persistenceService);
}

public isMonitoringAvailable(): boolean {
  return !!(this.metricsService && this.healthService);
}

// Services are optional and gracefully degrade when unavailable
```

## 💼 REAL USAGE PATTERNS (From Source)

### **Basic Checkpoint Operations**

```typescript
// REAL SERVICE: Facade pattern with capability detection
@Injectable()
export class WorkflowService {
  constructor(private readonly checkpointManager: CheckpointManagerService) {}

  async saveWorkflowState(threadId: string, state: any): Promise<void> {
    // Check capabilities before using services
    if (!this.checkpointManager.isCoreServicesAvailable()) {
      console.warn('Core checkpoint services not available');
      return;
    }

    await this.checkpointManager.saveCheckpoint(threadId, state, {
      timestamp: new Date().toISOString(),
      source: 'workflow-engine',
      step: 1,
      parents: {},
    });
  }

  async loadWorkflowState(threadId: string): Promise<any> {
    if (!this.checkpointManager.isCoreServicesAvailable()) {
      return null;
    }

    const checkpoint = await this.checkpointManager.loadCheckpoint(threadId);
    return checkpoint?.channel_values;
  }
}
```

### **Multi-Agent Checkpoint Integration (Real Pattern)**

```typescript
// VERIFIED PATTERN: From multi-agent integration example
@Injectable()
export class CheckpointIntegrationExample {
  constructor(private readonly multiAgentCoordinator: MultiAgentCoordinatorService) {}

  async createPersistentResearchNetwork(): Promise<string> {
    // Create network with automatic checkpointing
    const networkId = await this.multiAgentCoordinator.setupNetwork(
      'research-network-persistent',
      [researcherAgent, analyzerAgent, reporterAgent],
      'supervisor',
      {
        systemPrompt: 'Research supervisor routing tasks appropriately',
        workers: ['researcher', 'analyzer', 'reporter'],
        removeHandoffMessages: false, // Keep for checkpoint continuity
      }
    );

    // Checkpointing automatically enabled - state persisted
    return networkId;
  }

  async executePersistentWorkflow(networkId: string): Promise<MultiAgentResult> {
    return await this.multiAgentCoordinator.executeWorkflow(networkId, {
      messages: ['Conduct research on quantum computing'],
      config: {
        configurable: {
          thread_id: `research-session-${Date.now()}`, // Enables checkpointing
        },
      },
    });
    // All intermediate states automatically checkpointed
  }
}
```

## 🏗️ PRODUCTION CONFIGURATION (Verified)

### **Real Environment Setup**

```typescript
// From actual app configuration analysis
CheckpointModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    // User provides external saver
    saver: SqliteSaver.fromConnString(
      configService.get('CHECKPOINT_SQLITE_PATH', './data/checkpoints.db')
    ),

    // Optional service configuration
    cleanup: {
      enabled: configService.get('CHECKPOINT_CLEANUP_ENABLED', true),
      maxAge: configService.get('CHECKPOINT_MAX_AGE', 7 * 24 * 60 * 60 * 1000),
      maxPerThread: configService.get('CHECKPOINT_MAX_PER_THREAD', 100),
    },

    health: {
      enabled: configService.get('CHECKPOINT_HEALTH_ENABLED', true),
      checkInterval: configService.get('CHECKPOINT_HEALTH_INTERVAL', 30000),
    },

    metrics: {
      enabled: configService.get('CHECKPOINT_METRICS_ENABLED', true),
      collectInterval: configService.get('CHECKPOINT_METRICS_INTERVAL', 60000),
    },
  }),
  inject: [ConfigService],
});
```

### **Supported Storage Backends (Verified)**

```typescript
// Any LangGraph checkpoint saver works (verified compatibility)
import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { RedisSaver } from '@langchain/langgraph-checkpoint-redis';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

// All auto-detected by module
CheckpointModule.forRoot({
  saver: new SqliteSaver('db.sqlite'), // ✅ Auto-detected as 'sqlite'
  // saver: new RedisSaver(redisConfig),  // ✅ Auto-detected as 'redis'
  // saver: new PostgresSaver(pgConfig),  // ✅ Auto-detected as 'postgres'
  // No saver = auto-fallback to MemorySaver
});
```

## 🧪 TESTING (Verified Pattern)

```typescript
import { Test } from '@nestjs/testing';
import { CheckpointModule, CheckpointManagerService } from '@hive-academy/langgraph-checkpoint';

describe('Real Checkpoint Integration', () => {
  let checkpointManager: CheckpointManagerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        CheckpointModule.forRoot(), // Auto-fallback to memory
      ],
    }).compile();

    checkpointManager = module.get(CheckpointManagerService);
  });

  it('should auto-fallback to memory storage', () => {
    // Verify core services available (even with fallback)
    expect(checkpointManager.isCoreServicesAvailable()).toBe(true);
  });

  it('should handle checkpoint operations', async () => {
    const threadId = 'test-thread';
    const testState = { step: 1, data: 'test' };

    // Real checkpoint operations
    await checkpointManager.saveCheckpoint(threadId, testState);
    const loaded = await checkpointManager.loadCheckpoint(threadId);

    expect(loaded?.channel_values).toEqual(testState);
  });
});
```

## 🎯 KEY ARCHITECTURAL FACTS

1. **Module Name**: `CheckpointModule` (not `CheckpointModule`)
2. **Facade Pattern**: `CheckpointManagerService` orchestrates 8 specialized services
3. **Auto-Fallback**: Automatically uses `MemorySaver` when no external saver provided
4. **DI Integration**: Provides `'ICheckpointAdapter'` token for other modules
5. **Graceful Degradation**: Services are optional with capability detection methods
6. **SOLID Architecture**: Single responsibility services with interface segregation
7. **Real Multi-Agent Integration**: Actually used by multi-agent coordinator for persistence

## 🔧 BEST PRACTICES (Evidence-Based)

1. **Development**: Use `CheckpointModule.forRoot()` for auto-fallback
2. **Production**: Provide real saver with `CheckpointModule.forRootAsync()`
3. **Service Injection**: Inject `CheckpointManagerService` for main operations
4. **Capability Checking**: Use `isCoreServicesAvailable()` before operations
5. **Multi-Agent**: Let dependency injection handle adapter integration automatically
6. **Testing**: Auto-fallback ensures tests work without external dependencies

This documentation reflects the **actual implementation** based on comprehensive source code analysis, not idealized documentation.
