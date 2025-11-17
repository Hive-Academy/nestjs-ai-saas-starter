import { Injectable, Logger } from '@nestjs/common';
import {
  Neo4jRepositoryBase,
  NeogmaService,
  Neo4jCrudService,
  ParameterBindingUtility,
  Safe,
  ValidateInput,
  AuditLog,
} from '@hive-academy/nestjs-neo4j';
import { Thread } from '../../entities/neo4j/thread.entity';
import type {
  ThreadListOptions,
  ThreadMetadata,
} from '@hive-academy/langgraph-memory';

/**
 * ThreadRegistry Repository (Neo4j)
 *
 * Repository for thread registry database operations using Neo4j.
 * Executes Cypher queries for thread CRUD operations with proper
 * parameterization, pagination, and sorting.
 *
 * Architecture Pattern: Repository with Cypher Query Execution
 * Reference: ApprovalRequestRepository (approval-request.repository.ts:46-278)
 *
 * Inherits base CRUD methods from Neo4jRepositoryBase.
 * Custom methods for thread-specific operations:
 * - listThreads(): Query threads with pagination and sorting
 * - getThread(): Get single thread by ID
 * - createThread(): Create new thread with metadata
 * - updateThread(): Update thread fields
 * - deleteThread(): Delete thread by ID
 */
@Injectable()
export class ThreadRegistryRepository extends Neo4jRepositoryBase<Thread> {
  private readonly logger = new Logger(ThreadRegistryRepository.name);

  constructor(neogma: NeogmaService, crud: Neo4jCrudService) {
    super(Thread, 'Thread', neogma, crud);
  }

  /**
   * List threads for a specific user with pagination and sorting
   *
   * @param userId - User identifier
   * @param options - Pagination and sorting options
   * @returns Array of thread metadata ordered by specified criteria
   */
  @ValidateInput()
  @AuditLog({ logLevel: 'detailed', enabled: true, logSuccess: true })
  @Safe()
  async listThreads(
    userId: string,
    options: ThreadListOptions = {}
  ): Promise<ThreadMetadata[]> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    const orderBy = options.orderBy || 'lastMessageAt';
    const orderDirection = options.orderDirection || 'DESC';

    try {
      const queryBuilder = this.neogma.createQueryBuilder();

      queryBuilder
        .match(`(t:Thread)`)
        .where(`t.userId = $userId`)
        .return(`t`)
        .orderBy(`t.${orderBy} ${orderDirection}`)
        .skip('$offset')
        .limit('$limit');

      const baseQuery = queryBuilder.getStatement();
      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        userId,
        offset,
        limit,
      });

      const result = await this.neogma.run(query, params);

      return result.records.map((record: any) =>
        this.mapToThreadMetadata(record.get('t'))
      );
    } catch (error) {
      this.logger.error(
        `Failed to list threads for user ${userId}`,
        error instanceof Error ? error.stack : String(error)
      );
      throw new Error(
        `Failed to list threads: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get thread metadata by thread ID
   *
   * @param threadId - Thread identifier
   * @returns Thread metadata if found, null otherwise
   */
  @ValidateInput()
  @AuditLog({ logLevel: 'detailed', enabled: true, logSuccess: true })
  @Safe()
  async getThread(threadId: string): Promise<ThreadMetadata | null> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();

      queryBuilder
        .match(`(t:Thread)`)
        .where(`t.threadId = $threadId`)
        .return(`t`);

      const baseQuery = queryBuilder.getStatement();
      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        threadId,
      });

      const result = await this.neogma.run(query, params);

      if (result.records.length === 0) {
        return null;
      }

      return this.mapToThreadMetadata(result.records[0].get('t'));
    } catch (error) {
      this.logger.error(
        `Failed to get thread ${threadId}`,
        error instanceof Error ? error.stack : String(error)
      );
      throw new Error(
        `Failed to get thread: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Create new thread with metadata
   *
   * @param metadata - Complete thread metadata
   * @returns Created thread metadata
   */
  @ValidateInput()
  @AuditLog({ logLevel: 'detailed', enabled: true, logSuccess: true })
  @Safe()
  async createThread(metadata: ThreadMetadata): Promise<ThreadMetadata> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();

      queryBuilder
        .create(
          `(t:Thread {
          threadId: $threadId,
          userId: $userId,
          createdAt: datetime($createdAt),
          lastMessageAt: datetime($lastMessageAt),
          title: $title,
          metadata: $metadata,
          updatedAt: datetime()
        })`
        )
        .return('t');

      const baseQuery = queryBuilder.getStatement();
      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        threadId: metadata.threadId,
        userId: metadata.userId,
        createdAt: metadata.createdAt.toISOString(),
        lastMessageAt: metadata.lastMessageAt.toISOString(),
        title: metadata.title || null,
        metadata: metadata.metadata ? JSON.stringify(metadata.metadata) : null,
      });

      const result = await this.neogma.run(query, params);

      return this.mapToThreadMetadata(result.records[0].get('t'));
    } catch (error) {
      this.logger.error(
        `Failed to create thread ${metadata.threadId}`,
        error instanceof Error ? error.stack : String(error)
      );
      throw new Error(
        `Failed to create thread: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Update thread metadata
   *
   * @param threadId - Thread identifier
   * @param updates - Partial updates to apply
   */
  @ValidateInput()
  @AuditLog({ logLevel: 'detailed', enabled: true, logSuccess: true })
  @Safe()
  async updateThread(
    threadId: string,
    updates: Partial<ThreadMetadata>
  ): Promise<void> {
    try {
      const setClauses: string[] = [];
      const params: Record<string, unknown> = { threadId };

      if (updates.lastMessageAt) {
        setClauses.push('t.lastMessageAt = datetime($lastMessageAt)');
        params.lastMessageAt = updates.lastMessageAt.toISOString();
      }
      if (updates.title !== undefined) {
        setClauses.push('t.title = $title');
        params.title = updates.title;
      }
      if (updates.metadata !== undefined) {
        setClauses.push('t.metadata = $metadata');
        params.metadata = JSON.stringify(updates.metadata);
      }

      if (setClauses.length === 0) {
        return;
      }

      // Always update updatedAt
      setClauses.push('t.updatedAt = datetime()');

      const queryBuilder = this.neogma.createQueryBuilder();

      queryBuilder
        .match(`(t:Thread)`)
        .where(`t.threadId = $threadId`)
        .set(setClauses.join(', '))
        .return('t');

      const baseQuery = queryBuilder.getStatement();
      const { query, params: boundParams } = ParameterBindingUtility.autoBind(
        baseQuery,
        params
      );

      await this.neogma.run(query, boundParams);
    } catch (error) {
      this.logger.error(
        `Failed to update thread ${threadId}`,
        error instanceof Error ? error.stack : String(error)
      );
      throw new Error(
        `Failed to update thread: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Delete thread by ID
   *
   * @param threadId - Thread identifier
   * @returns true if deleted, false if not found
   */
  @ValidateInput()
  @AuditLog({ logLevel: 'detailed', enabled: true, logSuccess: true })
  @Safe()
  async deleteThread(threadId: string): Promise<boolean> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();

      queryBuilder
        .match(`(t:Thread)`)
        .where(`t.threadId = $threadId`)
        .delete('t')
        .return('count(t) as deletedCount');

      const baseQuery = queryBuilder.getStatement();
      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        threadId,
      });

      const result = await this.neogma.run(query, params);

      const deletedCount =
        result.records[0]?.get('deletedCount')?.toNumber() || 0;
      return deletedCount > 0;
    } catch (error) {
      this.logger.error(
        `Failed to delete thread ${threadId}`,
        error instanceof Error ? error.stack : String(error)
      );
      throw new Error(
        `Failed to delete thread: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Map Neo4j node to ThreadMetadata
   *
   * @param node - Neo4j node from query result
   * @returns ThreadMetadata object
   */
  private mapToThreadMetadata(node: unknown): ThreadMetadata {
    const props = (node as { properties: Record<string, unknown> }).properties;

    return {
      threadId: props.threadId as string,
      userId: props.userId as string,
      createdAt: new Date(props.createdAt as string),
      lastMessageAt: new Date(props.lastMessageAt as string),
      title: (props.title as string | null) || undefined,
      metadata: props.metadata
        ? JSON.parse(props.metadata as string)
        : undefined,
    };
  }
}
