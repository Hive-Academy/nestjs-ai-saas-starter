import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { ResearchWorkflowStateService } from '../services/research-workflow-state.service';
import { ResearchRawEvent } from '../models';

/**
 * ResearchDebugPanelComponent
 *
 * Collapsible raw event viewer for developer debugging of research workflow SSE events.
 * Hidden by default, shows raw event data when expanded.
 *
 * Adapted from DebugPanelComponent but reads directly from ResearchWorkflowStateService
 * signals instead of using EventStreamComponent with DevBrandWorkflowStateService.
 *
 * @public
 */
@Component({
  selector: 'app-research-debug-panel',
  standalone: true,
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
            {{ stateService.eventCount() }} events
          </span>
        </span>
        <svg
          class="h-5 w-5 text-gray-400 transition-transform duration-200"
          [class.rotate-180]="expanded()"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
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
        <div class="max-h-96 overflow-y-auto pb-4 space-y-2">
          @for (event of stateService.eventHistory(); track $index) {
            <div class="p-3 bg-gray-50 rounded border border-gray-200">
              <div class="flex items-center gap-2 mb-1">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  [class]="getTypeBadgeClasses(event)"
                >
                  {{ event.type }}
                </span>
                <span class="text-xs text-gray-400">
                  {{ formatEventTimestamp(event) }}
                </span>
              </div>
              <pre
                class="text-xs text-gray-600 font-mono whitespace-pre-wrap break-words mt-1 max-h-32 overflow-y-auto"
              >{{ stringifyEventData(event) }}</pre>
            </div>
          } @empty {
            <p class="text-sm text-gray-400 text-center py-4">
              No events recorded yet.
            </p>
          }
        </div>
      }
    </div>
  `,
})
export class ResearchDebugPanelComponent {
  /** Research workflow state service for event history access */
  readonly stateService = inject(ResearchWorkflowStateService);

  /** Whether the debug panel is expanded */
  readonly expanded = signal(false);

  /** Toggle debug panel expanded/collapsed state */
  toggleExpanded(): void {
    this.expanded.update((value) => !value);
  }

  /**
   * Get CSS classes for the event type badge based on event type.
   */
  getTypeBadgeClasses(event: ResearchRawEvent): string {
    switch (event.type) {
      case 'workflow-update':
        return 'bg-blue-100 text-blue-700';
      case 'llm-token':
        return 'bg-indigo-100 text-indigo-700';
      case 'tool-execution':
        return 'bg-gray-200 text-gray-700';
      case 'custom-progress':
        return 'bg-amber-100 text-amber-700';
      case 'interruption_request':
        return 'bg-yellow-100 text-yellow-700';
      case 'workflow_complete':
        return 'bg-green-100 text-green-700';
      case 'debug-trace':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  /**
   * Format event timestamp for display.
   */
  formatEventTimestamp(event: ResearchRawEvent): string {
    return event.timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  /**
   * Stringify event data for display in the debug panel.
   * Truncates overly long output.
   */
  stringifyEventData(event: ResearchRawEvent): string {
    try {
      const json = JSON.stringify(event.data, null, 2);
      if (json.length > 2000) {
        return json.substring(0, 2000) + '\n... (truncated)';
      }
      return json;
    } catch {
      return String(event.data);
    }
  }
}
