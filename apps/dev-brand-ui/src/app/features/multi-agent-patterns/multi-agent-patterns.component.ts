import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ShowcaseApiService,
  ShowcaseWorkflowRequest,
  ShowcaseWorkflowResponse,
  ShowcaseAgent,
  SearchResponse,
  NewsSearchResponse,
  ResearchSearchResponse,
} from '../../core/services/showcase-api.service';
import { WebSocketService } from '../../core/services/websocket.service';
import {
  WebSocketMessage,
  WebSocketMessageType,
  StreamUpdatePayload,
} from '../../core/interfaces/agent-state.interface';

interface PatternDemo {
  id: string;
  name: string;
  description: string;
  icon: string;
  complexity: 'low' | 'medium' | 'high';
  agentCount: number;
  useCases: string[];
  advantages: string[];
  visualizationType: '3d-network' | '2d-flow' | 'hierarchy';
}

interface ServiceCoordination {
  id: string;
  name: string;
  status: 'idle' | 'active' | 'completed' | 'error';
  description: string;
  progress: number;
  executionOrder: number;
}

interface SearchDemonstration {
  type: 'web' | 'news' | 'research';
  query: string;
  results?: SearchResponse | NewsSearchResponse | ResearchSearchResponse;
  isLoading: boolean;
  error?: string;
}

interface ExecutionStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  agent?: string;
  progress: number;
  duration?: number;
  output?: string;
}

/**
 * 🐝 MULTI-AGENT PATTERNS COMPONENT
 *
 * Interactive demonstration of Supervisor vs Swarm patterns
 * Real-time visualization of agent coordination
 * Connects to showcase API endpoints for live demonstrations
 */
@Component({
  selector: 'brand-multi-agent-patterns',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './multi-agent-patterns.component.html',
  styleUrls: ['./multi-agent-patterns.component.css'],
})
export class MultiAgentPatternsComponent implements OnInit {
  private readonly showcaseApi = inject(ShowcaseApiService);
  readonly wsService = inject(WebSocketService);

  // State
  readonly selectedPattern = signal<string>('supervisor');
  readonly isExecuting = signal(false);
  readonly executionStatus = signal<'idle' | 'running' | 'completed' | 'error'>(
    'idle'
  );
  readonly visualizationMode = signal<'2d' | '3d'>('2d');
  readonly currentExecution = signal<ShowcaseWorkflowResponse | null>(null);
  readonly executionSteps = signal<ExecutionStep[]>([]);
  readonly streamingOutput = signal<string>('');  // For real-time token streaming display
  readonly availableAgents = signal<ShowcaseAgent[]>([]);
  readonly selectedAgents = signal<string[]>([]);
  readonly serviceCoordination = signal<ServiceCoordination[]>([]);
  readonly searchDemonstration = signal<SearchDemonstration | null>(null);
  readonly showSearchSection = signal(false);

  // Form data
  inputQuery =
    'Analyze my GitHub repositories and create a comprehensive personal brand strategy with multi-platform content';
  agentCount = 3;
  complexityLevel: 'low' | 'medium' | 'high' = 'medium';
  demonstrationMode: 'basic' | 'advanced' | 'enterprise' = 'advanced';
  
  // Search demonstration data
  searchQuery = 'AI development trends 2024';
  searchType: 'web' | 'news' | 'research' = 'web';
  newsTimeframe: 'day' | 'week' | 'month' = 'week';
  newsCategory: 'general' | 'tech' | 'business' | 'science' | 'health' = 'tech';
  researchDepth: 'summary' | 'detailed' | 'comprehensive' = 'detailed';

  // Pattern definitions
  readonly availablePatterns = signal<PatternDemo[]>([
    {
      id: 'supervisor',
      name: 'Supervisor Pattern',
      description: 'Hierarchical coordination with intelligent routing',
      icon: '👑',
      complexity: 'medium',
      agentCount: 3,
      useCases: [
        'Content creation workflows',
        'Task delegation scenarios',
        'Quality assurance processes',
      ],
      advantages: [
        'Clear command structure',
        'Efficient resource allocation',
        'Quality control through supervision',
        'Scalable coordination',
      ],
      visualizationType: 'hierarchy',
    },
    {
      id: 'swarm',
      name: 'Swarm Pattern',
      description: 'Peer-to-peer collaboration with collective intelligence',
      icon: '🐝',
      complexity: 'high',
      agentCount: 4,
      useCases: [
        'Distributed problem solving',
        'Collaborative analysis',
        'Emergent solution finding',
      ],
      advantages: [
        'Resilient to failures',
        'Emergent behaviors',
        'Self-organizing optimization',
        'No single point of failure',
      ],
      visualizationType: '3d-network',
    },
  ]);

  readonly selectedPatternInfo = computed(() => {
    return this.availablePatterns().find(
      (p) => p.id === this.selectedPattern()
    );
  });

  constructor() {
    // Simulate execution steps for demo purposes
    effect(() => {
      const pattern = this.selectedPattern();
      this.updateExecutionSteps(pattern);
    });
  }

  ngOnInit() {
    this.connectWebSocket();
    this.subscribeToStreamingEvents();
    this.loadAvailableAgents();
    this.initializeServiceCoordination();

    // Subscribe to execution events when connection is established
    this.wsService.connectionStatus$.subscribe({
      next: (status) => {
        if (status.status === 'connected') {
          console.log('🔗 WebSocket connected, subscribing to events');
          // Subscribe to streaming events for this component
          this.wsService.subscribeToEvents(['stream_update', 'token', 'progress', 'event']);
        }
      }
    });
  }

  selectPattern(patternId: string) {
    this.selectedPattern.set(patternId);
    this.executionStatus.set('idle');
    this.currentExecution.set(null);
    this.streamingOutput.set('');  // Clear streaming output when switching patterns
  }

  setVisualizationMode(mode: '2d' | '3d') {
    this.visualizationMode.set(mode);
  }

  getPatternName(): string {
    const pattern = this.selectedPatternInfo();
    return pattern ? pattern.name : 'Pattern';
  }

  getStatusText(): string {
    const status = this.executionStatus();
    const statusMap = {
      idle: '⚪ Ready to Execute',
      running: '🟡 Executing...',
      completed: '🟢 Completed',
      error: '🔴 Error Occurred',
    };
    return statusMap[status];
  }

  async executePattern() {
    if (!this.inputQuery.trim() || this.isExecuting()) return;

    this.isExecuting.set(true);
    this.executionStatus.set('running');
    this.currentExecution.set(null);
    this.streamingOutput.set('');  // Clear streaming output for new execution

    // Clear previous execution steps and reset
    this.updateExecutionSteps(this.selectedPattern());

    const request: ShowcaseWorkflowRequest = {
      input: this.inputQuery,
      demonstrationMode: this.demonstrationMode,
      userId: 'demo-user',
      sessionId: `pattern-${Date.now()}`,
      selectedAgents: this.selectedAgents(),
      enableStreaming: true,
      enableHitl: this.demonstrationMode === 'enterprise'
    };

    // Generate a unique execution ID for this run
    const executionId = `${this.selectedPattern()}-${Date.now()}`;
    
    // Subscribe to execution-specific streaming events BEFORE making the API call
    if (this.wsService.isConnected()) {
      console.log('🔔 Subscribing to execution:', executionId);
      this.wsService.subscribeToExecution({
        executionId,
        eventTypes: ['token', 'progress', 'event', 'values', 'updates', 'node_start', 'node_complete'],
        options: { includeHistory: false }
      });
    } else {
      console.warn('⚠️ WebSocket not connected, attempting to reconnect...');
      await this.connectWebSocket();
      // Wait a bit for connection to establish
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    try {
      let response: ShowcaseWorkflowResponse | undefined;

      console.log('🚀 Starting showcase execution:', {
        pattern: this.selectedPattern(),
        executionId,
        request
      });

      if (this.selectedPattern() === 'supervisor') {
        response = await this.showcaseApi
          .executeSupervisorShowcase(request)
          .toPromise();
      } else {
        response = await this.showcaseApi
          .executeSwarmShowcase(request)
          .toPromise();
      }

      if (response) {
        console.log('✅ Showcase execution completed:', response);
        this.currentExecution.set(response);
        
        // Don't immediately complete all steps - let the streaming updates handle it
        if (!this.wsService.isConnected()) {
          // Only complete steps if WebSocket isn't working
          this.executionStatus.set('completed');
          this.completeAllSteps();
        }
      } else {
        throw new Error('No response received from showcase API');
      }
    } catch (error) {
      console.error('❌ Pattern execution failed:', error);
      this.executionStatus.set('error');
      this.errorAllSteps();
    } finally {
      // Keep execution running if we're still receiving stream updates
      setTimeout(() => {
        if (this.executionStatus() === 'running') {
          this.executionStatus.set('completed');
          this.completeAllSteps();
        }
        this.isExecuting.set(false);
      }, 5000); // Give 5 seconds for final stream updates
    }
  }

  private connectWebSocket() {
    // Use the default WebSocket configuration
    // The service will automatically connect to the correct URL and namespace
    this.wsService.connect({
      userId: 'pattern-demo',
      sessionId: `patterns-${Date.now()}`,
    });
  }

  private subscribeToStreamingEvents() {
    // Subscribe to stream updates from the WebSocket service
    this.wsService.streamUpdates$.subscribe({
      next: (streamData) => {
        console.log('🌊 Stream update received:', streamData);
        this.handleStreamUpdate(streamData);
      },
      error: (error) => {
        console.error('Stream subscription error:', error);
      }
    });

    // Subscribe to WebSocket messages
    this.wsService.messages$.subscribe({
      next: (message) => {
        console.log('📡 WebSocket message received:', message);
        this.handleWebSocketMessage(message);
      },
      error: (error) => {
        console.error('WebSocket message error:', error);
      }
    });
  }

  private handleStreamUpdate(streamData: StreamUpdatePayload) {
    console.log('🌊 Processing stream update:', streamData);

    // Handle different types of stream updates
    const updateType = streamData.update.type;
    const updateData = streamData.update.data;
    const metadata: any = streamData.update.metadata || {};

    // Map node IDs from backend to UI step IDs
    const nodeIdMap: Record<string, string> = {
      'initializeShowcase': 'supervisor',
      'coordinateAgents': 'supervisor',
      'performIntelligentAnalysis': 'github-analyzer',
      'generateContent': 'content-creator',
      'performQualityAssurance': 'brand-strategist',
      'finalizeShowcase': 'brand-strategist',
      // Swarm mappings
      'initializeSwarm': 'peer-1',
      'formPeerNetwork': 'peer-1',
      'collaborateOnAnalysis': 'peer-2',
      'achieveConsensus': 'peer-3',
      'emergeCollectiveIntelligence': 'peer-4',
      'finalizeSwarmResult': 'peer-4'
    };

    if (updateType === 'token' && updateData?.content) {
      // Handle token streaming - update real-time text display
      console.log('🎯 Token received:', updateData.content);
      this.displayStreamingToken(updateData.content);
    }

    if (updateType === 'progress' && updateData) {
      const progress = updateData.progress || updateData.percentage || 0;
      const nodeId = metadata.nodeId || metadata.node || 'unknown';
      const mappedId = nodeIdMap[nodeId] || nodeId;
      console.log('📈 Progress update:', { nodeId, mappedId, progress });
      this.updateStepProgress(mappedId, progress);
    }

    if (updateType === 'event' || updateType === 'events') {
      // Handle event data - it might be the event type directly or nested
      const eventType = typeof updateData === 'string' ? updateData : 
                       updateData?.eventType || updateData?.type || updateData?.event;
      const nodeId = metadata.nodeId || metadata.node || updateData?.nodeId;
      const mappedId = nodeIdMap[nodeId] || nodeId;
      
      console.log('📡 Event received:', eventType, { nodeId, mappedId, data: updateData });

      if (mappedId && eventType) {
        const eventUpper = eventType.toUpperCase();
        if (eventUpper.includes('START') || eventUpper.includes('BEGIN')) {
          this.setStepStatus(mappedId, 'running');
        } else if (eventUpper.includes('COMPLETE') || eventUpper.includes('END') || eventUpper.includes('FINISH')) {
          this.setStepStatus(mappedId, 'completed');
          this.updateStepProgress(mappedId, 100);
        } else if (eventUpper.includes('ERROR') || eventUpper.includes('FAIL')) {
          this.setStepStatus(mappedId, 'error');
        }
      }
    }

    // Handle node_start and node_complete events directly
    if (updateType === 'node_start' || updateType === 'NODE_START') {
      const nodeId = metadata.nodeId || metadata.node || updateData?.nodeId;
      const mappedId = nodeIdMap[nodeId] || nodeId;
      console.log('🟢 Node started:', { nodeId, mappedId });
      if (mappedId) {
        this.setStepStatus(mappedId, 'running');
      }
    }

    if (updateType === 'node_complete' || updateType === 'NODE_COMPLETE') {
      const nodeId = metadata.nodeId || metadata.node || updateData?.nodeId;
      const mappedId = nodeIdMap[nodeId] || nodeId;
      console.log('✅ Node completed:', { nodeId, mappedId });
      if (mappedId) {
        this.setStepStatus(mappedId, 'completed');
        this.updateStepProgress(mappedId, 100);
      }
    }

    // Handle workflow completion
    if (updateType === 'workflow_complete' || updateType === 'WORKFLOW_COMPLETE') {
      console.log('🎉 Workflow completed!');
      this.executionStatus.set('completed');
      this.completeAllSteps();
    }
  }

  private handleWebSocketMessage(message: WebSocketMessage) {
    console.log('📨 Processing WebSocket message:', message.type);

    // Handle specific message types
    switch (message.type) {
      case WebSocketMessageType.STREAM_UPDATE:
        // This should be handled by streamUpdates$ subscription
        break;
      case WebSocketMessageType.CONNECTION_STATUS:
        console.log('🔗 Connection status:', message.data);
        break;
      case WebSocketMessageType.ERROR:
        console.error('❌ WebSocket error:', message.data);
        break;
      default:
        console.log('📝 Unhandled message type:', message.type);
    }
  }

  private updateStepProgress(nodeId: string, progress: number) {
    const currentSteps = this.executionSteps();
    const updatedSteps = currentSteps.map(step => {
      if (step.id === nodeId || step.name.toLowerCase().includes(nodeId.toLowerCase())) {
        return { ...step, progress: Math.round(progress) };
      }
      return step;
    });
    this.executionSteps.set(updatedSteps);
  }

  private setStepStatus(nodeId: string, status: 'pending' | 'running' | 'completed' | 'error') {
    const currentSteps = this.executionSteps();
    const updatedSteps = currentSteps.map(step => {
      if (step.id === nodeId || step.name.toLowerCase().includes(nodeId.toLowerCase())) {
        return { ...step, status };
      }
      return step;
    });
    this.executionSteps.set(updatedSteps);
  }

  private updateExecutionSteps(pattern: string) {
    const supervisorSteps: ExecutionStep[] = [
      {
        id: 'supervisor',
        name: 'Supervisor Agent',
        status: 'pending',
        progress: 0,
      },
      {
        id: 'github-analyzer',
        name: 'GitHub Analyzer',
        status: 'pending',
        progress: 0,
      },
      {
        id: 'content-creator',
        name: 'Content Creator',
        status: 'pending',
        progress: 0,
      },
      {
        id: 'brand-strategist',
        name: 'Brand Strategist',
        status: 'pending',
        progress: 0,
      },
    ];

    const swarmSteps: ExecutionStep[] = [
      { id: 'peer-1', name: 'Analysis Peer', status: 'pending', progress: 0 },
      { id: 'peer-2', name: 'Strategy Peer', status: 'pending', progress: 0 },
      { id: 'peer-3', name: 'Content Peer', status: 'pending', progress: 0 },
      { id: 'peer-4', name: 'Quality Peer', status: 'pending', progress: 0 },
    ];

    this.executionSteps.set(
      pattern === 'supervisor' ? supervisorSteps : swarmSteps
    );
  }

  // Remove simulateExecution method as we're using real streaming now
  // The streaming updates will handle the step progress updates

  private generateStepOutput(stepName: string): string {
    const outputs = {
      'Supervisor Agent':
        'Coordinating workflow execution and delegating tasks...',
      'GitHub Analyzer':
        'Analyzing repositories, extracting skills and achievements...',
      'Content Creator':
        'Generating multi-platform content based on analysis...',
      'Brand Strategist':
        'Developing comprehensive brand strategy and positioning...',
      'Analysis Peer': 'Distributed analysis of technical capabilities...',
      'Strategy Peer':
        'Collaborative strategy development with peer consensus...',
      'Content Peer': 'Peer-to-peer content ideation and optimization...',
      'Quality Peer': 'Collective quality assurance and refinement...',
    };

    return outputs[stepName as keyof typeof outputs] || 'Processing...';
  }

  private completeAllSteps() {
    const steps = this.executionSteps();
    steps.forEach((step) => {
      if (step.status !== 'completed') {
        step.status = 'completed';
        step.progress = 100;
        step.duration = Math.floor(Math.random() * 2000) + 500;
        step.output = this.generateStepOutput(step.name);
      }
    });
    this.executionSteps.set([...steps]);
  }

  private errorAllSteps() {
    const steps = this.executionSteps();
    steps.forEach((step) => {
      if (step.status === 'running') {
        step.status = 'error';
      }
    });
    this.executionSteps.set([...steps]);
  }

  getConnectionStatus(step1: ExecutionStep, step2: ExecutionStep): string {
    if (step1.status === 'completed' && step2.status === 'completed') {
      return 'status-active';
    } else if (step1.status === 'running' || step2.status === 'running') {
      return 'status-active';
    }
    return 'status-inactive';
  }

  private displayStreamingToken(content: string) {
    console.log('📝 Displaying token:', content);

    // Append token to streaming output
    const currentOutput = this.streamingOutput();
    this.streamingOutput.set(currentOutput + content);

    // Also update the currently running step's output
    if (this.executionStatus() === 'running') {
      const steps = this.executionSteps();
      const runningStep = steps.find(s => s.status === 'running');
      if (runningStep) {
        runningStep.output = runningStep.output ?
          runningStep.output + ' ' + content :
          content;
        this.executionSteps.set([...steps]);
      }
    }
  }

  /**
   * Load real agent definitions from backend
   */
  private async loadAvailableAgents() {
    try {
      const agents = await this.showcaseApi.getAvailableAgents().toPromise();
      if (agents) {
        this.availableAgents.set(agents);
        console.log('🤖 Loaded real agents:', agents.length);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
      // Fallback to mock agents if API fails
      this.availableAgents.set([
        {
          id: 'demo-showcase',
          name: 'Demo Showcase Agent',
          description: 'Basic demonstration capabilities',
          tools: ['analysis', 'formatting'],
          capabilities: ['analysis'],
          priority: 'medium',
          executionTime: 'fast',
          outputFormat: 'brief',
          systemPrompt: 'Demo agent for basic showcasing',
          metadata: {
            version: '1.0.0',
            category: 'demo',
            complexity: 'basic',
            showcaseLevel: 'basic',
            decoratorsUsed: ['@Agent'],
            enterpriseFeatures: []
          }
        },
        {
          id: 'advanced-showcase',
          name: 'Advanced Showcase Agent',
          description: 'Enterprise-grade capabilities with full decorator ecosystem',
          tools: ['advanced-analyzer', 'content-generator', 'quality-assessor'],
          capabilities: ['analysis', 'generation', 'streaming', 'approval', 'monitoring'],
          priority: 'high',
          executionTime: 'slow',
          outputFormat: 'comprehensive',
          systemPrompt: 'Advanced agent showcasing complete decorator system',
          metadata: {
            version: '2.0.0',
            category: 'enterprise-demonstration',
            complexity: 'advanced',
            showcaseLevel: 'ultimate',
            decoratorsUsed: ['@Agent', '@StreamToken', '@StreamEvent', '@RequiresApproval'],
            enterpriseFeatures: ['real-time-streaming', 'human-in-loop', 'advanced-monitoring']
          }
        }
      ]);
    }
  }

  /**
   * Initialize service coordination display
   */
  private initializeServiceCoordination() {
    const services: ServiceCoordination[] = [
      {
        id: 'analysis-service',
        name: 'Analysis Service',
        description: 'Sophisticated data analysis and GitHub repository insights',
        status: 'idle',
        progress: 0,
        executionOrder: 1
      },
      {
        id: 'content-service', 
        name: 'Content Service',
        description: 'AI-powered content generation and multi-platform optimization',
        status: 'idle',
        progress: 0,
        executionOrder: 2
      },
      {
        id: 'quality-service',
        name: 'Quality Service',
        description: 'Quality assurance and content validation',
        status: 'idle',
        progress: 0,
        executionOrder: 3
      },
      {
        id: 'network-service',
        name: 'Network Service',
        description: 'Agent coordination and network topology management',
        status: 'idle',
        progress: 0,
        executionOrder: 4
      }
    ];
    this.serviceCoordination.set(services);
  }

  /**
   * Toggle agent selection for multi-agent scenarios
   */
  toggleAgentSelection(agentId: string) {
    const selected = this.selectedAgents();
    if (selected.includes(agentId)) {
      this.selectedAgents.set(selected.filter(id => id !== agentId));
    } else {
      this.selectedAgents.set([...selected, agentId]);
    }
  }

  /**
   * Get agent selection status
   */
  isAgentSelected(agentId: string): boolean {
    return this.selectedAgents().includes(agentId);
  }

  /**
   * Toggle search demonstration section
   */
  toggleSearchSection() {
    this.showSearchSection.update(show => !show);
  }

  /**
   * Execute Tavily search demonstration
   */
  async executeSearchDemo() {
    if (!this.searchQuery.trim()) return;

    const demo: SearchDemonstration = {
      type: this.searchType,
      query: this.searchQuery,
      isLoading: true
    };
    this.searchDemonstration.set(demo);

    try {
      let results;
      switch (this.searchType) {
        case 'web':
          results = await this.showcaseApi.searchWeb(this.searchQuery, 5, 'advanced').toPromise();
          break;
        case 'news':
          results = await this.showcaseApi.searchNews(
            this.searchQuery, 
            this.newsTimeframe, 
            this.newsCategory, 
            8
          ).toPromise();
          break;
        case 'research':
          results = await this.showcaseApi.searchResearch(
            this.searchQuery,
            this.researchDepth,
            5,
            true
          ).toPromise();
          break;
      }

      this.searchDemonstration.update(demo => ({
        ...demo!,
        results,
        isLoading: false
      }));
    } catch (error) {
      this.searchDemonstration.update(demo => ({
        ...demo!,
        error: (error as Error).message,
        isLoading: false
      }));
    }
  }

  /**
   * Get search button text based on type and loading state
   */
  getSearchButtonText(): string {
    const demo = this.searchDemonstration();
    if (demo?.isLoading) {
      return 'Searching...';
    }
    
    const typeText = {
      web: 'Web Search',
      news: 'News Search', 
      research: 'Research Search'
    };
    
    return `Execute ${typeText[this.searchType]}`;
  }

  /**
   * Update service coordination status during execution
   */
  private updateServiceStatus(serviceId: string, status: ServiceCoordination['status'], progress = 0) {
    this.serviceCoordination.update(services => 
      services.map(service => 
        service.id === serviceId 
          ? { ...service, status, progress }
          : service
      )
    );
  }
}
