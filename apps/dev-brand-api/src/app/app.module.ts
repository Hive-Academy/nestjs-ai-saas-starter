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
import {
  StreamingModule,
  StreamingServiceAdapter,
} from '@hive-academy/langgraph-streaming';
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
 * Demo Application Module - Showcasing Optional Checkpoint & Streaming DI Pattern
 *
 * This module demonstrates the new dependency injection patterns for optional
 * checkpoint and streaming integration across consumer libraries. It showcases:
 *
 * CHECKPOINT SCENARIOS:
 * - SCENARIO A: Checkpoint-enabled libraries (forRootAsync + CheckpointManagerAdapter)
 * - SCENARIO B: Checkpoint-disabled libraries (forRoot, defaults to NoOpCheckpointAdapter)
 *
 * STREAMING SCENARIOS:
 * - SCENARIO A: Streaming-enabled modules (forRootAsync + StreamingServiceAdapter)
 * - SCENARIO B: Streaming-disabled modules (forRoot, defaults to NoOpStreamingService)
 *
 * Benefits of this pattern:
 * - Optional dependencies: checkpoint/streaming functionality not required for basic operation
 * - Backward compatibility: existing code works without changes
 * - Flexible deployment: enable/disable features per environment
 * - Clear separation: concerns isolated to adapter layers
 * - Type safety: Full TypeScript support for all scenarios
 * - Zero overhead: no-op implementations when features are disabled
 *
 * Dependencies flow:
 * library → core ← checkpoint (optional) ← streaming (optional)
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

    // ═══════════════════════════════════════════════════════════════
    // STREAMING MODULE: Configure streaming services at application level
    // ═══════════════════════════════════════════════════════════════
    // This provides StreamingServiceAdapter for dependency injection
    StreamingModule.forRoot({
      ...getStreamingConfig(),
      websocket: { enabled: true, port: 8080 },
      gateway: { enabled: true, cors: true },
    }),
    HitlModule.forRoot(getHitlConfig()),

    // 🔥 CHECKPOINT & STREAMING INTEGRATION DEMO: Showcasing all scenarios

    // ═══════════════════════════════════════════════════════════════
    // SCENARIO A: STREAMING-ENABLED MODULES
    // ═══════════════════════════════════════════════════════════════
    // Pattern: forRootAsync + StreamingServiceAdapter injection
    // Behavior: Real-time streaming with WebSocket integration
    // Use case: Production workflows requiring real-time updates

    WorkflowEngineModule.forRootAsync({
      useFactory: async (...args: unknown[]) => {
        const streamingAdapter = args[0] as StreamingServiceAdapter;
        return {
          ...getWorkflowEngineConfig(),
          streamingAdapter, // Key injection!
        };
      },
      inject: [StreamingServiceAdapter],
      // Result: STREAMING_SERVICE_TOKEN = StreamingServiceAdapter instance
      // Enables: Real-time token streaming, event broadcasting, progress updates
    }),

    MultiAgentModule.forRootAsync({
      useFactory: async (...args: unknown[]) => {
        const streamingAdapter = args[0] as StreamingServiceAdapter;
        const checkpointManager = args[1] as CheckpointManagerService;
        return {
          ...getMultiAgentConfig(),
          streamingAdapter, // Enable streaming for multi-agent coordination
          checkpointAdapter: new CheckpointManagerAdapter(checkpointManager), // Also enable checkpointing
        };
      },
      inject: [StreamingServiceAdapter, CheckpointManagerService],
      // Result: STREAMING_SERVICE_TOKEN = StreamingServiceAdapter instance
      // Enables: Agent conversation streaming, coordination events, progress tracking
    }),

    // ═══════════════════════════════════════════════════════════════
    // SCENARIO B: CHECKPOINT-ENABLED (STREAMING-DISABLED) MODULES
    // ═══════════════════════════════════════════════════════════════
    // Pattern: forRootAsync + CheckpointManagerAdapter only
    // Behavior: Persistent state without streaming overhead
    // Use case: Background processing, batch workflows

    FunctionalApiModule.forRootAsync({
      useFactory: async (...args: unknown[]) => {
        const checkpointManager = args[0] as CheckpointManagerService;
        return {
          ...getFunctionalApiConfig(),
          checkpointAdapter: new CheckpointManagerAdapter(checkpointManager),
          // No streamingAdapter = defaults to NoOpStreamingService
        };
      },
      inject: [CheckpointManagerService],
      // Result: CHECKPOINT_ADAPTER_TOKEN = CheckpointManagerAdapter instance
      // Result: STREAMING_SERVICE_TOKEN = NoOpStreamingService (default)
      // Enables: Workflow state persistence without streaming overhead
    }),

    TimeTravelModule.forRootAsync({
      useFactory: async (...args: unknown[]) => {
        const checkpointManager = args[0] as CheckpointManagerService;
        return {
          ...getTimeTravelConfig(),
          checkpointAdapter: new CheckpointManagerAdapter(checkpointManager),
          // No streamingAdapter = defaults to NoOpStreamingService
        };
      },
      inject: [CheckpointManagerService],
      // Result: CHECKPOINT_ADAPTER_TOKEN = CheckpointManagerAdapter instance
      // Result: STREAMING_SERVICE_TOKEN = NoOpStreamingService (default)
      // Enables: Timeline branching, state snapshots without streaming overhead
    }),

    // ═══════════════════════════════════════════════════════════════
    // SCENARIO C: STREAMING-DISABLED MODULES
    // ═══════════════════════════════════════════════════════════════
    // Pattern: forRoot without streamingAdapter
    // Behavior: No streaming overhead, basic execution only
    // Use case: Lightweight deployments, batch processing

    MonitoringModule.forRoot(getMonitoringConfig()),
    // Result: STREAMING_SERVICE_TOKEN = NoOpStreamingService (implicit)
    // Result: CHECKPOINT_ADAPTER_TOKEN = NoOpCheckpointAdapter (implicit)
    // Behavior: Metrics collection without streaming or checkpoint overhead

    PlatformModule.forRoot(getPlatformConfig()),
    // Result: STREAMING_SERVICE_TOKEN = NoOpStreamingService (implicit)
    // Result: CHECKPOINT_ADAPTER_TOKEN = NoOpCheckpointAdapter (implicit)
    // Behavior: Platform operations without feature overhead

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
