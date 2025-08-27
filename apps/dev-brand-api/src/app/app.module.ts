import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Library imports
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';
import { DevbrandBackendFeatureModule } from '@devbrand/backend-feature';
import { NestjsLanggraphModule } from '@hive-academy/nestjs-langgraph';

import { MemoryModule } from '@hive-academy/nestjs-memory';

// Import adapters from application layer - NOT from library
import { ChromaVectorAdapter, Neo4jGraphAdapter } from './adapters';

// Direct child module imports - Phase 3 Subtask 3.3: Modular configuration pattern
import { LanggraphModulesCheckpointModule } from '@hive-academy/langgraph-checkpoint';
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
import { getLangGraphCoreConfig } from './config/langgraph-core.config';
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

// Test services and controllers for Phase 1 verification
import { AdapterTestService } from './services/adapter-test.service';
import { AdapterTestController } from './controllers/adapter-test.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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

    // Phase 3 Subtask 3.3: Direct module imports replacing centralized orchestration
    // Core LangGraph Module with minimal essential configuration
    NestjsLanggraphModule.forRoot(getLangGraphCoreConfig()),

    // TASK_INT_012: Memory Module with Adapter Pattern
    // Uses existing ChromaDB/Neo4j through adapters - NO direct database coupling!
    MemoryModule.forRoot({
      ...getMemoryConfig(),
      adapters: {
        vector: ChromaVectorAdapter, // Uses existing ChromaDB configuration
        graph: Neo4jGraphAdapter, // Uses existing Neo4j configuration
      },
    }),

    // Direct child module imports - Independent module usage
    LanggraphModulesCheckpointModule.forRoot(getCheckpointConfig()),
    StreamingModule.forRoot(getStreamingConfig()),
    HitlModule.forRoot(getHitlConfig()),

    // Additional LangGraph modules for comprehensive demo
    FunctionalApiModule.forRoot(getFunctionalApiConfig()),
    MultiAgentModule.forRoot(getMultiAgentConfig()),
    MonitoringModule.forRoot(getMonitoringConfig()),
    PlatformModule.forRoot(getPlatformConfig()),
    TimeTravelModule.forRoot(getTimeTravelConfig()),
    WorkflowEngineModule.forRoot(getWorkflowEngineConfig()),

    DevbrandBackendFeatureModule,
  ],
  providers: [
    // Phase 1 test service to verify adapter injection
    AdapterTestService,
  ],
  controllers: [
    // Phase 1 test controller to expose verification endpoints
    AdapterTestController,
  ],
  exports: [
    // TASK_INT_012: Export Memory Module services for other modules
    // These services now use the adapter pattern with ChromaDB/Neo4j
    // MemoryService, MemoryStorageService, MemoryGraphService are available
  ],
})
export class AppModule {}
