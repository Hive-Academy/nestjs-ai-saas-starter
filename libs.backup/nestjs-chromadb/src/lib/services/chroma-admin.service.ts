import { Inject, Injectable, Logger } from '@nestjs/common';
import { ChromaClient } from 'chromadb';
import { getErrorMessage } from '../utils/error.utils';
import { CHROMADB_CLIENT } from '../constants';

/**
 * ChromaDB administrative operations service
 */
@Injectable()
export class ChromaAdminService {
  private readonly logger = new Logger(ChromaAdminService.name);

  constructor(
    @Inject(CHROMADB_CLIENT)
    private readonly client: ChromaClient
  ) {}

  /**
   * Get ChromaDB server version
   */
  public async getVersion(): Promise<string> {
    try {
      return await this.client.version();
    } catch (error) {
      this.logger.error(`Failed to get version: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Get heartbeat from ChromaDB server
   */
  public async heartbeat(): Promise<number> {
    try {
      return await this.client.heartbeat();
    } catch (error) {
      this.logger.error(`Heartbeat failed: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Check if ChromaDB server is healthy
   */
  public async isHealthy(): Promise<boolean> {
    try {
      await this.heartbeat();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reset the entire ChromaDB instance (DANGEROUS!)
   */
  public async reset(): Promise<boolean> {
    try {
      this.logger.warn(
        'Resetting entire ChromaDB instance - this will delete ALL data!'
      );
      await this.client.reset();
      return true;
    } catch (error) {
      this.logger.error(`Failed to reset ChromaDB: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  public async getStatistics(): Promise<{
    collections: Array<{
      name: string;
      id: string;
      count: number;
      metadata?: Record<string, unknown>;
    }>;
    totalCollections: number;
    totalDocuments: number;
  }> {
    try {
      const collections = await this.client.listCollections();
      const stats = {
        collections: [] as Array<{
          name: string;
          id: string;
          count: number;
          metadata?: Record<string, unknown>;
        }>,
        totalCollections: collections.length,
        totalDocuments: 0,
      };

      for (const collection of collections) {
        try {
          const count = await collection.count();
          stats.collections.push({
            name: collection.name,
            id: collection.id,
            count,
            metadata: collection.metadata,
          });
          stats.totalDocuments += count;
        } catch (error) {
          this.logger.warn(
            `Failed to get count for collection ${
              collection.name
            }: ${getErrorMessage(error)}`
          );
          stats.collections.push({
            name: collection.name,
            id: collection.id,
            count: 0,
            metadata: collection.metadata,
          });
        }
      }

      return stats;
    } catch (error) {
      this.logger.error(`Failed to get statistics: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Perform database cleanup (remove empty collections)
   */
  public async cleanup(): Promise<{
    removedCollections: string[];
    errors: Array<{ collection: string; error: string }>;
  }> {
    const result = {
      removedCollections: [] as string[],
      errors: [] as Array<{ collection: string; error: string }>,
    };

    try {
      const collections = await this.client.listCollections();

      for (const collection of collections) {
        try {
          const count = await collection.count();
          if (count === 0) {
            await this.client.deleteCollection({ name: collection.name });
            result.removedCollections.push(collection.name);
            this.logger.log(`Removed empty collection: ${collection.name}`);
          }
        } catch (error) {
          const errorMsg = getErrorMessage(error);
          result.errors.push({
            collection: collection.name,
            error: errorMsg,
          });
          this.logger.error(
            `Failed to cleanup collection ${collection.name}: ${errorMsg}`
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to perform cleanup: ${getErrorMessage(error)}`);
      throw error;
    }

    return result;
  }

  /**
   * Backup collections metadata
   */
  public async backupMetadata(): Promise<
    Array<{
      name: string;
      id: string;
      metadata?: Record<string, unknown>;
    }>
  > {
    try {
      const collections = await this.client.listCollections();
      return collections.map((collection) => ({
        name: collection.name,
        id: collection.id,
        metadata: collection.metadata,
      }));
    } catch (error) {
      this.logger.error(`Failed to backup metadata: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Get server information
   */
  public async getServerInfo(): Promise<{
    version: string;
    healthy: boolean;
    collections: number;
    uptime?: number;
  }> {
    try {
      const [version, collections, heartbeat] = await Promise.all([
        this.getVersion(),
        this.client.listCollections(),
        this.heartbeat().catch(() => 0),
      ]);

      return {
        version,
        healthy: heartbeat > 0,
        collections: collections.length,
        uptime: heartbeat,
      };
    } catch (error) {
      this.logger.error(`Failed to get server info: ${getErrorMessage(error)}`);
      throw error;
    }
  }
}
