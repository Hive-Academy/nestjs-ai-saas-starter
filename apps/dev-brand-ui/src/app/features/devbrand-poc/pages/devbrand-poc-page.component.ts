import { Component, inject, OnDestroy } from '@angular/core';
import { ExecutionControlComponent } from '../components/execution-control.component';
import { AgentActivityPanelsComponent } from '../components/agent-activity-panels.component';
import { OrchestrationTimelineComponent } from '../components/orchestration-timeline.component';
import { DebugPanelComponent } from '../components/debug-panel.component';
import { DevBrandSseService } from '../services/devbrand-sse.service';
import { DevBrandWorkflowStateService } from '../services/devbrand-workflow-state.service';
import { ConversationSidebarComponent } from '../../../shared/components/conversation-sidebar/conversation-sidebar.component';
import { ConversationApiService } from '../../../shared/services/conversation-api.service';

/**
 * DevBrand POC Page Component
 *
 * **Purpose**: Smart container component that integrates all DevBrand POC UI components
 * into a single page with proper layout and lifecycle management.
 *
 * **Pattern**: Smart container component that orchestrates child components and coordinates
 * service lifecycle (WebSocket connection management).
 *
 * **Responsibilities**:
 * - Orchestrate child components (ExecutionControl, AgentActivityPanels, OrchestrationTimeline, DebugPanel)
 * - Manage SSE lifecycle (connect on execution start, disconnect on destroy)
 * - Coordinate workflow state service and SSE service
 * - Provide responsive single-column layout with sidebar
 *
 * **Template Structure**:
 * ```
 * Container (max-w-5xl, centered)
 * ├── Sidebar (280px, conversation list)
 * └── Main Content (single column)
 *     ├── Header (title, description)
 *     ├── Execution Control (workflow trigger)
 *     ├── Agent Activity Panels (full-width agent cards)
 *     ├── Orchestration Timeline (real-time narrative)
 *     └── Debug Panel (collapsed raw events)
 * ```
 *
 * **Integration Flow**:
 * 1. User triggers workflow execution via ExecutionControlComponent
 * 2. ExecutionControl emits executionStarted event with executionId
 * 3. onExecutionStarted() handler connects WebSocket with execution ID
 * 4. DevBrandWorkflowStateService subscribes to WebSocket streams
 * 5. ProgressVisualizationComponent displays agent progress (from state service)
 * 6. EventStreamComponent displays event feed (from state service)
 * 7. On component destroy, WebSocket is disconnected and resources cleaned up
 *
 * **Service Dependencies**:
 * - DevBrandSseService: SSE connection lifecycle
 * - DevBrandWorkflowStateService: Central state management (injected in child components)
 *
 * **Lifecycle**:
 * - OnDestroy: Disconnect SSE to prevent memory leaks
 *
 * @example
 * ```typescript
 * // Route configuration (devbrand-poc.routes.ts)
 * export const DEVBRAND_POC_ROUTES: Routes = [
 *   {
 *     path: '',
 *     loadComponent: () => import('./pages/devbrand-poc-page.component').then(
 *       (m) => m.DevbrandPocPageComponent
 *     ),
 *   },
 * ];
 *
 * // App routes integration (app.routes.ts)
 * {
 *   path: 'devbrand-poc',
 *   loadChildren: () => import('./features/devbrand-poc/devbrand-poc.routes').then(
 *     (m) => m.DEVBRAND_POC_ROUTES
 *   ),
 * }
 * ```
 *
 * @remarks
 * - Standalone component (no module required)
 * - Lazy-loaded via router for optimal bundle size
 * - Minimal logic (delegates to child components and services)
 * - Pure presentation container (no business logic)
 * - Responsive design with Tailwind CSS grid (mobile-first)
 *
 * @see {@link ExecutionControlComponent} - Workflow trigger form
 * @see {@link AgentActivityPanelsComponent} - Full-width agent activity panels
 * @see {@link OrchestrationTimelineComponent} - Real-time orchestration narrative
 * @see {@link DebugPanelComponent} - Collapsible raw event debug view
 * @see {@link DevBrandSseService} - SSE connection management
 * @see {@link DevBrandWorkflowStateService} - Central state orchestration
 */
@Component({
  selector: 'app-devbrand-poc-page',
  standalone: true,
  imports: [
    ExecutionControlComponent,
    AgentActivityPanelsComponent,
    OrchestrationTimelineComponent,
    DebugPanelComponent,
    ConversationSidebarComponent,
  ],
  template: `
    <div class="container mx-auto max-w-5xl px-4 py-8">
      <!-- Page Header -->
      <header class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">DevBrand Workflow</h1>
        <p class="mt-2 text-gray-600">
          Real-time multi-agent workflow orchestration
        </p>
      </header>

      <!-- Grid Layout with Sidebar -->
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        <!-- Sidebar Column -->
        <div>
          <app-conversation-sidebar
            workflowType="supervisor"
            [userId]="userId"
            [currentThreadId]="currentThreadId"
            (conversationSelected)="onConversationSelected($event)"
            (newConversationCreated)="onNewConversation($event)"
          />
        </div>

        <!-- Main Content Column (single-column layout) -->
        <div class="space-y-6">
          <!-- Execution Control -->
          <app-execution-control
            (executionStarted)="onExecutionStarted($event)"
          />

          <!-- Agent Activity Panels (full-width agent cards) -->
          <app-agent-activity-panels />

          <!-- Orchestration Timeline (primary narrative view) -->
          <app-orchestration-timeline />

          <!-- Debug Panel (collapsed raw events) -->
          <app-debug-panel />
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class DevbrandPocPageComponent implements OnDestroy {
  /**
   * SSE service for real-time event streaming.
   *
   * **Injected Service**: DevBrandSseService
   * **Usage**: Connect on workflow execution start, disconnect on component destroy
   */
  private readonly sseService = inject(DevBrandSseService);

  /**
   * Workflow state service for central state coordination.
   *
   * **Injected Service**: DevBrandWorkflowStateService
   * **Note**: Child components also inject this service to access shared state
   */
  private readonly workflowStateService = inject(DevBrandWorkflowStateService);

  /**
   * Conversation API service for conversation history management.
   */
  private readonly conversationApi = inject(ConversationApiService);

  /**
   * Test user ID for POC (hardcoded).
   */
  userId = 'test-supervisor-001';

  /**
   * Current conversation thread ID.
   */
  currentThreadId?: string;

  constructor() {
    console.log('🎬 [DevBrandPocPageComponent] Component constructed');
  }

  /**
   * Event handler for workflow execution start.
   *
   * **Triggered By**: ExecutionControlComponent emits executionStarted event with response data
   * **Responsibilities**:
   * 1. Connect SSE with backend stream URL from API response
   * 2. Subscribe workflow state service to execution stream
   *
   * **Flow**:
   * 1. User submits GitHub username via ExecutionControlComponent
   * 2. DevBrandApiService.executeWorkflow() returns executionId and streamUrl
   * 3. ExecutionControlComponent emits executionStarted with full response
   * 4. This handler receives event and initializes real-time tracking:
   *    - SSE connects to backend using streamUrl from API response
   *    - Workflow state service starts tracking execution
   *    - Child components (Progress, Events) automatically react to state updates
   *
   * @param response - Complete API response including executionId and streamUrl
   *
   * @remarks
   * - SSE connection uses URL from API response (NOT hardcoded)
   * - Workflow state service coordinates all child component state updates
   * - SSE automatically handles reconnection
   */
  onExecutionStarted(response: {
    executionId: string;
    streamUrl: string;
  }): void {
    console.log('🎯 [DevBrandPocPageComponent] onExecutionStarted() called');
    console.log(
      '🆔 [DevBrandPocPageComponent] Execution ID:',
      response.executionId
    );

    // Track current thread ID
    this.currentThreadId = response.executionId;

    console.log('✅ [DevBrandPocPageComponent] Workflow execution started');
  }

  /**
   * Handle conversation selection from sidebar.
   */
  onConversationSelected(threadId: string): void {
    this.currentThreadId = threadId;
    console.log(
      '📜 [DevBrandPocPageComponent] Conversation selected:',
      threadId
    );
    // Optionally: Load conversation history and display
  }

  /**
   * Handle new conversation creation from sidebar.
   */
  onNewConversation(threadId: string): void {
    this.currentThreadId = threadId;
    console.log(
      '🆕 [DevBrandPocPageComponent] New conversation created:',
      threadId
    );
    // Reset workflow state
  }

  /**
   * Angular lifecycle hook: Component destruction.
   *
   * **Purpose**: Clean up SSE connection to prevent memory leaks.
   *
   * **Cleanup Actions**:
   * 1. Disconnect SSE (closes EventSource connection)
   * 2. DevBrandSseService completes all observables
   * 3. Workflow state service subscriptions auto-cleanup via takeUntilDestroyed()
   *
   * **Why OnDestroy is Critical**:
   * - SSE connections persist after navigation if not closed
   * - Memory leaks from active subscriptions
   * - Backend resources held open (connection slots)
   * - Ghost connections continue receiving events unnecessarily
   *
   * @remarks
   * - Called automatically by Angular on route navigation or component destruction
   * - Child component cleanup handled by takeUntilDestroyed() in their constructors
   * - SSE service disconnect() completes all Subject observables
   */
  ngOnDestroy(): void {
    // Disconnect SSE and clean up resources
    console.log(
      '🧹 [DevBrandPocPageComponent] ngOnDestroy - disconnecting SSE'
    );
    this.sseService.disconnect();
  }
}
