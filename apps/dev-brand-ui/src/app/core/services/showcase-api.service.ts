import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Types for Showcase API
export interface ShowcaseWorkflowRequest {
  input: string;
  demonstrationMode: 'basic' | 'advanced' | 'enterprise';
  userId?: string;
  sessionId?: string;
  selectedAgents?: string[];
  networkId?: string;
  enableStreaming?: boolean;
  enableHitl?: boolean;
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

// New interfaces for enhanced backend integration
export interface ShowcaseAgent {
  id: string;
  name: string;
  description: string;
  tools: string[];
  capabilities: string[];
  priority: 'low' | 'medium' | 'high';
  executionTime: 'fast' | 'medium' | 'slow';
  outputFormat: 'brief' | 'detailed' | 'comprehensive';
  systemPrompt: string;
  metadata: {
    version: string;
    category: string;
    complexity: 'basic' | 'advanced' | 'enterprise';
    showcaseLevel: string;
    decoratorsUsed: string[];
    enterpriseFeatures: string[];
  };
}

// Customer Support API interfaces
export interface TicketRequest {
  customerId: string;
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  customerTier?: 'basic' | 'premium' | 'enterprise';
  metadata?: Record<string, any>;
}

export interface SupportTicketResponse {
  success: boolean;
  data?: {
    ticketId: string;
    executionId: string;
  };
  executionId: string;
  streaming: boolean;
  streamUrl?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchTime: string;
  answer?: string;
  metadata: {
    timestamp: string;
    provider: string;
    version: string;
  };
}

export interface NewsSearchResponse {
  query: string;
  articles: Array<{
    title: string;
    url: string;
    summary: string;
    publishedAt: string;
    source: string;
    relevanceScore: number;
    category: string;
  }>;
  totalArticles: number;
  timeframe: 'day' | 'week' | 'month';
  category: 'general' | 'tech' | 'business' | 'science' | 'health';
}

export interface ResearchSearchResponse {
  topic: string;
  sources: Array<{
    title: string;
    url: string;
    content: string;
    type: 'academic' | 'industry' | 'news' | 'general';
    credibility: 'high' | 'medium-high' | 'medium' | 'low';
    score: number;
  }>;
  synthesis: string;
  totalSources: number;
  analysisDepth: 'summary' | 'detailed' | 'comprehensive';
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
  private readonly customerSupportUrl = `${environment.apiUrl}/api/customer-support`;

  /**
   * Execute Supervisor Pattern Showcase
   * Now routes to customer-support backend instead of deprecated showcase endpoints
   */
  executeSupervisorShowcase(
    request: ShowcaseWorkflowRequest
  ): Observable<ShowcaseWorkflowResponse> {
    const ticketRequest: TicketRequest = {
      customerId: request.userId || 'demo-user',
      title: request.input.slice(0, 60) || 'Supervisor Pattern Demo',
      description: request.input,
      priority: request.demonstrationMode === 'enterprise' ? 'high' : 'medium',
      category: 'demo-supervisor',
      customerTier: request.demonstrationMode === 'enterprise' ? 'enterprise' : 'premium',
      metadata: {
        pattern: 'supervisor',
        selectedAgents: request.selectedAgents,
        enableStreaming: request.enableStreaming,
        enableHitl: request.enableHitl,
        demonstrationMode: request.demonstrationMode
      }
    };

    return this.http
      .post<SupportTicketResponse>(
        `${this.customerSupportUrl}/tickets`,
        ticketRequest
      )
      .pipe(
        map(response => this.adaptToShowcaseResponse(response, 'supervisor')),
        catchError(this.handleError('executeSupervisorShowcase'))
      );
  }

  /**
   * Execute Swarm Pattern Showcase
   * Now routes to customer-support backend instead of deprecated showcase endpoints
   */
  executeSwarmShowcase(
    request: ShowcaseWorkflowRequest
  ): Observable<ShowcaseWorkflowResponse> {
    const ticketRequest: TicketRequest = {
      customerId: request.userId || 'demo-user',
      title: request.input.slice(0, 60) || 'Swarm Pattern Demo',
      description: request.input,
      priority: request.demonstrationMode === 'enterprise' ? 'high' : 'medium',
      category: 'demo-swarm',
      customerTier: request.demonstrationMode === 'enterprise' ? 'enterprise' : 'premium',
      metadata: {
        pattern: 'swarm',
        selectedAgents: request.selectedAgents,
        enableStreaming: request.enableStreaming,
        enableHitl: request.enableHitl,
        demonstrationMode: request.demonstrationMode
      }
    };

    return this.http
      .post<SupportTicketResponse>(
        `${this.customerSupportUrl}/tickets`,
        ticketRequest
      )
      .pipe(
        map(response => this.adaptToShowcaseResponse(response, 'swarm')),
        catchError(this.handleError('executeSwarmShowcase'))
      );
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
   * Get Available Agents with Full Metadata
   * Now routes to customer-support backend instead of deprecated showcase endpoints
   */
  getAvailableAgents(): Observable<ShowcaseAgent[]> {
    return this.http
      .get<{success: boolean; data: any[]; total: number}>(
        `${this.customerSupportUrl}/agents`
      )
      .pipe(
        map(response => response.data.map(agent => ({
          id: agent.id || agent.name,
          name: agent.name,
          description: agent.description || 'Customer support agent',
          tools: agent.tools || [],
          capabilities: agent.capabilities || [],
          priority: agent.priority || 'medium',
          executionTime: agent.executionTime || 'medium',
          outputFormat: agent.outputFormat || 'detailed',
          systemPrompt: agent.systemPrompt || '',
          metadata: {
            version: '1.0',
            category: 'customer-support',
            complexity: 'advanced',
            showcaseLevel: 'production',
            decoratorsUsed: ['@Workflow', '@Task', '@RequiresApproval'],
            enterpriseFeatures: ['hitl', 'streaming', 'approval']
          }
        } as ShowcaseAgent))),
        catchError(this.handleError('getAvailableAgents'))
      );
  }

  /**
   * Get Available Tools
   * Returns list of all available showcase tools
   */
  getAvailableTools(): Observable<any> {
    return this.http
      .get(`${this.baseUrl}/tools`)
      .pipe(catchError(this.handleError('getAvailableTools')));
  }

  /**
   * Knowledge Base Search
   * Search the customer support knowledge base instead of web search
   */
  searchWeb(query: string, maxResults = 5, searchDepth: 'basic' | 'advanced' = 'basic'): Observable<SearchResponse> {
    return this.http
      .post<any>(`${this.customerSupportUrl}/knowledge-base/search`, {
        query,
        maxResults,
        searchDepth: searchDepth === 'advanced' ? 'comprehensive' : 'summary'
      })
      .pipe(
        map(response => ({
          query,
          results: response.results || [],
          totalResults: response.totalResults || 0,
          searchTime: response.searchTime || '0ms',
          answer: response.answer,
          metadata: {
            timestamp: new Date().toISOString(),
            provider: 'knowledge-base',
            version: '1.0'
          }
        } as SearchResponse)),
        catchError(this.handleError('searchWeb'))
      );
  }

  /**
   * Tavily News Search
   * Search for recent news articles
   */
  searchNews(
    query: string, 
    timeframe: 'day' | 'week' | 'month' = 'week',
    category: 'general' | 'tech' | 'business' | 'science' | 'health' = 'general',
    maxResults = 8
  ): Observable<NewsSearchResponse> {
    return this.http
      .post<NewsSearchResponse>(`${this.baseUrl}/search/news`, {
        query,
        timeframe,
        category,
        maxResults
      })
      .pipe(catchError(this.handleError('searchNews')));
  }

  /**
   * Tavily Research Search
   * Comprehensive research with source analysis
   */
  searchResearch(
    topic: string,
    analysisDepth: 'summary' | 'detailed' | 'comprehensive' = 'detailed',
    minSources = 5,
    includeAcademic = true
  ): Observable<ResearchSearchResponse> {
    return this.http
      .post<ResearchSearchResponse>(`${this.baseUrl}/search/research`, {
        topic,
        analysisDepth,
        minSources,
        includeAcademic
      })
      .pipe(catchError(this.handleError('searchResearch')));
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
   * Create a new support ticket (new method for frontend)
   */
  createSupportTicket(request: TicketRequest): Observable<SupportTicketResponse> {
    return this.http
      .post<SupportTicketResponse>(
        `${this.customerSupportUrl}/tickets`,
        request
      )
      .pipe(catchError(this.handleError('createSupportTicket')));
  }

  /**
   * Approve a support ticket
   */
  approveTicket(
    ticketId: string,
    approval: { approved: boolean; approvedBy: string; feedback?: string }
  ): Observable<any> {
    return this.http
      .put(`${this.customerSupportUrl}/tickets/${ticketId}/approve`, approval)
      .pipe(catchError(this.handleError('approveTicket')));
  }

  /**
   * Get ticket status
   */
  getTicketStatus(ticketId: string): Observable<any> {
    return this.http
      .get(`${this.customerSupportUrl}/tickets/${ticketId}`)
      .pipe(catchError(this.handleError('getTicketStatus')));
  }

  /**
   * Adapter function to convert customer-support response to showcase format
   */
  private adaptToShowcaseResponse(
    response: SupportTicketResponse,
    pattern: 'supervisor' | 'swarm'
  ): ShowcaseWorkflowResponse {
    return {
      id: response.data?.ticketId || response.executionId,
      pattern: pattern,
      status: 'running',
      output: '',
      decoratorsShowcased: [
        '@Workflow',
        '@Entrypoint',
        '@Task',
        '@RequiresApproval',
        '@StreamProgress',
        '@StreamEvent',
        '@StreamToken'
      ],
      enterpriseFeatures: ['hitl', 'vector', 'graph', 'multi-agent'],
      executionPath: [],
      duration: 0,
      streamingUrl: response.streamUrl || 
        `${this.customerSupportUrl}/tickets/${response.data?.ticketId}/stream`,
      metricsUrl: `${this.customerSupportUrl}/metrics`,
      ...(pattern === 'swarm' && {
        swarmResults: {
          peerCount: 3,
          consensusScore: 0.85,
          emergentBehaviors: 0,
          collectiveIntelligenceGain: 0
        }
      })
    };
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
