import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  TokenStreamingService,
  WebSocketBridgeService,
  StreamingWebSocketService,
  IInitializableService,
} from '@hive-academy/langgraph-streaming';

/**
 * Application-specific StreamingManager
 * 
 * This service controls when and how streaming services are initialized.
 * Called manually by the app after all modules are ready.
 * 
 * Benefits:
 * - No blocking onApplicationBootstrap hooks
 * - Full control over initialization timing
 * - Can add app-specific logic before/after streaming starts
 * - Proper error handling and logging
 */
@Injectable()
export class AppStreamingManager {
  private readonly logger = new Logger(AppStreamingManager.name);
  private isActive = false;
  private stats = {
    tokensStreamed: 0,
    activeConnections: 0,
    errors: 0,
    uptime: 0,
    lastActivity: new Date(),
  };
  private startTime?: Date;

  constructor(
    private readonly tokenStreaming: TokenStreamingService,
    private readonly webSocketBridge: WebSocketBridgeService,
    @Optional() private readonly webSocketService?: StreamingWebSocketService, // Optional - only if WebSocket is enabled
  ) {}

  /**
   * Initialize streaming services when the app is fully ready
   * Called manually from main.ts after app.init()
   */
  async initializeStreaming(): Promise<void> {
    if (this.isActive) {
      this.logger.warn('Streaming services already initialized');
      return;
    }

    try {
      this.logger.log('🚀 Initializing application streaming services...');

      // Step 1: Core token streaming first
      this.logger.log('📡 Starting TokenStreamingService...');
      await this.tokenStreaming.start();
      this.updateStats({ tokensStreamed: 0 });

      // Step 2: WebSocket bridge for real-time coordination
      this.logger.log('🌉 Starting WebSocketBridgeService...');
      await this.webSocketBridge.start();
      // Update stats - connection count will be updated later
      this.updateStats({ activeConnections: 0 });

      // Step 3: WebSocket service for external connections (if enabled)
      if (this.webSocketService) {
        this.logger.log('🔌 Starting StreamingWebSocketService...');
        await this.webSocketService.start();
      } else {
        this.logger.log('⚠️  WebSocket service disabled - no external connections');
      }

      // Mark as active after successful initialization
      this.isActive = true;
      this.startTime = new Date();

      this.logger.log('✅ All streaming services initialized successfully!');
      this.logger.log(`📊 Streaming stats: ${JSON.stringify(this.stats)}`);

    } catch (error) {
      this.updateStats({ errors: this.stats.errors + 1 });
      this.logger.error('❌ Failed to initialize streaming services:', error);
      
      // Cleanup on failure
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Stop all streaming services gracefully
   */
  async stopStreaming(): Promise<void> {
    if (!this.isActive) {
      this.logger.warn('Streaming services not active');
      return;
    }

    try {
      this.logger.log('🛑 Stopping streaming services...');

      await this.cleanup();
      this.isActive = false;
      this.startTime = undefined;

      this.logger.log('✅ All streaming services stopped gracefully');

    } catch (error) {
      this.updateStats({ errors: this.stats.errors + 1 });
      this.logger.error('❌ Error stopping streaming services:', error);
      throw error;
    }
  }

  /**
   * Cleanup helper - stops services in reverse order
   */
  private async cleanup(): Promise<void> {
    // Stop in reverse order of initialization
    if (this.webSocketService) {
      this.logger.log('🛑 Stopping StreamingWebSocketService...');
      await this.webSocketService.stop();
    }
    
    this.logger.log('🛑 Stopping WebSocketBridgeService...');
    await this.webSocketBridge.stop();
    
    this.logger.log('🛑 Stopping TokenStreamingService...');
    await this.tokenStreaming.stop();
  }

  /**
   * Health check for streaming services
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const currentStats = {
        ...this.stats,
        uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      };

      return {
        healthy: this.isActive && this.stats.errors === 0,
        details: {
          active: this.isActive,
          uptime: currentStats.uptime,
          errors: this.stats.errors,
          tokensStreamed: this.stats.tokensStreamed,
          activeConnections: this.stats.activeConnections,
          lastActivity: this.stats.lastActivity,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: { error: error.message },
      };
    }
  }

  private updateStats(update: Partial<typeof this.stats>): void {
    this.stats = { ...this.stats, ...update };
    this.stats.lastActivity = new Date();
  }
}