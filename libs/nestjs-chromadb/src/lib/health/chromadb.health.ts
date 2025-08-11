import { Injectable } from '@nestjs/common';
import { ChromaDBService } from '../services/chromadb.service';

export interface HealthIndicatorResult {
  [key: string]: {
    status: 'up' | 'down';
    [key: string]: any;
  };
}

export class HealthCheckError extends Error {
  constructor(message: string, public causes: HealthIndicatorResult) {
    super(message);
  }
}

@Injectable()
export class ChromaDBHealthIndicator {
  constructor(private readonly chromaDBService: ChromaDBService) {}

  protected getStatus(key: string, isHealthy: boolean, data?: any): HealthIndicatorResult {
    return {
      [key]: {
        status: isHealthy ? 'up' : 'down',
        ...data,
      },
    };
  }

  /**
   * Health check for ChromaDB connection
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const isHealthy = await this.chromaDBService.isHealthy();
      
      if (!isHealthy) {
        throw new Error('ChromaDB connection is not healthy');
      }

      const heartbeat = await this.chromaDBService.heartbeat();
      const version = await this.chromaDBService.version();

      return this.getStatus(key, true, {
        heartbeat,
        version,
        status: 'connected',
      });
    } catch (error) {
      const result = this.getStatus(key, false, {
        status: 'disconnected',
        error: error instanceof Error ? error.message : String(error),
      });

      throw new HealthCheckError('ChromaDB health check failed', result);
    }
  }

  /**
   * Health check with detailed collection information
   */
  async isHealthyDetailed(key: string): Promise<HealthIndicatorResult> {
    try {
      const isHealthy = await this.chromaDBService.isHealthy();
      
      if (!isHealthy) {
        throw new Error('ChromaDB connection is not healthy');
      }

      const heartbeat = await this.chromaDBService.heartbeat();
      const version = await this.chromaDBService.version();
      const collections = await this.chromaDBService.listCollections();

      return this.getStatus(key, true, {
        heartbeat,
        version,
        status: 'connected',
        collections: {
          count: collections.length,
          names: collections.map(c => c.name),
        },
      });
    } catch (error) {
      const result = this.getStatus(key, false, {
        status: 'disconnected',
        error: error instanceof Error ? error.message : String(error),
      });

      throw new HealthCheckError('ChromaDB detailed health check failed', result);
    }
  }

  /**
   * Test a specific collection's health
   */
  async isCollectionHealthy(key: string, collectionName: string): Promise<HealthIndicatorResult> {
    try {
      const exists = await this.chromaDBService.collectionExists(collectionName);
      
      if (!exists) {
        throw new Error(`Collection '${collectionName}' does not exist`);
      }

      const count = await this.chromaDBService.countDocuments(collectionName);
      const metadata = await this.chromaDBService.getCollectionMetadata(collectionName);

      return this.getStatus(key, true, {
        collection: collectionName,
        status: 'healthy',
        documentCount: count,
        metadata,
      });
    } catch (error) {
      const result = this.getStatus(key, false, {
        collection: collectionName,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
      });

      throw new HealthCheckError(`ChromaDB collection '${collectionName}' health check failed`, result);
    }
  }
}