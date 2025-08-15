import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ChromaDBService } from '@hive-academy/nestjs-chromadb';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';
import { ConfigService } from '@nestjs/config';

/**
 * Health check service for the memory module
 * Verifies connectivity and functionality of all underlying services
 */
@Injectable()
export class MemoryHealthService extends HealthIndicator {
  private readonly logger = new Logger(MemoryHealthService.name);

  constructor(
    private readonly chromaDBService: ChromaDBService,
    private readonly neo4jService: Neo4jService,
    private readonly configService: ConfigService
  ) {
    super();
  }

  /**
   * Comprehensive health check for all memory services
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    const results: Record<string, unknown> = {};
    const errors: string[] = [];

    try {
      // Check ChromaDB connectivity
      const chromaResult = await this.checkChromaDBHealth();
      results.chromadb = chromaResult;
      if (!chromaResult.status) {
        errors.push(`ChromaDB: ${chromaResult.error}`);
      }

      // Check Neo4j connectivity
      const neo4jResult = await this.checkNeo4jHealth();
      results.neo4j = neo4jResult;
      if (!neo4jResult.status) {
        errors.push(`Neo4j: ${neo4jResult.error}`);
      }

      // Check embedding service if enabled
      if (this.isSemanticSearchEnabled()) {
        const embeddingResult = await this.checkEmbeddingHealth();
        results.embedding = embeddingResult;
        if (!embeddingResult.status) {
          errors.push(`Embedding: ${embeddingResult.error}`);
        }
      }

      const responseTime = Date.now() - startTime;
      const isHealthy = errors.length === 0;

      const result = this.getStatus(key, isHealthy, {
        ...results,
        responseTime,
        timestamp: new Date().toISOString(),
        errors: errors.length > 0 ? errors : undefined,
      });

      if (!isHealthy) {
        throw new HealthCheckError('Memory module health check failed', result);
      }

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result = this.getStatus(key, false, {
        ...results,
        responseTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        errors: errors.length > 0 ? errors : undefined,
      });

      throw new HealthCheckError('Memory module health check failed', result);
    }
  }

  /**
   * Check ChromaDB health
   */
  private async checkChromaDBHealth(): Promise<{
    status: boolean;
    responseTime: number;
    version?: string;
    collections?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Test basic connectivity by listing collections
      const collections = await this.chromaDBService.listCollections();
      const responseTime = Date.now() - startTime;

      // Try to get version info if available
      let version: string | undefined;
      try {
        // This might not be available in all ChromaDB versions
        version = await this.getChromaDBVersion();
      } catch {
        // Ignore version check failures
      }

      return {
        status: true,
        responseTime,
        version,
        collections: collections.length,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: false,
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check Neo4j health
   */
  private async checkNeo4jHealth(): Promise<{
    status: boolean;
    responseTime: number;
    version?: string;
    database?: string;
    nodes?: number;
    relationships?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Test connectivity with a simple query
      const result = await this.neo4jService.run<{
        version: string;
        database: string;
        nodes: number;
        relationships: number;
      }>(`
        CALL dbms.components() YIELD name, versions, edition
        WITH head(versions) as version
        CALL db.info() YIELD name as database
        CALL apoc.meta.stats() YIELD nodeCount, relCount
        RETURN version, database, nodeCount as nodes, relCount as relationships
      `);

      const responseTime = Date.now() - startTime;
      const record = result.records[0];

      return {
        status: true,
        responseTime,
        version: record?.version,
        database: record?.database,
        nodes: record?.nodes ?? 0,
        relationships: record?.relationships ?? 0,
      };
    } catch (error) {
      // Fallback to simpler query if APOC is not available
      try {
        await this.neo4jService.run('RETURN 1 as test');
        const responseTime = Date.now() - startTime;

        return {
          status: true,
          responseTime,
        };
      } catch (fallbackError) {
        const responseTime = Date.now() - startTime;
        return {
          status: false,
          responseTime,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  }

  /**
   * Check embedding service health
   */
  private async checkEmbeddingHealth(): Promise<{
    status: boolean;
    responseTime: number;
    provider?: string;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Test embedding generation with a simple text
      const testText = 'health check test';
      const embeddings = await this.chromaDBService.getEmbeddingService().embed([testText]);
      const responseTime = Date.now() - startTime;

      if (!embeddings || embeddings.length === 0 || !embeddings[0] || embeddings[0].length === 0) {
        throw new Error('Embedding service returned empty results');
      }

      return {
        status: true,
        responseTime,
        provider: this.getEmbeddingProvider(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: false,
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get ChromaDB version (if available)
   */
  private async getChromaDBVersion(): Promise<string | undefined> {
    try {
      // This is a placeholder - actual implementation depends on ChromaDB client capabilities
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Get embedding provider name
   */
  private getEmbeddingProvider(): string {
    return this.configService.get<string>('chromadb.embedding.provider', 'unknown');
  }

  /**
   * Check if semantic search is enabled
   */
  private isSemanticSearchEnabled(): boolean {
    return this.configService.get<boolean>('memory.enableSemanticSearch', false);
  }

  /**
   * Ping check - lightweight health check
   */
  async ping(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      // Quick connectivity test
      const chromaPromise = this.chromaDBService.listCollections();
      const neo4jPromise = this.neo4jService.run('RETURN 1 as ping');

      await Promise.all([chromaPromise, neo4jPromise]);

      const responseTime = Date.now() - startTime;

      return this.getStatus(key, true, {
        responseTime,
        timestamp: new Date().toISOString(),
        type: 'ping',
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result = this.getStatus(key, false, {
        responseTime,
        timestamp: new Date().toISOString(),
        type: 'ping',
        error: error instanceof Error ? error.message : String(error),
      });

      throw new HealthCheckError('Memory module ping failed', result);
    }
  }

  /**
   * Get detailed metrics for monitoring
   */
  async getMetrics(): Promise<{
    chromadb: {
      collections: number;
      totalDocuments?: number;
      responseTime: number;
    };
    neo4j: {
      nodes: number;
      relationships: number;
      responseTime: number;
    };
    memory: {
      totalMemories: number;
      activeThreads: number;
      responseTime: number;
    };
  }> {
    const startTime = Date.now();

    try {
      // Get ChromaDB metrics
      const chromaStartTime = Date.now();
      const collections = await this.chromaDBService.listCollections();
      let totalDocuments = 0;

      try {
        // Try to count documents in memory collection
        totalDocuments = await this.chromaDBService.countDocuments('memory-entries');
      } catch {
        // Ignore if collection doesn't exist
      }

      const chromaResponseTime = Date.now() - chromaStartTime;

      // Get Neo4j metrics
      const neo4jStartTime = Date.now();
      let nodes = 0;
      let relationships = 0;

      try {
        const result = await this.neo4jService.run<{ nodes: number; relationships: number }>(`
          MATCH (n) WITH count(n) as nodeCount
          MATCH ()-[r]->() WITH nodeCount, count(r) as relCount
          RETURN nodeCount as nodes, relCount as relationships
        `);

        const record = result.records[0];
        nodes = record?.nodes ?? 0;
        relationships = record?.relationships ?? 0;
      } catch {
        // Ignore if query fails
      }

      const neo4jResponseTime = Date.now() - neo4jStartTime;

      // Calculate memory-specific metrics
      const memoryStartTime = Date.now();
      const totalMemories = totalDocuments;

      // Count unique threads from Neo4j
      let activeThreads = 0;
      try {
        const threadResult = await this.neo4jService.run<{ count: number }>(`
          MATCH (t:Thread) RETURN count(t) as count
        `);
        activeThreads = threadResult.records[0]?.count ?? 0;
      } catch {
        // Fallback to estimating from ChromaDB if Neo4j fails
        try {
          const memoryResults = await this.chromaDBService.getDocuments('memory-entries', {
            includeMetadata: true,
            limit: 1000, // Sample for estimation
          });

          const threadIds = new Set<string>();
          if (memoryResults.metadatas) {
            const metadatas = Array.isArray(memoryResults.metadatas[0])
              ? memoryResults.metadatas[0]
              : memoryResults.metadatas;

            for (const metadata of metadatas as Array<{ threadId?: string } | null>) {
              if (metadata?.threadId) {
                threadIds.add(metadata.threadId);
              }
            }
          }
          activeThreads = threadIds.size;
        } catch {
          // Ignore estimation failures
        }
      }

      const memoryResponseTime = Date.now() - memoryStartTime;

      return {
        chromadb: {
          collections: collections.length,
          totalDocuments,
          responseTime: chromaResponseTime,
        },
        neo4j: {
          nodes,
          relationships,
          responseTime: neo4jResponseTime,
        },
        memory: {
          totalMemories,
          activeThreads,
          responseTime: memoryResponseTime,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get memory metrics', error);
      throw error;
    }
  }
}
