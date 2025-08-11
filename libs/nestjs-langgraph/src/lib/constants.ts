// Module tokens
export const LANGGRAPH_MODULE_OPTIONS = 'LANGGRAPH_MODULE_OPTIONS';
export const LANGGRAPH_MODULE_ID = 'LANGGRAPH_MODULE_ID';

// Provider tokens
export const DEFAULT_LLM = 'DEFAULT_LLM';
export const LLM_PROVIDER_PREFIX = 'LLM_PROVIDER_';
export const TOOL_REGISTRY = 'TOOL_REGISTRY';
export const WORKFLOW_REGISTRY = 'WORKFLOW_REGISTRY';
export const CHECKPOINT_SAVER = 'CHECKPOINT_SAVER';
export const STREAM_MANAGER = 'STREAM_MANAGER';
export const HITL_MANAGER = 'HITL_MANAGER';

// Decorator metadata keys
export const WORKFLOW_METADATA = 'langgraph:workflow';
export const NODE_METADATA = 'langgraph:node';
export const EDGE_METADATA = 'langgraph:edge';
export const TOOL_METADATA = 'langgraph:tool';
export const STREAM_METADATA = 'langgraph:stream';
export const APPROVAL_METADATA = 'langgraph:approval';
export const STATE_CHANNEL_METADATA = 'langgraph:state_channel';

// Event names
export const WORKFLOW_EVENTS = {
  // Workflow lifecycle
  WORKFLOW_STARTED: 'workflow.started',
  WORKFLOW_COMPLETED: 'workflow.completed',
  WORKFLOW_FAILED: 'workflow.failed',
  WORKFLOW_CANCELLED: 'workflow.cancelled',
  WORKFLOW_PAUSED: 'workflow.paused',
  WORKFLOW_RESUMED: 'workflow.resumed',

  // Node lifecycle
  NODE_STARTED: 'node.started',
  NODE_COMPLETED: 'node.completed',
  NODE_FAILED: 'node.failed',
  NODE_RETRYING: 'node.retrying',
  NODE_SKIPPED: 'node.skipped',

  // Tool execution
  TOOL_STARTED: 'tool.started',
  TOOL_COMPLETED: 'tool.completed',
  TOOL_FAILED: 'tool.failed',
  TOOL_PROGRESS: 'tool.progress',

  // Streaming
  STREAM_START: 'stream.start',
  STREAM_DATA: 'stream.data',
  STREAM_END: 'stream.end',
  STREAM_ERROR: 'stream.error',
  TOKEN_RECEIVED: 'stream.token',

  // Human-in-the-loop
  APPROVAL_REQUESTED: 'hitl.approval_requested',
  APPROVAL_RECEIVED: 'hitl.approval_received',
  APPROVAL_TIMEOUT: 'hitl.approval_timeout',
  FEEDBACK_RECEIVED: 'hitl.feedback_received',

  // Progress and milestones
  PROGRESS_UPDATE: 'progress.update',
  MILESTONE_REACHED: 'milestone.reached',
  CHECKPOINT_CREATED: 'checkpoint.created',
  CHECKPOINT_RESTORED: 'checkpoint.restored',
} as const;

// Stream event types
export enum StreamEventType {
  VALUES = 'values',
  UPDATES = 'updates',
  MESSAGES = 'messages',
  EVENTS = 'events',
  DEBUG = 'debug',
  FINAL = 'final',
  ERROR = 'error',
  TOKEN = 'token',
  NODE_START = 'node_start',
  NODE_COMPLETE = 'node_complete',
  TOOL_START = 'tool_start',
  TOOL_COMPLETE = 'tool_complete',
  MILESTONE = 'milestone',
  PROGRESS = 'progress',
}

// Default configuration values
export const DEFAULT_CONFIG = {
  // Streaming
  STREAM_BUFFER_SIZE: 100,
  STREAM_BATCH_SIZE: 10,
  TOKEN_BUFFER_SIZE: 50,

  // Human-in-the-loop
  HITL_TIMEOUT: 3600000, // 1 hour
  CONFIDENCE_THRESHOLD: 0.7,
  AUTO_APPROVE_THRESHOLD: 0.95,

  // Workflow
  WORKFLOW_TIMEOUT: 600000, // 10 minutes
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  CACHE_TTL: 3600000, // 1 hour
  MAX_CACHED_WORKFLOWS: 100,

  // Performance
  MAX_CONCURRENT_WORKFLOWS: 10,
  QUEUE_MAX_SIZE: 1000,
  CIRCUIT_BREAKER_THRESHOLD: 5,
  CIRCUIT_BREAKER_RESET_TIMEOUT: 60000, // 1 minute

  // Tools
  TOOL_TIMEOUT: 30000, // 30 seconds
  TOOL_VALIDATION_STRICT: false,

  // Observability
  SAMPLING_RATE: 1.0,
  LOG_LEVEL: 'info',
} as const;

// Error codes
export enum ErrorCode {
  // Workflow errors
  WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
  WORKFLOW_TIMEOUT = 'WORKFLOW_TIMEOUT',
  WORKFLOW_CANCELLED = 'WORKFLOW_CANCELLED',
  WORKFLOW_FAILED = 'WORKFLOW_FAILED',

  // Node errors
  NODE_NOT_FOUND = 'NODE_NOT_FOUND',
  NODE_EXECUTION_FAILED = 'NODE_EXECUTION_FAILED',
  NODE_TIMEOUT = 'NODE_TIMEOUT',
  NODE_VALIDATION_FAILED = 'NODE_VALIDATION_FAILED',

  // Tool errors
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  TOOL_VALIDATION_FAILED = 'TOOL_VALIDATION_FAILED',
  TOOL_TIMEOUT = 'TOOL_TIMEOUT',

  // Stream errors
  STREAM_ERROR = 'STREAM_ERROR',
  STREAM_TIMEOUT = 'STREAM_TIMEOUT',
  STREAM_BUFFER_OVERFLOW = 'STREAM_BUFFER_OVERFLOW',

  // HITL errors
  APPROVAL_TIMEOUT = 'APPROVAL_TIMEOUT',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',
  INVALID_FEEDBACK = 'INVALID_FEEDBACK',

  // Configuration errors
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  PROVIDER_NOT_CONFIGURED = 'PROVIDER_NOT_CONFIGURED',
  INVALID_PROVIDER_TYPE = 'INVALID_PROVIDER_TYPE',

  // Runtime errors
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
  QUEUE_FULL = 'QUEUE_FULL',
  CONCURRENT_LIMIT_EXCEEDED = 'CONCURRENT_LIMIT_EXCEEDED',
}

// Command types
export enum CommandType {
  GOTO = 'goto',
  UPDATE = 'update',
  END = 'end',
  ERROR = 'error',
  RETRY = 'retry',
}

// Workflow status
export enum WorkflowStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Node status
export enum NodeStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  RETRYING = 'retrying',
}

// Risk levels
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Priority levels
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}