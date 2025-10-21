import type { Provider, Type } from '@nestjs/common';
import type { IVectorService } from '../interfaces/vector-service.interface';
import type { IGraphService } from '../interfaces/graph-service.interface';
import type { MemoryModuleOptions } from '../interfaces/memory-module-options.interface';

/**
 * Memory Adapter Provider Factory
 *
 * Responsibility: Create adapter providers (IVectorService, IGraphService)
 * Extracted from MemoryModule to follow Single Responsibility Principle
 */
export class MemoryAdapterFactory {
  /**
   * Create adapter providers based on options
   * Handles both class types and instances for vector and graph adapters
   */
  static createAdapterProviders(options: MemoryModuleOptions): Provider[] {
    const providers: Provider[] = [];

    // Vector service adapter (required)
    const vectorAdapter = options.adapters?.vector;
    if (vectorAdapter) {
      providers.push(this.createVectorProvider(vectorAdapter));
    } else {
      throw new Error(
        'MemoryModule requires a vector adapter. Please provide options.adapters.vector'
      );
    }

    // Graph service adapter (optional)
    const graphAdapter = options.adapters?.graph;
    if (graphAdapter) {
      providers.push(this.createGraphProvider(graphAdapter));
    }

    return providers;
  }

  /**
   * Create vector service provider (class or instance)
   */
  private static createVectorProvider(
    adapter: Type<IVectorService> | IVectorService
  ): Provider {
    if (typeof adapter === 'function') {
      return {
        provide: 'IVectorService',
        useClass: adapter as Type<IVectorService>,
      };
    } else {
      return {
        provide: 'IVectorService',
        useValue: adapter,
      };
    }
  }

  /**
   * Create graph service provider (class or instance)
   */
  private static createGraphProvider(
    adapter: Type<IGraphService> | IGraphService
  ): Provider {
    if (typeof adapter === 'function') {
      return {
        provide: 'IGraphService',
        useClass: adapter as Type<IGraphService>,
      };
    } else {
      return {
        provide: 'IGraphService',
        useValue: adapter,
      };
    }
  }

  /**
   * Validate adapter configuration
   * Ensures provided adapters implement the required interfaces
   */
  static validateAdapters(options: MemoryModuleOptions): void {
    if (options.adapters?.vector) {
      this.validateVectorAdapter(options.adapters.vector);
    }

    if (options.adapters?.graph) {
      this.validateGraphAdapter(options.adapters.graph);
    }
  }

  /**
   * Validate vector adapter implementation
   */
  private static validateVectorAdapter(
    adapter: Type<IVectorService> | IVectorService
  ): void {
    // Skip validation for class types (NestJS handles this)
    if (typeof adapter === 'function') return;

    // Validate instance methods
    const requiredMethods = [
      'store',
      'storeBatch',
      'search',
      'delete',
      'getStats',
    ];

    for (const method of requiredMethods) {
      if (typeof (adapter as any)[method] !== 'function') {
        throw new Error(
          `Custom vector adapter must implement IVectorService.${method}() method`
        );
      }
    }
  }

  /**
   * Validate graph adapter implementation
   */
  private static validateGraphAdapter(
    adapter: Type<IGraphService> | IGraphService
  ): void {
    // Skip validation for class types (NestJS handles this)
    if (typeof adapter === 'function') return;

    // Validate instance methods
    const requiredMethods = [
      'createNode',
      'createRelationship',
      'traverse',
      'executeCypher',
      'getStats',
    ];

    for (const method of requiredMethods) {
      if (typeof (adapter as any)[method] !== 'function') {
        throw new Error(
          `Custom graph adapter must implement IGraphService.${method}() method`
        );
      }
    }
  }
}
