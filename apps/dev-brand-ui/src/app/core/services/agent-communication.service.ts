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
  }

  /**
   * Connect to agent communication system
   */
  connect(): void {
    this.websocketService.connect();
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
}
