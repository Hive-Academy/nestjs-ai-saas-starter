import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  signal,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';
import { Scene3DComponent } from '../../../core/angular-3d/components/scene-3d.component';
import { ValuePropositions3DSceneComponent } from './scene-graphs/value-propositions-3d-scene.component';
import type { ValueProposition } from '../interfaces';

/**
 * Value Propositions Section Component - Scroll-Driven 3D Showcase
 *
 * REDESIGNED: Inspired by Design-4 (threejs.journey) - Sticky sidebar + scroll-reveal + 3D
 *
 * Features:
 * - Sticky numbered sidebar (01-11) for navigation
 * - Full-viewport sections for each library
 * - Scroll-triggered content animations
 * - Active section tracking with IntersectionObserver
 * - Click-to-navigate from sidebar
 * - 3D scene synchronized with scroll (Phase 2 COMPLETE)
 */
@Component({
  selector: 'app-value-propositions-section',
  standalone: true,
  imports: [CommonModule, ScrollAnimationDirective, Scene3DComponent],
  template: `
    <section class="relative bg-white">
      <!-- Fixed 3D Scene Background (Center-Right) -->
      <div
        class="fixed right-1/4 top-1/2 -translate-y-1/2 w-96 h-96 z-10 pointer-events-none hidden lg:block opacity-40"
      >
        <app-scene-3d [sceneGraph]="ValuePropositions3DSceneComponent" />
      </div>
      <!-- Sticky Numbered Sidebar (Left) -->
      <nav class="fixed left-8 top-1/2 -translate-y-1/2 z-20 hidden lg:block">
        <div class="space-y-6">
          @for (valueProposition of valuePropositions; track $index) {
          <button
            (click)="scrollToLibrary($index)"
            [class]="getSidebarItemClass($index)"
            class="group relative flex items-center gap-4 transition-all duration-300"
          >
            <!-- Number Badge -->
            <div
              class="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300"
              [class.bg-accent-primary]="activeIndex() === $index"
              [class.text-white]="activeIndex() === $index"
              [class.bg-gray-200]="activeIndex() !== $index"
              [class.text-gray-400]="activeIndex() !== $index"
              [class.scale-125]="activeIndex() === $index"
            >
              <span class="text-sm font-bold">{{
                ($index + 1).toString().padStart(2, '0')
              }}</span>
            </div>

            <!-- Active Indicator Bar -->
            @if (activeIndex() === $index) {
            <div
              class="absolute -left-4 w-1 h-8 bg-accent-primary rounded-full"
            ></div>
            }

            <!-- Hover Tooltip -->
            <div
              class="absolute left-12 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
            >
              <div
                class="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg"
              >
                {{ valueProposition.packageName.replace('@hive-academy/', '') }}
              </div>
            </div>
          </button>
          }
        </div>
      </nav>

      <!-- Main Content Area (Right) -->
      <div class="lg:ml-24">
        @for (valueProposition of valuePropositions; track $index) {
        <article
          [id]="'library-' + $index"
          class="min-h-screen flex items-center px-8 md:px-16 py-20"
          [class.bg-white]="$index % 2 === 0"
          [class.bg-gray-50]="$index % 2 === 1"
        >
          <div class="max-w-4xl mx-auto w-full">
            <!-- Package Number + Name -->
            <div
              class="mb-8"
              scrollAnimation
              [scrollConfig]="{
                animation: 'fadeIn',
                start: 'top 80%',
                duration: 0.6,
                once: true
              }"
            >
              <div class="flex items-center gap-4 mb-4">
                <span
                  class="text-6xl md:text-7xl font-bold text-accent-primary/20"
                >
                  {{ ($index + 1).toString().padStart(2, '0') }}
                </span>
                <div
                  class="h-px flex-1 bg-gradient-to-r from-accent-primary/30 to-transparent"
                ></div>
              </div>
              <h3 class="text-base md:text-lg font-mono text-accent-primary">
                {{ valueProposition.packageName }}
              </h3>
            </div>

            <!-- Business Headline -->
            <h2
              class="text-4xl md:text-6xl font-bold text-text-headline leading-tight mb-8"
              scrollAnimation
              [scrollConfig]="{
                animation: 'slideUp',
                start: 'top 75%',
                duration: 0.8,
                once: true
              }"
            >
              {{ valueProposition.businessHeadline }}
            </h2>

            <!-- Pain Point -->
            <div
              class="mb-8"
              scrollAnimation
              [scrollConfig]="{
                animation: 'fadeIn',
                start: 'top 70%',
                duration: 0.8,
                delay: 0.2,
                once: true
              }"
            >
              <div class="flex items-center gap-2 mb-3">
                <span class="w-2 h-2 rounded-full bg-accent-danger"></span>
                <span
                  class="text-sm font-semibold text-accent-danger uppercase tracking-wide"
                  >The Problem</span
                >
              </div>
              <p class="text-lg md:text-xl text-text-secondary leading-relaxed">
                {{ valueProposition.painPoint }}
              </p>
            </div>

            <!-- Solution -->
            <div
              class="mb-8"
              scrollAnimation
              [scrollConfig]="{
                animation: 'fadeIn',
                start: 'top 70%',
                duration: 0.8,
                delay: 0.4,
                once: true
              }"
            >
              <div class="flex items-center gap-2 mb-3">
                <span class="w-2 h-2 rounded-full bg-accent-success"></span>
                <span
                  class="text-sm font-semibold text-accent-success uppercase tracking-wide"
                  >Our Solution</span
                >
              </div>
              <p class="text-lg md:text-xl text-text-primary leading-relaxed">
                {{ valueProposition.solution }}
              </p>
            </div>

            <!-- Capabilities -->
            <div
              class="mb-12"
              scrollAnimation
              [scrollConfig]="{
                animation: 'slideUp',
                start: 'top 75%',
                duration: 0.6,
                delay: 0.6,
                once: true
              }"
            >
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                @for (capability of valueProposition.capabilities; track
                capability) {
                <div class="flex items-start gap-3">
                  <span class="text-accent-primary text-xl mt-0.5">✓</span>
                  <span class="text-base text-text-primary">{{
                    capability
                  }}</span>
                </div>
                }
              </div>
            </div>

            <!-- Metric Callout -->
            <div
              class="inline-flex items-center gap-4 px-8 py-6 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 rounded-2xl border border-accent-primary/20"
              scrollAnimation
              [scrollConfig]="{
                animation: 'scaleIn',
                start: 'top 80%',
                duration: 0.6,
                delay: 0.8,
                ease: 'back.out',
                once: true
              }"
            >
              <div
                class="text-5xl md:text-6xl font-bold bg-gradient-to-br from-accent-primary to-accent-secondary bg-clip-text text-transparent"
              >
                {{ valueProposition.metricValue }}
              </div>
              <div>
                <div class="text-lg font-bold text-text-headline">
                  {{ valueProposition.metricLabel }}
                </div>
                <div class="text-sm text-text-secondary">
                  vs traditional approach
                </div>
              </div>
            </div>
          </div>
        </article>
        }
      </div>
    </section>
  `,
  styles: [],
})
export class ValuePropositionsSectionComponent implements OnInit, OnDestroy {
  // Active section tracking
  activeIndex = signal(0);
  // Scroll progress within active section (0-1)
  scrollProgress = signal(0);

  // Expose 3D scene component for template
  readonly ValuePropositions3DSceneComponent =
    ValuePropositions3DSceneComponent;

  private observer?: IntersectionObserver;

  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {
    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  /**
   * Calculate scroll progress within active section (0-1)
   * Updates on every scroll event to animate 3D scene
   */
  @HostListener('window:scroll')
  onScroll(): void {
    if (typeof window === 'undefined') return;

    const activeElement = document.getElementById(
      `library-${this.activeIndex()}`
    );
    if (!activeElement) return;

    const rect = activeElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Calculate progress from when section enters viewport (bottom) to when it exits (top)
    // 0 = section just entered viewport from bottom
    // 1 = section about to exit viewport from top
    const sectionHeight = rect.height;
    const scrolledIntoView = viewportHeight - rect.top;
    const totalScrollDistance = sectionHeight + viewportHeight;

    const progress = Math.max(
      0,
      Math.min(1, scrolledIntoView / totalScrollDistance)
    );

    this.scrollProgress.set(progress);
  }

  /**
   * Setup IntersectionObserver to track which library is in view
   */
  private setupIntersectionObserver(): void {
    if (typeof window === 'undefined') return;

    const options: IntersectionObserverInit = {
      root: null,
      rootMargin: '-50% 0px -50% 0px', // Trigger when center of viewport
      threshold: 0,
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          const index = parseInt(id.replace('library-', ''), 10);
          if (!isNaN(index)) {
            this.activeIndex.set(index);
          }
        }
      });
    }, options);

    // Observe all library sections
    setTimeout(() => {
      const sections =
        this.elementRef.nativeElement.querySelectorAll('[id^="library-"]');
      sections.forEach((section: Element) => {
        this.observer?.observe(section);
      });
    }, 100);
  }

  /**
   * Scroll to specific library section
   */
  scrollToLibrary(index: number): void {
    const element = document.getElementById(`library-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Get sidebar item classes based on active state
   */
  getSidebarItemClass(index: number): string {
    return this.activeIndex() === index ? 'active' : '';
  }

  /**
   * All 11 Value Propositions
   * Reference: research-report.md (TASK_2025_026), design-handoff.md:844-923
   */
  readonly valuePropositions: ValueProposition[] = [
    // 1. ChromaDB
    {
      packageName: '@hive-academy/nestjs-chromadb',
      businessHeadline: 'Build RAG Applications in Minutes',
      painPoint:
        '50+ lines of manual ChromaDB client setup, embedding generation, error handling, retry logic, tenant isolation...',
      solution:
        'TypeORM-style repository pattern with automatic embeddings, tenant isolation, and caching via decorators',
      capabilities: [
        'Multi-provider embeddings (OpenAI, Cohere, local)',
        'Multi-tenant database-per-tenant isolation',
        'Intelligent caching with @Cached decorator',
        'Auto-chunking for large documents',
      ],
      metricValue: '90%',
      metricLabel: 'Less Code',
    },

    // 2. Neo4j
    {
      packageName: '@hive-academy/nestjs-neo4j',
      businessHeadline: 'Graph Queries Without Cypher Boilerplate',
      painPoint:
        'Raw Cypher queries with manual parameter binding, connection pooling, and transaction management for every graph operation',
      solution:
        'Specialized repository pattern for graphs with type-safe query builder and automatic relationship mapping',
      capabilities: [
        'GraphRepository pattern for nodes and relationships',
        'Type-safe Cypher query builder',
        'Multi-tenant graph isolation',
        'Built-in dependency injection',
      ],
      metricValue: '85%',
      metricLabel: 'Less Boilerplate',
    },

    // 3. Memory (Core)
    {
      packageName: '@hive-academy/langgraph-memory',
      businessHeadline: 'Contextual AI Without Memory Management Hell',
      painPoint:
        'Manual context retrieval from multiple sources, token limit calculations, relevance scoring, and memory persistence',
      solution:
        'Unified memory facade coordinating vector search, graph relationships, and conversation history with automatic context assembly',
      capabilities: [
        'Auto-context assembly from ChromaDB + Neo4j + history',
        'Token-aware context windowing',
        'Relevance scoring and pruning',
        'Multi-session memory isolation',
      ],
      metricValue: '75%',
      metricLabel: 'Faster Context Retrieval',
    },

    // 4. Checkpoint
    {
      packageName: '@hive-academy/langgraph-checkpoint',
      businessHeadline: 'State Persistence Without Manual Snapshot Management',
      painPoint:
        'Manual state persistence, recovery, branching, and compaction for every workflow error or debugging session',
      solution:
        'Auto-fallback checkpoint system with 8 specialized services for seamless state management from memory to production databases',
      capabilities: [
        'Auto-fallback from MemorySaver to Redis/PostgreSQL',
        'Checkpoint compaction and migration',
        'Recovery strategies for automatic error recovery',
        'Point-in-time state snapshots',
      ],
      metricValue: '80%',
      metricLabel: 'Less State Management Code',
    },

    // 5. Functional API
    {
      packageName: '@hive-academy/langgraph-functional-api',
      businessHeadline: 'Declarative Workflows with NestJS Decorators',
      painPoint:
        'Manual StateGraph construction with verbose addNode, addEdge, and compile calls for every workflow definition',
      solution:
        'NestJS-style decorators (@Workflow, @Node, @Edge) that compile to executable StateGraphs via metadata processing',
      capabilities: [
        'Task-based workflows with @Entrypoint/@Task',
        'Node-based graphs with @Node/@Edge',
        'Automatic metadata compilation',
        'Full TypeScript type safety',
      ],
      metricValue: '70%',
      metricLabel: 'Less Workflow Code',
    },

    // 6. Multi-Agent
    {
      packageName: '@hive-academy/langgraph-multi-agent',
      businessHeadline: 'Agent Coordination Without Manual Orchestration',
      painPoint:
        'Manual agent message routing, state aggregation, retry logic, and error recovery for every multi-agent workflow',
      solution:
        '5 declarative topology patterns (Supervisor, Swarm, Hierarchical, Sequential, Network) with 16+ specialized coordination services',
      capabilities: [
        'LLM-powered supervisor routing',
        'Autonomous swarm collaboration',
        'Command pattern for retry/skip/error recovery',
        'HITL integration for human approval',
      ],
      metricValue: '65%',
      metricLabel: 'Less Coordination Code',
    },

    // 7. Platform
    {
      packageName: '@hive-academy/langgraph-platform',
      businessHeadline: 'LangGraph Cloud Integration Without HTTP Boilerplate',
      painPoint:
        'Manual HTTP client setup for LangGraph Platform API with retry logic, webhook handling, and thread management',
      solution:
        'Production-ready Platform client with automatic retry policies, hybrid local/cloud deployment, and managed state persistence',
      capabilities: [
        'Full Platform API support (assistants, threads, runs)',
        'Exponential backoff retry policy',
        'Webhook integration for async workflows',
        'Cron-scheduled workflow execution',
      ],
      metricValue: '75%',
      metricLabel: 'Less Platform Integration Code',
    },

    // 8. Time-Travel
    {
      packageName: '@hive-academy/langgraph-time-travel',
      businessHeadline:
        'Production Debugging with Temporal Workflow Navigation',
      painPoint:
        'No way to replay production workflows, branch timelines, or modify state for debugging without affecting live users',
      solution:
        'Time-travel debugging system with workflow replay, branch management, and state restoration for production issue investigation',
      capabilities: [
        'Replay workflows from any checkpoint',
        'Create alternate timelines for A/B testing',
        'Modify state for debugging sessions',
        'Production-safe debugging mode',
      ],
      metricValue: '90%',
      metricLabel: 'Faster Production Debugging',
    },

    // 9. Monitoring
    {
      packageName: '@hive-academy/langgraph-monitoring',
      businessHeadline:
        'Ecosystem-Wide Observability Without Manual Instrumentation',
      painPoint:
        'Manual metric collection, alerting setup, dashboard creation, and performance tracking for each workflow and service',
      solution:
        'Facade pattern coordinating 5 monitoring services with automatic Prometheus instrumentation across all 13 libraries',
      capabilities: [
        'Automatic instrumentation of all ecosystem libraries',
        'Prometheus backend for production metrics',
        'Rule-based alerting with webhook/email/Slack',
        'Performance tracking for latency and throughput',
      ],
      metricValue: '85%',
      metricLabel: 'Less Monitoring Code',
    },

    // 10. HITL (Human-in-the-Loop)
    {
      packageName: '@hive-academy/langgraph-hitl',
      businessHeadline:
        'Enterprise Approval Workflows with ML Confidence Scoring',
      painPoint:
        'Manual approval request creation, timeout management, notification sending, and confidence scoring for every human decision point',
      solution:
        '16 specialized services with ML-powered confidence scoring reducing approval overhead by 60% through intelligent auto-approval',
      capabilities: [
        'ML confidence scoring for auto-approval',
        'Multi-level approval chains',
        'Timeout management with fallback strategies',
        'Audit logging of all approval decisions',
      ],
      metricValue: '60%',
      metricLabel: 'Less Approval Overhead',
    },

    // 11. Streaming
    {
      packageName: '@hive-academy/langgraph-streaming',
      businessHeadline:
        'Real-Time Workflow Streaming Without WebSocket Complexity',
      painPoint:
        'Manual WebSocket gateway setup, stream coordination, backpressure handling, and event broadcasting for every real-time workflow',
      solution:
        'WorkflowStreamingOrchestrator replacing 75+ lines of manual orchestration with production-ready WebSocket gateway and RxJS observables',
      capabilities: [
        'One-liner workflow execution + streaming setup',
        'Token/event/progress streaming decorators',
        'Production WebSocket with auth and rate limiting',
        'Automatic backpressure and reconnection',
      ],
      metricValue: '75%',
      metricLabel: 'Less Streaming Code',
    },
  ];
}
