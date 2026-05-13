import { NgOptimizedImage } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ScrollAnimationDirective } from '../../../core/gsap-animations/scroll-animation.directive';
import { HijackedScrollTimelineComponent } from '../../../shared/components/hijacked-scroll-timeline.component';
import { HijackedScrollItemDirective } from '../../../core/gsap-animations/hijacked-scroll-item.directive';
import { DecorativePatternComponent } from '../../../shared/components/decorative-patterns.component';
import type { TimelineStep } from '../../../shared/components/scrolling-code-timeline.component';

/**
 * LangGraph Memory Section - Intelligent Memory Management
 *
 * Showcases:
 * - Long-term memory for AI
 * - Automatic context retrieval
 * - Multi-agent memory sharing
 * - Continuous improvement
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
  selector: 'app-langgraph-memory-section',
  standalone: true,
  imports: [
    NgOptimizedImage,
    HijackedScrollTimelineComponent,
    HijackedScrollItemDirective,
    DecorativePatternComponent,
    ScrollAnimationDirective,
  ],
  template: `
    <div
      class="relative w-full bg-gradient-to-b from-white via-indigo-50/30 to-white overflow-hidden"
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
          <!-- Circuit Board Pattern -->
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
            <div class="w-[800px] h-[800px] text-indigo-500 pt-18">
              <app-decorative-pattern [pattern]="'circuit-board'" />
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
                class="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-full text-sm font-semibold text-indigo-700 mb-6"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path
                    fill-rule="evenodd"
                    d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                    clip-rule="evenodd"
                  />
                </svg>
                ORCHESTRATION LAYER
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
              LangGraph Memory
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
              Intelligent memory management for AI agents
              <span class="block mt-2 text-indigo-600 font-semibold">
                Hybrid ChromaDB + Neo4j storage for long-term AI memory
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
                  Hybrid Storage
                </div>
                <div class="text-sm text-gray-500 uppercase tracking-wide">
                  Vector + Graph
                </div>
              </div>
              <div class="text-center">
                <div class="text-4xl font-bold text-purple-600 mb-2">
                  Semantic Search
                </div>
                <div class="text-sm text-gray-500 uppercase tracking-wide">
                  Auto-Embeddings
                </div>
              </div>
              <div class="text-center">
                <div class="text-4xl font-bold text-pink-600 mb-2">
                  User Patterns
                </div>
                <div class="text-sm text-gray-500 uppercase tracking-wide">
                  HITL Learning
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
                        class="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-lg shadow-lg"
                      >
                        {{ step.step }}
                      </span>
                      <div
                        class="h-px flex-1 bg-gradient-to-r from-indigo-200 to-transparent max-w-[100px]"
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
                          class="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0"
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
                        [ngSrc]="step.code"
                        [alt]="step.title"
                        class="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                        fill
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
                    class="bg-white/95 backdrop-blur-sm rounded-xl p-4 border border-indigo-100 hover:shadow-lg transition-all duration-300 animate-fade-in-up"
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
export class LanggraphMemorySectionComponent {
  readonly ecosystemOpacity = signal(0);

  constructor() {
    setTimeout(() => {
      this.ecosystemOpacity.set(1);
    }, 500);
  }

  readonly codeTimeline = signal<TimelineStep[]>([
    {
      id: 'long-term-memory',
      step: 1,
      title: 'Long-Term Memory for AI',
      description:
        'Hybrid storage architecture combines ChromaDB vector database for semantic search with Neo4j graph database for relationship tracking. IMemoryAdapter pattern provides standardized interface across all modules. AI agents gain long-term contextual memory, understanding conversation history, user preferences, and domain knowledge for intelligent, context-aware interactions.',
      code: 'assets/images/libraries/langgraph-memory_step_1.png',
      language: 'image',
      layout: 'left',
      notes: [
        'ChromaDB vector storage + Neo4j graph relationships',
        'IMemoryAdapter standardized interface for all modules',
        'Contextual memory for conversation history',
        'User preferences and domain knowledge retention',
      ],
    },
    {
      id: 'context-retrieval',
      step: 2,
      title: 'Automatic Context Retrieval',
      description:
        'Semantic memory automatically generates embeddings for user queries and retrieves relevant context through similarity search. LangGraph Store Integration (2025 compliant) ensures compatibility with official LangGraph interfaces. AI agents receive contextually relevant information without manual retrieval logic, improving response quality and user experience.',
      code: 'assets/images/libraries/langgraph-memory_step_2.png',
      language: 'image',
      layout: 'right',
      notes: [
        'Automatic embedding generation for semantic search',
        'Similarity search retrieves relevant context',
        'LangGraph Store 2025 compliance',
        'Improved response quality without manual retrieval',
      ],
    },
    {
      id: 'memory-sharing',
      step: 3,
      title: 'Multi-Agent Memory Sharing',
      description:
        'Shared knowledge base enables collaborative AI teams. User pattern analysis extracts common topics, interaction frequency, and user preferences. Graph-based conversation flow analysis tracks relationships between topics and entities. Multiple agents access unified memory, maintaining consistency across collaborative workflows.',
      code: 'assets/images/libraries/langgraph-memory_step_3.png',
      language: 'image',
      layout: 'left',
      notes: [
        'Shared knowledge base for collaborative AI teams',
        'User pattern analysis (topics, frequency, preferences)',
        'Graph-based conversation flow tracking',
        'Unified memory maintains workflow consistency',
      ],
    },
    {
      id: 'continuous-improvement',
      step: 4,
      title: 'Continuous Improvement',
      description:
        'HITL module integration (@Inject IMemoryAdapter) automatically stores human approval patterns for machine learning improvements. System learns from user feedback, improving decision confidence over time. Memory-aware graph compilation optimizes workflows based on historical performance. AI continuously evolves with user interactions.',
      code: 'assets/images/libraries/langgraph-memory_step_4.png',
      language: 'image',
      layout: 'right',
      notes: [
        'HITL approval pattern learning (@Inject IMemoryAdapter)',
        'ML improvements from user feedback',
        'Memory-aware workflow optimization',
        'Continuous AI evolution with user interactions',
      ],
    },
  ]);

  readonly integrations = signal([
    {
      icon: '🤖',
      name: 'Multi-Agent',
      description: 'Agent memory enhancement (@Optional injection)',
    },
    {
      icon: '✋',
      name: 'HITL',
      description: 'Approval pattern learning (@Inject)',
    },
    {
      icon: '⚙️',
      name: 'Workflow Engine',
      description: 'Workflow optimization (@Optional injection)',
    },
  ]);
}
