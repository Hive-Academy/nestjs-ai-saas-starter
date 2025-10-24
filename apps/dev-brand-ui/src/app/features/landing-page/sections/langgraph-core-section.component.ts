import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';
import { HijackedScrollTimelineComponent } from '../../../shared/components/hijacked-scroll-timeline.component';
import { HijackedScrollItemDirective } from '../../../core/angular-3d/directives/hijacked-scroll-item.directive';
import { CodeSnippetComponent } from '../../../shared/components/code-snippet.component';
import { DecorativePatternComponent } from '../../../shared/components/decorative-patterns.component';
import type { TimelineStep } from '../../../shared/components/scrolling-code-timeline.component';

/**
 * LangGraph Core Section - Type-Safe Foundation
 *
 * Showcases:
 * - Zero-overhead type safety
 * - Intelligent state management
 * - Sophisticated command patterns
 * - Foundation for ecosystem
 *
 * Design Pattern:
 * - Hero intro with floating metrics
 * - Scrolling timeline (4 business value steps)
 * - Decorative patterns for visual depth
 * - Real business value from library-analysis.md
 *
 * Data Sources:
 * - task-tracking/TASK_2025_017/library-analysis.md (business value)
 * - task-tracking/TASK_2025_024/content-mapping.md (extracted content)
 */
@Component({
  selector: 'app-langgraph-core-section',
  standalone: true,
  imports: [
    CommonModule,
    HijackedScrollTimelineComponent,
    HijackedScrollItemDirective,
    DecorativePatternComponent,
    ScrollAnimationDirective,
  ],
  template: `
    <div
      class="relative w-full bg-gradient-to-b from-white via-purple-50/30 to-white overflow-hidden"
    >
      <!-- Content Container -->
      <div class="container mx-auto px-8 py-12">
        <!-- Section Hero - Becomes sticky -->
        <div
          class="relative text-center py-16 flex flex-col justify-center"
          scrollAnimation
          [scrollConfig]="{
            animation: 'custom',
            start: 'top top',
            end: '+=4000',
            scrub: 0.5,
            from: { scale: 1, y: 0 },
            to: { scale: 0.8, y: -20, opacity: 0.6 }
          }"
        >
          <!-- Data Flow Pattern -->
          <div
            class="absolute inset-0 flex items-center justify-end pointer-events-none"
            scrollAnimation
            [scrollConfig]="{
              animation: 'custom',
              start: 'top 90%',
              end: 'bottom 30%',
              scrub: 0.5,
              from: { scale: 0.6, opacity: 0, rotation: -20, y: 50 },
              to: { scale: 1, opacity: 0.8, rotation: 0, y: -50 }
            }"
          >
            <div class="w-[800px] h-[800px] text-purple-500 pt-18">
              <app-decorative-pattern [pattern]="'data-flow'" />
            </div>
          </div>

          <!-- Hero Content -->
          <div class="relative z-10">
            <!-- Layer Badge -->
            <div
              class="inline-block"
              scrollAnimation
              [scrollConfig]="{
                animation: 'custom',
                start: 'top 80%',
                end: 'top 40%',
                scrub: 0.8,
                from: { opacity: 0, scale: 0.8 },
                to: { opacity: 1, scale: 1 }
              }"
            >
              <span
                class="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-full text-sm font-semibold text-purple-700 mb-6"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"
                  />
                  <path
                    d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"
                  />
                </svg>
                CORE FOUNDATION
              </span>
            </div>

            <!-- Main Headline -->
            <h2
              class="text-7xl font-bold text-gray-900 mb-6 leading-tight text-3d-extruded"
              scrollAnimation
              [scrollConfig]="{
                animation: 'custom',
                start: 'top 75%',
                end: 'top 35%',
                scrub: 1,
                from: { opacity: 0, y: 50 },
                to: { opacity: 1, y: 0 }
              }"
            >
              LangGraph Core
            </h2>

            <!-- Subtitle -->
            <p
              class="text-2xl text-gray-500 leading-relaxed max-w-3xl mx-auto"
              scrollAnimation
              [scrollConfig]="{
                animation: 'custom',
                start: 'top 70%',
                end: 'top 30%',
                scrub: 1,
                from: { opacity: 0, y: 30 },
                to: { opacity: 1, y: 0 }
              }"
            >
              Type-safe foundation for all LangGraph workflows
              <span class="block mt-2 text-purple-600 font-semibold">
                Zero-overhead type safety for rapid AI development
              </span>
            </p>

            <!-- Floating Metrics -->
            <div
              class="flex justify-center gap-12 mt-12"
              scrollAnimation
              [scrollConfig]="{
                animation: 'custom',
                start: 'top 65%',
                end: 'top 25%',
                scrub: 0.8,
                from: { opacity: 0, y: 40 },
                to: { opacity: 1, y: 0 }
              }"
            >
              <div class="text-center">
                <div class="text-4xl font-bold text-indigo-600 mb-2">
                  17 Fields
                </div>
                <div class="text-sm text-gray-500 uppercase tracking-wide">
                  WorkflowState Interface
                </div>
              </div>
              <div class="text-center">
                <div class="text-4xl font-bold text-purple-600 mb-2">
                  Zero 'any'
                </div>
                <div class="text-sm text-gray-500 uppercase tracking-wide">
                  Type Safety
                </div>
              </div>
              <div class="text-center">
                <div class="text-4xl font-bold text-pink-600 mb-2">
                  10+ Modules
                </div>
                <div class="text-sm text-gray-500 uppercase tracking-wide">
                  Foundation For
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Progressive Timeline -->
        <app-hijacked-scroll-timeline
          [scrollHeightPerStep]="1000"
          [start]="'top top'"
        >
          @for (step of codeTimeline(); track step.id; let i = $index) {
          <div hijackedScrollItem [slideDirection]="'none'">
            <div class="relative flex items-start">
              <!-- Decorative patterns -->
              @if (i === 0) {
              <div
                class="absolute left-0 top-1/2 -translate-y-1/2 w-full h-96 pointer-events-none opacity-30"
              >
                <div class="w-full h-full text-purple-400">
                  <app-decorative-pattern [pattern]="'data-flow'" />
                </div>
              </div>
              } @if (i === 1) {
              <div
                class="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none opacity-30"
              >
                <div class="w-full h-full text-indigo-400">
                  <app-decorative-pattern [pattern]="'network-nodes'" />
                </div>
              </div>
              } @if (i === 2) {
              <div
                class="absolute left-[-5%] top-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none opacity-30"
              >
                <div class="w-full h-full text-purple-300">
                  <app-decorative-pattern [pattern]="'circuit-board'" />
                </div>
              </div>
              } @if (i === 3) {
              <div
                class="absolute right-[-5%] top-1/2 -translate-y-1/2 w-[400px] h-[400px] pointer-events-none opacity-30"
              >
                <div class="w-full h-full text-indigo-300">
                  <app-decorative-pattern [pattern]="'gradient-blob'" />
                </div>
              </div>
              }

              <!-- Content -->
              <div class="container mx-auto px-8 relative z-10">
                <div class="grid lg:grid-cols-2 gap-16 items-center">
                  <!-- Content Side -->
                  <div
                    [class.lg:order-1]="step.layout === 'left'"
                    [class.lg:order-2]="step.layout === 'right'"
                    scrollAnimation
                    [scrollConfig]="{
                      animation: 'custom',
                      start: 'top 80%',
                      end: 'top 30%',
                      scrub: 1,
                      from: {
                        opacity: 0,
                        x: step.layout === 'left' ? -60 : 60,
                        y: 20
                      },
                      to: { opacity: 1, x: 0, y: 0 }
                    }"
                  >
                    <div class="inline-flex items-center gap-3 mb-6">
                      <span
                        class="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-white font-bold text-lg shadow-lg"
                      >
                        {{ step.step }}
                      </span>
                      <div
                        class="h-px flex-1 bg-gradient-to-r from-purple-200 to-transparent max-w-[100px]"
                      ></div>
                    </div>

                    <h3
                      class="text-4xl font-bold text-gray-900 mb-4 leading-tight text-3d"
                    >
                      {{ step.title }}
                    </h3>

                    <p class="text-lg text-gray-600 leading-relaxed mb-6">
                      {{ step.description }}
                    </p>

                    @if (step.notes && step.notes.length > 0) {
                    <div class="space-y-3">
                      @for (note of step.notes; track $index) {
                      <div class="flex items-start gap-3">
                        <svg
                          class="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <p class="text-sm text-gray-700">{{ note }}</p>
                      </div>
                      }
                    </div>
                    }
                  </div>

                  <!-- Visual Side -->
                  <div
                    [class.lg:order-2]="step.layout === 'left'"
                    [class.lg:order-1]="step.layout === 'right'"
                    scrollAnimation
                    [scrollConfig]="{
                      animation: 'custom',
                      start: 'top 75%',
                      end: 'top 25%',
                      scrub: 1,
                      from: {
                        opacity: 0,
                        x: step.layout === 'left' ? 80 : -80,
                        scale: 0.95
                      },
                      to: { opacity: 1, x: 0, scale: 1 }
                    }"
                  >
                    @if (step.language === 'image') {
                    <div class="relative group pt-5">
                      <img
                        [src]="step.code"
                        [alt]="step.title"
                        class="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                    </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
          }

          <!-- Integration Cards -->
          <div
            class="fixed bottom-0 left-0 right-0 z-0 pointer-events-none"
            [style.opacity]="ecosystemOpacity()"
          >
            <div
              class="container mx-auto px-8 relative z-10 pointer-events-auto"
            >
              <div class="max-w-5xl mx-auto py-6">
                <h3
                  class="text-2xl font-bold text-gray-900 mb-4 text-center animate-fade-in-up"
                >
                  LangGraph Ecosystem Integration
                </h3>
                <div class="grid grid-cols-3 gap-4">
                  @for (integration of integrations(); track integration.name;
                  let i = $index) {
                  <div
                    class="bg-white/95 backdrop-blur-sm rounded-xl p-4 border border-purple-100 hover:shadow-lg transition-all duration-300 animate-fade-in-up"
                    [style.animation-delay]="i * 100 + 'ms'"
                  >
                    <div class="text-3xl mb-2">{{ integration.icon }}</div>
                    <h4 class="text-base font-bold text-gray-900 mb-1">
                      {{ integration.name }}
                    </h4>
                    <p class="text-xs text-gray-500">
                      {{ integration.description }}
                    </p>
                  </div>
                  }
                </div>
              </div>
            </div>
          </div>
        </app-hijacked-scroll-timeline>
      </div>
    </div>
  `,
  styles: [
    `
      @keyframes fade-in-up {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .animate-fade-in-up {
        animation: fade-in-up 0.6s ease-out forwards;
        opacity: 0;
      }
    `,
  ],
})
export class LanggraphCoreSectionComponent {
  readonly ecosystemOpacity = signal(0);

  constructor() {
    setTimeout(() => {
      this.ecosystemOpacity.set(1);
    }, 500);
  }

  readonly codeTimeline = signal<TimelineStep[]>([
    {
      id: 'type-safety',
      step: 1,
      title: 'Zero-Overhead Type Safety',
      description:
        'WorkflowState interface provides comprehensive type coverage with 17 core fields defining complete workflow structure. Zero `any` types ensure compile-time safety without runtime overhead. Full IntelliSense support accelerates development with intelligent code completion, instant error detection, and refactoring confidence for enterprise AI workflows.',
      code: 'assets/images/libraries/langgraph-core_step_1.png',
      language: 'image',
      layout: 'left',
      notes: [
        '17 core fields define complete workflow state structure',
        'Zero `any` types for compile-time safety without overhead',
        'Full IntelliSense support accelerates development',
        'Instant error detection and refactoring confidence',
      ],
    },
    {
      id: 'state-management',
      step: 2,
      title: 'Intelligent State Management',
      description:
        'LangGraph-compatible WorkflowStateAnnotation provides flexible state management with custom reducers. Create custom state structures with createCustomStateAnnotation() supporting add, overwrite, and merge strategies. Intelligent state transitions ensure predictable workflow execution while maintaining full type safety across all 10+ LangGraph modules.',
      code: 'assets/images/libraries/langgraph-core_step_2.png',
      language: 'image',
      layout: 'right',
      notes: [
        'LangGraph-compatible WorkflowStateAnnotation',
        'Custom reducers (add, overwrite, merge strategies)',
        'Predictable state transitions for workflows',
        'Full type safety across all LangGraph modules',
      ],
    },
    {
      id: 'command-patterns',
      step: 3,
      title: 'Sophisticated Command Patterns',
      description:
        'Advanced control flow commands enable sophisticated workflow orchestration: goto for branching, update for state modifications, end for completion, error for exception handling, retry for resilience, skip for conditional logic, and stop for emergency halts. Command patterns provide declarative workflow control for complex AI decision-making systems.',
      code: 'assets/images/libraries/langgraph-core_step_3.png',
      language: 'image',
      layout: 'left',
      notes: [
        '7 control flow commands (goto, update, end, error, retry, skip, stop)',
        'Declarative workflow control for AI decision-making',
        'Branching, state updates, and exception handling',
        'Emergency halt mechanisms for production safety',
      ],
    },
    {
      id: 'ecosystem-foundation',
      step: 4,
      title: 'Foundation for Ecosystem',
      description:
        'Core foundation provides base interfaces and types for all 10+ LangGraph modules. Automatic integration adapters (NoOp implementations) for optional features like checkpoint, streaming, and memory enable modular architecture. Modules seamlessly integrate without circular dependencies, creating a cohesive enterprise AI development platform.',
      code: 'assets/images/libraries/langgraph-core_step_4.png',
      language: 'image',
      layout: 'right',
      notes: [
        'Base interfaces for all 10+ LangGraph modules',
        'NoOp adapters for optional features (checkpoint, streaming, memory)',
        'Zero circular dependencies with automatic integration',
        'Cohesive enterprise AI development platform',
      ],
    },
  ]);

  readonly integrations = signal([
    {
      icon: '⚙️',
      name: 'Workflow Engine',
      description: 'Execution engine uses core types',
    },
    {
      icon: '📡',
      name: 'Streaming',
      description: 'Implements core streaming interfaces',
    },
    {
      icon: '🤖',
      name: 'Multi-Agent',
      description: 'Extends core state for coordination',
    },
  ]);
}
