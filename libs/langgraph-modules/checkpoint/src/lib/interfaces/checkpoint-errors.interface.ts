/**
 * Error interfaces for checkpoint operations
 */

/**
 * Checkpoint save error details
 */
export interface CheckpointSaveError extends Error {
  /**
   * Error code
   */
  code: string;

  /**
   * Thread ID that failed
   */
  threadId?: string;

  /**
   * Checkpoint ID that failed
   */
  checkpointId?: string;

  /**
   * Original error cause
   */
  cause?: Error;

  /**
   * Retry attempt number
   */
  retryAttempt?: number;

  /**
   * Whether this error is retryable
   */
  retryable?: boolean;
}

/**
 * Checkpoint load error details
 */
export interface CheckpointLoadError extends Error {
  /**
   * Error code
   */
  code: string;

  /**
   * Thread ID that failed
   */
  threadId?: string;

  /**
   * Checkpoint ID that failed
   */
  checkpointId?: string;

  /**
   * Original error cause
   */
  cause?: Error;
}
