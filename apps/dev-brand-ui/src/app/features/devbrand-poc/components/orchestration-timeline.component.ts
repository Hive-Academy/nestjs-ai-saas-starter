import {
  Component,
  ChangeDetectionStrategy,
  inject,
  ElementRef,
  effect,
  viewChild,
  computed,
} from '@angular/core';
import { DevBrandWorkflowStateService } from '../services/devbrand-workflow-state.service';
import { StreamingTextDisplayComponent } from './streaming-text-display.component';

/**
 * OrchestrationTimelineComponent
 *
 * Primary narrative view showing the workflow as a conversation-thread-style timeline.
 * Each timeline entry is rendered as a styled card based on its type.
 *
 * @remarks
 * **Purpose**:
 * - Display workflow orchestration as a chronological narrative
 * - Show supervisor delegation, agent activity, tool executions, errors, and completions
 * - Include streaming text display for agents that are actively generating content
 * - Auto-scroll to bottom on new entries for real-time following
 *
 * **Timeline Entry Types**:
 * - workflow-start: Blue card with workflow start info
 * - delegation: Purple card with arrow icon, "Supervisor -> [Agent Name]"
 * - agent-start / agent-thinking: Indigo card with status icon, agent name, streaming text
 * - tool-execution: Gray sub-entry (indented), tool name and result
 * - agent-error: Red card with error icon, agent name, human-readable error message
 * - agent-complete: Green card with checkmark, agent name, "Completed"
 * - workflow-complete: Blue card with completion status
 *
 * @public
 */
@Component({
  selector: 'app-orchestration-timeline',
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
        Orchestration Timeline
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
        @for (entry of stateService.timelineEntries(); track entry.id) { @switch
        (entry.type) { @case ('workflow-start') {
        <div
          class="flex items-start gap-3 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg"
        >
          <span class="text-xl flex-shrink-0 mt-0.5">&#x1F680;</span>
          <div class="min-w-0">
            <p class="font-medium text-blue-900">{{ entry.message }}</p>
            <p class="text-xs text-blue-600 mt-1">
              {{ formattedTimestamps()[entry.id] }}
            </p>
          </div>
        </div>
        } @case ('delegation') {
        <div
          class="flex items-start gap-3 p-4 bg-purple-50 border-l-4 border-purple-500 rounded-r-lg"
        >
          <span class="text-xl flex-shrink-0 mt-0.5">&#x27A1;&#xFE0F;</span>
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
        } @case ('agent-start') {
        <div
          class="flex items-start gap-3 p-4 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-lg"
        >
          <span class="flex-shrink-0 mt-1">
            <svg
              class="h-5 w-5 text-indigo-600 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
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
          <div class="min-w-0 flex-1">
            <p class="font-medium text-indigo-900">
              {{ entry.agentName || entry.agentId || 'Agent' }}
            </p>
            <p class="text-sm text-indigo-700">{{ entry.message }}</p>
            <p class="text-xs text-indigo-500 mt-1">
              {{ formattedTimestamps()[entry.id] }}
            </p>
            @if (entry.agentId && streamingTextMap()[entry.agentId]) {
            <div class="mt-3">
              <app-streaming-text-display
                [text]="streamingTextMap()[entry.agentId]"
                [isActive]="entry.status === 'active'"
                [label]="(entry.agentName || entry.agentId) + ' Output'"
              />
            </div>
            }
          </div>
        </div>
        } @case ('agent-thinking') {
        <div
          class="flex items-start gap-3 p-4 bg-indigo-50 border-l-4 border-indigo-400 rounded-r-lg"
        >
          <span class="flex-shrink-0 mt-1">
            <svg
              class="h-5 w-5 text-indigo-500 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
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
          <div class="min-w-0 flex-1">
            <p class="font-medium text-indigo-900">
              {{ entry.agentName || entry.agentId || 'Agent' }}
            </p>
            <p class="text-sm text-indigo-600">{{ entry.message }}</p>
            <p class="text-xs text-indigo-500 mt-1">
              {{ formattedTimestamps()[entry.id] }}
            </p>
            @if (entry.agentId && streamingTextMap()[entry.agentId]) {
            <div class="mt-3">
              <app-streaming-text-display
                [text]="streamingTextMap()[entry.agentId]"
                [isActive]="entry.status === 'active'"
                [label]="(entry.agentName || entry.agentId) + ' Output'"
              />
            </div>
            }
          </div>
        </div>
        } @case ('tool-execution') {
        <div class="ml-8 p-3 bg-gray-50 border-l-2 border-gray-300 rounded-r">
          <div class="flex items-center gap-2">
            <span class="text-sm">&#x1F527;</span>
            <p class="text-sm text-gray-700 font-medium">
              {{ entry.message }}
            </p>
            @if (entry.status === 'completed') {
            <span
              class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700"
            >
              Done
            </span>
            } @if (entry.status === 'error') {
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
        } @case ('agent-error') {
        <div
          class="flex items-start gap-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg"
        >
          <span class="text-xl flex-shrink-0 mt-0.5">&#x274C;</span>
          <div class="min-w-0">
            <p class="font-medium text-red-900">
              {{ entry.agentName || entry.agentId || 'Agent' }}: Error
            </p>
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
        } @case ('agent-complete') {
        <div
          class="flex items-start gap-3 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg"
        >
          <span class="text-xl flex-shrink-0 mt-0.5">&#x2705;</span>
          <div class="min-w-0">
            <p class="font-medium text-green-900">{{ entry.message }}</p>
            @if (entry.detail) {
            <p class="text-sm text-green-700 mt-1">{{ entry.detail }}</p>
            }
            <p class="text-xs text-green-600 mt-1">
              {{ formattedTimestamps()[entry.id] }}
            </p>
          </div>
        </div>
        } @case ('workflow-complete') {
        <div
          class="flex items-start gap-3 p-4 bg-blue-50 border-l-4 border-blue-600 rounded-r-lg"
        >
          <span class="text-xl flex-shrink-0 mt-0.5">&#x1F3C1;</span>
          <div class="min-w-0">
            <p class="font-medium text-blue-900">{{ entry.message }}</p>
            <p class="text-xs text-blue-600 mt-1">
              {{ formattedTimestamps()[entry.id] }}
            </p>
          </div>
        </div>
        } } } @empty {
        <div class="text-center text-gray-400 py-8">
          <svg
            class="mx-auto h-12 w-12 text-gray-300 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="text-sm font-medium">Waiting for workflow to start...</p>
          <p class="text-xs mt-1">
            Timeline entries will appear here once execution begins.
          </p>
        </div>
        }
      </div>
    </div>
  `,
})
export class OrchestrationTimelineComponent {
  /** Workflow state service for reading timeline, streaming text, and agent progress signals */
  readonly stateService = inject(DevBrandWorkflowStateService);

  /** Scroll container reference for auto-scroll behavior */
  private readonly scrollContainer =
    viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  /**
   * Pre-computed streaming text map - avoids method calls in template.
   * Returns the full Record<string, string> for template access.
   */
  readonly streamingTextMap = computed(() => this.stateService.streamingText());

  /**
   * Pre-computed timestamp map keyed by timeline entry ID.
   * Avoids calling formatTimestamp() on every change detection cycle.
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
      // Read the signal to create the dependency
      const entries = this.stateService.timelineEntries();
      const containerRef = this.scrollContainer();

      if (entries.length > 0 && containerRef) {
        // Schedule scroll after the DOM has updated
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
