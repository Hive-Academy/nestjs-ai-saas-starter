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
  async getThread(threadId: string): Promise<ThreadMetadata | null> {
    if (!threadId?.trim()) {
      throw new Error('Thread ID is required');
    }
    return this.threadRepo.getThread(threadId);
  }

  /**
   * Create new thread with metadata
   * Generates unique threadId and timestamps before delegation
   */
  async createThread(
    userId: string,
    metadata: Partial<ThreadMetadata>
  ): Promise<ThreadMetadata> {
    if (!userId?.trim()) {
      throw new Error('User ID is required');
    }

    const threadId = this.generateThreadId();
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
    updates: Partial<ThreadMetadata>
  ): Promise<void> {
    if (!threadId?.trim()) {
      throw new Error('Thread ID is required');
    }
    await this.threadRepo.updateThread(threadId, updates);
  }

  /**
   * Delete thread by ID
   * Delegates to repository after validation
   */
  async deleteThread(threadId: string): Promise<boolean> {
    if (!threadId?.trim()) {
      throw new Error('Thread ID is required');
    }
    return this.threadRepo.deleteThread(threadId);
  }

  /**
   * Generate unique thread ID
   * Format: thread-{timestamp}-{random}
   */
  private generateThreadId(): string {
    return `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
