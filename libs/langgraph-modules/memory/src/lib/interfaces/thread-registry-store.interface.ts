import { Injectable } from '@nestjs/common';

/**
 * Thread Registry Storage Interface
 *
 * Provides contract for thread registry storage adapters, enabling pluggable
 * storage implementations (Neo4j, ChromaDB, etc.) while maintaining type safety
 * and NestJS dependency injection compatibility.
 *
 * **Architecture Pattern**: @Injectable() Abstract Class (HITL Storage Pattern)
 * **Reference**: IHitlStorageService (hitl-storage.interface.ts:12-165)
 *
 * **Purpose**: Thread metadata storage for memory isolation across checkpoints
 * **Use Case**: List user conversations, track thread activity, manage thread lifecycle
 *
 * **Storage Independence**:
 * - BaseStore: ChromaDB (for LangGraph checkpoint items)
 * - ThreadRegistryStore: Neo4j (default) OR ChromaDB (alternative)
 * - Both storage layers are independent, zero coupling
 */
@Injectable()
export abstract class IThreadRegistryStore {
  /**
   * List threads for a specific user with pagination and sorting
   *
   * @param userId - User identifier
   * @param options - Pagination and sorting options
   * @returns Array of thread metadata ordered by specified criteria
   *
   * @example
   * ```typescript
   * const threads = await threadRegistry.listThreads('user-123', {
   *   limit: 20,
   *   offset: 0,
   *   orderBy: 'lastMessageAt',
   *   orderDirection: 'DESC'
   * });
   * ```
   */
  abstract listThreads(
    userId: string,
    options?: ThreadListOptions
  ): Promise<ThreadMetadata[]>;

  /**
   * Get thread metadata by thread ID
   *
   * @param threadId - Unique thread identifier
   * @returns Thread metadata if found, null otherwise (not throw)
   *
   * @example
   * ```typescript
   * const thread = await threadRegistry.getThread('thread-456');
   * if (!thread) {
   *   console.log('Thread not found');
   * }
   * ```
   */
  abstract getThread(threadId: string): Promise<ThreadMetadata | null>;

  /**
   * Create new thread with metadata
   *
   * @param userId - User identifier
   * @param metadata - Partial thread metadata (threadId and timestamps auto-generated)
   * @returns Complete thread metadata with generated fields
   *
   * @example
   * ```typescript
   * const thread = await threadRegistry.createThread('user-123', {
   *   title: 'New conversation',
   *   metadata: { source: 'web_ui' }
   * });
   * ```
   */
  abstract createThread(
    userId: string,
    metadata: Partial<ThreadMetadata>
  ): Promise<ThreadMetadata>;

  /**
   * Update thread metadata
   *
   * @param threadId - Thread identifier
   * @param updates - Partial updates to apply
   *
   * @example
   * ```typescript
   * await threadRegistry.updateThread('thread-456', {
   *   title: 'Updated title',
   *   lastMessageAt: new Date()
   * });
   * ```
   */
  abstract updateThread(
    threadId: string,
    updates: Partial<ThreadMetadata>
  ): Promise<void>;

  /**
   * Delete thread by ID
   *
   * @param threadId - Thread identifier
   * @returns true if deleted, false if not found
   *
   * @example
   * ```typescript
   * const deleted = await threadRegistry.deleteThread('thread-456');
   * if (deleted) {
   *   console.log('Thread deleted successfully');
   * }
   * ```
   */
  abstract deleteThread(threadId: string): Promise<boolean>;

  /**
   * Validation template method for thread metadata
   * Available to all adapter implementations for consistent validation
   *
   * @param metadata - Thread metadata to validate
   * @throws Error if validation fails
   *
   * @protected
   */
  protected validateThreadMetadata(metadata: ThreadMetadata): void {
    if (!metadata.threadId?.trim()) {
      throw new Error('Thread ID is required and cannot be empty');
    }

    if (!metadata.userId?.trim()) {
      throw new Error('User ID is required and cannot be empty');
    }

    if (!(metadata.createdAt instanceof Date)) {
      throw new Error('CreatedAt must be a valid Date instance');
    }

    if (!(metadata.lastMessageAt instanceof Date)) {
      throw new Error('LastMessageAt must be a valid Date instance');
    }

    // Ensure lastMessageAt is not before createdAt
    if (metadata.lastMessageAt < metadata.createdAt) {
      throw new Error('LastMessageAt cannot be before CreatedAt');
    }
  }
}

/**
 * Thread Metadata
 *
 * Complete thread metadata structure for storage and retrieval.
 * All fields are readonly to enforce immutability at type level.
 */
export interface ThreadMetadata {
  /** Unique thread identifier (auto-generated) */
  readonly threadId: string;

  /** User identifier who owns this thread */
  readonly userId: string;

  /** When the thread was created */
  readonly createdAt: Date;

  /** When the last message was sent in this thread */
  readonly lastMessageAt: Date;

  /** Optional human-readable thread title */
  readonly title?: string;

  /** Additional metadata as JSON object */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Thread List Options
 *
 * Pagination and sorting options for thread listing.
 * All fields are readonly and optional with sensible defaults.
 */
export interface ThreadListOptions {
  /** Maximum number of threads to return (default: 50) */
  readonly limit?: number;

  /** Number of threads to skip (default: 0) */
  readonly offset?: number;

  /** Field to order by (default: 'lastMessageAt') */
  readonly orderBy?: 'createdAt' | 'lastMessageAt';

  /** Sort direction (default: 'DESC' for most recent first) */
  readonly orderDirection?: 'ASC' | 'DESC';
}
