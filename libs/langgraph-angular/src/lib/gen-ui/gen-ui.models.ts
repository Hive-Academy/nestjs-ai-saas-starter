import type { Type } from '@angular/core';

/**
 * A dynamically generated component to be rendered via NgComponentOutlet.
 *
 * @remarks
 * Each entry maps a registered Angular component class to its input/output
 * bindings. Used by {@link LgDynamicComponent} to render agent-driven UI.
 *
 * @public
 */
export interface GeneratedComponent {
  /** Unique identifier for tracking in `@for` loops */
  readonly id: string;
  /** Angular component class to render */
  readonly component: Type<unknown>;
  /** Input bindings to pass to the component */
  readonly inputs: Record<string, unknown>;
  /** Optional output event handlers */
  readonly outputs?: Record<string, unknown>;
}

/**
 * State shape for generative UI within LangGraph workflow state.
 *
 * @remarks
 * Agents emit this structure under a `generativeUI` key in their
 * workflow state. The {@link LangGraphGenerativeUIService} reads
 * this shape and maps `type` strings to registered Angular components.
 *
 * @public
 */
export interface GenerativeUIState {
  /** Array of component descriptors from the agent */
  readonly components: ReadonlyArray<{
    /** Unique identifier for the component instance */
    readonly id: string;
    /** Registered component name (maps to registry key) */
    readonly type: string;
    /** Input property values to bind */
    readonly props: Record<string, unknown>;
    /** Optional event handler descriptors */
    readonly events?: Record<string, unknown>;
  }>;
}
