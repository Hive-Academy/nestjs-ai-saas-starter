/**
 * LibraryCard Component (Light Design)
 *
 * Reusable library showcase card component with clean white background.
 * Designed for 12-library showcase with business value first approach.
 *
 * Design System: Light theme with WCAG 2.1 AA compliance
 * - White background with soft shadows
 * - Deep gray text for maximum readability
 * - Subtle hover effects with refined scaling
 *
 * Usage:
 * ```html
 * <app-glassmorphism-card
 *   icon="🔍"
 *   packageName="@hive-academy/nestjs-chromadb"
 *   title="Build RAG applications in minutes"
 *   description="TypeORM-style repository pattern for semantic search"
 *   [capabilities]="['Multi-provider embeddings', 'Enterprise multi-tenancy']"
 *   [metric]="{ label: '90% Less Code', value: 'vs. manual operations' }"
 *   ctaText="Learn more"
 *   (cardClick)="onExplore()"
 * />
 * ```
 */

import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-glassmorphism-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="group px-8 py-6 rounded-2xl border bg-white border-gray-200 shadow-card
             transform transition-all duration-300 hover:scale-[1.02] hover:shadow-card-hover
             cursor-pointer"
      (click)="onCardClick()"
      (keyup.enter)="onCardClick()"
      role="button"
      tabindex="0"
    >
      <!-- Icon (larger, modern) -->
      @if (icon()) {
      <div
        class="text-5xl mb-4 transition-transform duration-300 group-hover:scale-110"
      >
        {{ icon() }}
      </div>
      }

      <!-- Library Package Name -->
      @if (packageName()) {
      <div class="text-sm font-mono text-gray-500 mb-2">
        {{ packageName() }}
      </div>
      }

      <!-- Title (business value first) -->
      <h3 class="text-2xl font-bold text-gray-900 mb-3">{{ title() }}</h3>

      <!-- Description -->
      <p class="text-base text-gray-600 leading-relaxed mb-4">
        {{ description() }}
      </p>

      <!-- Key Capabilities (progressive disclosure) -->
      @if (capabilities().length > 0) {
      <div class="mt-4">
        <h4 class="text-sm font-semibold text-gray-700 mb-2">
          Key Capabilities
        </h4>
        <ul class="space-y-2">
          @for (capability of capabilities(); track capability) {
          <li class="text-sm text-gray-600 flex items-start gap-2">
            <span class="text-accent-primary mt-0.5">✓</span>
            <span>{{ capability }}</span>
          </li>
          }
        </ul>
      </div>
      }

      <!-- Business Metric -->
      @if (metric()) {
      <div class="mt-4 pt-4 border-t border-gray-200">
        <div class="text-3xl font-bold text-accent-primary">
          {{ metric()!.value }}
        </div>
        <div class="text-xs text-gray-500 mt-1">{{ metric()!.label }}</div>
      </div>
      }

      <!-- CTA (optional) -->
      @if (ctaText()) {
      <div class="mt-4">
        <button
          class="text-sm font-semibold text-accent-primary hover:text-accent-primary-dark
                       flex items-center gap-1 transition-colors"
        >
          {{ ctaText() }}
          <span>→</span>
        </button>
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
export class GlassmorphismCardComponent {
  // Configuration inputs (light design focused)
  readonly icon = input<string>('');
  readonly packageName = input<string>(''); // @hive-academy/package-name
  readonly title = input.required<string>(); // Business value proposition
  readonly description = input.required<string>();
  readonly capabilities = input<string[]>([]); // Key technical capabilities
  readonly metric = input<{ label: string; value: string } | null>(null);
  readonly ctaText = input<string>(''); // "Learn more", "Explore docs"

  // Output events
  readonly cardClick = output<void>();

  onCardClick(): void {
    this.cardClick.emit();
  }
}
