import { Injectable, Logger } from '@nestjs/common';
import { ChromaDBVectorAdapter } from '../adapters/chromadb-vector.adapter';
import { Neo4jGraphAdapter } from '../adapters/neo4j-graph.adapter';
import {
  IDatabaseConnectionProvider,
  IDatabaseProviderFactory,
  DatabaseProviderStatus,
  MemoryProviderConfig,
  MemoryDetectionResult,
} from '../interfaces/database-provider.interface';

/**
 * Database Provider Factory with auto-detection and health checking
 *
 * This factory automatically detects available database services (ChromaDB, Neo4j)
 * and provides a unified interface for memory module database operations.
 *
 * Uses @Optional() @Inject() pattern to gracefully handle cases where
 * database services are not available in the application.
 */
@Injectable()
export class DatabaseProviderFactory implements IDatabaseProviderFactory {
  private readonly logger = new Logger(DatabaseProviderFactory.name);

  constructor(
    private readonly chromaDBAdapter: ChromaDBVectorAdapter,
    private readonly neo4jAdapter: Neo4jGraphAdapter
  ) {
    this.logger.log('DatabaseProviderFactory initialized');
    this.logAvailableServices();
  }

  /**
   * Get all available database providers
   */
  async getAvailableProviders(): Promise<IDatabaseConnectionProvider[]> {
    const providers: IDatabaseConnectionProvider[] = [];

    // Check ChromaDB availability via adapter
    if (this.chromaDBAdapter.isAvailable()) {
      try {
        const isHealthy = await this.chromaDBAdapter.healthCheck();
        if (isHealthy) {
          providers.push(this.createChromaDBProvider());
          this.logger.log('ChromaDB provider added (healthy)');
        } else {
          this.logger.warn('ChromaDB service detected but not healthy');
        }
      } catch (error) {
        this.logger.warn('ChromaDB health check failed:', error);
      }
    }

    // Check Neo4j availability via adapter
    if (this.neo4jAdapter.isAvailable()) {
      try {
        const isHealthy = await this.neo4jAdapter.healthCheck();
        if (isHealthy) {
          providers.push(this.createNeo4jProvider());
          this.logger.log('Neo4j provider added (healthy)');
        } else {
          this.logger.warn('Neo4j service detected but not healthy');
        }
      } catch (error) {
        this.logger.warn('Neo4j health check failed:', error);
      }
    }

    if (providers.length === 0) {
      this.logger.warn(
        'No database providers available - memory will use fallback mode'
      );
    } else {
      this.logger.log(
        `Found ${providers.length} available database provider(s)`
      );
    }

    return providers;
  }

  /**
   * Get provider by type
   */
  async getProvider(
    type: 'chromadb' | 'neo4j' | 'custom'
  ): Promise<IDatabaseConnectionProvider | null> {
    switch (type) {
      case 'chromadb':
        if (this.chromaDBAdapter.isAvailable()) {
          try {
            const isHealthy = await this.chromaDBAdapter.healthCheck();
            return isHealthy ? this.createChromaDBProvider() : null;
          } catch {
            return null;
          }
        }
        return null;

      case 'neo4j':
        if (this.neo4jAdapter.isAvailable()) {
          try {
            const isHealthy = await this.neo4jAdapter.healthCheck();
            return isHealthy ? this.createNeo4jProvider() : null;
          } catch {
            return null;
          }
        }
        return null;

      case 'custom':
        // Custom providers would need to be registered separately
        this.logger.warn('Custom providers not yet implemented');
        return null;

      default:
        return null;
    }
  }

  /**
   * Check if a specific provider type is available
   */
  async isProviderAvailable(
    type: 'chromadb' | 'neo4j' | 'custom'
  ): Promise<boolean> {
    const provider = await this.getProvider(type);
    return provider !== null;
  }

  /**
   * Get status of all providers
   */
  async getProvidersStatus(): Promise<DatabaseProviderStatus[]> {
    const statuses: DatabaseProviderStatus[] = [];

    // ChromaDB status via adapter
    if (this.chromaDBAdapter.isAvailable()) {
      try {
        const isHealthy = await this.chromaDBAdapter.healthCheck();

        statuses.push({
          type: 'chromadb',
          available: true,
          healthy: isHealthy,
          capabilities: ['vector_storage', 'semantic_search', 'embeddings'],
          metadata: {
            service: 'ChromaDBVectorAdapter',
          },
        });
      } catch (error) {
        statuses.push({
          type: 'chromadb',
          available: false,
          healthy: false,
          capabilities: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      statuses.push({
        type: 'chromadb',
        available: false,
        healthy: false,
        capabilities: [],
        error: 'ChromaDB not available - module not imported',
      });
    }

    // Neo4j status via adapter
    if (this.neo4jAdapter.isAvailable()) {
      try {
        const isHealthy = await this.neo4jAdapter.healthCheck();

        statuses.push({
          type: 'neo4j',
          available: true,
          healthy: isHealthy,
          capabilities: [
            'graph_storage',
            'relationship_queries',
            'graph_traversal',
          ],
          metadata: {
            service: 'Neo4jGraphAdapter',
          },
        });
      } catch (error) {
        statuses.push({
          type: 'neo4j',
          available: false,
          healthy: false,
          capabilities: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      statuses.push({
        type: 'neo4j',
        available: false,
        healthy: false,
        capabilities: [],
        error: 'Neo4j not available - module not imported',
      });
    }

    return statuses;
  }

  /**
   * Create a memory database configuration from available providers
   */
  async createMemoryConfig(
    preferences?: Partial<MemoryProviderConfig>
  ): Promise<MemoryProviderConfig> {
    const config: MemoryProviderConfig = {};

    // Auto-configure ChromaDB if available
    if (await this.isProviderAvailable('chromadb')) {
      config.vector = {
        type: 'chromadb',
        collection: preferences?.vector?.collection || 'agent-memory',
        connection: 'auto',
        metadata: preferences?.vector?.metadata,
      };
    }

    // Auto-configure Neo4j if available
    if (await this.isProviderAvailable('neo4j')) {
      config.graph = {
        type: 'neo4j',
        database: preferences?.graph?.database || 'neo4j',
        connection: 'auto',
        metadata: preferences?.graph?.metadata,
      };
    }

    // Apply custom preferences
    if (preferences?.custom) {
      config.custom = preferences.custom;
    }

    return config;
  }

  /**
   * Detect available memory capabilities and create comprehensive result
   */
  async detectMemoryCapabilities(): Promise<MemoryDetectionResult> {
    const providers = await this.getAvailableProviders();

    const vectorProviders = providers.filter((p) => p.type === 'chromadb');
    const graphProviders = providers.filter((p) => p.type === 'neo4j');
    const customProviders = providers.filter((p) => p.type === 'custom');

    const hasProviders = providers.length > 0;
    const hasVector = vectorProviders.length > 0;
    const hasGraph = graphProviders.length > 0;

    // Create recommended configuration
    const recommendedConfig = hasProviders
      ? await this.createMemoryConfig()
      : null;

    // Determine available features
    const features = {
      semanticSearch: hasVector,
      graphTraversal: hasGraph,
      persistentMemory: hasVector || hasGraph,
      crossThreadMemory: hasVector && hasGraph,
    };

    return {
      hasProviders,
      vectorProviders,
      graphProviders,
      customProviders,
      recommendedConfig,
      features,
    };
  }

  /**
   * Create ChromaDB provider instance
   */
  private createChromaDBProvider(): IDatabaseConnectionProvider {
    if (!this.chromaDBAdapter.isAvailable()) {
      throw new Error('ChromaDB adapter not available');
    }

    return {
      type: 'chromadb',
      connection: this.chromaDBAdapter,
      isHealthy: async () => {
        try {
          return await this.chromaDBAdapter.healthCheck();
        } catch {
          return false;
        }
      },
      metadata: {
        collectionName: 'agent-memory',
        service: 'ChromaDBVectorAdapter',
      },
    };
  }

  /**
   * Create Neo4j provider instance
   */
  private createNeo4jProvider(): IDatabaseConnectionProvider {
    if (!this.neo4jAdapter.isAvailable()) {
      throw new Error('Neo4j adapter not available');
    }

    return {
      type: 'neo4j',
      connection: this.neo4jAdapter,
      isHealthy: async () => {
        try {
          return await this.neo4jAdapter.healthCheck();
        } catch {
          return false;
        }
      },
      metadata: {
        database: 'neo4j',
        service: 'Neo4jGraphAdapter',
      },
    };
  }

  /**
   * Log available services for debugging
   */
  private logAvailableServices(): void {
    const services: string[] = [];

    if (this.chromaDBAdapter.isAvailable()) {
      services.push('ChromaDB');
    }

    if (this.neo4jAdapter.isAvailable()) {
      services.push('Neo4j');
    }

    if (services.length > 0) {
      this.logger.log(`Detected database services: ${services.join(', ')}`);
    } else {
      this.logger.warn(
        'No database services detected - memory will use fallback mode'
      );
    }
  }
}
