import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  inject,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

/**
 * StreamingTextDisplayComponent
 *
 * Reusable presentational component for displaying streaming LLM text with a typing cursor animation.
 * Supports plain monospace display (default) or rendered markdown via `renderMarkdown` input.
 *
 * @public
 */
@Component({
  selector: 'app-streaming-text-display',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host { display: block; }

      .markdown-body h1,
      .markdown-body h2,
      .markdown-body h3 {
        font-weight: 700;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
        color: #1e293b;
      }
      .markdown-body h1 { font-size: 1.125rem; }
      .markdown-body h2 { font-size: 1rem; }
      .markdown-body h3 { font-size: 0.9rem; }

      .markdown-body p { margin-bottom: 0.75rem; }

      .markdown-body ul,
      .markdown-body ol {
        padding-left: 1.5rem;
        margin-bottom: 0.75rem;
      }
      .markdown-body ul { list-style-type: disc; }
      .markdown-body ol { list-style-type: decimal; }
      .markdown-body li { margin-bottom: 0.25rem; }

      .markdown-body strong { font-weight: 700; }
      .markdown-body em { font-style: italic; }

      .markdown-body code {
        background: #f1f5f9;
        border-radius: 3px;
        padding: 0.1em 0.35em;
        font-family: monospace;
        font-size: 0.85em;
      }

      .markdown-body pre {
        background: #f1f5f9;
        border-radius: 6px;
        padding: 0.75rem 1rem;
        overflow-x: auto;
        margin-bottom: 0.75rem;
      }
      .markdown-body pre code {
        background: none;
        padding: 0;
      }

      .markdown-body blockquote {
        border-left: 3px solid #6366f1;
        padding-left: 1rem;
        color: #64748b;
        margin-bottom: 0.75rem;
      }

      .markdown-body hr { border-color: #e2e8f0; margin: 1rem 0; }
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

        @if (renderMarkdown()) {
          <div class="p-4 max-h-64 overflow-y-auto leading-relaxed">
            <div class="markdown-body text-sm text-gray-800" [innerHTML]="renderedHtml()"></div>
            @if (isActive()) {
              <span class="animate-pulse text-indigo-500 font-bold">|</span>
            }
          </div>
        } @else {
          <div class="p-4 text-sm text-gray-800 whitespace-pre-wrap max-h-64 overflow-y-auto font-mono leading-relaxed">
            {{ text() }}
            @if (isActive()) {
              <span class="animate-pulse text-indigo-500 font-bold">|</span>
            }
          </div>
        }
      </div>
    }
  `,
})
export class StreamingTextDisplayComponent {
  private readonly sanitizer = inject(DomSanitizer);

  /** Accumulated streaming text to display */
  readonly text = input<string>('');

  /** Whether text is still actively streaming (shows blinking cursor) */
  readonly isActive = input<boolean>(false);

  /** Optional header label for the text block */
  readonly label = input<string>('');

  /** When true, renders text as markdown HTML instead of monospace plain text */
  readonly renderMarkdown = input<boolean>(false);

  readonly renderedHtml = computed((): SafeHtml => {
    if (!this.renderMarkdown()) return '';
    const html = marked.parse(this.text()) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });
}
