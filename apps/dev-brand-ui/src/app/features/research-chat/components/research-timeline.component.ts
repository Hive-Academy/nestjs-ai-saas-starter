import {
  Component,
  ChangeDetectionStrategy,
  inject,
  ElementRef,
  effect,
  viewChild,
  computed,
} from '@angular/core';
import { ResearchWorkflowStateService } from '../services/research-workflow-state.service';
import { StreamingTextDisplayComponent } from '../../devbrand-poc/components/streaming-text-display.component';

/**
 * ResearchTimelineComponent
 *
 * Narrative timeline view for research workflow execution.
 * Displays chronological entries for each phase of the single-agent research workflow,
 * including search, reading, synthesis, tool executions, HITL approval, and completion.
 *
 * Adapted from OrchestrationTimelineComponent for single-agent research phases
 * instead of multi-agent supervisor delegation.
 *
 * @remarks
 * - Reads all state from ResearchWorkflowStateService signals
 * - Uses @switch on entry.type for type-specific card rendering
 * - Auto-scrolls to bottom on new entries
 * - Includes StreamingTextDisplayComponent for LLM output during synthesis
 *
 * @public
 */
@Component({
  selector: 'app-research-timeline',
  standalone: true,
  imports: [StreamingTextDisplayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">
        Research Timeline
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 ml-2"
        >
          {{ stateService.timelineEntries().length }}
        </span>
      </h3>

      <div
        #scrollContainer
        class="space-y-3 max-h-[600px] overflow-y-auto pr-1"
      >
        @for (entry of stateService.timelineEntries(); track entry.id) {
          @switch (entry.type) {
            @case ('research-start') {
              <div
                class="flex items-start gap-3 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg"
              >
                <span class="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">&#x1F680;</span>
                <div class="min-w-0">
                  <p class="font-medium text-blue-900">{{ entry.message }}</p>
                  @if (entry.detail) {
                    <p class="text-sm text-blue-700 mt-1">{{ entry.detail }}</p>
                  }
                  <p class="text-xs text-blue-600 mt-1">
                    {{ formattedTimestamps()[entry.id] }}
                  </p>
                </div>
              </div>
            }
            @case ('searching') {
              <div
                class="flex items-start gap-3 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg"
              >
                @if (entry.status === 'active') {
                  <span class="flex-shrink-0 mt-1">
                    <svg
                      class="h-5 w-5 text-amber-600 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      />
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </span>
                } @else {
                  <span class="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">&#x1F50D;</span>
                }
                <div class="min-w-0">
                  <p class="font-medium text-amber-900">{{ entry.message }}</p>
                  @if (entry.detail) {
                    <p class="text-sm text-amber-700 mt-1">{{ entry.detail }}</p>
                  }
                  <p class="text-xs text-amber-600 mt-1">
                    {{ formattedTimestamps()[entry.id] }}
                  </p>
                </div>
              </div>
            }
            @case ('reading-source') {
              <div
                class="flex items-start gap-3 p-4 bg-cyan-50 border-l-4 border-cyan-500 rounded-r-lg"
              >
                <span class="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">&#x1F4D6;</span>
                <div class="min-w-0">
                  <p class="font-medium text-cyan-900">{{ entry.message }}</p>
                  @if (entry.detail) {
                    <p class="text-sm text-cyan-700 mt-1 break-words">{{ entry.detail }}</p>
                  }
                  <p class="text-xs text-cyan-600 mt-1">
                    {{ formattedTimestamps()[entry.id] }}
                  </p>
                </div>
              </div>
            }
            @case ('synthesizing') {
              <div
                class="flex items-start gap-3 p-4 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-lg"
              >
                <span class="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">&#x1F9E0;</span>
                <div class="min-w-0 flex-1">
                  <p class="font-medium text-indigo-900">{{ entry.message }}</p>
                  <p class="text-xs text-indigo-500 mt-1">
                    {{ formattedTimestamps()[entry.id] }}
                  </p>
                  @if (stateService.streamingText()) {
                    <div class="mt-3">
                      <app-streaming-text-display
                        [text]="stateService.streamingText()"
                        [isActive]="stateService.isStreaming()"
                        [label]="'Research Synthesis'"
                      />
                    </div>
                  }
                </div>
              </div>
            }
            @case ('tool-execution') {
              <div class="ml-8 p-3 bg-gray-50 border-l-2 border-gray-300 rounded-r">
                <div class="flex items-center gap-2">
                  <span class="text-sm" aria-hidden="true">&#x1F527;</span>
                  <p class="text-sm text-gray-700 font-medium">
                    {{ entry.message }}
                  </p>
                  @if (entry.status === 'completed') {
                    <span
                      class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700"
                    >
                      Done
                    </span>
                  }
                  @if (entry.status === 'error') {
                    <span
                      class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700"
                    >
                      Failed
                    </span>
                  }
                </div>
                @if (entry.detail) {
                  <p class="text-xs text-gray-500 mt-1 truncate">
                    {{ entry.detail }}
                  </p>
                }
                <p class="text-xs text-gray-400 mt-1">
                  {{ formattedTimestamps()[entry.id] }}
                </p>
              </div>
            }
            @case ('report-draft') {
              <div
                class="flex items-start gap-3 p-4 bg-purple-50 border-l-4 border-purple-500 rounded-r-lg"
              >
                <span class="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">&#x1F4C4;</span>
                <div class="min-w-0">
                  <p class="font-medium text-purple-900">{{ entry.message }}</p>
                  @if (entry.detail) {
                    <p class="text-sm text-purple-700 mt-1">{{ entry.detail }}</p>
                  }
                  <p class="text-xs text-purple-600 mt-1">
                    {{ formattedTimestamps()[entry.id] }}
                  </p>
                </div>
              </div>
            }
            @case ('approval-waiting') {
              <div
                class="flex items-start gap-3 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg"
              >
                <span class="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">&#x23F8;&#xFE0F;</span>
                <div class="min-w-0">
                  <p class="font-medium text-yellow-900">{{ entry.message }}</p>
                  @if (entry.detail) {
                    <p class="text-sm text-yellow-700 mt-1">{{ entry.detail }}</p>
                  }
                  <p class="text-xs text-yellow-600 mt-1">
                    {{ formattedTimestamps()[entry.id] }}
                  </p>
                </div>
              </div>
            }
            @case ('approval-decision') {
              <div
                class="flex items-start gap-3 p-4 border-l-4 rounded-r-lg"
                [class]="entry.detail?.includes('rejected') || entry.detail?.includes('Rejected')
                  ? 'bg-red-50 border-red-500'
                  : 'bg-green-50 border-green-500'"
              >
                <span class="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">
                  {{ entry.detail?.includes('rejected') || entry.detail?.includes('Rejected') ? '&#x274C;' : '&#x2705;' }}
                </span>
                <div class="min-w-0">
                  <p
                    class="font-medium"
                    [class]="entry.detail?.includes('rejected') || entry.detail?.includes('Rejected')
                      ? 'text-red-900'
                      : 'text-green-900'"
                  >
                    {{ entry.message }}
                  </p>
                  @if (entry.detail) {
                    <p
                      class="text-sm mt-1"
                      [class]="entry.detail?.includes('rejected') || entry.detail?.includes('Rejected')
                        ? 'text-red-700'
                        : 'text-green-700'"
                    >
                      {{ entry.detail }}
                    </p>
                  }
                  <p
                    class="text-xs mt-1"
                    [class]="entry.detail?.includes('rejected') || entry.detail?.includes('Rejected')
                      ? 'text-red-600'
                      : 'text-green-600'"
                  >
                    {{ formattedTimestamps()[entry.id] }}
                  </p>
                </div>
              </div>
            }
            @case ('research-complete') {
              <div
                class="flex items-start gap-3 p-4 bg-blue-100 border-l-4 border-blue-600 rounded-r-lg"
              >
                <span class="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">&#x1F3C1;</span>
                <div class="min-w-0">
                  <p class="font-medium text-blue-900">{{ entry.message }}</p>
                  @if (entry.detail) {
                    <p class="text-sm text-blue-700 mt-1">{{ entry.detail }}</p>
                  }
                  <p class="text-xs text-blue-600 mt-1">
                    {{ formattedTimestamps()[entry.id] }}
                  </p>
                </div>
              </div>
            }
            @case ('error') {
              <div
                class="flex items-start gap-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg"
              >
                <span class="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">&#x274C;</span>
                <div class="min-w-0">
                  <p class="font-medium text-red-900">Error</p>
                  <p class="text-sm text-red-700 mt-1">{{ entry.message }}</p>
                  @if (entry.detail) {
                    <p class="text-xs text-red-600 mt-1 break-words">
                      {{ entry.detail }}
                    </p>
                  }
                  <p class="text-xs text-red-500 mt-1">
                    {{ formattedTimestamps()[entry.id] }}
                  </p>
                </div>
              </div>
            }
          }
        } @empty {
          <div class="text-center text-gray-400 py-8">
            <svg
              class="mx-auto h-12 w-12 text-gray-300 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p class="text-sm font-medium">Start a research query to see the timeline...</p>
            <p class="text-xs mt-1">
              Timeline entries will appear here once execution begins.
            </p>
          </div>
        }
      </div>
    </div>
  `,
})
export class ResearchTimelineComponent {
  /** Research workflow state service for reading timeline and streaming signals */
  readonly stateService = inject(ResearchWorkflowStateService);

  /** Scroll container reference for auto-scroll behavior */
  private readonly scrollContainer =
    viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  /**
   * Pre-computed timestamp map keyed by timeline entry ID.
   * Avoids calling toLocaleTimeString() on every change detection cycle.
   */
  readonly formattedTimestamps = computed(() => {
    const entries = this.stateService.timelineEntries();
    const map: Record<string, string> = {};
    for (const entry of entries) {
      map[entry.id] = entry.timestamp.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }
    return map;
  });

  constructor() {
    // Auto-scroll to bottom when new timeline entries are added
    effect(() => {
      const entries = this.stateService.timelineEntries();
      const containerRef = this.scrollContainer();

      if (entries.length > 0 && containerRef) {
        requestAnimationFrame(() => {
          const container = containerRef.nativeElement;
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        });
      }
    });
  }
}
