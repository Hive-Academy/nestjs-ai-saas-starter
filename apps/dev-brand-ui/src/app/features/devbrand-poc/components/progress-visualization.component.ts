import { Component, computed, inject } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { DevBrandWorkflowStateService } from '../services/devbrand-workflow-state.service';
import { AgentProgress } from '../models/agent-progress.model';

/**
 * Agent Display Information Interface
 *
 * Metadata for displaying agent information in the UI.
 *
 * @remarks
 * - Maps internal agent IDs to human-readable names
 * - Provides visual indicators (icons/emojis) for each agent
 * - Includes descriptive text for user understanding
 *
 * @internal
 */
interface AgentDisplayInfo {
  /** Human-readable agent name */
  name: string;
  /** Visual icon/emoji for the agent */
  icon: string;
  /** Description of agent's role/purpose */
  description: string;
}

/**
 * Agent View Model Interface
 *
 * Combines display metadata with real-time progress state.
 *
 * @remarks
 * - Used for rendering agent cards in the template
 * - Merges static metadata with dynamic progress data
 *
 * @internal
 */
interface AgentViewModel {
  /** Internal agent ID (e.g., 'github-code-analyzer') */
  id: string;
  /** Human-readable name */
  name: string;
  /** Visual icon/emoji */
  icon: string;
  /** Role description */
  description: string;
  /** Real-time progress state from DevBrandWorkflowStateService */
  progress: AgentProgress;
}

/**
 * Progress Visualization Component
 *
 * Real-time workflow progress with 3-agent visualization.
 * Evidence: implementation-plan.md:822-1010 (ProgressVisualizationComponent specification)
 *
 * @remarks
 * **Purpose**:
 * - Display overall workflow progress (0-100%)
 * - Show individual progress for 3 agents in parallel execution
 * - Visualize agent status (idle/thinking/executing/waiting/completed/error)
 * - Highlight current active agent
 *
 * **Component Pattern**:
 * - Standalone component (Angular 19+ pattern)
 * - Signal-based reactive state (NO ngOnInit)
 * - Modern control flow (@for/@if, NOT *ngFor/*ngIf)
 * - Modern inject() pattern (NOT constructor injection)
 *
 * **State Management**:
 * - All state derived from DevBrandWorkflowStateService signals
 * - NO local state mutation
 * - Computed signals for agent view models
 * - Automatic reactivity on service state changes
 *
 * **3-Agent Workflow** (Evidence: research-summary.md:148-302):
 * 1. **github-code-analyzer**: Repository structure and code pattern analysis
 * 2. **personal-brand-strategist**: Brand strategy and positioning development
 * 3. **content-creator**: Platform-specific content generation
 *
 * **Visual Design**:
 * - Overall progress bar with percentage (0-100%)
 * - 3 agent cards with responsive grid (grid-cols-1 md:grid-cols-3)
 * - Status badges with color coding
 * - Status icons (clock/spinner/checkmark for pending/active/completed)
 * - Current action text display
 * - Active agent highlighting
 *
 * **Tailwind Status Colors**:
 * - idle: bg-gray-200 text-gray-700
 * - thinking: bg-blue-200 text-blue-700
 * - executing: bg-green-200 text-green-700
 * - waiting: bg-yellow-200 text-yellow-700
 * - completed: bg-emerald-200 text-emerald-700
 * - error: bg-red-200 text-red-700
 *
 * @example
 * ```typescript
 * // Usage in parent component
 * import { ProgressVisualizationComponent } from './components/progress-visualization.component';
 *
 * @Component({
 *   selector: 'app-devbrand-poc-page',
 *   imports: [ProgressVisualizationComponent],
 *   template: `<app-progress-visualization />`
 * })
 * export class DevBrandPOCPageComponent {}
 * ```
 *
 * @public
 * @standalone
 */
@Component({
  selector: 'app-progress-visualization',
  standalone: true,
  imports: [UpperCasePipe],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-6">
        Workflow Progress
      </h3>

      <!-- Overall Progress Bar -->
      <div class="mb-8">
        <div class="flex justify-between text-sm text-gray-600 mb-2">
          <span>Overall Progress</span>
          <span class="font-semibold">{{ workflowProgress() }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3">
          <div
            class="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out"
            [style.width.%]="workflowProgress()"
          ></div>
        </div>
      </div>

      <!-- Agent Progress Cards (3 agents) -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        @for (agent of agents(); track agent.id) {
        <div
          class="border rounded-lg p-4 transition-all duration-300"
          [class.border-indigo-500]="currentAgent() === agent.id"
          [class.bg-indigo-50]="currentAgent() === agent.id"
          [class.shadow-md]="currentAgent() === agent.id"
        >
          <!-- Agent Icon/Avatar -->
          <div class="flex items-center gap-3 mb-3">
            <div
              class="text-3xl w-12 h-12 flex items-center justify-center rounded-full"
              [class.bg-gray-100]="agent.progress.status === 'idle'"
              [class.bg-amber-100]="agent.progress.status === 'delegated'"
              [class.bg-blue-100]="agent.progress.status === 'thinking'"
              [class.bg-green-100]="agent.progress.status === 'executing'"
              [class.bg-yellow-100]="agent.progress.status === 'waiting'"
              [class.bg-emerald-100]="agent.progress.status === 'completed'"
              [class.bg-red-100]="agent.progress.status === 'error'"
            >
              {{ agent.icon }}
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="font-semibold text-gray-900 text-sm truncate">
                {{ agent.name }}
              </h4>
              <p class="text-xs text-gray-500 truncate">
                {{ agent.description }}
              </p>
            </div>
          </div>

          <!-- Status Badge -->
          <div class="mb-3">
            <span
              class="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full"
              [class.bg-gray-200]="agent.progress.status === 'idle'"
              [class.text-gray-700]="agent.progress.status === 'idle'"
              [class.bg-amber-200]="agent.progress.status === 'delegated'"
              [class.text-amber-700]="agent.progress.status === 'delegated'"
              [class.bg-blue-200]="agent.progress.status === 'thinking'"
              [class.text-blue-700]="agent.progress.status === 'thinking'"
              [class.bg-green-200]="agent.progress.status === 'executing'"
              [class.text-green-700]="agent.progress.status === 'executing'"
              [class.bg-yellow-200]="agent.progress.status === 'waiting'"
              [class.text-yellow-700]="agent.progress.status === 'waiting'"
              [class.bg-emerald-200]="agent.progress.status === 'completed'"
              [class.text-emerald-700]="agent.progress.status === 'completed'"
              [class.bg-red-200]="agent.progress.status === 'error'"
              [class.text-red-700]="agent.progress.status === 'error'"
            >
              {{ agent.progress.status | uppercase }}
            </span>
          </div>

          <!-- Progress Bar -->
          <div class="mb-3">
            <div class="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span class="font-medium">{{ agent.progress.progress }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div
                class="h-2 rounded-full transition-all duration-500"
                [class.bg-gray-400]="agent.progress.status === 'idle'"
                [class.bg-amber-500]="agent.progress.status === 'delegated'"
                [class.bg-blue-500]="agent.progress.status === 'thinking'"
                [class.bg-green-500]="agent.progress.status === 'executing'"
                [class.bg-yellow-500]="agent.progress.status === 'waiting'"
                [class.bg-emerald-500]="agent.progress.status === 'completed'"
                [class.bg-red-500]="agent.progress.status === 'error'"
                [style.width.%]="agent.progress.progress"
              ></div>
            </div>
          </div>

          <!-- Current Action -->
          @if (agent.progress.currentAction) {
          <div
            class="text-xs text-gray-700 bg-gray-50 rounded p-2 border border-gray-200"
          >
            <span class="font-medium text-gray-900">Current:</span>
            {{ agent.progress.currentAction }}
          </div>
          } @else {
          <div class="text-xs text-gray-400 italic">No current action</div>
          }
        </div>
        }
      </div>

      <!-- Active Agent Indicator (shown when workflow is executing) -->
      @if (isExecuting() && currentAgent()) {
      <div class="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
        <div class="flex items-center gap-3">
          <div class="flex-shrink-0">
            <div class="w-3 h-3 bg-indigo-600 rounded-full animate-pulse"></div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-indigo-900">
              Currently Active: {{ getAgentName(currentAgent()!) }}
            </p>
            <p class="text-xs text-indigo-700 mt-0.5">
              Workflow execution in progress...
            </p>
          </div>
        </div>
      </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class ProgressVisualizationComponent {
  /**
   * DevBrand Workflow State Service
   * @private
   * @remarks
   * - Provides agentProgress signal (AgentProgressMap)
   * - Provides workflowProgress computed signal (0-100%)
   * - Provides isExecuting computed signal (boolean)
   * - Provides currentAgent computed signal (string | null)
   */
  private readonly workflowStateService = inject(DevBrandWorkflowStateService);

  /**
   * Agent Display Information Map
   * @private
   * @readonly
   * @remarks
   * - Maps internal agent IDs to human-readable names and icons
   * - Evidence: research-summary.md:148-302 (3-agent workflow analysis)
   * - Order matches workflow execution sequence
   */
  private readonly agentDisplayInfo: Record<string, AgentDisplayInfo> = {
    'github-code-analyzer': {
      name: 'GitHub Code Analyzer',
      icon: '🔍',
      description: 'Analyzing repository structure and code patterns',
    },
    'personal-brand-strategist': {
      name: 'Personal Brand Strategist',
      icon: '🎯',
      description: 'Crafting personalized brand strategy',
    },
    'content-creator': {
      name: 'Content Creator',
      icon: '✍️',
      description: 'Generating personalized content',
    },
  };

  /**
   * Agent Progress Signal
   * @public
   * @remarks
   * - Readonly signal from DevBrandWorkflowStateService
   * - Contains progress for all 3 agents (AgentProgressMap)
   * - Automatically updates on WebSocket events
   */
  readonly agentProgress = this.workflowStateService.agentProgress;

  /**
   * Workflow Progress Signal
   * @public
   * @remarks
   * - Computed signal from DevBrandWorkflowStateService
   * - Returns overall progress percentage (0-100)
   * - Formula: (completed agents / 3) * 100
   */
  readonly workflowProgress = this.workflowStateService.workflowProgress;

  /**
   * Is Executing Signal
   * @public
   * @remarks
   * - Computed signal from DevBrandWorkflowStateService
   * - Returns true when workflow status is 'running'
   * - Used for conditional rendering of active agent indicator
   */
  readonly isExecuting = this.workflowStateService.isExecuting;

  /**
   * Current Agent Signal
   * @public
   * @remarks
   * - Computed signal from DevBrandWorkflowStateService
   * - Returns ID of currently active agent (thinking/executing/waiting)
   * - Returns null if no agent is active
   * - Used for highlighting active agent card
   */
  readonly currentAgent = this.workflowStateService.currentAgent;

  /**
   * Agent View Models (Computed)
   * @public
   * @remarks
   * - Combines static display metadata with real-time progress state
   * - Returns array of 3 agents in execution order
   * - Automatically recalculates when agentProgress signal updates
   * - Used for rendering agent cards in template with @for loop
   *
   * @returns Array of AgentViewModel objects
   *
   * @example
   * ```typescript
   * // Template usage
   * @for (agent of agents(); track agent.id) {
   *   <div>{{ agent.name }}: {{ agent.progress.status }}</div>
   * }
   * ```
   */
  readonly agents = computed<AgentViewModel[]>(() => {
    const progress = this.agentProgress();

    return [
      {
        id: 'github-code-analyzer',
        ...this.agentDisplayInfo['github-code-analyzer'],
        progress: progress['github-code-analyzer'],
      },
      {
        id: 'personal-brand-strategist',
        ...this.agentDisplayInfo['personal-brand-strategist'],
        progress: progress['personal-brand-strategist'],
      },
      {
        id: 'content-creator',
        ...this.agentDisplayInfo['content-creator'],
        progress: progress['content-creator'],
      },
    ];
  });

  /**
   * Get Agent Human-Readable Name
   *
   * @param agentId - Internal agent ID (e.g., 'github-code-analyzer')
   * @returns Human-readable agent name (e.g., 'GitHub Code Analyzer')
   *
   * @remarks
   * - Helper method for displaying agent name in UI
   * - Falls back to agentId if not found in display info map
   * - Used in active agent indicator template section
   *
   * @public
   */
  getAgentName(agentId: string): string {
    return this.agentDisplayInfo[agentId]?.name || agentId;
  }
}
