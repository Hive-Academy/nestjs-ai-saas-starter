import { Injectable, Logger, Inject } from '@nestjs/common';
import { IGraphService } from '../interfaces/graph-service.interface';
import { IVectorService } from '../interfaces/vector-service.interface';
import type { MemoryEntry, MemoryConfig } from '../interfaces/memory.interface';
import { MEMORY_CONFIG } from '../constants/memory.constants';
// import { wrapMemoryError } from '../errors/memory.errors'; // Not used in this service

/**
 * Memory graph service using adapter pattern for graph database integration
 *
 * Handles:
 * - Memory relationship tracking through adapter abstraction
 * - Thread graph building via IGraphService
 * - Semantic relationship discovery with configurable backends
 * - Conversation flow analysis through adapter delegation
 * - 100% backward compatibility maintained
 */
@Injectable()
export class MemoryGraphService {
  private readonly logger = new Logger(MemoryGraphService.name);

  constructor(
    @Inject('IGraphService')
    private readonly graphService: IGraphService,
    @Inject('IVectorService')
    private readonly vectorService: IVectorService,
    @Inject(MEMORY_CONFIG) private readonly config: MemoryConfig
  ) {
    this.logger.debug('MemoryGraphService initialized with configuration', {
      neo4jDatabase: this.config.neo4j?.database || 'neo4j',
      enableAutoSummarization: this.config.enableAutoSummarization || false,
    });
  }

  /**
   * Track a memory in the graph database - delegates to adapter
   */
  async trackMemory(memory: MemoryEntry): Promise<void> {
    try {
      await this.graphService.trackMemory(memory);
      this.logger.debug(`Tracked memory ${memory.id} in graph`);
    } catch (error) {
      // Graceful degradation - don't fail memory storage if graph tracking fails
      this.logger.warn(`Failed to track memory ${memory.id} in graph`, error);
    }
  }

  /**
   * Track multiple memories in batch - delegates to adapter
   */
  async trackMemoriesBatch(memories: readonly MemoryEntry[]): Promise<void> {
    if (memories.length === 0) return;

    try {
      await this.graphService.trackMemoriesBatch(memories);
      this.logger.debug(`Batch tracked ${memories.length} memories in graph`);
    } catch (error) {
      this.logger.warn(`Failed to batch track memories in graph`, error);
    }
  }

  /**
   * Remove memories from graph - delegates to adapter
   */
  async removeMemories(memoryIds: readonly string[]): Promise<void> {
    if (memoryIds.length === 0) return;

    try {
      const deletedCount = await this.graphService.deleteMemories(memoryIds);
      this.logger.debug(`Removed ${deletedCount} memories from graph`);
    } catch (error) {
      this.logger.warn(`Failed to remove memories from graph`, error);
    }
  }

  /**
   * Build semantic relationships between memories using configurable strategies
   */
  async buildSemanticRelationships(): Promise<void> {
    // Check if semantic relationships are enabled
    if (!this.config.semanticRelationships?.enabled) {
      this.logger.debug('Semantic relationships disabled in configuration');
      return;
    }

    const strategy = this.config.semanticRelationships.strategy || 'hybrid';
    const maxRelationships =
      this.config.semanticRelationships.maxRelationshipsPerMemory || 5;

    try {
      let totalRelationships = 0;

      switch (strategy) {
        case 'vector_similarity':
          totalRelationships = await this.buildVectorBasedRelationships(
            maxRelationships
          );
          break;
        case 'word_matching':
          totalRelationships = await this.buildWordMatchingRelationships(
            maxRelationships
          );
          break;
        case 'hybrid':
        default:
          // Try vector similarity first, fallback to word matching
          try {
            totalRelationships = await this.buildVectorBasedRelationships(
              maxRelationships
            );
            this.logger.debug(
              `Built ${totalRelationships} relationships using vector similarity`
            );
          } catch (vectorError) {
            this.logger.warn(
              'Vector similarity failed, falling back to word matching',
              vectorError
            );
            totalRelationships = await this.buildWordMatchingRelationships(
              maxRelationships
            );
            this.logger.debug(
              `Built ${totalRelationships} relationships using word matching fallback`
            );
          }
          break;
      }

      this.logger.debug(
        `Built ${totalRelationships} semantic relationships using ${strategy} strategy`
      );
    } catch (error) {
      this.logger.warn(`Failed to build semantic relationships`, error);
    }
  }

  /**
   * Build relationships using vector similarity
   *
   * Clean separation of concerns:
   * 1. VectorService finds similar memory pairs using embeddings
   * 2. GraphService creates relationship edges in Neo4j
   */
  private async buildVectorBasedRelationships(
    maxRelationships: number
  ): Promise<number> {
    const similarityThreshold =
      this.config.semanticRelationships?.similarityThreshold || 0.7;
    const countLimit = this.config.limits?.countAccuracyLimit || 1000;

    try {
      // Step 1: Use vectorService to find similar memory pairs
      const memoryPairs =
        await this.vectorService.buildVectorBasedRelationships(
          maxRelationships,
          similarityThreshold,
          countLimit
        );

      if (memoryPairs.length === 0) {
        this.logger.debug('No similar memory pairs found');
        return 0;
      }

      this.logger.debug(
        `Found ${memoryPairs.length} similar memory pairs, creating graph relationships`
      );

      // Step 2: Create relationships in the graph database
      let relationshipsCreated = 0;

      for (const pair of memoryPairs) {
        try {
          await this.graphService.createRelationship(
            pair.fromMemoryId,
            pair.toMemoryId,
            {
              type: 'RELATED_TO',
              properties: {
                similarityScore: pair.similarityScore,
                relationshipType: 'vector_similarity',
                createdAt: new Date().toISOString(),
              },
            }
          );
          relationshipsCreated++;
        } catch (error) {
          this.logger.warn(
            `Failed to create relationship from ${pair.fromMemoryId} to ${pair.toMemoryId}`,
            error
          );
        }
      }

      this.logger.debug(
        `Created ${relationshipsCreated} vector-based relationships in graph`
      );

      return relationshipsCreated;
    } catch (error) {
      throw new Error(
        `Vector-based relationship building failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Build relationships using word matching - delegates to adapter
   */
  private async buildWordMatchingRelationships(
    maxRelationships: number
  ): Promise<number> {
    const minCommonWords =
      this.config.semanticRelationships?.minCommonWords || 2;
    const requireApoc = this.config.semanticRelationships?.requireApoc ?? false;

    try {
      return await this.graphService.buildWordMatchingRelationships(
        maxRelationships,
        minCommonWords,
        requireApoc
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message?.includes('apoc') &&
        !requireApoc
      ) {
        throw new Error(
          'APOC procedures not available and requireApoc is false'
        );
      }
      throw error;
    }
  }

  /**
   * Get graph statistics - delegates to adapter
   */
  async getGraphStats(): Promise<{
    totalMemories: number;
    totalThreads: number;
    totalRelationships: number;
    averageMemoriesPerThread: number;
  }> {
    try {
      return await this.graphService.getMemoryGraphStats();
    } catch (error) {
      this.logger.warn(`Failed to get graph stats`, error);
      return {
        totalMemories: 0,
        totalThreads: 0,
        totalRelationships: 0,
        averageMemoriesPerThread: 0,
      };
    }
  }

  /**
   * Find connected memories for conversation flow - delegates to adapter
   */
  async findMemoryConnections(
    memoryId: string,
    depth = 2
  ): Promise<readonly string[]> {
    try {
      const relationshipLimit =
        this.config.limits?.relationshipQueryLimit || 10;
      return await this.graphService.findMemoryConnections(
        memoryId,
        depth,
        relationshipLimit
      );
    } catch (error) {
      this.logger.warn(
        `Failed to find connections for memory ${memoryId}`,
        error
      );
      return [];
    }
  }

  /**
   * Get conversation flow for a thread - delegates to adapter
   */
  async getThreadFlow(threadId: string): Promise<
    ReadonlyArray<{
      memoryId: string;
      content: string;
      type: string;
      createdAt: Date;
      connections: readonly string[];
    }>
  > {
    try {
      return await this.graphService.getThreadFlow(threadId);
    } catch (error) {
      this.logger.warn(`Failed to get thread flow for ${threadId}`, error);
      return [];
    }
  }
}
