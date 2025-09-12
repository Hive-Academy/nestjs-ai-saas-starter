import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { WebSocketService } from './websocket.service';
import {
  AgentState,
  AgentUpdateMessage,
  MemoryUpdateMessage,
  ToolExecutionMessage,
  MemoryContext,
  ToolExecution,
} from '../interfaces/agent-state.interface';

export interface AgentCommand {
  type: 'switch_agent' | 'execute_tool' | 'pause_workflow' | 'resume_workflow';
  agentId?: string;
  toolName?: string;
  workflowId?: string;
  parameters?: Record<string, unknown>;
}

/**
 * Agent Communication Service
 * Manages real-time agent state updates and command execution
 * Integrates with the DevBrand Chat Studio backend
 */
@Injectable({
  providedIn: 'root',
})
export class AgentCommunicationService {
  private readonly websocketService = inject(WebSocketService);

  // Agent state management
  private readonly agents = signal<Record<string, AgentState>>({});
  private readonly activeAgentId = signal<string | null>(null);
  private readonly memoryContexts = signal<MemoryContext[]>([]);
  private readonly toolExecutions = signal<Record<string, ToolExecution[]>>({});

  // Public reactive state
  readonly agentStates = this.agents.asReadonly();
  readonly activeAgent = computed(() => {
    const agentId = this.activeAgentId();
    return agentId ? this.agents()[agentId] : null;
  });
  readonly availableAgents = computed(() => Object.values(this.agents()));
  readonly activeMemoryContexts = this.memoryContexts.asReadonly();
  readonly isConnected = this.websocketService.isConnected;

  // Streams for specific message types
  readonly agentUpdates$: Observable<AgentState> = this.websocketService
    .getMessagesByType<AgentUpdateMessage>('agent_update')
    .pipe(
      map((message) => {
        const { agentId, state } = message.data;
        return this.updateAgentState(agentId, state);
      })
    );

  readonly memoryUpdates$: Observable<MemoryContext[]> = this.websocketService
    .getMessagesByType<MemoryUpdateMessage>('memory_update')
    .pipe(
      map((message) => {
        this.updateMemoryContexts(message.data);
        return this.memoryContexts();
      })
    );

  readonly toolExecutions$: Observable<ToolExecution> = this.websocketService
    .getMessagesByType<ToolExecutionMessage>('tool_execution')
    .pipe(
      map((message) => {
        this.updateToolExecution(
          message.data.agentId,
          message.data.toolExecution
        );
        return message.data.toolExecution;
      })
    );

  constructor() {
    this.initializeSubscriptions();
    this.subscribeToDevBrandWebSocketEvents();
  }

  /**
   * Connect to agent communication system
   */
  connect(): void {
    this.websocketService.connect();

    // Subscribe to agent-constellation room for real TASK_API_001 updates
    this.subscribeToAgentConstellation();
  }

  /**
   * Disconnect from agent communication system
   */
  disconnect(): void {
    this.websocketService.disconnect();
  }

  /**
   * Send command to agent system
   */
  sendCommand(command: AgentCommand): void {
    this.websocketService.send({
      type: 'agent_command',
      timestamp: new Date(),
      data: command,
    });
  }

  /**
   * Switch to a different agent
   */
  switchAgent(agentId: string): void {
    if (this.agents()[agentId]) {
      this.activeAgentId.set(agentId);
      this.sendCommand({
        type: 'switch_agent',
        agentId,
      });
    } else {
      console.warn(`Agent ${agentId} not found`);
    }
  }

  /**
   * Execute a tool with the current agent
   */
  executeTool(toolName: string, parameters?: Record<string, unknown>): void {
    const activeAgent = this.activeAgent();
    if (!activeAgent) {
      console.warn('No active agent to execute tool');
      return;
    }

    this.sendCommand({
      type: 'execute_tool',
      agentId: activeAgent.id,
      toolName,
      parameters,
    });
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentState | null {
    return this.agents()[agentId] || null;
  }

  /**
   * Get agents by type
   */
  getAgentsByType(type: AgentState['type']): AgentState[] {
    return Object.values(this.agents()).filter((agent) => agent.type === type);
  }

  /**
   * Get active memory contexts with relevance threshold
   */
  getActiveMemoryContexts(minRelevance = 0.3): MemoryContext[] {
    return this.memoryContexts().filter(
      (context) => context.isActive && context.relevanceScore >= minRelevance
    );
  }

  /**
   * Get tool executions for agent
   */
  getAgentToolExecutions(agentId: string): ToolExecution[] {
    return this.toolExecutions()[agentId] || [];
  }

  /**
   * Initialize message subscriptions
   */
  private initializeSubscriptions(): void {
    // Subscribe to all relevant streams to keep state updated
    this.agentUpdates$.subscribe();
    this.memoryUpdates$.subscribe();
    this.toolExecutions$.subscribe();
  }

  /**
   * Update agent state
   */
  private updateAgentState(
    agentId: string,
    partialState: Partial<AgentState>
  ): AgentState {
    const currentAgents = this.agents();
    const currentAgent = currentAgents[agentId];

    const updatedAgent: AgentState = currentAgent
      ? { ...currentAgent, ...partialState }
      : this.createDefaultAgent(agentId, partialState);

    this.agents.set({
      ...currentAgents,
      [agentId]: updatedAgent,
    });

    return updatedAgent;
  }

  /**
   * Create default agent state
   */
  private createDefaultAgent(
    agentId: string,
    partialState: Partial<AgentState>
  ): AgentState {
    return {
      id: agentId,
      name: partialState.name || `Agent ${agentId}`,
      type: partialState.type || 'specialist',
      status: partialState.status || 'idle',
      position: partialState.position || { x: 0, y: 0, z: 0 },
      capabilities: partialState.capabilities || [],
      isActive: partialState.isActive || false,
      lastActiveTime: partialState.lastActiveTime || new Date(),
      currentTools: partialState.currentTools || [],
      personality: partialState.personality || {
        color: '#3B82F6',
        description: 'AI Assistant',
      },
      ...partialState,
    };
  }

  /**
   * Update memory contexts
   */
  private updateMemoryContexts(data: MemoryUpdateMessage['data']): void {
    const currentContexts = this.memoryContexts();

    switch (data.operation) {
      case 'add':
        this.memoryContexts.set([...currentContexts, ...data.contexts]);
        break;
      case 'update':
        this.memoryContexts.set(
          currentContexts.map((context) => {
            const update = data.contexts.find((c) => c.id === context.id);
            return update ? { ...context, ...update } : context;
          })
        );
        break;
      case 'remove': {
        const idsToRemove = new Set(data.contexts.map((c) => c.id));
        this.memoryContexts.set(
          currentContexts.filter((context) => !idsToRemove.has(context.id))
        );
        break;
      }
      case 'activate':
      case 'deactivate': {
        const activeState = data.operation === 'activate';
        const idsToToggle = new Set(data.contexts.map((c) => c.id));
        this.memoryContexts.set(
          currentContexts.map((context) =>
            idsToToggle.has(context.id)
              ? { ...context, isActive: activeState }
              : context
          )
        );
        break;
      }
    }
  }

  /**
   * Update tool execution state
   */
  private updateToolExecution(
    agentId: string,
    toolExecution: ToolExecution
  ): void {
    const currentExecutions = this.toolExecutions();
    const agentExecutions = currentExecutions[agentId] || [];

    const existingIndex = agentExecutions.findIndex(
      (exec) => exec.id === toolExecution.id
    );

    let updatedExecutions: ToolExecution[];
    if (existingIndex >= 0) {
      updatedExecutions = [...agentExecutions];
      updatedExecutions[existingIndex] = toolExecution;
    } else {
      updatedExecutions = [...agentExecutions, toolExecution];
    }

    this.toolExecutions.set({
      ...currentExecutions,
      [agentId]: updatedExecutions,
    });
  }

  /**
   * Subscribe to real TASK_API_001 DevBrand WebSocket events
   */
  private subscribeToDevBrandWebSocketEvents(): void {
    // Subscribe to agent constellation data (real TASK_API_001 agents)
    this.websocketService
      .getMessagesByType<{
        type: 'agent-constellation-data';
        data: {
          agents: Array<{
            id: string;
            name: string;
            status: 'idle' | 'active' | 'processing' | 'error';
            capabilities: string[];
            healthy: boolean;
            lastActivity?: string;
          }>;
          networkStats: {
            totalAgents: number;
            activeAgents: number;
            averageResponseTime: number;
          };
        };
      }>('agent-constellation-data')
      .subscribe((message) => {
        this.handleDevBrandAgentData(message.data);
      });

    // Subscribe to agent switch events (real agent coordination)
    this.websocketService
      .getMessagesByType<{
        type: 'agent-switch';
        data: {
          fromAgent: string | null;
          toAgent: string;
          capabilities: string[];
        };
      }>('agent-switch')
      .subscribe((message) => {
        this.handleDevBrandAgentSwitch(message.data);
      });

    // Subscribe to memory access events (real ChromaDB/Neo4j operations)
    this.websocketService
      .getMessagesByType<{
        type: 'memory-access';
        data: {
          memoryType: 'chromadb' | 'neo4j' | 'workflow';
          query: string;
          results: unknown[];
        };
      }>('memory-access')
      .subscribe((message) => {
        this.handleDevBrandMemoryAccess(message.data);
      });

    // Subscribe to workflow progress (real tool execution from TASK_API_001)
    this.websocketService
      .getMessagesByType<{
        type: 'workflow-progress';
        data: {
          stepNumber: number;
          currentAgent: string;
          agentCapabilities: string[];
          messages: Array<{
            content: string;
            type: string;
            timestamp: string;
          }>;
          metadata?: {
            memoryAccess?: {
              type: 'chromadb' | 'neo4j' | 'workflow';
              query: string;
              results: unknown[];
            };
            toolExecution?: {
              toolName: string;
              status: 'pending' | 'running' | 'completed' | 'error';
              progress: number;
            };
          };
        };
      }>('workflow-progress')
      .subscribe((message) => {
        this.handleDevBrandWorkflowProgress(message.data);
      });
  }

  /**
   * Handle real TASK_API_001 agent data
   */
  private handleDevBrandAgentData(data: {
    agents: Array<{
      id: string;
      name: string;
      status: 'idle' | 'active' | 'processing' | 'error';
      capabilities: string[];
      healthy: boolean;
      lastActivity?: string;
    }>;
    networkStats: {
      totalAgents: number;
      activeAgents: number;
      averageResponseTime: number;
    };
  }): void {
    // Map real TASK_API_001 agents to our 3D constellation format
    data.agents.forEach((backendAgent) => {
      const mappedAgent =
        this.mapDevBrandAgentToConstellationAgent(backendAgent);
      this.updateAgentState(mappedAgent.id, mappedAgent);
    });
  }

  /**
   * Map TASK_API_001 backend agent to 3D constellation format
   */
  private mapDevBrandAgentToConstellationAgent(backendAgent: {
    id: string;
    name: string;
    status: 'idle' | 'active' | 'processing' | 'error';
    capabilities: string[];
    healthy: boolean;
    lastActivity?: string;
  }): Partial<AgentState> {
    // Map backend agent types to constellation types
    const agentTypeMapping: Record<string, AgentState['type']> = {
      'github-analyzer': 'analyst',
      'content-creator': 'creator',
      'brand-strategist': 'strategist',
      supervisor: 'coordinator',
    };

    // Map backend status to constellation status
    const statusMapping: Record<string, AgentState['status']> = {
      idle: 'idle',
      active: 'thinking',
      processing: 'executing',
      error: 'error',
    };

    // Generate constellation position based on agent type
    const position = this.generateConstellationPosition(
      backendAgent.id,
      agentTypeMapping[backendAgent.id] || 'specialist'
    );

    return {
      id: backendAgent.id,
      name: backendAgent.name,
      type: agentTypeMapping[backendAgent.id] || 'specialist',
      status: statusMapping[backendAgent.status] || 'idle',
      position,
      capabilities: backendAgent.capabilities,
      isActive:
        backendAgent.status === 'active' ||
        backendAgent.status === 'processing',
      lastActiveTime: backendAgent.lastActivity
        ? new Date(backendAgent.lastActivity)
        : new Date(),
      currentTools: [],
      personality: this.getAgentPersonality(backendAgent.id),
    };
  }

  /**
   * Generate constellation position based on agent type
   */
  private generateConstellationPosition(
    agentId: string,
    type: AgentState['type']
  ): { x: number; y: number; z: number } {
    // Constellation layout: coordinator at center, others in orbits
    switch (type) {
      case 'coordinator':
        return { x: 0, y: 0, z: 0 };
      case 'analyst':
        return { x: -8, y: 2, z: -3 };
      case 'creator':
        return { x: 8, y: -2, z: 3 };
      case 'strategist':
        return { x: 0, y: 8, z: -2 };
      default: {
        // Specialist agents in outer orbit
        const angle = (agentId.charCodeAt(0) % 8) * (Math.PI / 4);
        return {
          x: Math.cos(angle) * 12,
          y: Math.sin(angle) * 12,
          z: (agentId.charCodeAt(1) % 5) - 2,
        };
      }
    }
  }

  /**
   * Get agent personality based on TASK_API_001 agent type
   */
  private getAgentPersonality(agentId: string): {
    color: string;
    description: string;
  } {
    const personalityMapping: Record<
      string,
      { color: string; description: string }
    > = {
      'github-analyzer': {
        color: '#10B981', // Green for data analysis
        description:
          'GitHub Repository Analyzer - Extracts technical achievements and skills',
      },
      'content-creator': {
        color: '#8B5CF6', // Purple for creativity
        description: 'Content Creator - Generates compelling brand narratives',
      },
      'brand-strategist': {
        color: '#F59E0B', // Amber for strategy
        description:
          'Brand Strategist - Develops comprehensive brand positioning',
      },
      supervisor: {
        color: '#3B82F6', // Blue for coordination
        description: 'Supervisor Agent - Coordinates multi-agent workflows',
      },
    };

    return (
      personalityMapping[agentId] || {
        color: '#6B7280',
        description: 'DevBrand AI Agent',
      }
    );
  }

  /**
   * Handle real agent switching from TASK_API_001
   */
  private handleDevBrandAgentSwitch(data: {
    fromAgent: string | null;
    toAgent: string;
    capabilities: string[];
  }): void {
    // Update active agent
    this.activeAgentId.set(data.toAgent);

    // Update agent status to active
    this.updateAgentState(data.toAgent, {
      status: 'thinking',
      isActive: true,
      lastActiveTime: new Date(),
      capabilities: data.capabilities,
    });

    // Set previous agent to idle
    if (data.fromAgent) {
      this.updateAgentState(data.fromAgent, {
        status: 'idle',
        isActive: false,
      });
    }
  }

  /**
   * Handle real memory access from TASK_API_001 (ChromaDB/Neo4j)
   */
  private handleDevBrandMemoryAccess(data: {
    memoryType: 'chromadb' | 'neo4j' | 'workflow';
    query: string;
    results: unknown[];
  }): void {
    // Create memory context from real backend data
    const memoryContext: MemoryContext = {
      id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: `Memory access: ${data.query}`,
      source: data.memoryType,
      relevanceScore: Math.min(data.results.length * 0.1, 1.0),
      isActive: true,
      relatedAgents: [this.activeAgentId() || 'supervisor'],
      lastAccessed: new Date(),
      metadata: {
        query: data.query,
        resultCount: data.results.length,
        memoryType: data.memoryType,
      },
    };

    // Update memory contexts
    const currentContexts = this.memoryContexts();
    this.memoryContexts.set([...currentContexts, memoryContext]);
  }

  /**
   * Handle real workflow progress from TASK_API_001
   */
  private handleDevBrandWorkflowProgress(data: {
    stepNumber: number;
    currentAgent: string;
    agentCapabilities: string[];
    messages: Array<{
      content: string;
      type: string;
      timestamp: string;
    }>;
    metadata?: {
      memoryAccess?: {
        type: 'chromadb' | 'neo4j' | 'workflow';
        query: string;
        results: unknown[];
      };
      toolExecution?: {
        toolName: string;
        status: 'pending' | 'running' | 'completed' | 'error';
        progress: number;
      };
    };
  }): void {
    // Update current agent status
    this.updateAgentState(data.currentAgent, {
      status: 'executing',
      isActive: true,
      lastActiveTime: new Date(),
      capabilities: data.agentCapabilities,
    });

    // Handle tool execution if present
    if (data.metadata?.toolExecution) {
      const toolExecution: ToolExecution = {
        id: `tool_${data.currentAgent}_${Date.now()}`,
        toolName: data.metadata.toolExecution.toolName,
        status: data.metadata.toolExecution.status,
        progress: data.metadata.toolExecution.progress,
        startTime: new Date(),
        parameters: {},
        result:
          data.metadata.toolExecution.status === 'completed'
            ? { success: true }
            : undefined,
      };

      this.updateToolExecution(data.currentAgent, toolExecution);
    }

    // Handle memory access if present
    if (data.metadata?.memoryAccess) {
      this.handleDevBrandMemoryAccess(data.metadata.memoryAccess);
    }
  }

  /**
   * Subscribe to agent constellation room for real TASK_API_001 updates
   */
  private subscribeToAgentConstellation(): void {
    // Subscribe to the agent-constellation room
    this.websocketService.send({
      type: 'subscribe-to-room',
      timestamp: new Date(),
      data: {
        room: 'agent-constellation',
        userId: 'user_dev', // Could be made configurable
      },
    });

    // Request initial agent status
    this.websocketService.send({
      type: 'get-agent-status',
      timestamp: new Date(),
      data: {},
    });
  }
}
