/**
 * CodeSnippet Component - Minimal Graphical Element
 *
 * Clean code display as a graphical element, not a card.
 * - No borders, no headers, no fancy styling
 * - Light background with dark text
 * - Simple, clean, monospace font
 * - Subtle shadow for depth
 *
 * Usage:
 * ```html
 * <app-code-snippet
 *   [code]="codeString"
 *   [language]="'typescript'"
 * />
 * ```
 */

import { Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-code-snippet',
  standalone: true,
  imports: [],
  template: `
    <div class="relative group">
      <!-- Code Block - Clean and Minimal -->
      <div class="bg-gray-50 rounded-xl p-6 shadow-md overflow-x-auto">
        <pre
          class="text-xs font-mono text-gray-700 leading-relaxed m-0 whitespace-pre-wrap break-words"
        ><code>{{ code() }}</code></pre>
      </div>

      <!-- Copy Button - Appears on Hover -->
      <button
        (click)="copyCode()"
        class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200
               px-3 py-1.5 bg-white text-gray-700 text-xs font-medium rounded-lg shadow-sm
               hover:bg-gray-100 border border-gray-200"
        [attr.aria-label]="copied() ? 'Copied!' : 'Copy code'"
      >
        {{ copied() ? '✓ Copied' : 'Copy' }}
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      pre {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'Courier New',
          monospace;
      }

      code {
        font-family: inherit;
      }
    `,
  ],
})
export class CodeSnippetComponent {
  readonly code = input.required<string>();
  readonly language = input<string>('typescript');

  readonly copied = signal<boolean>(false);

  async copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.code());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  }
}
