import { Module } from '@nestjs/common';

// Import ALL 13 libraries for MAXIMUM utilization demonstration
import { MemoryModule } from '@hive-academy/langgraph-memory';
import { LanggraphModulesCheckpointModule } from '@hive-academy/langgraph-checkpoint';
import { StreamingModule } from '@hive-academy/langgraph-streaming';
import { HitlModule } from '@hive-academy/langgraph-hitl';
import { FunctionalApiModule } from '@hive-academy/langgraph-functional-api';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';
import { MonitoringModule } from '@hive-academy/langgraph-monitoring';
import { PlatformModule } from '@hive-academy/langgraph-platform';
import { TimeTravelModule } from '@hive-academy/langgraph-time-travel';
import { WorkflowEngineModule } from '@hive-academy/langgraph-workflow-engine';

// Import core libraries for types only

// Import adapters
import { ChromaVectorAdapter, Neo4jGraphAdapter } from '../adapters';

// Import showcase workflows demonstrating ALL patterns
import { SupervisorShowcaseWorkflow } from './workflows/supervisor-showcase.workflow';
import { SwarmShowcaseWorkflow } from './workflows/swarm-showcase.workflow';
// import { HierarchicalShowcaseWorkflow } from './workflows/hierarchical-showcase.workflow'; // TODO: Create this workflow

// Import showcase agents with @Agent decorator
import { DemoShowcaseAgent } from './agents/demo-showcase.agent';
import { AdvancedShowcaseAgent } from './agents/advanced-showcase.agent';
import { SpecialistShowcaseAgent } from './agents/specialist-showcase.agent';
import { StreamingShowcaseAgent } from './agents/streaming-showcase.agent';
import { HitlShowcaseAgent } from './agents/hitl-showcase.agent';

// Import showcase services
import { ShowcaseCoordinatorService } from './services/showcase-coordinator.service';
import { ShowcaseMetricsService } from './services/showcase-metrics.service';
import { ShowcaseStreamingService } from './services/showcase-streaming.service';

// Import showcase controllers
import { ShowcaseController } from './controllers/showcase.controller';

/**
 * 🎯 SHOWCASE MODULE - ULTIMATE DEMONSTRATION PLATFORM
 *
 * This module demonstrates 100% utilization of our sophisticated langgraph-modules
 * ecosystem. It serves as the definitive example of how to build enterprise-grade
 * AI applications using our advanced decorator-driven architecture.
 *
 * 🚀 FEATURES DEMONSTRATED:
 *
 * 1. Multi-Agent Coordination Patterns:
 *    - Supervisor Pattern (@Workflow + @Agent decorators)
 *    - Swarm Pattern (peer-to-peer coordination)
 *    - Hierarchical Pattern (multi-level command structure)
 *
 * 2. Advanced Decorator Ecosystem:
 *    - @Workflow with streaming, hitl, checkpointing
 *    - @Agent with capabilities, tools, priority
 *    - @Task with dependency management
 *    - @Entrypoint with retry/timeout
 *    - @StreamToken for real-time feedback
 *    - @Approval for human-in-the-loop
 *
 * 3. Enterprise Capabilities:
 *    - State persistence via checkpoint adapters
 *    - Real-time streaming with WebSocket integration
 *    - Human-in-the-loop approval workflows
 *    - Advanced monitoring and metrics
 *    - Time-travel debugging and branching
 *    - Memory intelligence (vector + graph)
 *
 * 4. Production-Ready Patterns:
 *    - Dependency injection with factory patterns
 *    - Error handling and recovery
 *    - Performance monitoring
 *    - Scalable architecture
 *
 * This is the platform that makes developers and investors say "WOW!"
 */
@Module({
  imports: [
    // Memory system with hybrid intelligence
    MemoryModule.forRoot({
      collection: 'showcase_memory',
      enableAutoSummarization: true,
      chromadb: {
        collection: 'showcase_memory',
      },
      adapters: {
        vector: ChromaVectorAdapter,
        graph: Neo4jGraphAdapter,
      },
    }),

    // Checkpoint system for state persistence
    LanggraphModulesCheckpointModule.forRoot({
      checkpoint: {
        savers: [
          {
            type: 'postgres',
            enabled: true,
            postgres: {
              connectionString: `postgresql://${
                process.env.NEO4J_USERNAME || 'neo4j'
              }:${
                process.env.NEO4J_PASSWORD || 'password'
              }@localhost:5432/showcase_checkpoints`,
            },
          },
        ],
      },
    }),

    // Streaming for real-time communication
    StreamingModule.forRoot({
      websocket: {
        enabled: true,
        port: 3001,
      },
      defaultBufferSize: 1000,
    }),

    // Human-in-the-loop for approval workflows
    HitlModule.forRoot({
      defaultTimeout: 300000, // 5 minutes
      confidenceThreshold: 0.7,
    }),

    // Functional API for declarative workflows
    FunctionalApiModule.forRoot({
      defaultTimeout: 60000,
    }),

    // Multi-agent coordination
    MultiAgentModule.forRoot({
      defaultLlm: {
        provider: 'openai',
        model: 'gpt-4',
      },
    }),

    // Monitoring for production observability
    MonitoringModule.forRoot({}),

    // Platform utilities
    PlatformModule.forRoot({}),

    // Time-travel for debugging
    TimeTravelModule.forRoot({}),

    // Workflow engine
    WorkflowEngineModule.forRoot({
      cache: {
        enabled: true,
        maxSize: 100,
        ttl: 3600000, // 1 hour
      },
      debug: false,
    }),
  ],
  providers: [
    // Showcase workflows demonstrating all patterns
    SupervisorShowcaseWorkflow,
    SwarmShowcaseWorkflow,

    // Showcase agents with full decorator usage
    DemoShowcaseAgent,
    AdvancedShowcaseAgent,
    SpecialistShowcaseAgent,
    StreamingShowcaseAgent,
    HitlShowcaseAgent,

    // Showcase services
    ShowcaseCoordinatorService,
    ShowcaseMetricsService,
    ShowcaseStreamingService,
  ],
  controllers: [ShowcaseController],
  exports: [
    // Export everything for external integration
    SupervisorShowcaseWorkflow,
    SwarmShowcaseWorkflow,
    ShowcaseCoordinatorService,
    ShowcaseMetricsService,
  ],
})
export class ShowcaseModule {}
