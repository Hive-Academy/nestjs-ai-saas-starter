import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { DevBrandWorkflowStateService } from '../services/devbrand-workflow-state.service';
import { StreamingTextDisplayComponent } from './streaming-text-display.component';
import { AgentProgress, AgentStatus } from '../models/agent-progress.model';
import { AgentError } from '../models/timeline.model';

/**
 * Agent metadata for display in the activity panels.
 */
interface AgentMetadata {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly description: string;
}

/**
 * Agent view model combining static metadata with dynamic state.
 */
interface AgentViewModel {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly description: string;
  readonly progress: AgentProgress;
  readonly streamingText: string;
  readonly error: AgentError | null;
  readonly isActive: boolean;
}

/** All agents including supervisor, ordered for display */
const AGENT_METADATA: readonly AgentMetadata[] = [
  {
    id: 'supervisor',
    name: 'Supervisor',
    icon: '\u{1F9E0}',
    description: 'Orchestrates agent delegation and workflow routing',
  },
  {
    id: 'github-code-analyzer',
    name: 'GitHub Code Analyzer',
    icon: '\u{1F50D}',
    description: 'Analyzes repositories and extracts technical achievements',
  },
  {
    id: 'personal-brand-strategist',
    name: 'Personal Brand Strategist',
    icon: '\u{1F3AF}',
    description: 'Develops brand strategy and professional positioning',
  },
  {
    id: 'content-creator',
    name: 'Content Creator',
    icon: '\u{270D}\u{FE0F}',
    description: 'Generates platform-specific content and posts',
  },
] as const;

/**
 * AgentActivityPanelsComponent
 *
 * Displays full-width panels for each agent in the DevBrand workflow,
 * showing status, streaming text, and errors.
 *
 * @remarks
 * **Purpose**:
 * - Show all 4 agents (supervisor + 3 workers) as full-width cards
 * - Active agent gets highlighted border and background
 * - Status badge with color coding per agent status
 * - Streaming text display for agents actively generating content
 * - Error display with red styling for agents with errors
 *
 * @public
 */
@Component({
  selector: 'app-agent-activity-panels',
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
    <div class="space-y-4">
      @for (agent of agentViewModels(); track agent.id) {
        <div
          class="rounded-lg border p-5 transition-all duration-200"
          [class.border-indigo-500]="agent.isActive"
          [class.bg-indigo-50/50]="agent.isActive"
          [class.shadow-md]="agent.isActive"
          [class.border-gray-200]="!agent.isActive"
        >
          <!-- Header: Icon + Name + Status Badge -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <span class="text-2xl">{{ agent.icon }}</span>
              <div>
                <h4 class="font-semibold text-gray-900">{{ agent.name }}</h4>
                <p class="text-sm text-gray-500">{{ agent.description }}</p>
              </div>
            </div>
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
              [class]="getStatusBadgeClasses(agent.progress.status)"
            >
              {{ agent.progress.status }}
            </span>
          </div>

          <!-- Current Action -->
          @if (agent.progress.currentAction) {
            <p class="text-sm text-gray-700 mb-3">
              {{ agent.progress.currentAction }}
            </p>
          }

          <!-- Progress Bar (when executing or thinking) -->
          @if (agent.progress.progress > 0 && agent.progress.progress < 100) {
            <div class="w-full bg-gray-200 rounded-full h-1.5 mb-3">
              <div
                class="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                [style.width.%]="agent.progress.progress"
              ></div>
            </div>
          }

          <!-- Streaming Text -->
          @if (agent.streamingText) {
            <div class="mt-3">
              <app-streaming-text-display
                [text]="agent.streamingText"
                [isActive]="agent.isActive"
                [label]="agent.name + ' Output'"
              />
            </div>
          }

          <!-- Error Display -->
          @if (agent.error) {
            <div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p class="text-sm text-red-800 font-medium">Error</p>
              <p class="text-sm text-red-600 mt-1">{{ agent.error.message }}</p>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AgentActivityPanelsComponent {
  /** Workflow state service providing agent progress, streaming text, and error signals */
  private readonly stateService = inject(DevBrandWorkflowStateService);

  /**
   * Computed view models combining agent metadata with dynamic state.
   * Produces a flat array of AgentViewModel for template iteration.
   */
  readonly agentViewModels = computed<AgentViewModel[]>(() => {
    const agentProgress = this.stateService.agentProgress();
    const streamingText = this.stateService.streamingText();
    const errors = this.stateService.errors();
    const currentAgent = this.stateService.currentAgent();

    return AGENT_METADATA.map((meta) => {
      const progress: AgentProgress = agentProgress[meta.id] || {
        agentId: meta.id,
        agentName: meta.name,
        status: 'idle' as AgentStatus,
        progress: 0,
        currentAction: null,
        lastUpdate: new Date(),
      };

      const agentError = errors.find((err) => err.agentId === meta.id) || null;

      return {
        id: meta.id,
        name: meta.name,
        icon: meta.icon,
        description: meta.description,
        progress,
        streamingText: streamingText[meta.id] || '',
        error: agentError,
        isActive: currentAgent === meta.id,
      };
    });
  });

  /**
   * Get CSS classes for a status badge based on agent status.
   */
  getStatusBadgeClasses(status: AgentStatus): string {
    switch (status) {
      case 'idle':
        return 'bg-gray-100 text-gray-600';
      case 'delegated':
        return 'bg-yellow-100 text-yellow-700';
      case 'thinking':
        return 'bg-blue-100 text-blue-700';
      case 'executing':
        return 'bg-indigo-100 text-indigo-700';
      case 'waiting':
        return 'bg-amber-100 text-amber-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }
}
