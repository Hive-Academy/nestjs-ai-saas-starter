/**
 * IApprovalStateStorageService - Interface for approval state persistence
 *
 * **Purpose**: Define contract for approval state storage adapters
 * **Pattern**: Abstract interface for adapter implementations
 *
 * **Why Separate from Checkpoints**:
 * - Approval state is operational data (queryable, reportable)
 * - Checkpoints are workflow state (managed by LangGraph)
 * - Neo4j provides relationship-based approval history
 * - Enables approval pattern analysis and ML learning
 *
 * **Implementation Pattern**:
 * ```typescript
 * @Injectable()
 * export class Neo4jApprovalStateStorageAdapter implements IApprovalStateStorageService {
 *   constructor(
 *     @Inject(getRepositoryToken(ApprovalState))
 *     private readonly repo: ApprovalStateRepository
 *   ) {}
 *
 *   async saveApprovalState(data: ApprovalStateData): Promise<void> {
 *     return this.repo.saveApprovalState(data);
 *   }
 * }
 * ```
 *
 * Verification:
 * - Pattern: libs/langgraph-modules/adapters/src/lib/adapters/hitl/*.adapter.ts
 * - Source: task-tracking/TASK_2025_032/checkpoint-package-assessment.md:729-770
 */

/**
 * Approval state data stored in Neo4j
 */
export interface ApprovalStateData {
  /** Unique approval state ID */
  id: string;

  /** Thread ID for grouping related approvals */
  threadId: string;

  /** Node ID in workflow graph */
  nodeId: string;

  /** Current approval status */
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'timeout';

  /** Additional metadata (execution context, confidence, risk level) */
  metadata?: Record<string, unknown>;

  /** When approval was requested */
  requestedAt: Date;

  /** When approval was responded to (optional) */
  respondedAt?: Date;

  /** Who responded to the approval (optional) */
  respondedBy?: string;
}

/**
 * Approval chain progression data
 */
export interface ApprovalChainData {
  /** Chain identifier */
  chainId: string;

  /** Execution identifier */
  executionId: string;

  /** Current level in chain */
  level: number;

  /** Approvers at this level */
  approvers: string[];

  /** Chain status */
  status: string;

  /** Associated request ID */
  requestId: string;

  /** Node ID where chain is active */
  nodeId: string;

  /** Timestamp of chain progression */
  timestamp: Date;
}

/**
 * Options for listing approvals
 */
export interface ListApprovalOptions {
  /** Filter by status */
  status?: string;

  /** Limit results */
  limit?: number;
}

/**
 * Abstract interface for approval state storage adapters
 *
 * All HITL approval state storage implementations must implement this interface.
 * The adapter pattern allows swapping storage backends (Neo4j, PostgreSQL, etc.)
 * without changing service code.
 */
export abstract class IApprovalStateStorageService {
  /**
   * Save approval state to storage
   *
   * @param data - Approval state data to persist
   */
  abstract saveApprovalState(data: ApprovalStateData): Promise<void>;

  /**
   * Load approval state by ID
   *
   * @param id - Unique approval state ID
   * @returns Approval state data or null if not found
   */
  abstract loadApprovalState(id: string): Promise<ApprovalStateData | null>;

  /**
   * List approval states by thread ID
   *
   * @param threadId - Thread identifier for grouping approvals
   * @param options - Optional filters and limits
   * @returns Array of approval state data
   */
  abstract listApprovalsByThread(
    threadId: string,
    options?: ListApprovalOptions
  ): Promise<ApprovalStateData[]>;

  /**
   * Update approval status when response is received
   *
   * @param id - Approval state ID
   * @param status - New status
   * @param respondedBy - User who responded
   * @param respondedAt - Optional timestamp (defaults to now)
   */
  abstract updateApprovalStatus(
    id: string,
    status: string,
    respondedBy: string,
    respondedAt?: Date
  ): Promise<void>;

  /**
   * Save approval chain progression
   *
   * Used for multi-level approval chains to track progress through levels.
   *
   * @param data - Approval chain progression data
   */
  abstract saveApprovalChain(data: ApprovalChainData): Promise<void>;

  /**
   * Load approval chain progress
   *
   * @param chainId - Chain identifier
   * @param executionId - Execution identifier
   * @returns Approval chain data or null if not found
   */
  abstract loadApprovalChain(
    chainId: string,
    executionId: string
  ): Promise<ApprovalChainData | null>;

  /**
   * Cleanup old approval states (retention policy)
   *
   * @param maxAgeMs - Maximum age in milliseconds
   * @returns Number of deleted approval states
   */
  abstract cleanupOldApprovals(maxAgeMs: number): Promise<number>;

  /**
   * Ensure indexes exist for fast queries
   *
   * Should be called on module initialization to create database indexes.
   * Implementation is database-specific.
   */
  abstract ensureIndexes(): Promise<void>;
}
