import { CommonModule } from '@angular/common';
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
    HijackedScrollTimelineComponent,
    HijackedScrollItemDirective,
    CodeSnippetComponent,
    DecorativePatternComponent,
    ScrollAnimationDirective,
  ],
  template: `
    <div class="relative w-full bg-gradient-to-b from-white via-indigo-50/30 to-white overflow-hidden">
      <!-- Content Container -->
      <div class="container mx-auto px-8 py-12">
        <!-- Section Hero with Integrated Vector Arrows (70vh) -->
        <div class="relative text-center py-24 flex flex-col justify-center">
          <!-- Vector Arrows SVG - Larger and more visible -->
          <div
            class="absolute inset-0 flex items-center justify-center pointer-events-none"
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
            <div class="w-[800px] h-[800px] text-indigo-500">
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
          <span class="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-full text-sm font-semibold text-indigo-700 mb-6">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
              <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
              <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
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
            <div class="text-4xl font-bold text-indigo-600 mb-2">Sub-100ms</div>
            <div class="text-sm text-gray-500 uppercase tracking-wide">Vector Search</div>
          </div>
          <div class="text-center">
            <div class="text-4xl font-bold text-purple-600 mb-2">70%</div>
            <div class="text-sm text-gray-500 uppercase tracking-wide">Less Boilerplate</div>
          </div>
          <div class="text-center">
            <div class="text-4xl font-bold text-pink-600 mb-2">10K+</div>
            <div class="text-sm text-gray-500 uppercase tracking-wide">Documents/sec</div>
          </div>
        </div>
        </div>
      </div>

      <!-- Progressive Code Timeline with Content Projection -->
      <app-hijacked-scroll-timeline [scrollHeightPerStep]="1000">
        @for (step of codeTimeline(); track step.id; let i = $index) {
          <div hijackedScrollItem [slideDirection]="getSlideDirection(step.layout)">
            <!-- Step Container with Decoration -->
            <div class="relative min-h-[60vh] flex items-center">
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
              }
              @if (i === 1) {
                <div
                  class="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none opacity-30 decoration-step-1"
                  [attr.data-decoration-index]="i"
                >
                  <div class="w-full h-full text-indigo-400 decoration-inner">
                    <app-decorative-pattern [pattern]="'network-nodes'" />
                  </div>
                </div>
              }
              @if (i === 2) {
                <div
                  class="absolute left-[-5%] top-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none opacity-30 decoration-step-2"
                  [attr.data-decoration-index]="i"
                >
                  <div class="w-full h-full text-purple-300 decoration-inner">
                    <app-decorative-pattern [pattern]="'circuit-board'" />
                  </div>
                </div>
              }
              @if (i === 3) {
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
                  <!-- Content Side (Title + Description) -->
                  <div
                    [class.lg:order-1]="step.layout === 'left'"
                    [class.lg:order-2]="step.layout === 'right'"
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
                    <h3 class="text-4xl font-bold text-gray-900 mb-4 leading-tight text-3d">
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

                  <!-- Code Side -->
                  <div
                    [class.lg:order-2]="step.layout === 'left'"
                    [class.lg:order-1]="step.layout === 'right'"
                  >
                    @if (step.code) {
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
      </app-hijacked-scroll-timeline>

      <!-- Integration Ecosystem with Network Nodes  -->
      <div class="relative py-24 flex items-center">
        <!-- Network Nodes SVG - Large and visible -->
        <div
          class="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[700px] h-[700px] pointer-events-none"
          scrollAnimation
          [scrollConfig]="{
            animation: 'custom',
            start: 'top 90%',
            end: 'bottom 10%',
            scrub: 0.6,
            from: { scale: 0.8, opacity: 0, x: 80, rotation: -10 },
            to: { scale: 1.1, opacity: 0.8, x: -20, rotation: 10 }
          }"
        >
          <div class="w-full h-full text-indigo-400">
            <app-decorative-pattern [pattern]="'network-nodes'" />
          </div>
        </div>

      <div
        class="relative z-10 max-w-5xl mx-auto"
        scrollAnimation
        [scrollConfig]="{
          animation: 'custom',
          start: 'top 75%',
          end: 'top 25%',
          scrub: 1,
          from: { opacity: 0, y: 60 },
          to: { opacity: 1, y: 0 }
        }"
      >
        <div class=" p-12 ">
          <h3 class="text-3xl font-bold text-gray-900 mb-6 text-center">
            LangGraph Ecosystem Integration
          </h3>
          <div class="grid grid-cols-3 gap-6">
            @for (integration of integrations(); track integration.name) {
              <div class="bg-white rounded-2xl p-6 border border-indigo-100 hover:shadow-lg transition-shadow duration-300">
                <div class="text-4xl mb-4">{{ integration.icon }}</div>
                <h4 class="text-lg font-bold text-gray-900 mb-2">{{ integration.name }}</h4>
                <p class="text-sm text-gray-500">{{ integration.description }}</p>
              </div>
            }
          </div>
        </div>
      </div>

      </div>


      </div>
    </div>
  `,
  styles: [],
})
export class ChromadbSectionComponent {
  /**
   * Convert layout type to slide direction
   */
  getSlideDirection(layout: 'left' | 'right' | 'center'): 'left' | 'right' | 'none' {
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
   * Progressive code revelation timeline
   * Real code extracted from libs/nestjs-chromadb/*
   */
  readonly codeTimeline = signal<TimelineStep[]>([
    {
      id: 'install',
      step: 1,
      title: 'Installation & Setup',
      description: 'Install with NPM and configure in seconds. Supports OpenAI, HuggingFace, and Cohere embedding providers. SSL and multi-tenant configurations available with automatic health checks and connection pooling.',
      code: `npm install @hive-academy/nestjs-chromadb

ChromaDBModule.forRoot({
  connection: { host: 'localhost', port: 8000 },
  embedding: { provider: 'openai' }
})`,
      language: 'typescript',
      layout: 'left',
      notes: [
        'Zero configuration for local development',
        'Production-ready defaults',
        'Auto health checks & connection pooling',
      ],
    },
    {
      id: 'entity',
      step: 2,
      title: 'TypeORM-Style Decorators',
      description: 'Use familiar decorators to define entities. Auto-generate embeddings, timestamps, and IDs. Full type safety with generic metadata support. Automatic JSON serialization for complex types.',
      code: `@ChromaEntity({
  collection: 'knowledge',
  autoEmbed: true,
  autoTimestamp: true
})
class KnowledgeDocument extends BaseChromaEntity {
  @ChromaId() id!: string;
  @ChromaProp() content!: string;
  metadata!: KnowledgeMetadata;
}`,
      language: 'typescript',
      layout: 'right',
      notes: [
        'TypeORM-style decorators',
        'Auto JSON serialization',
        'Smart defaults (timestamps, IDs, embeddings)',
      ],
    },
    {
      id: 'repository',
      step: 3,
      title: '15+ Methods Inherited',
      description: 'Extend ChromaDBRepository to inherit 15+ CRUD methods automatically: findById, findAll, create, update, upsert, delete, search, searchWithScores, and more. Add custom business logic as needed. 90% less code vs manual implementation with full type safety.',
      code: `@Injectable()
class KnowledgeRepository extends ChromaDBRepository<KnowledgeDocument> {
  constructor(chromaDB: ChromaDBService) {
    super(KnowledgeDocument, 'knowledge', chromaDB);
  }

  // All CRUD + search methods inherited ✅
  // Add custom methods as needed
}`,
      language: 'typescript',
      layout: 'left',
      notes: [
        '15+ methods: CRUD, search, upsert, batch ops',
        'Full type safety with generics',
        'Composition pattern, zero boilerplate',
      ],
    },
    {
      id: 'usage',
      step: 4,
      title: 'RAG in 3 Lines',
      description: 'Build production-ready RAG applications with semantic search, metadata filtering, and hybrid search. Sub-100ms performance for 10K+ documents. Built-in caching, retry mechanisms, comprehensive error handling, and performance monitoring.',
      code: `// Semantic search with metadata filters
const context = await repo.search(query, {
  limit: 5,
  where: { category: 'technical' }
});

// Hybrid search with scores
const results = await repo.searchWithScores(query, {
  limit: 10,
  where: { author: 'team' }
});`,
      language: 'typescript',
      layout: 'right',
      notes: [
        'Sub-100ms for 10K+ docs',
        'Hybrid search: vector + metadata',
        'Built-in caching & retry',
        'Production monitoring included',
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
      description: 'Long-term contextual memory for AI agents powered by vector search',
    },
    {
      icon: '🔄',
      name: 'Workflow Engine',
      description: 'State persistence and retrieval for complex agent workflows',
    },
    {
      icon: '📊',
      name: 'Monitoring',
      description: 'Vector operation metrics and performance tracking',
    },
  ]);
}
