/**
 * Bridge interface for functional-api decorator definitions
 * This interface allows workflow-engine to accept definitions from functional-api
 * without creating a direct dependency
 */

import type { WorkflowState, WorkflowNode, WorkflowEdge } from './workflow-engine.interface';

/**
 * Functional workflow definition from decorator patterns
 * Matches the structure from functional-api without direct import
 */
export interface FunctionalWorkflowDefinition {
  readonly name: string;
  readonly entrypoint: string;
  readonly tasks: Map<string, FunctionalTaskDefinition>;
  readonly dependencies: Map<string, readonly string[]>;
  readonly errorHandlers: Map<string, string>;
  readonly metadata: Record<string, unknown>;
}

/**
 * Task definition from functional-api decorators
 */
export interface FunctionalTaskDefinition {
  readonly name: string;
  readonly methodName: string;
  readonly dependencies: readonly string[];
  readonly isEntrypoint: boolean;
  readonly timeout?: number;
  readonly retryCount?: number;
  readonly errorHandler?: string;
  readonly metadata: Record<string, unknown>;
}

/**
 * Declarative workflow definition from @Node/@Edge decorators
 */
export interface DeclarativeWorkflowDefinition<TState extends WorkflowState = WorkflowState> {
  readonly className: string;
  readonly nodes: WorkflowNode<TState>[];
  readonly edges: WorkflowEdge<TState>[];
  readonly entryPoint: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Unified decorator definition that can handle both functional and declarative patterns
 */
export type DecoratorDefinition<TState extends WorkflowState = WorkflowState> = 
  | FunctionalWorkflowDefinition
  | DeclarativeWorkflowDefinition<TState>;

/**
 * Type guard for functional workflow definition
 */
export function isFunctionalDefinition<TState extends WorkflowState = WorkflowState>(
  definition: DecoratorDefinition<TState>
): definition is FunctionalWorkflowDefinition {
  return 'tasks' in definition && 'dependencies' in definition;
}

/**
 * Type guard for declarative workflow definition
 */
export function isDeclarativeDefinition<TState extends WorkflowState = WorkflowState>(
  definition: DecoratorDefinition<TState>
): definition is DeclarativeWorkflowDefinition<TState> {
  return 'nodes' in definition && 'edges' in definition && !('tasks' in definition);
}

/**
 * Configuration for decorator bridge functionality
 */
export interface DecoratorBridgeConfig {
  /**
   * Enable automatic conversion of functional definitions
   */
  enableFunctionalConversion?: boolean;
  
  /**
   * Enable automatic conversion of declarative definitions
   */
  enableDeclarativeConversion?: boolean;
  
  /**
   * Default timeout for converted tasks (ms)
   */
  defaultTimeout?: number;
  
  /**
   * Default retry configuration
   */
  defaultRetry?: {
    maxAttempts: number;
    delay: number;
  };
  
  /**
   * Enable streaming for converted workflows
   */
  enableStreaming?: boolean;
}

/**
 * Result of decorator definition translation
 */
export interface DecoratorTranslationResult<TState extends WorkflowState = WorkflowState> {
  /**
   * The translated workflow nodes
   */
  nodes: WorkflowNode<TState>[];
  
  /**
   * The translated workflow edges
   */
  edges: WorkflowEdge<TState>[];
  
  /**
   * The entry point node ID
   */
  entryPoint: string;
  
  /**
   * Metadata about the translation
   */
  metadata: {
    source: 'functional' | 'declarative';
    originalDefinition: DecoratorDefinition<TState>;
    translationTime: number;
    warnings?: string[];
  };
}