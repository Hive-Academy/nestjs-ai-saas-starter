import { Annotation } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import type {
  WorkflowError,
  HumanFeedback,
} from '../interfaces/state-management.interface';
import { generateExecutionId } from '../utils/id-generation.utils';

/**
 * Generic metadata interface for type-safe workflow state
 */
export interface WorkflowMetadata {
  [key: string]: string | number | boolean | Date | null | undefined;
}

/**
 * Generic custom data interface for extensible workflow state
 */
export interface WorkflowCustomData {
  [key: string]: string | number | boolean | Date | object | null | undefined;
}

/**
 * Generic workflow state annotation for LangGraph
 * This is a simplified, generic version for the library
 */
export const WorkflowStateAnnotation = Annotation.Root({
  // Core workflow identifiers
  executionId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => generateExecutionId(),
  }),

  status: Annotation<
    'pending' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled'
  >({
    reducer: (x, y) => y ?? x,
    default: () => 'pending',
  }),

  currentNode: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),

  completedNodes: Annotation<string[]>({
    reducer: (current, update) => {
      const combined = [...current, ...update];
      return Array.from(new Set(combined));
    },
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
  metadata: Annotation<WorkflowMetadata>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),

  // Error information
  error: Annotation<WorkflowError | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),

  // Human feedback for HITL
  humanFeedback: Annotation<HumanFeedback | null>({
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
  customData: Annotation<WorkflowCustomData>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),
});

/**
 * Create a custom state annotation with additional fields
 * @template TCustomFields - Type for custom fields
 */
export function createCustomStateAnnotation<
  TCustomFields extends Record<string, any> = Record<string, any>
>(customFields: TCustomFields) {
  return Annotation.Root({
    ...WorkflowStateAnnotation.spec,
    ...customFields,
  });
}

/**
 * Create a typed workflow state annotation with specific metadata and custom data types
 * @template TMetadata - Type for metadata field
 * @template TCustomData - Type for custom data field
 */
export function createTypedWorkflowStateAnnotation<
  TMetadata extends WorkflowMetadata = WorkflowMetadata,
  TCustomData extends WorkflowCustomData = WorkflowCustomData
>() {
  return Annotation.Root({
    // Core workflow identifiers
    executionId: Annotation<string>({
      reducer: (x, y) => y ?? x,
      default: () => generateExecutionId(),
    }),

    status: Annotation<
      'pending' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled'
    >({
      reducer: (x, y) => y ?? x,
      default: () => 'pending',
    }),

    currentNode: Annotation<string | undefined>({
      reducer: (x, y) => y ?? x,
      default: () => undefined,
    }),

    completedNodes: Annotation<string[]>({
      reducer: (current, update) => {
        const combined = [...current, ...update];
        return Array.from(new Set(combined));
      },
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

    // Typed metadata storage
    metadata: Annotation<TMetadata>({
      reducer: (current, update) => ({ ...current, ...update } as TMetadata),
      default: () => ({} as TMetadata),
    }),

    // Error information
    error: Annotation<WorkflowError | undefined>({
      reducer: (x, y) => y ?? x,
      default: () => undefined,
    }),

    // Human feedback for HITL
    humanFeedback: Annotation<HumanFeedback | null>({
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

    // Typed custom user data
    customData: Annotation<TCustomData>({
      reducer: (current, update) => ({ ...current, ...update } as TCustomData),
      default: () => ({} as TCustomData),
    }),
  });
}
