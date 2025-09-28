# Checkpoint Module - State Persistence Facade

## Real API Surface (Source Code Verified)

**Evidence-Based Documentation**: The following exports are verified through direct source code inspection.

### Core Service Exports (Facade Pattern)

```typescript
// NestJS Module
export { CheckpointModule } from '@hive-academy/langgraph-checkpoint';
export type { CheckpointModuleOptions } from '@hive-academy/langgraph-checkpoint';

// Core Services (SOLID Architecture - 8 Services)
export { CheckpointManagerService } from '@hive-academy/langgraph-checkpoint'; // Main facade
export { CheckpointSaverRegistry } from '@hive-academy/langgraph-checkpoint'; // User-provided savers
export { CheckpointRegistryService } from '@hive-academy/langgraph-checkpoint'; // Registry management
export { CheckpointPersistenceService } from '@hive-academy/langgraph-checkpoint'; // Storage operations
export { CheckpointMetricsService } from '@hive-academy/langgraph-checkpoint'; // Performance tracking
export { CheckpointCleanupService } from '@hive-academy/langgraph-checkpoint'; // Maintenance
export { CheckpointHealthService } from '@hive-academy/langgraph-checkpoint'; // Health monitoring
export { StateTransformerService } from '@hive-academy/langgraph-checkpoint'; // State transformations

// Integration Adapter
export { CheckpointManagerAdapter } from '@hive-academy/langgraph-checkpoint'; // Core interface implementation
```

### Interface Exports (Type-only)

```typescript
// Checkpoint Interfaces
export type { CheckpointInterface, CheckpointData, CheckpointMetadata, CheckpointQuery, CheckpointListOptions, CheckpointCleanupOptions, CheckpointSearchCriteria } from '@hive-academy/langgraph-checkpoint';

// Service Interfaces
export type { CheckpointManagerServiceInterface, CheckpointPersistenceServiceInterface, CheckpointRegistryServiceInterface, CheckpointMetricsServiceInterface, CheckpointCleanupServiceInterface, CheckpointHealthServiceInterface, StateTransformerServiceInterface } from '@hive-academy/langgraph-checkpoint';

// Saver Registry Interfaces
export type { CheckpointSaverRegistryInterface, CheckpointSaverOptions, RegisteredCheckpointSaver } from '@hive-academy/langgraph-checkpoint';

// State Management Interfaces
export type { StateSnapshot, StateTransformation, StateComparison, StateDifference, StateRecoveryOptions, StateValidationResult } from '@hive-academy/langgraph-checkpoint';
```

## Architecture Pattern: 8-Service Facade

**Real Implementation Pattern (from source code analysis)**:

```typescript
// CheckpointManagerService acts as facade coordinating 6 specialized services
@Injectable()
export class CheckpointManagerService implements CheckpointManagerServiceInterface {
  constructor(
    private readonly persistenceService: CheckpointPersistenceService, // Storage operations
    private readonly registryService: CheckpointRegistryService, // Registry management
    private readonly metricsService: CheckpointMetricsService, // Performance tracking
    private readonly cleanupService: CheckpointCleanupService, // Maintenance
    private readonly healthService: CheckpointHealthService, // Health monitoring
    private readonly stateTransformer: StateTransformerService // State transformations
  ) {}

  async saveCheckpoint(checkpoint: CheckpointInterface): Promise<void> {
    // Facade pattern - delegates to specialized services
    const transformedState = await this.stateTransformer.transform(checkpoint.state);
    const result = await this.persistenceService.save({
      ...checkpoint,
      state: transformedState,
    });

    // Update metrics and registry
    await Promise.all([this.metricsService.recordSave(checkpoint.id), this.registryService.register(checkpoint.id, checkpoint.metadata)]);

    return result;
  }
}
```

## Quick Start (Real Configuration)

### Installation & Setup

```bash
npm install @hive-academy/langgraph-checkpoint
```

### Module Configuration

```typescript
import { Module } from '@nestjs/common';
import { CheckpointModule, CheckpointModuleOptions } from '@hive-academy/langgraph-checkpoint';

@Module({
  imports: [
    CheckpointModule.forRoot({
      // Storage configuration
      storage: {
        type: 'redis', // or 'postgresql', 'memory', 'file'
        connectionOptions: {
          host: 'localhost',
          port: 6379,
          db: 0,
        },
      },

      // Cleanup configuration
      cleanup: {
        enabled: true,
        retentionDays: 30,
        cleanupInterval: '0 2 * * *', // Daily at 2 AM
      },

      // Metrics configuration
      metrics: {
        enabled: true,
        trackPerformance: true,
        enableHealthChecks: true,
      },

      // State transformation
      stateTransformation: {
        enabled: true,
        compression: true,
        encryption: false, // Enable in production
      },
    } satisfies CheckpointModuleOptions),
  ],
})
export class AppModule {}
```

## Real Usage Patterns

### Basic Checkpoint Operations

```typescript
import { CheckpointManagerService, CheckpointInterface, CheckpointQuery, CheckpointListOptions } from '@hive-academy/langgraph-checkpoint';

@Injectable()
export class ApplicationCheckpointService {
  constructor(private readonly checkpointManager: CheckpointManagerService) {}

  async saveWorkflowCheckpoint(workflowId: string, state: any): Promise<void> {
    const checkpoint: CheckpointInterface = {
      id: `${workflowId}-${Date.now()}`,
      workflowId,
      state,
      metadata: {
        timestamp: new Date(),
        version: '1.0.0',
        source: 'workflow-engine',
        tags: ['workflow', 'automatic'],
      },
    };

    await this.checkpointManager.saveCheckpoint(checkpoint);
  }

  async loadLatestCheckpoint(workflowId: string): Promise<CheckpointInterface | null> {
    const query: CheckpointQuery = {
      workflowId,
      orderBy: 'timestamp',
      order: 'desc',
      limit: 1,
    };

    const checkpoints = await this.checkpointManager.findCheckpoints(query);
    return checkpoints[0] || null;
  }

  async loadCheckpointHistory(workflowId: string, limit = 10): Promise<CheckpointInterface[]> {
    const options: CheckpointListOptions = {
      workflowId,
      limit,
      orderBy: 'timestamp',
      order: 'desc',
      includeMetadata: true,
    };

    return await this.checkpointManager.listCheckpoints(options);
  }
}
```

### State Management Integration

```typescript
import { StateTransformerService, StateSnapshot, StateTransformation, StateComparison } from '@hive-academy/langgraph-checkpoint';

@Injectable()
export class StateManagementService {
  constructor(private readonly stateTransformer: StateTransformerService) {}

  async createStateSnapshot(workflowId: string, currentState: any): Promise<StateSnapshot> {
    return await this.stateTransformer.createSnapshot({
      workflowId,
      state: currentState,
      timestamp: new Date(),
      metadata: {
        source: 'manual-snapshot',
        version: '1.0.0',
      },
    });
  }

  async compareStates(previousCheckpointId: string, currentState: any): Promise<StateComparison> {
    const previousCheckpoint = await this.checkpointManager.getCheckpoint(previousCheckpointId);

    if (!previousCheckpoint) {
      throw new Error(`Checkpoint ${previousCheckpointId} not found`);
    }

    return await this.stateTransformer.compareStates({
      previous: previousCheckpoint.state,
      current: currentState,
      includeMetadata: true,
      detailed: true,
    });
  }

  async applyStateTransformation(checkpointId: string, transformation: StateTransformation): Promise<any> {
    const checkpoint = await this.checkpointManager.getCheckpoint(checkpointId);

    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }

    return await this.stateTransformer.applyTransformation({
      state: checkpoint.state,
      transformation,
      validate: true,
    });
  }
}
```

### Registry and Metrics Integration

```typescript
import { CheckpointRegistryService, CheckpointMetricsService, CheckpointHealthService } from '@hive-academy/langgraph-checkpoint';

@Injectable()
export class CheckpointManagementService {
  constructor(private readonly registry: CheckpointRegistryService, private readonly metrics: CheckpointMetricsService, private readonly health: CheckpointHealthService) {}

  async getCheckpointMetrics(workflowId?: string): Promise<any> {
    if (workflowId) {
      return await this.metrics.getWorkflowMetrics(workflowId);
    }

    return await this.metrics.getGlobalMetrics();
  }

  async getRegistryStats(): Promise<any> {
    return await this.registry.getStatistics();
  }

  async performHealthCheck(): Promise<any> {
    return await this.health.performHealthCheck();
  }

  async findCheckpointsByTag(tag: string): Promise<CheckpointInterface[]> {
    return await this.registry.findByTag(tag);
  }

  async findCheckpointsByDateRange(startDate: Date, endDate: Date): Promise<CheckpointInterface[]> {
    return await this.registry.findByDateRange(startDate, endDate);
  }
}
```

### Cleanup and Maintenance

```typescript
import { CheckpointCleanupService, CheckpointCleanupOptions } from '@hive-academy/langgraph-checkpoint';

@Injectable()
export class CheckpointMaintenanceService {
  constructor(private readonly cleanup: CheckpointCleanupService) {}

  async performRoutineCleanup(): Promise<void> {
    const options: CheckpointCleanupOptions = {
      retentionDays: 30,
      maxCheckpointsPerWorkflow: 100,
      deleteOrphaned: true,
      compressOld: true,
      dryRun: false,
    };

    await this.cleanup.performCleanup(options);
  }

  async cleanupWorkflow(workflowId: string, keepLatest = 5): Promise<void> {
    const options: CheckpointCleanupOptions = {
      workflowId,
      maxCheckpointsPerWorkflow: keepLatest,
      deleteOrphaned: false,
      dryRun: false,
    };

    await this.cleanup.performCleanup(options);
  }

  async getCleanupStats(): Promise<any> {
    return await this.cleanup.getCleanupStatistics();
  }
}
```

### Core Interface Implementation (Adapter Pattern)

```typescript
import { CheckpointManagerAdapter, ICheckpointAdapter } from '@hive-academy/langgraph-checkpoint';
import { ICheckpointAdapter as CoreICheckpointAdapter } from '@hive-academy/langgraph-core';

@Injectable()
export class CoreIntegrationService {
  constructor(private readonly checkpointManager: CheckpointManagerService) {}

  createCoreAdapter(): CoreICheckpointAdapter {
    // CheckpointManagerAdapter implements the core interface
    return new CheckpointManagerAdapter(this.checkpointManager);
  }

  async setupWorkflowWithCheckpoints(workflowDefinition: any): Promise<any> {
    const checkpointAdapter = this.createCoreAdapter();

    return {
      ...workflowDefinition,
      checkpointing: {
        enabled: true,
        adapter: checkpointAdapter,
        saveOnEachStep: true,
        maxCheckpoints: 50,
      },
    };
  }
}
```

### Saver Registry Pattern

```typescript
import { CheckpointSaverRegistry, CheckpointSaverOptions, RegisteredCheckpointSaver } from '@hive-academy/langgraph-checkpoint';

@Injectable()
export class CustomCheckpointSaverService {
  constructor(private readonly saverRegistry: CheckpointSaverRegistry) {}

  async registerCustomSaver(): Promise<void> {
    const customSaver: RegisteredCheckpointSaver = {
      id: 'custom-database-saver',
      name: 'Custom Database Checkpoint Saver',

      async save(checkpoint: CheckpointInterface): Promise<void> {
        // Custom implementation for saving to your database
        await this.customDatabaseSave(checkpoint);
      },

      async load(checkpointId: string): Promise<CheckpointInterface | null> {
        // Custom implementation for loading from your database
        return await this.customDatabaseLoad(checkpointId);
      },

      async list(options: CheckpointListOptions): Promise<CheckpointInterface[]> {
        // Custom implementation for listing from your database
        return await this.customDatabaseList(options);
      },

      async delete(checkpointId: string): Promise<void> {
        // Custom implementation for deleting from your database
        await this.customDatabaseDelete(checkpointId);
      },
    };

    const options: CheckpointSaverOptions = {
      priority: 1,
      enabled: true,
      autoRegister: true,
    };

    await this.saverRegistry.register(customSaver, options);
  }

  private async customDatabaseSave(checkpoint: CheckpointInterface): Promise<void> {
    // Your custom database save logic
  }

  private async customDatabaseLoad(checkpointId: string): Promise<CheckpointInterface | null> {
    // Your custom database load logic
    return null;
  }

  private async customDatabaseList(options: CheckpointListOptions): Promise<CheckpointInterface[]> {
    // Your custom database list logic
    return [];
  }

  private async customDatabaseDelete(checkpointId: string): Promise<void> {
    // Your custom database delete logic
  }
}
```

## Testing (Real Integration)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CheckpointModule, CheckpointManagerService, CheckpointInterface, CheckpointModuleOptions } from '@hive-academy/langgraph-checkpoint';

describe('Checkpoint Module Integration', () => {
  let checkpointManager: CheckpointManagerService;
  let module: TestingModule;

  beforeEach(async () => {
    const moduleOptions: CheckpointModuleOptions = {
      storage: {
        type: 'memory',
      },
      cleanup: {
        enabled: false,
      },
      metrics: {
        enabled: true,
        trackPerformance: false,
      },
    };

    module = await Test.createTestingModule({
      imports: [CheckpointModule.forRoot(moduleOptions)],
    }).compile();

    checkpointManager = module.get<CheckpointManagerService>(CheckpointManagerService);
  });

  it('should save and load checkpoints', async () => {
    const checkpoint: CheckpointInterface = {
      id: 'test-checkpoint-1',
      workflowId: 'test-workflow',
      state: {
        step: 1,
        data: { message: 'Hello World' },
      },
      metadata: {
        timestamp: new Date(),
        version: '1.0.0',
        source: 'test',
      },
    };

    await checkpointManager.saveCheckpoint(checkpoint);

    const loaded = await checkpointManager.getCheckpoint('test-checkpoint-1');

    expect(loaded).toBeDefined();
    expect(loaded?.id).toBe('test-checkpoint-1');
    expect(loaded?.workflowId).toBe('test-workflow');
    expect(loaded?.state.step).toBe(1);
  });

  it('should list checkpoints by workflow', async () => {
    // Save multiple checkpoints
    for (let i = 1; i <= 3; i++) {
      await checkpointManager.saveCheckpoint({
        id: `test-checkpoint-${i}`,
        workflowId: 'test-workflow',
        state: { step: i },
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
        },
      });
    }

    const checkpoints = await checkpointManager.listCheckpoints({
      workflowId: 'test-workflow',
      limit: 10,
    });

    expect(checkpoints).toHaveLength(3);
    expect(checkpoints.every((cp) => cp.workflowId === 'test-workflow')).toBe(true);
  });
});
```

## Configuration Reference

```typescript
interface CheckpointModuleOptions {
  storage: {
    type: 'redis' | 'postgresql' | 'memory' | 'file';
    connectionOptions?: any;
  };
  cleanup?: {
    enabled: boolean;
    retentionDays: number;
    cleanupInterval?: string;
    maxCheckpointsPerWorkflow?: number;
  };
  metrics?: {
    enabled: boolean;
    trackPerformance?: boolean;
    enableHealthChecks?: boolean;
  };
  stateTransformation?: {
    enabled: boolean;
    compression?: boolean;
    encryption?: boolean;
  };
}

interface CheckpointInterface {
  id: string;
  workflowId: string;
  state: any;
  metadata: CheckpointMetadata;
}

interface CheckpointMetadata {
  timestamp: Date;
  version: string;
  source?: string;
  tags?: string[];
  [key: string]: any;
}

interface CheckpointQuery {
  workflowId?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  orderBy?: 'timestamp' | 'id';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
```

## Dependencies (from package.json)

```json
{
  "dependencies": {
    "@hive-academy/langgraph-core": "workspace:*",
    "@nestjs/common": "^11.0.0"
  }
}
```

## Navigation

- **Foundation**: [Core](../core/CLAUDE.md)
- **Integration**: [Memory](../memory/CLAUDE.md) | [Workflow-Engine](../workflow-engine/CLAUDE.md)
- **Agent Systems**: [Multi-Agent](../multi-agent/CLAUDE.md) | [HITL](../hitl/CLAUDE.md)
- **Production**: [Monitoring](../monitoring/CLAUDE.md) | [Platform](../platform/CLAUDE.md) | [Time-Travel](../time-travel/CLAUDE.md)
