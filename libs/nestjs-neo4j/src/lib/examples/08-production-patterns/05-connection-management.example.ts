/**
 * Example: Connection Management and Pooling - Production-Grade Connection Optimization
 * Category: 08-production-patterns
 * Features: Neo4jConnectionService advanced usage, connection pool optimization, resource management, performance tuning
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Neo4jConnectionService } from '../../services/neo4j-connection.service';
import { Neo4jHealthService } from '../../services/neo4j-health.service';
import { FindOne, FindMany, CreateEntity } from '../../decorators/entity-crud.decorators';

// ===== Connection Management Types =====

interface ConnectionConfiguration {
  maxPoolSize: number;
  acquisitionTimeout: number;
  maxConnectionLifetime: number;
  maxConnectionPoolSize: number;
  connectionTimeout: number;
  keepAliveInterval: number;
  retryAttempts: number;
  retryDelay: number;
}

interface ConnectionMonitoringConfig {
  healthCheckInterval: number;
  metricsCollectionInterval: number;
  alertThresholds: {
    poolUtilization: number;
    connectionLatency: number;
    errorRate: number;
    timeoutRate: number;
  };
  autoScaling: {
    enabled: boolean;
    minPoolSize: number;
    maxPoolSize: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
  };
}

interface ConnectionHealthMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  poolUtilization: number;
  averageLatency: number;
  successRate: number;
  errorRate: number;
  timeoutRate: number;
  lastHealthCheck: Date;
  connectionHistory: ConnectionEvent[];
}

interface ConnectionEvent {
  type: 'acquire' | 'release' | 'timeout' | 'error' | 'health_check';
  timestamp: Date;
  duration?: number;
  error?: string;
  metadata?: Record<string, any>;
}

interface LoadBalancingStrategy {
  strategy: 'round_robin' | 'least_connections' | 'random' | 'weighted';
  configuration?: Record<string, any>;
}

// ===== Production Connection Manager =====

/**
 * Enterprise-grade connection management service
 * Provides advanced connection pooling, monitoring, and optimization
 */
@Injectable()
export class Neo4jProductionConnectionManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Neo4jProductionConnectionManager.name);

  // Connection tracking
  private connectionEvents: ConnectionEvent[] = [];
  private currentMetrics: ConnectionHealthMetrics | null = null;
  private isMonitoring = false;

  // Configuration
  private readonly config: ConnectionConfiguration = {
    maxPoolSize: 100,
    acquisitionTimeout: 60000,    // 60 seconds
    maxConnectionLifetime: 3600000, // 1 hour
    maxConnectionPoolSize: 100,
    connectionTimeout: 30000,     // 30 seconds
    keepAliveInterval: 30000,     // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000
  };

  private readonly monitoringConfig: ConnectionMonitoringConfig = {
    healthCheckInterval: 30000,   // 30 seconds
    metricsCollectionInterval: 10000, // 10 seconds
    alertThresholds: {
      poolUtilization: 0.8,      // 80%
      connectionLatency: 1000,   // 1 second
      errorRate: 0.05,          // 5%
      timeoutRate: 0.02         // 2%
    },
    autoScaling: {
      enabled: true,
      minPoolSize: 10,
      maxPoolSize: 200,
      scaleUpThreshold: 0.8,    // 80% utilization
      scaleDownThreshold: 0.3   // 30% utilization
    }
  };

  constructor(
    private readonly connectionService: Neo4jConnectionService,
    private readonly metricsService: Neo4jMetricsService,
    private readonly healthService: Neo4jHealthService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async onModuleInit() {
    await this.initializeConnectionManagement();
    this.startMonitoring();
    this.logger.log('Production connection manager initialized');
  }

  async onModuleDestroy() {
    this.stopMonitoring();
    await this.gracefulShutdown();
  }

  // ===== Connection Initialization =====

  private async initializeConnectionManagement(): Promise<void> {
    try {
      // Test initial connectivity
      const connectionResult = await this.connectionService.connectWithMetrics();
      if (!connectionResult.success) {
        throw new Error(`Initial connection failed: ${connectionResult.error}`);
      }

      this.logger.log(`Initial connection established in ${connectionResult.latency}ms`);

      // Initialize connection pool warming
      await this.warmConnectionPool();

      // Set up connection lifecycle management
      this.setupConnectionLifecycleManagement();

    } catch (error) {
      this.logger.error('Connection management initialization failed', error);
      throw error;
    }
  }

  // ===== Connection Pool Management =====

  /**
   * Warm up the connection pool by creating initial connections
   */
  async warmConnectionPool(): Promise<void> {
    const warmupConnections = Math.min(this.config.maxPoolSize / 4, 10);
    this.logger.log(`Warming connection pool with ${warmupConnections} connections`);

    const warmupPromises = Array.from({ length: warmupConnections }, async (_, i) => {
      try {
        const testResult = await this.connectionService.testConnection(5000);
        this.recordConnectionEvent({
          type: 'acquire',
          timestamp: new Date(),
          duration: testResult.latency,
          metadata: { warmup: true, index: i }
        });
        return testResult.success;
      } catch (error) {
        this.logger.warn(`Warmup connection ${i} failed:`, error.message);
        return false;
      }
    });

    const results = await Promise.all(warmupPromises);
    const successfulConnections = results.filter(Boolean).length;

    this.logger.log(`Connection pool warmed up: ${successfulConnections}/${warmupConnections} successful`);
  }

  /**
   * Optimize connection pool configuration based on usage patterns
   */
  async optimizeConnectionPool(): Promise<{
    recommendations: string[];
    appliedOptimizations: string[];
    metrics: ConnectionHealthMetrics;
  }> {
    const metrics = await this.collectConnectionMetrics();
    const recommendations: string[] = [];
    const appliedOptimizations: string[] = [];

    // Analyze pool utilization
    if (metrics.poolUtilization > 0.9) {
      recommendations.push('Consider increasing max pool size');
      if (this.monitoringConfig.autoScaling.enabled) {
        await this.scalePoolUp();
        appliedOptimizations.push('Scaled up connection pool');
      }
    } else if (metrics.poolUtilization < 0.3) {
      recommendations.push('Consider decreasing max pool size to save resources');
      if (this.monitoringConfig.autoScaling.enabled) {
        await this.scalePoolDown();
        appliedOptimizations.push('Scaled down connection pool');
      }
    }

    // Analyze latency patterns
    if (metrics.averageLatency > this.monitoringConfig.alertThresholds.connectionLatency) {
      recommendations.push('High connection latency detected - check network or database performance');
    }

    // Analyze error patterns
    if (metrics.errorRate > this.monitoringConfig.alertThresholds.errorRate) {
      recommendations.push('High error rate detected - investigate connection stability');
    }

    return {
      recommendations,
      appliedOptimizations,
      metrics
    };
  }

  // ===== Connection Monitoring =====

  private startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.logger.log('Starting connection monitoring');
  }

  private stopMonitoring(): void {
    this.isMonitoring = false;
    this.logger.log('Stopping connection monitoring');
  }

  @Cron('*/30 * * * * *') // Every 30 seconds
  async scheduledHealthCheck(): Promise<void> {
    if (!this.isMonitoring) return;

    try {
      await this.performHealthCheck();
    } catch (error) {
      this.logger.error('Scheduled health check failed', error);
    }
  }

  @Cron('*/10 * * * * *') // Every 10 seconds
  async scheduledMetricsCollection(): Promise<void> {
    if (!this.isMonitoring) return;

    try {
      this.currentMetrics = await this.collectConnectionMetrics();

      // Check for alert conditions
      await this.checkAlertConditions(this.currentMetrics);

      // Emit metrics event
      this.eventEmitter.emit('connection.metrics', this.currentMetrics);

    } catch (error) {
      this.logger.error('Scheduled metrics collection failed', error);
    }
  }

  // ===== Health Monitoring =====

  private async performHealthCheck(): Promise<void> {
    const startTime = Date.now();

    try {
      const testResult = await this.connectionService.testConnection(10000);
      const duration = Date.now() - startTime;

      this.recordConnectionEvent({
        type: 'health_check',
        timestamp: new Date(),
        duration,
        metadata: { success: testResult.success }
      });

      if (!testResult.success) {
        this.logger.warn('Health check failed:', testResult.error);
        this.eventEmitter.emit('connection.health.failed', {
          error: testResult.error,
          timestamp: new Date()
        });
      }

    } catch (error) {
      this.recordConnectionEvent({
        type: 'error',
        timestamp: new Date(),
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async collectConnectionMetrics(): Promise<ConnectionHealthMetrics> {
    try {
      const poolMetrics = this.connectionService.getConnectionPoolMetrics();
      const connectionStatus = await this.connectionService.getConnectionStatus();

      // Calculate derived metrics
      const recentEvents = this.getRecentConnectionEvents(300000); // Last 5 minutes
      const totalAttempts = recentEvents.length;
      const errors = recentEvents.filter(e => e.type === 'error').length;
      const timeouts = recentEvents.filter(e => e.type === 'timeout').length;
      const successfulHealthChecks = recentEvents.filter(e =>
        e.type === 'health_check' && !e.error
      ).length;

      const successRate = totalAttempts > 0 ?
        (totalAttempts - errors) / totalAttempts : 1;
      const errorRate = totalAttempts > 0 ? errors / totalAttempts : 0;
      const timeoutRate = totalAttempts > 0 ? timeouts / totalAttempts : 0;

      const latencies = recentEvents
        .filter(e => e.duration && e.type !== 'error')
        .map(e => e.duration!);
      const averageLatency = latencies.length > 0 ?
        latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

      const poolUtilization = poolMetrics.maxPoolSize > 0 ?
        poolMetrics.activeConnections / poolMetrics.maxPoolSize : 0;

      return {
        totalConnections: poolMetrics.totalConnections,
        activeConnections: poolMetrics.activeConnections,
        idleConnections: poolMetrics.idleConnections,
        poolUtilization,
        averageLatency,
        successRate,
        errorRate,
        timeoutRate,
        lastHealthCheck: new Date(),
        connectionHistory: recentEvents.slice(-50) // Last 50 events
      };

    } catch (error) {
      this.logger.error('Failed to collect connection metrics', error);
      throw error;
    }
  }

  // ===== Alert System =====

  private async checkAlertConditions(metrics: ConnectionHealthMetrics): Promise<void> {
    const alerts: Array<{ type: string; message: string; severity: 'warning' | 'critical' }> = [];

    // Pool utilization alerts
    if (metrics.poolUtilization > this.monitoringConfig.alertThresholds.poolUtilization) {
      alerts.push({
        type: 'pool_utilization',
        message: `Connection pool utilization is ${(metrics.poolUtilization * 100).toFixed(1)}%`,
        severity: metrics.poolUtilization > 0.95 ? 'critical' : 'warning'
      });
    }

    // Latency alerts
    if (metrics.averageLatency > this.monitoringConfig.alertThresholds.connectionLatency) {
      alerts.push({
        type: 'high_latency',
        message: `Average connection latency is ${metrics.averageLatency.toFixed(0)}ms`,
        severity: metrics.averageLatency > 5000 ? 'critical' : 'warning'
      });
    }

    // Error rate alerts
    if (metrics.errorRate > this.monitoringConfig.alertThresholds.errorRate) {
      alerts.push({
        type: 'error_rate',
        message: `Connection error rate is ${(metrics.errorRate * 100).toFixed(1)}%`,
        severity: metrics.errorRate > 0.1 ? 'critical' : 'warning'
      });
    }

    // Timeout alerts
    if (metrics.timeoutRate > this.monitoringConfig.alertThresholds.timeoutRate) {
      alerts.push({
        type: 'timeout_rate',
        message: `Connection timeout rate is ${(metrics.timeoutRate * 100).toFixed(1)}%`,
        severity: metrics.timeoutRate > 0.05 ? 'critical' : 'warning'
      });
    }

    // Emit alerts
    for (const alert of alerts) {
      this.logger.warn(`[CONNECTION ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`);
      this.eventEmitter.emit('connection.alert', {
        ...alert,
        timestamp: new Date(),
        metrics
      });
    }
  }

  // ===== Auto-scaling =====

  private async scalePoolUp(): Promise<void> {
    const currentSize = this.config.maxPoolSize;
    const newSize = Math.min(
      currentSize * 1.5,
      this.monitoringConfig.autoScaling.maxPoolSize
    );

    if (newSize > currentSize) {
      this.config.maxPoolSize = Math.floor(newSize);
      this.logger.log(`Scaled up connection pool: ${currentSize} -> ${this.config.maxPoolSize}`);

      this.eventEmitter.emit('connection.scaled', {
        direction: 'up',
        oldSize: currentSize,
        newSize: this.config.maxPoolSize,
        timestamp: new Date()
      });
    }
  }

  private async scalePoolDown(): Promise<void> {
    const currentSize = this.config.maxPoolSize;
    const newSize = Math.max(
      currentSize * 0.75,
      this.monitoringConfig.autoScaling.minPoolSize
    );

    if (newSize < currentSize) {
      this.config.maxPoolSize = Math.floor(newSize);
      this.logger.log(`Scaled down connection pool: ${currentSize} -> ${this.config.maxPoolSize}`);

      this.eventEmitter.emit('connection.scaled', {
        direction: 'down',
        oldSize: currentSize,
        newSize: this.config.maxPoolSize,
        timestamp: new Date()
      });
    }
  }

  // ===== Connection Lifecycle Management =====

  private setupConnectionLifecycleManagement(): void {
    // This would set up connection lifecycle hooks
    // In a real implementation, you'd integrate with the actual driver
    this.logger.log('Connection lifecycle management configured');
  }

  // ===== Graceful Shutdown =====

  async gracefulShutdown(timeoutMs = 30000): Promise<void> {
    this.logger.log('Initiating graceful connection shutdown...');

    const startTime = Date.now();

    try {
      // Stop accepting new connections
      this.stopMonitoring();

      // Wait for active connections to complete or timeout
      while (this.currentMetrics?.activeConnections && this.currentMetrics.activeConnections > 0) {
        if (Date.now() - startTime > timeoutMs) {
          this.logger.warn(`Shutdown timeout reached with ${this.currentMetrics.activeConnections} active connections`);
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        this.currentMetrics = await this.collectConnectionMetrics();
      }

      // Close connection service
      await this.connectionService.close();

      const shutdownDuration = Date.now() - startTime;
      this.logger.log(`Graceful shutdown completed in ${shutdownDuration}ms`);

    } catch (error) {
      this.logger.error('Error during graceful shutdown', error);
      throw error;
    }
  }

  // ===== Event Recording =====

  private recordConnectionEvent(event: ConnectionEvent): void {
    this.connectionEvents.push(event);

    // Keep only recent events to prevent memory growth
    if (this.connectionEvents.length > 10000) {
      this.connectionEvents.splice(0, this.connectionEvents.length - 10000);
    }
  }

  private getRecentConnectionEvents(timeWindowMs: number): ConnectionEvent[] {
    const cutoffTime = new Date(Date.now() - timeWindowMs);
    return this.connectionEvents.filter(event => event.timestamp > cutoffTime);
  }

  // ===== Public API =====

  getCurrentMetrics(): ConnectionHealthMetrics | null {
    return this.currentMetrics;
  }

  getConnectionConfiguration(): ConnectionConfiguration {
    return { ...this.config };
  }

  updateConfiguration(updates: Partial<ConnectionConfiguration>): void {
    Object.assign(this.config, updates);
    this.logger.log('Connection configuration updated', updates);
  }

  async forcePoolRefresh(): Promise<void> {
    await this.connectionService.refreshConnectionPool();
    this.logger.log('Connection pool refresh completed');
  }

  getConnectionHistory(limit = 100): ConnectionEvent[] {
    return this.connectionEvents.slice(-limit);
  }

  clearConnectionHistory(): void {
    this.connectionEvents = [];
    this.logger.log('Connection history cleared');
  }
}

// ===== Connection-Aware Service Implementation =====

/**
 * Example service that demonstrates connection-aware operations
 */
@Injectable()
export class ConnectionOptimizedUserService {
  private readonly logger = new Logger(ConnectionOptimizedUserService.name);

  constructor(
    private readonly connectionManager: Neo4jProductionConnectionManager
  ) {}

  // ===== Connection-aware CRUD Operations =====

  /**
   * Find user with connection optimization
   */
  @FindOne(() => Object, {
    cache: '5m',
    description: 'Find user with connection awareness'
  })
  async findUserById(id: string): Promise<any | null> {
    const connectionMetrics = this.connectionManager.getCurrentMetrics();

    // Adaptive timeout based on connection health
    const timeout = this.calculateOptimalTimeout(connectionMetrics);

    // Log connection state for debugging
    if (connectionMetrics?.poolUtilization && connectionMetrics.poolUtilization > 0.8) {
      this.logger.warn(`High pool utilization (${(connectionMetrics.poolUtilization * 100).toFixed(1)}%) for findUser operation`);
    }

    // Implementation handled by decorator with optimized settings
    return null; // Placeholder
  }

  /**
   * Batch operation with connection pooling optimization
   */
  async findUsersBatch(
    userIds: string[],
    batchSize = 10
  ): Promise<{ users: any[]; errors: Array<{ id: string; error: string }> }> {
    const connectionMetrics = this.connectionManager.getCurrentMetrics();
    const users: any[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    // Adjust batch size based on connection availability
    const optimizedBatchSize = this.calculateOptimalBatchSize(connectionMetrics, batchSize);

    this.logger.log(`Processing ${userIds.length} users in batches of ${optimizedBatchSize}`);

    for (let i = 0; i < userIds.length; i += optimizedBatchSize) {
      const batch = userIds.slice(i, i + optimizedBatchSize);

      try {
        const batchPromises = batch.map(id => this.findUserById(id));
        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            users.push(result.value);
          } else if (result.status === 'rejected') {
            errors.push({
              id: batch[index],
              error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
            });
          }
        });

        // Add delay between batches if pool utilization is high
        if (connectionMetrics?.poolUtilization && connectionMetrics.poolUtilization > 0.7) {
          await this.delay(100); // 100ms delay
        }

      } catch (error) {
        // Handle batch-level errors
        batch.forEach(id => {
          errors.push({
            id,
            error: error instanceof Error ? error.message : 'Batch processing error'
          });
        });
      }
    }

    return { users, errors };
  }

  /**
   * Write operation with connection monitoring
   */
  @CreateEntity(() => Object, {
    retry: 3,
    safe: true,
    description: 'Create user with connection monitoring'
  })
  async createUser(userData: any): Promise<any> {
    const connectionMetrics = this.connectionManager.getCurrentMetrics();

    // Check if we should defer the operation due to high load
    if (connectionMetrics?.poolUtilization && connectionMetrics.poolUtilization > 0.95) {
      this.logger.warn('Deferring user creation due to high connection pool utilization');
      throw new Error('Service temporarily unavailable due to high load');
    }

    // Implementation handled by decorator
    return null; // Placeholder
  }

  // ===== Connection Optimization Helpers =====

  private calculateOptimalTimeout(metrics: ConnectionHealthMetrics | null): number {
    if (!metrics) return 30000; // Default 30 seconds

    // Base timeout plus factor for current latency
    const baseTimeout = 10000; // 10 seconds
    const latencyFactor = Math.max(1, metrics.averageLatency / 1000);
    const utilizationFactor = 1 + metrics.poolUtilization;

    return Math.min(60000, baseTimeout * latencyFactor * utilizationFactor);
  }

  private calculateOptimalBatchSize(
    metrics: ConnectionHealthMetrics | null,
    requestedBatchSize: number
  ): number {
    if (!metrics) return requestedBatchSize;

    // Reduce batch size if pool utilization is high
    if (metrics.poolUtilization > 0.8) {
      return Math.max(1, Math.floor(requestedBatchSize * 0.5));
    } else if (metrics.poolUtilization > 0.6) {
      return Math.max(1, Math.floor(requestedBatchSize * 0.75));
    }

    return requestedBatchSize;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===== Connection Health Integration =====

  async performConnectionHealthyOperation<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const metrics = this.connectionManager.getCurrentMetrics();

    // Check if connections are healthy enough for operation
    if (metrics && (
      metrics.poolUtilization > 0.95 ||
      metrics.errorRate > 0.1 ||
      metrics.averageLatency > 10000
    )) {
      if (fallback) {
        this.logger.warn('Using fallback due to poor connection health');
        return fallback();
      } else {
        throw new Error('Service temporarily unavailable due to connection issues');
      }
    }

    return operation();
  }

  // ===== Statistics and Reporting =====

  async getConnectionAwareStatistics(): Promise<{
    userCount: number;
    connectionHealth: string;
    recommendedActions: string[];
    performanceMetrics: {
      averageResponseTime: number;
      throughput: number;
      errorRate: number;
    };
  }> {
    const metrics = this.connectionManager.getCurrentMetrics();
    const userCount = await this.countUsers();

    let connectionHealth = 'good';
    if (metrics) {
      if (metrics.poolUtilization > 0.9 || metrics.errorRate > 0.05) {
        connectionHealth = 'degraded';
      } else if (metrics.poolUtilization > 0.95 || metrics.errorRate > 0.1) {
        connectionHealth = 'poor';
      }
    }

    const recommendedActions: string[] = [];
    if (metrics) {
      if (metrics.poolUtilization > 0.8) {
        recommendedActions.push('Consider increasing connection pool size');
      }
      if (metrics.averageLatency > 5000) {
        recommendedActions.push('Investigate high latency causes');
      }
      if (metrics.errorRate > 0.05) {
        recommendedActions.push('Review connection error patterns');
      }
    }

    return {
      userCount,
      connectionHealth,
      recommendedActions,
      performanceMetrics: {
        averageResponseTime: metrics?.averageLatency || 0,
        throughput: metrics ? (60000 / metrics.averageLatency) : 0, // Approximate ops per minute
        errorRate: metrics?.errorRate || 0
      }
    };
  }

  @FindMany(() => Object, {
    cache: '10m',
    description: 'Count users for statistics'
  })
  private async countUsers(): Promise<number> {
    // Implementation handled by decorator
    return 0; // Placeholder
  }
}

// ===== Load Balancing Strategies =====

/**
 * Connection load balancing implementation
 */
@Injectable()
export class ConnectionLoadBalancer {
  private readonly logger = new Logger(ConnectionLoadBalancer.name);
  private connections: Array<{ id: string; active: number; lastUsed: Date }> = [];

  constructor(
    private readonly connectionManager: Neo4jProductionConnectionManager
  ) {}

  async selectOptimalConnection(strategy: LoadBalancingStrategy = { strategy: 'least_connections' }): Promise<string> {
    switch (strategy.strategy) {
      case 'least_connections':
        return this.selectLeastConnectionsStrategy();

      case 'round_robin':
        return this.selectRoundRobinStrategy();

      case 'random':
        return this.selectRandomStrategy();

      case 'weighted':
        return this.selectWeightedStrategy(strategy.configuration || {});

      default:
        return this.selectLeastConnectionsStrategy();
    }
  }

  private selectLeastConnectionsStrategy(): string {
    const leastUsed = this.connections.reduce((min, conn) =>
      conn.active < min.active ? conn : min
    );
    return leastUsed?.id || 'default';
  }

  private selectRoundRobinStrategy(): string {
    // Simple round-robin implementation
    const now = Date.now();
    const index = Math.floor(now / 1000) % this.connections.length;
    return this.connections[index]?.id || 'default';
  }

  private selectRandomStrategy(): string {
    const randomIndex = Math.floor(Math.random() * this.connections.length);
    return this.connections[randomIndex]?.id || 'default';
  }

  private selectWeightedStrategy(weights: Record<string, number>): string {
    // Weighted selection based on connection performance
    let totalWeight = 0;
    const weightedConnections = this.connections.map(conn => {
      const weight = weights[conn.id] || 1;
      totalWeight += weight;
      return { ...conn, weight };
    });

    const random = Math.random() * totalWeight;
    let currentWeight = 0;

    for (const conn of weightedConnections) {
      currentWeight += conn.weight;
      if (random <= currentWeight) {
        return conn.id;
      }
    }

    return 'default';
  }
}

// ===== Usage Examples =====

export const CONNECTION_MANAGEMENT_USAGE_EXAMPLE = `
// app.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    Neo4jModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.NEO4J_URI,
        username: process.env.NEO4J_USERNAME,
        password: process.env.NEO4J_PASSWORD,
        database: process.env.NEO4J_DATABASE,
        config: {
          maxConnectionPoolSize: 100,
          connectionAcquisitionTimeout: 60000,
          maxConnectionLifetime: 3600000,
          connectionTimeout: 30000
        }
      })
    })
  ],
  providers: [
    Neo4jProductionConnectionManager,
    ConnectionOptimizedUserService,
    ConnectionLoadBalancer
  ]
})
export class AppModule {}

// Environment configuration
NEO4J_URI=bolt://neo4j-cluster:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=production_password
NEO4J_DATABASE=production_db

# Connection pool settings
NEO4J_MAX_POOL_SIZE=100
NEO4J_CONNECTION_TIMEOUT=30000
NEO4J_ACQUISITION_TIMEOUT=60000
NEO4J_MAX_CONNECTION_LIFETIME=3600000

// Docker Compose production setup
version: '3.8'
services:
  neo4j-cluster:
    image: neo4j:5.12-enterprise
    environment:
      NEO4J_AUTH: neo4j/production_password
      NEO4J_PLUGINS: '["apoc", "graph-data-science"]'
      NEO4J_dbms_memory_heap_initial__size: 2G
      NEO4J_dbms_memory_heap_max__size: 4G
      NEO4J_dbms_memory_pagecache_size: 2G
      NEO4J_dbms_connector_bolt_thread__pool_min__size: 5
      NEO4J_dbms_connector_bolt_thread__pool_max__size: 400
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
    ports:
      - "7687:7687"
      - "7474:7474"
    networks:
      - neo4j_network
    restart: unless-stopped

volumes:
  neo4j_data:
  neo4j_logs:

networks:
  neo4j_network:

// Kubernetes deployment with connection optimization
apiVersion: apps/v1
kind: Deployment
metadata:
  name: neo4j-app
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        image: neo4j-app:latest
        env:
        - name: NEO4J_MAX_POOL_SIZE
          value: "50"  # Adjust per pod
        - name: NEO4J_CONNECTION_TIMEOUT
          value: "30000"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30

// Connection monitoring dashboard
@Controller('admin/connections')
export class ConnectionMonitoringController {
  constructor(
    private readonly connectionManager: Neo4jProductionConnectionManager
  ) {}

  @Get('status')
  getConnectionStatus() {
    return this.connectionManager.getCurrentMetrics();
  }

  @Get('history')
  getConnectionHistory(@Query('limit') limit = 100) {
    return this.connectionManager.getConnectionHistory(limit);
  }

  @Post('optimize')
  async optimizeConnections() {
    return this.connectionManager.optimizeConnectionPool();
  }

  @Post('refresh')
  async refreshPool() {
    return this.connectionManager.forcePoolRefresh();
  }
}
`;

export default Neo4jProductionConnectionManager;
