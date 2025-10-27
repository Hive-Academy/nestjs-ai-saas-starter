import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';
import { EnhancedCardComponent } from './enhanced-card.component';
import { GlassPillComponent } from './glass-pill.component';
import { Icon3DContainerComponent } from './icon-3d-container.component';
import { CountUpDirective } from '../directives/count-up.directive';
import type { ValueProposition } from '../interfaces';

/**
 * Value Proposition Card Component
 *
 * TASK_2025_026 - Task 6 (Enhanced with Design System - TASK_2025_028)
 *
 * Reusable card component for displaying library value propositions.
 * Used in Value Propositions Section for all 11 libraries.
 *
 * Design Specifications:
 * - Enhanced with EnhancedCardComponent for glass morphism effects
 * - 3D icon containers with float animations
 * - Glass pills for package name badges and capabilities
 * - Count-up animations for metrics
 * - Scroll animation: slideUp from 85% viewport
 * - Reference: design-handoff.md:687-802
 */
@Component({
  selector: 'app-value-proposition-card',
  standalone: true,
  imports: [
    CommonModule,
    ScrollAnimationDirective,
    EnhancedCardComponent,
    GlassPillComponent,
    Icon3DContainerComponent,
    CountUpDirective,
  ],
  template: `
    <app-enhanced-card
      [variant]="'solid'"
      [padding]="'lg'"
      [hoverable]="true"
      scrollAnimation
      [scrollConfig]="{
        animation: 'slideUp',
        start: 'top 85%',
        duration: 0.8,
        ease: 'power3.out',
        once: true
      }"
    >
      <!-- 3D Icon Container -->
      @if (valueProposition.iconUrl) {
      <div class="mb-6">
        <app-icon-3d-container [size]="'lg'" [animation]="'float'">
          <img
            [src]="valueProposition.iconUrl"
            [alt]="valueProposition.packageName + ' icon'"
            class="w-full h-full object-contain"
          />
        </app-icon-3d-container>
      </div>
      } @else {
      <div class="mb-6">
        <app-icon-3d-container [size]="'lg'" [animation]="'float'">
          <div
            class="w-full h-full rounded-full bg-gradient-to-br from-accent-electric to-accent-primary flex items-center justify-center text-white text-3xl"
          >
            📦
          </div>
        </app-icon-3d-container>
      </div>
      }

      <!-- Package Name as Glass Pill -->
      <div class="mb-4">
        <app-glass-pill
          [label]="valueProposition.packageName"
          [color]="'electric'"
          [size]="'sm'"
        ></app-glass-pill>
      </div>

      <!-- Business Value Headline -->
      <h3
        class="text-2xl font-bold text-headline mb-4 group-hover:text-accent-primary transition-colors"
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

      <!-- Capabilities with Pills -->
      <div class="flex flex-wrap gap-2 mb-6">
        @for (capability of valueProposition.capabilities; track capability) {
        <app-glass-pill
          [label]="capability"
          [color]="'neutral'"
          [size]="'sm'"
        ></app-glass-pill>
        }
      </div>

      <!-- Divider -->
      <div class="border-t border-gray-200 my-6"></div>

      <!-- Metric Callout with Count-Up -->
      <div class="text-center">
        <div class="text-4xl font-bold text-accent-primary mb-2">
          <span
            [appCountUp]="parseMetricValue(valueProposition.metricValue)"
            [suffix]="getMetricSuffix(valueProposition.metricValue)"
            [duration]="2000"
          ></span>
        </div>
        <div class="text-xs uppercase tracking-wide text-secondary">
          {{ valueProposition.metricLabel }}
        </div>
      </div>

      <!-- Hover Arrow -->
      <div
        class="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300"
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
    </app-enhanced-card>
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

  /**
   * Parse numeric value from metric string (e.g., "90%" -> 90)
   */
  parseMetricValue(metric: string): number {
    return parseInt(metric.replace(/[^0-9]/g, ''), 10) || 0;
  }

  /**
   * Extract suffix from metric string (e.g., "90%" -> "%")
   */
  getMetricSuffix(metric: string): string {
    return metric.replace(/[0-9]/g, '');
  }
}
