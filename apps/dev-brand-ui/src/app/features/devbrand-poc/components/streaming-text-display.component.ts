import { Component, ChangeDetectionStrategy, input } from '@angular/core';

/**
 * StreamingTextDisplayComponent
 *
 * Reusable presentational component for displaying streaming LLM text with a typing cursor animation.
 *
 * @remarks
 * **Purpose**:
 * - Display accumulated streaming text from LLM token generation
 * - Show blinking cursor when text is actively streaming
 * - Optional header label for context (e.g., "Supervisor Reasoning")
 * - Hidden when no text content is available
 *
 * **Design**:
 * - Pure "dumb" component - NO service injection
 * - All data flows through input signals
 * - Monospace font for code-like readability
 * - Max height with overflow scroll for long content
 *
 * @example
 * ```html
 * <app-streaming-text-display
 *   [text]="streamingText()"
 *   [isActive]="true"
 *   [label]="'Agent Reasoning'"
 * />
 * ```
 *
 * @public
 */
@Component({
  selector: 'app-streaming-text-display',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  template: `
    @if (text()) {
    <div class="rounded-lg border border-gray-200 overflow-hidden">
      @if (label()) {
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {{ label() }}
        </span>
      </div>
      }
      <div
        class="p-4 text-sm text-gray-800 whitespace-pre-wrap max-h-64 overflow-y-auto font-mono leading-relaxed"
      >
        {{ text() }}
        @if (isActive()) {
        <span class="animate-pulse text-indigo-500 font-bold">|</span>
        }
      </div>
    </div>
    }
  `,
})
export class StreamingTextDisplayComponent {
  /** Accumulated streaming text to display */
  readonly text = input<string>('');

  /** Whether text is still actively streaming (shows blinking cursor) */
  readonly isActive = input<boolean>(false);

  /** Optional header label for the text block */
  readonly label = input<string>('');
}
