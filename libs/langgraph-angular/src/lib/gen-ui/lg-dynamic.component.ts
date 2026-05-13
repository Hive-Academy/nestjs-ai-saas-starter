import { Component, input } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

import type { GeneratedComponent } from './gen-ui.models';

/**
 * Renders an array of dynamically generated components.
 *
 * @remarks
 * Uses Angular's `NgComponentOutlet` with input binding (Angular 17+)
 * to render components specified by LangGraph agents at runtime.
 * Each component in the array is rendered with its associated inputs.
 *
 * @example
 * ```html
 * <lib-lg-dynamic [components]="generatedComponents()" />
 * ```
 *
 * @example
 * ```typescript
 * // In a parent component:
 * readonly genUI = inject(LangGraphGenerativeUIService);
 * readonly components = computed(() =>
 *   this.genUI.renderFromAgentState(this.workflowState())
 * );
 *
 * // In the template:
 * // <lib-lg-dynamic [components]="components()" />
 * ```
 *
 * @public
 */
@Component({
  selector: 'lib-lg-dynamic',
  standalone: true,
  imports: [NgComponentOutlet],
  template: `
    @for (item of components(); track item.id) {
    <ng-container *ngComponentOutlet="item.component; inputs: item.inputs" />
    }
  `,
})
export class LgDynamicComponent {
  /** Array of generated components to render dynamically */
  readonly components = input.required<GeneratedComponent[]>();
}
