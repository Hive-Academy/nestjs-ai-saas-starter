/**
 * Unified Store Namespace Constants
 *
 * TASK_2025_008 Phase 2: Memory Adapter Integration
 * Module 1: HITL Proof of Concept
 *
 * Provides standardized hierarchical namespace constants for LangGraph Store
 * integration across all langgraph-modules. Ensures consistent namespace
 * patterns and prevents conflicts.
 *
 * Namespace Pattern: [collection, domain, entity, subentity...]
 * - Level 1: Collection (module-prefixed) e.g., 'hitl-approvals'
 * - Level 2: Domain (functional area) e.g., 'approvals'
 * - Level 3: Entity (specific instance) e.g., executionId
 * - Level 4+: Subentity (nested relationships) e.g., approvalId
 *
 * Evidence:
 * - Architecture: task-tracking/TASK_2025_008/implementation-plan-overview.md:179-269
 * - Store interface: libs/langgraph-modules/core/src/lib/interfaces/memory-adapter.interface.ts:60-100
 * - Pattern source: Phase 1 HITL implementation
 */

/**
 * Store collection constants organized by module
 * All collections use module prefixes to prevent namespace conflicts
 */
export const STORE_COLLECTIONS = {
  /**
   * HITL Module Collections
   * Human-in-the-Loop approval tracking and learning
   */
  HITL: {
    /**
     * Approval chain patterns and relationships
     * Namespace pattern: ['hitl-chains', executionId, chainId, ...]
     */
    CHAINS: 'hitl-chains',

    /**
     * Individual approval decisions and outcomes
     * Namespace pattern: ['hitl-approvals', executionId, approvalId]
     */
    APPROVALS: 'hitl-approvals',

    /**
     * Confidence evaluation patterns
     * Namespace pattern: ['hitl-confidence', executionId, ...]
     */
    CONFIDENCE: 'hitl-confidence',
  },

  /**
   * WorkflowEngine Module Collections
   * Workflow pattern tracking and optimization
   */
  WORKFLOW: {
    /**
     * Workflow execution patterns
     * Namespace pattern: ['workflow-patterns', workflowType, executionId]
     */
    PATTERNS: 'workflow-patterns',

    /**
     * Workflow optimization data
     * Namespace pattern: ['workflow-optimizations', workflowType, ...]
     */
    OPTIMIZATIONS: 'workflow-optimizations',

    /**
     * Workflow composition relationships
     * Namespace pattern: ['workflow-compositions', parentWorkflow, childWorkflow]
     */
    COMPOSITIONS: 'workflow-compositions',
  },

  /**
   * MultiAgent Module Collections
   * Agent collaboration and network tracking
   */
  MULTI_AGENT: {
    /**
     * Agent network topologies
     * Namespace pattern: ['agent-networks', networkId, agentId]
     */
    NETWORKS: 'agent-networks',

    /**
     * Agent collaboration patterns
     * Namespace pattern: ['agent-collaborations', agentId, collaboratorId]
     */
    COLLABORATIONS: 'agent-collaborations',

    /**
     * Agent handoff tracking
     * Namespace pattern: ['agent-handoffs', fromAgent, toAgent]
     */
    HANDOFFS: 'agent-handoffs',
  },

  /**
   * FunctionalAPI Module Collections
   * Functional workflow patterns and compositions
   */
  FUNCTIONAL_API: {
    /**
     * Functional workflow patterns
     * Namespace pattern: ['functional-patterns', workflowName, executionId]
     */
    PATTERNS: 'functional-patterns',

    /**
     * Functional composition relationships
     * Namespace pattern: ['functional-compositions', parentTask, childTask]
     */
    COMPOSITIONS: 'functional-compositions',
  },

  /**
   * TimeTravel Module Collections
   * Workflow debugging and replay tracking
   */
  TIME_TRAVEL: {
    /**
     * Branch relationships and histories
     * Namespace pattern: ['time-travel-branches', executionId, branchId]
     */
    BRANCHES: 'time-travel-branches',

    /**
     * Replay session tracking
     * Namespace pattern: ['time-travel-replays', originalExecution, replayId]
     */
    REPLAYS: 'time-travel-replays',
  },
} as const;

/**
 * Type-safe collection keys
 */
export type StoreCollectionKey =
  | (typeof STORE_COLLECTIONS.HITL)[keyof typeof STORE_COLLECTIONS.HITL]
  | (typeof STORE_COLLECTIONS.WORKFLOW)[keyof typeof STORE_COLLECTIONS.WORKFLOW]
  | (typeof STORE_COLLECTIONS.MULTI_AGENT)[keyof typeof STORE_COLLECTIONS.MULTI_AGENT]
  | (typeof STORE_COLLECTIONS.FUNCTIONAL_API)[keyof typeof STORE_COLLECTIONS.FUNCTIONAL_API]
  | (typeof STORE_COLLECTIONS.TIME_TRAVEL)[keyof typeof STORE_COLLECTIONS.TIME_TRAVEL];

/**
 * Namespace validation result
 */
export interface NamespaceValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Namespace validation options
 */
export interface NamespaceValidationOptions {
  minDepth?: number;
  maxDepth?: number;
  requireModulePrefix?: boolean;
}

/**
 * Validate Store namespace structure
 *
 * Ensures namespaces follow the hierarchical pattern and meet depth requirements.
 *
 * @param namespace Hierarchical namespace path
 * @param options Validation options
 * @returns Validation result with errors and warnings
 *
 * @example
 * validateNamespace(['hitl-chains', 'exec-123', 'chain-456'], { minDepth: 2 })
 * // { valid: true, errors: [], warnings: [] }
 *
 * validateNamespace(['invalid'], { minDepth: 2 })
 * // { valid: false, errors: ['Namespace depth 1 is less than required 2'], warnings: [] }
 */
export function validateNamespace(
  namespace: string[],
  options: NamespaceValidationOptions = {}
): NamespaceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check minimum depth (default: 2 levels minimum)
  const minDepth = options.minDepth ?? 2;
  if (namespace.length < minDepth) {
    errors.push(
      `Namespace depth ${namespace.length} is less than required ${minDepth}. ` +
        `Must have at least [collection, domain]. ` +
        `Example: ['hitl-approvals', 'approvals', executionId]`
    );
  }

  // Check maximum depth (default: 10 levels maximum)
  const maxDepth = options.maxDepth ?? 10;
  if (namespace.length > maxDepth) {
    warnings.push(
      `Namespace depth ${namespace.length} exceeds recommended ${maxDepth}. ` +
        `Consider flattening hierarchy for performance.`
    );
  }

  // Check collection format (should have module prefix)
  if (options.requireModulePrefix !== false && namespace.length > 0) {
    const collection = namespace[0];
    const hasPrefix = /^[a-z]+-[a-z]+/.test(collection);

    if (!hasPrefix) {
      warnings.push(
        `Collection "${collection}" should use module prefix ` +
          `(e.g., "hitl-approvals", "workflow-patterns").`
      );
    }
  }

  // Check for invalid characters (only alphanumeric, underscore, hyphen)
  namespace.forEach((part, index) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(part)) {
      errors.push(
        `Namespace part ${index} "${part}" contains invalid characters. ` +
          `Use only alphanumeric, underscore, and hyphen.`
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Namespace builder utility for constructing type-safe hierarchical namespaces
 *
 * Provides a fluent API for building namespaces with automatic validation.
 *
 * @example
 * const namespace = new NamespaceBuilder()
 *   .collection(STORE_COLLECTIONS.HITL.CHAINS)
 *   .domain('chains')
 *   .entity('exec-123', 'chain-456')
 *   .build();
 * // Result: ['hitl-chains', 'chains', 'exec-123', 'chain-456']
 */
export class NamespaceBuilder {
  private parts: string[] = [];

  /**
   * Set the collection (top-level namespace)
   *
   * @param name Collection name (use STORE_COLLECTIONS constants)
   * @returns Builder for chaining
   */
  collection(name: string): this {
    this.parts.push(name);
    return this;
  }

  /**
   * Set the domain (functional area within collection)
   *
   * @param name Domain name
   * @returns Builder for chaining
   */
  domain(name: string): this {
    this.parts.push(name);
    return this;
  }

  /**
   * Add entity identifiers (specific instances)
   *
   * @param ids One or more entity identifiers
   * @returns Builder for chaining
   */
  entity(...ids: string[]): this {
    this.parts.push(...ids);
    return this;
  }

  /**
   * Build the namespace array with validation
   *
   * @returns Validated namespace array
   * @throws Error if namespace validation fails
   */
  build(): string[] {
    const validation = validateNamespace(this.parts);

    if (!validation.valid) {
      throw new Error(`Invalid namespace: ${validation.errors.join(', ')}`);
    }

    // Log warnings but don't throw
    if (validation.warnings.length > 0) {
      console.warn(
        'Namespace validation warnings:',
        validation.warnings.join(', ')
      );
    }

    return [...this.parts];
  }

  /**
   * Reset the builder to start a new namespace
   *
   * @returns Builder for chaining
   */
  reset(): this {
    this.parts = [];
    return this;
  }
}

/**
 * Extract module name from collection string
 *
 * @param collection Collection name
 * @returns Module name or null if not prefixed
 *
 * @example
 * extractModule('hitl-approvals') // 'hitl'
 * extractModule('workflow-patterns') // 'workflow'
 * extractModule('invalid') // null
 */
export function extractModule(collection: string): string | null {
  const match = collection.match(/^([a-z]+)-/);
  return match ? match[1] : null;
}

/**
 * Check if a namespace matches an expected pattern
 *
 * Supports wildcards (*) for flexible matching.
 *
 * @param namespace Namespace to check
 * @param pattern Expected pattern (use '*' for wildcards)
 * @returns True if namespace matches pattern
 *
 * @example
 * matchesPattern(['hitl-chains', 'exec-123', 'chain-456'], ['hitl-chains', '*', '*'])
 * // true
 *
 * matchesPattern(['hitl-chains', 'exec-123'], ['hitl-chains', 'exec-123', 'chain-456'])
 * // false (different lengths)
 */
export function matchesPattern(
  namespace: string[],
  pattern: string[]
): boolean {
  if (namespace.length !== pattern.length) {
    return false;
  }

  return pattern.every((part, index) => {
    if (part === '*') {
      return true; // Wildcard matches any value
    }
    return namespace[index] === part;
  });
}
