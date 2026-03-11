import type { AgentRegistryEntry } from '../../devbrand-poc/models/agent-registry.const';

/** Research workflow phases (single-agent progression) */
export type ResearchPhase =
  | 'idle'
  | 'started'
  | 'searching'
  | 'reading'
  | 'synthesizing'
  | 'report-draft'
  | 'approval'
  | 'saving'
  | 'completed'
  | 'error';

/** Research timeline entry types */
export type ResearchTimelineEntryType =
  | 'research-start'
  | 'searching'
  | 'reading-source'
  | 'synthesizing'
  | 'tool-execution'
  | 'report-draft'
  | 'approval-waiting'
  | 'approval-decision'
  | 'research-complete'
  | 'error';

/** Research timeline entry */
export interface ResearchTimelineEntry {
  readonly id: string;
  readonly type: ResearchTimelineEntryType;
  readonly timestamp: Date;
  readonly message: string;
  readonly detail?: string;
  readonly status: 'active' | 'completed' | 'error';
  readonly phase?: ResearchPhase;
}

/** HITL approval state for researcher */
export interface ResearchHitlApproval {
  readonly executionId: string;
  readonly reportDraft: string;
  readonly message: string;
  readonly requestedAt: Date;
}

/** Research error */
export interface ResearchError {
  readonly message: string;
  readonly timestamp: Date;
  readonly rawError?: unknown;
}

/** Raw event for debug panel */
export interface ResearchRawEvent {
  readonly type: string;
  readonly timestamp: Date;
  readonly data: unknown;
}

/**
 * Unified domain event from SSE - matches backend event structure.
 * Covers all 7 SSE event types emitted by research-chat.controller.ts.
 */
export interface ResearchDomainEvent {
  readonly type:
    | 'workflow-update'
    | 'tool-execution'
    | 'llm-token'
    | 'custom-progress'
    | 'debug-trace'
    | 'interruption_request'
    | 'workflow_complete';
  readonly timestamp: string;
  readonly executionId: string;
  // workflow-update fields
  readonly nodeName?: string;
  readonly state?: Record<string, unknown>;
  // tool-execution fields
  readonly toolData?: { readonly messages?: readonly unknown[] };
  // llm-token fields
  readonly token?: string;
  readonly step?: number;
  readonly messageChunk?: Record<string, unknown>;
  // custom-progress fields
  readonly progress?: {
    readonly agent?: string;
    readonly stage?: string;
    readonly message?: string;
    readonly percentage?: number;
  };
  // debug-trace fields
  readonly eventType?: string;
  readonly taskName?: string;
  readonly payload?: Record<string, unknown>;
  // interruption_request fields
  readonly message?: string;
  readonly reportDraft?: string;
  readonly approvalRequest?: Record<string, unknown>;
  // workflow_complete fields
  readonly finalState?: Record<string, unknown>;
}

/** Researcher agent registry - single agent */
export const RESEARCHER_AGENT_REGISTRY: Record<string, AgentRegistryEntry> = {
  researcher: {
    id: 'researcher',
    name: 'Researcher Agent',
    icon: '\u{1F52C}',
    description:
      'Autonomous research agent that searches, reads, and synthesizes information',
  },
};
