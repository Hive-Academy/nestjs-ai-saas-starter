# Monitoring Module - Production Observability

## 🚀 LangGraph Production Monitoring

**Evidence-Based API Documentation** (verified through source code inspection)

The Monitoring Module provides production-ready observability through a facade pattern that coordinates 5 specialized monitoring services with comprehensive metrics collection and alerting.

### ✅ Verified Architecture Patterns

**Facade Pattern**: MonitoringFacadeService coordinates all monitoring services

```typescript
// VERIFIED EXPORTS: Core monitoring services
import {
  MonitoringModule, // NestJS module (also aliased as LanggraphModulesMonitoringModule)
  MonitoringFacadeService, // Main monitoring facade (also aliased as MonitoringService)
  MetricsCollectorService, // Metrics aggregation
  AlertingService, // Alert management
  HealthCheckService, // Health monitoring
  PerformanceTrackerService, // Performance analytics
  DashboardService, // Monitoring dashboard
} from '@hive-academy/langgraph-monitoring';

// Real implementation: Facade coordinating specialized services
class MonitoringFacadeService {
  constructor(private readonly metricsCollector: MetricsCollectorService, private readonly alerting: AlertingService, private readonly healthCheck: HealthCheckService, private readonly performanceTracker: PerformanceTrackerService, private readonly dashboard: DashboardService) {}
}
```

**Legacy Provider Support**: Backward compatibility with existing monitoring

```typescript
// VERIFIED EXPORTS: Legacy providers for backward compatibility
import {
  MetricsProvider, // Legacy metrics provider
  TraceProvider, // Legacy trace provider
} from '@hive-academy/langgraph-monitoring';

// Maintains compatibility with existing monitoring setups
```

**Production Monitoring**: Real observability for production systems

```typescript
@Injectable()
export class MyApplicationService {
  constructor(private readonly monitoring: MonitoringFacadeService) {}

  async executeWithMonitoring() {
    // Facade coordinates all monitoring aspects
    await this.monitoring.recordMetric('operation.start', 1);

    try {
      const result = await this.performOperation();

      // Health check automatically updated
      // Performance metrics automatically tracked
      // Alerts automatically evaluated

      return result;
    } catch (error) {
      // Alerting service automatically notified
      // Dashboard automatically updated with error metrics
      throw error;
    }
  }
}
```

## Quick Start

### Installation & Setup

```bash
npm install @hive-academy/langgraph-monitoring
```

```typescript
import { Module } from '@nestjs/common';
import { MonitoringModule } from '@hive-academy/langgraph-monitoring';

@Module({
  imports: [
    MonitoringModule.forRoot({
      enabled: true,
      metrics: {
        backend: 'prometheus',
        batchSize: 100,
        flushInterval: 30000,
        maxBufferSize: 10000,
        defaultTags: { service: 'my-app', environment: 'production' },
      },
      alerting: {
        enabled: true,
        evaluationInterval: 30000,
        defaultCooldown: 300000,
        channels: [
          { type: 'slack', name: 'alerts', config: { webhook: process.env.SLACK_WEBHOOK } },
          { type: 'email', name: 'critical', config: { smtp: process.env.SMTP_CONFIG } },
        ],
      },
      healthChecks: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        retries: 3,
      },
    }),
  ],
})
export class AppModule {}
```

## 🏗️ Ecosystem Integration Patterns

### Complete Ecosystem Monitoring

**Usage**: Comprehensive monitoring across all 13 LangGraph modules

```typescript
@Injectable()
export class EcosystemMonitoringService {
  constructor(private readonly monitoring: MonitoringFacadeService) {}

  async initializeCompleteEcosystemMonitoring(): Promise<void> {
    // Workflow-Engine monitoring integration
    await this.monitoring.registerHealthCheck('workflow-engine', async () => {
      // Monitor workflow engine health
      const activeWorkflows = await this.workflowEngine.getActiveWorkflows();
      const queueLength = await this.workflowEngine.getQueueLength();

      return {
        healthy: queueLength < 1000,
        degraded: queueLength > 500,
        responseTime: 50,
        metadata: { activeWorkflows: activeWorkflows.length, queueLength },
      };
    });

    // Memory module integration
    await this.monitoring.registerHealthCheck('memory-service', async () => {
      const memoryStats = await this.memoryService.getStats();
      return {
        healthy: memoryStats.totalMemories < 50000,
        degraded: memoryStats.averageSearchTime > 500,
        metadata: {
          totalMemories: memoryStats.totalMemories,
          searchTime: memoryStats.averageSearchTime,
          cacheHitRate: memoryStats.cacheHitRate,
        },
      };
    });

    // Checkpoint module integration
    await this.monitoring.registerHealthCheck('checkpoint-manager', async () => {
      const checkpointStats = await this.checkpointManager.getCheckpointStats();
      return {
        healthy: checkpointStats.overall.healthySavers > 0,
        degraded: checkpointStats.overall.unhealthySavers > 0,
        metadata: {
          healthySavers: checkpointStats.overall.healthySavers,
          unhealthySavers: checkpointStats.overall.unhealthySavers,
        },
      };
    });

    // ChromaDB integration monitoring
    await this.monitoring.registerHealthCheck('chromadb', async () => {
      const chromaStats = await this.chromaService.getCollectionStats();
      return {
        healthy: chromaStats.isConnected,
        responseTime: chromaStats.averageQueryTime,
        metadata: {
          totalCollections: chromaStats.collections.length,
          totalDocuments: chromaStats.totalDocuments,
        },
      };
    });

    // Neo4j integration monitoring
    await this.monitoring.registerHealthCheck('neo4j', async () => {
      const neo4jStats = await this.neo4jService.getConnectionStats();
      return {
        healthy: neo4jStats.isConnected,
        responseTime: neo4jStats.averageQueryTime,
        metadata: {
          nodeCount: neo4jStats.nodeCount,
          relationshipCount: neo4jStats.relationshipCount,
          memoryUsage: neo4jStats.memoryUsage,
        },
      };
    });

    // Multi-Agent system monitoring
    await this.monitoring.registerHealthCheck('multi-agent-network', async () => {
      const agentStats = await this.agentNetwork.getNetworkStats();
      return {
        healthy: agentStats.healthyAgents / agentStats.totalAgents > 0.8,
        degraded: agentStats.healthyAgents / agentStats.totalAgents > 0.5,
        metadata: {
          totalAgents: agentStats.totalAgents,
          healthyAgents: agentStats.healthyAgents,
          activeConnections: agentStats.activeConnections,
        },
      };
    });

    console.log('Complete ecosystem monitoring initialized');
  }

  async trackEcosystemMetrics(): Promise<void> {
    // Workflow execution metrics
    const workflowMetrics = await this.getWorkflowMetrics();
    await this.monitoring.recordGauge('ecosystem.workflows.active', workflowMetrics.active);
    await this.monitoring.recordGauge('ecosystem.workflows.completed', workflowMetrics.completed);
    await this.monitoring.recordGauge('ecosystem.workflows.error_rate', workflowMetrics.errorRate);

    // Memory usage metrics
    const memoryMetrics = await this.getMemoryMetrics();
    await this.monitoring.recordGauge('ecosystem.memory.total_entries', memoryMetrics.totalEntries);
    await this.monitoring.recordGauge('ecosystem.memory.cache_hit_rate', memoryMetrics.cacheHitRate);
    await this.monitoring.recordTimer('ecosystem.memory.search_time', memoryMetrics.averageSearchTime);

    // Database performance metrics
    const dbMetrics = await this.getDatabaseMetrics();
    await this.monitoring.recordTimer('ecosystem.chromadb.query_time', dbMetrics.chromaQueryTime);
    await this.monitoring.recordTimer('ecosystem.neo4j.query_time', dbMetrics.neo4jQueryTime);
    await this.monitoring.recordGauge('ecosystem.chromadb.documents', dbMetrics.chromaDocuments);
    await this.monitoring.recordGauge('ecosystem.neo4j.nodes', dbMetrics.neo4jNodes);

    // Agent network metrics
    const agentMetrics = await this.getAgentMetrics();
    await this.monitoring.recordGauge('ecosystem.agents.active', agentMetrics.activeAgents);
    await this.monitoring.recordGauge('ecosystem.agents.message_rate', agentMetrics.messageRate);
    await this.monitoring.recordTimer('ecosystem.agents.response_time', agentMetrics.averageResponseTime);
  }
}
```

### Workflow-Engine Integration

**Usage**: Monitoring workflow orchestration with embedded state tracking

```typescript
import { WorkflowEngine, WorkflowExecutionContext } from '@hive-academy/langgraph-workflow-engine';

@Injectable()
export class WorkflowMonitoringService {
  constructor(private readonly workflowEngine: WorkflowEngine, private readonly monitoring: MonitoringFacadeService) {}

  async createMonitoredWorkflow(workflowName: string): Promise<MonitoredWorkflow> {
    return this.workflowEngine.create({
      name: workflowName,

      // Monitoring automatically embedded in workflow engine
      monitoring: {
        enabled: true,
        service: this.monitoring,
        trackNodes: true,
        trackMemory: true,
        trackCheckpoints: true,
      },

      nodes: [
        {
          name: 'data-processing',
          type: 'function',
          function: async (state, context: WorkflowExecutionContext) => {
            const startTime = Date.now();

            try {
              // Process data with automatic monitoring
              const result = await this.processData(state.input);

              // Automatically track successful execution
              await context.monitoring.recordTimer('workflow.node.duration', Date.now() - startTime, {
                workflow_name: workflowName,
                node_name: 'data-processing',
                success: 'true',
              });

              // Track memory usage if memory module is enabled
              if (context.memory) {
                const memoryStats = await context.memory.getStats();
                await context.monitoring.recordGauge('workflow.memory.usage', memoryStats.totalMemories, {
                  workflow_name: workflowName,
                  node_name: 'data-processing',
                });
              }

              return result;
            } catch (error) {
              // Automatically track errors
              await context.monitoring.recordCounter('workflow.node.errors', 1, {
                workflow_name: workflowName,
                node_name: 'data-processing',
                error_type: error.constructor.name,
              });

              throw error;
            }
          },
        },

        {
          name: 'checkpoint-save',
          type: 'function',
          function: async (state, context) => {
            // Monitor checkpoint operations
            const checkpointStart = Date.now();

            try {
              await context.checkpoint.save({
                id: `${workflowName}-processed`,
                channel_values: state,
              });

              await context.monitoring.recordTimer('workflow.checkpoint.save', Date.now() - checkpointStart, {
                workflow_name: workflowName,
                success: 'true',
              });
            } catch (error) {
              await context.monitoring.recordCounter('workflow.checkpoint.failures', 1, {
                workflow_name: workflowName,
                error_type: error.constructor.name,
              });

              throw error;
            }

            return state;
          },
        },
      ],

      // Global workflow monitoring
      onStart: async (context) => {
        await context.monitoring.recordCounter('workflow.executions.started', 1, {
          workflow_name: workflowName,
        });
      },

      onComplete: async (context, result) => {
        await context.monitoring.recordCounter('workflow.executions.completed', 1, {
          workflow_name: workflowName,
          success: 'true',
        });
      },

      onError: async (context, error) => {
        await context.monitoring.recordCounter('workflow.executions.failed', 1, {
          workflow_name: workflowName,
          error_type: error.constructor.name,
        });
      },
    });
  }
}
```

### Multi-Agent Network Monitoring

**Usage**: Comprehensive agent network observability

```typescript
import { MultiAgentNetwork, Agent, AgentMessage } from '@hive-academy/langgraph-multi-agent';

@Injectable()
export class AgentNetworkMonitoringService {
  constructor(private readonly agentNetwork: MultiAgentNetwork, private readonly monitoring: MonitoringFacadeService) {}

  async createMonitoredAgentNetwork(): Promise<MonitoredAgentNetwork> {
    const networkId = 'production-agent-network';

    // Research Agent with comprehensive monitoring
    const researchAgent = Agent.create({
      name: 'research-specialist',
      monitoring: {
        service: this.monitoring,
        trackPerformance: true,
        trackMessages: true,
        trackErrors: true,
      },
      function: async (query: string, context: AgentContext) => {
        const startTime = Date.now();

        try {
          // Track message processing
          await context.monitoring.recordCounter('agent.messages.received', 1, {
            agent_name: 'research-specialist',
            message_type: 'query',
            network_id: networkId,
          });

          const findings = await this.conductResearch(query);
          const duration = Date.now() - startTime;

          // Track successful processing
          await context.monitoring.recordTimer('agent.processing.duration', duration, {
            agent_name: 'research-specialist',
            success: 'true',
            network_id: networkId,
          });

          await context.monitoring.recordGauge('agent.research.findings_count', findings.length, {
            agent_name: 'research-specialist',
            network_id: networkId,
          });

          return findings;
        } catch (error) {
          // Track agent errors
          await context.monitoring.recordCounter('agent.errors', 1, {
            agent_name: 'research-specialist',
            error_type: error.constructor.name,
            network_id: networkId,
          });

          throw error;
        }
      },
    });

    // Analysis Agent with cross-agent communication monitoring
    const analysisAgent = Agent.create({
      name: 'analysis-specialist',
      monitoring: {
        service: this.monitoring,
        trackCommunication: true,
        trackCoordination: true,
      },
      function: async (data: string, context: AgentContext) => {
        // Track inter-agent communication
        await context.monitoring.recordCounter('agent.communication.requests', 1, {
          from_agent: 'analysis-specialist',
          to_agent: 'research-specialist',
          network_id: networkId,
        });

        const analysis = await this.performAnalysis(data);

        // Track coordination success
        await context.monitoring.recordCounter('agent.coordination.success', 1, {
          agent_name: 'analysis-specialist',
          network_id: networkId,
        });

        return analysis;
      },
    });

    return this.agentNetwork.createNetwork([researchAgent, analysisAgent], {
      id: networkId,
      monitoring: {
        service: this.monitoring,
        trackNetworkHealth: true,
        trackMessageFlow: true,
        alertThresholds: {
          messageLatency: 5000, // 5 seconds
          errorRate: 0.05, // 5%
          agentFailures: 3,
        },
      },

      onMessageSent: async (from: string, to: string, message: AgentMessage) => {
        await this.monitoring.recordCounter('network.messages.sent', 1, {
          from_agent: from,
          to_agent: to,
          message_type: message.type,
          network_id: networkId,
        });
      },

      onNetworkError: async (error: Error, agentName?: string) => {
        await this.monitoring.recordCounter('network.errors', 1, {
          error_type: error.constructor.name,
          failed_agent: agentName || 'unknown',
          network_id: networkId,
        });
      },
    });
  }
}
```

### Streaming Integration with Real-Time Monitoring

**Usage**: Monitor streaming workflows with real-time metrics

```typescript
import { StreamingWorkflow, StreamEvent } from '@hive-academy/langgraph-streaming';

@Injectable()
export class StreamingMonitoringService {
  constructor(private readonly streaming: StreamingWorkflow, private readonly monitoring: MonitoringFacadeService) {}

  async createMonitoredStream(streamId: string): Promise<MonitoredStream> {
    return this.streaming.create({
      id: streamId,

      // Real-time monitoring integration
      monitoring: {
        enabled: true,
        service: this.monitoring,
        metricsInterval: 10000, // Report metrics every 10 seconds
        trackThroughput: true,
        trackLatency: true,
        trackErrors: true,
      },

      processors: [
        {
          name: 'event-processing',
          function: async (event: StreamEvent, context) => {
            const processingStart = Date.now();

            try {
              // Track event processing
              await context.monitoring.recordCounter('stream.events.processed', 1, {
                stream_id: streamId,
                event_type: event.type,
                processor: 'event-processing',
              });

              const processedEvent = await this.processStreamEvent(event);
              const processingTime = Date.now() - processingStart;

              // Track processing performance
              await context.monitoring.recordTimer('stream.processing.duration', processingTime, {
                stream_id: streamId,
                event_type: event.type,
                success: 'true',
              });

              // Track throughput
              await context.monitoring.recordGauge('stream.throughput.events_per_second', this.calculateThroughput(streamId), {
                stream_id: streamId,
              });

              return processedEvent;
            } catch (error) {
              // Track processing errors
              await context.monitoring.recordCounter('stream.processing.errors', 1, {
                stream_id: streamId,
                event_type: event.type,
                error_type: error.constructor.name,
                processor: 'event-processing',
              });

              throw error;
            }
          },
        },

        {
          name: 'anomaly-detection',
          function: async (event, context) => {
            // Monitor for anomalies in real-time
            const anomalies = await this.detectAnomalies(event);

            if (anomalies.length > 0) {
              await context.monitoring.recordCounter('stream.anomalies.detected', anomalies.length, {
                stream_id: streamId,
                severity: this.getMaxSeverity(anomalies),
              });

              // Trigger immediate alert for critical anomalies
              const criticalAnomalies = anomalies.filter((a) => a.severity === 'critical');
              if (criticalAnomalies.length > 0) {
                await context.monitoring.recordCounter('stream.anomalies.critical', criticalAnomalies.length, {
                  stream_id: streamId,
                  immediate_alert: 'true',
                });
              }
            }

            return { ...event, anomalies };
          },
        },
      ],

      // Stream-level monitoring
      onStreamStart: async () => {
        await this.monitoring.recordCounter('stream.lifecycle.started', 1, {
          stream_id: streamId,
        });
      },

      onStreamError: async (error: Error) => {
        await this.monitoring.recordCounter('stream.lifecycle.errors', 1, {
          stream_id: streamId,
          error_type: error.constructor.name,
        });
      },

      onStreamComplete: async () => {
        await this.monitoring.recordCounter('stream.lifecycle.completed', 1, {
          stream_id: streamId,
        });
      },
    });
  }
}
```

### Production Dashboard Integration

**Usage**: Unified monitoring dashboard for complete ecosystem visibility

```typescript
@Injectable()
export class ProductionDashboardService {
  constructor(private readonly monitoring: MonitoringFacadeService) {}

  async generateEcosystemDashboard(): Promise<DashboardData> {
    // Collect metrics from all ecosystem components
    const [workflowMetrics, agentMetrics, memoryMetrics, checkpointMetrics, streamingMetrics, databaseMetrics] = await Promise.all([this.getWorkflowMetrics(), this.getAgentMetrics(), this.getMemoryMetrics(), this.getCheckpointMetrics(), this.getStreamingMetrics(), this.getDatabaseMetrics()]);

    // System health overview
    const systemHealth = await this.monitoring.getSystemHealth();
    const activeAlerts = await this.monitoring.getActiveAlerts();

    return {
      timestamp: new Date(),

      // High-level KPIs
      kpis: {
        systemHealth: systemHealth.overall,
        totalWorkflows: workflowMetrics.active + workflowMetrics.completed,
        workflowSuccessRate: workflowMetrics.successRate,
        averageResponseTime: this.calculateAverageResponseTime(),
        errorRate: this.calculateOverallErrorRate(),
        activeAlerts: activeAlerts.length,
        criticalAlerts: activeAlerts.filter((a) => a.severity === 'critical').length,
      },

      // Component-specific metrics
      components: {
        workflows: {
          active: workflowMetrics.active,
          completed: workflowMetrics.completed,
          errorRate: workflowMetrics.errorRate,
          averageExecutionTime: workflowMetrics.averageExecutionTime,
          queueLength: workflowMetrics.queueLength,
        },

        agents: {
          totalAgents: agentMetrics.total,
          healthyAgents: agentMetrics.healthy,
          messageRate: agentMetrics.messageRate,
          averageResponseTime: agentMetrics.averageResponseTime,
          coordinationSuccess: agentMetrics.coordinationSuccess,
        },

        memory: {
          totalEntries: memoryMetrics.totalEntries,
          cacheHitRate: memoryMetrics.cacheHitRate,
          averageSearchTime: memoryMetrics.averageSearchTime,
          memoryUsage: memoryMetrics.memoryUsage,
        },

        checkpoints: {
          healthySavers: checkpointMetrics.healthySavers,
          averageSaveTime: checkpointMetrics.averageSaveTime,
          storageUsage: checkpointMetrics.storageUsage,
          errorRate: checkpointMetrics.errorRate,
        },

        streaming: {
          activeStreams: streamingMetrics.activeStreams,
          eventsPerSecond: streamingMetrics.eventsPerSecond,
          averageLatency: streamingMetrics.averageLatency,
          anomaliesDetected: streamingMetrics.anomaliesDetected,
        },

        databases: {
          chromadb: {
            healthy: databaseMetrics.chromadb.healthy,
            queryTime: databaseMetrics.chromadb.averageQueryTime,
            documentCount: databaseMetrics.chromadb.documentCount,
          },
          neo4j: {
            healthy: databaseMetrics.neo4j.healthy,
            queryTime: databaseMetrics.neo4j.averageQueryTime,
            nodeCount: databaseMetrics.neo4j.nodeCount,
            relationshipCount: databaseMetrics.neo4j.relationshipCount,
          },
        },
      },

      // Recent alerts and issues
      alerts: {
        active: activeAlerts,
        recentResolved: await this.getRecentResolvedAlerts(),
        trends: await this.getAlertTrends(),
      },

      // Performance trends
      trends: {
        workflowPerformance: await this.getWorkflowPerformanceTrend(),
        errorRateTrend: await this.getErrorRateTrend(),
        resourceUsageTrend: await this.getResourceUsageTrend(),
      },
    };
  }
}
```

## Core Services

### MonitoringFacadeService - Primary Interface

**Central orchestrator** for all monitoring operations with failure-safe design:

```typescript
// Metric recording operations
recordMetric(name: string, value: number, tags?: MetricTags): Promise<void>
recordTimer(name: string, duration: number, tags?: MetricTags): Promise<void>
recordCounter(name: string, increment?: number, tags?: MetricTags): Promise<void>
recordGauge(name: string, value: number, tags?: MetricTags): Promise<void>
recordHistogram(name: string, value: number, tags?: MetricTags): Promise<void>

// Health check operations
registerHealthCheck(name: string, check: HealthCheckFunction): Promise<void>
getSystemHealth(): Promise<HealthStatus>
getServiceHealth(serviceName: string): Promise<ServiceHealth>

// Alert management
createAlertRule(rule: AlertRule): Promise<string>
updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<void>
getActiveAlerts(): Promise<Alert[]>
```

### Complete Production Usage Example

```typescript
import { Injectable } from '@nestjs/common';
import { MonitoringFacadeService, AlertRule } from '@hive-academy/langgraph-monitoring';

interface WorkflowMetrics {
  executionTime: number;
  nodeCount: number;
  memoryUsage: number;
  success: boolean;
  errorType?: string;
}

@Injectable()
export class ProductionWorkflowMonitoringService {
  constructor(private readonly monitoring: MonitoringFacadeService) {}

  async initializeProductionMonitoring(): Promise<void> {
    // Register health checks for critical dependencies
    await this.monitoring.registerHealthCheck('database', async () => {
      try {
        await this.testDatabaseConnection();
        return { healthy: true, responseTime: 50 };
      } catch (error) {
        return { healthy: false, error: error.message };
      }
    });

    await this.monitoring.registerHealthCheck('external-api', async () => {
      const startTime = Date.now();
      try {
        await this.pingExternalAPI();
        return { healthy: true, responseTime: Date.now() - startTime };
      } catch (error) {
        return { healthy: false, error: error.message, degraded: true };
      }
    });

    // Create critical alert rules
    const criticalErrorRule: AlertRule = {
      id: 'workflow-critical-errors',
      name: 'Workflow Critical Error Rate',
      description: 'Alert when workflow error rate exceeds 5%',
      condition: {
        metric: 'workflow.error_rate',
        operator: 'gt',
        threshold: 0.05,
        timeWindow: 300000, // 5 minutes
        aggregation: 'avg',
        evaluationWindow: 60000, // 1 minute
      },
      severity: 'critical',
      channels: [
        { type: 'slack', name: 'alerts', config: {}, enabled: true },
        { type: 'email', name: 'critical', config: {}, enabled: true },
      ],
      cooldownPeriod: 900000, // 15 minutes
      enabled: true,
      metadata: { team: 'platform', priority: 'high' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.monitoring.createAlertRule(criticalErrorRule);

    console.log('Production monitoring initialized with health checks and alert rules');
  }

  async trackWorkflowExecution(workflowName: string, threadId: string, execution: WorkflowMetrics): Promise<void> {
    const tags = {
      workflow_name: workflowName,
      thread_id: threadId,
      success: execution.success.toString(),
      environment: 'production',
    };

    // Record execution metrics
    await Promise.all([this.monitoring.recordTimer('workflow.execution.duration', execution.executionTime, tags), this.monitoring.recordGauge('workflow.execution.nodes', execution.nodeCount, tags), this.monitoring.recordGauge('workflow.execution.memory_mb', execution.memoryUsage / 1024 / 1024, tags), this.monitoring.recordCounter('workflow.executions.total', 1, tags)]);

    // Record success/error metrics
    if (execution.success) {
      await this.monitoring.recordCounter('workflow.executions.success', 1, tags);
    } else {
      await this.monitoring.recordCounter('workflow.executions.error', 1, {
        ...tags,
        error_type: execution.errorType || 'unknown',
      });

      // Calculate and record error rate
      const errorRate = await this.calculateErrorRate(workflowName);
      await this.monitoring.recordGauge('workflow.error_rate', errorRate, {
        workflow_name: workflowName,
      });
    }

    // Track performance anomalies
    await this.detectPerformanceAnomalies(workflowName, execution);
  }

  private async calculateErrorRate(workflowName: string): Promise<number> {
    // In production, this would query your metrics backend
    // For this example, we'll simulate error rate calculation
    const totalExecutions = 100; // Would come from metrics query
    const errorCount = 5; // Would come from metrics query
    return errorCount / totalExecutions;
  }

  private async detectPerformanceAnomalies(workflowName: string, execution: WorkflowMetrics): Promise<void> {
    // Detect execution time anomalies
    const avgExecutionTime = 5000; // Would come from baseline calculation
    if (execution.executionTime > avgExecutionTime * 3) {
      await this.monitoring.recordCounter('workflow.anomalies.slow_execution', 1, {
        workflow_name: workflowName,
        severity: 'high',
        deviation: (execution.executionTime / avgExecutionTime - 1).toFixed(2),
      });
    }

    // Detect memory usage spikes
    const avgMemoryUsage = 50 * 1024 * 1024; // 50MB baseline
    if (execution.memoryUsage > avgMemoryUsage * 2) {
      await this.monitoring.recordCounter('workflow.anomalies.high_memory', 1, {
        workflow_name: workflowName,
        severity: execution.memoryUsage > avgMemoryUsage * 5 ? 'critical' : 'medium',
      });
    }
  }

  async generateHealthReport(): Promise<HealthReport> {
    const systemHealth = await this.monitoring.getSystemHealth();
    const activeAlerts = await this.monitoring.getActiveAlerts();

    return {
      overall: systemHealth.overall,
      timestamp: new Date(),
      services: systemHealth.services,
      activeAlerts: activeAlerts.length,
      criticalAlerts: activeAlerts.filter((a) => a.severity === 'critical').length,
      uptime: systemHealth.uptime,
      recommendations: this.generateHealthRecommendations(systemHealth, activeAlerts),
    };
  }

  private generateHealthRecommendations(health: HealthStatus, alerts: Alert[]): string[] {
    const recommendations: string[] = [];

    if (health.overall === 'unhealthy') {
      recommendations.push('Immediate attention required - system is unhealthy');
    }

    if (alerts.filter((a) => a.severity === 'critical').length > 0) {
      recommendations.push('Address critical alerts immediately');
    }

    const degradedServices = Object.entries(health.services)
      .filter(([, service]) => service.state === 'degraded')
      .map(([name]) => name);

    if (degradedServices.length > 0) {
      recommendations.push(`Monitor degraded services: ${degradedServices.join(', ')}`);
    }

    return recommendations;
  }

  private async testDatabaseConnection(): Promise<void> {
    // Simulate database health check
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  private async pingExternalAPI(): Promise<void> {
    // Simulate external API health check
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
```

## Configuration

### Basic Configuration

```typescript
MonitoringModule.forRoot({
  enabled: true,
  metrics: {
    backend: 'memory',
    batchSize: 50,
    flushInterval: 30000,
  },
  alerting: {
    enabled: true,
    evaluationInterval: 30000,
  },
  healthChecks: {
    enabled: true,
    interval: 30000,
  },
});
```

### Production Configuration

```typescript
MonitoringModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    enabled: configService.get('MONITORING_ENABLED', true),
    metrics: {
      backend: configService.get('METRICS_BACKEND', 'prometheus'),
      batchSize: configService.get('METRICS_BATCH_SIZE', 100),
      flushInterval: configService.get('METRICS_FLUSH_INTERVAL', 30000),
      maxBufferSize: configService.get('METRICS_BUFFER_SIZE', 10000),
      retention: configService.get('METRICS_RETENTION', '7d'),
      defaultTags: {
        service: configService.get('SERVICE_NAME', 'unknown'),
        environment: configService.get('NODE_ENV', 'development'),
        version: configService.get('APP_VERSION', '1.0.0'),
      },
    },
    alerting: {
      enabled: configService.get('ALERTING_ENABLED', true),
      evaluationInterval: configService.get('ALERT_EVALUATION_INTERVAL', 30000),
      defaultCooldown: configService.get('ALERT_DEFAULT_COOLDOWN', 300000),
      channels: [
        {
          type: 'slack',
          name: 'production-alerts',
          config: { webhook: configService.get('SLACK_WEBHOOK_URL') },
          enabled: true,
        },
        {
          type: 'email',
          name: 'critical-alerts',
          config: {
            smtp: {
              host: configService.get('SMTP_HOST'),
              port: configService.get('SMTP_PORT', 587),
              auth: {
                user: configService.get('SMTP_USER'),
                pass: configService.get('SMTP_PASS'),
              },
            },
          },
          enabled: true,
        },
      ],
    },
    healthChecks: {
      enabled: configService.get('HEALTH_CHECKS_ENABLED', true),
      interval: configService.get('HEALTH_CHECK_INTERVAL', 30000),
      timeout: configService.get('HEALTH_CHECK_TIMEOUT', 5000),
      retries: configService.get('HEALTH_CHECK_RETRIES', 3),
      gracefulShutdownTimeout: configService.get('HEALTH_GRACEFUL_SHUTDOWN', 30000),
    },
    performance: {
      trackingEnabled: configService.get('PERFORMANCE_TRACKING', true),
      anomalyDetection: configService.get('ANOMALY_DETECTION', true),
      baselineWindow: configService.get('BASELINE_WINDOW', '7d'),
      sensitivityThreshold: configService.get('ANOMALY_SENSITIVITY', 2.0),
      minSamples: configService.get('MIN_SAMPLES', 100),
    },
  }),
  inject: [ConfigService],
});
```

## Core Interfaces

### Monitoring Types

```typescript
interface MetricTags {
  readonly [key: string]: string | number | boolean;
}

interface Metric {
  readonly name: string;
  readonly type: 'counter' | 'gauge' | 'histogram' | 'timer' | 'summary';
  readonly value: number;
  readonly tags: MetricTags;
  readonly timestamp: Date;
  readonly unit?: string;
}

interface AlertRule {
  readonly id: string;
  readonly name: string;
  readonly condition: AlertCondition;
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
  readonly channels: readonly NotificationChannel[];
  readonly cooldownPeriod: number;
  readonly enabled: boolean;
}

interface HealthStatus {
  readonly overall: 'healthy' | 'degraded' | 'unhealthy';
  readonly services: Record<string, ServiceHealth>;
  readonly timestamp: Date;
  readonly uptime: number;
}
```

### Service Interfaces

```typescript
interface IMonitoringFacade {
  recordMetric(name: string, value: number, tags?: MetricTags): Promise<void>;
  recordTimer(name: string, duration: number, tags?: MetricTags): Promise<void>;
  registerHealthCheck(name: string, check: HealthCheckFunction): Promise<void>;
  getSystemHealth(): Promise<HealthStatus>;
  createAlertRule(rule: AlertRule): Promise<string>;
  queryMetrics(query: MetricQuery): Promise<MetricData[]>;
}

type HealthCheckFunction = () => Promise<boolean | DetailedHealthCheckResult>;

interface DetailedHealthCheckResult {
  healthy: boolean;
  degraded?: boolean;
  responseTime?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}
```

## Error Handling

```typescript
import { MetricsCollectionError, AlertingError, HealthCheckError } from '@hive-academy/langgraph-monitoring';

@Injectable()
export class RobustMonitoringService {
  constructor(private readonly monitoring: MonitoringFacadeService) {}

  async safeRecordMetric(name: string, value: number, tags?: MetricTags): Promise<void> {
    try {
      await this.monitoring.recordMetric(name, value, tags);
    } catch (error) {
      if (error instanceof MetricsCollectionError) {
        this.logger.warn('Metrics collection failed, continuing execution:', error.message);
        // Don't throw - monitoring failures should not break business logic
      } else {
        this.logger.error('Unexpected monitoring error:', error);
      }
    }
  }

  async safeHealthCheck(serviceName: string): Promise<ServiceHealth | null> {
    try {
      return await this.monitoring.getServiceHealth(serviceName);
    } catch (error) {
      if (error instanceof HealthCheckError) {
        this.logger.warn(`Health check failed for ${serviceName}:`, error.message);
        return null;
      }
      throw error;
    }
  }

  async safeCreateAlert(rule: AlertRule): Promise<string | null> {
    try {
      return await this.monitoring.createAlertRule(rule);
    } catch (error) {
      if (error instanceof AlertingError) {
        this.logger.error('Alert rule creation failed:', error.message);
        return null;
      }
      throw error;
    }
  }
}
```

## Testing

### Unit Testing

```typescript
import { Test } from '@nestjs/testing';
import { MonitoringModule, MonitoringFacadeService } from '@hive-academy/langgraph-monitoring';

describe('MonitoringFacadeService', () => {
  let service: MonitoringFacadeService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        MonitoringModule.forRoot({
          enabled: true,
          metrics: { backend: 'memory', batchSize: 10 },
          alerting: { enabled: false },
          healthChecks: { enabled: true, interval: 10000 },
        }),
      ],
    }).compile();

    service = module.get<MonitoringFacadeService>(MonitoringFacadeService);
  });

  it('should record metrics without throwing', async () => {
    await expect(service.recordCounter('test.counter', 1, { test: true })).resolves.not.toThrow();
    await expect(service.recordGauge('test.gauge', 50)).resolves.not.toThrow();
    await expect(service.recordTimer('test.timer', 1000)).resolves.not.toThrow();
  });

  it('should register and check health', async () => {
    await service.registerHealthCheck('test-service', async () => ({
      healthy: true,
      responseTime: 10,
    }));

    const health = await service.getServiceHealth('test-service');
    expect(health.state).toBe('healthy');
  });

  it('should create alert rules', async () => {
    const rule: AlertRule = {
      id: 'test-rule',
      name: 'Test Rule',
      description: 'Test alert rule',
      condition: {
        metric: 'test.metric',
        operator: 'gt',
        threshold: 100,
        timeWindow: 60000,
        aggregation: 'avg',
        evaluationWindow: 30000,
      },
      severity: 'warning',
      channels: [],
      cooldownPeriod: 300000,
      enabled: true,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ruleId = await service.createAlertRule(rule);
    expect(ruleId).toBe('test-rule');
  });
});
```

## Troubleshooting

### Common Issues

#### 1. High Memory Usage from Metric Buffering

```typescript
// Solution: Configure smaller batch sizes and frequent flushing
const config = {
  metrics: {
    batchSize: 50, // Smaller batches
    flushInterval: 10000, // More frequent flushing (10s)
    maxBufferSize: 1000, // Smaller buffer limit
  },
};
```

#### 2. Alert Spam from Noisy Metrics

```typescript
// Solution: Implement longer cooldowns and aggregation windows
const alertRule: AlertRule = {
  condition: {
    metric: 'noisy.metric',
    timeWindow: 300000, // 5 minute window
    aggregation: 'avg', // Use average to smooth spikes
    evaluationWindow: 120000, // 2 minute evaluation
  },
  cooldownPeriod: 900000, // 15 minute cooldown
};
```

#### 3. Health Check Timeouts

```typescript
// Solution: Increase timeouts and implement circuit breakers
await monitoring.registerHealthCheck('slow-service', async () => {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 8000));

  const check = this.performHealthCheck();

  try {
    await Promise.race([check, timeout]);
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message, degraded: true };
  }
});
```

This comprehensive monitoring module provides production-grade observability with intelligent alerting, health monitoring, and performance tracking capabilities for enterprise LangGraph AI applications.
