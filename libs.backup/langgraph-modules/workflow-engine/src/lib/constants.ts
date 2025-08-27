export const WORKFLOW_ENGINE_CONSTANTS = {
  MAX_CACHE_SIZE: 100,
  CACHE_TTL: 3600000, // 1 hour
  DEFAULT_TIMEOUT: 30000,
};

export enum WorkflowCommandType {
  GOTO = 'goto',
  UPDATE = 'update',
  END = 'end',
  ERROR = 'error',
  RETRY = 'retry',
  SKIP = 'skip',
  STOP = 'stop',
}
