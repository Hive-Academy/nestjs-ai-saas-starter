/**
 * Production Systems Section - 2x2 Grid Layout
 *
 * Showcases 4 production-ready modules for enterprise deployment:
 * - Checkpoint (state persistence)
 * - Monitoring (observability)
 * - Time-Travel (debugging)
 * - Platform (cloud integration)
 */
import { CommonModule } from '@angular/common';
import { Component, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SectionParticleBackgroundComponent } from '../../../shared/components/section-particle-background.component';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';

interface ProductionModule {
  icon: string;
  title: string;
  description: string;
  color: 'green' | 'blue' | 'purple' | 'orange';
  features: string[];
  metric: { value: string; label: string };
  status: 'production' | 'beta' | 'alpha';
  slug: string;
}

@Component({
  selector: 'app-production-systems-section',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SectionParticleBackgroundComponent,
    ScrollAnimationDirective,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section
      class="w-full min-h-screen relative bg-gradient-to-br from-gray-900/95 via-black to-gray-900/95 py-20 overflow-hidden"
    >
      <!-- Particle Background -->
      <div class="absolute inset-0 pointer-events-none opacity-20">
        <app-section-particle-background
          [particleCount]="30"
          tintColor="purple"
          [particleSize]="0.8"
          [particleOpacity]="0.4"
        />
      </div>

      <div class="container mx-auto px-8 relative z-10">
        <div
          class="text-center mb-16"
          scrollAnimation
          [scrollConfig]="{
            animation: 'slideUp',
            start: 'top 80%',
            duration: 0.6,
            ease: 'power2.out'
          }"
        >
          <h2
            class="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 bg-clip-text text-transparent"
          >
            🏭 Production Systems
          </h2>
          <p class="text-xl md:text-2xl text-white/80 max-w-4xl mx-auto">
            Enterprise-grade modules for deployment, monitoring, debugging, and
            cloud integration
          </p>
        </div>

        <!-- 2x2 Grid Layout -->
        <div class="grid md:grid-cols-2 gap-8 max-w-7xl mx-auto">
          @for (module of productionModules(); track module.title; let i =
          $index) {
          <a
            [routerLink]="['/library', module.slug]"
            class="relative group block cursor-pointer"
            scrollAnimation
            [scrollConfig]="{
              animation: 'slideUp',
              start: 'top 80%',
              duration: 0.6,
              delay: i * 0.15,
              ease: 'power2.out'
            }"
          >
            <div
              class="relative h-full bg-{{
                module.color
              }}-600/30 backdrop-blur-sm border border-{{
                module.color
              }}-400/30 rounded-2xl p-8 hover:bg-white/20 hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl"
            >
              <!-- Icon & Status Badge -->
              <div class="flex items-start justify-between mb-4">
                <div class="text-5xl">{{ module.icon }}</div>
                <div
                  class="px-3 py-1 rounded-full text-xs font-semibold"
                  [ngClass]="{
                    'bg-green-500/20 text-green-400 border border-green-400/30':
                      module.status === 'production',
                    'bg-blue-500/20 text-blue-400 border border-blue-400/30':
                      module.status === 'beta',
                    'bg-orange-500/20 text-orange-400 border border-orange-400/30':
                      module.status === 'alpha'
                  }"
                >
                  {{ module.status.toUpperCase() }}
                </div>
              </div>

              <!-- Title & Description -->
              <h3
                class="text-2xl md:text-3xl font-bold text-{{
                  module.color
                }}-400 mb-3"
              >
                {{ module.title }}
              </h3>
              <p class="text-base md:text-lg text-white/70 mb-6">
                {{ module.description }}
              </p>

              <!-- Features List -->
              <ul class="space-y-2 mb-6">
                @for (feature of module.features; track feature) {
                <li class="flex items-start gap-2 text-white/60 text-sm">
                  <span class="text-{{ module.color }}-400 mt-1">▸</span>
                  <span>{{ feature }}</span>
                </li>
                }
              </ul>

              <!-- Business Metric -->
              <div class="bg-black/30 rounded p-4 text-center">
                <span class="text-{{ module.color }}-300 font-bold text-lg">{{
                  module.metric.value
                }}</span>
                <div class="text-xs text-white/50 mt-1">
                  {{ module.metric.label }}
                </div>
              </div>
            </div>
          </a>
          }
        </div>

        <!-- Production Ready Badge -->
        <div
          class="text-center mt-12"
          scrollAnimation
          [scrollConfig]="{
            animation: 'fadeIn',
            start: 'top 80%',
            duration: 0.6,
            ease: 'power2.out'
          }"
        >
          <div
            class="inline-block px-8 py-4 bg-gradient-to-r from-green-600/30 to-blue-600/30 backdrop-blur-sm border border-green-400/30 rounded-xl"
          >
            <div class="flex items-center gap-3">
              <span class="text-3xl">✅</span>
              <div class="text-left">
                <div class="text-lg font-bold text-green-400">
                  Production Ready
                </div>
                <div class="text-sm text-white/60">
                  Enterprise deployment with comprehensive monitoring
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class ProductionSystemsSectionComponent {
  readonly productionModules = signal<ProductionModule[]>([
    {
      icon: '💾',
      title: 'Checkpoint',
      description:
        'Automagical state persistence with 8-service facade pattern and automatic fallback to in-memory storage',
      color: 'green',
      features: [
        'Auto-fallback to MemorySaver for zero-config start',
        'Multi-storage backends (SQLite, Redis, Postgres)',
        '8-service SOLID architecture with graceful degradation',
        'Auto-cleanup with configurable retention policies',
        'Real-time health monitoring and performance metrics',
        'Ecosystem-wide integration (Multi-Agent, HITL, Workflow-Engine)',
      ],
      metric: { value: 'Zero-Config', label: 'Auto-fallback storage' },
      status: 'production',
      slug: 'langgraph-checkpoint',
    },
    {
      icon: '📊',
      title: 'Monitoring',
      description:
        'Production observability with 5-service facade for real-time metrics, intelligent alerting, and health monitoring',
      color: 'blue',
      features: [
        'Real-time metrics collection (counters, gauges, histograms, timers)',
        'Intelligent alerting with multi-channel notifications',
        'Comprehensive health checks with dependency tracking',
        'Performance anomaly detection and baseline analysis',
        'Prometheus backend with batch processing',
        'Dashboard & visualization with customizable widgets',
      ],
      metric: { value: 'Real-Time', label: 'Production observability' },
      status: 'production',
      slug: 'langgraph-monitoring',
    },
    {
      icon: '⏰',
      title: 'Time-Travel',
      description:
        'Sophisticated workflow debugging with replay, branching, and state comparison for temporal navigation',
      color: 'purple',
      features: [
        'Workflow replay from any checkpoint with state modifications',
        'Branch management for experimentation and A/B testing',
        'State comparison and deep diff analysis',
        'Execution history timeline visualization',
        'Debug sessions with production-safe isolation',
        'Environment-based settings (3 branches prod, 10 dev)',
      ],
      metric: { value: 'Time-Travel', label: 'Workflow debugging' },
      status: 'production',
      slug: 'langgraph-time-travel',
    },
    {
      icon: '☁️',
      title: 'Platform',
      description:
        'LangGraph Platform integration with HTTP client for hosted assistants, thread management, and webhook events',
      color: 'orange',
      features: [
        'Hosted assistant management on LangGraph Platform',
        'Thread lifecycle operations with state persistence',
        'Run execution monitoring with streaming support',
        'Real-time webhook notifications and secure payload handling',
        'Exponential backoff retry policy (3 retries, 30s max)',
        'Hybrid deployment: local workflows + cloud assistants',
      ],
      metric: { value: 'Hybrid', label: 'Cloud + Local' },
      status: 'production',
      slug: 'langgraph-platform',
    },
  ]);
}
