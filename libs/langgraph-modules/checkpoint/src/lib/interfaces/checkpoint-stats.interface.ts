/**
 * Statistics and monitoring interfaces for checkpoints
 */

/**
 * Checkpoint statistics for monitoring
 */
export interface CheckpointStats {
  /**
   * Total number of checkpoints
   */
  totalCheckpoints: number;

  /**
   * Number of active threads
   */
  activeThreads: number;

  /**
   * Average checkpoint size in bytes
   */
  averageSize: number;

  /**
   * Total storage used in bytes
   */
  totalStorageUsed: number;

  /**
   * Checkpoints created in last hour
   */
  recentCheckpoints: number;

  /**
   * Average save time in milliseconds
   */
  averageSaveTime: number;

  /**
   * Average load time in milliseconds
   */
  averageLoadTime: number;

  /**
   * Error rate (0-1)
   */
  errorRate: number;

  /**
   * Storage backend type
   */
  storageType: string;

  /**
   * Last cleanup timestamp
   */
  lastCleanup?: Date;
}