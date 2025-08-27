export const STREAMING_CONSTANTS = {
  DEFAULT_BUFFER_SIZE: 50,
  DEFAULT_FLUSH_INTERVAL: 200,
  MAX_BUFFER_SIZE: 1000,
};

export enum StreamEventType {
  // Workflow lifecycle events
  WORKFLOW_START = 'workflow:start',
  WORKFLOW_END = 'workflow:end',
  WORKFLOW_ERROR = 'workflow:error',

  // Node events
  NODE_START = 'node:start',
  NODE_END = 'node:end',
  NODE_ERROR = 'node:error',
  NODE_COMPLETE = 'node:complete',

  // Stream data types
  VALUES = 'values',
  UPDATES = 'updates',
  MESSAGES = 'messages',
  EVENTS = 'events',
  DEBUG = 'debug',
  FINAL = 'final',

  // Progress events
  PROGRESS = 'progress',
  MILESTONE = 'milestone',

  // Token events
  TOKEN = 'token',

  // Error events
  ERROR = 'error',

  // Custom events
  CUSTOM = 'custom',
}
