import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface WorkflowMetrics {
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  totalDuration: number;
  nodeExecutions: Map<string, number>;
  toolExecutions: Map<string, number>;
  errorsByType: Map<string, number>;
  lastExecutionTime?: Date;
}

/**
 * Provider for collecting and exposing workflow metrics
 */
@Injectable()
export class MetricsProvider {
  private readonly logger = new Logger(MetricsProvider.name);
  private metrics: WorkflowMetrics = {
    executionCount: 0,
    successCount: 0,
    failureCount: 0,
    averageDuration: 0,
    totalDuration: 0,
    nodeExecutions: new Map(),
    toolExecutions: new Map(),
    errorsByType: new Map(),
  };

  constructor(@Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2) {
    this.subscribeToEvents();
  }

  /**
   * Subscribe to workflow events for metrics collection
   */
  private subscribeToEvents(): void {
    // Workflow events
    this.eventEmitter.on('workflow.started', () => {
      this.metrics.executionCount++;
    });

    this.eventEmitter.on('workflow.completed', (data: any) => {
      this.metrics.successCount++;
      this.updateDuration(data.duration);
      this.metrics.lastExecutionTime = new Date();
    });

    this.eventEmitter.on('workflow.failed', (data: any) => {
      this.metrics.failureCount++;
      if (data.error) {
        const errorType = data.error.type || 'unknown';
        this.metrics.errorsByType.set(
          errorType,
          (this.metrics.errorsByType.get(errorType) || 0) + 1
        );
      }
    });

    // Node events
    this.eventEmitter.on('node.completed', (data: any) => {
      const {nodeId} = data;
      this.metrics.nodeExecutions.set(
        nodeId,
        (this.metrics.nodeExecutions.get(nodeId) || 0) + 1
      );
    });

    // Tool events
    this.eventEmitter.on('tool.completed', (data: any) => {
      const {toolName} = data;
      this.metrics.toolExecutions.set(
        toolName,
        (this.metrics.toolExecutions.get(toolName) || 0) + 1
      );
    });
  }

  /**
   * Update duration metrics
   */
  private updateDuration(duration: number): void {
    this.metrics.totalDuration += duration;
    this.metrics.averageDuration = 
      this.metrics.totalDuration / this.metrics.successCount;
  }

  /**
   * Get current metrics
   */
  getMetrics(): WorkflowMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      averageDuration: 0,
      totalDuration: 0,
      nodeExecutions: new Map(),
      toolExecutions: new Map(),
      errorsByType: new Map(),
    };
    this.logger.debug('Metrics reset');
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    if (this.metrics.executionCount === 0) {return 0;}
    return this.metrics.successCount / this.metrics.executionCount;
  }

  /**
   * Get most executed nodes
   */
  getTopNodes(limit = 10): Array<{ nodeId: string; count: number }> {
    const sorted = Array.from(this.metrics.nodeExecutions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([nodeId, count]) => ({ nodeId, count }));
    
    return sorted;
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    const exportData = {
      ...this.metrics,
      nodeExecutions: Array.from(this.metrics.nodeExecutions.entries()),
      toolExecutions: Array.from(this.metrics.toolExecutions.entries()),
      errorsByType: Array.from(this.metrics.errorsByType.entries()),
      exportedAt: new Date(),
    };
    
    return JSON.stringify(exportData, null, 2);
  }
}