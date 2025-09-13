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
  parameters?: Record<string, unknown>;
  result?: Record<string, unknown>;
}

export interface AgentState {
  id: string;
  name: string;
  type: 'coordinator' | 'specialist' | 'analyst' | 'creator' | 'strategist';
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
  lastAccessed?: Date;
  metadata?: Record<string, unknown>;
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

// Enhanced WebSocket Message Types for Gateway Integration
export enum WebSocketMessageType {
  // Client → Server messages
  SUBSCRIBE_EXECUTION = 'subscribe_execution',
  UNSUBSCRIBE_EXECUTION = 'unsubscribe_execution',
  SUBSCRIBE_EVENTS = 'subscribe_events',
  UNSUBSCRIBE_EVENTS = 'unsubscribe_events',
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  GET_STATUS = 'get_status',
  PING = 'ping',
  AUTHENTICATION = 'authentication',

  // Server → Client messages
  STREAM_UPDATE = 'stream_update',
  EXECUTION_STATUS = 'execution_status',
  CONNECTION_STATUS = 'connection_status',
  ERROR = 'error',
  PONG = 'pong',

  // Legacy message types for backward compatibility
  AGENT_UPDATE = 'agent_update',
  MEMORY_UPDATE = 'memory_update',
  WORKFLOW_UPDATE = 'workflow_update',
  TOOL_EXECUTION = 'tool_execution',
  SYSTEM_STATUS = 'system_status',
  AGENT_CONSTELLATION_DATA = 'agent-constellation-data',
  AGENT_SWITCH = 'agent-switch',
  MEMORY_ACCESS = 'memory-access',
  WORKFLOW_PROGRESS = 'workflow-progress',
}

// Enhanced WebSocket message structure
export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType | string;
  id?: string;
  data: T;
  metadata?: {
    timestamp: Date;
    source?: string;
    priority?: 'low' | 'medium' | 'high';
    retryCount?: number;
  };
  // Legacy support
  timestamp?: Date;
}

// Gateway-specific message payloads
export interface SubscribeExecutionPayload {
  executionId: string;
  eventTypes?: string[];
  options?: {
    includeHistory?: boolean;
    bufferSize?: number;
  };
}

export interface JoinRoomPayload {
  roomId: string;
  options?: {
    requireAuth?: boolean;
    metadata?: Record<string, any>;
  };
}

export interface ConnectionStatusPayload {
  status: 'connected' | 'authenticated' | 'error' | 'disconnected';
  connection?: {
    id: string;
    serverTime: Date;
    subscriptionsCount: number;
    uptime: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface StreamUpdatePayload {
  update: {
    type: string;
    data: any;
    metadata?: {
      timestamp: Date;
      sequenceNumber: number;
      executionId: string;
      nodeId?: string;
      agentType?: string;
    };
  };
}

export interface ErrorPayload {
  code: string;
  message: string;
  category:
    | 'authentication'
    | 'authorization'
    | 'validation'
    | 'connection'
    | 'internal';
  details?: any;
  actions?: Array<{
    type: 'retry' | 'reconnect' | 'authenticate' | 'contact_support';
    description: string;
    metadata?: Record<string, any>;
  }>;
}

// Legacy message interfaces for backward compatibility
export interface AgentUpdateMessage extends WebSocketMessage {
  type: WebSocketMessageType.AGENT_UPDATE;
  data: {
    agentId: string;
    state: Partial<AgentState>;
  };
}

export interface MemoryUpdateMessage extends WebSocketMessage {
  type: WebSocketMessageType.MEMORY_UPDATE;
  data: {
    contexts: MemoryContext[];
    operation: 'add' | 'update' | 'remove' | 'activate' | 'deactivate';
  };
}

export interface ToolExecutionMessage extends WebSocketMessage {
  type: WebSocketMessageType.TOOL_EXECUTION;
  data: {
    agentId: string;
    toolExecution: ToolExecution;
  };
}

// DevBrand-specific WebSocket message interfaces
export interface AgentConstellationDataMessage extends WebSocketMessage {
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
}

export interface AgentSwitchMessage extends WebSocketMessage {
  type: 'agent-switch';
  data: {
    fromAgent: string | null;
    toAgent: string;
    capabilities: string[];
  };
}

export interface MemoryAccessMessage extends WebSocketMessage {
  type: 'memory-access';
  data: {
    memoryType: 'chromadb' | 'neo4j' | 'workflow';
    query: string;
    results: unknown[];
  };
}

export interface WorkflowProgressMessage extends WebSocketMessage {
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
}
