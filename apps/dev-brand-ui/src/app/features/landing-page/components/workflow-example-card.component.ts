import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';
import { EnhancedCardComponent } from './enhanced-card.component';
import { GlassPillComponent } from './glass-pill.component';
import { Icon3DContainerComponent } from './icon-3d-container.component';
import { CountUpDirective } from '../directives/count-up.directive';
import type { WorkflowExample } from '../interfaces';

/**
 * Workflow Example Card Component
 *
 * TASK_2025_026 - Task 10 (Enhanced with Design System - TASK_2025_028)
 *
 * Reusable card component for displaying complete workflow examples.
 * Shows architecture diagram, code comparison (before/after), modules used, and value delivered.
 *
 * Design Specifications:
 * - Enhanced with EnhancedCardComponent for glass morphism effects
 * - 3D icon container for workflow number badge
 * - Glass pills for module badges
 * - Count-up animations for code line metrics
 * - Hover effects with scale transformations
 * - Scroll animation: slideUp from 85% viewport
 *
 * Reference: implementation-plan.md:398-432, design-handoff.md:834-947
 */
@Component({
  selector: 'app-workflow-example-card',
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
      class="mb-12"
    >
      <!-- Workflow Title + 3D Number Badge -->
      <div class="flex items-start gap-6 mb-8">
        <app-icon-3d-container [size]="'md'" [animation]="'rotate'">
          <div
            class="w-full h-full bg-gradient-to-br from-accent-electric to-accent-primary text-white rounded-full flex items-center justify-center font-bold text-lg"
          >
            {{ index }}
          </div>
        </app-icon-3d-container>
        <div>
          <h3 class="text-3xl font-bold text-headline mb-2">
            {{ workflowExample.title }}
          </h3>
          <p class="text-lg text-secondary leading-relaxed">
            {{ workflowExample.description }}
          </p>
        </div>
      </div>

      <!-- Modules Pills with GlassPillComponent -->
      <div class="flex flex-wrap gap-2 mb-8">
        @for (module of workflowExample.modules; track module) {
        <app-glass-pill
          [label]="module"
          [color]="'electric'"
          [size]="'md'"
        ></app-glass-pill>
        }
      </div>

      <!-- Architecture Diagram (Canva) -->
      @if (workflowExample.diagramUrl) {
      <div class="bg-gray-50 rounded-xl p-8 mb-8">
        <img
          [src]="workflowExample.diagramUrl"
          [alt]="'Architecture diagram for ' + workflowExample.title"
          class="w-full h-auto rounded-lg"
          loading="lazy"
          decoding="async"
        />
      </div>
      }

      <!-- Code Comparison (Before/After) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <!-- Before Code -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <h4
              class="text-sm font-semibold uppercase tracking-wide text-secondary"
            >
              Traditional Approach
            </h4>
            <span class="text-sm font-mono text-secondary">
              <span
                appCountUp
                [targetValue]="workflowExample.codeBeforeLines"
                [suffix]="'+ lines'"
                [duration]="1500"
              ></span>
            </span>
          </div>
          <div
            class="bg-gray-900 text-gray-100 p-6 rounded-lg font-mono text-sm overflow-x-auto"
          >
            <pre class="whitespace-pre-wrap">{{
              workflowExample.codeBefore
            }}</pre>
          </div>
        </div>

        <!-- After Code -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <h4
              class="text-sm font-semibold uppercase tracking-wide text-accent-primary"
            >
              Our Approach
            </h4>
            <span class="text-sm font-mono text-accent-primary">
              <span
                appCountUp
                [targetValue]="workflowExample.codeAfterLines"
                [suffix]="' line' + (workflowExample.codeAfterLines > 1 ? 's' : '')"
                [duration]="1500"
              ></span>
            </span>
          </div>
          <div
            class="bg-gray-900 text-gray-100 p-6 rounded-lg font-mono text-sm overflow-x-auto border-2 border-accent-primary/30"
          >
            <pre class="whitespace-pre-wrap">{{
              workflowExample.codeAfter
            }}</pre>
          </div>
        </div>
      </div>

      <!-- Value Delivered Bullets -->
      <div class="border-t border-gray-200 pt-8">
        <h4 class="text-lg font-semibold text-headline mb-4">
          Value Delivered
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (value of workflowExample.valueDelivered; track value) {
          <div class="flex items-start gap-3">
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
            <span class="text-primary">{{ value }}</span>
          </div>
          }
        </div>
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
export class WorkflowExampleCardComponent {
  /**
   * Workflow example data containing title, description, modules, diagram, code comparison, and value delivered.
   */
  @Input({ required: true }) workflowExample!: WorkflowExample;

  /**
   * Workflow number badge (1, 2, 3, etc.)
   */
  @Input({ required: true }) index!: number;
}
