import {
  Component,
  input,
  output,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';

export interface ErrorInfo {
  error: Error;
  context: string;
  timestamp: Date;
  canRetry: boolean;
}

/**
 * Error Boundary Component
 * Handles errors gracefully with fallback UI and retry functionality
 */
@Component({
  selector: 'brand-error-boundary',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error()) {
    <div class="error-boundary">
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <h3>{{ errorTitle() }}</h3>
        <p class="error-message">{{ errorMessage() }}</p>
        <div class="error-actions">
          @if (error()?.canRetry) {
          <button class="retry-button" (click)="onRetry()" type="button">
            🔄 Try Again
          </button>
          }
          <button
            class="details-button"
            (click)="toggleDetails()"
            type="button"
          >
            {{ showDetails() ? 'Hide Details' : 'Show Details' }}
          </button>
        </div>
        @if (showDetails()) {
        <div class="error-details">
          <p><strong>Context:</strong> {{ error()?.context }}</p>
          <p><strong>Time:</strong> {{ errorTime() }}</p>
          <details>
            <summary>Technical Details</summary>
            <pre>{{
              error()?.error?.stack ||
                error()?.error?.message ||
                'No details available'
            }}</pre>
          </details>
        </div>
        }
      </div>
    </div>
    }
  `,
  styles: [
    `
      .error-boundary {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        background: rgba(0, 0, 0, 0.8);
        border-radius: 8px;
        margin: 20px;
        backdrop-filter: blur(10px);
      }

      .error-content {
        text-align: center;
        color: white;
        max-width: 500px;
        padding: 24px;
      }

      .error-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .error-content h3 {
        color: #ff6b6b;
        margin: 0 0 12px 0;
        font-size: 1.5em;
      }

      .error-message {
        color: #ccc;
        margin-bottom: 20px;
        line-height: 1.4;
      }

      .error-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
        margin-bottom: 16px;
      }

      .retry-button,
      .details-button {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9em;
        transition: background-color 0.2s;
      }

      .retry-button:hover {
        background: #2563eb;
      }

      .details-button {
        background: #6b7280;
      }

      .details-button:hover {
        background: #4b5563;
      }

      .error-details {
        text-align: left;
        background: rgba(0, 0, 0, 0.5);
        padding: 16px;
        border-radius: 6px;
        font-size: 0.85em;
      }

      .error-details p {
        margin: 8px 0;
      }

      .error-details details {
        margin-top: 12px;
      }

      .error-details summary {
        cursor: pointer;
        color: #3b82f6;
        margin-bottom: 8px;
      }

      .error-details pre {
        background: rgba(0, 0, 0, 0.3);
        padding: 12px;
        border-radius: 4px;
        overflow-x: auto;
        white-space: pre-wrap;
        font-size: 0.8em;
        color: #ff6b6b;
      }
    `,
  ],
})
export class ErrorBoundaryComponent {
  error = input<ErrorInfo | null>(null);

  retry = output<void>();

  private showDetailsState = false;

  // Computed properties
  errorTitle = computed(() => {
    const err = this.error();
    if (!err) return '';

    switch (err.context) {
      case '3d-scene':
        return '3D Scene Failed to Load';
      case 'websocket':
        return 'Connection Error';
      case 'agents':
        return 'Agent System Error';
      default:
        return 'Something went wrong';
    }
  });

  errorMessage = computed(() => {
    const err = this.error();
    if (!err) return '';

    const userFriendlyMessages: Record<string, string> = {
      '3d-scene':
        'The 3D visualization could not be initialized. This might be due to WebGL compatibility issues.',
      websocket:
        'Lost connection to the agent system. Real-time updates may not work.',
      agents: 'There was an issue communicating with the agent system.',
    };

    return (
      userFriendlyMessages[err.context] ||
      err.error.message ||
      'An unexpected error occurred.'
    );
  });

  errorTime = computed(() => {
    const err = this.error();
    return err ? err.timestamp.toLocaleString() : '';
  });

  showDetails = computed(() => this.showDetailsState);

  onRetry(): void {
    this.retry.emit();
  }

  toggleDetails(): void {
    this.showDetailsState = !this.showDetailsState;
  }
}
