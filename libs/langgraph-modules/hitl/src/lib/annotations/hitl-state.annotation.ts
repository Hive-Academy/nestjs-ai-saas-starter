import { Annotation } from '@langchain/langgraph';
import { AgentStateAnnotation } from '@hive-academy/langgraph-core';

/**
 * HITL-specific annotation fields.
 * These fields extend AgentStateAnnotation with human-in-the-loop capabilities.
 */
export const HitlFields = {
  executionId: Annotation<string | undefined>({
    reducer: (current: string | undefined, update: string | undefined) =>
      update ?? current,
    default: () => undefined,
  }),

  confidence: Annotation<number>({
    reducer: (current: number, update: number) => update ?? current,
    default: () => 0,
  }),

  currentNode: Annotation<string | undefined>({
    reducer: (current: string | undefined, update: string | undefined) =>
      update ?? current,
    default: () => undefined,
  }),

  risks: Annotation<
    Array<{
      severity: 'low' | 'medium' | 'high' | 'critical';
      type: string;
      description: string;
      mitigation?: string;
    }>
  >({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),

  humanFeedback: Annotation<
    | {
        approved: boolean;
        status: string;
        approver: { id: string; name?: string; role?: string };
        message?: string;
        timestamp: Date;
        metadata?: Record<string, unknown>;
      }
    | undefined
  >({
    reducer: (current, update) => update ?? current,
    default: () => undefined,
  }),

  approvalReceived: Annotation<boolean>({
    reducer: (current: boolean, update: boolean) => update ?? current,
    default: () => false,
  }),

  waitingForApproval: Annotation<boolean>({
    reducer: (current: boolean, update: boolean) => update ?? current,
    default: () => false,
  }),

  rejectionReason: Annotation<string | undefined>({
    reducer: (current: string | undefined, update: string | undefined) =>
      update ?? current,
    default: () => undefined,
  }),
};

/**
 * Combined AgentState + HITL state annotation.
 * Use this as the `channels` option in @FunctionalWorkflow for HITL-enabled workflows.
 *
 * @example
 * ```typescript
 * @FunctionalWorkflow({
 *   name: 'approval-workflow',
 *   channels: HitlAgentStateAnnotation,
 * })
 * ```
 */
export const HitlAgentStateAnnotation = Annotation.Root({
  ...AgentStateAnnotation.spec,
  ...HitlFields,
});

/**
 * TypeScript type derived from HitlAgentStateAnnotation.
 * Use for type safety in HITL-enabled workflow node functions.
 */
export type HitlAgentState = typeof HitlAgentStateAnnotation.State;
