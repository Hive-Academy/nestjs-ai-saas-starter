import { Injectable, signal } from '@angular/core';
import { ErrorInfo } from '../components/error-boundary.component';

export interface ErrorRecoveryStrategy {
  canRecover: boolean;
  recoveryAction?: () => Promise<void>;
  fallbackContent?: string;
}

/**
 * Error Handling Service
 * Centralized error management with recovery strategies
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorHandlingService {
  private readonly currentError = signal<ErrorInfo | null>(null);
  private errorHistory: ErrorInfo[] = [];

  readonly error = this.currentError.asReadonly();

  /**
   * Handle an error with context and recovery strategy
   */
  handleError(
    error: Error,
    context: string,
    recoveryStrategy?: ErrorRecoveryStrategy
  ): void {
    const errorInfo: ErrorInfo = {
      error,
      context,
      timestamp: new Date(),
      canRetry: recoveryStrategy?.canRecover ?? false,
    };

    // Store in history
    this.errorHistory.push(errorInfo);

    // Keep only last 10 errors
    if (this.errorHistory.length > 10) {
      this.errorHistory = this.errorHistory.slice(-10);
    }

    // Set as current error
    this.currentError.set(errorInfo);

    // Log to console for debugging
    console.error(`[${context}] Error:`, error);
  }

  /**
   * Clear current error
   */
  clearError(): void {
    this.currentError.set(null);
  }

  /**
   * Get error recovery strategy based on context
   */
  getRecoveryStrategy(context: string): ErrorRecoveryStrategy {
    switch (context) {
      case '3d-scene':
        return {
          canRecover: true,
          recoveryAction: async () => {
            // Try to reinitialize the scene
            window.location.reload();
          },
        };

      case 'websocket':
        return {
          canRecover: true,
          recoveryAction: async () => {
            // Try to reconnect
            await new Promise((resolve) => setTimeout(resolve, 2000));
          },
        };

      case 'agents':
        return {
          canRecover: true,
          recoveryAction: async () => {
            // Reset agent state
            await new Promise((resolve) => setTimeout(resolve, 1000));
          },
        };

      default:
        return {
          canRecover: false,
          fallbackContent: 'Please refresh the page to continue.',
        };
    }
  }

  /**
   * Get error history
   */
  getErrorHistory(): ErrorInfo[] {
    return [...this.errorHistory];
  }

  /**
   * Check if error is recoverable
   */
  isRecoverable(error: ErrorInfo): boolean {
    return error.canRetry;
  }

  /**
   * Create user-friendly error message
   */
  createUserFriendlyMessage(error: Error, context: string): string {
    const messages: Record<string, string> = {
      '3d-scene':
        'The 3D visualization failed to load. Your device may not support WebGL.',
      websocket: 'Connection to the server was lost. Trying to reconnect...',
      agents: 'The AI agent system is temporarily unavailable.',
      performance:
        'Performance issues detected. Some features may be disabled.',
    };

    return (
      messages[context] || 'An unexpected error occurred. Please try again.'
    );
  }

  /**
   * Check if we should show fallback content
   */
  shouldShowFallback(context: string): boolean {
    const currentErr = this.currentError();
    return currentErr?.context === context && !currentErr.canRetry;
  }

  /**
   * Get fallback content for specific contexts
   */
  getFallbackContent(context: string): string {
    const fallbacks: Record<string, string> = {
      '3d-scene':
        '🌌 3D visualization unavailable. Agent information is shown below.',
      websocket: '📡 Real-time updates disabled. Refresh to reconnect.',
      agents: '🤖 Agent system offline. Please check back later.',
    };

    return fallbacks[context] || 'Feature temporarily unavailable.';
  }
}
