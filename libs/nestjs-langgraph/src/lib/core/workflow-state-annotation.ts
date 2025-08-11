import { Annotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';

/**
 * Generic workflow state annotation for LangGraph
 * This is a simplified, generic version for the library
 */
export const WorkflowStateAnnotation = Annotation.Root({
  // Core workflow identifiers
  executionId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => `exec_${Date.now()}`,
  }),
  
  status: Annotation<'pending' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled'>({
    reducer: (x, y) => y ?? x,
    default: () => 'pending',
  }),

  currentNode: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),

  completedNodes: Annotation<string[]>({
    reducer: (current, update) => [...new Set([...current, ...update])],
    default: () => [],
  }),

  // Confidence score for decisions
  confidence: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 1.0,
  }),

  // LangGraph message history
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  // Generic metadata storage
  metadata: Annotation<Record<string, any>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),

  // Error information
  error: Annotation<any>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),

  // Human feedback for HITL
  humanFeedback: Annotation<any>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  // Timestamps
  timestamps: Annotation<{
    started: Date;
    updated?: Date;
    completed?: Date;
  }>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({ started: new Date() }),
  }),

  // Custom user data - allows extending the state
  customData: Annotation<Record<string, any>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),
});

/**
 * Create a custom state annotation with additional fields
 */
export function createCustomStateAnnotation(customFields: Record<string, any>) {
  return Annotation.Root({
    ...WorkflowStateAnnotation.spec,
    ...customFields,
  });
}