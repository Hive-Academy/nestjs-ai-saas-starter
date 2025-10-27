import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';
import { EnhancedCardComponent } from '../components/enhanced-card.component';
import { GlassPillComponent } from '../components/glass-pill.component';
import { Icon3DContainerComponent } from '../components/icon-3d-container.component';

/**
 * Problem/Solution Section - Enhanced Visual Design
 * Establishes pain points TypeScript developers face when building AI applications
 * Positions solution with 4 proof metrics using enhanced visual components
 */
@Component({
  selector: 'app-problem-solution-section',
  standalone: true,
  imports: [
    CommonModule,
    ScrollAnimationDirective,
    EnhancedCardComponent,
    GlassPillComponent,
    Icon3DContainerComponent,
  ],
  template: `
    <section class="py-20 md:py-32 px-8 md:px-16 bg-gray-50">
      <div class="max-w-7xl mx-auto">
        <!-- Section Headline -->
        <h2
          class="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-12 text-center"
          scrollAnimation
          [scrollConfig]="{
            animation: 'fadeIn',
            start: 'top 80%',
            duration: 0.8,
            once: true
          }"
        >
          The Problem TypeScript Developers Face
        </h2>

        <!-- Problem Statement -->
        <p
          class="text-lg md:text-xl text-gray-500 leading-relaxed max-w-4xl mx-auto text-center mb-16"
          scrollAnimation
          [scrollConfig]="{
            animation: 'fadeIn',
            start: 'top 75%',
            duration: 0.8,
            once: true
          }"
        >
          TypeScript developers building AI applications face a painful choice:
          use Python-style frameworks like LangGraph (pattern mismatch), stitch
          together raw SDKs (integration hell), or spend months building
          production infrastructure (multi-tenancy, monitoring, approvals).
        </p>

        <!-- Solution Card - Enhanced with glass morphism -->
        <app-enhanced-card
          [variant]="'solid'"
          [padding]="'lg'"
          [hoverable]="true"
          class="max-w-4xl mx-auto mb-16 block"
          scrollAnimation
          [scrollConfig]="{
            animation: 'slideUp',
            start: 'top 70%',
            duration: 0.8,
            once: true
          }"
        >
          <div class="flex items-start gap-6">
            <app-icon-3d-container
              [size]="'lg'"
              [animation]="'float'"
              class="flex-shrink-0"
            >
              <div
                class="w-full h-full rounded-full bg-gradient-to-br from-accent-electric to-accent-primary flex items-center justify-center text-white text-4xl"
              >
                ⚡
              </div>
            </app-icon-3d-container>
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-4">
                <h3 class="text-2xl md:text-4xl font-bold text-gray-900">
                  Our Solution: NestJS Patterns for AI/ML
                </h3>
                <app-glass-pill
                  [label]="'Revolutionary'"
                  [color]="'electric'"
                  [size]="'sm'"
                ></app-glass-pill>
              </div>
              <p class="text-lg md:text-xl text-gray-600 leading-relaxed mb-4">
                NestJS AI SaaS Starter applies familiar NestJS patterns
                (decorators, dependency injection, modules) to AI/ML operations.
                ChromaDB and Neo4j get TypeORM-style repositories. LangGraph
                workflows become declarative classes with @Node and @Edge
                decorators. Enterprise features (monitoring, approvals,
                streaming) work out-of-the-box.
              </p>
              <div class="flex flex-wrap gap-2">
                <app-glass-pill
                  [label]="'ChromaDB'"
                  [color]="'electric'"
                  [size]="'sm'"
                ></app-glass-pill>
                <app-glass-pill
                  [label]="'Neo4j'"
                  [color]="'neon'"
                  [size]="'sm'"
                ></app-glass-pill>
                <app-glass-pill
                  [label]="'LangGraph'"
                  [color]="'lime'"
                  [size]="'sm'"
                ></app-glass-pill>
              </div>
            </div>
          </div>
        </app-enhanced-card>

        <!-- Proof Points Grid (4 metrics with stagger) -->
        <div
          class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
          scrollAnimation
          [scrollConfig]="{
            animation: 'slideUp',
            start: 'top 80%',
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.15,
            once: true
          }"
        >
          @for (metric of metrics; track metric.value) {
          <app-enhanced-card
            [variant]="'solid'"
            [padding]="'md'"
            [hoverable]="true"
            class="text-center"
          >
            <div class="text-5xl md:text-6xl font-bold text-indigo-600 mb-4">
              {{ metric.value }}
            </div>
            <div class="text-lg text-gray-900 font-semibold mb-2">
              {{ metric.label }}
            </div>
            <div class="text-sm text-gray-500">{{ metric.description }}</div>
          </app-enhanced-card>
          }
        </div>
      </div>
    </section>
  `,
  styles: [],
})
export class ProblemSolutionSectionComponent {
  readonly metrics = [
    {
      value: '90%',
      label: 'Code Reduction',
      description: 'Vector operations: 50 lines → 5 lines',
    },
    {
      value: '60%',
      label: 'Less Approval Overhead',
      description: 'ML confidence scoring auto-approves high-confidence tasks',
    },
    {
      value: '75+',
      label: 'Lines → 1 Line',
      description: 'WorkflowStreamingOrchestrator one-liner execution',
    },
    {
      value: '$262K',
      label: 'ROI Savings',
      description: '11 weeks infrastructure development eliminated',
    },
  ];
}
