import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// Import refactored memory services that use external libraries
import { MemoryConfig } from './interfaces/memory.interface';
import { MemoryFacadeService } from './services/memory-facade.service';
import { SemanticSearchService } from './services/semantic-search.service';
import { SummarizationService } from './services/summarization.service';
import { MemoryAdapterBridgeService } from './adapters/memory-adapter-bridge.service';
// Import new specialized services (god service refactoring)
import { MemoryStorageService } from './services/memory-storage.service';
import { MemoryGraphService } from './services/memory-graph.service';
import { MemoryRetentionService } from './services/memory-retention.service';
import { MemoryStatsService } from './services/memory-stats.service';
import { MemoryOrchestratorService } from './services/memory-orchestrator.service';

/**
 * Simplified Memory module for agent workflows
 * Uses injected ChromaDB and Neo4j services from the main app
 */
@Module({})
export class AgenticMemoryModule {
  /**
   * Simple configuration for agent memory workflows
   */
  public static forAgent(config?: {
    enableSemanticSearch?: boolean;
    enableAutoSummarization?: boolean;
    collection?: string;
  }): DynamicModule {
    const agentConfig = {
      enableSemanticSearch: true,
      enableAutoSummarization: true,
      collection: 'agent-memory',
      ...config,
    };

    const memoryConfig: MemoryConfig = {
      storage: {
        type: 'vector',
        vector: {
          provider: 'chromadb',
          config: { collection: agentConfig.collection },
        },
      },
      enableSemanticSearch: agentConfig.enableSemanticSearch,
      enableAutoSummarization: agentConfig.enableAutoSummarization,
    };

    return {
      module: AgenticMemoryModule,
      imports: [ConfigModule, HttpModule],
      providers: [
        { provide: 'MEMORY_CONFIG', useValue: memoryConfig },
        MemoryFacadeService,

        // New specialized services (god service refactoring)
        MemoryStorageService,
        MemoryGraphService,
        MemoryRetentionService,
        MemoryStatsService,
        MemoryOrchestratorService,

        // Optional services based on configuration
        ...(agentConfig.enableSemanticSearch ? [SemanticSearchService] : []),
        ...(agentConfig.enableAutoSummarization ? [SummarizationService] : []),

        // Bridge service for nestjs-langgraph adapter integration
        MemoryAdapterBridgeService,

        // Export bridge service with the correct Symbol token for dependency injection
        {
          provide: 'MEMORY_ADAPTER_FACADE_SERVICE',
          useExisting: MemoryAdapterBridgeService,
        },
      ],
      exports: [
        MemoryFacadeService,
        MemoryOrchestratorService,
        MemoryStorageService,
        MemoryGraphService,
        MemoryRetentionService,
        MemoryStatsService,
        MemoryAdapterBridgeService,
        'MEMORY_ADAPTER_FACADE_SERVICE',
      ],
    };
  }
}
