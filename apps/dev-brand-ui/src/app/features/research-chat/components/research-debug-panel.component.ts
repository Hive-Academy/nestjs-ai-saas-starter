import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ResearchWorkflowStateService } from '../services/research-workflow-state.service';

/** Pre-computed display data for a debug event */
interface DebugEventView {
  readonly type: string;
  readonly badgeClasses: string;
  readonly timestamp: string;
  readonly data: string;
}

const TYPE_BADGE_CLASSES: Record<string, string> = {
  'workflow-update': 'bg-blue-100 text-blue-700',
  'llm-token': 'bg-indigo-100 text-indigo-700',
  'tool-execution': 'bg-gray-200 text-gray-700',
  'custom-progress': 'bg-amber-100 text-amber-700',
  'interruption_request': 'bg-yellow-100 text-yellow-700',
  'workflow_complete': 'bg-green-100 text-green-700',
  'debug-trace': 'bg-purple-100 text-purple-700',
};

/**
 * ResearchDebugPanelComponent
 *
 * Collapsible raw event viewer for developer debugging of research workflow SSE events.
 * Hidden by default. Uses pre-computed views to avoid per-item template method calls.
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
          @for (event of recentEvents(); track event.timestamp) {
            <div class="p-3 bg-gray-50 rounded border border-gray-200">
              <div class="flex items-center gap-2 mb-1">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  [class]="event.badgeClasses"
                >
                  {{ event.type }}
                </span>
                <span class="text-xs text-gray-400">
                  {{ event.timestamp }}
                </span>
              </div>
              <pre
                class="text-xs text-gray-600 font-mono whitespace-pre-wrap break-words mt-1 max-h-32 overflow-y-auto"
              >{{ event.data }}</pre>
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
  readonly stateService = inject(ResearchWorkflowStateService);
  readonly expanded = signal(false);

  /** Pre-computed event views - only last 200 events shown to avoid DOM overload */
  readonly recentEvents = computed<DebugEventView[]>(() => {
    const history = this.stateService.eventHistory();
    const recent = history.length > 200 ? history.slice(-200) : history;
    return recent.map((event) => ({
      type: event.type,
      badgeClasses: TYPE_BADGE_CLASSES[event.type] || 'bg-gray-100 text-gray-600',
      timestamp: event.timestamp.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      data: this.stringifyData(event.data),
    }));
  });

  toggleExpanded(): void {
    this.expanded.update((value) => !value);
  }

  private stringifyData(data: unknown): string {
    try {
      const json = JSON.stringify(data, null, 2);
      return json.length > 2000 ? json.substring(0, 2000) + '\n... (truncated)' : json;
    } catch {
      return String(data);
    }
  }
}
