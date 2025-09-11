/**
 * Agent State Interfaces for real-time multi-agent coordination
 * Supports the DevBrand Chat Studio MVP vision
 */

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'executing'
  | 'waiting'
  | 'error';
export type InterfaceMode = 'chat' | 'spatial' | 'canvas' | 'memory' | 'forge';
export type ToolExecutionStatus = 'pending' | 'running' | 'completed' | 'error';

export interface AgentPosition {
  x: number;
  y: number;
  z?: number; // For 3D spatial interface
}

export interface ToolExecution {
  id: string;
  toolName: string;
  status: ToolExecutionStatus;
  progress: number; // 0-100
  startTime: Date;
  endTime?: Date;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: string;
}

export interface AgentState {
  id: string;
  name: string;
  type: 'coordinator' | 'specialist' | 'analyst' | 'creator';
  status: AgentStatus;
  currentTask?: string;
  position: AgentPosition;
  capabilities: string[];
  isActive: boolean;
  lastActiveTime: Date;
  currentTools: ToolExecution[];
  personality: {
    color: string;
    avatar?: string;
    description: string;
  };
  // Optional performance metrics
  lastResponse?: {
    responseTime: number;
    timestamp: Date;
  };
  memoryUsage?: {
    current: number;
    peak: number;
    unit: 'MB' | 'GB';
  };
  connectedAt?: Date;
}

export interface MemoryContext {
  id: string;
  type: 'episodic' | 'semantic' | 'procedural' | 'working';
  content: string;
  relevanceScore: number; // 0-1
  isActive: boolean;
  timestamp: Date;
  source: 'chromadb' | 'neo4j' | 'workflow';
  tags: string[];
  relatedAgents: string[];
}

export interface WorkflowState {
  id: string;
  name: string;
  status: 'planning' | 'executing' | 'completed' | 'error';
  currentStep: number;
  totalSteps: number;
  activeAgents: string[];
  memoryContexts: MemoryContext[];
  startTime: Date;
  estimatedCompletion?: Date;
}

export interface InterfaceModeState {
  currentMode: InterfaceMode;
  previousMode?: InterfaceMode;
  transitionProgress: number; // 0-1
  isTransitioning: boolean;
  availableModes: InterfaceMode[];
}

export interface DevBrandState {
  agents: Record<string, AgentState>;
  workflows: Record<string, WorkflowState>;
  interfaceMode: InterfaceModeState;
  activeMemoryContexts: MemoryContext[];
  systemStatus: {
    websocketConnected: boolean;
    lastUpdate: Date;
    errorCount: number;
  };
}

// WebSocket Message Types
export interface WebSocketMessage {
  type:
    | 'agent_update'
    | 'memory_update'
    | 'workflow_update'
    | 'tool_execution'
    | 'system_status';
  timestamp: Date;
  data: unknown;
}

export interface AgentUpdateMessage extends WebSocketMessage {
  type: 'agent_update';
  data: {
    agentId: string;
    state: Partial<AgentState>;
  };
}

export interface MemoryUpdateMessage extends WebSocketMessage {
  type: 'memory_update';
  data: {
    contexts: MemoryContext[];
    operation: 'add' | 'update' | 'remove' | 'activate' | 'deactivate';
  };
}

export interface ToolExecutionMessage extends WebSocketMessage {
  type: 'tool_execution';
  data: {
    agentId: string;
    toolExecution: ToolExecution;
  };
}
