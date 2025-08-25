/**
 * Direct Adapter Injection Examples
 *
 * Demonstrates how applications can directly inject and use adapters
 * from the NestJS LangGraph module following the architectural plan.
 */

import { Injectable, Inject } from '@nestjs/common';
import {
  CheckpointAdapter,
  MemoryAdapter,
  MultiAgentAdapter,
  HitlAdapter,
  StreamingAdapter,
  FunctionalApiAdapter,
  PlatformAdapter,
  TimeTravelAdapter,
  MonitoringAdapter,
  WorkflowEngineAdapter,
} from '../adapters';

/**
 * Example 1: Basic Workflow Service with Single Adapter
 *
 * Shows simplest case of injecting one adapter
 */
@Injectable()
export class BasicWorkflowService {
  constructor(
    @Inject(CheckpointAdapter) private checkpoint: CheckpointAdapter
  ) {}

  async executeWithCheckpoints(workflow: any) {
    // Enterprise checkpoint if available, fallback if not
    const checkpointSaver = this.checkpoint.create({
      enabled: true,
      storage: 'redis',
    });

    return await workflow.run({ checkpoint: checkpointSaver });
  }
}

/**
 * Example 2: Multi-Adapter Supervisor Service
 *
 * Demonstrates injecting multiple adapters for comprehensive functionality
 */
@Injectable()
export class SupervisorWorkflowService {
  constructor(
    @Inject(CheckpointAdapter) private checkpoint: CheckpointAdapter,
    @Inject(MemoryAdapter) private memory: MemoryAdapter,
    @Inject(StreamingAdapter) private streaming: StreamingAdapter,
    @Inject(HitlAdapter) private hitl: HitlAdapter
  ) {}

  async executeWithCheckpoints(workflow: any) {
    // Enterprise checkpoint if available, fallback if not
    const checkpointSaver = this.checkpoint.create({
      enabled: true,
      storage: 'redis',
    });

    return await workflow.run({ checkpoint: checkpointSaver });
  }

  async createSmartMemory(config: any) {
    // Enterprise memory if AgenticMemoryModule imported, basic fallback otherwise
    return this.memory.create({
      type: 'enterprise',
      chromadb: config.chromadb,
      neo4j: config.neo4j,
    });
  }

  async executeWithStreaming(workflow: any, clientId: string) {
    const streamConfig = this.streaming.create({
      enabled: true,
      protocol: 'websocket',
      bufferSize: 50,
    });

    return await workflow.run({ streaming: streamConfig });
  }

  async executeWithHumanApproval(workflow: any, approvalConfig: any) {
    const hitlConfig = this.hitl.create({
      enabled: true,
      timeout: approvalConfig.timeoutMs || 300000,
      interruptPoints: ['approval_required'],
    });

    return await workflow.run({ hitl: hitlConfig });
  }

  /**
   * Get comprehensive status of all adapters
   */
  async getAdapterStatus() {
    return {
      checkpoint: {
        available: this.checkpoint.isEnterpriseAvailable(),
        status: this.checkpoint.getAdapterStatus(),
      },
      memory: {
        available: this.memory.isEnterpriseAvailable(),
        status: this.memory.getAdapterStatus(),
      },
      streaming: {
        available: this.streaming.isEnterpriseAvailable(),
        status: this.streaming.getAdapterStatus(),
      },
      hitl: {
        available: this.hitl.isEnterpriseAvailable(),
        status: this.hitl.getAdapterStatus(),
      },
    };
  }
}

/**
 * Example 3: Enterprise AI Pipeline Service
 *
 * Full enterprise service utilizing all available adapters
 */
@Injectable()
export class EnterpriseAIPipelineService {
  constructor(
    @Inject(CheckpointAdapter) private checkpoint: CheckpointAdapter,
    @Inject(MemoryAdapter) private memory: MemoryAdapter,
    @Inject(MultiAgentAdapter) private multiAgent: MultiAgentAdapter,
    @Inject(HitlAdapter) private hitl: HitlAdapter,
    @Inject(StreamingAdapter) private streaming: StreamingAdapter,
    @Inject(FunctionalApiAdapter) private functionalApi: FunctionalApiAdapter,
    @Inject(PlatformAdapter) private platform: PlatformAdapter,
    @Inject(TimeTravelAdapter) private timeTravel: TimeTravelAdapter,
    @Inject(MonitoringAdapter) private monitoring: MonitoringAdapter,
    @Inject(WorkflowEngineAdapter) private workflowEngine: WorkflowEngineAdapter
  ) {}

  /**
   * Execute a comprehensive AI workflow with all enterprise features
   */
  async executeEnterpriseWorkflow(workflowConfig: {
    workflow: any;
    userId: string;
    sessionId: string;
    requiresApproval: boolean;
    streamToClient: boolean;
    enableTimeTravel: boolean;
    multiAgentMode: boolean;
  }) {
    const {
      workflow,
      userId,
      sessionId,
      requiresApproval,
      streamToClient,
      enableTimeTravel,
      multiAgentMode,
    } = workflowConfig;

    // Setup comprehensive configuration
    const config: any = {};

    // 1. Checkpoint configuration for state persistence
    if (this.checkpoint.isEnterpriseAvailable()) {
      config.checkpoint = this.checkpoint.create({
        enabled: true,
        storage: 'redis',
      });
    }

    // 2. Memory configuration for context persistence
    if (this.memory.isEnterpriseAvailable()) {
      config.memory = this.memory.create({
        type: 'enterprise',
        userId,
        threadId: sessionId,
      });
    }

    // 3. Streaming configuration for real-time updates
    if (streamToClient && this.streaming.isEnterpriseAvailable()) {
      config.streaming = this.streaming.create({
        enabled: true,
        protocol: 'websocket',
        bufferSize: 50,
      });
    }

    // 4. Human-in-the-loop configuration
    if (requiresApproval && this.hitl.isEnterpriseAvailable()) {
      config.hitl = this.hitl.create({
        enabled: true,
        timeout: 1800000, // 30 minutes
        interruptPoints: ['approval_required'],
      });
    }

    // 5. Multi-agent coordination
    if (multiAgentMode && this.multiAgent.isEnterpriseAvailable()) {
      config.multiAgent = this.multiAgent.execute({
        agents: ['researcher', 'analyst', 'writer'],
      });
    }

    // 6. Time travel for debugging (optional)
    if (enableTimeTravel && this.timeTravel.isEnterpriseAvailable()) {
      config.timeTravel = this.timeTravel.create({
        enabled: true,
        maxSnapshots: 50,
      });
    }

    // 7. Monitoring and observability
    if (this.monitoring.isEnterpriseAvailable()) {
      config.monitoring = this.monitoring.create({
        enabled: true,
        metrics: {
          enabled: true,
          interval: 1000,
        },
      });
    }

    // 8. Platform integration (if deploying to cloud)
    if (this.platform.isEnterpriseAvailable()) {
      config.platform = this.platform.create({
        enabled: false, // Set to true for cloud deployment
      });
    }

    // 9. Workflow engine optimization
    if (this.workflowEngine.isEnterpriseAvailable()) {
      config.workflowEngine = this.workflowEngine.create({
        enabled: true,
      });
    }

    // Execute the workflow with comprehensive configuration
    const result = await workflow.run(config);

    return {
      result,
      metrics: await this.getExecutionMetrics(sessionId),
      adaptersUsed: this.getUsedAdapters(),
    };
  }

  /**
   * Get execution metrics from monitoring adapter
   */
  private async getExecutionMetrics(sessionId: string) {
    if (!this.monitoring.isEnterpriseAvailable()) {
      return { message: 'Monitoring not available' };
    }

    // Implementation would depend on monitoring adapter capabilities
    return {
      executionTime: 0,
      tokensUsed: 0,
      memoryUsage: 0,
      nodesExecuted: 0,
    };
  }

  /**
   * Get list of which adapters are in enterprise mode
   */
  private getUsedAdapters() {
    return {
      checkpoint: this.checkpoint.isEnterpriseAvailable(),
      memory: this.memory.isEnterpriseAvailable(),
      multiAgent: this.multiAgent.isEnterpriseAvailable(),
      hitl: this.hitl.isEnterpriseAvailable(),
      streaming: this.streaming.isEnterpriseAvailable(),
      functionalApi: this.functionalApi.isEnterpriseAvailable(),
      platform: this.platform.isEnterpriseAvailable(),
      timeTravel: this.timeTravel.isEnterpriseAvailable(),
      monitoring: this.monitoring.isEnterpriseAvailable(),
      workflowEngine: this.workflowEngine.isEnterpriseAvailable(),
    };
  }
}

/**
 * Example 4: Selective Adapter Usage Pattern
 *
 * Shows how to inject only the adapters you need
 */
@Injectable()
export class SelectiveAdapterService {
  constructor(
    // Only inject the adapters this service actually needs
    @Inject(MemoryAdapter) private memory: MemoryAdapter,
    @Inject(StreamingAdapter) private streaming: StreamingAdapter
  ) {}

  async executeRAGPipeline(query: string, userId: string) {
    // Use memory adapter for context retrieval
    const context = this.memory.isEnterpriseAvailable()
      ? await this.memory.create({
          type: 'enterprise',
          userId,
          threadId: `rag-${userId}`,
        })
      : await this.memory.create({ type: 'buffer' });

    // Use streaming for real-time response
    const streamConfig = this.streaming.create({
      enabled: true,
      protocol: 'websocket',
      bufferSize: 25,
    });

    return { context, streamConfig };
  }
}

/**
 * Example 5: Adapter Status Monitoring Service
 *
 * Utility service for monitoring adapter health and availability
 */
@Injectable()
export class AdapterHealthService {
  constructor(
    @Inject(CheckpointAdapter) private checkpoint: CheckpointAdapter,
    @Inject(MemoryAdapter) private memory: MemoryAdapter,
    @Inject(MultiAgentAdapter) private multiAgent: MultiAgentAdapter,
    @Inject(HitlAdapter) private hitl: HitlAdapter,
    @Inject(StreamingAdapter) private streaming: StreamingAdapter,
    @Inject(FunctionalApiAdapter) private functionalApi: FunctionalApiAdapter,
    @Inject(PlatformAdapter) private platform: PlatformAdapter,
    @Inject(TimeTravelAdapter) private timeTravel: TimeTravelAdapter,
    @Inject(MonitoringAdapter) private monitoring: MonitoringAdapter,
    @Inject(WorkflowEngineAdapter) private workflowEngine: WorkflowEngineAdapter
  ) {}

  /**
   * Get comprehensive health status of all adapters
   */
  async getHealthStatus() {
    const adapters = [
      { name: 'checkpoint', adapter: this.checkpoint },
      { name: 'memory', adapter: this.memory },
      { name: 'multiAgent', adapter: this.multiAgent },
      { name: 'hitl', adapter: this.hitl },
      { name: 'streaming', adapter: this.streaming },
      { name: 'functionalApi', adapter: this.functionalApi },
      { name: 'platform', adapter: this.platform },
      { name: 'timeTravel', adapter: this.timeTravel },
      { name: 'monitoring', adapter: this.monitoring },
      { name: 'workflowEngine', adapter: this.workflowEngine },
    ];

    const status: Record<string, any> = {};

    for (const { name, adapter } of adapters) {
      status[name] = {
        enterpriseAvailable: adapter.isEnterpriseAvailable(),
        status: adapter.getAdapterStatus(),
        injectionSuccessful: !!adapter, // Confirms injection worked
      };
    }

    return {
      overall: {
        totalAdapters: adapters.length,
        enterpriseCount: Object.values(status).filter(
          (s: any) => s.enterpriseAvailable
        ).length,
        fallbackCount: Object.values(status).filter(
          (s: any) => !s.enterpriseAvailable
        ).length,
      },
      individual: status,
    };
  }

  /**
   * Simple health check endpoint
   */
  async isHealthy(): Promise<boolean> {
    try {
      const status = await this.getHealthStatus();
      // System is healthy if all adapters are injectable (not necessarily enterprise)
      return status.overall.totalAdapters === 10;
    } catch (error) {
      return false;
    }
  }
}
