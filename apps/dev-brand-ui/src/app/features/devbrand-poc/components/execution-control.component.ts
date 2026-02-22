import { Component, signal, inject, output, DestroyRef } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DevBrandApiService } from '../services/devbrand-api.service';
import { DevBrandWorkflowStateService } from '../services/devbrand-workflow-state.service';
import { ExecuteDevBrandRequest } from '../models';

/**
 * ExecutionControlComponent
 *
 * Workflow execution trigger component with reactive form validation.
 * Evidence: task-tracking/TASK_2025_025/implementation-plan.md:647-818
 *
 * @remarks
 * **Purpose**:
 * - Provides form interface for initiating DevBrand workflow execution
 * - Validates required GitHub username input
 * - Displays execution status, loading states, and error messages
 * - Emits executionStarted event for parent component coordination
 *
 * **Form Controls**:
 * - githubUsername: Required, minimum length 1 character
 * - userId: Optional, for tracking and personalization
 *
 * **State Management** (Signal-Based):
 * - _executionId: Stores execution ID after successful workflow start
 * - _error: Stores error messages from failed execution attempts
 * - isExecuting: Derived from DevBrandWorkflowStateService.isExecuting()
 *
 * **User Interactions**:
 * - Execute button: Triggers workflow execution (disabled when form invalid or executing)
 * - Dismiss error: Clears error message from display
 *
 * **Integration Points**:
 * - DevBrandApiService: POST /api/devbrand/execute
 * - DevBrandWorkflowStateService: startExecution() for state coordination
 *
 * **Modern Angular Pattern**:
 * - Standalone component (standalone: true)
 * - Signal-based state (NOT ngOnInit lifecycle)
 * - Modern inject() pattern (NOT constructor injection)
 * - Modern control flow (@if/@else, NOT *ngIf/*ngFor)
 * - Typed reactive forms (FormControl<string>)
 * - takeUntilDestroyed for automatic subscription cleanup
 *
 * @example
 * ```html
 * <!-- In parent component -->
 * <app-execution-control
 *   (executionStarted)="onExecutionStarted($event)"
 * />
 * ```
 *
 * @example
 * ```typescript
 * // Component usage
 * export class ParentComponent {
 *   onExecutionStarted(executionId: string): void {
 *     console.log('Workflow started:', executionId);
 *   }
 * }
 * ```
 *
 * @see {@link DevBrandApiService} REST API integration service
 * @see {@link DevBrandWorkflowStateService} Workflow state management
 * @see {@link ExecuteDevBrandRequest} Request payload model
 * @public
 */
@Component({
  selector: 'app-execution-control',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">
        Workflow Execution Control
      </h3>

      <form [formGroup]="form" (ngSubmit)="executeWorkflow()">
        <!-- GitHub Username Input -->
        <div class="mb-4">
          <label
            for="githubUsername"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            GitHub Username
            <span class="text-red-500">*</span>
          </label>
          <input
            id="githubUsername"
            type="text"
            formControlName="githubUsername"
            placeholder="octocat"
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            [class.border-red-500]="
              form.controls.githubUsername.invalid &&
              form.controls.githubUsername.touched
            "
          />
          @if (form.controls.githubUsername.invalid &&
          form.controls.githubUsername.touched) {
          <p class="text-red-500 text-sm mt-1">
            GitHub username is required (minimum 1 character)
          </p>
          }
        </div>

        <!-- User ID Input (Optional) -->
        <div class="mb-4">
          <label
            for="userId"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            User ID (Optional)
          </label>
          <input
            id="userId"
            type="text"
            formControlName="userId"
            placeholder="user-123"
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p class="text-gray-500 text-xs mt-1">
            Optional identifier for tracking and personalization (defaults to
            "anonymous")
          </p>
        </div>

        <!-- Execute Button -->
        <button
          type="submit"
          [disabled]="form.invalid || isExecuting()"
          class="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          @if (isExecuting()) {
          <span class="flex items-center justify-center">
            <svg
              class="animate-spin h-5 w-5 mr-2"
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
            Executing Workflow...
          </span>
          } @else { Execute Workflow }
        </button>
      </form>

      <!-- Execution Success Status -->
      @if (executionId()) {
      <div class="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
        <p class="text-sm font-medium text-green-800">
          Workflow Execution Started
        </p>
        <p class="text-xs text-green-600 mt-1">
          Execution ID:
          <code class="bg-green-100 px-2 py-1 rounded font-mono">{{
            executionId()
          }}</code>
        </p>
        <p class="text-xs text-gray-600 mt-2">
          Monitor progress below. WebSocket events will update automatically.
        </p>
      </div>
      }

      <!-- Error Display -->
      @if (error()) {
      <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
        <p class="text-sm font-medium text-red-800">Execution Failed</p>
        <p class="text-xs text-red-600 mt-1">
          {{ error() }}
        </p>
        <button
          (click)="clearError()"
          class="mt-2 text-xs text-red-700 underline hover:text-red-800"
        >
          Dismiss Error
        </button>
      </div>
      }
    </div>
  `,
  styles: [
    `
      /* Component-specific styles (Tailwind CSS handles most styling) */
    `,
  ],
})
export class ExecutionControlComponent {
  /**
   * Angular FormBuilder for reactive form construction
   * @private
   */
  private readonly fb = inject(FormBuilder);

  /**
   * DevBrand REST API service for workflow execution
   * @private
   */
  private readonly apiService = inject(DevBrandApiService);

  /**
   * Workflow state management service for execution tracking
   * @private
   */
  private readonly workflowStateService = inject(DevBrandWorkflowStateService);

  /**
   * DestroyRef for automatic subscription cleanup
   * @private
   */
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Reactive form with typed controls
   * @public
   * @remarks
   * - githubUsername: Required (Validators.required, Validators.minLength(1))
   * - userId: Optional (no validators)
   */
  readonly form = this.fb.group({
    githubUsername: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)],
    }),
    userId: new FormControl<string>('', { nonNullable: true }),
  });

  /**
   * Execution ID signal (private writable)
   * @private
   * @remarks
   * - Set when workflow execution starts successfully
   * - Used for success message display
   */
  private readonly _executionId = signal<string | null>(null);

  /**
   * Error message signal (private writable)
   * @private
   * @remarks
   * - Set when workflow execution fails
   * - Used for error message display
   * - Cleared on successful execution or user dismissal
   */
  private readonly _error = signal<string | null>(null);

  /**
   * Execution ID (readonly accessor)
   * @public
   */
  readonly executionId = this._executionId.asReadonly();

  /**
   * Error message (readonly accessor)
   * @public
   */
  readonly error = this._error.asReadonly();

  /**
   * Is workflow executing? (computed from state service)
   * @public
   * @remarks
   * - Derived from DevBrandWorkflowStateService.isExecuting()
   * - Used for button disabling and loading indicator
   */
  readonly isExecuting = this.workflowStateService.isExecuting;

  /**
   * Output event: Execution started with full API response
   * @public
   * @remarks
   * - Emitted when workflow execution starts successfully
   * - Includes executionId and websocketUrl from API response
   * - Parent component uses this for WebSocket connection setup
   */
  readonly executionStarted = output<{
    executionId: string;
  }>();

  /**
   * Execute workflow
   *
   * Initiates DevBrand workflow execution via REST API.
   *
   * @remarks
   * **Workflow**:
   * 1. Validate form (early return if invalid)
   * 2. Set isExecuting state to true (via state service)
   * 3. Clear any previous errors
   * 4. Build ExecuteDevBrandRequest payload
   * 5. Call DevBrandApiService.executeWorkflow()
   * 6. On success:
   *    - Store executionId in signal
   *    - Call workflowStateService.startExecution()
   *    - Emit executionStarted event
   * 7. On error:
   *    - Store error message in signal
   *    - isExecuting automatically set to false by state service
   *
   * **Error Handling**:
   * - All HTTP errors transformed to user-friendly messages by ApiService
   * - Network errors: "Unable to connect to server..."
   * - Timeout errors: "Request timed out after 30 seconds..."
   * - HTTP 400: "Invalid request: {details}"
   * - HTTP 500: "Server error occurred..."
   *
   * **Automatic Cleanup**:
   * - takeUntilDestroyed() handles subscription cleanup on component destroy
   *
   * @example
   * ```typescript
   * // Triggered by form submit
   * executeWorkflow();
   * // → POST /api/devbrand/execute
   * // → Success: executionId signal set, executionStarted emitted
   * // → Error: error signal set, user-friendly message displayed
   * ```
   *
   * @public
   */
  executeWorkflow(): void {
    // Early return if form invalid
    if (this.form.invalid) {
      console.warn('Form invalid, cannot execute workflow');
      return;
    }

    // Clear previous error
    this._error.set(null);

    // Build request payload
    const request: ExecuteDevBrandRequest = {
      githubUsername: this.form.value.githubUsername!,
      userId: this.form.value.userId || undefined,
    };

    // Execute workflow via REST API
    this.apiService
      .executeWorkflow(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          // Store execution ID
          this._executionId.set(response.executionId);

          // Notify state service to start execution tracking
          this.workflowStateService.startExecution(response.executionId);

          // Emit full response for parent coordination (includes websocketUrl)
          this.executionStarted.emit({
            executionId: response.executionId,
          });

          console.log('Workflow execution started:', response.executionId);
        },
        error: (errorMessage: string) => {
          // Store error message (already user-friendly from ApiService)
          this._error.set(errorMessage);

          // Clear execution ID
          this._executionId.set(null);

          console.error('Workflow execution failed:', errorMessage);
        },
      });
  }

  /**
   * Clear error message
   *
   * Dismisses error message from UI display.
   *
   * @remarks
   * - Called when user clicks "Dismiss Error" button
   * - Clears _error signal
   * - Error message automatically hidden via @if directive
   *
   * @public
   */
  clearError(): void {
    this._error.set(null);
  }
}
