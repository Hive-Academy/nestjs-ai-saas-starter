/**
 * Timeline Model
 *
 * Types for orchestration timeline entries and agent error tracking.
 * Used by DevBrandWorkflowStateService and OrchestrationTimeline component.
 *
 * @public
 */

/**
 * TimelineEntryType
 *
 * Discriminated union for all timeline entry categories in the orchestration narrative.
 *
 * @public
 */
export type TimelineEntryType =
  | 'delegation'
  | 'agent-start'
  | 'agent-thinking'
  | 'tool-execution'
  | 'agent-complete'
  | 'agent-error'
  | 'workflow-start'
  | 'workflow-complete';

/**
 * TimelineEntry Interface
 *
 * Represents a single entry in the orchestration timeline narrative.
 *
 * @remarks
 * - Timeline entries are immutable once created
 * - Chronologically ordered by timestamp
 * - Used for real-time orchestration narrative display
 *
 * @public
 */
export interface TimelineEntry {
  readonly id: string;
  readonly type: TimelineEntryType;
  readonly timestamp: Date;
  readonly agentId?: string;
  readonly agentName?: string;
  readonly message: string;
  readonly detail?: string;
  readonly status: 'active' | 'completed' | 'error';
}

/**
 * AgentError Interface
 *
 * Represents an error encountered by a specific agent during workflow execution.
 *
 * @remarks
 * - Attributed to a specific agent for UI display
 * - rawError preserved as unknown for debugging
 *
 * @public
 */
export interface AgentError {
  readonly agentId: string;
  readonly agentName: string;
  readonly message: string;
  readonly timestamp: Date;
  readonly rawError?: unknown;
}
