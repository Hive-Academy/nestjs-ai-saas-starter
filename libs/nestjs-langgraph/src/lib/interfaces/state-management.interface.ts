import { z } from 'zod';
import { BaseMessage } from '@langchain/core/messages';

/**
 * Reducer function type for state channels
 */
export type ReducerFunction<T = any> = (current: T, update: T) => T;

/**
 * Channel definition for state annotations
 */
export interface ChannelDefinition<T = any> {
  /**
   * Reducer function for combining state updates
   */
  reducer?: ReducerFunction<T>;

  /**
   * Default value factory
   */
  default?: () => T;

  /**
   * Optional validator function
   */
  validator?: (value: T) => boolean;

  /**
   * Channel description for documentation
   */
  description?: string;

  /**
   * Whether this channel is required
   */
  required?: boolean;
}

/**
 * Configuration for creating state annotations
 */
export interface StateAnnotationConfig<T> {
  /**
   * Unique name for this state annotation
   */
  name: string;

  /**
   * Channel definitions for state properties
   */
  channels: Record<keyof T, ChannelDefinition>;

  /**
   * Optional Zod schema for runtime validation
   */
  validation?: z.ZodSchema<T>;

  /**
   * Custom reducers for specific channels
   */
  reducers?: Record<keyof T, ReducerFunction>;

  /**
   * Description of this state annotation
   */
  description?: string;

  /**
   * Version of this state annotation
   */
  version?: string;
}

/**
 * State annotation interface
 */
export interface StateAnnotation<T> {
  /**
   * State annotation specification
   */
  spec: Record<keyof T, ChannelDefinition>;

  /**
   * Name of the annotation
   */
  name: string;

  /**
   * Validation schema if provided
   */
  validation?: z.ZodSchema<T>;

  /**
   * Create initial state
   */
  createInitialState(): T;

  /**
   * Validate state against schema
   */
  validateState(state: T): ValidationResult<T>;

  /**
   * Apply reducers to merge state updates
   */
  applyReducers(current: T, update: Partial<T>): T;
}

/**
 * State transformer interface for converting between state formats
 */
export interface StateTransformer<TFrom, TTo> {
  /**
   * Transform state from one format to another
   */
  transform(state: TFrom): TTo;

  /**
   * Reverse transformation if supported
   */
  reverseTransform?(state: TTo): TFrom;

  /**
   * Validate that transformation is possible
   */
  canTransform(state: TFrom): boolean;
}

/**
 * Validation result interface
 */
export interface ValidationResult<T> {
  /**
   * Whether validation succeeded
   */
  success: boolean;

  /**
   * Validated data if successful
   */
  data?: T;

  /**
   * Error information if validation failed
   */
  error?: {
    message: string;
    issues: z.ZodIssue[];
    path: string[];
  };
}

/**
 * Built-in channel types for common use cases
 */
export interface BuiltInChannels {
  /**
   * Message history channel
   */
  messages: ChannelDefinition<BaseMessage[]>;

  /**
   * Confidence score channel
   */
  confidence: ChannelDefinition<number>;

  /**
   * Metadata channel
   */
  metadata: ChannelDefinition<Record<string, unknown>>;

  /**
   * Error information channel
   */
  error: ChannelDefinition<Error | null>;

  /**
   * Execution status channel
   */
  status: ChannelDefinition<
    'pending' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled'
  >;

  /**
   * Current node channel
   */
  currentNode: ChannelDefinition<string | null>;

  /**
   * Completed nodes channel
   */
  completedNodes: ChannelDefinition<string[]>;

  /**
   * Timestamps channel
   */
  timestamps: ChannelDefinition<{
    started: Date;
    updated?: Date;
    completed?: Date;
  }>;
}

/**
 * State transformation options
 */
export interface StateTransformationOptions {
  /**
   * Whether to validate the transformed state
   */
  validate?: boolean;

  /**
   * Custom validation schema for the target state
   */
  targetSchema?: z.ZodSchema<any>;

  /**
   * Whether to preserve metadata during transformation
   */
  preserveMetadata?: boolean;

  /**
   * Custom field mappings
   */
  fieldMappings?: Record<string, string>;
}

/**
 * State merge options
 */
export interface StateMergeOptions {
  /**
   * Strategy for merging conflicting values
   */
  conflictStrategy?: 'overwrite' | 'merge' | 'preserve' | 'error';

  /**
   * Fields to exclude from merging
   */
  excludeFields?: string[];

  /**
   * Fields to force overwrite
   */
  forceOverwrite?: string[];

  /**
   * Whether to validate the merged result
   */
  validate?: boolean;
}

/**
 * Enhanced workflow state interface extending the basic WorkflowState
 */
export interface EnhancedWorkflowState {
  // Core identifiers
  executionId: string;
  threadId?: string;
  checkpointId?: string;

  // Execution status
  status:
    | 'pending'
    | 'active'
    | 'paused'
    | 'completed'
    | 'failed'
    | 'cancelled';
  currentNode?: string;
  previousNode?: string;
  completedNodes: string[];

  // Confidence and quality metrics
  confidence: number;
  qualityScore?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';

  // Message and communication
  messages: BaseMessage[];
  lastMessage?: BaseMessage;

  // Error handling
  error?: Error | null;
  lastError?: Error | null;
  retryCount: number;
  maxRetries?: number;

  // Human-in-the-loop
  requiresApproval?: boolean;
  approvalReceived?: boolean;
  humanFeedback?: any;

  // Timestamps
  timestamps: {
    started: Date;
    updated?: Date;
    completed?: Date;
    lastActivity?: Date;
  };

  // Metadata and custom data
  metadata: Record<string, unknown>;
  customData: Record<string, unknown>;

  // State versioning
  stateVersion?: string;
  schemaVersion?: string;

  // Performance metrics
  metrics?: {
    nodeExecutionTimes: Record<string, number>;
    totalExecutionTime?: number;
    memoryUsage?: number;
    tokenUsage?: number;
  };
}
