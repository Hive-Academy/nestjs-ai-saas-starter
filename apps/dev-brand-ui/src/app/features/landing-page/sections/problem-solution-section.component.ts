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
    <section class="relative py-20 md:py-32 px-8 md:px-16 bg-bg-secondary overflow-hidden">
      <!-- Decorative Background Elements (Design-2 inspired) -->
      <div class="absolute top-20 right-10 w-64 h-64 bg-accent-electric/10 rounded-full blur-3xl"></div>
      <div class="absolute bottom-20 left-10 w-80 h-80 bg-accent-secondary/10 rounded-full blur-3xl"></div>

      <div class="relative max-w-7xl mx-auto">
        <!-- Section Headline -->
        <h2
          class="text-4xl md:text-6xl font-bold text-text-headline leading-tight mb-8 text-center"
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
          class="text-lg md:text-xl text-text-secondary leading-relaxed max-w-4xl mx-auto text-center mb-20"
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

        <!-- Large Gradient Solution Card (Design-2 PlayAI style) -->
        <div
          class="relative max-w-5xl mx-auto mb-24"
          scrollAnimation
          [scrollConfig]="{
            animation: 'slideUp',
            start: 'top 70%',
            duration: 0.8,
            once: true
          }"
        >
          <div
            class="relative bg-gradient-to-br from-accent-primary via-accent-secondary to-accent-tertiary rounded-card-xl p-12 md:p-16 shadow-card-glow-indigo hover:shadow-cta-primary transition-all duration-500 hover:scale-102"
          >
            <!-- Floating Icon Badge -->
            <div class="absolute -top-8 left-12">
              <app-icon-3d-container
                [size]="'lg'"
                [animation]="'float'"
              >
                <div
                  class="w-full h-full rounded-full bg-white flex items-center justify-center text-accent-primary text-4xl shadow-card-elevated"
                >
                  ⚡
                </div>
              </app-icon-3d-container>
            </div>

            <!-- Content -->
            <div class="pt-8">
              <div class="flex items-center gap-3 mb-6 flex-wrap">
                <h3 class="text-3xl md:text-5xl font-bold text-white leading-tight">
                  Our Solution: NestJS Patterns for AI/ML
                </h3>
                <span class="px-4 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-sm font-semibold border border-white/30">
                  Revolutionary
                </span>
              </div>

              <p class="text-xl md:text-2xl text-white/90 leading-relaxed mb-8">
                NestJS AI SaaS Starter applies familiar NestJS patterns
                (decorators, dependency injection, modules) to AI/ML operations.
                ChromaDB and Neo4j get TypeORM-style repositories. LangGraph
                workflows become declarative classes with @Node and @Edge
                decorators. Enterprise features (monitoring, approvals,
                streaming) work out-of-the-box.
              </p>

              <div class="flex flex-wrap gap-3">
                <span class="px-5 py-2 bg-white/20 backdrop-blur-md rounded-full text-white text-base font-semibold border border-white/30">
                  ChromaDB
                </span>
                <span class="px-5 py-2 bg-white/20 backdrop-blur-md rounded-full text-white text-base font-semibold border border-white/30">
                  Neo4j
                </span>
                <span class="px-5 py-2 bg-white/20 backdrop-blur-md rounded-full text-white text-base font-semibold border border-white/30">
                  LangGraph
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Asymmetric Metrics Bento Grid (Design-2 inspired floating cards) -->
        <div class="relative max-w-6xl mx-auto">
          <div
            class="grid grid-cols-1 md:grid-cols-4 gap-6"
            scrollAnimation
            [scrollConfig]="{
              animation: 'slideUp',
              start: 'top 80%',
              duration: 0.8,
              ease: 'power3.out',
              stagger: 0.1,
              once: true
            }"
          >
            <!-- Metric 1: Large featured card (spans 2 columns) -->
            <div class="md:col-span-2 bg-white rounded-card-lg p-8 shadow-card-elevated hover:shadow-card-glow-indigo transition-all duration-300 hover:scale-102 hover:-rotate-1">
              <div class="text-6xl md:text-7xl font-bold bg-gradient-to-br from-accent-primary to-accent-secondary bg-clip-text text-transparent mb-4">
                {{ metrics[0].value }}
              </div>
              <div class="text-xl text-text-headline font-bold mb-2">
                {{ metrics[0].label }}
              </div>
              <div class="text-base text-text-secondary">{{ metrics[0].description }}</div>
            </div>

            <!-- Metric 2: Tall card -->
            <div class="bg-white rounded-card-lg p-8 shadow-card-elevated hover:shadow-card-glow-purple transition-all duration-300 hover:scale-102 hover:rotate-1">
              <div class="text-5xl md:text-6xl font-bold text-accent-secondary mb-4">
                {{ metrics[1].value }}
              </div>
              <div class="text-lg text-text-headline font-bold mb-2">
                {{ metrics[1].label }}
              </div>
              <div class="text-sm text-text-secondary">{{ metrics[1].description }}</div>
            </div>

            <!-- Metric 3: Tall card -->
            <div class="bg-white rounded-card-lg p-8 shadow-card-elevated hover:shadow-card-glow-indigo transition-all duration-300 hover:scale-102 hover:-rotate-1">
              <div class="text-5xl md:text-6xl font-bold text-accent-tertiary mb-4">
                {{ metrics[2].value }}
              </div>
              <div class="text-lg text-text-headline font-bold mb-2">
                {{ metrics[2].label }}
              </div>
              <div class="text-sm text-text-secondary">{{ metrics[2].description }}</div>
            </div>

            <!-- Metric 4: Wide featured card (spans 2 columns) -->
            <div class="md:col-span-2 bg-gradient-to-br from-accent-lime/20 to-accent-electric/20 rounded-card-lg p-8 shadow-card-elevated hover:shadow-card-glow-purple transition-all duration-300 hover:scale-102 border-2 border-accent-electric/30">
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
