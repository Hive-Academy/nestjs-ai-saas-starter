import type {
  AgentConfig,
  WorkflowAgentConfig,
} from '@hive-academy/langgraph-multi-agent';
import type {
  EntrypointMetadata,
  TaskMetadata,
  NodeMetadata,
} from '@hive-academy/langgraph-functional-api';

/**
 * Type guard to check if config is AgentConfig
 */
export function isAgentConfig(
  config: AgentConfig | WorkflowAgentConfig
): config is AgentConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'id' in config &&
    'name' in config
  );
}

/**
 * Type guard to check if config is WorkflowAgentConfig
 */
export function isWorkflowAgentConfig(
  config: AgentConfig | WorkflowAgentConfig
): config is WorkflowAgentConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    !('id' in config) &&
    !('name' in config)
  );
}

/**
 * Type guard to check if metadata has an id property
 */
export function hasIdProperty(
  metadata: EntrypointMetadata | TaskMetadata
): metadata is
  | (EntrypointMetadata & { id: string })
  | (TaskMetadata & { id: string }) {
  return typeof metadata === 'object' && metadata !== null && 'id' in metadata;
}

/**
 * Type guard for EntrypointMetadata with id
 */
export function isEntrypointMetadataWithId(
  metadata: EntrypointMetadata
): metadata is EntrypointMetadata & { id: string } {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    'id' in metadata &&
    typeof (metadata as any).id === 'string'
  );
}

/**
 * Type guard for TaskMetadata with id
 */
export function isTaskMetadataWithId(
  metadata: TaskMetadata
): metadata is TaskMetadata & { id: string } {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    'id' in metadata &&
    typeof (metadata as any).id === 'string'
  );
}

/**
 * Type guard for NodeMetadata with id
 */
export function isNodeMetadataWithId(
  metadata: NodeMetadata
): metadata is NodeMetadata & { id: string } {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    'id' in metadata &&
    typeof (metadata as any).id === 'string'
  );
}

/**
 * Type guard to check if error is an Error object
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard to check if error has a message property
 */
export function hasErrorMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
}

/**
 * Safely get error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (hasErrorMessage(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

/**
 * Type guard to check if object has a 'type' property
 */
export function hasTypeProperty<T>(obj: T): obj is T & { type: unknown } {
  return typeof obj === 'object' && obj !== null && 'type' in obj;
}

/**
 * Type guard to check if agent config has type property and is specific type
 */
export function isAgentConfigWithType(
  config: AgentConfig | WorkflowAgentConfig,
  type: string
): config is AgentConfig & { type: string } {
  return (
    isAgentConfig(config) && hasTypeProperty(config) && config.type === type
  );
}
