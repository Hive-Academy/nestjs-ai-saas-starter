/**
 * Workflow Orchestration Section - Rebuilt with comprehensive business value
 */

import { CommonModule } from '@angular/common';
import { Component, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SectionParticleBackgroundComponent } from '../../../shared/components/section-particle-background.component';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';

interface WorkflowModule {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  color: 'blue' | 'purple' | 'cyan';
  features: string[];
  metric: { value: string; label: string };
  particleTint: 'blue' | 'purple' | 'cyan';
  slug: string;
}

@Component({
  selector: 'app-workflow-orchestration-section',
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
      class="w-full min-h-screen relative bg-gradient-to-br from-black via-blue-900 to-black py-20 overflow-hidden"
    >
      <!-- Flowing Particles Background -->
      <div class="absolute inset-0 pointer-events-none">
        <app-section-particle-background
          [particleCount]="40"
          tintColor="blue"
          [particleSize]="0.6"
          [particleOpacity]="0.3"
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
            🔧 Workflow Orchestration
          </h2>
          <p class="text-xl md:text-2xl text-white/80 max-w-4xl mx-auto">
            Dual paradigm execution combining declarative graphs and functional
            elegance for enterprise AI workflows
          </p>
        </div>

        <!-- 3-Card Horizontal Pipeline -->
        <div class="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-12">
          @for (module of workflowModules(); track module.title; let i = $index)
          {
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
              }}-400/30 rounded-2xl p-8 hover:bg-white/20 hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl hover:shadow-{{
                module.color
              }}-500/40"
            >
              <div class="text-5xl mb-4">{{ module.icon }}</div>
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

              <ul class="space-y-2 mb-6">
                @for (feature of module.features; track feature) {
                <li class="flex items-start gap-2 text-white/60 text-sm">
                  <span class="text-{{ module.color }}-400">▸</span>
                  <span>{{ feature }}</span>
                </li>
                }
              </ul>

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

        <!-- Flow Visualization -->
        <div
          class="flex items-center justify-center gap-4 text-white/40 text-2xl"
          scrollAnimation
          [scrollConfig]="{
            animation: 'fadeIn',
            start: 'top 80%',
            duration: 0.6,
            ease: 'power2.out'
          }"
        >
          <span>📥 Input</span><span>→</span><span>⚙️ Process</span
          ><span>→</span><span>📤 Output</span>
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
export class WorkflowOrchestrationSectionComponent {
  readonly workflowModules = signal<WorkflowModule[]>([
    {
      icon: '🔧',
      title: 'Workflow Engine',
      subtitle: 'Central orchestration hub',
      description:
        'Graph execution with decorator-based workflows and automatic streaming integration',
      color: 'blue',
      features: [
        'StateGraph compilation',
        'Conditional routing',
        'Error recovery',
        'Command processing',
        'Subgraph management',
      ],
      metric: { value: 'Central Hub', label: 'Coordinates all modules' },
      particleTint: 'blue',
      slug: 'langgraph-workflow-engine',
    },
    {
      icon: '🎯',
      title: 'Functional API',
      subtitle: 'FP-style workflows',
      description:
        '@Workflow decorators for functional programming patterns with 40% code reduction',
      color: 'purple',
      features: [
        '@Workflow decorators',
        'Task composition',
        'Parallel execution',
        '@Node/@Edge/@Task',
        'Pure functions',
      ],
      metric: { value: '40% Less Code', label: 'vs imperative patterns' },
      particleTint: 'purple',
      slug: 'langgraph-functional-api',
    },
    {
      icon: '📡',
      title: 'Streaming',
      subtitle: 'Real-time processing',
      description:
        'WebSocket token streaming with @StreamToken decorator for progressive AI responses',
      color: 'cyan',
      features: [
        'Progressive results',
        'Live updates',
        'Backpressure handling',
        '@StreamToken decorator',
        'WebSocket support',
      ],
      metric: { value: 'Real-Time', label: 'Token-by-token streaming' },
      particleTint: 'cyan',
      slug: 'langgraph-streaming',
    },
  ]);
}
