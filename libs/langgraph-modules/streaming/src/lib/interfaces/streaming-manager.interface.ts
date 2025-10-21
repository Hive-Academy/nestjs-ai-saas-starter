/**
 * Initializable Service Interface - For services that support manual start/stop
 */
export interface IInitializableService {
  start(): Promise<void>;
  stop(): Promise<void>;
  isStarted?: boolean;
}

/**
 * StreamingManager Interface - User-Controlled Initialization Pattern
 *
 * This interface provides a clean contract for consumer applications to control
 * when and how streaming services are initialized, removing the need for
 * problematic auto-initialization during NestJS lifecycle hooks.
 */

export interface IStreamingManager {
  /**
   * Initialize streaming services after the consumer app is fully ready
   * Called manually by the user when they want to start streaming
   */
  initializeStreaming(): Promise<void>;

  /**
   * Stop all streaming services gracefully
   */
  stopStreaming(): Promise<void>;

  /**
   * Check if streaming services are currently active
   */
  isStreamingActive(): boolean;

  /**
   * Get current streaming statistics
   */
  getStreamingStats(): StreamingStats;
}

export interface StreamingStats {
  tokensStreamed: number;
  activeConnections: number;
  uptime: number;
  lastActivity: Date;
  errors: number;
}

/**
 * Base adapter class that consumer apps can extend
 * Provides common streaming management functionality
 */
export abstract class StreamingManagerAdapter implements IStreamingManager {
  protected isActive = false;
  protected startTime?: Date;
  protected stats: StreamingStats = {
    tokensStreamed: 0,
    activeConnections: 0,
    uptime: 0,
    lastActivity: new Date(),
    errors: 0,
  };

  abstract initializeStreaming(): Promise<void>;
  abstract stopStreaming(): Promise<void>;

  isStreamingActive(): boolean {
    return this.isActive;
  }

  getStreamingStats(): StreamingStats {
    if (this.startTime) {
      this.stats.uptime = Date.now() - this.startTime.getTime();
    }
    return { ...this.stats };
  }

  protected markActive(): void {
    this.isActive = true;
    this.startTime = new Date();
  }

  protected markInactive(): void {
    this.isActive = false;
    this.startTime = undefined;
  }

  protected updateStats(updates: Partial<StreamingStats>): void {
    this.stats = { ...this.stats, ...updates, lastActivity: new Date() };
  }
}
