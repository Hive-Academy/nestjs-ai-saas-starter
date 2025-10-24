import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';
import type { ValueProposition } from '../interfaces';

/**
 * Value Proposition Card Component
 *
 * TASK_2025_026 - Task 6
 *
 * Reusable card component for displaying library value propositions.
 * Used in Value Propositions Section for all 11 libraries.
 *
 * Design Specifications:
 * - Card base: bg-white border border-gray-200 rounded-card shadow-card
 * - Hover states: scale-102, border-accent-primary, shadow-card-hover
 * - Scroll animation: slideUp from 85% viewport
 * - Reference: design-handoff.md:687-802
 */
@Component({
  selector: 'app-value-proposition-card',
  standalone: true,
  imports: [CommonModule, ScrollAnimationDirective],
  template: `
    <div
      class="bg-white border border-gray-200 rounded-card shadow-card
             hover:shadow-card-hover hover:scale-102 hover:border-accent-primary
             transition-all duration-300 p-8 group cursor-pointer relative"
      scrollAnimation
      [scrollConfig]="{
        animation: 'slideUp',
        start: 'top 85%',
        duration: 0.8,
        ease: 'power3.out',
        once: true
      }"
    >
      <!-- Icon (if provided) -->
      @if (valueProposition.iconUrl) {
      <div class="relative w-16 h-16 mb-6">
        <img
          [src]="valueProposition.iconUrl"
          [alt]="valueProposition.packageName + ' icon'"
          class="w-full h-full object-contain"
        />
      </div>
      }

      <!-- Package Name -->
      <div class="text-sm font-mono text-secondary mb-3">
        {{ valueProposition.packageName }}
      </div>

      <!-- Business Value Headline -->
      <h3
        class="text-2xl font-bold text-headline mb-4
               group-hover:text-accent-primary transition-colors"
      >
        {{ valueProposition.businessHeadline }}
      </h3>

      <!-- Pain Point -->
      <div class="mb-4">
        <div
          class="text-xs uppercase tracking-wide text-secondary font-semibold mb-2"
        >
          Traditional Approach
        </div>
        <p class="text-base text-secondary leading-relaxed">
          {{ valueProposition.painPoint }}
        </p>
      </div>

      <!-- Solution -->
      <div class="mb-6">
        <div
          class="text-xs uppercase tracking-wide text-accent-primary font-semibold mb-2"
        >
          Our Solution
        </div>
        <p class="text-base text-primary leading-relaxed">
          {{ valueProposition.solution }}
        </p>
      </div>

      <!-- Capabilities -->
      <ul class="space-y-2 mb-6">
        @for (capability of valueProposition.capabilities; track capability) {
        <li class="flex items-start gap-2">
          <svg
            class="w-5 h-5 text-accent-primary flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span class="text-sm text-secondary">{{ capability }}</span>
        </li>
        }
      </ul>

      <!-- Divider -->
      <div class="border-t border-gray-200 my-6"></div>

      <!-- Metric Callout -->
      <div class="text-center">
        <div class="text-4xl font-bold text-accent-primary mb-2">
          {{ valueProposition.metricValue }}
        </div>
        <div class="text-xs uppercase tracking-wide text-secondary">
          {{ valueProposition.metricLabel }}
        </div>
      </div>

      <!-- Hover Arrow -->
      <div
        class="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100
              transform translate-x-2 group-hover:translate-x-0
              transition-all duration-300"
      >
        <svg
          class="w-6 h-6 text-accent-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
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
export class ValuePropositionCardComponent {
  /**
   * Value proposition data input
   * Required property containing all card content
   */
  @Input({ required: true }) valueProposition!: ValueProposition;
}
