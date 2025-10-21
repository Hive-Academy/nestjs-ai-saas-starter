import type {
  ApprovalLevel,
  ApprovalRequest,
} from '../services/approval-chain.service';

/**
 * Storage interface for approval chains and requests
 * Provides persistent storage for approval workflow state
 */
export interface IApprovalChainStorageService {
  // Chain Management
  /**
   * Store an approval chain configuration
   */
  storeApprovalChain(chainId: string, levels: ApprovalLevel[]): Promise<void>;

  /**
   * Retrieve an approval chain configuration
   */
  getApprovalChain(chainId: string): Promise<ApprovalLevel[] | null>;

  /**
   * Get all approval chains
   */
  getAllApprovalChains(): Promise<Record<string, ApprovalLevel[]>>;

  /**
   * Delete an approval chain
   */
  deleteApprovalChain(chainId: string): Promise<boolean>;

  // Request Management
  /**
   * Store an approval request
   */
  storeApprovalRequest(request: ApprovalRequest): Promise<void>;

  /**
   * Retrieve an approval request by ID
   */
  getApprovalRequest(requestId: string): Promise<ApprovalRequest | null>;

  /**
   * Get all approval requests for a specific execution
   */
  getApprovalRequestsByExecution(
    executionId: string
  ): Promise<ApprovalRequest[]>;

  /**
   * Update approval request status and metadata
   */
  updateApprovalRequestStatus(
    requestId: string,
    status: 'pending' | 'approved' | 'rejected' | 'expired' | undefined,
    metadata?: Record<string, unknown>
  ): Promise<void>;

  /**
   * Update approval request with complete data
   */
  updateApprovalRequest(request: ApprovalRequest): Promise<void>;

  /**
   * Delete an approval request
   */
  deleteApprovalRequest(requestId: string): Promise<boolean>;

  // Recovery Operations
  /**
   * Get all active approval requests (pending, escalated)
   */
  getAllActiveRequests(): Promise<ApprovalRequest[]>;

  /**
   * Get pending approvals for a specific approver
   */
  getPendingApprovalsForApprover(
    approverId: string
  ): Promise<ApprovalRequest[]>;

  /**
   * Cleanup old requests and chains
   * @param maxAge Maximum age in milliseconds (default: 30 days)
   * @returns Number of items cleaned up
   */
  cleanup(maxAge?: number): Promise<number>;

  /**
   * Health check for storage connectivity
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Configuration for approval chain storage
 */
export interface ApprovalChainStorageConfig {
  /**
   * Storage provider type
   */
  provider: 'neo4j' | 'memory' | 'redis';

  /**
   * Connection options specific to provider
   */
  connectionOptions?: Record<string, unknown>;

  /**
   * Cache TTL for frequently accessed data (ms)
   */
  cacheTtl?: number;

  /**
   * Enable automatic cleanup of old data
   */
  autoCleanup?: boolean;

  /**
   * Cleanup interval in milliseconds
   */
  cleanupInterval?: number;
}
