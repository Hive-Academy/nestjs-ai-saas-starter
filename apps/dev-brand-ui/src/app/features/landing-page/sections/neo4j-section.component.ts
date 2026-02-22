import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ScrollAnimationDirective } from '../../../core/gsap-animations/scroll-animation.directive';
import { HijackedScrollTimelineComponent } from '../../../shared/components/hijacked-scroll-timeline.component';
import { HijackedScrollItemDirective } from '../../../core/gsap-animations/hijacked-scroll-item.directive';
import { DecorativePatternComponent } from '../../../shared/components/decorative-patterns.component';
import type { TimelineStep } from '../../../shared/components/scrolling-code-timeline.component';

/**
 * Neo4j Section - Enterprise Graph Database
 *
 * Showcases:
 * - Model complex relationships for AI decision-making
 * - Enterprise security built-in (5-decorator system)
 * - Graph algorithms for AI applications
 * - Multi-tenant graph isolation
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
  selector: 'app-neo4j-section',
  standalone: true,
  imports: [
    CommonModule,
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
        <!-- Section Hero with Integrated Network Nodes - Becomes sticky -->
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
          <!-- Network Nodes SVG - Larger and more visible -->
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
              <app-decorative-pattern [pattern]="'network-nodes'" />
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
              Neo4j
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
              Enterprise-grade graph relationships for AI knowledge graphs
              <span class="block mt-2 text-indigo-600 font-semibold">
                Model complex relationships for AI decision-making
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
                  7 Decorators
                </div>
                <div class="text-sm text-gray-500 uppercase tracking-wide">
                  CRUD System
                </div>
              </div>
              <div class="text-center">
                <div class="text-4xl font-bold text-purple-600 mb-2">
                  100+ Connections
                </div>
                <div class="text-sm text-gray-500 uppercase tracking-wide">
                  Concurrent Pool
                </div>
              </div>
              <div class="text-center">
                <div class="text-4xl font-bold text-pink-600 mb-2">
                  1000+ Nodes/sec
                </div>
                <div class="text-sm text-gray-500 uppercase tracking-wide">
                  Graph Traversal
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
                class="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none opacity-30 decoration-step-0"
                [attr.data-decoration-index]="i"
              >
                <div class="w-full h-full text-purple-400 decoration-inner">
                  <app-decorative-pattern [pattern]="'network-nodes'" />
                </div>
              </div>
              } @if (i === 1) {
              <div
                class="absolute left-[-5%] top-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none opacity-30 decoration-step-1"
                [attr.data-decoration-index]="i"
              >
                <div class="w-full h-full text-indigo-400 decoration-inner">
                  <app-decorative-pattern [pattern]="'circuit-board'" />
                </div>
              </div>
              } @if (i === 2) {
              <div
                class="absolute right-[-5%] top-1/2 -translate-y-1/2 w-[400px] h-[400px] pointer-events-none opacity-30 decoration-step-2"
                [attr.data-decoration-index]="i"
              >
                <div class="w-full h-full text-purple-300 decoration-inner">
                  <app-decorative-pattern [pattern]="'data-flow'" />
                </div>
              </div>
              } @if (i === 3) {
              <div
                class="absolute left-[-5%] top-1/2 -translate-y-1/2 w-[400px] h-[400px] pointer-events-none opacity-30 decoration-step-3"
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
                    <!-- AI-Generated Business Value Image -->
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
export class Neo4jSectionComponent {
  /**
   * Ecosystem section opacity control
   */
  readonly ecosystemOpacity = signal(0);

  constructor() {
    // Fade in ecosystem after mount
    setTimeout(() => {
      this.ecosystemOpacity.set(1);
    }, 500);
  }

  /**
   * Business value timeline - 4 steps
   */
  readonly codeTimeline = signal<TimelineStep[]>([
    {
      id: 'complex-relationships',
      step: 1,
      title: 'Model Complex Relationships',
      description:
        'Revolutionary 7-decorator Entity CRUD system (@FindOne, @FindMany, @CreateEntity, @UpdateEntity, @DeleteEntity, @CountEntities, @ExistsEntity) reduces boilerplate code by 90%. Build sophisticated knowledge graphs and relationship models for AI decision-making with type-safe queries, enterprise-grade Neo4jQueryBuilder, and intelligent graph traversal algorithms.',
      code: 'assets/images/libraries/neo4j_step_1.png',
      language: 'image',
      layout: 'left',
      notes: [
        '7 CRUD decorators eliminate 90% of boilerplate code',
        'Type-safe query builder for complex graph relationships',
        'Knowledge graphs for AI reasoning and decision-making',
        'Intelligent graph traversal with fluent API',
      ],
    },
    {
      id: 'enterprise-security',
      step: 2,
      title: 'Enterprise Security Built-In',
      description:
        'Comprehensive 5-decorator security layer provides enterprise-grade protection: @Safe for input sanitization, @Authorize for role-based access control, @ValidateInput for schema validation, @AuditLog for compliance tracking, and @RateLimit for DoS protection. Type-safe query builder prevents injection attacks while maintaining developer productivity with full TypeScript support.',
      code: 'assets/images/libraries/neo4j_step_2.png',
      language: 'image',
      layout: 'right',
      notes: [
        '5 security decorators (Safe, Authorize, Validate, Audit, RateLimit)',
        'Type-safe query builder prevents injection attacks',
        'GDPR, HIPAA, SOC2 compliance with audit logging',
        'Enterprise access control with role-based permissions',
      ],
    },
    {
      id: 'graph-algorithms',
      step: 3,
      title: 'Graph Algorithms for AI',
      description:
        'Specialized GraphRepository provides advanced algorithms for AI applications: centrality analysis identifies key nodes in knowledge graphs, community detection discovers relationships patterns, shortest path finds optimal connections. Perfect for knowledge graphs, recommendation engines, relationship analysis, and network intelligence for AI decision-making systems.',
      code: 'assets/images/libraries/neo4j_step_3.png',
      language: 'image',
      layout: 'left',
      notes: [
        'Centrality algorithms identify key knowledge graph nodes',
        'Community detection discovers relationship patterns',
        'Shortest path finds optimal entity connections',
        'Recommendation engines powered by graph analysis',
      ],
    },
    {
      id: 'multi-tenant-isolation',
      step: 4,
      title: 'Multi-Tenant Graph Isolation',
      description:
        'Database-per-tenant architecture provides complete data isolation for SaaS applications. Automatic tenant routing ensures each customer data remains separate with zero cross-contamination risk. ACID transactions, connection pooling, and intelligent caching optimize performance while maintaining enterprise-grade security and compliance standards.',
      code: 'assets/images/libraries/neo4j_step_4.png',
      language: 'image',
      layout: 'right',
      notes: [
        'Database-per-tenant complete data isolation',
        'Automatic tenant routing prevents cross-contamination',
        'ACID transactions with connection pooling (100+ concurrent)',
        'Enterprise-grade security and compliance',
      ],
    },
  ]);

  /**
   * Integration ecosystem cards - 3 per library
   */
  readonly integrations = signal([
    {
      icon: '🧠',
      name: 'Memory Module',
      description: 'Graph storage for relationship tracking',
    },
    {
      icon: '🤖',
      name: 'Multi-Agent',
      description: 'Agent coordination and relationship modeling',
    },
    {
      icon: '⚙️',
      name: 'Workflow Engine',
      description: 'Workflow relationship analysis',
    },
  ]);
}
