/**
 * TokenStreamDisplayComponent
 *
 * Displays LLM token streaming with typewriter effect for real-time message rendering.
 * Designed for displaying AI-generated content as it arrives from the backend.
 *
 * Features:
 * - Real-time token accumulation with typewriter cursor effect
 * - Markdown rendering support for formatted AI responses
 * - Stream completion detection and event emission
 * - Streaming state indicator for active generation
 *
 * Usage:
 * ```html
 * <app-token-stream-display
 *   [executionId]="'exec-123'"
 *   (streamComplete)="handleStreamComplete($event)"
 * />
 * ```
 *
 * @remarks
 * Component Complexity Assessment: Level 1 (Simple)
 * - Signals: < 50 lines, single responsibility (display streaming tokens)
 * - Patterns Applied: Standalone component, signals for state, output events
 * - Patterns Rejected: Container/Presentational split (not needed for simple display)
 * - SOLID Principles:
 *   - Single Responsibility: Only handles token display and streaming state
 *   - Composition: Uses MarkdownModule for rendering, emits events for completion
 */

import {
  Component,
  input,
  output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown';

@Component({
  selector: 'app-token-stream-display',
  standalone: true,
  imports: [CommonModule, MarkdownModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="token-stream-container">
      <!-- Streaming tokens with typewriter effect -->
      <div class="streaming-content" [class.streaming]="isStreaming()">
        <markdown [data]="displayContent()" />
        @if (isStreaming()) {
        <span class="cursor" aria-hidden="true">|</span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .token-stream-container {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
          sans-serif;
        line-height: 1.6;
        color: #23272f;
      }

      .streaming-content {
        position: relative;
        min-height: 1.5em;
      }

      .cursor {
        animation: blink 1s step-end infinite;
        color: #6366f1;
        font-weight: bold;
        margin-left: 2px;
      }

      @keyframes blink {
        50% {
          opacity: 0;
        }
      }
    `,
  ],
})
export class TokenStreamDisplayComponent {
  // Inputs
  readonly executionId = input<string>();

  // Outputs
  readonly streamComplete = output<string>();

  // State (using signals per Angular best practices)
  readonly displayContent = signal<string>('');
  readonly isStreaming = signal<boolean>(false);

  /**
   * Add a token to the display
   * Called by parent component when new token arrives from stream
   */
  addToken(token: string): void {
    this.displayContent.update((current) => current + token);
    this.isStreaming.set(true);
  }

  /**
   * Mark stream as complete
   * Emits final content to parent and disables streaming indicator
   */
  completeStream(): void {
    this.isStreaming.set(false);
    this.streamComplete.emit(this.displayContent());
  }

  /**
   * Reset the display (useful for new messages)
   */
  reset(): void {
    this.displayContent.set('');
    this.isStreaming.set(false);
  }
}
