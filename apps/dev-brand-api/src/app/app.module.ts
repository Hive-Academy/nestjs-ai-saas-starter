import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Library imports
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';

import { MemoryModule } from '@hive-academy/langgraph-memory';

// Import adapters from application layer - NOT from library
import { ChromaVectorAdapter, Neo4jGraphAdapter } from './adapters';

// Direct child module imports - Phase 3 Subtask 3.3: Modular configuration pattern
import {
  LanggraphModulesCheckpointModule,
  CheckpointManagerService,
  CheckpointManagerAdapter,
} from '@hive-academy/langgraph-checkpoint';
import { StreamingModule } from '@hive-academy/langgraph-streaming';
import { HitlModule } from '@hive-academy/langgraph-hitl';

// Additional LangGraph child modules for complete demo
import { FunctionalApiModule } from '@hive-academy/langgraph-functional-api';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';
import { MonitoringModule } from '@hive-academy/langgraph-monitoring';
import { PlatformModule } from '@hive-academy/langgraph-platform';
import { TimeTravelModule } from '@hive-academy/langgraph-time-travel';
import { WorkflowEngineModule } from '@hive-academy/langgraph-workflow-engine';

// Configuration imports
import { getChromaDBConfig } from './config/chromadb.config';
import { getNeo4jConfig } from './config/neo4j.config';
import { getCheckpointConfig } from './config/checkpoint.config';
import { getStreamingConfig } from './config/streaming.config';
import { getHitlConfig } from './config/hitl.config';

// Additional configuration functions for new modules
import { getMemoryConfig } from './config/memory.config';
import { getFunctionalApiConfig } from './config/functional-api.config';
import { getMultiAgentConfig } from './config/multi-agent.config';
import { getMonitoringConfig } from './config/monitoring.config';
import { getPlatformConfig } from './config/platform.config';
import { getTimeTravelConfig } from './config/time-travel.config';
import { getWorkflowEngineConfig } from './config/workflow-engine.config';

// Test services and controllers for child module verification
import { AdapterTestService } from './services/adapter-test.service';
import { AdapterTestController } from './controllers/adapter-test.controller';

// Checkpoint DI pattern demonstration
import { CheckpointExamplesService } from './services/checkpoint-examples.service';
import { CheckpointExamplesController } from './controllers/checkpoint-examples.controller';

// Health check imports for Phase 1 Subtask 1.3
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './controllers/health.controller';

// Showcase Module - Demonstrates decorator system power
import { ShowcaseModule } from './showcase/showcase.module';

/**
 * Demo Application Module - Showcasing Optional Checkpoint DI Pattern
 *
 * This module demonstrates the new dependency injection pattern for optional
 * checkpoint integration across consumer libraries. It showcases two scenarios:
 *
 * SCENARIO A: Checkpoint-enabled libraries
 * - Use forRootAsync() with CheckpointManagerAdapter injection
 * - Enable persistent state management and recovery capabilities
 * - Examples: FunctionalApiModule, MultiAgentModule, TimeTravelModule
 *
 * SCENARIO B: Checkpoint-disabled libraries
 * - Use forRoot() without checkpointAdapter (defaults to NoOpCheckpointAdapter)
 * - In-memory operation only, no persistent state
 * - Examples: MonitoringModule, PlatformModule, WorkflowEngineModule
 *
 * Benefits of this pattern:
 * - Optional dependency: checkpoint functionality not required for basic operation
 * - Backward compatibility: existing code works without changes
 * - Flexible deployment: enable/disable checkpointing per environment
 * - Clear separation: checkpoint concerns isolated to adapter layer
 * - Type safety: Full TypeScript support for both scenarios
 *
 * Dependencies flow:
 * library → core ← checkpoint (optional)
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // ChromaDB Module with extracted configuration
    ChromaDBModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) =>
        getChromaDBConfig(configService),
      inject: [ConfigService],
    }),

    // Neo4j Module with extracted configuration
    Neo4jModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getNeo4jConfig(configService),
    }),

    MemoryModule.forRoot({
      ...getMemoryConfig(),
      adapters: {
        vector: ChromaVectorAdapter, // Uses existing ChromaDB configuration
        graph: Neo4jGraphAdapter, // Uses existing Neo4j configuration
      },
    }),

    // Direct child module imports - Independent module usage
    // 🎯 CHECKPOINT MODULE: Configure checkpoint storage once at application level
    // This provides CheckpointManagerService for dependency injection into consumer libraries
    LanggraphModulesCheckpointModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async () => getCheckpointConfig(),
    }),

    // Other core modules (checkpoint-independent)
    StreamingModule.forRoot(getStreamingConfig()),
    HitlModule.forRoot(getHitlConfig()),

    // 🔥 CHECKPOINT INTEGRATION DEMO: Showcasing both scenarios

    // ═══════════════════════════════════════════════════════════════
    // SCENARIO A: CHECKPOINT-ENABLED MODULES
    // ═══════════════════════════════════════════════════════════════
    // Pattern: forRootAsync + CheckpointManagerAdapter injection
    // Behavior: Persistent state, automatic recovery, debugging capabilities
    // Use case: Production workflows requiring reliability and observability

    FunctionalApiModule.forRootAsync({
      useFactory: async (...args: unknown[]) => {
        const checkpointManager = args[0] as CheckpointManagerService;
        return {
          ...getFunctionalApiConfig(),
          checkpointAdapter: new CheckpointManagerAdapter(checkpointManager),
        };
      },
      inject: [CheckpointManagerService],
      // Result: CHECKPOINT_ADAPTER_TOKEN = CheckpointManagerAdapter instance
      // Enables: Workflow state persistence, step-by-step recovery, execution replay
    }),

    MultiAgentModule.forRootAsync({
      useFactory: async (...args: unknown[]) => {
        const checkpointManager = args[0] as CheckpointManagerService;
        return {
          ...getMultiAgentConfig(),
          checkpointAdapter: new CheckpointManagerAdapter(checkpointManager),
        };
      },
      inject: [CheckpointManagerService],
      // Result: CHECKPOINT_ADAPTER_TOKEN = CheckpointManagerAdapter instance
      // Enables: Agent network state, communication history, coordinated recovery
    }),

    TimeTravelModule.forRootAsync({
      useFactory: async (...args: unknown[]) => {
        const checkpointManager = args[0] as CheckpointManagerService;
        return {
          ...getTimeTravelConfig(),
          checkpointAdapter: new CheckpointManagerAdapter(checkpointManager),
        };
      },
      inject: [CheckpointManagerService],
      // Result: CHECKPOINT_ADAPTER_TOKEN = CheckpointManagerAdapter instance
      // Enables: Timeline branching, state snapshots, workflow debugging
    }),

    // ═══════════════════════════════════════════════════════════════
    // SCENARIO B: CHECKPOINT-DISABLED MODULES
    // ═══════════════════════════════════════════════════════════════
    // Pattern: forRoot without checkpointAdapter
    // Behavior: In-memory operation, no persistent state, faster execution
    // Use case: Development environments, lightweight deployments, monitoring-only

    MonitoringModule.forRoot(getMonitoringConfig()),
    // Result: CHECKPOINT_ADAPTER_TOKEN = NoOpCheckpointAdapter (implicit)
    // Behavior: Metrics collection without state persistence

    PlatformModule.forRoot(getPlatformConfig()),
    // Result: CHECKPOINT_ADAPTER_TOKEN = NoOpCheckpointAdapter (implicit)
    // Behavior: Platform operations without checkpoint overhead

    WorkflowEngineModule.forRoot(getWorkflowEngineConfig()),
    // Result: CHECKPOINT_ADAPTER_TOKEN = NoOpCheckpointAdapter (implicit)
    // Behavior: Basic workflow execution without state tracking

    // Health checks module for Phase 1 Subtask 1.3 - Configure without auto health indicator discovery
    TerminusModule.forRoot({
      logger: false, // Disable excessive logging
      errorLogStyle: 'pretty',
    }),

    // Showcase Module - Demonstrates the FULL POWER of our decorator system
    // This module shows how to create enterprise-grade AI agents with minimal code
    // using our plug-and-play decorator architecture
    ShowcaseModule,
  ],
  providers: [
    // Test service to verify child module service injection
    AdapterTestService,

    // Checkpoint DI pattern demonstration service
    CheckpointExamplesService,
  ],
  controllers: [
    // Test controller to expose child module verification endpoints
    AdapterTestController,

    // Checkpoint DI pattern demonstration controller
    CheckpointExamplesController,

    // Health check controller
    HealthController,
  ],
  exports: [],
})
export class AppModule {}
