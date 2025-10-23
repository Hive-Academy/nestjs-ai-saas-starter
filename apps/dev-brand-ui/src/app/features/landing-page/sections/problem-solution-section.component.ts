import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';

/**
 * Problem/Solution Section
 * Establishes pain points TypeScript developers face when building AI applications
 * Positions solution with 4 proof metrics
 */
@Component({
  selector: 'app-problem-solution-section',
  standalone: true,
  imports: [CommonModule, ScrollAnimationDirective],
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
          TypeScript developers building AI applications face a painful choice: use Python-style
          frameworks like LangGraph (pattern mismatch), stitch together raw SDKs (integration hell),
          or spend months building production infrastructure (multi-tenancy, monitoring, approvals).
        </p>

        <!-- Solution Card -->
        <div
          class="bg-white rounded-2xl shadow-lg p-8 md:p-12 max-w-4xl mx-auto mb-16"
          scrollAnimation
          [scrollConfig]="{
            animation: 'slideUp',
            start: 'top 70%',
            duration: 0.8,
            once: true
          }"
        >
          <h3 class="text-2xl md:text-4xl font-bold text-gray-900 mb-6">
            Our Solution: NestJS Patterns for AI/ML
          </h3>
          <p class="text-lg md:text-xl text-gray-600 leading-relaxed">
            NestJS AI SaaS Starter applies familiar NestJS patterns (decorators, dependency injection,
            modules) to AI/ML operations. ChromaDB and Neo4j get TypeORM-style repositories. LangGraph
            workflows become declarative classes with @Node and @Edge decorators. Enterprise features
            (monitoring, approvals, streaming) work out-of-the-box.
          </p>
        </div>

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
            <div class="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-xl hover:scale-105 transition-all duration-300">
              <div class="text-5xl md:text-6xl font-bold text-indigo-600 mb-4">{{ metric.value }}</div>
              <div class="text-lg text-gray-900 font-semibold mb-2">{{ metric.label }}</div>
              <div class="text-sm text-gray-500">{{ metric.description }}</div>
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: []
})
export class ProblemSolutionSectionComponent {
  readonly metrics = [
    {
      value: '90%',
      label: 'Code Reduction',
      description: 'Vector operations: 50 lines → 5 lines'
    },
    {
      value: '60%',
      label: 'Less Approval Overhead',
      description: 'ML confidence scoring auto-approves high-confidence tasks'
    },
    {
      value: '75+',
      label: 'Lines → 1 Line',
      description: 'WorkflowStreamingOrchestrator one-liner execution'
    },
    {
      value: '$262K',
      label: 'ROI Savings',
      description: '11 weeks infrastructure development eliminated'
    }
  ];
}
