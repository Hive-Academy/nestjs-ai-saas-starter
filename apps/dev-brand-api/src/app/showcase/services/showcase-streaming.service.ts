import { Injectable, Logger } from '@nestjs/common';
import type { ShowcaseStreamEvent } from '../types/showcase.types';

/**
 * 🌊 SHOWCASE STREAMING SERVICE - Real-time Communication Hub
 *
 * This service demonstrates sophisticated streaming capabilities including
 * token-level streaming, event broadcasting, and real-time progress updates.
 */
@Injectable()
export class ShowcaseStreamingService {
  private readonly logger = new Logger(ShowcaseStreamingService.name);
  private activeSessions = new Map<string, any>();
  private eventBuffer = new Map<string, ShowcaseStreamEvent[]>();

  /**
   * 🚀 INITIALIZE STREAMING SESSION
   */
  async initializeSession(executionId: string): Promise<void> {
    this.logger.log(`🌊 Initializing streaming session: ${executionId}`);

    this.activeSessions.set(executionId, {
      executionId,
      startTime: Date.now(),
      status: 'active',
      streamingEnabled: true,
      tokenCount: 0,
      eventCount: 0,
    });

    this.eventBuffer.set(executionId, []);
  }

  /**
   * 🎯 STREAM TOKEN
   */
  async streamToken(params: {
    executionId: string;
    token: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const session = this.activeSessions.get(params.executionId);
    if (!session) {
      this.logger.warn(
        `⚠️  No active session for token streaming: ${params.executionId}`
      );
      return;
    }

    // Create token stream event
    const tokenEvent: ShowcaseStreamEvent = {
      id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'token',
      timestamp: Date.now(),
      agentId: params.metadata?.agentId as string,
      data: {
        token: params.token,
        ...params.metadata,
      },
      metadata: {
        sessionId: params.executionId,
        tokenIndex: session.tokenCount++,
        streamingLatency: Date.now() - session.startTime,
      },
    };

    // Add to buffer
    const buffer = this.eventBuffer.get(params.executionId) || [];
    buffer.push(tokenEvent);
    this.eventBuffer.set(params.executionId, buffer);

    // Log for demonstration
    this.logger.debug(
      `🎯 Token streamed: "${params.token.substring(0, 50)}${
        params.token.length > 50 ? '...' : ''
      }" [${params.executionId}]`
    );
  }

  /**
   * 📡 STREAM COORDINATION EVENT
   */
  async streamCoordinationEvent(params: {
    executionId: string;
    selectedAgents: string[];
    reasoning: string;
    confidence: number;
  }): Promise<void> {
    const coordinationEvent: ShowcaseStreamEvent = {
      id: `coord-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'event',
      timestamp: Date.now(),
      data: {
        eventType: 'agent_coordination',
        selectedAgents: params.selectedAgents,
        reasoning: params.reasoning,
        confidence: params.confidence,
      },
      metadata: {
        sessionId: params.executionId,
        phase: 'coordination',
      },
    };

    this.addEventToBuffer(params.executionId, coordinationEvent);
    this.logger.log(
      `📡 Coordination event streamed: ${params.selectedAgents.length} agents selected`
    );
  }

  /**
   * 📊 STREAM ANALYSIS PROGRESS
   */
  async streamAnalysisProgress(params: {
    executionId: string;
    step: number;
    total: number;
    description: string;
    progress: number;
  }): Promise<void> {
    const progressEvent: ShowcaseStreamEvent = {
      id: `progress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'progress',
      timestamp: Date.now(),
      data: {
        eventType: 'analysis_progress',
        step: params.step,
        total: params.total,
        description: params.description,
        progress: params.progress,
        eta: this.calculateETA(params.progress, Date.now()),
      },
      metadata: {
        sessionId: params.executionId,
        phase: 'analysis',
      },
    };

    this.addEventToBuffer(params.executionId, progressEvent);
    this.logger.debug(
      `📊 Analysis progress: ${params.progress.toFixed(1)}% - ${
        params.description
      }`
    );
  }

  /**
   * ✅ STREAM APPROVAL REQUEST
   */
  async streamApprovalRequest(params: {
    executionId: string;
    approval: any;
  }): Promise<void> {
    const approvalEvent: ShowcaseStreamEvent = {
      id: `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'event',
      timestamp: Date.now(),
      data: {
        eventType: 'approval_requested',
        approvalId: params.approval.id,
        title: params.approval.title,
        description: params.approval.description,
        options: params.approval.options,
        timeout: params.approval.timeout,
      },
      metadata: {
        sessionId: params.executionId,
        phase: 'quality_assurance',
        requiresAction: true,
      },
    };

    this.addEventToBuffer(params.executionId, approvalEvent);
    this.logger.log(`✅ Approval request streamed: ${params.approval.title}`);
  }

  /**
   * 🏁 STREAM WORKFLOW COMPLETION
   */
  async streamWorkflowCompletion(params: {
    executionId: string;
    status: string;
    metrics: any;
    report: any;
  }): Promise<void> {
    const completionEvent: ShowcaseStreamEvent = {
      id: `completion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'completion',
      timestamp: Date.now(),
      data: {
        eventType: 'workflow_completed',
        status: params.status,
        metrics: params.metrics,
        report: params.report,
        totalDuration: params.metrics.totalDuration,
        successRate: params.metrics.successRate,
      },
      metadata: {
        sessionId: params.executionId,
        phase: 'completion',
        final: true,
      },
    };

    this.addEventToBuffer(params.executionId, completionEvent);

    // Update session status
    const session = this.activeSessions.get(params.executionId);
    if (session) {
      session.status = 'completed';
      session.endTime = Date.now();
    }

    this.logger.log(
      `🏁 Workflow completion streamed: ${params.status} in ${params.metrics.totalDuration}ms`
    );
  }

  /**
   * 📋 GET STREAM EVENTS
   */
  async getStreamEvents(
    executionId: string,
    fromIndex = 0
  ): Promise<ShowcaseStreamEvent[]> {
    const buffer = this.eventBuffer.get(executionId) || [];
    return buffer.slice(fromIndex);
  }

  /**
   * 📊 GET SESSION STATUS
   */
  async getSessionStatus(executionId: string): Promise<any | null> {
    return this.activeSessions.get(executionId) || null;
  }

  /**
   * 🧹 CLEANUP SESSION
   */
  async cleanupSession(executionId: string): Promise<void> {
    this.logger.log(`🧹 Cleaning up streaming session: ${executionId}`);

    this.activeSessions.delete(executionId);
    this.eventBuffer.delete(executionId);
  }

  /**
   * 📈 GET STREAMING METRICS
   */
  async getStreamingMetrics(): Promise<any> {
    const activeSessions = Array.from(this.activeSessions.values());
    const totalEvents = Array.from(this.eventBuffer.values()).reduce(
      (total, buffer) => total + buffer.length,
      0
    );

    return {
      activeSessions: activeSessions.length,
      totalEvents,
      averageEventsPerSession:
        activeSessions.length > 0
          ? Math.round(totalEvents / activeSessions.length)
          : 0,

      sessionBreakdown: activeSessions.map((session) => ({
        executionId: session.executionId,
        status: session.status,
        duration: Date.now() - session.startTime,
        tokenCount: session.tokenCount,
        eventCount: session.eventCount,
      })),

      eventTypeDistribution: this.calculateEventTypeDistribution(),

      streamingHealth: {
        status: activeSessions.length > 0 ? 'active' : 'idle',
        averageLatency: this.calculateAverageLatency(),
        throughput: this.calculateThroughput(totalEvents),
      },
    };
  }

  /**
   * Private Helper Methods
   */

  private addEventToBuffer(
    executionId: string,
    event: ShowcaseStreamEvent
  ): void {
    const buffer = this.eventBuffer.get(executionId) || [];
    buffer.push(event);
    this.eventBuffer.set(executionId, buffer);

    // Update session event count
    const session = this.activeSessions.get(executionId);
    if (session) {
      session.eventCount++;
    }

    // Limit buffer size to prevent memory issues
    if (buffer.length > 1000) {
      buffer.splice(0, buffer.length - 1000);
    }
  }

  private calculateETA(progress: number, currentTime: number): number | null {
    if (progress <= 0) return null;

    const timeElapsed = currentTime - Date.now() + 1000; // Rough estimate
    const timeRemaining = (timeElapsed / progress) * (100 - progress);

    return Math.round(timeRemaining);
  }

  private calculateEventTypeDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const buffer of this.eventBuffer.values()) {
      for (const event of buffer) {
        distribution[event.type] = (distribution[event.type] || 0) + 1;
      }
    }

    return distribution;
  }

  private calculateAverageLatency(): number {
    const allEvents = Array.from(this.eventBuffer.values()).flat();

    if (allEvents.length === 0) return 0;

    const latencies = allEvents
      .map((event) => event.metadata?.streamingLatency as number)
      .filter((latency) => typeof latency === 'number');

    if (latencies.length === 0) return 0;

    return Math.round(
      latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length
    );
  }

  private calculateThroughput(totalEvents: number): number {
    const oldestSession = Array.from(this.activeSessions.values()).sort(
      (a, b) => a.startTime - b.startTime
    )[0];

    if (!oldestSession || totalEvents === 0) return 0;

    const timeSpan = Date.now() - oldestSession.startTime;
    return Math.round((totalEvents / timeSpan) * 1000); // events per second
  }
}
