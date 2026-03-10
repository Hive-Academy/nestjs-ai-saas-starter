import { inject } from '@angular/core';

import { LangGraphWorkflowStateService } from '../services/langgraph-workflow-state.service';

/**
 * Composable for LangGraph workflow execution state.
 *
 * @remarks
 * Provides convenient access to workflow execution signals and methods
 * by delegating to the injected `LangGraphWorkflowStateService`.
 *
 * Must be called within an Angular injection context (constructor,
 * field initializer, or `runInInjectionContext`).
 *
 * @returns Readonly object with workflow state signals and control methods
 *
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-workflow',
 *   template: `
 *     <p>Status: {{ workflow.executionState().status }}</p>
 *     <p>Progress: {{ workflow.workflowProgress() }}%</p>
 *     <p>Agent: {{ workflow.currentAgent() ?? 'None' }}</p>
 *     <button (click)="workflow.startExecution('/api/stream/exec-123')">
 *       Start
 *     </button>
 *   `,
 * })
 * export class WorkflowComponent {
 *   readonly workflow = useLangGraphWorkflow();
 * }
 * ```
 *
 * @public
 */
export function useLangGraphWorkflow() {
  const stateService = inject(LangGraphWorkflowStateService);

  return {
    /** Current execution state (lifecycle, step tracking, errors). */
    executionState: stateService.executionState,
    /** Map of agent IDs to their current progress state. */
    agentProgress: stateService.agentProgress,
    /** Whether the workflow is currently executing. */
    isExecuting: stateService.isExecuting,
    /** The ID of the first active agent, or `null` if none. */
    currentAgent: stateService.currentAgent,
    /** Overall workflow progress as a percentage (0-100). */
    workflowProgress: stateService.workflowProgress,
    /** Start tracking a workflow execution by connecting to an SSE stream. */
    startExecution: (streamUrl: string) =>
      stateService.startExecution(streamUrl),
    /** Reset all state to initial idle values and disconnect SSE. */
    reset: () => stateService.reset(),
  } as const;
}
