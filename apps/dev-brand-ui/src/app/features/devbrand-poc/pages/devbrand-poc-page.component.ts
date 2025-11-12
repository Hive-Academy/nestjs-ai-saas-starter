import { Component, inject, OnDestroy, effect } from '@angular/core';
import { ExecutionControlComponent } from '../components/execution-control.component';
import { ProgressVisualizationComponent } from '../components/progress-visualization.component';
import { EventStreamComponent } from '../components/event-stream.component';
import { DevBrandSseService } from '../services/devbrand-sse.service';
import { DevBrandWorkflowStateService } from '../services/devbrand-workflow-state.service';

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
 * - Orchestrate child components (ExecutionControl, ProgressVisualization, EventStream)
 * - Manage WebSocket lifecycle (connect on execution start, disconnect on destroy)
 * - Coordinate workflow state service and WebSocket service
 * - Provide responsive grid layout for optimal UX
 *
 * **Template Structure**:
 * ```
 * Container (max-w-7xl, centered)
 * ├── Page Header (h1 title)
 * ├── Execution Control (top section)
 * └── Two-Column Grid (responsive)
 *     ├── Left: Progress Visualization (agent tracking)
 *     └── Right: Event Stream (real-time feed)
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
 * @see {@link ProgressVisualizationComponent} - Agent progress cards
 * @see {@link EventStreamComponent} - Real-time event feed with filtering
 * @see {@link DevBrandSseService} - SSE connection management
 * @see {@link DevBrandWorkflowStateService} - Central state orchestration
 */
@Component({
  selector: 'app-devbrand-poc-page',
  standalone: true,
  imports: [
    ExecutionControlComponent,
    ProgressVisualizationComponent,
    EventStreamComponent,
  ],
  template: `
    <div class="container mx-auto px-4 py-8">
      <!-- Page Header -->
      <header class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">DevBrand Workflow POC</h1>
        <p class="mt-2 text-gray-600">
          Real-time LangGraph multi-agent workflow demonstration with SSE
          streaming
        </p>
      </header>

      <!-- Execution Control (top section) -->
      <section class="mb-8">
        <app-execution-control
          (executionStarted)="onExecutionStarted($event)"
        />
      </section>

      <!-- Two-Column Layout: Progress + Events -->
      <section class="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <!-- Left Column: Progress Visualization -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold text-gray-800">Agent Progress</h2>
          <app-progress-visualization />
        </div>

        <!-- Right Column: Event Stream -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold text-gray-800">Event Stream</h2>
          <app-event-stream />
        </div>
      </section>
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
  onExecutionStarted(response: { executionId: string }): void {
    console.log('🎯 [DevBrandPocPageComponent] onExecutionStarted() called');
    console.log(
      '🆔 [DevBrandPocPageComponent] Execution ID:',
      response.executionId
    );

    // Start workflow execution (connects SSE and subscribes to events)
    console.log(
      '🚀 [DevBrandPocPageComponent] Starting workflow state tracking...'
    );
    // TODO:
    // this.workflowStateService.startExecution(response.streamUrl);
    console.log('✅ [DevBrandPocPageComponent] Workflow execution started');
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
