/**
 * Runtime decorator pattern validation
 * Prevents mixing incompatible decorators (@Entrypoint/@Task vs @Node/@Edge)
 * Enhanced with explicit workflow type validation from @Agent.workflow.type and @FunctionalWorkflow.type
 */

import { WORKFLOW_METADATA_KEY } from '@hive-academy/langgraph-core';

/**
 * Decorator pattern metadata key
 * Stored on the class constructor to track which pattern is in use
 */
export const DECORATOR_PATTERN_KEY = Symbol('decorator:pattern');

/**
 * Decorator patterns for LangGraph workflows
 *
 * - task-based: Uses @Entrypoint + @Task with dependency-driven execution
 * - node-based: Uses @Node + @Edge with explicit graph construction
 * - unset: No pattern-defining decorator has been applied yet
 */
export type DecoratorPattern = 'task-based' | 'node-based' | 'unset';

/**
 * Stores the decorator pattern being used by a class
 * @param target - The class constructor
 * @param pattern - The pattern to set
 */
export function setDecoratorPattern(
  target: any,
  pattern: DecoratorPattern
): void {
  Reflect.defineMetadata(DECORATOR_PATTERN_KEY, pattern, target);
}

/**
 * Gets the current decorator pattern for a class
 * @param target - The class constructor
 * @returns The current pattern, or 'unset' if none defined
 */
export function getDecoratorPattern(target: any): DecoratorPattern {
  return Reflect.getMetadata(DECORATOR_PATTERN_KEY, target) || 'unset';
}

/**
 * Maps workflow type string to decorator pattern
 * @param workflowType - The workflow type from @Agent.workflow.type or @FunctionalWorkflow.type
 * @returns The corresponding decorator pattern, or null if invalid
 */
export function workflowTypeToPattern(
  workflowType: string
): DecoratorPattern | null {
  switch (workflowType) {
    case 'functional-task':
      return 'task-based';
    case 'functional-node':
      return 'node-based';
    default:
      return null;
  }
}

/**
 * Validates that a decorator is compatible with the class's existing pattern
 * Enhanced to check explicit workflow type from @Agent.workflow.type or @FunctionalWorkflow.type
 *
 * @param target - The class constructor
 * @param newPattern - The pattern required by the new decorator
 * @param decoratorName - The name of the decorator being applied
 * @param className - Optional class name for better error messages
 * @throws {DecoratorPatternConflictError} If patterns are incompatible
 *
 * @example
 * // First decorator sets the pattern
 * validateDecoratorPattern(MyClass, 'task-based', 'Entrypoint');
 * // ✅ Pattern set to 'task-based'
 *
 * // Subsequent decorators must match
 * validateDecoratorPattern(MyClass, 'task-based', 'Task');
 * // ✅ Matches existing pattern
 *
 * // Incompatible decorator throws error
 * validateDecoratorPattern(MyClass, 'node-based', 'Node');
 * // ❌ DecoratorPatternConflictError thrown
 *
 * @example
 * // With explicit workflow type declaration
 * @Agent({ workflow: { type: 'functional-task' } })
 * class MyAgent {
 *   @Entrypoint() // ✅ Matches functional-task
 *   async start() {}
 *
 *   @Node() // ❌ Error - functional-task only allows @Entrypoint/@Task
 *   async process() {}
 * }
 */
export function validateDecoratorPattern(
  target: any,
  newPattern: DecoratorPattern,
  decoratorName: string,
  className?: string
): void {
  const targetName = className || target.constructor?.name || target.name || 'Unknown';

  // 🆕 ENHANCED: Check for explicit workflow type from @Agent.workflow.type
  const agentMetadata = Reflect.getMetadata('agent:config', target);
  if (agentMetadata?.workflow?.type) {
    const declaredPattern = workflowTypeToPattern(agentMetadata.workflow.type);

    if (declaredPattern && declaredPattern !== newPattern) {
      throw new DecoratorPatternConflictError(
        targetName,
        declaredPattern,
        newPattern,
        decoratorName,
        `@Agent.workflow.type is "${agentMetadata.workflow.type}" but attempting to use ${newPattern} decorator @${decoratorName}.`
      );
    }
  }

  // 🆕 ENHANCED: Check for explicit workflow type from @FunctionalWorkflow.type
  const workflowMetadata = Reflect.getMetadata(WORKFLOW_METADATA_KEY, target);
  if (workflowMetadata?.type) {
    const declaredPattern = workflowTypeToPattern(workflowMetadata.type);

    if (declaredPattern && declaredPattern !== newPattern) {
      throw new DecoratorPatternConflictError(
        targetName,
        declaredPattern,
        newPattern,
        decoratorName,
        `@FunctionalWorkflow.type is "${workflowMetadata.type}" but attempting to use ${newPattern} decorator @${decoratorName}.`
      );
    }
  }

  // Existing validation logic (metadata-based pattern tracking)
  const existingPattern = getDecoratorPattern(target);

  // First pattern-defining decorator sets the pattern
  if (existingPattern === 'unset') {
    setDecoratorPattern(target, newPattern);
    return;
  }

  // Check for pattern conflicts
  if (existingPattern !== newPattern) {
    throw new DecoratorPatternConflictError(
      targetName,
      existingPattern,
      newPattern,
      decoratorName
    );
  }
}

/**
 * Custom error for decorator pattern conflicts
 * Provides clear, actionable error messages with guidance
 */
export class DecoratorPatternConflictError extends Error {
  constructor(
    className: string,
    existingPattern: DecoratorPattern,
    attemptedPattern: DecoratorPattern,
    decoratorName: string,
    customMessage?: string
  ) {
    const conflictReason = customMessage || `Incompatible decorator @${decoratorName} detected`;
    const message = `
╔════════════════════════════════════════════════════════════════════════╗
║ DECORATOR PATTERN CONFLICT                                             ║
╚════════════════════════════════════════════════════════════════════════╝

${conflictReason} in "${className}"

📊 Pattern Status:
   Current pattern:   ${existingPattern}
   Attempted pattern: ${attemptedPattern}

🚫 You cannot mix decorator patterns:
   • Task-based:  @Entrypoint + @Task (dependency-driven, uses dependsOn)
   • Node-based:  @Node + @Edge (graph-driven, explicit connections)

📖 Documentation:
   Complete Guide: libs/langgraph-modules/functional-api/CLAUDE.md#decorator-patterns-complete-reference
   Quick Reference: libs/langgraph-modules/functional-api/README.md#decorator-patterns-quick-reference

✅ Fix Options for "${className}":

   Option 1: Pure Task-Based Pattern
   ────────────────────────────────────
   - Keep: @Entrypoint and @Task decorators
   - Remove: ALL @Node and @Edge decorators
   - Use: dependsOn property for task dependencies
   - Signature: (context: TaskExecutionContext) => Promise<TaskExecutionResult>

   Example:
   @Entrypoint()
   async start(context: TaskExecutionContext) { ... }

   @Task({ dependsOn: ['start'] })
   async process(context: TaskExecutionContext) { ... }

   Option 2: Pure Node-Based Pattern
   ────────────────────────────────────
   - Keep: @Node and @Edge decorators
   - Remove: ALL @Entrypoint and @Task decorators
   - Use: @Edge to define connections explicitly
   - Signature: (state: WorkflowState) => Promise<Partial<WorkflowState>>

   Example:
   @Node({ type: 'standard' })
   async start(state: WorkflowState) { ... }

   @Node({ type: 'standard' })
   async process(state: WorkflowState) { ... }

   @Edge('start', 'process')
   startToProcess() {}

💡 Pro Tips:
   • Task-based is simpler for linear/sequential workflows
   • Node-based provides more control for complex routing/branching
   • Cross-cutting decorators (@Tool, @RequiresApproval, @Stream*) work with BOTH patterns

🔗 Pattern Decision Guide:
   Use Task-Based if:
   ✓ Workflow is mostly linear/sequential
   ✓ Dependencies are straightforward
   ✓ You want automatic edge creation

   Use Node-Based if:
   ✓ Complex conditional routing required
   ✓ Multiple branching paths
   ✓ Need explicit control over graph structure
`;

    super(message);
    this.name = 'DecoratorPatternConflictError';

    // Preserve stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DecoratorPatternConflictError);
    }
  }
}

/**
 * Checks if a decorator is pattern-defining
 * Pattern-defining decorators enforce task-based or node-based patterns
 *
 * @param decoratorName - The name of the decorator
 * @returns true if the decorator defines a pattern
 */
export function isPatternDefiningDecorator(decoratorName: string): boolean {
  const patternDefiningDecorators = ['Entrypoint', 'Task', 'Node', 'Edge'];
  return patternDefiningDecorators.includes(decoratorName);
}

/**
 * Checks if a decorator is cross-cutting (pattern-agnostic)
 * Cross-cutting decorators work with both task-based and node-based patterns
 *
 * @param decoratorName - The name of the decorator
 * @returns true if the decorator is cross-cutting
 */
export function isCrossCuttingDecorator(decoratorName: string): boolean {
  const crossCuttingDecorators = [
    'Tool',
    'RequiresApproval',
    'StreamToken',
    'StreamProgress',
    'StreamEvent',
  ];
  return crossCuttingDecorators.includes(decoratorName);
}

/**
 * Gets the pattern required by a specific decorator
 *
 * @param decoratorName - The name of the decorator
 * @returns The pattern required, or null if not pattern-defining
 */
export function getDecoratorRequiredPattern(
  decoratorName: string
): DecoratorPattern | null {
  switch (decoratorName) {
    case 'Entrypoint':
    case 'Task':
      return 'task-based';
    case 'Node':
    case 'Edge':
      return 'node-based';
    default:
      return null;
  }
}
