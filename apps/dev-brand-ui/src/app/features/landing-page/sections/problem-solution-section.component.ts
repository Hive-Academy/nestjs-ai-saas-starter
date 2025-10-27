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
    <section class="relative min-h-screen py-20 md:py-32 px-8 md:px-16 bg-bg-secondary overflow-hidden flex items-center">
      <!-- Decorative Background Elements -->
      <div class="absolute top-20 left-10 w-96 h-96 bg-accent-danger/10 rounded-full blur-3xl"></div>
      <div class="absolute bottom-20 right-10 w-96 h-96 bg-accent-success/10 rounded-full blur-3xl"></div>

      <div class="relative max-w-7xl mx-auto w-full">
        <!-- Row 1: Problem vs Solution (Side by Side) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">

          <!-- Problem Card (Left) - Slides in from left, red theme -->
          <div
            scrollAnimation
            [scrollConfig]="{
              animation: 'slideInLeft',
              start: 'top 75%',
              duration: 1.0,
              ease: 'power3.out',
              once: true
            }"
          >
            <div class="relative bg-gradient-to-br from-accent-danger/10 to-accent-danger-dark/5 border-2 border-accent-danger/30 rounded-card-xl p-8 md:p-10">
              <!-- Danger Icon Badge -->
              <div class="absolute -top-6 -left-6">
                <app-icon-3d-container [size]="'lg'" [animation]="'float'">
                  <div class="w-full h-full rounded-full bg-accent-danger flex items-center justify-center text-white text-4xl shadow-card-elevated">
                    ⚠️
                  </div>
                </app-icon-3d-container>
              </div>

              <h3 class="text-3xl md:text-4xl font-bold text-accent-danger mb-6 mt-4">
                The Problem TypeScript Developers Face
              </h3>

              <p class="text-lg text-text-primary leading-relaxed mb-6">
                TypeScript developers building AI applications face a painful choice:
                use Python-style frameworks like LangGraph (pattern mismatch), stitch
                together raw SDKs (integration hell), or spend months building
                production infrastructure (multi-tenancy, monitoring, approvals).
              </p>

              <!-- Problem Icons -->
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <span class="text-2xl">🔴</span>
                  <span class="text-base text-text-secondary">Pattern mismatch</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-2xl">🔴</span>
                  <span class="text-base text-text-secondary">Integration hell</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-2xl">🔴</span>
                  <span class="text-base text-text-secondary">Months of infrastructure work</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Solution Card (Right) - Slides in from right, green/gradient theme -->
          <div
            scrollAnimation
            [scrollConfig]="{
              animation: 'slideInRight',
              start: 'top 70%',
              duration: 1.0,
              ease: 'power3.out',
              once: true
            }"
          >
            <div class="relative bg-gradient-to-br from-accent-primary via-accent-secondary to-accent-success rounded-card-xl p-8 md:p-10 shadow-card-glow-indigo">
              <!-- Success Icon Badge -->
              <div class="absolute -top-6 -right-6">
                <app-icon-3d-container [size]="'lg'" [animation]="'float'">
                  <div class="w-full h-full rounded-full bg-white flex items-center justify-center text-accent-success text-4xl shadow-card-elevated">
                    ⚡
                  </div>
                </app-icon-3d-container>
              </div>

              <h3 class="text-3xl md:text-4xl font-bold text-white mb-6 mt-4">
                Our Solution: NestJS Patterns for AI/ML
              </h3>

              <p class="text-xl text-white/90 leading-relaxed mb-6">
                NestJS AI SaaS Starter applies familiar NestJS patterns
                (decorators, dependency injection, modules) to AI/ML operations.
                ChromaDB and Neo4j get TypeORM-style repositories. LangGraph
                workflows become declarative classes with @Node and @Edge
                decorators. Enterprise features (monitoring, approvals,
                streaming) work out-of-the-box.
              </p>

              <!-- Tech Badges -->
              <div class="flex flex-wrap gap-3">
                <span class="px-5 py-2 bg-white/20 backdrop-blur-md rounded-full text-white text-base font-semibold border border-white/30 flex items-center gap-2">
                  ✅ ChromaDB
                </span>
                <span class="px-5 py-2 bg-white/20 backdrop-blur-md rounded-full text-white text-base font-semibold border border-white/30 flex items-center gap-2">
                  ✅ Neo4j
                </span>
                <span class="px-5 py-2 bg-white/20 backdrop-blur-md rounded-full text-white text-base font-semibold border border-white/30 flex items-center gap-2">
                  ✅ LangGraph
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Row 2: Stats Grid - Pop up sequentially from bottom -->
        <div class="relative max-w-6xl mx-auto">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">

            <!-- Metric 1: Large featured card (spans 2 columns) - Pop up first -->
            <div
              class="md:col-span-2 bg-white rounded-card-lg p-8 shadow-card-elevated hover:shadow-card-glow-indigo transition-all duration-300 hover:scale-102"
              scrollAnimation
              [scrollConfig]="{
                animation: 'slideUp',
                start: 'top 85%',
                duration: 0.6,
                ease: 'back.out',
                once: true
              }"
            >
              <div class="text-6xl md:text-7xl font-bold bg-gradient-to-br from-accent-primary to-accent-secondary bg-clip-text text-transparent mb-4">
                {{ metrics[0].value }}
              </div>
              <div class="text-xl text-text-headline font-bold mb-2">
                {{ metrics[0].label }}
              </div>
              <div class="text-base text-text-secondary">{{ metrics[0].description }}</div>
            </div>

            <!-- Metric 2: Tall card - Pop up second -->
            <div
              class="bg-white rounded-card-lg p-8 shadow-card-elevated hover:shadow-card-glow-purple transition-all duration-300 hover:scale-102"
              scrollAnimation
              [scrollConfig]="{
                animation: 'slideUp',
                start: 'top 85%',
                duration: 0.6,
                delay: 0.15,
                ease: 'back.out',
                once: true
              }"
            >
              <div class="text-5xl md:text-6xl font-bold text-accent-secondary mb-4">
                {{ metrics[1].value }}
              </div>
              <div class="text-lg text-text-headline font-bold mb-2">
                {{ metrics[1].label }}
              </div>
              <div class="text-sm text-text-secondary">{{ metrics[1].description }}</div>
            </div>

            <!-- Metric 3: Tall card - Pop up third -->
            <div
              class="bg-white rounded-card-lg p-8 shadow-card-elevated hover:shadow-card-glow-indigo transition-all duration-300 hover:scale-102"
              scrollAnimation
              [scrollConfig]="{
                animation: 'slideUp',
                start: 'top 85%',
                duration: 0.6,
                delay: 0.3,
                ease: 'back.out',
                once: true
              }"
            >
              <div class="text-5xl md:text-6xl font-bold text-accent-tertiary mb-4">
                {{ metrics[2].value }}
              </div>
              <div class="text-lg text-text-headline font-bold mb-2">
                {{ metrics[2].label }}
              </div>
              <div class="text-sm text-text-secondary">{{ metrics[2].description }}</div>
            </div>

            <!-- Metric 4: Wide featured card (spans 2 columns) - Pop up fourth -->
            <div
              class="md:col-span-2 bg-gradient-to-br from-accent-lime/20 to-accent-electric/20 rounded-card-lg p-8 shadow-card-elevated hover:shadow-card-glow-purple transition-all duration-300 hover:scale-102 border-2 border-accent-electric/30"
              scrollAnimation
              [scrollConfig]="{
                animation: 'slideUp',
                start: 'top 85%',
                duration: 0.6,
                delay: 0.45,
                ease: 'back.out',
                once: true
              }"
            >
              <div class="text-6xl md:text-7xl font-bold text-accent-primary mb-4">
                {{ metrics[3].value }}
              </div>
              <div class="text-xl text-text-headline font-bold mb-2">
                {{ metrics[3].label }}
              </div>
              <div class="text-base text-text-secondary">{{ metrics[3].description }}</div>
            </div>
          </div>
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
