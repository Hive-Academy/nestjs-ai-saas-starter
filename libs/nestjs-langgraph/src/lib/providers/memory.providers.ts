import type { Provider } from '@nestjs/common';
import type { LangGraphModuleOptions } from '../interfaces/module-options.interface';

// Memory services imports
import { MemoryFacadeService } from '../memory/services/memory-facade.service';
import { SemanticSearchService } from '../memory/services/semantic-search.service';
import { SummarizationService } from '../memory/services/summarization.service';
import { MemoryStorageService } from '../memory/services/memory-storage.service';
import { MemoryOrchestratorService } from '../memory/services/memory-orchestrator.service';
import { MemoryRetentionService } from '../memory/services/memory-retention.service';
import { MemoryStatsService } from '../memory/services/memory-stats.service';
import { MemoryGraphService } from '../memory/services/memory-graph.service';

// Memory provider module and factory
import { 
  MemoryProviderModule,
  MEMORY_PROVIDER_TOKENS,
} from '../memory/providers/memory-provider.module';
import { DatabaseProviderFactory } from '../memory/providers/database-provider.factory';

/**
 * Create memory-related providers based on module configuration
 * Supports both basic and enterprise memory configurations with auto-detection
 */
export function createMemoryProviders(
  options: LangGraphModuleOptions
): Provider[] {
  const providers: Provider[] = [];

  // Always include the database provider factory for auto-detection
  providers.push({
    provide: DatabaseProviderFactory,
    useClass: DatabaseProviderFactory,
  });

  // Include memory provider tokens
  providers.push({
    provide: MEMORY_PROVIDER_TOKENS.DATABASE_PROVIDER_FACTORY,
    useExisting: DatabaseProviderFactory,
  });

  // Memory configuration check
  const memoryConfig = options.memory;
  const isMemoryEnabled = memoryConfig?.enabled !== false; // Default to true

  if (isMemoryEnabled) {
    // Core memory services (always available)
    providers.push(
      {
        provide: MemoryFacadeService,
        useClass: MemoryFacadeService,
      },
      {
        provide: MemoryStorageService,
        useClass: MemoryStorageService,
      },
      {
        provide: MemoryOrchestratorService,
        useClass: MemoryOrchestratorService,
      },
      {
        provide: MemoryStatsService,
        useClass: MemoryStatsService,
      }
    );

    // Enterprise memory services (conditional on type or features)
    const isEnterpriseMemory = 
      memoryConfig?.type === 'enterprise' ||
      memoryConfig?.features?.semanticSearch ||
      memoryConfig?.features?.summarization ||
      memoryConfig?.databases?.vector ||
      memoryConfig?.databases?.graph;

    if (isEnterpriseMemory) {
      providers.push(
        {
          provide: SemanticSearchService,
          useClass: SemanticSearchService,
        },
        {
          provide: SummarizationService,
          useClass: SummarizationService,
        },
        {
          provide: MemoryRetentionService,
          useClass: MemoryRetentionService,
        },
        {
          provide: MemoryGraphService,
          useClass: MemoryGraphService,
        }
      );
    }

    // Feature flag providers based on configuration
    if (memoryConfig?.features?.semanticSearch !== false) {
      providers.push({
        provide: 'MEMORY_FEATURES_SEMANTIC_SEARCH_ENABLED',
        useFactory: async (factory: DatabaseProviderFactory): Promise<boolean> => {
          try {
            const detection = await factory.detectMemoryCapabilities();
            return detection.features.semanticSearch;
          } catch {
            return false;
          }
        },
        inject: [DatabaseProviderFactory],
      });
    }

    if (memoryConfig?.features?.retention !== false) {
      providers.push({
        provide: 'MEMORY_FEATURES_RETENTION_ENABLED',
        useValue: true,
      });
    }

    if (memoryConfig?.features?.summarization !== false) {
      providers.push({
        provide: 'MEMORY_FEATURES_SUMMARIZATION_ENABLED',
        useValue: true,
      });
    }
  }

  return providers;
}

/**
 * Create memory exports for module configuration
 * These are the services that can be injected by consuming applications
 */
export function createMemoryExports(): any[] {
  return [
    // Core memory services
    MemoryFacadeService,
    MemoryStorageService,
    MemoryOrchestratorService,
    MemoryStatsService,
    
    // Enterprise memory services
    SemanticSearchService,
    SummarizationService,
    MemoryRetentionService,
    MemoryGraphService,
    
    // Provider factory for external use
    DatabaseProviderFactory,
    
    // Provider tokens
    MEMORY_PROVIDER_TOKENS.DATABASE_PROVIDER_FACTORY,
  ];
}

/**
 * Memory configuration validation
 * Validates that the memory configuration is properly structured
 */
export function validateMemoryConfig(config?: any): boolean {
  if (!config) return true; // Memory is optional
  
  // Basic validation
  if (config.type && !['basic', 'enterprise'].includes(config.type)) {
    throw new Error(`Invalid memory type: ${config.type}. Must be 'basic' or 'enterprise'`);
  }
  
  // Database configuration validation
  if (config.databases) {
    if (config.databases.vector && config.databases.vector.type !== 'chromadb') {
      throw new Error(`Invalid vector database type: ${config.databases.vector.type}. Only 'chromadb' is supported`);
    }
    
    if (config.databases.graph && config.databases.graph.type !== 'neo4j') {
      throw new Error(`Invalid graph database type: ${config.databases.graph.type}. Only 'neo4j' is supported`);
    }
  }
  
  return true;
}

/**
 * Create memory configuration with defaults
 * Provides sensible defaults for memory configuration
 */
export function createDefaultMemoryConfig(userConfig: any = {}): any {
  return {
    enabled: true,
    type: 'basic',
    databases: {
      vector: {
        type: 'chromadb',
        autoDetect: true,
        config: {
          collection: 'langraph_memory',
          embeddingFunction: 'default',
        },
      },
      graph: {
        type: 'neo4j',
        autoDetect: true,
        config: {
          database: 'neo4j',
        },
      },
    },
    features: {
      summarization: false,
      semanticSearch: true,
      retention: true,
      crossThreadPersistence: true,
    },
    ...userConfig,
  };
}