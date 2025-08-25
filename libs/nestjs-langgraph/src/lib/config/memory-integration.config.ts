/**
 * Memory Integration Configuration
 *
 * Provides a simple way to integrate AgenticMemoryModule with NestjsLanggraphModule
 */

import type { DynamicModule } from '@nestjs/common';
import {
  createMemoryAdapterProviders,
  createMemoryBridgeProviders,
} from '../adapters/memory-adapter.provider';

export interface MemoryIntegrationOptions {
  /**
   * Whether to enable memory integration
   * When true, the memory adapter will be available for workflows
   */
  enabled?: boolean;

  /**
   * The AgenticMemoryModule instance to use
   * This should be imported from @libs/dev-brand/backend/data-access
   */
  memoryModule?: DynamicModule;

  /**
   * Configuration for the memory adapter
   */
  config?: {
    /**
     * Whether to use enterprise memory or fallback to basic memory
     */
    useEnterpriseMemory?: boolean;

    /**
     * Default memory type when creating memory instances
     */
    defaultMemoryType?: 'buffer' | 'summary' | 'enterprise';
  };
}

/**
 * Configure memory integration for NestjsLanggraphModule
 *
 * @example
 * ```typescript
 * import { AgenticMemoryModule } from '@libs/dev-brand/backend/data-access';
 *
 * NestjsLanggraphModule.forRoot({
 *   memory: configureMemoryIntegration({
 *     enabled: true,
 *     memoryModule: AgenticMemoryModule.forRoot({
 *       enableSemanticSearch: true,
 *       enableAutoSummarization: true
 *     })
 *   })
 * })
 * ```
 */
export function configureMemoryIntegration(
  options: MemoryIntegrationOptions = {}
) {
  const { enabled = true, memoryModule, config = {} } = options;

  if (!enabled) {
    return {
      imports: [],
      providers: [...createMemoryAdapterProviders()],
      exports: [],
    };
  }

  // If no memory module provided, just use basic adapter
  if (!memoryModule) {
    return {
      imports: [],
      providers: [...createMemoryAdapterProviders()],
      exports: [],
    };
  }

  // Full integration with AgenticMemoryModule
  return {
    imports: [memoryModule],
    providers: [
      ...createMemoryAdapterProviders(),
      ...createMemoryBridgeProviders(), // Bridge providers to connect the systems
    ],
    exports: [],
  };
}
