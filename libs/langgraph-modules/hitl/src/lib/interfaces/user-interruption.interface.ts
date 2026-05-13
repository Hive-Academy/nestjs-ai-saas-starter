import { Injectable } from '@nestjs/common';

/**
 * User interruption types
 */
export enum InterruptionType {
  QUESTION = 'question',
  CLARIFICATION = 'clarification',
  INPUT_REQUEST = 'input_request',
  APPROVAL_REQUEST = 'approval_request',
  CORRECTION = 'correction',
}

/**
 * User interruption status
 */
export enum InterruptionStatus {
  PENDING = 'pending',
  RESPONDED = 'responded',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
}

/**
 * Interruption context provided when creating interruption
 */
export interface InterruptionContext {
  /** Execution ID being interrupted */
  executionId: string;
  /** Node ID where interruption occurred */
  nodeId: string;
  /** Type of interruption */
  type: InterruptionType;
  /** Message/question from user */
  message: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Current workflow state */
  workflowState?: Partial<Record<string, unknown>>;
}

/**
 * User response to interruption
 */
export interface UserInterruptionResponse {
  /** Interruption ID */
  interruptionId: string;
  /** User response message */
  response: string;
  /** Response metadata */
  metadata?: Record<string, unknown>;
  /** User who responded */
  userId?: string;
  /** Response timestamp */
  timestamp: Date;
  /** Whether to continue execution */
  continueExecution: boolean;
}

/**
 * User interruption record
 */
export interface UserInterruption {
  /** Unique interruption ID */
  id: string;
  /** Execution ID */
  executionId: string;
  /** Node ID where interruption occurred */
  nodeId: string;
  /** Interruption type */
  type: InterruptionType;
  /** Current status */
  status: InterruptionStatus;
  /** Interruption context */
  context: InterruptionContext;
  /** User response (if any) */
  response?: UserInterruptionResponse;
  /** Timestamps */
  timestamps: {
    created: Date;
    responded?: Date;
    timeout?: Date;
  };
  /** Timeout configuration */
  timeout: {
    duration: number;
    strategy: 'continue' | 'cancel' | 'escalate';
  };
}

/**
 * Interruption storage interface following adapter pattern
 */
@Injectable()
export abstract class IUserInterruptionStorageService {
  /**
   * Store interruption request
   */
  abstract storeInterruption(interruption: UserInterruption): Promise<string>;

  /**
   * Get interruption by ID
   */
  abstract getInterruption(id: string): Promise<UserInterruption | null>;

  /**
   * Get active interruptions for execution
   */
  abstract getActiveInterruptions(
    executionId: string
  ): Promise<readonly UserInterruption[]>;

  /**
   * Update interruption status
   */
  abstract updateInterruptionStatus(
    id: string,
    status: InterruptionStatus,
    response?: UserInterruptionResponse
  ): Promise<boolean>;

  /**
   * Get interruption history for execution
   */
  abstract getInterruptionHistory(
    executionId: string
  ): Promise<readonly UserInterruption[]>;

  /**
   * Clean up expired interruptions
   */
  abstract cleanupExpiredInterruptions(): Promise<number>;

  /**
   * Get all active interruptions across all executions (for recovery)
   */
  abstract getAllActiveInterruptions(): Promise<readonly UserInterruption[]>;
}

/**
 * Core user interruption service interface
 */
@Injectable()
export abstract class IUserInterruptionService {
  /**
   * Request user interruption during workflow execution
   */
  abstract requestInterruption(context: InterruptionContext): Promise<string>;

  /**
   * Handle user response to interruption
   */
  abstract handleUserResponse(response: UserInterruptionResponse): Promise<{
    success: boolean;
    shouldContinue: boolean;
    updatedState?: Partial<Record<string, unknown>>;
    error?: string;
  }>;

  /**
   * Get active interruptions for execution
   */
  abstract getActiveInterruptions(
    executionId: string
  ): Promise<readonly UserInterruption[]>;

  /**
   * Cancel interruption
   */
  abstract cancelInterruption(interruptionId: string): Promise<boolean>;

  /**
   * Check if execution has pending interruptions
   */
  abstract hasPendingInterruptions(executionId: string): Promise<boolean>;
}
