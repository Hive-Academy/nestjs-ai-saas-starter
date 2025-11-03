import type { Provider } from '@nestjs/common';
import { MemoryStorageService } from '../services/memory-storage.service';
import { MemoryGraphService } from '../services/memory-graph.service';
import { AgentMemoryBridgeService } from '../services/agent-memory-bridge.service';
import { AgentMemoryCoreService } from '../services/agent-memory-core.service';
import { AgentMemoryContextService } from '../services/agent-memory-context.service';
import { AgentMemoryCheckpointService } from '../services/agent-memory-checkpoint.service';
import { AgentMemoryStatsService } from '../services/agent-memory-stats.service';
import { StoreService } from '../store/services/store.service';
import { StoreStorageService } from '../store/services/store-storage.service';
import { StoreGraphService } from '../store/services/store-graph.service';
import { MEMORY_CONFIG } from '../constants/memory.constants';
import type { MemoryModuleOptions } from '../interfaces/memory-module-options.interface';

/**
 * Memory Service Provider Factory
 *
 * Responsibility: Create all service providers for MemoryModule
 * Extracted from MemoryModule to eliminate duplication and follow DRY principle
 *
 * Benefits:
 * - Single source of truth for provider list
 * - No duplication between forRoot and forRootAsync
 * - Easy to maintain and extend
 */
export class MemoryProviderFactory {
  /**
   * Create all core service providers
   * Returns the complete provider list for both sync and async configurations
   */
  static createCoreProviders(): Provider[] {
    return [
      // Store services (must come first - dependencies of other services)
      StoreStorageService,
      StoreGraphService,
      StoreService,
      {
        provide: 'IStoreService',
        useExisting: StoreService,
      },

      // Core memory services
      MemoryStorageService,
      MemoryGraphService,

      // Specialized agent memory services (TASK_2025_006)
      AgentMemoryCoreService,
      AgentMemoryContextService,
      AgentMemoryCheckpointService,
      AgentMemoryStatsService,

      // Agent memory bridge (orchestrator pattern)
      AgentMemoryBridgeService,
    ];
  }

  /**
   * Create configuration provider for synchronous options
   */
  static createConfigProvider(config: MemoryModuleOptions): Provider {
    return {
      provide: MEMORY_CONFIG,
      useValue: config,
    };
  }

  /**
   * Create IMemoryAdapter provider
   * Conditionally added when vector adapter is available
   */
  static createMemoryAdapterProvider(): Provider {
    return {
      provide: 'IMemoryAdapter',
      useExisting: AgentMemoryBridgeService,
    };
  }

  /**
   * Get list of exports for the module
   * Returns services and tokens that should be available to consuming modules
   */
  static getExports(includeMemoryAdapter = false): any[] {
    const baseExports = [
      // Core services
      MemoryStorageService,
      MemoryGraphService,

      // Agent memory services
      AgentMemoryBridgeService,
      AgentMemoryCoreService,
      AgentMemoryContextService,
      AgentMemoryCheckpointService,
      AgentMemoryStatsService,

      // Configuration token
      MEMORY_CONFIG,
    ];

    if (includeMemoryAdapter) {
      baseExports.push('IMemoryAdapter');
    }

    return baseExports;
  }
}
