/**
 * SectionContainer Component (Light Design)
 *
 * Consistent layout wrapper for landing page sections with clean light backgrounds.
 * Provides standardized structure with title/subtitle header and content projection.
 *
 * Design System: Light theme with WCAG 2.1 AA compliance
 * - White or light gray backgrounds
 * - Deep gray text for maximum readability
 * - Generous vertical padding and spacing
 *
 * Usage:
 * ```html
 * <app-section-container
 *   title="Data Foundation Layer"
 *   subtitle="Vector search + graph relationships for AI"
 *   background="white"
 * >
 *   <!-- Section content goes here -->
 *   <app-library-showcase-grid [libraries]="libraries()" [columns]="2" />
 * </app-section-container>
 * ```
 */

import { CommonModule } from '@angular/common';
import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-section-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      [class]="containerClasses()"
      class="relative w-full overflow-hidden"
      [style.minHeight]="minHeight()"
    >
      <!-- DOM Content -->
      <div class="container mx-auto px-8 py-20 md:py-24">
        <!-- Section Header -->
        @if (title()) {
        <div class="text-center mb-16">
          <h2 class="text-5xl md:text-6xl font-bold mb-4 text-gray-900">
            {{ title() }}
          </h2>
          @if (subtitle()) {
          <p
            class="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
          >
            {{ subtitle() }}
          </p>
          }
        </div>
        }

        <!-- Content Slot -->
        <ng-content />
      </div>
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
export class SectionContainerComponent {
  // Configuration inputs (light design focused)
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly background = input<'white' | 'light-gray'>('white'); // Simplified for light design
  readonly minHeight = input<string>('auto'); // Changed from 100vh to auto (content-driven)
  readonly verticalPadding = input<'normal' | 'large' | 'xlarge'>('normal'); // Vertical padding size

  // Computed background classes (light design system)
  readonly containerClasses = computed(() => {
    const backgroundMap: Record<string, string> = {
      white: 'bg-white',
      'light-gray': 'bg-gray-50', // #F9FAFB equivalent
    };
    const bgClass = backgroundMap[this.background()] || backgroundMap['white'];
    return `${bgClass}`;
  });
}
