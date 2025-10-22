/**
 * SectionDivider Component
 *
 * Visual separation between sections with subtle styling.
 * Provides clean section transitions with optional subtle line.
 *
 * Design System: Light theme with minimal visual weight
 * - Generous vertical padding for breathing room
 * - Optional subtle gradient line for visual separation
 *
 * Usage:
 * ```html
 * <app-section-divider [showLine]="true" />
 * ```
 */

import { Component, input } from '@angular/core';

@Component({
  selector: 'app-section-divider',
  standalone: true,
  template: `
    <div class="w-full py-16 md:py-20">
      @if (showLine()) {
      <div class="container mx-auto px-8">
        <div
          class="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"
        ></div>
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
export class SectionDividerComponent {
  readonly showLine = input<boolean>(false); // Optional subtle line
}
