/**
 * @hive-academy/langgraph-angular
 *
 * Angular integration library for LangGraph workflows.
 * Provides SSE streaming, workflow state management, token streaming,
 * generative UI, and HITL approval composables.
 */

export const LANGGRAPH_ANGULAR_VERSION = '0.0.1';

// =============================================================================
// Models & Configuration
// =============================================================================

export type {
  LangGraphConfig,
  ConnectionState,
} from './lib/models/config.model';
export {
  LANGGRAPH_CONFIG,
  DEFAULT_SSE_EVENT_TYPES,
} from './lib/models/config.model';

export type {
  ExecutionStatus,
  ExecutionState,
  AgentStatus,
  AgentProgress,
  BaseWorkflowState,
  HITLApproval,
} from './lib/models/workflow-state.model';
export { createInitialExecutionState } from './lib/models/workflow-state.model';

export {
  StreamEventType,
  StreamMetadataSchema,
  StreamUpdateSchema,
  TokenUpdateSchema,
  StreamErrorSchema,
  MessageStreamEventSchema,
  CustomStreamEventSchema,
  DebugStreamEventSchema,
  isWorkflowEvent,
  isNodeEvent,
  isProgressEvent,
  isTokenEvent,
  isErrorEvent,
  isStreamDataEvent,
  isAgentEvent,
  isAgentTypeEvent,
  hasNodeId,
  isMessageStreamEvent,
  isCustomStreamEvent,
  isDebugStreamEvent,
  parseNodeId,
} from './lib/models/stream-events.model';
export type {
  StreamMetadata,
  StreamUpdate,
  TokenUpdate,
  StreamError,
  DomainEvent,
  MessageStreamEvent,
  CustomStreamEvent,
  DebugStreamEvent,
} from './lib/models/stream-events.model';

// =============================================================================
// Services
// =============================================================================

export { LangGraphSseService } from './lib/services/langgraph-sse.service';
export { LangGraphWorkflowStateService } from './lib/services/langgraph-workflow-state.service';
export { LangGraphStreamingService } from './lib/services/langgraph-streaming.service';
export type { StreamingMessage } from './lib/services/langgraph-streaming.service';

// =============================================================================
// Generative UI
// =============================================================================

export type {
  GeneratedComponent,
  GenerativeUIState,
} from './lib/gen-ui/gen-ui.models';
export { GenerativeUIRegistry } from './lib/gen-ui/generative-ui-registry.service';
export { LangGraphGenerativeUIService } from './lib/gen-ui/generative-ui.service';
export { LgDynamicComponent } from './lib/gen-ui/lg-dynamic.component';

// =============================================================================
// Composables
// =============================================================================

export { useLangGraphWorkflow } from './lib/composables/use-langgraph-workflow';
export { useLangGraphStreaming } from './lib/composables/use-langgraph-streaming';
export { useLangGraphApproval } from './lib/composables/use-langgraph-approval';

// =============================================================================
// Provider
// =============================================================================

export { provideLangGraph } from './lib/providers/provide-langgraph';
