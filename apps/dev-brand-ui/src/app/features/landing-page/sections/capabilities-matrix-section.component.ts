import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';
import { CountUpDirective } from '../directives/count-up.directive';

/**
 * Enterprise Feature Explorer Section Component
 *
 * REDESIGNED: Interactive Feature Explorer - No more boring matrix!
 *
 * Transforms the traditional capabilities matrix into an engaging,
 * interactive showcase of enterprise features.
 *
 * Design Philosophy:
 * - Full-screen feature cards (vertical stack)
 * - Each feature is a hero with its own moment
 * - Visual icons/emojis for each feature
 * - "Why it matters" value proposition
 * - Library support shown as interactive badges
 * - Real-world use case examples
 * - Scroll-driven animations
 * - Modern, engaging, Design-1 (Vercel) inspired
 */
@Component({
  selector: 'app-capabilities-matrix-section',
  standalone: true,
  imports: [CommonModule, ScrollAnimationDirective, CountUpDirective],
  template: `
    <section
      class="relative bg-gradient-to-b from-white via-gray-50 to-white py-20 md:py-32"
      aria-labelledby="features-headline"
    >
      <div class="max-w-7xl mx-auto px-8 md:px-16">
        <!-- Section Headline -->
        <div class="text-center mb-20">
          <h2
            id="features-headline"
            class="text-5xl md:text-7xl font-bold bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-success bg-clip-text text-transparent mb-6 leading-tight"
            scrollAnimation
            [scrollConfig]="{
              animation: 'fadeIn',
              start: 'top 80%',
              duration: 0.8,
              once: false
            }"
          >
            Enterprise-Ready Out of the Box
          </h2>
          <p
            class="text-xl md:text-2xl text-text-secondary max-w-4xl mx-auto leading-relaxed mb-8"
            scrollAnimation
            [scrollConfig]="{
              animation: 'slideUp',
              start: 'top 75%',
              duration: 0.8,
              delay: 0.2,
              once: false
            }"
          >
            Zero infrastructure code. Built-in production capabilities across
            all 11 libraries.
          </p>

          <!-- Feature Count Badge -->
          <div
            class="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-card-elevated border border-gray-200"
            scrollAnimation
            [scrollConfig]="{
              animation: 'scaleIn',
              start: 'top 70%',
              duration: 0.6,
              delay: 0.4,
              ease: 'back.out',
              once: false
            }"
          >
            <span
              class="text-3xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent"
            >
              11
            </span>
            <span class="text-lg font-semibold text-text-headline">
              Production Features
            </span>
          </div>
        </div>

        <!-- Feature Cards -->
        @for (feature of features; track feature.name) {
        <article
          class="mb-20 last:mb-0"
          scrollAnimation
          [scrollConfig]="{
            animation: 'fadeIn',
            start: 'top 70%',
            duration: 1,
            delay: ($index % 3) * 0.15,
            once: false
          }"
        >
          <div
            class="bg-white rounded-3xl border border-gray-200 shadow-card-elevated overflow-hidden hover:shadow-card-glow-indigo transition-shadow duration-500"
          >
            <!-- Feature Header -->
            <div
              class="px-8 md:px-12 pt-8 md:pt-12 pb-6 bg-gradient-to-br from-gray-50 to-white"
            >
              <div class="flex items-start gap-6 mb-6">
                <!-- Icon -->
                <div
                  class="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-4xl md:text-5xl shadow-lg flex-shrink-0"
                >
                  {{ feature.icon }}
                </div>

                <!-- Title & Description -->
                <div class="flex-1">
                  <h3
                    class="text-3xl md:text-4xl font-bold text-text-headline mb-3"
                  >
                    {{ feature.name }}
                  </h3>
                  <p
                    class="text-lg md:text-xl text-text-secondary leading-relaxed mb-4"
                  >
                    {{ feature.description }}
                  </p>
                  <div
                    class="inline-flex items-center gap-2 px-4 py-2 bg-accent-success/10 text-accent-success text-sm font-semibold rounded-full border border-accent-success/20"
                  >
                    <span>✓</span>
                    <span>{{ feature.whyItMatters }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Library Support -->
            <div class="px-8 md:px-12 py-6 bg-white border-t border-gray-200">
              <div class="flex items-center justify-between mb-4">
                <div
                  class="text-sm font-semibold text-text-headline uppercase tracking-wide"
                >
                  Supported Across
                </div>
                <div
                  class="text-2xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent"
                >
                  {{ feature.supportedLibraries.length }}/11 Libraries
                </div>
              </div>

              <!-- Library Badges Grid -->
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                @for (lib of feature.supportedLibraries; track lib.name) {
                <div
                  class="group relative px-4 py-3 bg-gradient-to-br from-accent-primary/5 to-accent-secondary/5 rounded-xl border border-accent-primary/20 hover:border-accent-primary/40 hover:shadow-md transition-all duration-300 cursor-pointer"
                >
                  <div class="text-sm font-semibold text-accent-primary mb-1">
                    {{ lib.name }}
                  </div>
                  <div class="text-xs text-text-secondary">
                    {{ lib.implementation }}
                  </div>
                </div>
                }
              </div>
            </div>

            <!-- Use Case -->
            <div
              class="px-8 md:px-12 py-6 bg-gradient-to-br from-gray-50 to-white border-t border-gray-200"
            >
              <div
                class="text-sm font-semibold text-text-headline uppercase tracking-wide mb-3"
              >
                Real-World Use Case
              </div>
              <p class="text-base text-text-primary leading-relaxed">
                {{ feature.useCase }}
              </p>
            </div>
          </div>
        </article>
        }

        <!-- ROI Callout -->
        <div
          class="mt-20 p-12 bg-gradient-to-br from-accent-primary/10 via-accent-secondary/10 to-accent-success/10 rounded-3xl border border-accent-primary/20"
          scrollAnimation
          [scrollConfig]="{
            animation: 'scaleIn',
            start: 'top 80%',
            duration: 1,
            ease: 'back.out',
            once: false
          }"
        >
          <div class="text-center">
            <div
              class="text-6xl md:text-7xl font-bold bg-gradient-to-r from-accent-success to-accent-tertiary bg-clip-text text-transparent mb-4"
            >
              $<span appCountUp [targetValue]="262800" [duration]="2500"
                >0</span
              >
            </div>
            <div class="text-2xl md:text-3xl font-bold text-text-headline mb-4">
              Infrastructure Development Savings
            </div>
            <p
              class="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed"
            >
              Traditional approach:
              <span class="font-bold text-accent-danger">11 weeks</span> = 1,760
              hours = $264,000 in developer time.<br />
              Our approach:
              <span class="font-bold text-accent-success">1 day</span> = 8 hours
              = $1,200.<br />
              <span class="text-2xl font-bold text-accent-success"
                >You save $262,800.</span
              >
            </p>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class CapabilitiesMatrixSectionComponent {
  /**
   * Enterprise features transformed into engaging showcase cards
   * Each feature includes icon, description, value prop, library support, and use case
   */
  features = [
    {
      name: 'Multi-Tenancy',
      icon: '🏢',
      description:
        'Isolate data per customer with built-in tenant management across all layers',
      whyItMatters: 'Zero-config SaaS data isolation',
      supportedLibraries: [
        { name: 'ChromaDB', implementation: 'Database-per-tenant' },
        { name: 'Neo4j', implementation: 'Database-per-tenant' },
        { name: 'Core', implementation: 'Tenant isolation' },
        { name: 'Memory', implementation: 'Tenant scoping' },
        { name: 'Checkpoint', implementation: 'Tenant partitioning' },
        { name: 'Functional-API', implementation: 'Tenant decorators' },
        { name: 'Multi-Agent', implementation: 'Tenant contexts' },
        { name: 'Platform', implementation: 'Tenant routing' },
        { name: 'Time-Travel', implementation: 'Tenant history' },
        { name: 'Monitoring', implementation: 'Tenant metrics' },
        { name: 'HITL', implementation: 'Tenant approvals' },
      ],
      useCase:
        "A legal AI SaaS serves 50+ law firms. Each firm's case documents, embeddings, and graph relationships are automatically isolated—no manual tenant logic required.",
    },
    {
      name: 'Production Monitoring',
      icon: '📊',
      description:
        'Prometheus metrics, alerting, and dashboards built into every library',
      whyItMatters: 'Full observability without instrumentation',
      supportedLibraries: [
        { name: 'ChromaDB', implementation: 'Query metrics' },
        { name: 'Neo4j', implementation: 'Cypher metrics' },
        { name: 'Core', implementation: 'Workflow metrics' },
        { name: 'Memory', implementation: 'Memory metrics' },
        { name: 'Checkpoint', implementation: 'State metrics' },
        { name: 'Functional-API', implementation: 'Node metrics' },
        { name: 'Multi-Agent', implementation: 'Agent metrics' },
        { name: 'Platform', implementation: 'Platform metrics' },
        { name: 'Time-Travel', implementation: 'History metrics' },
        { name: 'Monitoring', implementation: 'Full observability' },
        { name: 'HITL', implementation: 'Approval metrics' },
      ],
      useCase:
        'An e-commerce AI assistant tracks workflow latency, token usage, and approval rates in Grafana—alerting on Slack when response times exceed 2 seconds.',
    },
    {
      name: 'Smart Retry Logic',
      icon: '🔄',
      description:
        'Exponential backoff, circuit breakers, and replay strategies for every operation',
      whyItMatters: 'Resilient operations without manual retry code',
      supportedLibraries: [
        { name: 'ChromaDB', implementation: 'Auto-retry' },
        { name: 'Neo4j', implementation: 'Exponential backoff' },
        { name: 'Core', implementation: 'Workflow retry' },
        { name: 'Memory', implementation: 'Context retry' },
        { name: 'Checkpoint', implementation: 'State recovery' },
        { name: 'Functional-API', implementation: 'Node retry' },
        { name: 'Multi-Agent', implementation: 'Agent retry' },
        { name: 'Platform', implementation: 'Platform retry' },
        { name: 'Time-Travel', implementation: 'Replay' },
        { name: 'Monitoring', implementation: 'Retry tracking' },
        { name: 'HITL', implementation: 'Approval retry' },
      ],
      useCase:
        'An OpenAI rate limit triggers automatic exponential backoff across all LLM calls—workflows recover without manual intervention or lost context.',
    },
    {
      name: 'Intelligent Caching',
      icon: '⚡',
      description:
        'Multi-layer caching with TTL, invalidation, and semantic cache strategies',
      whyItMatters: '10x faster responses with zero cache logic',
      supportedLibraries: [
        { name: 'ChromaDB', implementation: 'Query cache' },
        { name: 'Neo4j', implementation: 'Result cache' },
        { name: 'Core', implementation: 'Workflow cache' },
        { name: 'Memory', implementation: 'Context cache' },
        { name: 'Checkpoint', implementation: 'State cache' },
        { name: 'Functional-API', implementation: 'Node cache' },
        { name: 'Multi-Agent', implementation: 'Agent cache' },
        { name: 'Platform', implementation: 'Platform cache' },
        { name: 'Time-Travel', implementation: 'History cache' },
        { name: 'Monitoring', implementation: 'Metrics cache' },
        { name: 'HITL', implementation: 'Approval cache' },
      ],
      useCase:
        'A customer support bot caches similar queries semantically—"How do I reset password?" serves from cache for 95% of variations, reducing LLM costs by 80%.',
    },
    {
      name: 'Audit Logging',
      icon: '📝',
      description:
        'Complete audit trails for compliance, debugging, and security investigations',
      whyItMatters: 'SOC 2 compliance without manual logging',
      supportedLibraries: [
        { name: 'ChromaDB', implementation: 'Query logs' },
        { name: 'Neo4j', implementation: 'Cypher logs' },
        { name: 'Core', implementation: 'Workflow logs' },
        { name: 'Memory', implementation: 'Context logs' },
        { name: 'Checkpoint', implementation: 'State logs' },
        { name: 'Functional-API', implementation: 'Node execution logs' },
        { name: 'Multi-Agent', implementation: 'Agent logs' },
        { name: 'Platform', implementation: 'Platform logs' },
        { name: 'Time-Travel', implementation: 'Full history' },
        { name: 'Monitoring', implementation: 'Audit trails' },
        { name: 'HITL', implementation: 'Approval logs' },
      ],
      useCase:
        'A financial AI logs every decision—auditors trace a $50K loan approval through 12 workflow steps, 3 agent collaborations, and 2 human approvals with timestamps.',
    },
    {
      name: 'Error Recovery',
      icon: '🛡️',
      description:
        'Automatic rollback, state restoration, and graceful degradation strategies',
      whyItMatters: 'Self-healing workflows without ops intervention',
      supportedLibraries: [
        { name: 'ChromaDB', implementation: 'Auto-recovery' },
        { name: 'Neo4j', implementation: 'Transaction rollback' },
        { name: 'Core', implementation: 'Workflow recovery' },
        { name: 'Memory', implementation: 'Context recovery' },
        { name: 'Checkpoint', implementation: 'State restoration' },
        { name: 'Functional-API', implementation: 'Node recovery' },
        { name: 'Multi-Agent', implementation: 'Agent recovery' },
        { name: 'Platform', implementation: 'Platform recovery' },
        { name: 'Time-Travel', implementation: 'Point-in-time recovery' },
        { name: 'Monitoring', implementation: 'Error tracking' },
        { name: 'HITL', implementation: 'Manual recovery' },
      ],
      useCase:
        'A multi-agent workflow fails midway—the system automatically restores to the last checkpoint, retries the failed agent, and continues without losing 10 minutes of work.',
    },
    {
      name: 'Rate Limiting',
      icon: '🚦',
      description:
        'Token bucket, sliding window, and distributed rate limiting per tenant',
      whyItMatters: 'Cost control and fair usage without custom logic',
      supportedLibraries: [
        { name: 'ChromaDB', implementation: 'Query throttling' },
        { name: 'Neo4j', implementation: 'Query throttling' },
        { name: 'Core', implementation: 'Workflow throttling' },
        { name: 'Memory', implementation: 'Context throttling' },
        { name: 'Checkpoint', implementation: 'State throttling' },
        { name: 'Functional-API', implementation: 'Node throttling' },
        { name: 'Multi-Agent', implementation: 'Agent throttling' },
        { name: 'Platform', implementation: 'Platform throttling' },
        { name: 'Time-Travel', implementation: 'History throttling' },
        { name: 'Monitoring', implementation: 'Metric throttling' },
        { name: 'HITL', implementation: 'Approval throttling' },
      ],
      useCase:
        'A freemium SaaS limits free users to 10 AI queries/day—rate limits enforce tier restrictions across all workflows without touching application code.',
    },
    {
      name: 'Authentication & Authorization',
      icon: '🔐',
      description:
        'JWT, API keys, RBAC, and OAuth2 integration with NestJS guards',
      whyItMatters: 'Enterprise security patterns without custom middleware',
      supportedLibraries: [
        { name: 'ChromaDB', implementation: 'API keys' },
        { name: 'Neo4j', implementation: 'Basic + JWT' },
        { name: 'Core', implementation: 'Workflow auth' },
        { name: 'Memory', implementation: 'Context auth' },
        { name: 'Checkpoint', implementation: 'State auth' },
        { name: 'Functional-API', implementation: 'Node auth' },
        { name: 'Multi-Agent', implementation: 'Agent auth' },
        { name: 'Platform', implementation: 'Platform auth' },
        { name: 'Time-Travel', implementation: 'History auth' },
        { name: 'Monitoring', implementation: 'Metrics auth' },
        { name: 'HITL', implementation: 'Approval auth' },
      ],
      useCase:
        'A healthcare AI enforces HIPAA access controls—only authorized clinicians can invoke workflows that query patient embeddings or approve treatment plans.',
    },
    {
      name: 'Real-Time Streaming',
      icon: '🌊',
      description:
        'WebSocket, SSE, and RxJS observables for token-by-token LLM responses',
      whyItMatters: 'ChatGPT-style streaming with one decorator',
      supportedLibraries: [
        { name: 'ChromaDB', implementation: 'Result streaming' },
        { name: 'Neo4j', implementation: 'Result streaming' },
        { name: 'Core', implementation: 'Workflow streaming' },
        { name: 'Memory', implementation: 'Context streaming' },
        { name: 'Checkpoint', implementation: 'State streaming' },
        { name: 'Functional-API', implementation: 'Node streaming' },
        { name: 'Multi-Agent', implementation: 'Agent streaming' },
        { name: 'Platform', implementation: 'Platform streaming' },
        { name: 'Time-Travel', implementation: 'History streaming' },
        { name: 'Monitoring', implementation: 'Metrics streaming' },
        { name: 'HITL', implementation: 'Approval streaming' },
      ],
      useCase:
        'A code generation AI streams TypeScript token-by-token to the frontend—users see real-time progress with automatic backpressure and reconnection handling.',
    },
    {
      name: 'Health Checks',
      icon: '❤️',
      description:
        'Liveness, readiness, and dependency health checks for Kubernetes deployments',
      whyItMatters: 'Production-ready orchestration without custom probes',
      supportedLibraries: [
        { name: 'ChromaDB', implementation: 'Database health' },
        { name: 'Neo4j', implementation: 'Database health' },
        { name: 'Core', implementation: 'Workflow health' },
        { name: 'Memory', implementation: 'Memory health' },
        { name: 'Checkpoint', implementation: 'Checkpoint health' },
        { name: 'Functional-API', implementation: 'API health' },
        { name: 'Multi-Agent', implementation: 'Agent health' },
        { name: 'Platform', implementation: 'Platform health' },
        { name: 'Time-Travel', implementation: 'History health' },
        { name: 'Monitoring', implementation: 'Full health' },
        { name: 'HITL', implementation: 'Approval health' },
      ],
      useCase:
        'Kubernetes restarts unhealthy pods automatically when ChromaDB connection drops—health checks detect failures and trigger recovery before users notice.',
    },
    {
      name: 'Comprehensive Documentation',
      icon: '📚',
      description:
        'API docs, examples, migration guides, and troubleshooting for every library',
      whyItMatters: 'Onboard developers in hours not weeks',
      supportedLibraries: [
        { name: 'ChromaDB', implementation: 'Full API docs' },
        { name: 'Neo4j', implementation: 'Full API docs' },
        { name: 'Core', implementation: 'Full API docs' },
        { name: 'Memory', implementation: 'Full API docs' },
        { name: 'Checkpoint', implementation: 'Full API docs' },
        { name: 'Functional-API', implementation: 'Full API docs' },
        { name: 'Multi-Agent', implementation: 'Full API docs' },
        { name: 'Platform', implementation: 'Full API docs' },
        { name: 'Time-Travel', implementation: 'Full API docs' },
        { name: 'Monitoring', implementation: 'Full API docs' },
        { name: 'HITL', implementation: 'Full API docs' },
      ],
      useCase:
        'A new developer joins the team Friday—by Monday they ship a RAG pipeline using docs, examples, and migration guides without asking senior devs for help.',
    },
  ];
}
