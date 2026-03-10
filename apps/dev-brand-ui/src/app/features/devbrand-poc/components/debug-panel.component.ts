import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DevBrandWorkflowStateService } from '../services/devbrand-workflow-state.service';
import { EventStreamComponent } from './event-stream.component';

/**
 * DebugPanelComponent
 *
 * Collapsible raw event viewer for developer debugging.
 * Hidden by default, shows raw SSE events when expanded.
 *
 * @remarks
 * **Purpose**:
 * - Provide developer access to raw event data
 * - Hidden by default to keep UI clean for end users
 * - Event count badge always visible in header
 * - Embeds EventStreamComponent for full event display with virtual scrolling
 *
 * @example
 * ```html
 * <app-debug-panel />
 * ```
 *
 * @public
 */
@Component({
  selector: 'app-debug-panel',
  standalone: true,
  imports: [EventStreamComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  template: `
    <div class="border-t border-gray-200 mt-8">
      <button
        type="button"
        (click)="toggleExpanded()"
        class="w-full py-3 px-1 flex items-center justify-between hover:bg-gray-50 transition rounded"
        aria-label="Toggle debug panel"
      >
        <span class="text-sm font-medium text-gray-500 flex items-center gap-2">
          Debug Panel
          <span
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
          >
            {{ eventCount() }} events
          </span>
        </span>
        <svg
          class="h-5 w-5 text-gray-400 transition-transform duration-200"
          [class.rotate-180]="expanded()"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      @if (expanded()) {
      <div class="pb-4">
        <app-event-stream />
      </div>
      }
    </div>
  `,
})
export class DebugPanelComponent {
  /** Workflow state service for event history access */
  private readonly stateService = inject(DevBrandWorkflowStateService);

  /** Event history converted to signal for reactive event count */
  private readonly eventHistory = toSignal(this.stateService.eventHistory$, {
    initialValue: [],
  });

  /** Whether the debug panel is expanded */
  readonly expanded = signal(false);

  /** Number of events in history */
  readonly eventCount = signal(0);

  constructor() {
    // Subscribe to event history to keep count updated
    this.stateService.eventHistory$.subscribe((events) => {
      this.eventCount.set(events.length);
    });
  }

  /** Toggle debug panel expanded/collapsed state */
  toggleExpanded(): void {
    this.expanded.update((value) => !value);
  }
}
