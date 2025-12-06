import { Injectable, Inject, Logger } from '@nestjs/common';
import { getRepositoryToken } from '@hive-academy/nestjs-neo4j';
import {
  IThreadRegistryStore,
  ThreadMetadata,
  ThreadListOptions,
} from '@hive-academy/langgraph-memory';
import { ThreadRegistryRepository } from '../../repositories/neo4j/thread-registry.repository';
import { Thread } from '../../entities/neo4j/thread.entity';

/**
 * Neo4j adapter for thread registry storage.
 *
 * This adapter delegates all database operations to ThreadRegistryRepository,
 * providing a clean separation of concerns and type-safe database operations.
 *
 * All methods are simple delegations to the repository layer with input validation.
 *
 * Architecture Pattern: Adapter → Repository Delegation
 * Reference: Neo4jHitlStorageAdapter (neo4j-hitl-storage.adapter.ts:24-191)
 *
 * Note: This adapter is a singleton. Security context is obtained via ClsService
 * in the underlying repository's security decorators.
 */
@Injectable()
export class Neo4jThreadRegistryAdapter extends IThreadRegistryStore {
  private readonly logger = new Logger(Neo4jThreadRegistryAdapter.name);

  constructor(
    @Inject(getRepositoryToken(Thread))
    private readonly threadRepo: ThreadRegistryRepository
  ) {
    super();
    this.logger.debug(
      'Neo4jThreadRegistryAdapter initialized with ThreadRegistryRepository'
    );
  }

  /**
   * List threads for a specific user with pagination and sorting
   * Delegates to repository after validation
   */
  async listThreads(
    userId: string,
    options?: ThreadListOptions
  ): Promise<ThreadMetadata[]> {
    if (!userId?.trim()) {
      throw new Error('User ID is required');
    }
    return this.threadRepo.listThreads(userId, options);
  }

  /**
   * Get thread metadata by thread ID
   * Delegates to repository after validation
   */
  async getThread(
    threadId: string,
    userId: string
  ): Promise<ThreadMetadata | null> {
    if (!threadId?.trim()) {
      throw new Error('Thread ID is required');
    }
    if (!userId?.trim()) {
      throw new Error('User ID is required');
    }
    return this.threadRepo.getThread(threadId, userId);
  }

  /**
   * Create new thread with metadata
   * Uses provided threadId or generates unique threadId if not provided
   * Always generates timestamps before delegation
   */
  async createThread(
    userId: string,
    metadata: Partial<ThreadMetadata>
  ): Promise<ThreadMetadata> {
    if (!userId?.trim()) {
      throw new Error('User ID is required');
    }

    // Use provided threadId if available, otherwise generate one
    const threadId = metadata.threadId?.trim() || this.generateThreadId();
    const now = new Date();

    const fullMetadata: ThreadMetadata = {
      threadId,
      userId,
      createdAt: now,
      lastMessageAt: now,
      title: metadata.title,
      metadata: metadata.metadata,
    };

    this.validateThreadMetadata(fullMetadata);

    return this.threadRepo.createThread(fullMetadata);
  }

  /**
   * Update thread metadata
   * Delegates to repository after validation
   */
  async updateThread(
    threadId: string,
    userId: string,
    updates: Partial<ThreadMetadata>
  ): Promise<void> {
    if (!threadId?.trim()) {
      throw new Error('Thread ID is required');
    }
    if (!userId?.trim()) {
      throw new Error('User ID is required');
    }
    await this.threadRepo.updateThread(threadId, userId, updates);
  }

  /**
   * Delete thread by ID
   * Delegates to repository after validation
   */
  async deleteThread(threadId: string, userId: string): Promise<boolean> {
    if (!threadId?.trim()) {
      throw new Error('Thread ID is required');
    }
    if (!userId?.trim()) {
      throw new Error('User ID is required');
    }
    return this.threadRepo.deleteThread(threadId, userId);
  }

  /**
   * Generate unique thread ID
   * Format: thread-{timestamp}-{random}
   */
  private generateThreadId(): string {
    return `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
