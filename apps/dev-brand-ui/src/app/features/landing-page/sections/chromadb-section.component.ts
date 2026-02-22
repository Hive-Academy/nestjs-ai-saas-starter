import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';
import { HijackedScrollTimelineComponent } from '../../../shared/components/hijacked-scroll-timeline.component';
import { HijackedScrollItemDirective } from '../../../core/angular-3d/directives/hijacked-scroll-item.directive';
import { CodeSnippetComponent } from '../../../shared/components/code-snippet.component';
import { DecorativePatternComponent } from '../../../shared/components/decorative-patterns.component';
import type { TimelineStep } from '../../../shared/components/scrolling-code-timeline.component';

/**
 * ChromaDB Section - Vector Database for Semantic Search
 *
 * Showcases:
 * - TypeORM-style repository pattern
 * - Real codebase examples from libs/nestjs-chromadb/*
 * - Progressive code revelation timeline
 * - Floating 3D particle decorations
 * - Asymmetric scroll animations
 *
 * Design Pattern:
 * - Hero intro with floating metrics
 * - Scrolling code timeline (Install → Configure → Use → Integrate)
 * - 3D particle effects for visual depth
 * - Real code extracted from actual library implementation
 *
 * Data Sources:
 * - task-tracking/TASK_2025_017/library-analysis.md (business value)
 * - libs/nestjs-chromadb/CLAUDE.md (real code examples)
 * - libs/nestjs-chromadb/src/lib/* (actual implementation)
 */
@Component({
  selector: 'app-chromadb-section',
  standalone: true,
  imports: [
    CommonModule,
    NgOptimizedImage,
    HijackedScrollTimelineComponent,
    HijackedScrollItemDirective,
    CodeSnippetComponent,
    DecorativePatternComponent,
    ScrollAnimationDirective,
  ],
  template: `
    <div
      class="relative w-full bg-gradient-to-b from-white via-indigo-50/30 to-white overflow-hidden"
    >
      <!-- Content Container -->
      <div class="container mx-auto px-8 py-12">
        <!-- Section Hero with Integrated Vector Arrows - Becomes sticky -->
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
          <!-- Vector Arrows SVG - Larger and more visible -->
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
              <app-decorative-pattern [pattern]="'vector-arrows'" />
            </div>
          </div>

          <!-- Hero Content (layered on top) -->
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
                  <path
                    d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z"
                  />
                  <path
                    d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z"
                  />
                  <path
                    d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z"
                  />
                </svg>
                DATA FOUNDATION LAYER
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
              ChromaDB
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
              Vector database for semantic search and RAG applications.
              <span class="block mt-2 text-indigo-600 font-semibold">
                Build production-ready AI features in minutes, not weeks.
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
                  Sub-100ms
                </div>
                <div class="text-sm text-gray-500 uppercase tracking-wide">
                  Vector Search
                </div>
              </div>
              <div class="text-center">
                <div class="text-4xl font-bold text-purple-600 mb-2">70%</div>
                <div class="text-sm text-gray-500 uppercase tracking-wide">
                  Less Boilerplate
                </div>
              </div>
              <div class="text-center">
                <div class="text-4xl font-bold text-pink-600 mb-2">10K+</div>
                <div class="text-sm text-gray-500 uppercase tracking-wide">
                  Documents/sec
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Progressive Code Timeline with Content Projection -->
        <app-hijacked-scroll-timeline
          [scrollHeightPerStep]="1000"
          [start]="'top top'"
        >
          @for (step of codeTimeline(); track step.id; let i = $index) {
          <div hijackedScrollItem [slideDirection]="'none'">
            <!-- Step Container with Decoration -->
            <div class="relative  flex items-start">
              <!-- Decoration: Alternating patterns per step with scroll animations -->
              @if (i === 0) {
              <div
                class="absolute left-0 top-1/2 -translate-y-1/2 w-full h-96 pointer-events-none opacity-30 decoration-step-0"
                [attr.data-decoration-index]="i"
              >
                <div class="w-full h-full text-purple-400 decoration-inner">
                  <app-decorative-pattern [pattern]="'data-flow'" />
                </div>
              </div>
              } @if (i === 1) {
              <div
                class="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none opacity-30 decoration-step-1"
                [attr.data-decoration-index]="i"
              >
                <div class="w-full h-full text-indigo-400 decoration-inner">
                  <app-decorative-pattern [pattern]="'network-nodes'" />
                </div>
              </div>
              } @if (i === 2) {
              <div
                class="absolute left-[-5%] top-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none opacity-30 decoration-step-2"
                [attr.data-decoration-index]="i"
              >
                <div class="w-full h-full text-purple-300 decoration-inner">
                  <app-decorative-pattern [pattern]="'circuit-board'" />
                </div>
              </div>
              } @if (i === 3) {
              <div
                class="absolute right-[-5%] top-1/2 -translate-y-1/2 w-[400px] h-[400px] pointer-events-none opacity-30 decoration-step-3"
                [attr.data-decoration-index]="i"
              >
                <div class="w-full h-full text-indigo-300 decoration-inner">
                  <app-decorative-pattern [pattern]="'gradient-blob'" />
                </div>
              </div>
              }

              <!-- Content -->
              <div class="container mx-auto px-8 relative z-10">
                <div class="grid lg:grid-cols-2 gap-16 items-center">
                  <!-- Content Side (Title + Description) with slide animation -->
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
                    <!-- Step Number Badge -->
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

                    <!-- Title -->
                    <h3
                      class="text-4xl font-bold text-gray-900 mb-4 leading-tight text-3d"
                    >
                      {{ step.title }}
                    </h3>

                    <!-- Description -->
                    <p class="text-lg text-gray-600 leading-relaxed mb-6">
                      {{ step.description }}
                    </p>

                    <!-- Notes -->
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

                  <!-- Visual Side (Image or Code) with fade + translateX animation -->
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
                    <!-- AI-Generated Business Value Image - Flat, no border/shadow -->
                    <div class="relative group pt-5">
                      <img
                        [ngSrc]="step.code"
                        [alt]="step.title"
                        class="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                        fill
                      />
                    </div>
                    } @else if (!step.code || step.code === '') {
                    <!-- Image Placeholder -->
                    <div
                      class="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-indigo-100/50 aspect-video bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50"
                    >
                      <div
                        class="absolute inset-0 flex items-center justify-center"
                      >
                        <div class="text-center p-8">
                          <div
                            class="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"
                          >
                            <svg
                              class="w-12 h-12 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                          <p
                            class="text-sm font-semibold text-indigo-600 uppercase tracking-wide"
                          >
                            Visual Asset
                          </p>
                          <p class="text-xs text-gray-500 mt-2">
                            Step {{ step.step }}: {{ step.id }}
                          </p>
                        </div>
                      </div>
                    </div>
                    } @else {
                    <!-- Code Snippet -->
                    <app-code-snippet
                      [code]="step.code"
                      [language]="step.language || 'typescript'"
                    />
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
          }

          <!-- Integration Ecosystem - Sticky at bottom, always visible -->
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
export class ChromadbSectionComponent {
  /**
   * Computed opacity for ecosystem section based on scroll position
   */
  readonly ecosystemOpacity = signal(0);

  constructor() {
    // Fade in ecosystem section after component mounts
    setTimeout(() => {
      this.ecosystemOpacity.set(1);
    }, 500);
  }
  /**
   * Convert layout type to slide direction
   */
  getSlideDirection(
    layout: 'left' | 'right' | 'center'
  ): 'left' | 'right' | 'none' {
    switch (layout) {
      case 'left':
        return 'left';
      case 'right':
        return 'right';
      default:
        return 'none';
    }
  }

  /**
   * Business value timeline
   * Based on task-tracking/TASK_2025_017/library-analysis.md
   */
  readonly codeTimeline = signal<TimelineStep[]>([
    {
      id: 'rag-pipeline',
      step: 1,
      title: 'Build RAG Applications in Minutes',
      description:
        'Transform your enterprise knowledge into intelligent AI systems. Our ChromaDB integration enables semantic search across documents with AI-powered understanding, bringing ChatGPT-like capabilities to your internal data. Deploy production-ready RAG applications without months of development.',
      code: 'assets/images/step_1.png', // AI-generated image
      language: 'image',
      layout: 'left',
      notes: [
        'RAG pipelines ready in 3 lines of code',
        'Semantic search with AI understanding',
        'Enterprise knowledge retrieval',
        'Build ChatGPT-like internal systems',
      ],
    },
    {
      id: 'developer-productivity',
      step: 2,
      title: '70% Less Boilerplate Code',
      description:
        'Our TypeORM-style repository pattern eliminates repetitive code. Inherit 15+ CRUD methods automatically, focus on business logic instead of infrastructure. Smart defaults for embeddings, timestamps, and IDs mean you write only what matters.',
      code: 'assets/images/step_2.png', // AI-generated image
      language: 'image',
      layout: 'right',
      notes: [
        '15+ methods inherited automatically',
        'TypeORM-style familiar patterns',
        'Zero boilerplate, maximum productivity',
        'Focus on features, not infrastructure',
      ],
    },
    {
      id: 'enterprise-ready',
      step: 3,
      title: 'Enterprise Multi-Tenancy Built-In',
      description:
        'Launch your SaaS with confidence. Complete tenant isolation ensures data privacy and compliance with GDPR, HIPAA, and SOC2 standards. Intelligent caching, connection pooling, and automatic health checks provide production-grade reliability from day one.',
      code: 'assets/images/step_3.png', // AI-generated image
      language: 'image',
      layout: 'left',
      notes: [
        'Complete data isolation per tenant',
        'GDPR, HIPAA, SOC2 compliant',
        'Production-ready reliability',
        'Intelligent caching & health checks',
      ],
    },
    {
      id: 'performance',
      step: 4,
      title: 'Sub-100ms Performance at Scale',
      description:
        'Handle 10,000+ documents with lightning-fast vector search under 100ms. Batch operations process 100 documents per second. Built-in performance monitoring, retry mechanisms, and comprehensive error handling ensure your AI stays responsive as you scale.',
      code: 'assets/images/step_4.png', // AI-generated image
      language: 'image',
      layout: 'right',
      notes: [
        'Sub-100ms search for 10K+ documents',
        'Batch: 100 documents/second',
        'Built-in performance monitoring',
        'Production error handling & retry',
      ],
    },
  ]);

  /**
   * LangGraph ecosystem integrations
   */
  readonly integrations = signal([
    {
      icon: '🧠',
      name: 'Memory Module',
      description:
        'Long-term contextual memory for AI agents powered by vector search',
    },
    {
      icon: '🔄',
      name: 'Workflow Engine',
      description:
        'State persistence and retrieval for complex agent workflows',
    },
    {
      icon: '📊',
      name: 'Monitoring',
      description: 'Vector operation metrics and performance tracking',
    },
  ]);
}
