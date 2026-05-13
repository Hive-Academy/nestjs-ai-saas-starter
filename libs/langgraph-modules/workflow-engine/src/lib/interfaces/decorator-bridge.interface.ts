/**
 * Bridge interface for functional-api decorator definitions
 * This interface allows workflow-engine to accept definitions from functional-api
 * without creating a direct dependency
 */

import type { WorkflowNode, WorkflowEdge } from './workflow-engine.interface';

/**
 * Functional workflow definition from decorator patterns (Bridge Interface)
 * Matches the structure from functional-api without direct import
 */
export interface BridgeFunctionalWorkflowDefinition {
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
export interface DeclarativeWorkflowDefinition {
  readonly className: string;
  readonly nodes: WorkflowNode[];
  readonly edges: WorkflowEdge[];
  readonly entryPoint: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Unified decorator definition that can handle both functional and declarative patterns
 */
export type DecoratorDefinition =
  | BridgeFunctionalWorkflowDefinition
  | DeclarativeWorkflowDefinition;

/**
 * Type guard for functional workflow definition
 */
export function isFunctionalDefinition(
  definition: DecoratorDefinition
): definition is BridgeFunctionalWorkflowDefinition {
  return 'tasks' in definition && 'dependencies' in definition;
}

/**
 * Type guard for declarative workflow definition
 */
export function isDeclarativeDefinition(
  definition: DecoratorDefinition
): definition is DeclarativeWorkflowDefinition {
  return (
    'nodes' in definition && 'edges' in definition && !('tasks' in definition)
  );
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
export interface DecoratorTranslationResult {
  /**
   * The translated workflow nodes
   */
  nodes: WorkflowNode[];

  /**
   * The translated workflow edges
   */
  edges: WorkflowEdge[];

  /**
   * The entry point node ID
   */
  entryPoint: string;

  /**
   * Metadata about the translation
   */
  metadata: {
    source: 'functional' | 'declarative';
    originalDefinition: DecoratorDefinition;
    translationTime: number;
    warnings?: string[];
  };
}
