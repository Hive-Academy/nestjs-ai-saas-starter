import { Injectable, Logger } from '@nestjs/common';
import {
  IUserInterruptionStorageService,
  UserInterruption,
  UserInterruptionResponse,
  InterruptionStatus,
} from '@hive-academy/langgraph-hitl';
import { InterruptionRepository } from '../../repositories/interruption.repository';

/**
 * Clean Neo4j adapter for user interruption storage.
 *
 * This adapter delegates all database operations to InterruptionRepository,
 * providing a clean separation of concerns and type-safe database operations.
 */
@Injectable()
export class Neo4jInterruptionStorageAdapter extends IUserInterruptionStorageService {
  private readonly logger = new Logger(Neo4jInterruptionStorageAdapter.name);

  constructor(private readonly interruptionRepo: InterruptionRepository) {
    super();
    this.logger.debug(
      'Neo4jInterruptionStorageAdapter initialized with InterruptionRepository'
    );
  }

  /**
   * Store interruption request - delegates to repository
   */
  async storeInterruption(interruption: UserInterruption): Promise<string> {
    if (!interruption?.id?.trim()) {
      throw new Error('Interruption ID is required');
    }
    if (!interruption?.executionId?.trim()) {
      throw new Error('Execution ID is required');
    }
    return this.interruptionRepo.storeInterruption(interruption);
  }

  /**
   * Get interruption by ID - delegates to repository
   */
  async getInterruption(id: string): Promise<UserInterruption | null> {
    if (!id?.trim()) {
      throw new Error('Interruption ID is required');
    }
    return this.interruptionRepo.getInterruption(id);
  }

  /**
   * Get active interruptions for execution - delegates to repository
   */
  async getActiveInterruptions(
    executionId: string
  ): Promise<readonly UserInterruption[]> {
    if (!executionId?.trim()) {
      throw new Error('Execution ID is required');
    }
    return this.interruptionRepo.getActiveInterruptions(executionId);
  }

  /**
   * Update interruption status - delegates to repository
   */
  async updateInterruptionStatus(
    id: string,
    status: InterruptionStatus,
    response?: UserInterruptionResponse
  ): Promise<boolean> {
    if (!id?.trim()) {
      throw new Error('Interruption ID is required');
    }
    if (!status) {
      throw new Error('Status is required');
    }
    return this.interruptionRepo.updateInterruptionStatus(id, status, response);
  }

  /**
   * Get interruption history for execution - delegates to repository
   */
  async getInterruptionHistory(
    executionId: string
  ): Promise<readonly UserInterruption[]> {
    if (!executionId?.trim()) {
      throw new Error('Execution ID is required');
    }
    return this.interruptionRepo.getInterruptionHistory(executionId);
  }

  /**
   * Get all active interruptions - delegates to repository
   */
  async getAllActiveInterruptions(): Promise<readonly UserInterruption[]> {
    return this.interruptionRepo.getAllActiveInterruptions();
  }

  /**
   * Cleanup expired interruptions - delegates to repository
   */
  async cleanupExpiredInterruptions(): Promise<number> {
    return this.interruptionRepo.cleanupExpiredInterruptions();
  }
}
