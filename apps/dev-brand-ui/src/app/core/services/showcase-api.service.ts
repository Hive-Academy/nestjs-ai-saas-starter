import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Types for Showcase API
export interface ShowcaseWorkflowRequest {
  input: string;
  demonstrationMode: 'basic' | 'advanced' | 'enterprise';
  userId?: string;
  sessionId?: string;
}

export interface ShowcaseWorkflowResponse {
  id: string;
  pattern: 'supervisor' | 'swarm' | 'hierarchical';
  status: 'completed' | 'failed' | 'running';
  output: string;
  decoratorsShowcased: string[];
  enterpriseFeatures: string[];
  executionPath: string[];
  duration: number;
  streamingUrl: string;
  metricsUrl: string;
  swarmResults?: {
    peerCount: number;
    consensusScore: number;
    emergentBehaviors: number;
    collectiveIntelligenceGain: number;
  };
}

export interface ShowcaseSystemStatus {
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  uptime: number;
  agents: Record<string, 'active' | 'idle' | 'busy' | 'error'>;
  workflows: Record<string, 'running' | 'idle' | 'error'>;
  services: Record<string, 'healthy' | 'degraded' | 'offline'>;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  currentThroughput: number;
  avgLatency: number;
  errorRate: number;
}

export interface ShowcaseAgentDemo {
  agentId: string;
  capabilities: string[];
  examples: Array<{
    title: string;
    description: string;
    input: string;
    expectedOutput: string;
    decoratorsUsed: string[];
    complexity: 'basic' | 'advanced' | 'enterprise';
  }>;
  metrics: {
    invocations: number;
    avgResponseTime: number;
    successRate: number;
    complexityHandled: string;
    toolsIntegrated: number;
  };
}

export interface ShowcaseCapabilities {
  decorators: Record<string, string>;
  patterns: Record<string, string>;
  enterpriseFeatures: string[];
  usageExamples: {
    basicUsage: string;
    advancedUsage: string;
    expertUsage: string;
  };
  performanceMetrics: {
    developmentVelocity: string;
    codeReduction: string;
    productionReadiness: string;
    scalability: string;
  };
}

export interface PatternExploration {
  pattern: string;
  configuration: {
    agentCount: number;
    complexity: 'low' | 'medium' | 'high';
    customConfig: any;
  };
  optimization: any;
  recommendations: string[];
  useCases: string[];
  performanceEstimates: {
    executionTime: number;
    qualityScore: number;
    complexityScore: number;
    scalabilityRating: number;
  };
}

/**
 * 🚀 SHOWCASE API SERVICE
 *
 * Connects Angular frontend to the comprehensive DevBrand Showcase API
 * Built on TASK_API_001 implementation with 100% library utilization
 */
@Injectable({
  providedIn: 'root',
})
export class ShowcaseApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/showcase`;

  /**
   * Execute Supervisor Pattern Showcase
   * Demonstrates hierarchical coordination with ALL decorator capabilities
   */
  executeSupervisorShowcase(
    request: ShowcaseWorkflowRequest
  ): Observable<ShowcaseWorkflowResponse> {
    return this.http
      .post<ShowcaseWorkflowResponse>(
        `${this.baseUrl}/workflows/supervisor`,
        request
      )
      .pipe(catchError(this.handleError('executeSupervisorShowcase')));
  }

  /**
   * Execute Swarm Pattern Showcase
   * Demonstrates peer-to-peer coordination and distributed intelligence
   */
  executeSwarmShowcase(
    request: ShowcaseWorkflowRequest
  ): Observable<ShowcaseWorkflowResponse> {
    return this.http
      .post<ShowcaseWorkflowResponse>(
        `${this.baseUrl}/workflows/swarm`,
        request
      )
      .pipe(catchError(this.handleError('executeSwarmShowcase')));
  }

  /**
   * Get Real-time System Status
   * Comprehensive system health monitoring for live dashboard
   */
  getSystemStatus(): Observable<ShowcaseSystemStatus> {
    return this.http
      .get<ShowcaseSystemStatus>(`${this.baseUrl}/status`)
      .pipe(catchError(this.handleError('getSystemStatus')));
  }

  /**
   * Get Agent Capability Demonstration
   * Individual agent capabilities with metrics and examples
   */
  getAgentDemo(agentId: string): Observable<ShowcaseAgentDemo> {
    return this.http
      .get<ShowcaseAgentDemo>(`${this.baseUrl}/agents/${agentId}/demo`)
      .pipe(catchError(this.handleError('getAgentDemo')));
  }

  /**
   * Get Execution Metrics
   * Detailed performance analytics for workflow executions
   */
  getExecutionMetrics(executionId: string): Observable<any> {
    return this.http
      .get(`${this.baseUrl}/metrics/${executionId}`)
      .pipe(catchError(this.handleError('getExecutionMetrics')));
  }

  /**
   * Get All System Capabilities
   * Complete catalog of decorators, patterns, and enterprise features
   */
  getCapabilities(): Observable<ShowcaseCapabilities> {
    return this.http
      .get<ShowcaseCapabilities>(`${this.baseUrl}/capabilities`)
      .pipe(catchError(this.handleError('getCapabilities')));
  }

  /**
   * Explore Coordination Pattern
   * Interactive exploration with custom parameters
   */
  explorePattern(
    pattern: string,
    agentCount = 3,
    complexity: 'low' | 'medium' | 'high' = 'medium',
    customConfig?: any
  ): Observable<PatternExploration> {
    const params = new HttpParams()
      .set('agents', agentCount.toString())
      .set('complexity', complexity);

    return this.http
      .post<PatternExploration>(
        `${this.baseUrl}/explore/pattern/${pattern}`,
        customConfig || {},
        { params }
      )
      .pipe(catchError(this.handleError('explorePattern')));
  }

  /**
   * Get Available Agent List
   * Returns list of all available showcase agents
   */
  getAvailableAgents(): string[] {
    return [
      'demo-showcase',
      'advanced-showcase',
      'specialist-showcase',
      'streaming-showcase',
      'hitl-showcase',
    ];
  }

  /**
   * Get Available Patterns
   * Returns list of all supported coordination patterns
   */
  getAvailablePatterns(): string[] {
    return [
      'supervisor',
      'swarm',
      'hierarchical',
      'pipeline',
      'parallel',
      'map-reduce',
    ];
  }

  /**
   * Private error handler
   */
  private handleError(operation: string) {
    return (error: any): Observable<any> => {
      console.error(`${operation} failed:`, error);

      // Extract meaningful error message
      const message =
        error.error?.message || error.message || 'Unknown error occurred';

      return throwError(() => new Error(`${operation}: ${message}`));
    };
  }
}
